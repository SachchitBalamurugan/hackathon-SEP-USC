import { json, route } from "@/lib/route";
import { db } from "@/lib/supabase";

// Data portability and deletion. Export omits practice answer keys and key hashes.

const TABLES = ["courses", "assignments", "materials", "learner_events", "skill_demos", "mistakes", "learner_profile"] as const;

export const GET = route(["session"], async (req, { userId }) => {
  const out: Record<string, unknown> = {};
  for (const t of TABLES) {
    const { data } = await db().from(t).select("*").eq("user_id", userId).limit(10_000);
    out[t] = data ?? [];
  }
  const { data: practice } = await db().from("practice_items").select("id, skill_label, question, qtype, options, explanation, srs, last_result, created_at").eq("user_id", userId);
  out.practice_items = practice ?? [];
  return new Response(JSON.stringify(out, null, 2), {
    headers: { "Content-Type": "application/json", "Content-Disposition": 'attachment; filename="studylens-export.json"' },
  });
});

/** Delete everything learned about the student. The account itself stays so they can keep using it. */
export const DELETE = route(["session"], async (req, { userId }) => {
  for (const t of ["practice_items", "mistakes", "skill_demos", "learner_events", "materials", "assignments", "courses"] as const) {
    await db().from(t).delete().eq("user_id", userId);
  }
  await db().from("learner_profile").update({ mind_doc: "", traits: {}, pending_events: 0 }).eq("user_id", userId);
  return json(req, { ok: true });
});
