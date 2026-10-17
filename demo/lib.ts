import { readFileSync } from "node:fs";
import { createHash, randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

export const ROOT = fileURLToPath(new URL("..", import.meta.url));
export const SITE = process.env.DEMO_SITE ?? "http://localhost:3100";
export const DEMO_EMAIL = "demo@studylens.app";
export const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "studylens-demo-2026";

/** Read web/.env.local (gitignored) for the Supabase service credentials. Never printed. */
export function env(): Record<string, string> {
  const text = readFileSync(`${ROOT}web/.env.local`, "utf8");
  return Object.fromEntries(
    text
      .split(/\r?\n/)
      .filter((l) => /^[A-Z_]+=/.test(l))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i), l.slice(i + 1)];
      }),
  );
}

export function admin() {
  const e = env();
  return createClient(e.SUPABASE_URL || e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY || e.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
}

export async function findUser(email: string) {
  const { data } = await admin().auth.admin.listUsers({ perPage: 1000 });
  return data.users.find((u) => u.email === email) ?? null;
}

export const newKey = () => "sl_" + randomBytes(24).toString("base64url");
export const hash = (s: string) => createHash("sha256").update(s).digest("hex");
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
