import { timingSafeEqual } from "node:crypto";
import { consolidate } from "@/lib/learner";
import { env } from "@/lib/env";
import { db } from "@/lib/supabase";

export const maxDuration = 300;

// Daily sweep (vercel.json). The 25-event trigger in recordEvents does most of the work; this
// catches students whose event count never reached it.

function authorized(req: Request): boolean {
  const secret = env.cronSecret();
  const got = req.headers.get("authorization") || "";
  const want = `Bearer ${secret}`;
  return Boolean(secret) && got.length === want.length && timingSafeEqual(Buffer.from(got), Buffer.from(want));
}

export async function GET(req: Request) {
  if (!authorized(req)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { data } = await db().from("learner_profile").select("user_id").gt("pending_events", 0).limit(200);
  const results: Record<string, unknown> = {};
  for (const { user_id } of data ?? []) {
    try {
      results[user_id] = await consolidate(user_id);
    } catch (e) {
      results[user_id] = { error: String(e) };
    }
  }
  return Response.json({ users: Object.keys(results).length, results });
}
