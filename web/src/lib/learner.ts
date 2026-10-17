import "server-only";
import { z } from "zod";
import { after } from "next/server";
import { computeMastery, sanitizePayload, skillKey, verifyMindDoc, type LearnerEvent, type Mastery } from "@studylens/core";
import { db } from "./supabase";
import { hasModel, MODELS, parseStructured, fence, UNTRUSTED_RULE } from "./llm";
import { watch, withCritique, type Content, type Run } from "./watchdog";

// The learner model. Three inputs land in learner_events (course changes, Claude's
// observations, StudyLens usage). Skill evidence also lands in skill_demos, from which mastery
// is recomputed on every read. consolidate() periodically folds the event log into a profile
// document and structured traits, the way FschoolAI's session-close rewrites tutor_mind.

export const CONSOLIDATE_EVERY = 25;

export async function recordEvents(userId: string, events: LearnerEvent[]) {
  if (!events.length) return;
  const rows = events.map((e) => ({
    user_id: userId,
    source: e.source,
    kind: e.kind,
    payload: e.source === "usage" ? sanitizePayload(e.payload) : e.payload,
    at: e.at ?? new Date().toISOString(),
  }));
  const { error } = await db().from("learner_events").insert(rows);
  if (error) throw error;
  const { data: pending } = await db().rpc("bump_pending_events", { p_user: userId, p_n: rows.length });
  if (typeof pending === "number" && pending >= CONSOLIDATE_EVERY) {
    after(() => consolidate(userId).catch((e) => console.error("consolidate failed", e)));
  }
}

export async function recordDemo(userId: string, skill: string, correct: boolean, source: string, weight = 1) {
  const label = skill.trim().slice(0, 80);
  if (!label) return;
  await db().from("skill_demos").insert({ user_id: userId, skill_key: skillKey(label), skill_label: label, correct, weight, source });
}

export type SkillMastery = Mastery & { key: string; label: string; lastAt: string };

export async function getMastery(userId: string): Promise<SkillMastery[]> {
  const { data } = await db()
    .from("skill_demos")
    .select("skill_key, skill_label, correct, weight, at")
    .eq("user_id", userId)
    .order("at", { ascending: false })
    .limit(2000);
  type Group = { label: string; lastAt: string; demos: { correct: boolean; at: string; weight: number }[] };
  const groups = new Map<string, Group>();
  for (const d of data ?? []) {
    const g: Group = groups.get(d.skill_key) ?? { label: d.skill_label, lastAt: d.at, demos: [] };
    g.demos.push({ correct: d.correct, at: d.at, weight: d.weight });
    groups.set(d.skill_key, g);
  }
  return [...groups.entries()]
    .map(([key, g]) => ({ key, label: g.label, lastAt: g.lastAt, ...computeMastery(g.demos) }))
    .sort((a, b) => a.level - b.level);
}

export async function getProfile(userId: string) {
  const { data } = await db().from("learner_profile").select("mind_doc, traits, version, updated_at").eq("user_id", userId).maybeSingle();
  return data ?? { mind_doc: "", traits: {}, version: 0, updated_at: null };
}

export type UpcomingAssignment = {
  id: string;
  title: string;
  due_at: string | null;
  points_possible: number | null;
  score: number | null;
  missing: boolean;
  url: string | null;
  courses: { name: string } | null;
};

export async function getUpcoming(userId: string, days = 14): Promise<UpcomingAssignment[]> {
  const now = new Date();
  const until = new Date(now.getTime() + days * 86_400_000);
  const { data } = await db()
    .from("assignments")
    .select("id, title, due_at, points_possible, score, missing, url, courses(name)")
    .eq("user_id", userId)
    .gte("due_at", new Date(now.getTime() - 86_400_000).toISOString())
    .lte("due_at", until.toISOString())
    .is("submitted_at", null)
    .order("due_at", { ascending: true })
    .limit(30);
  return (data ?? []) as unknown as UpcomingAssignment[];
}

