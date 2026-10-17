import { requireUser } from "@/lib/session";
import { db } from "@/lib/supabase";
import { TopBar } from "@/components/shell/TopBar";
import { Sheet } from "@/components/ui";
import { PrivacyControls } from "./PrivacyControls";

export const metadata = { title: "Privacy" };

const NEVER = [
  "What you type, or the text on any page",
  "Passwords and form fields",
  "Anything on email, banking, health, sign-in or password-manager sites",
  "Screenshots, which are sent to the tutor only when you ask and never stored",
];

export default async function Privacy() {
  const user = await requireUser();
  const { data } = await db().from("profiles").select("tracking_enabled, paused_hosts").eq("id", user.id).maybeSingle();
  return (
    <>
      <TopBar title="Privacy" description="You decide what StudyLens learns from, and you can take it all with you or delete it." />
      <div className="mx-auto grid max-w-3xl gap-6">
        <Sheet title="Learning from how you work" meta="Off unless you turn it on.">
          <div className="p-5">
            <p className="text-[14px] text-ink-2">
              With this on, the extension notices time on task, idle time, switching away, and how often you rewrite an answer, so StudyLens can tell when you are stuck and how you focus best.
            </p>
            <PrivacyControls initialEnabled={data?.tracking_enabled ?? false} initialPaused={data?.paused_hosts ?? []} />
          </div>
        </Sheet>
        <Sheet title="Never collected">
          {NEVER.map((n) => (
            <div key={n} className="row">
              <span className="mark mark-good" />
              <span className="text-[14px]">{n}</span>
            </div>
          ))}
        </Sheet>
        <Sheet title="Your data" meta="Deleting keeps your account but clears courses, skills, mistakes, practice and your profile.">
          <div className="flex flex-wrap gap-3 p-5">
            <a className="btn btn-secondary" href="/api/me">
              Export my data
            </a>
            <PrivacyControls.Delete />
          </div>
        </Sheet>
      </div>
    </>
  );
}
