import { z } from "zod";
import { body, json, OPTIONS, route } from "@/lib/route";
import { db } from "@/lib/supabase";

const host = z.string().min(1).max(200);
const schema = z.object({
  tracking_enabled: z.boolean().optional(),
  paused_hosts: z.array(host).max(200).optional(),
  auto_check_hosts: z.array(host).max(50).optional(),
});

export const POST = route(["extension", "session"], async (req, { userId }) => {
  const patch = await body(req, schema);
  const cols = "tracking_enabled, paused_hosts, auto_check_hosts";
  // An empty patch is a read; profiles rows are created by the signup trigger.
  const q = Object.keys(patch).length ? db().from("profiles").update(patch).eq("id", userId).select(cols) : db().from("profiles").select(cols).eq("id", userId);
  const { data, error } = await q.single();
  if (error) throw error;
  return json(req, data);
});

export { OPTIONS };
