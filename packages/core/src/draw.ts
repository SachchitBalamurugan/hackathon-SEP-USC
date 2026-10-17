// The overlay's drawing vocabulary. Coordinates are normalised 0..1 inside the explanation canvas,
// never pixels, so the model describes WHAT to draw and the client lays it out. Ops render in
// order, one after another, which is what makes an explanation feel animated.

import { z } from "zod";

export const DRAW_COLORS = ["ink", "blue", "red", "green", "orange", "purple"] as const;
export const MAX_OPS = 24;

const unit = z.number().min(0).max(1);
const color = z.enum(DRAW_COLORS).optional();
const text = (max: number) => z.string().trim().min(1).max(max);

export const textOp = z.object({
  type: z.literal("text"),
  text: text(240),
  nx: unit,
  ny: unit,
  color,
  size: z.enum(["s", "m", "l"]).optional(),
});
export const shapeOp = z.object({
  type: z.enum(["line", "arrow", "rect", "circle", "highlight"]),
  nx: unit,
  ny: unit,
  nx2: unit,
  ny2: unit,
  color,
});
export const diagramOp = z.object({
  type: z.literal("diagram"),
  kind: z.enum(["flow", "tree", "cycle"]).default("flow"),
  title: z.string().max(80).optional(),
  nodes: z.array(z.object({ id: text(40), label: text(60) })).min(1).max(10),
  edges: z.array(z.object({ from: text(40), to: text(40), label: z.string().max(40).optional() })).max(16).default([]),
  color,
});
export const graphOp = z.object({
  type: z.literal("graph"),
  title: z.string().max(80).optional(),
  xRange: z.tuple([z.number(), z.number()]).default([-10, 10]),
  yRange: z.tuple([z.number(), z.number()]).default([-10, 10]),
  curves: z.array(z.object({ expr: text(120), label: z.string().max(40).optional(), color })).max(4).default([]),
  points: z.array(z.object({ x: z.number(), y: z.number(), label: z.string().max(40).optional(), color })).max(20).default([]),
});
export const stepsOp = z.object({
  type: z.literal("steps"),
  title: z.string().max(80).optional(),
  steps: z
    .array(z.object({ latex: z.string().max(240).optional(), text: z.string().max(240).optional(), note: z.string().max(140).optional() }))
    .min(1)
    .max(10),
});

export const drawOp = z.discriminatedUnion("type", [textOp, shapeOp, diagramOp, graphOp, stepsOp]);
export type DrawOp = z.infer<typeof drawOp>;

/**
 * Validate a model-emitted ops array. Never throws: invalid ops are dropped one at a time so a
 * single bad op does not blank the whole explanation, and the count is capped.
 */
export function validateDrawOps(input: unknown): { ops: DrawOp[]; rejected: number } {
  if (!Array.isArray(input)) return { ops: [], rejected: 1 };
  const ops: DrawOp[] = [];
  let rejected = Math.max(0, input.length - MAX_OPS);
  for (const raw of input.slice(0, MAX_OPS)) {
    const r = drawOp.safeParse(raw);
    if (r.success) ops.push(r.data);
    else rejected++;
  }
  return { ops, rejected };
}

export const DRAW_GUIDE = `To illustrate, append a fenced block after a sentence that introduces it:
\`\`\`draw
[{"type":"steps","title":"Solve 2x+3=7","steps":[{"latex":"2x+3=7"},{"latex":"2x=4","note":"subtract 3 from both sides"},{"latex":"x=2"}]}]
\`\`\`
The block is a JSON array of ops, drawn one after another as an animation. Op types:
- {"type":"steps","title"?,"steps":[{"latex"?,"text"?,"note"?}]}: a worked sequence revealed line by line. Best for algebra and procedures.
- {"type":"graph","title"?,"xRange":[a,b],"yRange":[a,b],"curves":[{"expr":"x^2-3","label"?}],"points":[{"x","y","label"?}]}: expr uses x, ^, * and Math functions like sin(x).
- {"type":"diagram","kind":"flow"|"tree"|"cycle","title"?,"nodes":[{"id","label"}],"edges":[{"from","to","label"?}]}: processes, hierarchies, cycles.
- {"type":"text","text","nx","ny","size"?:"s"|"m"|"l"} and {"type":"arrow"|"line"|"rect"|"circle"|"highlight","nx","ny","nx2","ny2"}: free placement on a 0..1 canvas.
Colors: ${DRAW_COLORS.join(", ")}. At most ${MAX_OPS} ops per block. Never mention the block, JSON or coordinates in prose.`;
