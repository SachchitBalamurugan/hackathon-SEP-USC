import { z } from "zod";
import { hashSecret, newApiKey } from "@/lib/auth";
import { body, json, route } from "@/lib/route";
import { db } from "@/lib/supabase";

// MCP keys, managed from the dashboard only. The plaintext is returned exactly once.

export const GET = route(["session"], async (req, { userId }) => {
  const { data } = await db()
    .from("api_keys")
    .select("id, kind, label, created_at, last_used_at")
    .eq("user_id", userId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });
  return json(req, { keys: data ?? [] });
});

export const POST = route(["session"], async (req, { userId }) => {
  const { label } = await body(req, z.object({ label: z.string().max(60).default("Claude") }));
  const key = newApiKey();
  const { error } = await db().from("api_keys").insert({ user_id: userId, kind: "mcp", key_hash: hashSecret(key), label });
  if (error) throw error;
  return json(req, { key });
});

export const DELETE = route(["session"], async (req, { userId }) => {
  const { id } = await body(req, z.object({ id: z.string().uuid() }));
  await db().from("api_keys").update({ revoked_at: new Date().toISOString() }).eq("id", id).eq("user_id", userId);
  return json(req, { ok: true });
});
