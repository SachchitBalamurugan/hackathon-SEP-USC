// Watchdog: what counts as a failure for each StudyLens agent step. Hard failures throw; the
// dangerous ones are silent, a 200 OK carrying a wrong answer key or a circle on the wrong line.
// Every verifier is pure and returns Violation[], so the server can decide to repair, patch or
// flag, and the same checks run in tests.

import type { Mark } from "./markup";

export type Pipeline = "check" | "refine" | "practice_generate" | "practice_grade" | "explain" | "consolidate";
export type Severity = "hard" | "semantic" | "behavioral";

export const VIOLATIONS = {
  // hard
  timeout: "hard",
  api_error: "hard",
  refusal: "hard",
  schema_mismatch: "hard",
  truncated: "hard",
  // check
  mark_zero_area: "semantic",
  mark_duplicate: "semantic",
  mark_missing_note: "semantic",
  marks_clamped: "semantic",
  summary_contradicts_marks: "semantic",
  refine_not_found: "semantic",
  refine_jumped: "semantic",
  // practice
  mc_answer_not_in_options: "semantic",
  mc_option_count: "semantic",
  mc_duplicate_options: "semantic",
  question_count: "semantic",
  answer_leaked: "semantic",
  short_answer_has_options: "semantic",
  // grade
  grade_contradiction: "semantic",
  grade_empty_feedback: "semantic",
  // explain
  draw_ops_rejected: "semantic",
  // consolidate
  mind_doc_too_long: "semantic",
  version_conflict: "semantic",
  // student-observed
  user_flagged_mark: "behavioral",
  user_disputed_grade: "behavioral",
} as const satisfies Record<string, Severity>;

export type ViolationCode = keyof typeof VIOLATIONS;
export type Violation = { code: ViolationCode; detail: string; index?: number; repairable: boolean };

const v = (code: ViolationCode, detail: string, repairable: boolean, index?: number): Violation => ({ code, detail, repairable, ...(index === undefined ? {} : { index }) });

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ").replace(/[.]$/, "");

const NO_MISTAKES = /\b(no (mistakes|errors)|all (correct|right)|looks (perfect|great)|everything is correct)\b/i;

/** Check-my-work output. `rawCount` is the number of marks the model returned before clamping. */
export function verifyCheck(r: { summary: string; marks: Mark[] }, rawCount = r.marks.length): Violation[] {
  const out: Violation[] = [];
  if (rawCount > r.marks.length) out.push(v("marks_clamped", `${rawCount} marks returned, ${r.marks.length} kept`, false));
  r.marks.forEach((m, i) => {
    if (m.w * m.h < 0.0004) out.push(v("mark_zero_area", `mark ${i} covers almost nothing`, false, i));
    if (m.kind === "error" && !m.note.trim()) out.push(v("mark_missing_note", `error mark ${i} has no note`, true, i));
    for (let j = 0; j < i; j++) {
      const o = r.marks[j];
      if (o.kind === m.kind && Math.abs(o.nx - m.nx) < 0.02 && Math.abs(o.ny - m.ny) < 0.02) out.push(v("mark_duplicate", `mark ${i} duplicates mark ${j}`, false, i));
    }
  });
  const errors = r.marks.filter((m) => m.kind === "error").length;
  if (errors > 0 && NO_MISTAKES.test(r.summary)) out.push(v("summary_contradicts_marks", `summary says no mistakes but ${errors} error marks exist`, true));
  return out;
}

/** Refine pass: not found, or the box moved so far the first pass was probably wrong. */
export function verifyRefine(before: Pick<Mark, "nx" | "ny">, after: Pick<Mark, "nx" | "ny"> | null): Violation[] {
  if (!after) return [v("refine_not_found", "refine could not locate the mark", false)];
  const jump = Math.hypot(after.nx - before.nx, after.ny - before.ny);
  return jump > 0.25 ? [v("refine_jumped", `refined position moved ${(jump * 100).toFixed(0)}% of the page`, false)] : [];
}

