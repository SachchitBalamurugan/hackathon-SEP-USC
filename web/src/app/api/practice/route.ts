import { z } from "zod";
import { body, json, OPTIONS, route } from "@/lib/route";
import { disputeGrade, duePractice, generatePractice, gradePractice } from "@/lib/practice";

export const maxDuration = 90;

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("generate"),
    skill: z.string().max(120).optional(),
    topic: z.string().max(300).optional(),
    mistakeId: z.string().uuid().optional(),
    count: z.number().int().min(1).max(6).optional(),
  }),
  z.object({ action: z.literal("grade"), id: z.string().uuid(), answer: z.string().min(1).max(2000), ms: z.number().int().nonnegative().optional() }),
  z.object({ action: z.literal("dispute"), id: z.string().uuid() }),
  z.object({ action: z.literal("due"), limit: z.number().int().min(1).max(20).optional() }),
]);

export const POST = route(["extension", "session"], async (req, { userId }) => {
  const input = await body(req, schema);
  if (input.action === "generate") return json(req, { items: await generatePractice(userId, input) });
  if (input.action === "due") return json(req, { items: await duePractice(userId, input.limit) });
  if (input.action === "dispute") {
    const ok = await disputeGrade(userId, input.id);
    return ok ? json(req, ok) : json(req, { error: "not_found" }, { status: 404 });
  }
  const result = await gradePractice(userId, input.id, input.answer, input.ms);
  return result ? json(req, result) : json(req, { error: "not_found" }, { status: 404 });
});

export { OPTIONS };
