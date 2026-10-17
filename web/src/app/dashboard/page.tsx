import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getMastery, getOpenMistakes, getProfile, getUpcoming } from "@/lib/learner";
import { db } from "@/lib/supabase";
import { ProfileEditor } from "./ProfileEditor";

const STATUS_COLOR: Record<string, string> = { verified: "bg-good", shaky: "bg-bad", learning: "bg-warn", unknown: "bg-muted" };

function due(at: string | null) {
  if (!at) return "no due date";
  const days = Math.round((Date.parse(at) - Date.now()) / 86_400_000);
  if (days < 0) return "overdue";
  if (days === 0) return "due today";
  if (days === 1) return "due tomorrow";
  return `due in ${days} days`;
}

export default async function Overview() {
  const user = await requireUser();
  const [upcoming, mastery, mistakes, profile, { count: courseCount }] = await Promise.all([
    getUpcoming(user.id, 14),
    getMastery(user.id),
    getOpenMistakes(user.id, 8),
    getProfile(user.id),
    db().from("courses").select("id", { count: "exact", head: true }).eq("user_id", user.id),
  ]);

  if (!courseCount && !mastery.length) {
    return (
      <div className="card max-w-xl">
        <h1 className="text-xl font-semibold">Welcome to StudyLens</h1>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-muted">
          <li>Install the browser extension and pair it from the <Link className="text-accent" href="/dashboard/connect">Connect</Link> page.</li>
          <li>Open Canvas or Google Classroom once. StudyLens syncs your courses and deadlines.</li>
          <li>On any homework page, open the StudyLens dock and press Check my work.</li>
          <li>Optionally, connect Claude so it knows your courses and how you learn.</li>
        </ol>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <section className="card">
        <h2 className="font-medium">Due in the next two weeks</h2>
        {upcoming.length ? (
          <ul className="mt-3 divide-y divide-line">
            {upcoming.map((a) => (
              <li key={a.id} className="flex items-baseline justify-between gap-3 py-2 text-sm">
                <span className="min-w-0">
                  {a.url ? (
                    <a className="hover:text-accent" href={a.url} target="_blank" rel="noreferrer">
                      {a.title}
                    </a>
                  ) : (
                    a.title
                  )}
                  {a.courses?.name && <span className="ml-2 text-muted">{a.courses.name}</span>}
                </span>
                <span className={`shrink-0 ${a.missing ? "text-bad" : "text-muted"}`}>{a.missing ? "missing" : due(a.due_at)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">Nothing due. Open your LMS with the extension installed to sync.</p>
        )}
      </section>

      <section className="card">
        <h2 className="font-medium">Skills</h2>
        {mastery.length ? (
          <ul className="mt-3 space-y-3">
            {mastery.slice(0, 12).map((m) => (
              <li key={m.key} className="text-sm">
                <div className="flex justify-between gap-2">
                  <span className="truncate">{m.label}</span>
                  <span className="text-muted">{Math.round(m.level * 100)}%</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line" role="meter" aria-valuenow={Math.round(m.level * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={m.label}>
                  <div className={`h-full ${STATUS_COLOR[m.status]}`} style={{ width: `${Math.round(m.level * 100)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">Skills appear after your first checked homework or practice.</p>
        )}
      </section>

      <section className="card">
        <div className="flex items-baseline justify-between">
          <h2 className="font-medium">Open mistakes</h2>
          {mistakes.length > 0 && (
            <Link className="text-sm text-accent" href="/dashboard/practice">
              Practice these
            </Link>
          )}
        </div>
        {mistakes.length ? (
          <ul className="mt-3 space-y-3 text-sm">
            {mistakes.map((m) => (
              <li key={m.id}>
                <span className="rounded bg-accent-soft px-1.5 py-0.5 text-xs text-accent">{m.skill_label}</span>
                <p className="mt-1">{m.note}</p>
                {m.misconception && <p className="text-muted">Likely belief: {m.misconception}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">No open mistakes.</p>
        )}
      </section>

      <section className="card">
        <h2 className="font-medium">How StudyLens sees you</h2>
        <p className="mt-1 text-xs text-muted">Built from your checks, practice, course updates and Claude conversations. Edit it if it&apos;s wrong.</p>
        <ProfileEditor initial={profile.mind_doc} />
      </section>
    </div>
  );
}
