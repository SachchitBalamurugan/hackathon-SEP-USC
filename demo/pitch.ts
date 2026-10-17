// Render the two-minute pitch (remotion/Pitch.tsx) with its voiceover and burned-in captions.
// Needs the voiceover at out/raw/voiceover.mp3 (not committed).
// Usage: npx tsx pitch.ts [pitch|part2] [out.mp4]   (REMOTION_BROWSER as in render.ts)
// part2 needs out/raw/voiceover-part2.mp3.
import { existsSync } from "node:fs";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { ROOT } from "./lib";

const RAW = `${ROOT}demo/out/raw`;
const id = process.argv[2] ?? "pitch";
const audio = id === "pitch" ? "voiceover.mp3" : `voiceover-${id}.mp3`;
if (!existsSync(`${RAW}/${audio}`)) throw new Error(`Put the voiceover at demo/out/raw/${audio} first.`);
const out = process.argv[3] ?? `${ROOT}demo/out/${id}.mp4`;
const browserExecutable = process.env.REMOTION_BROWSER || null;
const serveUrl = await bundle({ entryPoint: `${ROOT}demo/remotion/index.ts`, publicDir: RAW });
const composition = await selectComposition({ serveUrl, id, browserExecutable });
const t0 = Date.now();
await renderMedia({
  composition,
  serveUrl,
  codec: "h264",
  crf: 20,
  audioCodec: "aac",
  outputLocation: out,
  browserExecutable,
  onProgress: ({ progress }) => Math.round(progress * 100) % 10 === 0 && process.stdout.write(`\r${Math.round(progress * 100)}%`),
});
console.log(`\n${out}: ${(composition.durationInFrames / composition.fps).toFixed(1)}s, rendered in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
