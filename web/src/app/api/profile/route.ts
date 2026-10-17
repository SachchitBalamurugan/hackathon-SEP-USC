import { z } from "zod";
import { body, json, route } from "@/lib/route";
import { db } from "@/lib/supabase";

// The student's own correction of their profile. Bumping the version makes any consolidation
// already in flight lose its optimistic write instead of overwriting the edit.
export const POST = route(["session"], async (req, { userId }) => {
  const { mind_doc } = await body(req, z.object({ mind_doc: z.string().max(4000) }));
  const { data: cur } = await db().from("learner_profile").select("version").eq("user_id", userId).maybeSingle();
  const { error } = await db()
    .from("learner_profile")
    .upsert({ user_id: userId, mind_doc, version: (cur?.version ?? 0) + 1, updated_at: new Date().toISOString() });
  if (error) throw error;
  return json(req, { ok: true });
});
