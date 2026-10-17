import { describe, expect, it } from "vitest";
import { breakerOpen, compileExpr, resolveGrade, verifyCheck, verifyGrade, verifyPractice, verifyRefine, type Mark } from "@studylens/core";

const mark = (o: Partial<Mark> = {}): Mark => ({ kind: "error", note: "sign flipped", nx: 0.5, ny: 0.5, w: 0.1, h: 0.05, shape: "circle", skill: "signs", misconception: "", ...o });
const codes = (vs: { code: string }[]) => vs.map((x) => x.code);
const num = (s: string) => {
  try {
    const n = compileExpr(s)(0);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
};

describe("watchdog verifiers", () => {
  it("flags a summary that contradicts error marks, duplicates and empty notes", () => {
    const vs = verifyCheck({ summary: "Looks perfect, no mistakes!", marks: [mark(), mark({ nx: 0.505 }), mark({ ny: 0.9, note: " " })] }, 12);
    expect(codes(vs)).toEqual(expect.arrayContaining(["summary_contradicts_marks", "mark_duplicate", "mark_missing_note", "marks_clamped"]));
  });
  it("passes clean check output", () => {
    expect(verifyCheck({ summary: "One sign error on line 2.", marks: [mark()] })).toEqual([]);
  });
  it("detects refine misses and jumps", () => {
    expect(codes(verifyRefine({ nx: 0.5, ny: 0.5 }, null))).toEqual(["refine_not_found"]);
    expect(codes(verifyRefine({ nx: 0.1, ny: 0.1 }, { nx: 0.8, ny: 0.8 }))).toEqual(["refine_jumped"]);
    expect(verifyRefine({ nx: 0.5, ny: 0.5 }, { nx: 0.52, ny: 0.5 })).toEqual([]);
  });
  it("catches a multiple-choice answer key that is not an option", () => {
    const vs = verifyPractice([{ question: "Pick", type: "multiple_choice", options: ["1", "2", "2", "4"], answer: "3" }], 2);
    expect(codes(vs)).toEqual(expect.arrayContaining(["question_count", "mc_answer_not_in_options", "mc_duplicate_options"]));
    expect(vs.find((x) => x.code === "mc_answer_not_in_options")?.repairable).toBe(true);
  });
  it("catches contradictory grades and resolves them numerically", () => {
    expect(codes(verifyGrade({ correct: false, score: 0.9, feedback: "ok" }))).toEqual(["grade_contradiction"]);
    expect(resolveGrade({ correct: false, score: 0.9 }, "2/4", "0.5", num)).toEqual({ correct: true, score: 1 });
    expect(resolveGrade({ correct: true, score: 0.2 }, "photosynthesis", "photosynthesis", num)).toEqual({ correct: true, score: 0.75 });
  });
  it("opens the breaker past the failure threshold", () => {
    expect(breakerOpen(["ok", "ok", "failed"])).toBe(false);
    expect(breakerOpen(["failed", "degraded", "ok", "ok", "ok"])).toBe(true);
    expect(breakerOpen(["failed", "ok", "ok", "ok", "ok"])).toBe(false);
  });
});
