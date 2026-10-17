import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Hero3D } from "../Hero3D";
import { signIn, signUp } from "./actions";

export const metadata = { title: "Sign in" };

export default async function Login({ searchParams }: PageProps<"/login">) {
  const { error, message, mode } = (await searchParams) as { error?: string; message?: string; mode?: string };
  const signup = mode === "signup";
  return (
    <div className="grid min-h-full flex-1 lg:grid-cols-[1fr_1.1fr]">
      <main className="flex flex-col px-4 py-8 sm:px-10">
        <Link href="/" aria-label="StudyLens home">
          <Logo />
        </Link>
        <div className="mx-auto flex w-full max-w-[380px] flex-1 flex-col justify-center py-12">
          <h1 className="t-title">{signup ? "Create your account" : "Welcome back"}</h1>
          <p className="t-meta mt-1">{signup ? "You'll be signed in right away. No email to confirm." : "Sign in to pick up where you left off."}</p>

          <div role="tablist" className="mt-6 grid grid-cols-2 overflow-hidden rounded-[10px] border border-line-strong text-[14px]">
            <Link role="tab" aria-selected={!signup} href="/login" className={`py-2 text-center ${!signup ? "bg-ink font-semibold text-white" : "text-ink-2 hover:bg-sunken"}`}>
              Sign in
            </Link>
            <Link role="tab" aria-selected={signup} href="/login?mode=signup" className={`border-l border-line-strong py-2 text-center ${signup ? "bg-ink font-semibold text-white" : "text-ink-2 hover:bg-sunken"}`}>
              Create account
            </Link>
          </div>

          <form className="mt-5 flex flex-col gap-3" action={signup ? signUp : signIn}>
            <label className="grid gap-1.5">
              <span className="text-[13px] font-medium">Email</span>
              <input className="input" name="email" type="email" placeholder="you@school.edu" required autoComplete="email" />
            </label>
            <label className="grid gap-1.5">
              <span className="text-[13px] font-medium">Password</span>
              <input className="input" name="password" type="password" placeholder={signup ? "At least 8 characters" : "Your password"} minLength={8} required autoComplete={signup ? "new-password" : "current-password"} />
            </label>
            <button className="btn btn-lg mt-2 w-full">{signup ? "Create account" : "Sign in"}</button>
          </form>
          {error && (
            <p className="mt-4 rounded-[var(--r-inner)] bg-danger-soft px-3 py-2 text-[14px] text-danger" role="alert">
              {error}
            </p>
          )}
          {message && <p className="mt-4 rounded-[var(--r-inner)] bg-good-soft px-3 py-2 text-[14px] text-good">{message}</p>}
        </div>
      </main>
      <aside className="relative hidden border-l border-line bg-sunken/50 lg:block">
        <div className="absolute inset-0">
          <Hero3D />
        </div>
        <p className="absolute bottom-8 left-10 right-10 text-[15px] text-ink-2">Check your work on any page, get explanations you can watch, and practice that targets your mistakes.</p>
      </aside>
    </div>
  );
}
