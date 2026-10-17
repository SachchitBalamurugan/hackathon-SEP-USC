import { z } from "zod";
import { body, json, route } from "@/lib/route";
import { db } from "@/lib/supabase";

// Mark a mistake resolved (or reopen it) from the dashboard.
export const POST = route(["session"], async (req, { userId }) => {
  const { id, resolved } = await body(req, z.object({ id: z.string().uuid(), resolved: z.boolean() }));
  const { error } = await db()
    .from("mistakes")
    .update({ resolved_at: resolved ? new Date().toISOString() : null })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
  return json(req, { ok: true });
});
