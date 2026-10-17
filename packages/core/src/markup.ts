// "Check my work" marks. The model diagnoses the belief behind an error, never guesses at unreadable strokes, and marks
// sparingly. Positions are normalised to the screenshot it was shown.

import { z } from "zod";

export const MARK_KINDS = ["error", "correct", "uncertain"] as const;

/** Schema the model fills via structured output. No numeric bounds here; clampMarks enforces them. */
export const checkResultSchema = z.object({
  summary: z.string().describe("1-3 sentences to the student about what you see. Encouraging and specific."),
  marks: z.array(
    z.object({
      kind: z.enum(MARK_KINDS),
      note: z.string().describe("At most 100 characters. For an error: what is wrong and what it should be."),
      nx: z.number().describe("0..1 horizontal centre of the marked region within the image"),
      ny: z.number().describe("0..1 vertical centre of the marked region within the image"),
      w: z.number().describe("0..1 width of the marked region"),
      h: z.number().describe("0..1 height of the marked region"),
      shape: z.enum(["circle", "underline"]),
      skill: z.string().describe("Short name of the skill this step exercises, e.g. 'distributing a negative'"),
      misconception: z.string().describe("For errors: the belief that made the step feel right. Empty string if unsure or not an error."),
    }),
  ),
  question: z.string().describe("ONE question the student can attempt next. Empty string if the work is fully correct."),
  subject: z.string().describe("Subject and topic of the visible work, e.g. 'Algebra 1: linear equations'. Empty if no schoolwork is visible."),
});
export type CheckResult = z.infer<typeof checkResultSchema>;
export type Mark = CheckResult["marks"][number];

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0.5);

/** Clamp coordinates, cap the count at 10, and keep at most 2 "correct" marks. */
export function clampMarks(marks: Mark[]): Mark[] {
  let correct = 0;
  const out: Mark[] = [];
  for (const m of marks) {
    if (m.kind === "correct" && ++correct > 2) continue;
    out.push({
      ...m,
      note: m.note.slice(0, 120),
      nx: clamp01(m.nx),
      ny: clamp01(m.ny),
      w: Math.min(0.9, Math.max(0.02, clamp01(m.w))),
      h: Math.min(0.5, Math.max(0.01, clamp01(m.h))),
    });
    if (out.length >= 10) break;
  }
  return out;
}

/** Map a mark from screenshot space onto viewport CSS pixels. */
export function markToViewportRect(m: Pick<Mark, "nx" | "ny" | "w" | "h">, viewport: { width: number; height: number }) {
  const width = m.w * viewport.width;
  const height = m.h * viewport.height;
  return { left: m.nx * viewport.width - width / 2, top: m.ny * viewport.height - height / 2, width, height };
}

export type Window = { x0: number; y0: number; x1: number; y1: number };

/** Normalised crop window around a mark, used by the refine pass to zoom in. */
export function refineWindow(m: Pick<Mark, "nx" | "ny" | "w" | "h">, pad = 0.12): Window {
  const halfW = Math.max(m.w / 2 + pad, 0.15);
  const halfH = Math.max(m.h / 2 + pad, 0.15);
  return {
    x0: clamp01(m.nx - halfW),
    y0: clamp01(m.ny - halfH),
    x1: clamp01(m.nx + halfW),
    y1: clamp01(m.ny + halfH),
  };
}

/** Map a region found inside a crop window back to full-image coordinates. */
export function fromWindow(win: Window, p: { nx: number; ny: number; w: number; h: number }) {
  const sw = win.x1 - win.x0;
  const sh = win.y1 - win.y0;
  return { nx: win.x0 + clamp01(p.nx) * sw, ny: win.y0 + clamp01(p.ny) * sh, w: clamp01(p.w) * sw, h: clamp01(p.h) * sh };
}

export const CHECK_WORK_PROMPT = `You are looking at a screenshot of a student's screen while they do schoolwork, often a worksheet in Kami, a PDF, Google Docs, or an online problem set. Read their work carefully, step by step, the way a tutor looks over a shoulder.

DIAGNOSE BEFORE YOU CORRECT. When something is wrong, work out (1) the specific error: which line, which operation; (2) the BELIEF underneath it, what they must think is true for that step to have felt correct; (3) what would change that belief. Aim your summary and question at the belief, not the symptom. A student told "you flipped the sign" fixes one line; a student asked "what happens to the sign when you move a term across?" fixes every line after it.

NEVER GUESS AT WHY. If the work does not show their thinking, leave misconception empty and ask in your question instead. Naming the wrong misconception confidently is worse than naming none.

BE HONEST ABOUT WHAT YOU CANNOT READ. If you are not confident you are reading a stroke correctly, do not mark it wrong: use kind "uncertain" and phrase the note as a question ("Is this a 6?"). A confidently misread digit is the worst thing you can hand a student.

MARKS:
- Mark every concrete mistake (wrong step, sign error, dropped term, wrong final answer), at most 10 marks in total.
- Mark correct steps sparingly: at most one or two genuinely standout moments. Do not checkmark every line.
- nx, ny are the centre of the marked region as fractions of the image width and height (0,0 is the top-left, 1,1 the bottom-right). w, h are its size as fractions. Look at where it actually sits; do not default to the centre.
- shape "underline" pinpoints a single term or digit; "circle" covers a step or expression.
- Mark the student's own work, not the printed question.

If no schoolwork is visible, return no marks and say so briefly in summary. Never mention JSON, coordinates or marks in summary or question.`;

export const refinePrompt = (note: string) => `This image is a zoomed-in crop of a student's work. A tutor flagged this issue somewhere in it:
"${note.replace(/"/g, "'")}"
Locate exactly the term or step that note refers to. Return its centre (nx, ny) and size (w, h) as fractions of THIS crop's width and height. If you cannot find it, set found to false.`;

export const refineResultSchema = z.object({
  found: z.boolean(),
  nx: z.number(),
  ny: z.number(),
  w: z.number(),
  h: z.number(),
});
