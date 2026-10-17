// Render the live walkthrough (remotion/Walkthrough.tsx) from the live.ts recordings in out/live.
// Usage: npx tsx walkthrough.ts [walkthrough|short] [out.mp4]   (REMOTION_BROWSER as in render.ts)
// "short" is the one-minute cut to out/live/voiceover-short.mp3.
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { ROOT } from "./lib";

const id = process.argv[2] ?? "walkthrough";
const out = process.argv[3] ?? `${ROOT}demo/out/${id}.mp4`;
const browserExecutable = process.env.REMOTION_BROWSER || null;
const serveUrl = await bundle({ entryPoint: `${ROOT}demo/remotion/index.ts`, publicDir: `${ROOT}demo/out/live` });
const composition = await selectComposition({ serveUrl, id, browserExecutable });
const t0 = Date.now();
let shown = -1;
await renderMedia({
  composition,
  serveUrl,
  codec: "h264",
  crf: 20,
  audioCodec: "aac",
  outputLocation: out,
  browserExecutable,
  onProgress: ({ progress }) => {
    const p = Math.floor(progress * 10) * 10;
    if (p !== shown) process.stdout.write(`${(shown = p)}% `);
  },
});
console.log(`\n${out}: ${(composition.durationInFrames / composition.fps).toFixed(1)}s, rendered in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
