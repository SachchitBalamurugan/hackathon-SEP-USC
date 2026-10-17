import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getMastery, getOpenMistakes, getProfile, getUpcoming } from "@/lib/learner";
import { getOnboarding } from "@/lib/overview";
import { TopBar } from "@/components/shell/TopBar";
import { SetupChecklist } from "@/components/SetupChecklist";
import { Empty, Row, Sheet, dueLabel, statusLabel, statusTone } from "@/components/ui";
import { ProfileEditor } from "./ProfileEditor";

export const metadata = { title: "Today" };

export default async function Today() {
  const user = await requireUser();
  const [upcoming, mastery, mistakes, profile, onboarding] = await Promise.all([
    getUpcoming(user.id, 14),
    getMastery(user.id),
    getOpenMistakes(user.id, 5),
    getProfile(user.id),
    getOnboarding(user.id),
  ]);
  const weak = mastery.filter((m) => m.status === "shaky" || (m.status === "learning" && m.level < 0.6)).slice(0, 5);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <>
      <TopBar title={greeting} description="What's due, what to fix, and what StudyLens has learned about you." demo="intro" />
      <div className="grid gap-6">
        <SetupChecklist status={onboarding} />

        <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
          <Sheet title="Due in the next two weeks" meta={upcoming.length ? `${upcoming.length} assignment${upcoming.length === 1 ? "" : "s"}` : undefined} action={<Link href="/dashboard/courses" className="link text-[13px]">All courses</Link>}>
            {upcoming.length ? (
              upcoming.slice(0, 8).map((a) => {
                const d = dueLabel(a.due_at);
                return (
                  <Row
                    key={a.id}
                    href={a.url ?? undefined}
                    mark={a.missing ? "danger" : d.tone === "danger" ? "danger" : d.tone === "warn" ? "warn" : "hollow"}
                    title={a.title}
                    subtitle={a.courses?.name}
                    meta={<span className={a.missing || d.tone === "danger" ? "font-medium text-danger" : ""}>{a.missing ? "Missing" : d.text}</span>}
                  />
                );
              })
            ) : (
              <Empty title="Nothing due yet" detail="Open Canvas or Google Classroom with the extension installed and your deadlines appear here." demo="sync" />
            )}
          </Sheet>

          <Sheet title="Pick up where you left off" meta="Mistakes from your recent work" action={mistakes.length ? <Link href="/dashboard/mistakes" className="link text-[13px]">See all</Link> : undefined}>
            {mistakes.length ? (
              mistakes.map((m) => (
                <Row key={m.id} mark="danger" title={m.note} subtitle={m.misconception ? `Likely thinking: ${m.misconception}` : m.skill_label}>
                  <Link href={`/dashboard/practice?mistake=${m.id}`} className="btn btn-secondary btn-sm">
                    Practice
                  </Link>
                </Row>
              ))
            ) : (
              <Empty title="No open mistakes" detail="When you press Check my work, anything that needs fixing shows up here with practice to match." demo="check" />
            )}
          </Sheet>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.35fr]">
          <Sheet title="Skills to work on" action={<Link href="/dashboard/skills" className="link inline-flex items-center gap-1 text-[13px]">Skills map <ArrowRight size={13} /></Link>}>
            {weak.length ? (
              weak.map((m) => (
                <Row key={m.key} mark={statusTone(m.status)} title={m.label} subtitle={statusLabel(m.status)} meta={`${Math.round(m.level * 100)}%`} />
              ))
            ) : (
              <Empty title={mastery.length ? "Nothing shaky right now" : "No skills yet"} detail={mastery.length ? "Keep checking your work and practicing to keep it that way." : "Skills appear after your first check or practice set."} />
            )}
          </Sheet>

          <Sheet title="How StudyLens sees you" meta="Built from your checks, practice, courses and Claude conversations. Edit anything that's wrong.">
            <div className="p-5">
              <ProfileEditor initial={profile.mind_doc} />
            </div>
          </Sheet>
        </div>
      </div>
    </>
  );
}
