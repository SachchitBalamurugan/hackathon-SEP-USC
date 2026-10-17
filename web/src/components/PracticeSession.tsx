"use client";

import { useState } from "react";
import { MathText } from "./MathText";

type Item = { id: string; skill: string; question: string; type: "multiple_choice" | "short_answer"; options: string[] | null };
type Result = { correct: boolean; score: number; feedback: string; explanation: string | null; answer: string };

async function call(body: unknown) {
  const res = await fetch("/api/practice", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || "Request failed");
  return res.json();
}

export function PracticeSession({ mistakes }: { mistakes: { id: string; skill: string; note: string }[] }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load(args: Record<string, unknown>, label: string) {
    setLoading(label);
    setError(null);
    try {
      const { items } = await call(args);
      setItems(items);
      if (!items.length) setError("Nothing due right now. Generate a new set instead.");
    } catch (e) {
      setError(String((e as Error).message));
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="mt-6 space-y-6">
      <div className="flex flex-wrap gap-2">
        <button className="btn" disabled={!!loading} onClick={() => load({ action: "generate", count: 3 }, "gen")}>
          {loading === "gen" ? "Writing problems..." : "New problems for my weak spots"}
        </button>
        <button className="btn btn-ghost" disabled={!!loading} onClick={() => load({ action: "due" }, "due")}>
          {loading === "due" ? "Loading..." : "Review what's due"}
        </button>
      </div>
      {mistakes.length > 0 && (
        <div>
          <p className="text-sm text-muted">Or target one mistake:</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {mistakes.map((m) => (
              <button key={m.id} title={m.note} className="rounded-full border border-line px-3 py-1 text-sm hover:border-accent" disabled={!!loading} onClick={() => load({ action: "generate", mistakeId: m.id, count: 3 }, m.id)}>
                {loading === m.id ? "Writing..." : m.skill}
              </button>
            ))}
          </div>
        </div>
      )}
      {error && <p className="text-sm text-bad">{error}</p>}
      {items.map((item, i) => (
        <Question key={item.id} n={i + 1} item={item} />
      ))}
    </div>
  );
}

function Question({ n, item }: { n: number; item: Item }) {
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [start] = useState(() => Date.now());

  async function submit(value: string) {
    if (!value.trim()) return;
    setBusy(true);
    try {
      setResult(await call({ action: "grade", id: item.id, answer: value, ms: Date.now() - start }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <p className="text-xs text-muted">
        {n}. {item.skill}
      </p>
      <MathText className="mt-2 block" text={item.question} />
      {item.type === "multiple_choice" && item.options ? (
        <div className="mt-3 grid gap-2">
          {item.options.map((o) => (
            <button
              key={o}
              disabled={busy || !!result}
              onClick={() => {
                setAnswer(o);
                submit(o);
              }}
              className={`rounded-lg border px-3 py-2 text-left text-sm ${answer === o ? "border-accent" : "border-line"} ${result && o === result.answer ? "bg-accent-soft" : ""}`}
            >
              <MathText text={o} />
            </button>
          ))}
        </div>
      ) : (
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit(answer);
          }}
        >
          <input className="input" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Your answer" disabled={!!result} aria-label="Your answer" />
          <button className="btn" disabled={busy || !!result || !answer.trim()}>
            {busy ? "Checking..." : "Check"}
          </button>
        </form>
      )}
      {result && (
        <div className="mt-3 text-sm">
          <p className={result.correct ? "text-good" : "text-bad"}>{result.correct ? "Correct" : "Not yet"}</p>
          <MathText className="mt-1 block" text={result.feedback} />
          {result.explanation && <MathText className="mt-2 block text-muted" text={result.explanation} />}
        </div>
      )}
    </div>
  );
}
