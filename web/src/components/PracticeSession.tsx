"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Check, RotateCcw, X } from "lucide-react";
import { MathText } from "./MathText";

type Item = { id: string; skill: string; question: string; type: "multiple_choice" | "short_answer"; options: string[] | null };
type Result = { correct: boolean; score: number; feedback: string; explanation: string | null; answer: string; nextReview?: string };

async function call(body: unknown) {
  const res = await fetch("/api/practice", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Something went wrong. Try again.");
  return data;
}

type Props = { mistakes: { id: string; skill: string; note: string }[]; weakSkills: string[]; initialMistake?: string; initialSkill?: string };

export function PracticeSession({ mistakes, weakSkills, initialMistake, initialSkill }: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [results, setResults] = useState<(Result | null)[]>([]);
  const [i, setI] = useState(0);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  const load = useCallback(async (args: Record<string, unknown>, label: string) => {
    setLoading(label);
    setError(null);
    try {
      const { items } = await call(args);
      setItems(items);
      setResults(items.map(() => null));
      setI(0);
      setFinished(false);
      if (!items.length) setError("Nothing is due for review. Make a new set instead.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(null);
    }
  }, []);

  // Deep links from Mistakes and Skills start a targeted set straight away.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const args = initialMistake ? { mistakeId: initialMistake } : initialSkill ? { skill: initialSkill } : null;
    if (args) void Promise.resolve().then(() => load({ action: "generate", count: 3, ...args }, "deep"));
  }, [initialMistake, initialSkill, load]);

  const done = items.length > 0 && finished;

  if (loading) {
    return (
      <div className="sheet mx-auto max-w-2xl p-6" aria-busy="true">
        <p className="t-meta mb-4">Writing problems for you. This takes a few seconds.</p>
        <div className="skeleton h-5 w-2/3" />
        <div className="skeleton mt-3 h-5 w-1/2" />
        <div className="skeleton mt-6 h-11 w-full" />
      </div>
    );
  }

  if (!items.length || done) {
    const correct = results.filter((r) => r?.correct).length;
    return (
      <div className="mx-auto grid max-w-2xl gap-6">
        {done && (
          <section className="sheet rise p-6">
            <div className="t-label">Set complete</div>
            <div className="t-title mt-1">
              {correct} of {items.length} right
            </div>
            <p className="t-meta mt-1">{correct === items.length ? "Clean set. These come back in a few days to make sure they stick." : "The ones you missed come back tomorrow. Mistakes clear after two right answers in a row."}</p>
          </section>
        )}
        <section className="sheet">
          <div className="sheet-head">
            <h2 className="text-[15px] font-semibold">{done ? "Keep going" : "Start a practice set"}</h2>
          </div>
          <div className="row">
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-medium">My weak spots</div>
              <div className="t-meta">{weakSkills.length ? weakSkills.slice(0, 3).join(", ") : "Based on everything StudyLens has seen"}</div>
            </div>
            <button className="btn btn-sm" onClick={() => load({ action: "generate", count: 3 }, "gen")}>
              Start <ArrowRight size={14} />
            </button>
          </div>
          <div className="row">
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-medium">Review what&apos;s due</div>
              <div className="t-meta">Problems you&apos;ve seen before, at the right moment to remember them</div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => load({ action: "due" }, "due")}>
              Review
            </button>
          </div>
          {mistakes.map((m) => (
            <div key={m.id} className="row">
              <span className="mark mark-danger" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-medium">{m.note}</div>
                <div className="t-meta">{m.skill}</div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => load({ action: "generate", mistakeId: m.id, count: 3 }, m.id)}>
                Practice
              </button>
            </div>
          ))}
        </section>
        {error && <p className="text-[14px] text-danger">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-3 flex items-center gap-3">
        <span className="t-meta tabular-nums">
          Question {i + 1} of {items.length}
        </span>
        <div className="flex flex-1 gap-1" aria-hidden="true">
          {items.map((_, k) => (
            <span key={k} className={`h-1 flex-1 rounded-full ${results[k] ? (results[k]!.correct ? "bg-good" : "bg-danger") : k === i ? "bg-ink" : "bg-sunken"}`} />
          ))}
        </div>
      </div>
      <Question
        key={items[i].id}
        item={items[i]}
        result={results[i]}
        onResult={(r) => setResults((rs) => rs.map((x, k) => (k === i ? r : x)))}
        onNext={() => (i === items.length - 1 ? setFinished(true) : setI((n) => n + 1))}
        last={i === items.length - 1}
      />
    </div>
  );
}

