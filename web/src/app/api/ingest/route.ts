import { z } from "zod";
import { body, json, OPTIONS, route } from "@/lib/route";
import { ingestSnapshot } from "@/lib/materials";

export const maxDuration = 120;

const course = z.object({
  source: z.enum(["canvas", "classroom", "generic"]),
  externalId: z.string().min(1).max(200),
  name: z.string().min(1).max(300),
  code: z.string().max(100).nullable(),
  currentScore: z.number().nullable(),
  url: z.string().max(1000).nullable(),
});
const assignment = z.object({
  courseExternalId: z.string().max(200),
  externalId: z.string().min(1).max(200),
  title: z.string().max(500),
  description: z.string().max(10_000).nullable(),
  dueAt: z.string().nullable(),
  pointsPossible: z.number().nullable(),
  score: z.number().nullable(),
  submittedAt: z.string().nullable(),
  missing: z.boolean(),
  url: z.string().max(1000).nullable(),
});
const material = z.object({
  courseExternalId: z.string().max(200),
  externalId: z.string().min(1).max(300),
  title: z.string().max(500),
  kind: z.enum(["page", "syllabus", "file", "module"]),
  text: z.string().max(200_000),
  url: z.string().max(1000).nullable(),
});
const snapshot = z.object({
  source: z.enum(["canvas", "classroom", "generic"]),
  host: z.string().max(200),
  courses: z.array(course).max(200),
  assignments: z.array(assignment).max(3000),
  materials: z.array(material).max(60).default([]),
});

export const POST = route(["extension"], async (req, { userId }) => {
  const snap = await body(req, snapshot);
  return json(req, await ingestSnapshot(userId, snap));
});

export { OPTIONS };
