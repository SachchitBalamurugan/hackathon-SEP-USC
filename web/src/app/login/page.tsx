import { signIn, signUp } from "./actions";

export default async function Login({ searchParams }: PageProps<"/login">) {
  const { error, message } = (await searchParams) as { error?: string; message?: string };
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-16">
      <h1 className="text-2xl font-semibold">Sign in to StudyLens</h1>
      <p className="mt-1 text-sm text-muted">New here? Enter an email and password, then choose Create account.</p>
      <form className="mt-6 flex flex-col gap-3">
        <input className="input" name="email" type="email" placeholder="you@school.edu" required autoComplete="email" />
        <input className="input" name="password" type="password" placeholder="Password (8+ characters)" minLength={8} required autoComplete="current-password" />
        <div className="flex gap-2">
          <button className="btn flex-1 justify-center" formAction={signIn}>
            Sign in
          </button>
          <button className="btn btn-ghost flex-1 justify-center" formAction={signUp}>
            Create account
          </button>
        </div>
      </form>
      {error && <p className="mt-4 text-sm text-bad">{error}</p>}
      {message && <p className="mt-4 text-sm text-good">{message}</p>}
    </main>
  );
}