function Question({ item, result, onResult, onNext, last }: { item: Item; result: Result | null; onResult: (r: Result) => void; onNext: () => void; last: boolean }) {
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disputed, setDisputed] = useState(false);
  const [start] = useState(Date.now);

  const submit = useCallback(
    async (value: string) => {
      if (!value.trim() || busy || result) return;
      setBusy(true);
      setError(null);
      try {
        onResult(await call({ action: "grade", id: item.id, answer: value, ms: Date.now() - start }));
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [busy, result, item.id, onResult, start],
  );

  // Keyboard: 1-4 pick an option, Enter moves on after grading.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (result && e.key === "Enter") onNext();
      if (!result && item.options && /^[1-6]$/.test(e.key)) {
        const o = item.options[Number(e.key) - 1];
        if (o) {
          setAnswer(o);
          submit(o);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [result, item.options, submit, onNext, last]);

  return (
    <section className="sheet rise">
      <div className="p-6">
        <span className="chip">{item.skill}</span>
        <MathText className="mt-3 block text-[18px] leading-[28px]" text={item.question} />

        {item.type === "multiple_choice" && item.options ? (
          <div className="mt-5 grid gap-2">
            {item.options.map((o, k) => {
              const picked = answer === o;
              const right = result && o === result.answer;
              const wrong = result && picked && !result.correct;
              return (
                <button
                  key={o}
                  disabled={busy || !!result}
                  onClick={() => {
                    setAnswer(o);
                    submit(o);
                  }}
                  className={`flex items-center gap-3 rounded-[var(--r-inner)] border px-4 py-3 text-left text-[15px] transition-colors ${right ? "border-good bg-good-soft" : wrong ? "border-danger bg-danger-soft" : picked ? "border-ink" : "border-line-strong hover:bg-sunken"}`}
                >
                  <span className="grid size-6 shrink-0 place-items-center rounded-full border border-line-strong text-[12px] font-semibold text-dim">{k + 1}</span>
                  <MathText text={o} />
                </button>
              );
            })}
          </div>
        ) : (
          <form
            className="mt-5 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              submit(answer);
            }}
          >
            <input className="input" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Type your answer" disabled={!!result} aria-label="Your answer" autoFocus />
            <button className="btn" disabled={busy || !!result || !answer.trim()}>
              {busy ? "Checking" : "Check"}
            </button>
          </form>
        )}
        {error && <p className="mt-3 text-[14px] text-danger">{error}</p>}
      </div>

      {result && (
        <div className={`border-t border-line p-6 ${result.correct ? "bg-good-soft" : "bg-danger-soft"}`}>
          <div className={`flex items-center gap-2 font-semibold ${result.correct ? "text-good" : "text-danger"}`}>
            {result.correct ? <Check size={18} strokeWidth={2.5} /> : <X size={18} strokeWidth={2.5} />}
            {result.correct ? "Correct" : "Not yet"}
          </div>
          <MathText className="mt-1.5 block text-[15px]" text={result.feedback} />
          {result.explanation && <MathText className="mt-2 block text-[14px] text-ink-2" text={result.explanation} />}
          {!result.correct && (
            <div className="mt-3 text-[13px]">
              {disputed ? (
                <span className="text-ink-2">Thanks. Disputed grades are logged so the grader can be checked.</span>
              ) : (
                <button
                  className="link"
                  onClick={() => {
                    setDisputed(true);
                    call({ action: "dispute", id: item.id }).catch(() => setDisputed(false));
                  }}
                >
                  I think my answer was right
                </button>
              )}
            </div>
          )}
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="t-meta">{result.nextReview ? `Comes back ${new Date(result.nextReview).toLocaleDateString(undefined, { weekday: "long" })}` : ""}</span>
            <button className="btn btn-sm" onClick={onNext}>
              {last ? (
                <>
                  See results <ArrowRight size={14} />
                </>
              ) : (
                <>
                  Next <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </div>
      )}
      {!result && item.options && <p className="t-meta border-t border-line px-6 py-3">Tip: press 1 to {item.options.length} to answer.</p>}
      {!result && !item.options && (
        <p className="t-meta flex items-center gap-1.5 border-t border-line px-6 py-3">
          <RotateCcw size={12} /> Equivalent forms count, like 1/2 and 0.5.
        </p>
      )}
    </section>
  );
}
