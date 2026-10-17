// Cut the website's demo loops (web/public/demos/<key>.mp4/.webm/.jpg) from the live.ts recordings
// in out/live: real footage of the site and extension with the demo student. Each loop is one or
// more [from, to] ranges (seconds after the scene's start), framed on the site background at 16:9.
// Usage: npx tsx cut.ts [check ask ...]   (needs ffmpeg with libx264 and libvpx-vp9)
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { ROOT } from "./lib";

const LIVE = `${ROOT}demo/out/live`;
const OUT = `${ROOT}web/public/demos`;

// poster: seconds into the loop for the still frame. frame: the ffmpeg filter that fits it to 16:9.
const LOOPS: Record<string, { clip: string; ranges: [number, number][]; poster: number; frame?: string }> = {
  check: { clip: "check", ranges: [[0, 15]], poster: 9 },
  ask: { clip: "check", ranges: [[15.5, 29]], poster: 12.8 },
  practice: { clip: "tour", ranges: [[21.2, 38.5]], poster: 9 },
  skills: { clip: "tour", ranges: [[7.8, 17.2]], poster: 5 },
  // The courses page, then Today's due list (the dashboard is up about 2s into the scene).
  sync: { clip: "tour", ranges: [[38.9, 42.4], [2.2, 6.8]], poster: 1.8 },
  // The worksheet beside the Claude terminal (2880x1000): cover the terminal window's file-path
  // bar, and keep 1080p so the terminal text stays readable.
  claude: { clip: "claude", ranges: [[5.5, 33.5]], poster: 19.5, frame: "drawbox=x=1440:y=0:w=1440:h=37:color=0x2a2926:t=fill,pad=2880:1620:0:(oh-ih)/2:color=0xF4F4F2,scale=1920:1080:flags=lanczos,setsar=1" },
};

// The recordings are the 1440x1000 browser window; pad to 16:9 on the site's sunken background.
const FRAME = "pad=1778:1000:(ow-iw)/2:0:color=0xF4F4F2,scale=1280:720:flags=lanczos,setsar=1";

const wanted = process.argv.slice(2);
for (const [key, loop] of Object.entries(LOOPS)) {
  if (wanted.length && !wanted.includes(key)) continue;
  const { startMs } = JSON.parse(readFileSync(`${LIVE}/${loop.clip}.json`, "utf8")) as { startMs: number };
  const s0 = startMs / 1000;
  const parts = loop.ranges.map(([a, b], i) => `[0:v]trim=${(s0 + a).toFixed(2)}:${(s0 + b).toFixed(2)},setpts=PTS-STARTPTS[p${i}]`);
  const concat = `${loop.ranges.map((_, i) => `[p${i}]`).join("")}concat=n=${loop.ranges.length}:v=1:a=0,${loop.frame ?? FRAME}[v]`;
  const graph = [...parts, concat].join(";");
  const input = `${LIVE}/${loop.clip}.mp4`;
  const run = (args: string[]) => execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", input, "-filter_complex", graph, "-map", "[v]", "-an", ...args]);
  run(["-c:v", "libx264", "-preset", "slow", "-crf", "24", "-pix_fmt", "yuv420p", "-movflags", "+faststart", `${OUT}/${key}.mp4`]);
  run(["-c:v", "libvpx-vp9", "-crf", "36", "-b:v", "0", "-row-mt", "1", `${OUT}/${key}.webm`]);
  const total = loop.ranges.reduce((n, [a, b]) => n + b - a, 0);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", String(loop.poster), "-i", `${OUT}/${key}.mp4`, "-frames:v", "1", "-q:v", "3", `${OUT}/${key}.jpg`]);
  console.log(`${key}: ${total.toFixed(1)}s`);
}
