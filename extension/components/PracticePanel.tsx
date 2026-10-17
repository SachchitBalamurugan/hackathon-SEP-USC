import { useState } from "react";
import { send } from "@/lib/messages";
import { MathText } from "./MathText";

type Item = { id: string; skill: string; question: string; type: "multiple_choice" | "short_answer"; options: string[] | null };
type Result = { correct: boolean; feedback: string; explanation: string | null; answer: string };

export function PracticePanel({ focus }: { focus: { skill?: string; mistakeId?: string } | null }) {
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const r = await send<{ items: Item[] }>({ type: "PRACTICE", body });
      setItems(r.items);
      if (!r.items.length) setError("Nothing due. Generate new problems instead.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sl-practice">
      <div className="sl-row sl-wrap">
        <button className="sl-btn" disabled={busy} onClick={() => load({ action: "generate", count: 3, ...(focus ?? {}) })}>
          {busy ? "Writing problems…" : focus?.skill ? `Practice: ${focus.skill}` : "Practice my weak spots"}
        </button>
        <button className="sl-btn sl-btn-ghost" disabled={busy} onClick={() => load({ action: "due" })}>
          Review due
        </button>
      </div>
      {error && <p className="sl-error">{error}</p>}
      {items.map((it, i) => (
        <PracticeItem key={it.id} n={i + 1} item={it} />
      ))}
    </div>
  );
}

function PracticeItem({ n, item }: { n: number; item: Item }) {
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [start] = useState(Date.now);

  async function grade(value: string) {
    if (!value.trim()) return;
    setBusy(true);
    try {
      setResult(await send<Result>({ type: "PRACTICE", body: { action: "grade", id: item.id, answer: value, ms: Date.now() - start } }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sl-card">
      <div className="sl-muted sl-small">
        {n}. {item.skill}
      </div>
      <MathText className="sl-q" text={item.question} />
      {item.type === "multiple_choice" && item.options ? (
        <div className="sl-options">
          {item.options.map((o) => (
            <button
              key={o}
              disabled={busy || !!result}
              className={`sl-option${answer === o ? " sl-option-picked" : ""}${result && o === result.answer ? " sl-option-right" : ""}`}
              onClick={() => {
                setAnswer(o);
                grade(o);
              }}
            >
              <MathText text={o} />
            </button>
          ))}
        </div>
      ) : (
        <form
          className="sl-row"
          onSubmit={(e) => {
            e.preventDefault();
            grade(answer);
          }}
        >
          <input className="sl-input" value={answer} onChange={(e) => setAnswer(e.target.value)} disabled={!!result} placeholder="Your answer" aria-label="Your answer" />
          <button className="sl-btn" disabled={busy || !!result || !answer.trim()}>
            {busy ? "…" : "Check"}
          </button>
        </form>
      )}
      {result && (
        <div className="sl-result">
          <strong className={result.correct ? "sl-good" : "sl-bad"}>{result.correct ? "Correct" : "Not yet"}</strong>
          <MathText text={" " + result.feedback} />
          {result.explanation && <MathText className="sl-muted sl-block" text={result.explanation} />}
        </div>
      )}
    </div>
  );
}
