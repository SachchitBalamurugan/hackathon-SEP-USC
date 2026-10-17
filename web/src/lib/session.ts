import "server-only";
import { redirect } from "next/navigation";
import { authClient } from "./supabase";

/** For dashboard Server Components: the signed-in user, or a redirect to /login. */
export async function requireUser() {
  const supabase = await authClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  return data.user;
}
