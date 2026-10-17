"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import { Empty } from "@/components/ui";

export type MistakeRow = {
  id: string;
  skill_label: string;
  note: string;
  misconception: string | null;
  subject: string | null;
  page_host: string | null;
  resolved_at: string | null;
  created_at: string;
};

const TABS = [
  { id: "open", label: "To fix" },
  { id: "resolved", label: "Fixed" },
  { id: "all", label: "All" },
] as const;

export function MistakesList({ initial }: { initial: MistakeRow[] }) {
  const [rows, setRows] = useState(initial);
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("open");
  const [skill, setSkill] = useState<string>("all");

  const skills = useMemo(() => [...new Set(rows.map((r) => r.skill_label))].sort(), [rows]);
  const shown = rows.filter((r) => (tab === "all" || (tab === "open" ? !r.resolved_at : r.resolved_at)) && (skill === "all" || r.skill_label === skill));
  const counts = { open: rows.filter((r) => !r.resolved_at).length, resolved: rows.filter((r) => r.resolved_at).length, all: rows.length };

  async function toggle(r: MistakeRow) {
    const resolved = !r.resolved_at;
    setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, resolved_at: resolved ? new Date().toISOString() : null } : x)));
    const res = await fetch("/api/mistakes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: r.id, resolved }) });
    if (!res.ok) setRows((rs) => rs.map((x) => (x.id === r.id ? r : x)));
  }

  return (
    <section className="sheet">
      <div className="sheet-head flex-wrap">
        <div role="tablist" className="inline-flex overflow-hidden rounded-[10px] border border-line-strong">
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={`h-8 px-3.5 text-[13px] ${tab === t.id ? "bg-ink font-semibold text-white" : "text-ink-2 hover:bg-sunken"} [&+&]:border-l [&+&]:border-line-strong`}>
              {t.label} <span className="tabular-nums opacity-70">{counts[t.id]}</span>
            </button>
          ))}
        </div>
        {skills.length > 1 && (
          <select className="input h-8 w-auto max-w-[240px] text-[13px]" value={skill} onChange={(e) => setSkill(e.target.value)} aria-label="Filter by skill">
            <option value="all">All skills</option>
            {skills.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        )}
      </div>
      {shown.length ? (
        <ul>
          {shown.map((r) => (
            <li key={r.id} className="row items-start py-3.5">
              <span className={`mark mt-1.5 ${r.resolved_at ? "mark-good" : "mark-danger"}`} />
              <div className="min-w-0 flex-1">
                <div className={`text-[14px] font-medium ${r.resolved_at ? "text-dim" : ""}`}>{r.note}</div>
                {r.misconception && <div className="t-meta mt-0.5">Likely thinking: {r.misconception}</div>}
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <span className="chip">{r.skill_label}</span>
                  {r.subject && <span className="chip">{r.subject}</span>}
                  <span className="t-meta self-center">{new Date(r.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}{r.page_host ? ` · ${r.page_host}` : ""}</span>
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
                {!r.resolved_at && (
                  <Link href={`/dashboard/practice?mistake=${r.id}`} className="btn btn-sm">
                    Practice
                  </Link>
                )}
                <button className="btn btn-secondary btn-sm" onClick={() => toggle(r)}>
                  {r.resolved_at ? (
                    <>
                      <RotateCcw size={13} /> Reopen
                    </>
                  ) : (
                    <>
                      <Check size={13} /> Fixed
                    </>
                  )}
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <Empty
          title={tab === "open" ? (rows.length ? "Nothing left to fix" : "No mistakes yet") : "Nothing here"}
          detail={rows.length ? "Practice clears mistakes automatically after two right answers in a row." : "Press Check my work on any homework page. Mistakes it finds land here with practice to match."}
          demo={rows.length ? undefined : "check"}
        />
      )}
    </section>
  );
}
