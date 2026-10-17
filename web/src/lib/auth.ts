import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { authClient, db } from "./supabase";

export type Caller = { userId: string; via: "session" | "extension" | "mcp" };

export const KEY_PREFIX = "sl_";

export function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

export function newApiKey(): string {
  return KEY_PREFIX + randomBytes(24).toString("base64url");
}

/** Crockford-style alphabet without look-alikes. */
const PAIR_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
export function newPairCode(): string {
  const bytes = randomBytes(8);
  return Array.from(bytes, (b) => PAIR_ALPHABET[b % PAIR_ALPHABET.length]).join("");
}

/**
 * Resolve the caller from a bearer API key (extension or MCP) or the dashboard session cookie.
 * The returned userId is the only user id any route may trust.
 */
export async function resolveUser(req: Request, allow: Caller["via"][] = ["session", "extension", "mcp"]): Promise<Caller | null> {
  const header = req.headers.get("authorization") || "";
  const bearer = header.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (bearer?.startsWith(KEY_PREFIX)) {
    const { data } = await db()
      .from("api_keys")
      .select("id, user_id, kind, revoked_at")
      .eq("key_hash", hashSecret(bearer))
      .maybeSingle();
    if (!data || data.revoked_at || !allow.includes(data.kind)) return null;
    // Best-effort usage stamp; never block the request on it.
    void db().from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id).then(() => {});
    return { userId: data.user_id, via: data.kind };
  }
  if (!allow.includes("session")) return null;
  const supabase = await authClient();
  const { data } = await supabase.auth.getUser();
  return data.user ? { userId: data.user.id, via: "session" } : null;
}

export function unauthorized() {
  return Response.json({ error: "unauthorized" }, { status: 401, headers: corsHeaders() });
}

/**
 * The extension calls the API from its service worker, whose origin is chrome-extension://<id>.
 * Credentials are a bearer key, never cookies, so allowing that origin family is safe.
 */
export function corsHeaders(origin?: string | null): Record<string, string> {
  const allowed = origin && /^chrome-extension:\/\/[a-p]{32}$/.test(origin) ? origin : "";
  return allowed
    ? {
        "Access-Control-Allow-Origin": allowed,
        "Access-Control-Allow-Headers": "authorization, content-type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        Vary: "Origin",
      }
    : {};
}

export function preflight(req: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}

export function json(req: Request, body: unknown, init: ResponseInit = {}) {
  return Response.json(body, { ...init, headers: { ...corsHeaders(req.headers.get("origin")), ...(init.headers || {}) } });
}
