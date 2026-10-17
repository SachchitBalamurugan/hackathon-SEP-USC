// The server half of the watchdog: repair-once logic, what gets logged to agent_runs, the
// breaker, and the patches applied to whatever the verifiers still find. The database is a
// stub that records inserts and serves canned recent outcomes.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { summarizeRuns, verifyCheck, verifyPractice, type Mark } from "@studylens/core";

const store = vi.hoisted(() => ({ inserts: [] as Record<string, unknown>[], recent: [] as { outcome: string }[] }));
vi.mock("next/server", () => ({ after: (fn: () => unknown) => void fn() }));
vi.mock("../web/src/lib/supabase", () => {
  const chain = (): unknown =>
    new Proxy(
      {},
      {
        get: (_, k) => {
          if (k === "insert") return async (row: Record<string, unknown>) => (store.inserts.push(row), { error: null });
          if (k === "then") return (res: (v: unknown) => void) => res({ data: store.recent });
          return () => chain();
        },
      },
    );
  return { db: () => chain() };
});
vi.mock("../web/src/lib/learner", () => ({ learnerContext: vi.fn(), recordDemo: vi.fn(), recordEvents: vi.fn(), getMastery: vi.fn(), getOpenMistakes: vi.fn() }));
vi.mock("../web/src/lib/materials", () => ({ searchMaterials: vi.fn() }));

const { watch, observe } = await import("../web/src/lib/watchdog");
const { RefusalError, SchemaError } = await import("../web/src/lib/llm");
const { patchCheck } = await import("../web/src/lib/check");
const { patchPractice } = await import("../web/src/lib/practice");

const mark = (o: Partial<Mark> = {}): Mark => ({ kind: "error", note: "sign flipped", nx: 0.5, ny: 0.5, w: 0.1, h: 0.05, shape: "circle", skill: "signs", misconception: "", ...o });
const q = (o: Partial<{ question: string; type: "multiple_choice" | "short_answer"; options: string[]; answer: string }> = {}) => ({
  question: "What is 2+2?",
  type: "multiple_choice" as const,
  options: ["1", "2", "3", "4"],
  answer: "4",
  ...o,
});
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  store.inserts.length = 0;
  store.recent = [];
});

describe("watch + repair", () => {
  it("retries once with a critique and keeps the better answer", async () => {
    const retry = vi.fn(async (note: string) => {
      expect(note).toContain("not one of its options");
      return { questions: [q()] };
    });
    const out = await watch("u1", "practice_generate", (run) => run.repair({ questions: [q({ answer: "5" })] }, (g) => verifyPractice(g.questions, 1), retry));
    await flush();
    expect(retry).toHaveBeenCalledOnce();
    expect(out.questions[0].answer).toBe("4");
    expect(store.inserts[0]).toMatchObject({ pipeline: "practice_generate", outcome: "repaired", attempts: 2 });
  });

  it("keeps the first answer when the retry is no better, and logs it degraded", async () => {
    const bad = { questions: [q({ answer: "5" })] };
    const out = await watch("u1", "practice_generate", (run) => run.repair(bad, (g) => verifyPractice(g.questions, 1), async () => bad));
    await flush();
    expect(out).toBe(bad);
    expect(store.inserts[0]).toMatchObject({ outcome: "degraded", attempts: 2 });
  });

  it("skips the retry while the breaker is open", async () => {
    store.recent = Array.from({ length: 20 }, (_, i) => ({ outcome: i < 10 ? "failed" : "ok" }));
    const retry = vi.fn();
    // A pipeline not used above, so the cached breaker view is fresh.
    await watch("u1", "consolidate", (run) => run.repair({ mind_doc: "word ".repeat(400) }, () => [{ code: "mind_doc_too_long", detail: "", repairable: true }], retry));
    expect(retry).not.toHaveBeenCalled();
  });

  it("logs hard failures with their code and rethrows", async () => {
    await expect(watch("u1", "check", async () => Promise.reject(new SchemaError("max_tokens")))).rejects.toThrow();
    await expect(watch("u1", "explain", async () => Promise.reject(new RefusalError(null)))).rejects.toThrow();
    await flush();
    expect(store.inserts.map((r) => [r.outcome, (r.violations as { code: string }[])[0].code])).toEqual([
      ["failed", "truncated"],
      ["failed", "refusal"],
    ]);
  });

  it("records student reports as observed and ignores non-behavioral codes", async () => {
    observe("u1", "check", "user_flagged_mark", "mark was wrong");
    observe("u1", "check", "timeout", "not a student report");
    await flush();
    expect(store.inserts).toHaveLength(1);
    expect(store.inserts[0]).toMatchObject({ observed: true, outcome: "degraded" });
  });
});

describe("patches", () => {
  it("drops duplicate marks, fills empty notes and rewrites a contradicting summary", () => {
    const r = { subject: "math", summary: "Looks perfect!", marks: [mark(), mark({ nx: 0.505 }), mark({ ny: 0.9, note: " ", misconception: "thinks minus distributes once" })] };
    const out = patchCheck(r, verifyCheck(r));
    expect(out.marks).toHaveLength(2);
    expect(out.marks[1].note).toBe("thinks minus distributes once");
    expect(out.summary).toMatch(/2 things/);
  });

  it("removes unanswerable practice questions and strips options from short answers", () => {
    const qs = [q(), q({ answer: "5" }), q({ type: "short_answer", options: ["a"], answer: "7" })];
    const out = patchPractice(qs, verifyPractice(qs, 3));
    expect(out).toHaveLength(2);
    expect(out[1].options).toEqual([]);
  });
});

describe("summarizeRuns", () => {
  it("counts outcomes, keeps student reports separate and names the top issue", () => {
    const h = summarizeRuns([
      { pipeline: "check", outcome: "ok", violations: [], observed: false },
      { pipeline: "check", outcome: "repaired", violations: [{ code: "mark_duplicate" }, { code: "mark_duplicate" }], observed: false },
      { pipeline: "check", outcome: "degraded", violations: [{ code: "user_flagged_mark" }], observed: true },
      { pipeline: "explain", outcome: "failed", violations: [{ code: "timeout" }], observed: false },
    ]);
    expect(h[0]).toMatchObject({ pipeline: "check", runs: 2, ok: 1, repaired: 1, reported: 1, topIssue: "mark_duplicate" });
    expect(h[1]).toMatchObject({ pipeline: "explain", failed: 1, topIssue: "timeout" });
  });
});
