import { createHash, randomUUID } from "node:crypto";
import { DEMO_ASSIGNMENTS, DEMO_COURSES } from "../demoCanvas";

// The demo student for DEMO_FIXTURES: Maya, three weeks into Algebra 1, Chemistry and World
// History, with skills, mistakes, a written profile, practice due, watchdog history, and keys
// the recorder hands to the extension and to the MCP client.

export const MAYA = { id: "00000000-0000-4000-8000-00000000a1a1", email: "maya@studylens.demo" };
export const MAYA_EXTENSION_KEY = "sl_demo_maya_extension_key_for_recordings";
export const MAYA_MCP_KEY = "sl_demo_maya_claude_key_for_recordings";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

/** The fixture user for an email: Maya's seeded account, or a stable id derived from the email. */
export function userFor(email: string) {
  if (email.toLowerCase() === MAYA.email) return MAYA;
  const h = sha(email.toLowerCase());
  return { id: `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`, email };
}
const DAY = 86_400_000;
const ago = (days: number) => new Date(Date.now() - days * DAY).toISOString();

const SKILLS: [string, boolean[]][] = [
  ["inverse operations when isolating a variable", [false, false, true, false, true]],
  ["two-step equations", [true, false, true, true, false, true]],
  ["distributing a negative", [false, false, false, true]],
  ["combining like terms", [true, true, true, true, true]],
  ["checking a solution by substitution", [true, true, false, true]],
  ["translating word problems", [false, false, true]],
  ["balancing chemical equations", [true, false, true, true]],
  ["mole conversions", [false, true, false]],
  ["reaction rate factors", [true, true, true]],
  ["cause and effect in historical events", [true, true, false, true]],
  ["evaluating primary sources", [true, true, true, true]],
];

const SESSIONS = [
  ["inverse operations when isolating a variable", "two-step equations", "checking a solution by substitution"],
  ["distributing a negative", "combining like terms"],
  ["translating word problems", "two-step equations"],
  ["balancing chemical equations", "mole conversions"],
];

export function emptyUser(id: string) {
  return {
    profiles: [{ id, tracking_enabled: false, paused_hosts: [], auto_check_hosts: [] }],
    learner_profile: [{ user_id: id, mind_doc: "", traits: {}, version: 0, pending_events: 0, updated_at: new Date().toISOString() }],
  };
}

