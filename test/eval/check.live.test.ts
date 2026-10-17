// Vision eval for Check my work, after FschoolAI's scripts/detect-eval.mjs. It spends real API
// calls, so it only runs via `npm run eval:check` with ANTHROPIC_API_KEY set.
//
// Fixtures: eval/fixtures/<name>.png|jpg plus eval/fixtures/labels.json:
//   [{ "file": "algebra-sign.png", "errors": [{ "nx": 0.42, "ny": 0.61, "note": "sign flipped" }] },
//    { "file": "all-correct.png", "errors": [] }]
// Coordinates are fractions of the image, as the model returns them.
//
// Metrics:
//   catch rate      : of fixtures with a real error, how many got at least one error mark
//   right-error rate: of error marks on those fixtures, how many land within RADIUS of a real error
//   false positives : of fixtures with no errors, how many got an error mark anyway
//   position error  : mean distance from a matched mark to its labelled error

import { readFileSync, existsSync } from "node:fs";
import { extname, join } from "node:path";
import { describe, expect, it } from "vitest";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { CHECK_WORK_PROMPT, checkResultSchema, clampMarks } from "@studylens/core";

const DIR = join(process.cwd(), "eval", "fixtures");
const RADIUS = 0.12;
const MODEL = process.env.MODEL_TUTOR || "claude-sonnet-5-5";
const live = process.env.LIVE_EVAL === "1" && Boolean(process.env.ANTHROPIC_API_KEY) && existsSync(join(DIR, "labels.json"));

type Label = { file: string; errors: { nx: number; ny: number; note?: string }[] };

describe.skipIf(!live)("check-my-work vision eval", () => {
  it(
    "meets the bar",
    async () => {
      const labels: Label[] = JSON.parse(readFileSync(join(DIR, "labels.json"), "utf8"));
      const client = new Anthropic();
      let withErr = 0, caught = 0, errMarks = 0, rightMarks = 0, clean = 0, falsePos = 0;
      const dists: number[] = [];

      for (const l of labels) {
        const data = readFileSync(join(DIR, l.file)).toString("base64");
        const mediaType = extname(l.file).toLowerCase() === ".png" ? "image/png" : "image/jpeg";
        const res = await client.beta.messages.parse({
          model: MODEL,
          max_tokens: 12000,
          system: CHECK_WORK_PROMPT,
          messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: mediaType, data } }, { type: "text", text: "Check the work visible on this screen." }] }],
          output_config: { format: betaZodOutputFormat(checkResultSchema), effort: "medium" },
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
        });
        const marks = clampMarks(res.parsed_output?.marks ?? []).filter((m) => m.kind === "error");
        if (l.errors.length) {
          withErr++;
          if (marks.length) caught++;
          for (const m of marks) {
            errMarks++;
            const d = Math.min(...l.errors.map((e) => Math.hypot(e.nx - m.nx, e.ny - m.ny)));
            if (d <= RADIUS) {
              rightMarks++;
              dists.push(d);
            }
          }
        } else {
          clean++;
          if (marks.length) falsePos++;
        }
        console.log(`${l.file}: ${marks.length} error marks`);
      }

      const pct = (a: number, b: number) => (b ? Math.round((100 * a) / b) : 0);
      const report = {
        fixtures: labels.length,
        catchRate: `${pct(caught, withErr)}%`,
        rightErrorRate: `${pct(rightMarks, errMarks)}%`,
        falsePositiveRate: `${pct(falsePos, clean)}%`,
        meanPositionError: dists.length ? +(dists.reduce((a, b) => a + b, 0) / dists.length).toFixed(3) : null,
      };
      console.table(report);
      expect(caught / Math.max(1, withErr)).toBeGreaterThanOrEqual(0.7);
      expect(falsePos / Math.max(1, clean)).toBeLessThanOrEqual(0.3);
    },
    20 * 60_000,
  );
});
