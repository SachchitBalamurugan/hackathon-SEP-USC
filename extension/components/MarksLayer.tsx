import { useEffect, useState } from "react";
import { markToViewportRect, type Mark } from "@studylens/core";
import { drift, type Anchor } from "@/lib/anchor";

export type PlacedMarks = { checkId: string; marks: Mark[]; anchors: Anchor[]; refining: boolean[] };

/** Fixed layer over the page. Marks follow the scroll container they were found in. */
export function MarksLayer({ placed, onExplain, onPractice, onFeedback, onDismiss }: { placed: PlacedMarks; onExplain: (m: Mark) => void; onPractice: (m: Mark) => void; onFeedback: (m: Mark, verdict: "helpful" | "wrong") => void; onDismiss: () => void }) {
  const [, setTick] = useState(0);
  const [openIdx, setOpenIdx] = useState<number | null>(() => {
    const i = placed.marks.findIndex((m) => m.kind === "error");
    return i >= 0 ? i : null;
  });

  useEffect(() => {
    let raf = 0;
    const onMove = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setTick((t) => t + 1));
    };
    window.addEventListener("scroll", onMove, { capture: true, passive: true });
    window.addEventListener("resize", onMove);
    return () => {
      window.removeEventListener("scroll", onMove, { capture: true });
      window.removeEventListener("resize", onMove);
    };
  }, []);

  const viewport = { width: window.innerWidth, height: window.innerHeight };
  return (
    <div className="sl-marks" aria-live="polite">
      {placed.marks.map((m, i) => {
        const r = markToViewportRect(m, viewport);
        const [dx, dy] = drift(placed.anchors[i]);
        const left = r.left + dx;
        const top = r.top + dy;
        const open = openIdx === i;
        return (
          <div key={i} className={`sl-mark sl-mark-${m.kind} sl-mark-${m.shape}${placed.refining[i] ? " sl-mark-refining" : ""}`} style={{ left, top, width: r.width, height: r.height }}>
            <button className="sl-mark-hit" aria-label={`${m.kind}: ${m.note}`} onClick={() => setOpenIdx(open ? null : i)} />
            {open && (
              <div className={`sl-note ${top > viewport.height * 0.6 ? "sl-note-above" : ""}`} role="dialog">
                <div className="sl-note-kind">{m.kind === "error" ? "Mistake" : m.kind === "correct" ? "Nice" : "Can't read this"}</div>
                <div className="sl-note-text">{m.note}</div>
                {m.kind === "error" && (
                  <div className="sl-note-actions">
                    <button className="sl-btn sl-btn-sm" onClick={() => onExplain(m)}>
                      Explain
                    </button>
                    <button className="sl-btn sl-btn-sm sl-btn-ghost" onClick={() => onPractice(m)}>
                      Practice this
                    </button>
                    <button className="sl-link" onClick={() => onFeedback(m, "helpful")}>
                      I got it
                    </button>
                    <button className="sl-link" style={{ color: "var(--sl-muted)" }} onClick={() => onFeedback(m, "wrong")}>
                      That&apos;s not wrong
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
      <button className="sl-marks-clear" onClick={onDismiss}>
        Clear marks
      </button>
    </div>
  );
}
