// Render every demo in remotion/ into web/public/demos as <key>.mp4, <key>.webm and a <key>.jpg
// poster, which is what web/src/components/DemoVideo.tsx plays. Screen demos need their clip
// from record.ts first and are skipped without it.
// Usage: npm -w demo run render [-- check intro ...]
//        npm -w demo run render -- setup --poster   (poster only)
//        REMOTION_BROWSER=/path/to/chromium npm -w demo run render   (skip Remotion's Chrome download)
import { mkdirSync } from "node:fs";
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { DEMOS, type DemoKey } from "../web/src/lib/demos";
import { POSTER, SCREEN } from "./remotion/Root";
import { TITLE } from "./remotion/theme";
import { ROOT } from "./lib";

const OUT = `${ROOT}web/public/demos`;
// Optional: an existing Chrome/Chromium instead of Remotion's own download.
const browserExecutable = process.env.REMOTION_BROWSER || null;
const RAW = `${ROOT}demo/out/raw`;
mkdirSync(OUT, { recursive: true });
mkdirSync(RAW, { recursive: true });

const wanted = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const unknown = wanted.filter((w) => !(w in DEMOS));
if (unknown.length) throw new Error(`Unknown demo(s): ${unknown.join(", ")}. Demos: ${Object.keys(DEMOS).join(", ")}`);
const posterOnly = process.argv.includes("--poster");
const keys = (wanted.length ? wanted : Object.keys(DEMOS)) as DemoKey[];

console.log("bundling remotion/");
const serveUrl = await bundle({ entryPoint: `${ROOT}demo/remotion/index.ts`, publicDir: RAW });

for (const id of keys) {
  const composition = await selectComposition({ serveUrl, id, browserExecutable });
  if (id in SCREEN && !(composition.props as { clip?: unknown }).clip) {
    console.log(`${id}: no recording in out/raw, skipped (run: npm -w demo run record -- ${id})`);
    continue;
  }
  const t0 = Date.now();
  if (!posterOnly) await renderMedia({ composition, serveUrl, codec: "h264", crf: 22, outputLocation: `${OUT}/${id}.mp4`, browserExecutable });
  if (!posterOnly) await renderMedia({ composition, serveUrl, codec: "vp9", crf: 34, outputLocation: `${OUT}/${id}.webm`, browserExecutable });
  // Poster: a moment into the content, past the title card.
  const frame = Math.min(composition.durationInFrames - 1, POSTER[id] ?? (id in SCREEN ? TITLE + 75 : Math.round(composition.durationInFrames * 0.55)));
  await renderStill({ composition, serveUrl, frame, imageFormat: "jpeg", jpegQuality: 82, output: `${OUT}/${id}.jpg`, browserExecutable });
  console.log(`${id}: ${(composition.durationInFrames / composition.fps).toFixed(1)}s video, rendered in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