export type GeneratedQuestion = { question: string; type: "multiple_choice" | "short_answer"; options: string[]; answer: string };

export function verifyPractice(qs: GeneratedQuestion[], requested: number): Violation[] {
  const out: Violation[] = [];
  if (qs.length < requested) out.push(v("question_count", `asked for ${requested}, got ${qs.length}`, true));
  qs.forEach((q, i) => {
    if (q.type === "multiple_choice") {
      const opts = q.options.map(norm);
      if (!opts.includes(norm(q.answer))) out.push(v("mc_answer_not_in_options", `question ${i + 1}: answer "${q.answer}" is not one of its options`, true, i));
      if (q.options.length !== 4) out.push(v("mc_option_count", `question ${i + 1} has ${q.options.length} options, expected 4`, true, i));
      if (new Set(opts).size !== opts.length) out.push(v("mc_duplicate_options", `question ${i + 1} repeats an option`, true, i));
    } else {
      if (q.options.length) out.push(v("short_answer_has_options", `question ${i + 1} is short answer but lists options`, false, i));
      const a = norm(q.answer);
      if (a.length >= 3 && norm(q.question).includes(`= ${a}`)) out.push(v("answer_leaked", `question ${i + 1} shows its own answer`, true, i));
    }
  });
  return out;
}

export function verifyGrade(g: { correct: boolean; score: number; feedback: string }): Violation[] {
  const out: Violation[] = [];
  if ((g.correct && g.score < 0.5) || (!g.correct && g.score > 0.8)) out.push(v("grade_contradiction", `correct=${g.correct} but score=${g.score}`, false));
  if (!g.feedback.trim()) out.push(v("grade_empty_feedback", "no feedback for the student", false));
  return out;
}

export function verifyExplain(s: { rejectedOps: number; stopReason: string | null }): Violation[] {
  const out: Violation[] = [];
  if (s.rejectedOps > 0) out.push(v("draw_ops_rejected", `${s.rejectedOps} draw ops failed validation`, false));
  if (s.stopReason === "max_tokens") out.push(v("truncated", "explanation hit the token limit", false));
  return out;
}

export function verifyMindDoc(doc: string, maxWords = 300): Violation[] {
  const words = doc.trim().split(/\s+/).filter(Boolean).length;
  return words > maxWords ? [v("mind_doc_too_long", `${words} words, limit ${maxWords}`, true)] : [];
}

/**
 * Tiebreak a contradictory grade deterministically: if both sides parse as numbers, compare them;
 * otherwise trust the boolean and snap the score to it.
 */
export function resolveGrade(g: { correct: boolean; score: number }, answer: string, key: string, evalNum: (s: string) => number | null) {
  const a = evalNum(answer);
  const k = evalNum(key);
  if (a !== null && k !== null) {
    const correct = Math.abs(a - k) <= 1e-6 * Math.max(1, Math.abs(k));
    return { correct, score: correct ? 1 : 0 };
  }
  return { correct: g.correct, score: g.correct ? Math.max(g.score, 0.75) : Math.min(g.score, 0.4) };
}

/** Critique sent back to the model on a repair attempt. */
export function critique(vs: Violation[]): string {
  return `Your previous answer failed these checks:\n${vs.map((x) => `- ${x.detail}`).join("\n")}\nReturn a corrected answer. Fix only these problems and keep everything else the same.`;
}

export type RunOutcome = "ok" | "repaired" | "degraded" | "failed";

/** Circuit breaker: open when the recent failure rate is too high to trust the full pipeline. */
export function breakerOpen(recent: RunOutcome[], { window = 20, threshold = 0.3, minRuns = 5 } = {}): boolean {
  const last = recent.slice(0, window);
  if (last.length < minRuns) return false;
  return last.filter((o) => o === "failed" || o === "degraded").length / last.length > threshold;
}
