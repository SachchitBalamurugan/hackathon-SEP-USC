import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { after } from "next/server";
import { breakerOpen, critique, VIOLATIONS, type Pipeline, type RunOutcome, type Violation, type ViolationCode } from "@studylens/core";
import { db } from "./supabase";
import { RefusalError, SchemaError } from "./llm";

// Server side of the watchdog in packages/core/src/monitor.ts. Each agent step runs inside
// watch(): verifiers look at the answer, repairable problems get one retry with a critique,
// the caller patches what is left, and the run is logged to agent_runs. When a pipeline's
// recent runs fail too often the breaker opens and steps skip their optional extra calls
// (repairs, the refine pass) instead of doubling load on a model that is already struggling.

// Violations that describe a safe server-side correction, not a model mistake worth counting.
const BENIGN = new Set<ViolationCode>(["marks_clamped"]);

type Logged = Violation & { attempt: number };

export class Run {
  private t0 = Date.now();
  private log: Logged[] = [];
  private final: Violation[] = [];
  private repaired = false;
  attempts = 1;

  constructor(
    readonly userId: string | null,
    readonly pipeline: Pipeline,
    readonly degradedMode: boolean,
  ) {}

  /** Record what the verifiers found on the answer that will be used. */
  saw(vs: Violation[]) {
    this.final = vs;
    this.log.push(...vs.map((v) => ({ ...v, attempt: this.attempts })));
  }

  /**
   * Verify `first`; if anything is repairable and the breaker is closed, ask once more with a
   * critique and keep whichever answer has fewer problems. A failed retry keeps the first answer.
   */
  async repair<T>(first: T, verify: (x: T) => Violation[], retry: (critique: string, previous: T) => Promise<T>): Promise<T> {
    const vs = verify(first);
    this.saw(vs);
    const fixable = vs.filter((v) => v.repairable);
    if (!fixable.length || this.degradedMode) return first;
    this.attempts++;
    let second: T;
    try {
      second = await retry(critique(fixable), first);
    } catch (e) {
      this.log.push({ code: hardCode(e), detail: "repair attempt failed", repairable: false, attempt: this.attempts });
      return first;
    }
    const vs2 = verify(second);
    if (vs2.filter((v) => v.repairable).length >= fixable.length) {
      this.log.push(...vs2.map((v) => ({ ...v, attempt: this.attempts })));
      return first;
    }
    this.saw(vs2);
    this.repaired = true;
    return second;
  }

  outcome(): RunOutcome {
    if (this.final.some((v) => !BENIGN.has(v.code))) return "degraded";
    return this.repaired ? "repaired" : "ok";
  }

  finish(outcome: RunOutcome = this.outcome()) {
    persist({
      user_id: this.userId,
      pipeline: this.pipeline,
      outcome,
      violations: this.log.map(({ code, detail, index, attempt }) => ({ code, detail, index, attempt })),
      attempts: this.attempts,
      latency_ms: Date.now() - this.t0,
    });
    remember(this.pipeline, outcome);
    return outcome;
  }

  fail(e: unknown) {
    this.log.push({ code: hardCode(e), detail: e instanceof Error ? e.message.slice(0, 200) : "unknown error", repairable: false, attempt: this.attempts });
    this.finish("failed");
  }
}

/** Run one agent step under the watchdog. Errors are logged and rethrown unchanged. */
export async function watch<T>(userId: string | null, pipeline: Pipeline, fn: (run: Run) => Promise<T>): Promise<T> {
  const run = new Run(userId, pipeline, await breaker(pipeline));
  try {
    const value = await fn(run);
    run.finish();
    return value;
  } catch (e) {
    run.fail(e);
    throw e;
  }
}

/** A problem the student reported (a wrong mark, a disputed grade). Never feeds the breaker. */
export function observe(userId: string, pipeline: Pipeline, code: ViolationCode, detail: string) {
  if (VIOLATIONS[code] !== "behavioral") return;
  persist({ user_id: userId, pipeline, outcome: "degraded", violations: [{ code, detail, attempt: 1 }], attempts: 1, latency_ms: 0, observed: true });
}

export function hardCode(e: unknown): ViolationCode {
  if (e instanceof RefusalError) return "refusal";
  if (e instanceof SchemaError) return e.stopReason === "max_tokens" ? "truncated" : "schema_mismatch";
  if (e instanceof Anthropic.APIConnectionTimeoutError) return "timeout";
  return "api_error";
}

/** Append a critique to the original request content for a repair attempt. */
export function withCritique(content: Content, previous: unknown, note: string): Content {
  const text = `Your previous answer:\n${JSON.stringify(previous)}\n\n${note}`;
  return typeof content === "string" ? `${content}\n\n${text}` : [...content, { type: "text", text }];
}

export type Content = Anthropic.Beta.BetaMessageParam["content"];

// ── Breaker ─────────────────────────────────────────────────────────────────────────────────

const WINDOW = 20;
const TTL = 60_000;
const recent = new Map<Pipeline, { at: number; outcomes: RunOutcome[] }>();

async function breaker(pipeline: Pipeline): Promise<boolean> {
  let entry = recent.get(pipeline);
  if (!entry || Date.now() - entry.at > TTL) {
    try {
      const { data } = await db().from("agent_runs").select("outcome").eq("pipeline", pipeline).eq("observed", false).order("at", { ascending: false }).limit(WINDOW);
      entry = { at: Date.now(), outcomes: (data ?? []).map((r) => r.outcome as RunOutcome) };
    } catch {
      entry = { at: Date.now(), outcomes: entry?.outcomes ?? [] };
    }
    recent.set(pipeline, entry);
  }
  return breakerOpen(entry.outcomes, { window: WINDOW });
}

/** Keep this instance's view current between refreshes. */
function remember(pipeline: Pipeline, outcome: RunOutcome) {
  const entry = recent.get(pipeline);
  if (entry) entry.outcomes = [outcome, ...entry.outcomes].slice(0, WINDOW);
}

function persist(row: Record<string, unknown>) {
  const write = async () => {
    const { error } = await db().from("agent_runs").insert(row);
    if (error) console.error("agent_runs insert failed", error.message);
  };
  try {
    after(write);
  } catch {
    // Outside a request (scripts, tests): write without blocking the caller.
    write().catch(() => {});
  }
}
