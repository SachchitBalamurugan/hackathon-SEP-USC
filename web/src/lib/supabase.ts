import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "./env";

let admin: SupabaseClient | null = null;

/**
 * Service-role client. Bypasses RLS, so every query through it MUST filter by a user id that
 * came from resolveUser(), never from a request body.
 */
export function db(): SupabaseClient {
  admin ??= createClient(env.supabaseUrl(), env.supabaseServiceKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}

/** Cookie-bound client used only for Supabase Auth (sign-in, session, sign-out). */
export async function authClient() {
  const store = await cookies();
  return createServerClient(env.supabaseUrl(), env.supabaseAnonKey(), {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Called from a Server Component, where cookies are read-only. The proxy refreshes them.
        }
      },
    },
  });
}
