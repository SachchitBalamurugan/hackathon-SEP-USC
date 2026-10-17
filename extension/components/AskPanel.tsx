import { useEffect, useRef, useState } from "react";
import type { DrawOp } from "@studylens/core";
import type { ExplainStart } from "@/lib/messages";
import { DrawView } from "./DrawView";
import { MathText } from "./MathText";
import { ClaudeHandoff } from "./ClaudeHandoff";

type Segment = { kind: "text"; text: string } | { kind: "draw"; ops: DrawOp[] } | { kind: "handoff"; prompt: string };
type Turn = { role: "user" | "assistant"; segments: Segment[]; error?: string };

const plain = (t: Turn) => t.segments.map((s) => (s.kind === "text" ? s.text : s.kind === "draw" ? "[diagram]" : "")).join("");

export function AskPanel({ seed, onSeedUsed, onCaptureStart, onCaptureEnd }: { seed: string | null; onSeedUsed: () => void; onCaptureStart: () => void; onCaptureEnd: () => void }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [withScreen, setWithScreen] = useState(true);
  const portRef = useRef<Browser.runtime.Port | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => endRef.current?.scrollIntoView({ block: "end" }), [turns]);
  useEffect(() => () => portRef.current?.disconnect(), []);
  useEffect(() => {
    if (seed) {
      ask(seed, false);
      onSeedUsed();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);

  async function ask(question: string, screenshot = withScreen) {
    if (!question.trim() || busy) return;
    setBusy(true);
    setInput("");
    const history = turns.slice(-10).map((t) => ({ role: t.role, content: plain(t) }));
    setTurns((ts) => [...ts, { role: "user", segments: [{ kind: "text", text: question }] }, { role: "assistant", segments: [] }]);

    const update = (fn: (t: Turn) => Turn) => setTurns((ts) => [...ts.slice(0, -1), fn(ts[ts.length - 1])]);
    const port = browser.runtime.connect({ name: "explain" });
    portRef.current = port;
    let captured = false;
    if (screenshot) {
      onCaptureStart();
      // Give the page two frames to repaint without the overlay before the capture.
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      captured = true;
    }
    port.onMessage.addListener((msg: { type: string; text?: string; ops?: DrawOp[]; message?: string; prompt?: string }) => {
      if (captured) {
        captured = false;
        onCaptureEnd();
      }
      if (msg.type === "text" && msg.text) {
        update((t) => {
          const segs = [...t.segments];
          const last = segs[segs.length - 1];
          if (last?.kind === "text") segs[segs.length - 1] = { kind: "text", text: last.text + msg.text };
          else segs.push({ kind: "text", text: msg.text! });
          return { ...t, segments: segs };
        });
      } else if (msg.type === "draw" && msg.ops) {
        update((t) => ({ ...t, segments: [...t.segments, { kind: "draw", ops: msg.ops! }] }));
      } else if (msg.type === "handoff" && msg.prompt) {
        // Claude mode: this StudyLens has no model; the question goes to the student's Claude.
        update((t) => ({ ...t, segments: [{ kind: "handoff", prompt: msg.prompt! }] }));
      } else if (msg.type === "error") {
        update((t) => ({ ...t, error: msg.message }));
      }
    });
    port.onDisconnect.addListener(() => {
      if (captured) onCaptureEnd();
      setBusy(false);
      portRef.current = null;
    });
    const start: ExplainStart = {
      question,
      history,
      page: { host: location.hostname, title: document.title.slice(0, 300), selection: String(window.getSelection() ?? "").slice(0, 4000) || undefined },
      withScreenshot: screenshot,
    };
    port.postMessage(start);
  }

  return (
    <div className="sl-ask">
      <div className="sl-chat">
        {!turns.length && <p className="sl-muted">Ask about anything on this page. StudyLens sees your screen (if you allow it), knows your courses, and explains with visuals.</p>}
        {turns.map((t, i) => (
          <div key={i} className={`sl-turn sl-turn-${t.role}`}>
            {t.segments.map((s, j) =>
              s.kind === "text" ? <MathText key={j} text={s.text} /> : s.kind === "draw" ? <DrawView key={j} ops={s.ops} /> : <ClaudeHandoff key={j} prompt={s.prompt} />,
            )}
            {t.role === "assistant" && !t.segments.length && !t.error && <span className="sl-typing" aria-label="Thinking" />}
            {t.error && <p className="sl-error">{t.error}</p>}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form
        className="sl-compose"
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
      >
        <textarea
          className="sl-input"
          rows={2}
          value={input}
          placeholder="Why is this step wrong? Explain the chain rule…"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              ask(input);
            }
          }}
          aria-label="Ask StudyLens"
        />
        <div className="sl-row">
          <label className="sl-check">
            <input type="checkbox" checked={withScreen} onChange={(e) => setWithScreen(e.target.checked)} /> Include my screen
          </label>
          <button className="sl-btn" disabled={busy || !input.trim()}>
            {busy ? "…" : "Ask"}
          </button>
        </div>
      </form>
    </div>
  );
}
