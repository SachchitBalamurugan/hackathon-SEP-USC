import { useCallback, useEffect, useRef, useState } from "react";
import type { LearnerEvent, Mark } from "@studylens/core";
import { anchorMarks } from "@/lib/anchor";
import { send, type CheckResponse, type Push } from "@/lib/messages";
import { settingsCache, type Settings } from "@/lib/config";
import { MarksLayer, type PlacedMarks } from "./MarksLayer";
import { AskPanel } from "./AskPanel";
import { PracticePanel } from "./PracticePanel";
import { TodayPanel, type Context } from "./TodayPanel";
import { MathText } from "./MathText";

type Tab = "check" | "ask" | "practice" | "today";
const TABS: { id: Tab; label: string }[] = [
  { id: "check", label: "Check" },
  { id: "ask", label: "Ask" },
  { id: "practice", label: "Practice" },
  { id: "today", label: "Today" },
];

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

export function App({ setHidden, emit, trackingActive, registerAutoCheck }: { setHidden: (h: boolean) => void; emit: (e: LearnerEvent) => void; trackingActive: boolean; registerAutoCheck: (fn: () => void) => void }) {
  const host = location.hostname;
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const [tab, setTab] = useState<Tab>("check");
  const [paired, setPaired] = useState<boolean | null>(null);
  const [ctx, setCtx] = useState<Context | null>(null);
  const [placed, setPlaced] = useState<PlacedMarks | null>(null);
  const [check, setCheck] = useState<{ state: "idle" | "working" | "done" | "error"; summary?: string; question?: string; error?: string; errors?: number }>({ state: "idle" });
  const [askSeed, setAskSeed] = useState<string | null>(null);
  const [practiceFocus, setPracticeFocus] = useState<{ skill?: string } | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    send<{ paired: boolean }>({ type: "STATUS" }).then((s) => setPaired(s.paired)).catch(() => setPaired(false));
  }, []);

  useEffect(() => {
    if (open && paired && !ctx) send<Context>({ type: "CONTEXT" }).then(setCtx).catch(() => {});
  }, [open, paired, ctx]);

  const runCheck = useCallback(
    async (silent = false) => {
      if (busy.current) return;
      busy.current = true;
      if (!silent) {
        setOpen(true);
        setTab("check");
      }
      setCheck({ state: "working" });
      setPlaced(null);
      try {
        setHidden(true);
        await nextFrame();
        const { checkId } = await send<{ checkId: string }>({ type: "CAPTURE" });
        setHidden(false); // captured; the dock comes back while the model reads it
        const result = await send<CheckResponse>({ type: "CHECK", checkId, host });
        setHidden(true);
        await nextFrame();
        const anchors = anchorMarks(result.marks);
        setHidden(false);
        const errors = result.marks.filter((m) => m.kind === "error").length;
        setPlaced({ checkId: result.checkId, marks: result.marks, anchors, refining: result.marks.map((m) => m.kind === "error") });
        setCheck({ state: "done", summary: result.summary, question: result.question, errors });
        if (silent && errors) setOpen(true);
        // Zoomed refine pass: each error mark slides to its tighter position as it returns.
        result.marks.forEach((m, i) => {
          if (m.kind !== "error") return;
          send<{ mark: Mark }>({ type: "REFINE", checkId: result.checkId, mark: m })
            .then(({ mark }) => mark)
            .catch(() => m)
            .then((mark) =>
              setPlaced((p) =>
                p && p.checkId === result.checkId ? { ...p, marks: p.marks.map((x, j) => (j === i ? mark : x)), refining: p.refining.map((x, j) => (j === i ? false : x)) } : p,
              ),
            );
        });
      } catch (e) {
        setHidden(false);
        setCheck({ state: "error", error: (e as Error).message });
      } finally {
        busy.current = false;
      }
    },
    [host, setHidden],
  );

  useEffect(() => registerAutoCheck(() => runCheck(true)), [registerAutoCheck, runCheck]);

  useEffect(() => {
    const onPush = (msg: Push) => {
      if (msg.type !== "COMMAND") return;
      if (msg.command === "check-work") runCheck();
      if (msg.command === "toggle-dock") setVisible((v) => !v);
    };
    browser.runtime.onMessage.addListener(onPush);
    return () => browser.runtime.onMessage.removeListener(onPush);
  }, [runCheck]);

  const explainMark = (m: Mark) => {
    setAskSeed(`Help me understand this mistake without giving away the answer: "${m.note}"${m.misconception ? ` (I might be thinking: ${m.misconception})` : ""}`);
    setTab("ask");
    setOpen(true);
  };

  const feedback = (m: Mark, verdict: "helpful" | "wrong") => {
    emit({ source: "usage", kind: "mark_feedback", payload: { kind: m.kind, verdict, skill: m.skill } });
    if (verdict === "wrong") setPlaced((p) => (p ? { ...p, marks: p.marks.filter((x) => x !== m), anchors: p.anchors.filter((_, j) => p.marks[j] !== m), refining: p.refining.filter((_, j) => p.marks[j] !== m) } : p));
  };

  const updateSettings = async (patch: Partial<Settings>) => {
    try {
      const s = await send<Settings>({ type: "SETTINGS", patch });
      setCtx((c) => (c ? { ...c, settings: s } : c));
      await settingsCache.setValue(s);
    } catch {
      /* the checkbox snaps back on the next context load */
    }
  };

  if (!visible) return null;

  return (
    <>
      {placed && <MarksLayer key={placed.checkId} placed={placed} onExplain={explainMark} onFeedback={feedback} onDismiss={() => setPlaced(null)} />}
      <div className="sl-root">
        {open && (
          <div className="sl-panel" role="dialog" aria-label="StudyLens">
            <header className="sl-header">
              <strong>StudyLens</strong>
              {trackingActive && (
                <span className="sl-tracking" title="Learning from how you work on this site. Pause it in the Today tab.">
                  ● learning
                </span>
              )}
              <button className="sl-icon" aria-label="Close" onClick={() => setOpen(false)}>
                ×
              </button>
            </header>
            {paired === false ? (
              <div className="sl-body">
                <p>Connect StudyLens to your account: click the StudyLens icon in the toolbar and enter the pairing code from your dashboard.</p>
              </div>
            ) : (
              <>
                <nav className="sl-tabs" role="tablist">
                  {TABS.map((t) => (
                    <button key={t.id} role="tab" aria-selected={tab === t.id} className={`sl-tab${tab === t.id ? " sl-tab-on" : ""}`} onClick={() => setTab(t.id)}>
                      {t.label}
                    </button>
                  ))}
                </nav>
                <div className="sl-body">
                  {tab === "check" && (
                    <div className="sl-check-panel">
                      <button className="sl-btn sl-btn-wide" disabled={check.state === "working"} onClick={() => runCheck()}>
                        {check.state === "working" ? "Reading your work…" : "Check my work"}
                      </button>
                      <p className="sl-muted sl-small">Takes a screenshot of this tab, finds mistakes and marks them on the page. Shortcut: Alt+Shift+C.</p>
                      {check.state === "error" && <p className="sl-error">{check.error}</p>}
                      {check.state === "done" && (
                        <div className="sl-card">
                          {check.summary && <MathText className="sl-block" text={check.summary} />}
                          {check.question && (
                            <div className="sl-question">
                              <MathText text={check.question} />
                            </div>
                          )}
                          {!!check.errors && (
                            <div className="sl-row sl-wrap">
                              <button className="sl-btn sl-btn-ghost" onClick={() => setTab("practice")}>
                                Practice this
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {tab === "ask" && <AskPanel seed={askSeed} onSeedUsed={() => setAskSeed(null)} onCaptureStart={() => setHidden(true)} onCaptureEnd={() => setHidden(false)} />}
                  {tab === "practice" && <PracticePanel focus={practiceFocus} />}
                  {tab === "today" && (
                    <TodayPanel
                      ctx={ctx}
                      host={host}
                      onPractice={(skill) => {
                        setPracticeFocus({ skill });
                        setTab("practice");
                      }}
                      onSetting={updateSettings}
                    />
                  )}
                </div>
              </>
            )}
          </div>
        )}
        <button className={`sl-fab${check.state === "working" ? " sl-fab-busy" : ""}`} aria-label={open ? "Hide StudyLens" : "Open StudyLens"} onClick={() => setOpen((o) => !o)}>
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2.2" />
            <path d="M15.5 15.5 L21 21" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </>
  );
}
