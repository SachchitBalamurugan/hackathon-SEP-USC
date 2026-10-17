import { z } from "zod";
import { DRAW_GUIDE, FenceSplitter, validateDrawOps, type SplitEvent } from "@studylens/core";
import { body, OPTIONS, route } from "@/lib/route";
import { fence, streamText, UNTRUSTED_RULE } from "@/lib/llm";
import { learnerContext, recordEvents } from "@/lib/learner";
import { searchMaterials } from "@/lib/materials";

export const maxDuration = 120;

// Streamed explanations for the overlay. Prose arrives token by token; ```draw blocks are held
// back by FenceSplitter, validated, and sent as their own event so the overlay animates them.
// Wire format: newline-delimited JSON, one {type:"text"|"draw"|"error"|"done"} object per line.

const schema = z.object({
  question: z.string().min(1).max(4000),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(8000) }))
    .max(20)
    .default([]),
  page: z.object({ host: z.string().max(200), title: z.string().max(300), selection: z.string().max(4000).optional() }).optional(),
  image: z.object({ data: z.string().max(12_000_000), mediaType: z.enum(["image/png", "image/jpeg"]) }).optional(),
});

const SYSTEM = `You are StudyLens, a tutor that lives in an overlay on whatever the student is working on. You teach; you do not do their homework for them.
- Explain at the level the learner model suggests, in the format they learn best from.
- For a problem they are working on, guide with the next step and a question rather than the full solution, unless they have already attempted it or explicitly ask to see a worked example of a DIFFERENT problem.
- Keep replies short: a few sentences, then a visual when it helps.
- Use $...$ for inline math.

${DRAW_GUIDE}

${UNTRUSTED_RULE}`;

export const POST = route(["extension", "session"], async (req, { userId }) => {
  const input = await body(req, schema);
  const [context, materials] = await Promise.all([learnerContext(userId), searchMaterials(userId, input.question, 3)]);

  const preamble = [
    context,
    materials.length ? `Relevant course materials:\n${fence("materials", materials.map((m) => m.text).join("\n---\n"))}` : "",
    input.page ? `The student is on ${input.page.host}: "${input.page.title}".` : "",
    input.page?.selection ? `They highlighted:\n${fence("selection", input.page.selection)}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const lastUser: { type: "text"; text: string }[] = [{ type: "text", text: `${preamble}\n\nStudent: ${input.question}` }];
  const content = input.image
    ? [{ type: "image" as const, source: { type: "base64" as const, media_type: input.image.mediaType, data: input.image.data } }, ...lastUser]
    : lastUser;

  await recordEvents(userId, [{ source: "usage", kind: "explain_requested", payload: { topic: input.question.slice(0, 120), host: input.page?.host ?? "" } }]);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      const emit = (events: SplitEvent[]) => {
        for (const e of events) {
          if (e.kind === "text") send({ type: "text", text: e.text });
          else {
            let parsed: unknown = null;
            try {
              parsed = JSON.parse(e.body);
            } catch {
              /* a malformed block is dropped, never shown as raw JSON */
            }
            const { ops } = validateDrawOps(parsed);
            if (ops.length) send({ type: "draw", ops });
          }
        }
      };
      const splitter = new FenceSplitter();
      try {
        for await (const delta of streamText({ system: SYSTEM, messages: [...input.history, { role: "user", content }], effort: "low" })) {
          emit(splitter.push(delta));
        }
        emit(splitter.end());
        send({ type: "done" });
      } catch (e) {
        console.error(e);
        send({ type: "error", message: "The explanation was interrupted." });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
});

export { OPTIONS };
