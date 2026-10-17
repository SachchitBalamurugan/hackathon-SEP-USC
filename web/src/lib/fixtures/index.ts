import "server-only";
import { emptyUser, MAYA, userFor } from "./seed";
import { fixtureDb } from "./memdb";

/** Demo fixtures: in-memory data and a cookie sign-in, for recording. Never in production. */
export const fixturesOn = () => process.env.DEMO_FIXTURES === "1" && process.env.NODE_ENV !== "production";

export const FIXTURE_COOKIE = "sl_demo_user";

type CookieStore = { get(name: string): { value: string } | undefined; set(name: string, value: string, opts?: Record<string, unknown>): void; delete(name: string): void };

/** Sign-in with any email and password; Maya's email gets the seeded account. */
export function fixtureAuth(store: CookieStore) {
  const signIn = async ({ email }: { email: string; password?: string }) => {
    const user = userFor(email || MAYA.email);
    const db = fixtureDb();
    const { data } = await db.from("profiles").select("id").eq("id", user.id).maybeSingle();
    if (!data) {
      const rows = emptyUser(user.id);
      await db.from("profiles").insert(rows.profiles);
      await db.from("learner_profile").insert(rows.learner_profile);
    }
    try {
      store.set(FIXTURE_COOKIE, JSON.stringify(user), { path: "/", httpOnly: true, sameSite: "lax" });
    } catch {
      /* read-only in Server Components */
    }
    return { data: { user, session: {} }, error: null };
  };
  return {
    auth: {
      getUser: async () => {
        const raw = store.get(FIXTURE_COOKIE)?.value;
        return { data: { user: raw ? (JSON.parse(raw) as typeof MAYA) : null }, error: null };
      },
      signInWithPassword: signIn,
      signUp: signIn,
      signOut: async () => {
        try {
          store.delete(FIXTURE_COOKIE);
        } catch {
          /* read-only */
        }
        return { error: null };
      },
      exchangeCodeForSession: async () => ({ error: null }),
    },
  };
}

export { fixtureDb };

