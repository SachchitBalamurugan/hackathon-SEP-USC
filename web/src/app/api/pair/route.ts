import { z } from "zod";
import { hashSecret, json, newApiKey, newPairCode, preflight, resolveUser } from "@/lib/auth";
import { db } from "@/lib/supabase";

// Extension pairing. The dashboard issues a short code
// (hash stored, 5 minutes, single use); the extension redeems it for a long-lived extension key.

const schema = z.discriminatedUnion("action", [z.object({ action: z.literal("issue") }), z.object({ action: z.literal("redeem"), code: z.string().min(6).max(12) })]);

export async function POST(req: Request) {
  const input = schema.safeParse(await req.json().catch(() => null));
  if (!input.success) return json(req, { error: "invalid_request" }, { status: 400 });

  if (input.data.action === "issue") {
    const caller = await resolveUser(req, ["session"]);
    if (!caller) return json(req, { error: "unauthorized" }, { status: 401 });
    const code = newPairCode();
    await db().from("pair_codes").delete().eq("user_id", caller.userId);
    const { error } = await db()
      .from("pair_codes")
      .insert({ code_hash: hashSecret(code), user_id: caller.userId, expires_at: new Date(Date.now() + 5 * 60_000).toISOString() });
    if (error) return json(req, { error: "server_error" }, { status: 500 });
    return json(req, { code, expiresInSeconds: 300 });
  }

  const code = input.data.code.toUpperCase().replace(/[^0-9A-Z]/g, "");
  // Burn the code in the same statement that reads it, so two redeems cannot both succeed.
  const { data: row } = await db()
    .from("pair_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("code_hash", hashSecret(code))
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("user_id")
    .maybeSingle();
  if (!row) return json(req, { error: "invalid_or_expired_code" }, { status: 400 });

  const key = newApiKey();
  const { error } = await db().from("api_keys").insert({ user_id: row.user_id, kind: "extension", key_hash: hashSecret(key), label: "Browser extension" });
  if (error) return json(req, { error: "server_error" }, { status: 500 });
  return json(req, { key });
}

export const OPTIONS = preflight;
