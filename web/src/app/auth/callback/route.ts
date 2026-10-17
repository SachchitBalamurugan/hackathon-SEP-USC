import { NextResponse } from "next/server";
import { authClient } from "@/lib/supabase";

// Email-confirmation links land here with a one-time code to exchange for a session.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (code) {
    const supabase = await authClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/dashboard", url.origin));
  }
  return NextResponse.redirect(new URL("/login?error=Confirmation%20link%20is%20invalid%20or%20expired", url.origin));
}
