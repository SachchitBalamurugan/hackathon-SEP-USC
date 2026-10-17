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
  const { data, error } = await db().from("profiles").update(patch).eq("id", userId).select("tracking_enabled, paused_hosts, auto_check_hosts").single();
  if (error) throw error;
  return json(req, data);
});

export { OPTIONS };
