import "server-only";
import { layoutGraph, summarizeRuns, type GraphLink, type PipelineHealth, type RunRow } from "@studylens/core";
import { db } from "./supabase";
import { getMastery } from "./learner";
import { hasModel } from "./llm";

export type Onboarding = { extension: boolean; courses: boolean; firstCheck: boolean; claude: boolean; claudeMode: boolean };

/** The four setup steps, read from what actually exists for this user. */
export async function getOnboarding(userId: string): Promise<Onboarding> {
  const [ext, courses, checks, claude] = await Promise.all([
    db().from("api_keys").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("kind", "extension").is("revoked_at", null),
    db().from("courses").select("id", { count: "exact", head: true }).eq("user_id", userId),
    db().from("learner_events").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("kind", "check_requested"),
    db().from("api_keys").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("kind", "mcp").not("last_used_at", "is", null),
  ]);
  return { extension: (ext.count ?? 0) > 0, courses: (courses.count ?? 0) > 0, firstCheck: (checks.count ?? 0) > 0, claude: (claude.count ?? 0) > 0, claudeMode: !hasModel() };
}

/** The watchdog's view of this student's last 30 days of tutor steps. */
export async function getReliability(userId: string): Promise<PipelineHealth[]> {
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data } = await db().from("agent_runs").select("pipeline, outcome, violations, observed").eq("user_id", userId).gte("at", since).limit(2000);
  return summarizeRuns((data ?? []) as RunRow[]);
}

export type SkillNode = {
  id: string;
  label: string;
  group: string;
  level: number;
  status: string;
  evidence: number;
  lastAt: string;
  x: number;
  y: number;
  z: number;
  mistakes: { note: string; misconception: string | null }[];
};
export type SkillGraph = { nodes: SkillNode[]; links: GraphLink[]; groups: string[] };

/**
 * Skills as a graph. Groups come from the subject StudyLens saw the skill in; links join skills
 * that were exercised together (same source, within the same minute: one check or practice set).
 */
export async function getSkillGraph(userId: string): Promise<SkillGraph> {
  const [mastery, { data: demos }, { data: mistakes }] = await Promise.all([
    getMastery(userId),
    db().from("skill_demos").select("skill_key, source, at").eq("user_id", userId).order("at", { ascending: false }).limit(2000),
    db().from("mistakes").select("skill_key, subject, note, misconception, resolved_at, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(500),
  ]);
  if (!mastery.length) return { nodes: [], links: [], groups: [] };

  const subjectOf = new Map<string, string>();
  const mistakesOf = new Map<string, { note: string; misconception: string | null }[]>();
  for (const m of mistakes ?? []) {
    if (m.subject && !subjectOf.has(m.skill_key)) subjectOf.set(m.skill_key, m.subject.split(":")[0].trim().slice(0, 40));
    if (!m.resolved_at) mistakesOf.set(m.skill_key, [...(mistakesOf.get(m.skill_key) ?? []), { note: m.note, misconception: m.misconception }].slice(0, 3));
  }

  const buckets = new Map<string, Set<string>>();
  for (const d of demos ?? []) {
    const key = `${d.source}:${d.at.slice(0, 16)}`;
    buckets.set(key, (buckets.get(key) ?? new Set()).add(d.skill_key));
  }
  const pair = new Map<string, number>();
  for (const set of buckets.values()) {
    const ids = [...set].sort();
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) pair.set(`${ids[i]}|${ids[j]}`, (pair.get(`${ids[i]}|${ids[j]}`) ?? 0) + 1);
  }
  const known = new Set(mastery.map((m) => m.key));
  const links: GraphLink[] = [...pair.entries()]
    .map(([k, n]) => {
      const [source, target] = k.split("|");
      return { source, target, strength: Math.min(3, n) };
    })
    .filter((l) => known.has(l.source) && known.has(l.target));

  const nodes = mastery.slice(0, 80).map((m) => ({ id: m.key, group: subjectOf.get(m.key) ?? "General", weight: m.confidence }));
  const placed = new Map(layoutGraph(nodes, links).map((p) => [p.id, p]));
  return {
    groups: [...new Set(nodes.map((n) => n.group))].sort(),
    links,
    nodes: mastery.slice(0, 80).map((m) => {
      const p = placed.get(m.key)!;
      return { id: m.key, label: m.label, group: subjectOf.get(m.key) ?? "General", level: m.level, status: m.status, evidence: m.confidence, lastAt: m.lastAt, x: p.x, y: p.y, z: p.z, mistakes: mistakesOf.get(m.key) ?? [] };
    }),
  };
}
