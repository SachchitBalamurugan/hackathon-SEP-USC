import { z } from "zod";
import { MARK_KINDS } from "@studylens/core";
import { body, json, OPTIONS, route } from "@/lib/route";
import { checkWork, refineMark } from "@/lib/check";

export const maxDuration = 90;

const image = z.string().min(100).max(12_000_000);
const mediaType = z.enum(["image/png", "image/jpeg"]);
const mark = z.object({
  kind: z.enum(MARK_KINDS),
  note: z.string().max(200),
  nx: z.number(),
  ny: z.number(),
  w: z.number(),
  h: z.number(),
  shape: z.enum(["circle", "underline"]),
  skill: z.string().max(120),
  misconception: z.string().max(400),
});

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("check"), image, mediaType, host: z.string().max(200) }),
  z.object({ action: z.literal("refine"), mark, crop: image, mediaType }),
]);

export const POST = route(["extension"], async (req, { userId }) => {
  const input = await body(req, schema);
  if (input.action === "check") return json(req, await checkWork(userId, input));
  return json(req, { mark: await refineMark(input.mark, { image: input.crop, mediaType: input.mediaType }) });
});

export { OPTIONS };
