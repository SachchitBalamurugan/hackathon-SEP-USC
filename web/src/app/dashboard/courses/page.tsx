import { requireUser } from "@/lib/session";
import { db } from "@/lib/supabase";
import { TopBar } from "@/components/shell/TopBar";
import { Empty, Row, Sheet, dueLabel } from "@/components/ui";

export const metadata = { title: "Courses" };

type Course = { id: string; name: string; code: string | null; source: string; current_score: number | null; url: string | null; updated_at: string };
type Assignment = { id: string; course_id: string | null; title: string; due_at: string | null; score: number | null; points_possible: number | null; submitted_at: string | null; missing: boolean; url: string | null };

const SOURCE: Record<string, string> = { canvas: "Canvas", classroom: "Google Classroom", generic: "Website" };

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

export default async function CoursesPage() {
  const user = await requireUser();
  const [{ data: courses }, { data: assignments }] = await Promise.all([
    db().from("courses").select("id, name, code, source, current_score, url, updated_at").eq("user_id", user.id).order("name"),
    db()
      .from("assignments")
      .select("id, course_id, title, due_at, score, points_possible, submitted_at, missing, url")
      .eq("user_id", user.id)
      .gte("due_at", daysAgo(14))
      .order("due_at")
      .limit(400),
  ]);
  const byCourse = new Map<string, Assignment[]>();
  for (const a of (assignments ?? []) as Assignment[]) if (a.course_id) byCourse.set(a.course_id, [...(byCourse.get(a.course_id) ?? []), a]);
  const list = (courses ?? []) as Course[];
  const lastSync = list.reduce((max, c) => (c.updated_at > max ? c.updated_at : max), "");

  return (
    <>
      <TopBar
        title="Courses"
        description={lastSync ? `Synced from your LMS. Last update ${new Date(lastSync).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}.` : "Synced from Canvas and Google Classroom through the extension."}
        demo="sync"
      />
      {list.length ? (
        <div className="grid gap-6">
          <p className="t-meta -mt-2">To refresh, open the course in Canvas or Classroom. StudyLens re-syncs in the background at most every 6 hours.</p>
          {list.map((c) => {
            const work = byCourse.get(c.id) ?? [];
            const upcoming = work.filter((a) => !a.submitted_at && a.due_at && a.due_at > daysAgo(1));
            return (
              <Sheet
                key={c.id}
                title={c.url ? <a href={c.url} target="_blank" rel="noreferrer" className="hover:underline">{c.name}</a> : c.name}
                meta={`${SOURCE[c.source] ?? c.source}${c.code ? ` · ${c.code}` : ""}`}
                action={c.current_score !== null ? <span className="text-[15px] font-semibold tabular-nums">{Math.round(c.current_score)}%</span> : undefined}
              >
                {upcoming.length ? (
                  upcoming.slice(0, 6).map((a) => {
                    const d = dueLabel(a.due_at);
                    return <Row key={a.id} href={a.url ?? undefined} mark={a.missing ? "danger" : d.tone === "none" ? "hollow" : d.tone} title={a.title} meta={a.missing ? <span className="font-medium text-danger">Missing</span> : d.text} />;
                  })
                ) : (
                  <div className="row t-meta">Nothing due right now.</div>
                )}
              </Sheet>
            );
          })}
        </div>
      ) : (
        <Sheet>
          <Empty
            title="No courses yet"
            detail="With the extension installed and paired, open Canvas or Google Classroom once. Your courses, deadlines, grades and course pages come in on their own."
            action={{ label: "Set up the extension", href: "/dashboard/connect#extension" }}
            demo="sync"
          />
        </Sheet>
      )}
    </>
  );
}
