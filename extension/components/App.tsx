import { useCallback, useEffect, useRef, useState } from "react";
import { type CheckResult, type LearnerEvent, type Mark } from "@studylens/core";
import { anchorMarks } from "@/lib/anchor";
import { send, type CheckResponse, type PollResponse, type Push } from "@/lib/messages";
import { settingsCache, type Settings } from "@/lib/config";
import { MarksLayer, type PlacedMarks } from "./MarksLayer";
import { AskPanel } from "./AskPanel";
import { PracticePanel } from "./PracticePanel";
import { TodayPanel, type Context } from "./TodayPanel";
import { MathText } from "./MathText";
import { FirstRun, firstRunDone } from "./FirstRun";
import { ClaudeHandoff } from "./ClaudeHandoff";

type Tab = "check" | "ask" | "practice" | "today";
const TABS: { id: Tab; label: string }[] = [
  { id: "check", label: "Check" },
  { id: "ask", label: "Ask" },
  { id: "practice", label: "Practice" },
  { id: "today", label: "Today" },
];

/** The visible stages of a check, so a 6 to 10 second wait never looks frozen. */
const STAGES = ["Capturing your screen", "Reading your work", "Placing marks"] as const;
type CheckState =
  | { state: "idle" }
  | { state: "working"; stage: number }
  | { state: "claude"; prompt: string; copied: boolean }
  | { state: "done"; summary: string; question: string; errors: number; correct: number }
  | { state: "error"; error: string };

const POLL_MS = 2500;
const POLL_FOR_MS = 15 * 60_000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

