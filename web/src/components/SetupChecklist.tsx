import Link from "next/link";
import { Check } from "lucide-react";
import type { Onboarding } from "@/lib/overview";

const STEPS: { key: keyof Onboarding | "account"; title: string; detail: string; action?: { label: string; href: string } }[] = [
  { key: "account", title: "Create your account", detail: "Done. Everything you learn is saved here." },
  { key: "extension", title: "Add the browser extension", detail: "It checks your work on any page and syncs your courses.", action: { label: "Install and pair", href: "/dashboard/connect#extension" } },
  { key: "courses", title: "Sync your courses", detail: "Open Canvas or Google Classroom once with the extension on.", action: { label: "How syncing works", href: "/dashboard/courses" } },
  { key: "firstCheck", title: "Check your first assignment", detail: "On any homework page, press Check my work (Alt+Shift+C)." },
  { key: "claude", title: "Connect Claude (optional)", detail: "Claude gets your courses, skills and mistakes, and teaches to them.", action: { label: "Connect Claude", href: "/dashboard/connect#claude" } },
];

export function SetupChecklist({ status }: { status: Onboarding }) {
  const done = (k: (typeof STEPS)[number]["key"]) => k === "account" || status[k as keyof Onboarding];
  const complete = STEPS.filter((s) => done(s.key)).length;
  if (complete === STEPS.length) return null;
  const next = STEPS.find((s) => !done(s.key));
  return (
    <section className="sheet rise">
      <div className="sheet-head">
        <div>
          <h2 className="text-[15px] font-semibold">Get set up</h2>
          <p className="t-meta">
            {complete} of {STEPS.length} done. Each step ticks off by itself.
          </p>
        </div>
        <div className="h-1.5 w-32 overflow-hidden rounded-full bg-sunken" aria-hidden="true">
          <div className="h-full rounded-full bg-ink transition-[width] duration-500" style={{ width: `${(complete / STEPS.length) * 100}%` }} />
        </div>
      </div>
      <ol>
        {STEPS.map((s, i) => {
          const isDone = done(s.key);
          const isNext = s === next;
          return (
            <li key={s.key} className={`row ${isNext ? "bg-sunken/60" : ""}`}>
              <span className={`grid size-6 shrink-0 place-items-center rounded-full text-[12px] font-semibold ${isDone ? "bg-good text-white" : isNext ? "bg-ink text-white" : "border border-line-strong text-dim"}`}>
                {isDone ? <Check size={13} strokeWidth={3} /> : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className={`text-[14px] font-medium ${isDone ? "text-dim line-through decoration-faint" : ""}`}>{s.title}</div>
                {!isDone && <div className="t-meta">{s.detail}</div>}
              </div>
              {!isDone && s.action && (
                <Link href={s.action.href} className={`btn btn-sm ${isNext ? "" : "btn-secondary"}`}>
                  {s.action.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
