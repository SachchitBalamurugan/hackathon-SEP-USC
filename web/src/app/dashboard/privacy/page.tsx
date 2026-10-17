import { requireUser } from "@/lib/session";
import { db } from "@/lib/supabase";
import { PrivacyControls } from "./PrivacyControls";

export default async function Privacy() {
  const user = await requireUser();
  const { data } = await db().from("profiles").select("tracking_enabled, paused_hosts").eq("id", user.id).maybeSingle();
  return (
    <div className="grid max-w-2xl gap-6">
      <section className="card">
        <h1 className="text-lg font-semibold">Learning signals</h1>
        <p className="mt-1 text-sm text-muted">
          With this on, the extension notices how you work (time on a page, idle time, switching tabs away, rewriting the same answer) so StudyLens can learn when you&apos;re stuck and how you focus.
          It never records what you type, what&apos;s on the page, passwords or form fields, and it never runs on email, banking, health or password-manager sites.
          Screenshots are taken only when you press Check, and are not stored.
        </p>
        <PrivacyControls initialEnabled={data?.tracking_enabled ?? false} initialPaused={data?.paused_hosts ?? []} />
      </section>
      <section className="card">
        <h2 className="text-lg font-semibold">Your data</h2>
        <p className="mt-1 text-sm text-muted">Download everything StudyLens has stored about you, or delete it all. Deleting keeps your account but clears your courses, events, skills, mistakes, practice and profile.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a className="btn btn-ghost" href="/api/me">
            Export my data
          </a>
          <PrivacyControls.Delete />
        </div>
      </section>
    </div>
  );
}