const Lens = ({ size = 18 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
    <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2.4" />
    <path d="M15.5 15.5 L21 21" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
  </svg>
);

export function App({ setHidden, emit, trackingActive, registerAutoCheck }: { setHidden: (h: boolean) => void; emit: (e: LearnerEvent) => void; trackingActive: boolean; registerAutoCheck: (fn: () => void) => void }) {
  const host = location.hostname;
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const [tab, setTab] = useState<Tab>("check");
  const [paired, setPaired] = useState<boolean | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [ctx, setCtx] = useState<Context | null>(null);
  const [placed, setPlaced] = useState<PlacedMarks | null>(null);
  const [check, setCheck] = useState<CheckState>({ state: "idle" });
  const [askSeed, setAskSeed] = useState<string | null>(null);
  const [practiceFocus, setPracticeFocus] = useState<{ skill?: string } | null>(null);
  const busy = useRef(false);
  /** The check whose Claude-mode marks we are waiting for; a new check cancels the wait. */
  const pollId = useRef<string | null>(null);
  /** Learned from the first check: auto-check would queue work for Claude nobody asked for. */
  const claudeMode = useRef(false);

  const place = useCallback(
    async (result: CheckResult, checkId: string, refine: boolean) => {
      setHidden(true);
      await nextFrame();
      const anchors = anchorMarks(result.marks);
      setHidden(false);
      const errors = result.marks.filter((m) => m.kind === "error").length;
      const correct = result.marks.filter((m) => m.kind === "correct").length;
      setPlaced({ checkId, marks: result.marks, anchors, refining: result.marks.map((m) => refine && m.kind === "error") });
      setCheck({ state: "done", summary: result.summary, question: result.question, errors, correct });
      if (!refine) return;
      // Zoomed refine pass: each error mark slides to its tighter position as it returns.
      result.marks.forEach((m, i) => {
        if (m.kind !== "error") return;
        send<{ mark: Mark }>({ type: "REFINE", checkId, mark: m })
          .then(({ mark }) => mark)
          .catch(() => m)
          .then((mark) =>
            setPlaced((p) => (p && p.checkId === checkId ? { ...p, marks: p.marks.map((x, j) => (j === i ? mark : x)), refining: p.refining.map((x, j) => (j === i ? false : x)) } : p)),
          );
      });
    },
    [setHidden],
  );

  useEffect(() => {
    send<{ paired: boolean }>({ type: "STATUS" })
      .then((s) => setPaired(s.paired))
      .catch(() => setPaired(false));
    firstRunDone.getValue().then((done) => setShowGuide(!done));
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
        setShowGuide(false);
      }
      setCheck({ state: "working", stage: 0 });
      setPlaced(null);
      try {
        setHidden(true);
        await nextFrame();
        const { checkId } = await send<{ checkId: string }>({ type: "CAPTURE" });
        pollId.current = checkId;
        setHidden(false); // captured; the dock comes back while the model reads it
        setCheck({ state: "working", stage: 1 });
        const res = await send<CheckResponse>({ type: "CHECK", checkId, host });
        if ("queued" in res) {
          // Claude mode: the student's own Claude reads the screenshot. Hand them the words to
          // say, then wait for the marks it posts back.
          claudeMode.current = true;
          if (silent) {
            setCheck({ state: "idle" });
            return;
          }
          busy.current = false; // waiting on Claude must not block a fresh check
          const copied = await navigator.clipboard.writeText(res.prompt).then(
            () => true,
            () => false,
          );
          setCheck({ state: "claude", prompt: res.prompt, copied });
          setOpen(true);
          const until = Date.now() + POLL_FOR_MS;
          let result: CheckResult | null = null;
          while (!result && Date.now() < until && pollId.current === checkId) {
            await sleep(POLL_MS);
            const poll = await send<PollResponse>({ type: "POLL_CHECK", taskId: res.taskId }).catch(() => null);
            if (poll?.status === "done") result = poll.result;
          }
          if (pollId.current !== checkId) return;
          if (!result) throw new Error("Claude didn't send marks back. Press Check my work to try again.");
          await place(result, checkId, false);
          return;
        }
        setCheck({ state: "working", stage: 2 });
        await place(res, checkId, true);
        if (silent && res.marks.some((m) => m.kind === "error")) setOpen(true);
      } catch (e) {
        setHidden(false);
        setCheck({ state: "error", error: (e as Error).message });
      } finally {
        busy.current = false;
      }
    },
    [host, setHidden, place],
  );

  useEffect(() => registerAutoCheck(() => !claudeMode.current && runCheck(true)), [registerAutoCheck, runCheck]);

  useEffect(() => {
    const onPush = (msg: Push) => {
      if (msg.type !== "COMMAND") return;
      if (msg.command === "check-work") runCheck();
      if (msg.command === "toggle-dock") setVisible((v) => !v);
    };
    browser.runtime.onMessage.addListener(onPush);
    return () => browser.runtime.onMessage.removeListener(onPush);
  }, [runCheck]);

  const openTab = (t: Tab) => {
    setTab(t);
    setOpen(true);
    setShowGuide(false);
  };

  const explainMark = (m: Mark) => {
    setAskSeed(`Help me understand this mistake without giving away the answer: "${m.note}"${m.misconception ? ` (I might be thinking: ${m.misconception})` : ""}`);
    openTab("ask");
  };

  const practiceMark = (m: Mark) => {
    setPracticeFocus({ skill: m.skill });
    openTab("practice");
  };

  const feedback = (m: Mark, verdict: "helpful" | "wrong") => {
    emit({ source: "usage", kind: "mark_feedback", payload: { kind: m.kind, verdict, skill: m.skill } });
    setPlaced((p) => {
      if (!p) return p;
      const keep = p.marks.map((x) => x !== m);
      return { ...p, marks: p.marks.filter((_, j) => keep[j]), anchors: p.anchors.filter((_, j) => keep[j]), refining: p.refining.filter((_, j) => keep[j]) };
    });
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
  const working = check.state === "working";

  return (
    <>
      {placed && <MarksLayer key={placed.checkId} placed={placed} onExplain={explainMark} onPractice={practiceMark} onFeedback={feedback} onDismiss={() => setPlaced(null)} />}
      <div className="sl-root">
        {open && (
          <div className="sl-panel" role="dialog" aria-label="StudyLens">
            <header className="sl-header">
              <strong>StudyLens</strong>
              {trackingActive && (
                <span className="sl-tracking" title="Learning from how you work on this site. Pause it in the Today tab.">
                  ● learning on
                </span>
              )}
              <button className="sl-icon" aria-label="Close" onClick={() => setOpen(false)}>
                ×
              </button>
            </header>
            {paired === false ? (
              <div className="sl-body">
                <h2 className="sl-h2">Connect your account</h2>
                <p className="sl-muted" style={{ margin: 0 }}>
                  Click the StudyLens icon in your browser toolbar and type the pairing code from your dashboard&apos;s Connect page.
                </p>
              </div>
            ) : showGuide ? (
              <div className="sl-body">
                <FirstRun onDone={() => setShowGuide(false)} />
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
                    <div className="sl-check-panel" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {check.state === "working" ? (
                        <ol className="sl-stages" aria-live="polite">
                          {STAGES.map((s, i) => (
                            <li key={s} className={`sl-stage${i < check.stage ? " sl-stage-done" : i === check.stage ? " sl-stage-now" : ""}`}>
                              <span className="sl-stage-dot" />
                              {s}
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <button className="sl-btn sl-btn-wide" onClick={() => runCheck()}>
                          {check.state === "done" ? "Check again" : "Check my work"}
                        </button>
                      )}
                      {check.state === "claude" && <ClaudeHandoff prompt={check.prompt} copied={check.copied} waiting="Waiting for Claude. The marks appear on this page when it answers." />}
                      {check.state === "idle" && <p className="sl-muted sl-small">Takes a screenshot of this tab, finds mistakes and circles them on the page. Shortcut: Alt+Shift+C.</p>}
                      {check.state === "error" && <p className="sl-error">{check.error}</p>}
                      {check.state === "done" && (
                        <div className="sl-card">
                          <div className="sl-summary-count">
                            {check.errors ? `${check.errors} mistake${check.errors === 1 ? "" : "s"} found` : "Looks right"}
                          </div>
                          {check.summary && <MathText className="sl-block" text={check.summary} />}
                          {check.question && (
                            <div className="sl-question">
                              <MathText text={check.question} />
                            </div>
                          )}
                          {check.errors > 0 && (
                            <div className="sl-row sl-wrap">
                              <button className="sl-btn" onClick={() => openTab("ask")}>
                                Explain it
                              </button>
                              <button className="sl-btn sl-btn-ghost" onClick={() => openTab("practice")}>
                                Practice this
                              </button>
                            </div>
                          )}
                          {check.errors > 0 && <p className="sl-muted sl-small" style={{ margin: 0 }}>Click a circle on the page to see what's wrong there.</p>}
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

        {/* Collapsed dock: the primary action is always one click away. */}
        <div className="sl-pill" role="toolbar" aria-label="StudyLens">
          <button className="sl-pill-brand" aria-label={open ? "Hide StudyLens" : "Open StudyLens"} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            <Lens />
          </button>
          <button className={`sl-pill-btn sl-pill-primary${working ? " sl-pill-busy" : ""}`} disabled={working} onClick={() => runCheck()} title="Check my work (Alt+Shift+C)">
            {working ? "Checking…" : "Check my work"}
            {!working && <span className="sl-kbd">Alt⇧C</span>}
          </button>
          <button className="sl-pill-btn" onClick={() => (open && tab === "ask" ? setOpen(false) : openTab("ask"))}>
            Ask
          </button>
        </div>
      </div>
    </>
  );
}
