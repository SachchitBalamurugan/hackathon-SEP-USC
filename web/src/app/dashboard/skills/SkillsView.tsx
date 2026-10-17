"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import type { SkillGraph } from "@/lib/overview";
import { statusLabel, statusTone } from "@/components/ui";

const SkillsMap = dynamic(() => import("@/components/three/SkillsMap"), {
  ssr: false,
  loading: () => <div className="skeleton h-full w-full" />,
});

const LEGEND = [
  { status: "verified", label: "Solid" },
  { status: "learning", label: "Learning" },
  { status: "shaky", label: "Shaky" },
  { status: "unknown", label: "New" },
];

export function SkillsView({ graph }: { graph: SkillGraph }) {
  const [selected, setSelected] = useState<string | null>(null);
  const node = graph.nodes.find((n) => n.id === selected) ?? null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="sheet relative h-[440px] sm:h-[560px]">
        <SkillsMap graph={graph} selected={selected} setSelected={setSelected} />
        <div className="pointer-events-none absolute left-4 top-4 flex flex-wrap gap-3 rounded-full border border-line bg-surface/90 px-3 py-1.5 text-[12px] text-ink-2 backdrop-blur">
          {LEGEND.map((l) => (
            <span key={l.status} className="inline-flex items-center gap-1.5">
              <span className={`mark mark-${statusTone(l.status)}`} />
              {l.label}
            </span>
          ))}
        </div>
        <p className="pointer-events-none absolute bottom-3 left-4 text-[12px] text-dim">Drag to rotate · scroll to zoom · click a skill</p>
      </div>

      <aside className="grid content-start gap-6">
        {node ? (
          <section className="sheet rise">
            <div className="sheet-head">
              <div className="min-w-0">
                <h2 className="truncate text-[15px] font-semibold">{node.label}</h2>
                <p className="t-meta">{node.group}</p>
              </div>
              <span className={`chip chip-${statusTone(node.status) === "hollow" ? "" : statusTone(node.status)}`}>{statusLabel(node.status)}</span>
            </div>
            <div className="p-5">
              <div className="flex items-baseline justify-between">
                <span className="t-label">Mastery</span>
                <span className="text-[22px] font-semibold tabular-nums">{Math.round(node.level * 100)}%</span>
              </div>
              <p className="t-meta mt-1">Based on {node.evidence.toFixed(1)} recent pieces of evidence. Older evidence counts for less.</p>
              {node.mistakes.length > 0 && (
                <div className="mt-4">
                  <div className="t-label mb-2">Recent mistakes</div>
                  <ul className="space-y-2 text-[14px]">
                    {node.mistakes.map((m, i) => (
                      <li key={i}>
                        {m.note}
                        {m.misconception && <div className="t-meta">Likely thinking: {m.misconception}</div>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <Link href={`/dashboard/practice?skill=${encodeURIComponent(node.label)}`} className="btn mt-5 w-full">
                Practice this skill
              </Link>
            </div>
          </section>
        ) : (
          <section className="sheet">
            <div className="p-5">
              <h2 className="text-[15px] font-semibold">Your skills, mapped</h2>
              <p className="t-meta mt-1">Each sphere is a skill. Bigger means more evidence, color shows how solid it is, and lines join skills you used together.</p>
            </div>
          </section>
        )}

        <section className="sheet">
          <div className="sheet-head">
            <h2 className="text-[15px] font-semibold">All skills</h2>
            <span className="t-meta">{graph.nodes.length}</span>
          </div>
          <ul className="max-h-[300px] overflow-y-auto">
            {graph.nodes.map((n) => (
              <li key={n.id}>
                <button onClick={() => setSelected(n.id)} className={`row w-full text-left ${selected === n.id ? "bg-accent-soft" : "hover:bg-sunken/60"}`} aria-pressed={selected === n.id}>
                  <span className={`mark mark-${statusTone(n.status)}`} />
                  <span className="min-w-0 flex-1 truncate text-[14px]">{n.label}</span>
                  <span className="text-[13px] text-dim tabular-nums">{Math.round(n.level * 100)}%</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </aside>
    </div>
  );
}
