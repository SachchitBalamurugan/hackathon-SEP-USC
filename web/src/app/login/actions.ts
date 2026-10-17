"use server";

import { redirect } from "next/navigation";
import { authClient, db } from "@/lib/supabase";
import { env } from "@/lib/env";

const fields = (form: FormData) => ({ email: String(form.get("email") || "").trim(), password: String(form.get("password") || "") });

export async function signIn(form: FormData) {
  const supabase = await authClient();
  const { error } = await supabase.auth.signInWithPassword(fields(form));
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect("/dashboard");
}

/**
 * Sign-up without email confirmation: the account is created server-side as already confirmed
 * (no email is sent), then signed in. Set REQUIRE_EMAIL_CONFIRMATION=1 to restore the normal
 * confirm-by-email flow.
 */
export async function signUp(form: FormData) {
  const { email, password } = fields(form);
  if (password.length < 8) redirect(`/login?error=${encodeURIComponent("Use a password of at least 8 characters.")}`);
  const supabase = await authClient();

  if (process.env.REQUIRE_EMAIL_CONFIRMATION === "1") {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${env.siteUrl()}/auth/callback` } });
    if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
    if (!data.session) redirect(`/login?message=${encodeURIComponent("Check your email to confirm your account.")}`);
    redirect("/dashboard");
  }

  const { error: createError } = await db().auth.admin.createUser({ email, password, email_confirm: true });
  if (createError) {
    const taken = /already|registered|exists/i.test(createError.message);
    redirect(`/login?error=${encodeURIComponent(taken ? "That email already has an account. Sign in instead." : createError.message)}`);
  }
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await authClient();
  await supabase.auth.signOut();
  redirect("/login");
}
