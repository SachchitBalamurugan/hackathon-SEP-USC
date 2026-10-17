// The learner-event vocabulary. Three sources feed the learner model:
//   course: what changed in the LMS (from sync diffs)
//   claude: what Claude learned about the student in conversation (MCP write tools)
//   usage:  how the student uses StudyLens and behaves while working (overlay + tracker)
// Usage events carry signals only, never page content, keystrokes or form values.

import { z } from "zod";

export const EVENT_SOURCES = ["course", "claude", "usage"] as const;

export const USAGE_KINDS = [
  "focus_session", // dwell on one page: { host, activeMs, idleMs, scrollDepth, tabAways }
  "rewrite_burst", // repeated erase/redraw on a canvas or PDF surface: { host, count }
  "check_requested", // { host, marks, errors }
  "mark_feedback", // { kind, verdict: "helpful" | "wrong" | "dismissed", skill }
  "explain_requested", // { topic }
  "practice_answered", // { skill, correct, score, ms }
  "hint_used", // { skill }
] as const;

export const eventSchema = z.object({
  source: z.enum(EVENT_SOURCES),
  kind: z.string().min(1).max(40),
  payload: z.record(z.string(), z.unknown()).default({}),
  at: z.string().datetime().optional(),
});
export type LearnerEvent = z.infer<typeof eventSchema>;

export const eventBatchSchema = z.object({ events: z.array(eventSchema).min(1).max(200) });

/** Strip anything that could carry page content from a usage payload: keep scalars, cap strings. */
export function sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload).slice(0, 20)) {
    if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
    else if (typeof v === "boolean") out[k] = v;
    else if (typeof v === "string") out[k] = v.slice(0, 120);
  }
  return out;
}