export function seedFixtures(): Record<string, Record<string, unknown>[]> {
  const uid = MAYA.id;
  const base = emptyUser(uid);
  const skill_demos: Record<string, unknown>[] = [];
  for (const [skill, history] of SKILLS) {
    history.forEach((correct, i) => skill_demos.push({ id: skill_demos.length + 1, user_id: uid, skill_key: skill, skill_label: skill, correct, weight: 1, source: i % 2 ? "practice" : "check", at: ago((history.length - i) * 3.5 + 0.3) }));
  }
  SESSIONS.forEach((s, k) => {
    for (const skill of s) skill_demos.push({ id: skill_demos.length + 1, user_id: uid, skill_key: skill, skill_label: skill, correct: k % 2 === 0, weight: 1, source: "practice", at: ago((k + 1) * 2) });
  });

  const courses = DEMO_COURSES.map((c) => ({ id: randomUUID(), user_id: uid, external_id: `canvas:${c.id}`, source: "canvas", name: c.name, code: c.course_code, current_score: c.score, url: `/demo/canvas`, updated_at: ago(0.2) }));
  const assignments = DEMO_COURSES.flatMap((c, i) =>
    (DEMO_ASSIGNMENTS[c.id] ?? []).map((a) => ({
      id: randomUUID(),
      user_id: uid,
      course_id: courses[i].id,
      external_id: `canvas:${a.id}`,
      title: a.name,
      due_at: a.due,
      points_possible: a.points,
      score: a.score ?? null,
      submitted_at: a.submitted ? ago(3) : null,
      missing: Boolean(a.missing),
      url: "/demo/worksheet",
      updated_at: ago(0.2),
    })),
  );

  const mistakes = [
    { id: randomUUID(), user_id: uid, skill_key: "distributing a negative", skill_label: "distributing a negative", note: "−2(x − 3) should be −2x + 6, not −2x − 6.", misconception: "The negative only applies to the first term inside the parentheses.", subject: "Algebra 1: linear equations", page_host: "web.kamiapp.com", resolved_at: null, created_at: ago(2) },
    { id: randomUUID(), user_id: uid, skill_key: "mole conversions", skill_label: "mole conversions", note: "Divide by molar mass to get moles; multiplying gave grams squared.", misconception: "Molar mass converts moles to grams in either direction by multiplying.", subject: "Chemistry: stoichiometry", page_host: "docs.google.com", resolved_at: null, created_at: ago(4) },
    { id: randomUUID(), user_id: uid, skill_key: "translating word problems", skill_label: "translating word problems", note: "The $25 joining fee is added once, not every month.", misconception: null, subject: "Algebra 1: linear equations", page_host: "web.kamiapp.com", resolved_at: null, created_at: ago(5) },
  ];

  const practice_items = [
    { q: "Expand: $-3(x - 4)$", type: "short_answer", options: null, answer: "-3x + 12", explanation: "Multiply −3 by both terms: −3·x = −3x and −3·(−4) = +12." },
    { q: "Which is equal to $-2(5 - y)$?", type: "multiple_choice", options: ["$-10 - 2y$", "$-10 + 2y$", "$10 - 2y$", "$-10 + y$"], answer: "$-10 + 2y$", explanation: "−2·5 = −10 and −2·(−y) = +2y." },
    { q: "Solve: $4 - 2(x + 1) = 10$", type: "short_answer", options: null, answer: "-4", explanation: "Distribute: 4 − 2x − 2 = 10, so 2 − 2x = 10, −2x = 8, x = −4." },
  ].map((p, i) => ({
    id: randomUUID(),
    user_id: uid,
    skill_key: "distributing a negative",
    skill_label: "distributing a negative",
    question: p.q,
    qtype: p.type,
    options: p.options,
    answer: p.answer,
    explanation: p.explanation,
    mistake_id: mistakes[0].id,
    srs: null,
    last_result: null,
    created_at: ago(1 + i * 0.01),
  }));

  const kinds: [string, string, Record<string, unknown>][] = [
    ["course", "assignment_added", { title: "Quiz 2: Two-step equations" }],
    ["usage", "check_requested", { host: "web.kamiapp.com", marks: 3, errors: 1 }],
    ["claude", "observation_preference", { observation: "Prefers one worked example, then a try" }],
    ["usage", "practice_answered", { skill: "two-step equations", correct: true }],
    ["course", "grade_posted", { title: "Worksheet 3: Inverse Operations", score: 14 }],
    ["claude", "demonstration", { skill: "combining like terms", correct: true }],
    ["usage", "explain_requested", { topic: "why subtract before dividing" }],
    ["claude", "observation_goal", { observation: "Wants a B+ in Algebra 1" }],
  ];
  const learner_events = kinds.map(([source, kind, payload], i) => ({ id: i + 1, user_id: uid, source, kind, payload, at: ago(6 - i * 0.7), consolidated_at: ago(0.5) }));

  // Watchdog history: mostly clean, a few repaired, one student report.
  const agent_runs: Record<string, unknown>[] = [];
  const add = (pipeline: string, outcome: string, n: number, violations: { code: string; detail: string }[] = [], observed = false) => {
    for (let i = 0; i < n; i++) agent_runs.push({ id: agent_runs.length + 1, user_id: uid, pipeline, outcome, violations: violations.map((v) => ({ ...v, attempt: 1 })), attempts: outcome === "repaired" ? 2 : 1, latency_ms: 3000 + i * 97, observed, at: ago(1 + i * 0.4) });
  };
  add("check", "ok", 18);
  add("check", "repaired", 2, [{ code: "summary_contradicts_marks", detail: "summary says no mistakes but 1 error marks exist" }]);
  add("check", "degraded", 1, [{ code: "user_flagged_mark", detail: "student marked an error mark as wrong" }], true);
  add("refine", "ok", 21);
  add("refine", "degraded", 1, [{ code: "refine_jumped", detail: "refined position moved 31% of the page" }]);
  add("practice_generate", "ok", 6);
  add("practice_generate", "repaired", 1, [{ code: "mc_answer_not_in_options", detail: "question 2: answer is not one of its options" }]);
  add("practice_grade", "ok", 14);
  add("explain", "ok", 9);
  add("consolidate", "ok", 3);

  return {
    ...base,
    profiles: [{ id: uid, tracking_enabled: true, paused_hosts: [], auto_check_hosts: [] }],
    learner_profile: [
      {
        user_id: uid,
        version: 3,
        pending_events: 0,
        updated_at: ago(0.5),
        traits: {
          pace: "Steady; about a minute per algebra item",
          preferred_format: "Short worked examples, then one question to try",
          stuck_patterns: ["signs when distributing or moving terms", "turning word problems into equations"],
          goals: ["B+ or better in Algebra 1", "Feel ready for the unit test"],
        },
        mind_doc:
          "**Goal:** They want a B+ or better in Algebra 1 and to feel ready for the unit test.\n\n**Learns best:** From one short worked example followed by a single question to try. Long explanations lose them after a few sentences.\n\n**Where they get stuck:** Signs. They carry a + across the equals sign unchanged and drop the negative on the second term when distributing. Word problems go better once restated as an equation.\n\n**Solid:** Combining like terms and evaluating primary sources in History.\n\n**Avoid:** Giving the full solution first. Ask what they would do to both sides, then let them try.",
      },
    ],
    api_keys: [
      { id: randomUUID(), user_id: uid, kind: "extension", key_hash: sha(MAYA_EXTENSION_KEY), label: "Chrome on Maya's laptop", created_at: ago(20), last_used_at: ago(0.1), revoked_at: null },
      { id: randomUUID(), user_id: uid, kind: "mcp", key_hash: sha(MAYA_MCP_KEY), label: "Claude", created_at: ago(19), last_used_at: ago(0.3), revoked_at: null },
    ],
    pair_codes: [],
    courses,
    assignments,
    materials: [],
    material_chunks: [],
    skill_demos,
    mistakes,
    practice_items,
    learner_events,
    agent_runs,
    claude_tasks: [],
  };
}