export async function getOpenMistakes(userId: string, limit = 15) {
  const { data } = await db()
    .from("mistakes")
    .select("id, skill_label, note, misconception, subject, created_at")
    .eq("user_id", userId)
    .is("resolved_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

/** Everything a tutor prompt should know about this student, as one compact block. */
export async function learnerContext(userId: string): Promise<string> {
  const [profile, mastery, mistakes, upcoming] = await Promise.all([getProfile(userId), getMastery(userId), getOpenMistakes(userId, 8), getUpcoming(userId, 10)]);
  const weak = mastery.filter((m) => m.status === "shaky" || (m.status === "learning" && m.level < 0.6)).slice(0, 8);
  const strong = mastery.filter((m) => m.status === "verified").slice(-5);
  const lines = [
    "## About this student",
    profile.mind_doc || "(No profile yet. Learn about them as you go.)",
    Object.keys(profile.traits || {}).length ? `Traits: ${JSON.stringify(profile.traits)}` : "",
    weak.length ? `Weak skills: ${weak.map((m) => `${m.label} (${Math.round(m.level * 100)}%)`).join("; ")}` : "",
    strong.length ? `Solid skills: ${strong.map((m) => m.label).join("; ")}` : "",
    mistakes.length ? `Recent mistakes:\n${mistakes.map((m) => `- [${m.skill_label}] ${m.note}${m.misconception ? ` (belief: ${m.misconception})` : ""}`).join("\n")}` : "",
    upcoming.length
      ? `Due soon:\n${upcoming.map((a) => `- ${a.title}${a.courses?.name ? ` (${a.courses.name})` : ""}, due ${a.due_at?.slice(0, 10)}${a.missing ? ", MISSING" : ""}`).join("\n")}`
      : "",
  ];
  return fence("learner-model", lines.filter(Boolean).join("\n"));
}

// ── Consolidation ───────────────────────────────────────────────────────────────────────────

const foldSchema = z.object({
  traits: z.object({
    pace: z.string().describe("How quickly they work through problems, or empty if unknown"),
    preferred_format: z.string().describe("e.g. worked examples, visuals, short hints; empty if unknown"),
    active_hours: z.string().describe("When they tend to study, from timestamps; empty if unknown"),
    stuck_patterns: z.array(z.string()).describe("Recurring situations where they get stuck"),
    focus_habits: z.string().describe("Attention patterns from focus/idle/tab-away signals; empty if unknown"),
    goals: z.array(z.string()).describe("Goals the student stated or Claude observed"),
  }),
  skill_evidence: z
    .array(z.object({ skill: z.string(), correct: z.boolean() }))
    .describe("Skill demonstrations found in Claude observations only (not in practice/check events, which are already counted)"),
});

const FOLD_SYSTEM = `You maintain a learning profile for one student. You receive their current traits and a batch of new events. Return updated traits.
Evidence rules (from FschoolAI's student memory): asking about a topic is NOT evidence of mastery or weakness. Only answers, checked work and explicit observations count. Prefer the newer evidence when it conflicts with old traits. Keep a trait empty rather than guessing.
${UNTRUSTED_RULE}`;

const DOC_SYSTEM = `You write the living profile a tutor reads before teaching this student. Rewrite the profile from the previous version, the updated traits, their mastery and the new events.
Keep it under 250 words, in second person addressed to the tutor ("They..."). Cover: how they learn best, what they are working on, where they get stuck and why, what to avoid. Keep durable facts from the previous version unless new evidence contradicts them. No headings beyond short bold labels. Never invent facts.
${UNTRUSTED_RULE}`;

export async function consolidate(userId: string) {
  // Claude mode: the student's Claude rewrites the profile through update_profile instead.
  if (!hasModel()) return { folded: 0, skipped: "claude_mode" as const };
  return watch(userId, "consolidate", (run) => consolidateRun(userId, run));
}

async function consolidateRun(userId: string, run: Run) {
  const { data: events } = await db()
    .from("learner_events")
    .select("id, source, kind, payload, at")
    .eq("user_id", userId)
    .is("consolidated_at", null)
    .order("at", { ascending: true })
    .limit(300);
  if (!events?.length) return { folded: 0 };

  const profile = await getProfile(userId);
  const eventText = events.map((e) => `${e.at} ${e.source}/${e.kind} ${JSON.stringify(e.payload)}`).join("\n");

  const fold = await parseStructured({
    model: MODELS.background,
    system: FOLD_SYSTEM,
    schema: foldSchema,
    effort: "low",
    content: `Current traits: ${JSON.stringify(profile.traits || {})}\n\nNew events:\n${fence("events", eventText)}`,
  });

  for (const ev of fold.skill_evidence.slice(0, 20)) await recordDemo(userId, ev.skill, ev.correct, "claude-observation", 0.5);

  const mastery = await getMastery(userId);
  const masteryText = mastery
    .slice(0, 25)
    .map((m) => `${m.label}: ${Math.round(m.level * 100)}% (${m.status})`)
    .join("\n");

  const docContent = [
    `Previous profile:\n${fence("profile", profile.mind_doc || "(none)")}`,
    `Updated traits: ${JSON.stringify(fold.traits)}`,
    `Mastery:\n${masteryText || "(none yet)"}`,
    `New events:\n${fence("events", eventText)}`,
  ].join("\n\n");
  const writeDoc = (c: Content) => parseStructured({ model: MODELS.tutor, system: DOC_SYSTEM, schema: z.object({ mind_doc: z.string() }), effort: "low", content: c });
  const verify = (d: { mind_doc: string }) => verifyMindDoc(d.mind_doc);
  const drafted = await run.repair(await writeDoc(docContent), verify, (note, prev) => writeDoc(withCritique(docContent, prev, note)));
  const doc = { mind_doc: trimWords(drafted.mind_doc, 300) };

  // Optimistic write: if another consolidation landed first, keep theirs and leave our events
  // pending so the next run sees them.
  const { data: written } = await db()
    .from("learner_profile")
    .update({ mind_doc: doc.mind_doc, traits: fold.traits, version: profile.version + 1, pending_events: 0, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("version", profile.version)
    .select("version");
  if (!written?.length) {
    run.saw([{ code: "version_conflict", detail: `profile moved past version ${profile.version}`, repairable: false }]);
    return { folded: 0, conflict: true };
  }

  await db()
    .from("learner_events")
    .update({ consolidated_at: new Date().toISOString() })
    .in(
      "id",
      events.map((e) => e.id),
    );
  return { folded: events.length };
}

/**
 * Claude mode: the student's Claude rewrites the profile (MCP update_profile). Same word limit
 * and version bump as consolidate(); the events it has seen are marked folded.
 */
export async function writeProfile(userId: string, mindDoc: string) {
  return watch(userId, "consolidate", async (run) => {
    run.saw(verifyMindDoc(mindDoc));
    const profile = await getProfile(userId);
    const doc = trimWords(mindDoc, 300);
    await db()
      .from("learner_profile")
      .upsert({ user_id: userId, mind_doc: doc, version: profile.version + 1, pending_events: 0, updated_at: new Date().toISOString() });
    await db().from("learner_events").update({ consolidated_at: new Date().toISOString() }).eq("user_id", userId).is("consolidated_at", null);
    return { words: doc.split(/\s+/).length, trimmed: doc !== mindDoc.trim() };
  });
}

/** Cut to the last full sentence within the word limit, so an over-long profile still reads well. */
export function trimWords(text: string, max: number): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= max) return text.trim();
  const cut = words.slice(0, max).join(" ");
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf(".\n"));
  return end > cut.length / 2 ? cut.slice(0, end + 1) : `${cut}…`;
}
