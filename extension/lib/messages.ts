import type { CheckResult, LearnerEvent, LmsAssignment, LmsCourse, Mark } from "@studylens/core";

// Content script <-> background messages. The content script never talks to the API directly:
// the worker holds the key and has host permissions, so page scripts can never see either.

export type Viewport = { width: number; height: number; dpr: number };

export type Request =
  | { type: "CAPTURE" }
  | { type: "CHECK"; checkId: string; host: string }
  | { type: "REFINE"; checkId: string; mark: Mark }
  | { type: "POLL_CHECK"; taskId: string }
  | { type: "PRACTICE"; body: Record<string, unknown> }
  | { type: "CONTEXT" }
  | { type: "EVENTS"; events: LearnerEvent[] }
  | { type: "SETTINGS"; patch: Record<string, unknown> }
  | { type: "PAIR"; code: string }
  | { type: "STATUS" }
  | { type: "SIGN_OUT" }
  | { type: "SYNC_CANVAS"; origin: string; force?: boolean }
  | { type: "CLASSROOM_CAPTURE"; courses: LmsCourse[]; assignments: LmsAssignment[] };

/** Claude mode: the screenshot is waiting for the student's Claude; poll taskId for the marks. */
export type Queued = { queued: true; taskId: string; prompt: string };
export type CheckResponse = (CheckResult | Queued) & { checkId: string };
export type PollResponse = { status: "pending" | "done"; result: CheckResult | null };

export type Reply<T = unknown> = { ok: true; data: T } | { ok: false; error: string };

export async function send<T>(msg: Request): Promise<T> {
  const reply = (await browser.runtime.sendMessage(msg)) as Reply<T> | undefined;
  if (!reply) throw new Error("StudyLens is updating. Reload the page.");
  if (!reply.ok) throw new Error(reply.error);
  return reply.data;
}

/** Background -> content script pushes (keyboard shortcuts). */
export type Push = { type: "COMMAND"; command: "check-work" | "toggle-dock" };

/** Explanations stream over a long-lived port named "explain". */
export type ExplainStart = {
  question: string;
  history: { role: "user" | "assistant"; content: string }[];
  page?: { host: string; title: string; selection?: string };
  withScreenshot?: boolean;
  viewport?: Viewport;
};
