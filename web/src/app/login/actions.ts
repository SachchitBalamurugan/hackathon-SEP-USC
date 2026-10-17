"use server";

import { redirect } from "next/navigation";
import { authClient } from "@/lib/supabase";
import { env } from "@/lib/env";

const fields = (form: FormData) => ({ email: String(form.get("email") || "").trim(), password: String(form.get("password") || "") });

export async function signIn(form: FormData) {
  const supabase = await authClient();
  const { error } = await supabase.auth.signInWithPassword(fields(form));
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect("/dashboard");
}

export async function signUp(form: FormData) {
  const supabase = await authClient();
  const { data, error } = await supabase.auth.signUp({ ...fields(form), options: { emailRedirectTo: `${env.siteUrl()}/auth/callback` } });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  if (!data.session) redirect(`/login?message=${encodeURIComponent("Check your email to confirm your account.")}`);
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await authClient();
  await supabase.auth.signOut();
  redirect("/login");
}
