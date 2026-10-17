import { Bell, BookOpen, Calendar, Inbox, LayoutDashboard, User } from "lucide-react";
import { DEMO_ASSIGNMENTS, DEMO_COURSES } from "@/lib/demoCanvas";

export const metadata = { title: "Dashboard" };

// A Canvas-style dashboard. The "ic-app" class is what the extension uses to recognise Canvas.
export default function DemoCanvas() {
  const todo = DEMO_COURSES.flatMap((c) => (DEMO_ASSIGNMENTS[c.id] ?? []).filter((a) => !a.submitted).map((a) => ({ ...a, course: c.name }))).sort((a, b) => a.due.localeCompare(b.due));
  const COLORS = ["#0b874b", "#c41e3a", "#2d3b45"];
  return (
    <div id="application" className="ic-app flex h-screen text-[#2d3b45]" style={{ fontFamily: "Lato, 'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      <nav className="flex w-[84px] shrink-0 flex-col items-center gap-1 bg-[#394b58] py-3 text-white">
        <div className="mb-3 grid size-12 place-items-center rounded-full bg-white/10 text-[11px] font-bold">LOGO</div>
        {[
          [User, "Account"],
          [LayoutDashboard, "Dashboard"],
          [BookOpen, "Courses"],
          [Calendar, "Calendar"],
          [Inbox, "Inbox"],
        ].map(([Icon, label], i) => {
          const I = Icon as typeof User;
          return (
            <div key={label as string} className={`flex w-full flex-col items-center gap-1 py-2 text-[11px] ${i === 1 ? "bg-white text-[#394b58]" : ""}`}>
              <I size={24} strokeWidth={1.6} />
              {label as string}
            </div>
          );
        })}
      </nav>
      <main className="min-w-0 flex-1 overflow-y-auto">
        <header className="flex h-16 items-center border-b border-[#c7cdd1] px-6">
          <h1 className="text-[22px] font-light">Dashboard</h1>
          <Bell size={18} className="ml-auto text-[#6b7780]" />
        </header>
        <div className="flex gap-8 p-6">
          <section className="grid flex-1 grid-cols-[repeat(auto-fill,minmax(240px,1fr))] content-start gap-6">
            {DEMO_COURSES.map((c, i) => (
              <article key={c.id} className="overflow-hidden rounded border border-[#c7cdd1] bg-white shadow-sm">
                <div className="h-[140px]" style={{ background: COLORS[i] }} />
                <div className="p-3">
                  <div className="font-bold" style={{ color: COLORS[i] }}>
                    {c.name}
                  </div>
                  <div className="text-[13px] text-[#6b7780]">{c.course_code}</div>
                </div>
              </article>
            ))}
          </section>
          <aside className="w-[300px] shrink-0">
            <h2 className="border-b border-[#c7cdd1] pb-2 text-[16px] font-bold">To Do</h2>
            <ul>
              {todo.map((a) => (
                <li key={a.id} className="border-b border-[#eef0f1] py-3 text-[14px]">
                  <div className="font-semibold text-[#0374b5]">{a.name}</div>
                  <div className="text-[12px] text-[#6b7780]">
                    {a.course} · {a.points} points · due {new Date(a.due).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </div>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </main>
    </div>
  );
}
