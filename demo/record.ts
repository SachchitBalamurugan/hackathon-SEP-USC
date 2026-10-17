// Record the raw screen clips behind each demo video. Every scene resets the demo account,
// drives the real app and extension like a person would, and writes
//   out/raw/<scene>.webm   the recording
//   out/raw/<scene>.json   { trimMs, durationMs, cues: [{ at, text }] } for remotion/ to caption
// Needs the web app running at DEMO_SITE (default http://localhost:3100) with DEMO_MODE=1, and
// web/.env.local filled in. Usage: npm -w demo run record [-- check ask ...]
import { cpSync, existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import type { Page } from "playwright";
import { addCursor, launch, moveClick, signIn, typeSlow } from "./browser";
import { ROOT, SITE, sleep } from "./lib";

type Cue = { at: number; text: string };
type Scene = { seed: "full" | "empty"; paired?: boolean; run: (page: Page, s: Script) => Promise<void> };
type Script = { cue: (text: string) => void; trim: () => void; extId: string };

const RAW = `${ROOT}demo/out/raw`;
const overlay = (sel: string) => `studylens-overlay ${sel}`;

const SCENES: Record<string, Scene> = {
  setup: {
    seed: "empty",
    paired: false,
    async run(page, s) {
      await signIn(page);
      s.trim();
      s.cue("Your dashboard walks you through setup");
      await sleep(2500);
      await page.goto(`${SITE}/dashboard/connect`);
      s.cue("Get a pairing code for the extension");
      await moveClick(page, 'button:has-text("Get pairing code")', { delayAfter: 1200 });
      const code = (await page.locator("code").first().textContent())?.trim() ?? "";
      await sleep(1200);
      await page.goto(`chrome-extension://${s.extId}/popup.html`);
      s.cue("Type it into the extension");
      await typeSlow(page, 'input[aria-label="Pairing code"]', code);
      await moveClick(page, 'button:has-text("Pair")', { delayAfter: 2500 });
      await page.goto(`${SITE}/dashboard/connect`);
      s.cue("Then give Claude a key, and it can read your profile");
      await moveClick(page, 'button:has-text("Create a Claude key")', { delayAfter: 3500 });
    },
  },
  sync: {
    seed: "empty",
    async run(page, s) {
      await signIn(page);
      await page.goto(`${SITE}/demo/canvas`);
      s.trim();
      s.cue("Open Canvas once with the extension installed");
      await sleep(7000);
      await page.goto(`${SITE}/dashboard/courses`);
      s.cue("Courses, deadlines and grades come in on their own");
      await sleep(3000);
      await page.mouse.wheel(0, 500);
      await sleep(2500);
      await page.goto(`${SITE}/dashboard`);
      s.cue("And Today shows what's due next");
      await sleep(3500);
    },
  },
  check: {
    seed: "full",
    async run(page, s) {
      await page.goto(`${SITE}/demo/worksheet`, { waitUntil: "networkidle" });
      s.trim();
      s.cue("Working on a worksheet in Kami");
      await sleep(2000);
      s.cue("One click: Check my work");
      await moveClick(page, overlay('button:has-text("Check my work")'));
      await page.locator(overlay(".sl-summary-count")).waitFor({ timeout: 120_000 });
      s.cue("It circles the mistake and asks the question that fixes it");
      await sleep(3500);
      const firstMark = page.locator(overlay(".sl-mark")).first();
      if (await firstMark.count()) {
        s.cue("Click a circle to see what went wrong there");
        await firstMark.click();
        await sleep(3500);
      }
      await page.mouse.wheel(0, 300);
      s.cue("Marks stay on the work as you scroll");
      await sleep(2500);
    },
  },
  ask: {
    seed: "full",
    async run(page, s) {
      await page.goto(`${SITE}/demo/worksheet`, { waitUntil: "networkidle" });
      s.trim();
      await moveClick(page, overlay('.sl-pill button:has-text("Ask")'));
      s.cue("Ask about anything on the page");
      await typeSlow(page, overlay('textarea[aria-label="Ask StudyLens"]'), "Why do I subtract 3 before dividing by 2 in problem 2?");
      await moveClick(page, overlay('.sl-compose button:has-text("Ask")'));
      s.cue("Steps and graphs animate in as it explains");
      await page.locator(overlay(".sl-typing")).waitFor({ state: "detached", timeout: 90_000 }).catch(() => {});
      await sleep(9000);
    },
  },
  practice: {
    seed: "full",
    async run(page, s) {
      await signIn(page);
      await page.goto(`${SITE}/dashboard/practice?skill=${encodeURIComponent("distributing a negative")}`);
      s.trim();
      s.cue("Practice aimed at the belief behind your mistake");
      await page.locator("section.sheet.rise .chip").waitFor({ timeout: 90_000 });
      await sleep(2500);
      if (await page.locator('input[aria-label="Your answer"]').count()) {
        await typeSlow(page, 'input[aria-label="Your answer"]', "-6x + 12");
        await moveClick(page, 'button:has-text("Check")');
      } else {
        await moveClick(page, "section.sheet.rise .grid button");
      }
      s.cue("Graded with feedback, then spaced so it sticks");
      await sleep(5000);
    },
  },
  skills: {
    seed: "full",
    async run(page, s) {
      await signIn(page);
      await page.goto(`${SITE}/dashboard/skills`, { waitUntil: "networkidle" });
      s.trim();
      s.cue("Every skill you've shown, and how sure StudyLens is");
      await sleep(3500);
      await moveClick(page, "text=distributing a negative", { delayAfter: 3000 });
      await page.goto(`${SITE}/dashboard`);
      s.cue("A profile you can read and edit");
      await page.mouse.wheel(0, 700);
      await sleep(3500);
      await page.goto(`${SITE}/dashboard/privacy`);
      s.cue("You choose what it learns from, and can export or delete it all");
      await sleep(2500);
      await page.mouse.wheel(0, 600);
      await sleep(2500);
    },
  },
};

function ensureExtension() {
  if (existsSync(`${ROOT}demo/.ext/manifest.json`)) return;
  console.log(`building the extension against ${SITE}`);
  execSync("npm --workspace extension run build", { cwd: ROOT, stdio: "inherit", env: { ...process.env, WXT_API_BASE: SITE } });
  cpSync(`${ROOT}extension/.output/chrome-mv3`, `${ROOT}demo/.ext`, { recursive: true });
}

function seed(kind: "full" | "empty") {
  execSync(`npx tsx seed.ts${kind === "empty" ? " --empty" : ""}`, { cwd: `${ROOT}demo`, stdio: "inherit" });
}

async function record(name: string, scene: Scene) {
  seed(scene.seed);
  const tmp = `${RAW}/.tmp-${name}`;
  rmSync(tmp, { recursive: true, force: true });
  const { ctx, extId } = await launch({ videoDir: tmp, paired: scene.paired });
  await addCursor(ctx);
  const page = await ctx.newPage();
  const t0 = Date.now();
  const cues: Cue[] = [];
  let trimMs = 0;
  const script: Script = { extId, cue: (text) => cues.push({ at: Date.now() - t0, text }), trim: () => (trimMs = Date.now() - t0) };
  try {
    await scene.run(page, script);
  } finally {
    const durationMs = Date.now() - t0;
    const video = page.video();
    await ctx.close();
    if (video) renameSync(await video.path(), `${RAW}/${name}.webm`);
    rmSync(tmp, { recursive: true, force: true });
    writeFileSync(`${RAW}/${name}.json`, JSON.stringify({ trimMs, durationMs, cues: cues.map((c) => ({ ...c, at: Math.max(0, c.at - trimMs) })) }, null, 2));
    console.log(`${name}: ${(durationMs / 1000).toFixed(1)}s, ${cues.length} cues`);
  }
}

const wanted = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const unknown = wanted.filter((w) => !(w in SCENES));
if (unknown.length) throw new Error(`Unknown scene(s): ${unknown.join(", ")}. Scenes: ${Object.keys(SCENES).join(", ")}`);
mkdirSync(RAW, { recursive: true });
ensureExtension();
for (const [name, scene] of Object.entries(SCENES)) {
  if (wanted.length && !wanted.includes(name)) continue;
  await record(name, scene);
}
// Leave the account fully seeded for anyone poking at it afterwards.
seed("full");
