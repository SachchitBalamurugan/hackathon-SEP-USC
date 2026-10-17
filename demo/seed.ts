// Reset the demo account to a believable state: three weeks of learning history across
// algebra, chemistry and history, a written profile, and an extension key for the recorder.
// Courses are NOT seeded: the sync demo brings them in live from the staged Canvas page.
// Usage: npm -w demo run seed            (full history)
//        npm -w demo run seed -- --empty (account only, for the sync and setup demos)
import { writeFileSync } from "node:fs";
import { admin, DEMO_EMAIL, DEMO_PASSWORD, findUser, hash, newKey, ROOT } from "./lib";

const empty = process.argv.includes("--empty");
const db = admin();
const DAY = 86_400_000;

let user = await findUser(DEMO_EMAIL);
if (!user) {
  const { data, error } = await db.auth.admin.createUser({ email: DEMO_EMAIL, password: DEMO_PASSWORD, email_confirm: true });
  if (error) throw error;
  user = data.user;
} else {
  await db.auth.admin.updateUserById(user.id, { password: DEMO_PASSWORD });
}
const uid = user!.id;

for (const t of ["practice_items", "mistakes", "skill_demos", "learner_events", "material_chunks", "materials", "assignments", "courses", "api_keys"]) {
  await db.from(t).delete().eq("user_id", uid);
}
await db.from("profiles").update({ tracking_enabled: true, paused_hosts: [], auto_check_hosts: [] }).eq("id", uid);
await db.from("learner_profile").upsert({ user_id: uid, mind_doc: "", traits: {}, version: 0, pending_events: 0 });

// Extension key the recorder injects into the extension, so it starts paired.
const extKey = newKey();
await db.from("api_keys").insert({ user_id: uid, kind: "extension", key_hash: hash(extKey), label: "Demo browser" });
writeFileSync(`${ROOT}demo/.demo-key`, extKey);

if (!empty) {
  // [skill, subject, history of correct/incorrect from oldest to newest]
  const SKILLS: [string, string, boolean[]][] = [
    ["inverse operations when isolating a variable", "Algebra 1", [false, false, true, false, true]],
    ["two-step equations", "Algebra 1", [true, false, true, true, false, true]],
    ["distributing a negative", "Algebra 1", [false, false, false, true]],
    ["combining like terms", "Algebra 1", [true, true, true, true, true]],
    ["checking a solution by substitution", "Algebra 1", [true, true, false, true]],
    ["translating word problems", "Algebra 1", [false, false, true]],
    ["balancing chemical equations", "Chemistry", [true, false, true, true]],
    ["mole conversions", "Chemistry", [false, true, false]],
    ["reaction rate factors", "Chemistry", [true, true, true]],
    ["cause and effect in historical events", "World History", [true, true, false, true]],
    ["evaluating primary sources", "World History", [true, true, true, true]],
  ];
  const demos: Record<string, unknown>[] = [];
  const now = Date.now();
  for (const [skill, , history] of SKILLS) {
    history.forEach((correct, i) => {
      const at = new Date(now - (history.length - i) * 3.5 * DAY - Math.random() * DAY).toISOString();
      demos.push({ user_id: uid, skill_key: skill.toLowerCase(), skill_label: skill, correct, weight: 1, source: i % 2 ? "practice" : "check", at });
    });
  }
  // Skills practiced in the same sessions, which draws the links on the skills map.
  const sessions: string[][] = [
    ["inverse operations when isolating a variable", "two-step equations", "checking a solution by substitution"],
    ["distributing a negative", "combining like terms"],
    ["translating word problems", "two-step equations"],
    ["balancing chemical equations", "mole conversions"],
  ];
  sessions.forEach((s, k) => {
    const at = new Date(now - (k + 1) * 2 * DAY).toISOString();
    for (const skill of s) demos.push({ user_id: uid, skill_key: skill, skill_label: skill, correct: Math.random() > 0.4, weight: 1, source: "practice", at });
  });
  await db.from("skill_demos").insert(demos);

  await db.from("mistakes").insert([
    { user_id: uid, skill_key: "distributing a negative", skill_label: "distributing a negative", note: "−2(x − 3) should be −2x + 6, not −2x − 6.", misconception: "The negative only applies to the first term inside the parentheses.", subject: "Algebra 1: linear equations", page_host: "web.kamiapp.com", created_at: new Date(now - 2 * DAY).toISOString() },
    { user_id: uid, skill_key: "mole conversions", skill_label: "mole conversions", note: "Divide by molar mass to get moles; multiplying gave grams squared.", misconception: "Molar mass converts moles to grams in either direction by multiplying.", subject: "Chemistry: stoichiometry", page_host: "docs.google.com", created_at: new Date(now - 4 * DAY).toISOString() },
    { user_id: uid, skill_key: "translating word problems", skill_label: "translating word problems", note: "The $25 joining fee is added once, not every month.", misconception: null, subject: "Algebra 1: linear equations", page_host: "web.kamiapp.com", created_at: new Date(now - 5 * DAY).toISOString() },
  ]);

  await db.from("learner_profile").upsert({
    user_id: uid,
    version: 3,
    pending_events: 0,
    traits: {
      pace: "Steady; about a minute per algebra item",
      preferred_format: "Short worked examples, then one question to try",
      active_hours: "Weeknights 7 to 10 pm",
      stuck_patterns: ["signs when distributing or moving terms", "turning word problems into equations"],
      focus_habits: "Focuses well for 20 to 25 minutes, then switches tabs",
      goals: ["B+ or better in Algebra 1", "Feel ready for the unit test"],
    },
    mind_doc:
      "**Goal:** They want a B+ or better in Algebra 1 and to feel ready for the unit test.\n\n**Learns best:** From one short worked example followed by a single question to try. Long explanations lose them after a few sentences.\n\n**Where they get stuck:** Signs. They carry a + across the equals sign unchanged and drop the negative on the second term when distributing. Word problems go better once restated as an equation.\n\n**Solid:** Combining like terms and evaluating primary sources in History.\n\n**Avoid:** Giving the full solution first. Ask what they would do to both sides, then let them try.",
  });
}

console.log(`Demo account ${DEMO_EMAIL} reset${empty ? " (empty)" : " with history"}. Extension key written to demo/.demo-key.`);
