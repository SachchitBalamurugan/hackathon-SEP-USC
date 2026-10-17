// Record real footage of the running site and extension against the demo fixtures, for the
// walkthrough video. Each scene writes out/live/<scene>.webm (+ <scene>-term.webm for the
// terminal) and out/live/<scene>.json with caption cues and per-page start times.
//
// Needs the web app in fixture mode and a display for the extension:
//   DEMO_FIXTURES=1 DEMO_MODE=1 NEXT_PUBLIC_SITE_URL=http://localhost:3100 npx --workspace web next dev -p 3100
//   (add DEMO_CLAUDE_MODE=1 for the "claude" scene: no server model, the work goes to Claude)
//   WXT_API_BASE=http://localhost:3100 npm -w extension run build && cp -r extension/.output/chrome-mv3 demo/.ext
//   Xvfb :99 -screen 0 2880x1000x24 &   then   DISPLAY=:99 npx tsx live.ts setup tour check   (then: ... live.ts claude)
// The screen is recorded with ffmpeg's x11grab, so the footage is the real Chrome window.
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { BrowserContext, Page } from "playwright";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { addCursor, launch, moveClick, typeSlow, VIEWPORT } from "./browser";
import { ROOT, SITE, sleep } from "./lib";

const OUT = `${ROOT}demo/out/live`;
const MAYA = { email: "maya@studylens.demo", extKey: "sl_demo_maya_extension_key_for_recordings", mcpKey: "sl_demo_maya_claude_key_for_recordings" };
const TERMINAL = `file://${fileURLToPath(new URL("./terminal.html", import.meta.url))}`;
const overlay = (sel: string) => `studylens-overlay ${sel}`;

type Cue = { at: number; text: string };
type Ctx = { ctx: BrowserContext; page: Page; extId: string; cue: (text: string) => void; trim: () => void; newWindow: (url: string) => Promise<Page> };

const SCREEN = { width: VIEWPORT.width, height: VIEWPORT.height + 100 };

/** Navigate, then click an empty corner so focus leaves Chrome's address bar. */
async function go(page: Page, url: string, opts?: Parameters<Page["goto"]>[1]) {
  await page.goto(url, opts);
  // An OS-level click in the bottom-left corner of the page (the window sits at 0,0 with about
  // 100px of browser chrome above the page).
  if (!url.startsWith("chrome://")) {
    try {
      execFileSync("python3", [fileURLToPath(new URL("./xclick.py", import.meta.url)), "3", String(SCREEN.height - 20)]);
    } catch {
      /* cosmetic only */
    }
  }
}

/** Put a page's window at x = left, full screen height. There is no window manager to do it. */
async function placeWindow(page: Page, left: number) {
  const s = await page.context().newCDPSession(page);
  const { windowId } = await s.send("Browser.getWindowForTarget");
  await s.send("Browser.setWindowBounds", { windowId, bounds: { windowState: "normal" } });
  await s.send("Browser.setWindowBounds", { windowId, bounds: { left, top: 0, width: SCREEN.width, height: SCREEN.height } });
  await s.detach();
}

/** Record the virtual display (the left window, or both side by side) with x11grab. */
function startCapture(file: string, wide: boolean): Promise<{ proc: ChildProcess; at: number }> {
  const width = wide ? SCREEN.width * 2 : SCREEN.width;
  const proc = spawn(
    "ffmpeg",
    ["-y", "-loglevel", "error", "-f", "x11grab", "-draw_mouse", "0", "-framerate", "30", "-video_size", `${width}x${SCREEN.height}`, "-i", `${process.env.DISPLAY}.0+0,0`, "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p", file],
    { stdio: ["pipe", "inherit", "inherit"] },
  );
  return new Promise((resolve) => setTimeout(() => resolve({ proc, at: Date.now() }), 400));
}

function stopCapture(proc: ChildProcess) {
  return new Promise<void>((resolve) => {
    proc.on("exit", () => resolve());
    proc.stdin?.write("q");
    proc.stdin?.end();
  });
}

async function signIn(page: Page, email: string) {
  await go(page, `${SITE}/login`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', "demo-password");
  await page.click('button:has-text("Sign in")');
  await page.waitForURL("**/dashboard", { timeout: 60_000 });
}

async function mcp() {
  const client = new Client({ name: "claude-code", version: "2" });
  await client.connect(new StreamableHTTPClientTransport(new URL(`${SITE}/api/mcp`), { requestInit: { headers: { Authorization: `Bearer ${MAYA.mcpKey}` } } }));
  return client;
}
const textOf = (r: unknown) => ((r as { content: { type: string; text?: string }[] }).content.find((c) => c.type === "text")?.text ?? "").trim();

const SCENES: Record<string, { paired: boolean; wide?: boolean; run: (s: Ctx) => Promise<void> }> = {
  // A brand-new student: account, extension, pairing, Claude.
  setup: {
    paired: false,
    async run({ page, extId, cue, trim }) {
      await go(page, `${SITE}/login?mode=signup`);
      trim();
      cue("Create an account: just an email and a password");
      await typeSlow(page, 'input[name="email"]', "alex.rivera@school.edu");
      await typeSlow(page, 'input[name="password"]', "studylens-2026");
      await moveClick(page, 'button:has-text("Create account")');
      await page.waitForURL("**/dashboard");
      cue("A checklist walks you through setup and ticks itself off");
      await sleep(3500);
      await go(page, `${SITE}/dashboard/connect`);
      cue("Step 1: download the extension");
      await sleep(1200);
      await moveClick(page, 'a:has-text("Download extension")', { delayAfter: 1500 });
      cue("Unzip it, then Load unpacked in chrome://extensions with Developer mode on");
      await go(page, "chrome://extensions");
      await sleep(1500);
      await page.locator("#devMode").click().catch(() => {});
      await sleep(2500);
      await go(page, `${SITE}/dashboard/connect`);
      cue("Step 2: get a one-time pairing code");
      await moveClick(page, 'button:has-text("Get pairing code")', { delayAfter: 1500 });
      const code = ((await page.locator('code[aria-live="polite"]').first().textContent()) ?? "").trim();
      await sleep(1000);
      await go(page, `chrome-extension://${extId}/popup.html`);
      cue("Type it into the StudyLens popup");
      await typeSlow(page, 'input[aria-label="Pairing code"]', code);
      await moveClick(page, 'button:has-text("Pair")', { delayAfter: 2500 });
      await go(page, `${SITE}/dashboard/connect#claude`);
      cue("Paired. Step 3: create a key for Claude");
      await sleep(1500);
      await moveClick(page, 'button:has-text("Create a Claude key")', { delayAfter: 3500 });
      cue("Copy the one-line command (or the Claude Desktop config) and you're done");
      await sleep(3000);
      await go(page, `${SITE}/dashboard/setup`);
      cue("The Setup guide keeps the video and fixes for common problems");
      await sleep(3500);
    },
  },

  // Maya, three weeks in: everything the dashboard knows about her.
  tour: {
    paired: true,
    async run({ page, cue, trim }) {
      await signIn(page, MAYA.email);
      trim();
      cue("Maya's dashboard: what's due, what to fix, and her profile");
      await sleep(3000);
      await page.mouse.wheel(0, 650);
      cue("The profile StudyLens and Claude read before teaching her. She can edit it");
      await sleep(3500);
      await go(page, `${SITE}/dashboard/skills`, { waitUntil: "networkidle" });
      cue("Every skill she's shown, weighted toward recent evidence");
      await sleep(3500);
      await moveClick(page, "text=distributing a negative", { delayAfter: 3000 });
      await go(page, `${SITE}/dashboard/mistakes`);
      cue("Open mistakes, with the belief behind each one");
      await sleep(3200);
      await go(page, `${SITE}/dashboard/practice`);
      cue("Practice that comes back right before she'd forget");
      await sleep(1500);
      await moveClick(page, 'button:has-text("Review")', { delayAfter: 1500 });
      await typeSlow(page, 'input[aria-label="Your answer"]', "-3x - 12");
      await moveClick(page, 'button:has-text("Check")', { delayAfter: 2200 });
      cue("Wrong: feedback names the step, and she can dispute a grade");
      await sleep(2500);
      await moveClick(page, 'button:has-text("Next")', { delayAfter: 1200 });
      await moveClick(page, "section.sheet.rise .grid button:nth-child(2)", { delayAfter: 2500 });
      cue("Right: it schedules the next review");
      await sleep(2000);
      await go(page, `${SITE}/dashboard/courses`);
      cue("Courses and deadlines, synced from Canvas");
      await sleep(3000);
      await go(page, `${SITE}/dashboard/privacy`);
      await page.mouse.wheel(0, 700);
      cue("Tutor self-checks: every model step is verified, and the results are shown");
      await sleep(4000);
    },
  },

  // The core loop on real homework: check, explain on the whiteboard, practice.
  check: {
    paired: true,
    async run({ page, cue, trim }) {
      await go(page, `${SITE}/demo/worksheet`, { waitUntil: "networkidle" });
      trim();
      cue("Maya's worksheet in a PDF annotator. One click: Check my work");
      await sleep(1500);
      await moveClick(page, overlay('button:has-text("Check my work")'));
      await page.locator(overlay(".sl-summary-count")).waitFor({ timeout: 60_000 });
      cue("Red: a mistake. Green: done right. Amber: it can't read the handwriting, so it asks");
      await sleep(4000);
      cue("It names the belief behind the error and asks one question");
      await sleep(3000);
      // The first mistake's note opens by itself; point at it rather than toggling it shut.
      const box = await page.locator(overlay(".sl-mark-error")).boundingBox();
      if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 25 });
      await sleep(1500);
      cue("Click a mark to explain it, practice it, or say it's wrong");
      await sleep(1500);
      await moveClick(page, overlay('.sl-note-actions button:has-text("Explain")'));
      cue("Explanations stream in, with steps and graphs drawn on the whiteboard");
      await page.locator(overlay(".sl-typing")).waitFor({ state: "detached", timeout: 60_000 }).catch(() => {});
      await sleep(9000);
      await moveClick(page, overlay('.sl-tab:has-text("Practice")'), { delayAfter: 800 });
      cue("Practice aimed at this exact mistake");
      await moveClick(page, overlay(".sl-practice .sl-btn"));
      await page.locator(overlay('input[aria-label="Your answer"]')).first().waitFor({ timeout: 60_000 });
      await sleep(1200);
      await typeSlow(page, overlay('input[aria-label="Your answer"]'), "5");
      await moveClick(page, overlay('.sl-card button:has-text("Check")'), { delayAfter: 2500 });
      cue("Graded on the server; the answer key never reaches the page");
      await sleep(3000);
    },
  },

  // Claude mode: no server model. The check goes to Maya's own Claude through MCP.
  claude: {
    paired: true,
    wide: true,
    async run({ page, cue, trim, newWindow }) {
      await go(page, `${SITE}/demo/worksheet`, { waitUntil: "networkidle" });
      const term = await newWindow(TERMINAL);
      trim();
      const client = await mcp();
      const t = async (fn: string, ...args: unknown[]) => {
        await term.evaluate(([f, a]) => (window as unknown as { term: Record<string, (...x: unknown[]) => unknown> }).term[f as string](...(a as unknown[])), [fn, args] as const);
        // Give viewers time to read each step.
        await sleep(fn === "result" ? 1400 : fn === "tool" ? 600 : fn === "say" ? 900 : 0);
      };
      await t("welcome", "~/school");
      const tools = (await client.listTools()).tools.length;
      await t("type", "/mcp");
      await t("line", `studylens · ${SITE}/api/mcp · ✔ connected · ${tools} tools`, "ok");
      cue("No API key on the server: Maya's own Claude does the thinking, through the StudyLens connector");
      await sleep(1500);
      await moveClick(page, overlay('button:has-text("Check my work")'), { delayAfter: 2500 });
      cue("Check my work hands the screenshot to Claude and copies what to say");
      await sleep(2000);
      await t("type", "Check my work with StudyLens");
      await t("thinking", 900);
      await t("tool", "get_pending_check");
      const pending = await client.callTool({ name: "get_pending_check", arguments: {} });
      const taskId = /task_id: (\S+)/.exec(textOf(pending))?.[1] ?? "";
      await t("result", [`task_id: ${taskId}`, "Page: localhost", "[screenshot 1440×900 · image/jpeg]", "You are looking at a screenshot of a student's screen…"]);
      cue("Claude pulls the screenshot and Maya's profile, live from StudyLens");
      await t("tool", "get_learner_profile");
      const profile = textOf(await client.callTool({ name: "get_learner_profile", arguments: {} }));
      const lines = profile.split("\n").map((l) => l.replace(/\*\*/g, "").trim());
      const after = (h: string) => lines[lines.findIndex((l) => l.startsWith(h)) + 1] ?? "";
      await t("result", [lines.find((l) => l.startsWith("Learns best")) ?? "", lines.find((l) => l.startsWith("Weak skills")) ?? "", `Recent mistake ${after("Recent mistakes")}`, `Due soon ${after("Due soon")}`].map((l) => (l.length > 150 ? `${l.slice(0, 147)}…` : l)));
      await t("thinking", 1400);
      await t("say", "I can read all three. Problem 1 has a sign slip on the first line, problems 2 and 3 look right, but I'm not sure about one digit in problem 3. Marking it now.");
      await t("tool", "submit_check_result");
      const done = await client.callTool({ name: "submit_check_result", arguments: { task_id: taskId, ...CLAUDE_MARKS } });
      await t("result", textOf(done));
      cue("Claude's marks land on the page: same verifiers, same overlay");
      await page.locator(overlay(".sl-summary-count")).waitFor({ timeout: 30_000 });
      await sleep(3000);
      await t("say", "You moved the +5 across without changing its sign. You've done that with signs before, so let's fix the habit: in 3x + 5 = 20, what do you do to both sides to undo the +5?");
      await t("tool", "record_observation", 'category: "confusion"');
      await t("result", textOf(await client.callTool({ name: "record_observation", arguments: { observation: "Still keeps a term's sign when moving it across the equals sign (Worksheet 4, problem 1).", category: "confusion", skill: "inverse operations when isolating a variable" } })));
      cue("And it saves what it learned, so StudyLens gets better for her next time");
      await sleep(3500);
      await client.close();
    },
  },
};

const CLAUDE_MARKS = {
  summary: "Your setup is right on all three. One sign slip in problem 1 changes the answer.",
  subject: "Algebra 1: solving linear equations",
  question: 'In problem 1, what do you do to both sides to undo the "+ 5"?',
  marks: [
    { kind: "error", note: "+5 should become −5 on the other side: 3x = 20 − 5", nx: 0.392, ny: 0.332, w: 0.115, h: 0.061, shape: "circle", skill: "inverse operations when isolating a variable", misconception: "A term keeps its sign when it moves across the equals sign." },
    { kind: "correct", note: "Clean: add 4, then divide by 2.", nx: 0.365, ny: 0.618, w: 0.06, h: 0.055, shape: "circle", skill: "two-step equations", misconception: "" },
    { kind: "uncertain", note: "Is this an 8 or a 3?", nx: 0.372, ny: 0.794, w: 0.075, h: 0.055, shape: "circle", skill: "combining like terms", misconception: "" },
  ],
};

async function record(name: string, scene: (typeof SCENES)[string]) {
  if (scene.paired) writeFileSync(`${ROOT}demo/.demo-key`, MAYA.extKey);
  const { ctx, extId } = await launch({ paired: scene.paired });
  await addCursor(ctx);
  // Next's dev-only error overlay never appears on a production build; keep it out of the footage.
  await ctx.addInitScript(() => {
    const css = () => {
      const st = document.createElement("style");
      st.textContent = "nextjs-portal{display:none!important}";
      document.documentElement.appendChild(st);
    };
    if (document.documentElement) css();
    else document.addEventListener("DOMContentLoaded", css);
  });
  // The launch tab is the one on screen; use it, then add windows to the right as needed.
  const page = ctx.pages()[0] ?? (await ctx.newPage());
  await page.setViewportSize(VIEWPORT);
  // Chrome's own download handling, so the file keeps its real name in the download bubble.
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: `${OUT}/downloads`, eventsEnabled: true }).catch(() => {});
  const newWindow = async (url: string) => {
    const [popup] = await Promise.all([
      ctx.waitForEvent("page"),
      // A web page can't open file:// itself, so open a blank window and navigate it.
      page.evaluate(([w, h]) => window.open("about:blank", "_blank", `popup,left=${w},top=0,width=${w},height=${h}`), [SCREEN.width, SCREEN.height] as const),
    ]);
    await popup.goto(url);
    await placeWindow(popup, SCREEN.width);
    await popup.setViewportSize({ width: SCREEN.width, height: SCREEN.height - 60 });
    return popup;
  };
  await page.goto("about:blank");
  await placeWindow(page, 0);
  const file = `${OUT}/${name}.mp4`;
  const cap = await startCapture(file, Boolean(scene.wide));
  const cues: Cue[] = [];
  let trimAt = Date.now();
  try {
    await scene.run({ ctx, page, extId, newWindow, cue: (text) => cues.push({ at: Date.now(), text }), trim: () => (trimAt = Date.now()) });
  } catch (e) {
    console.error(`${name} failed:`, (e as Error).message.split("\n")[0]);
    await page.screenshot({ path: `${OUT}/${name}-failed.png` }).catch(() => {});
    throw e;
  } finally {
    const end = Date.now();
    await stopCapture(cap.proc);
    await ctx.close();
    writeFileSync(
      `${OUT}/${name}.json`,
      JSON.stringify({ file: `${name}.mp4`, startMs: trimAt - cap.at, durationMs: end - trimAt, wide: Boolean(scene.wide), cues: cues.map((c) => ({ at: c.at - trimAt, text: c.text })) }, null, 2),
    );
    console.log(`${name}: ${((end - trimAt) / 1000).toFixed(1)}s, ${cues.length} cues`);
  }
}

const wanted = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
for (const [name, scene] of Object.entries(SCENES)) if (!wanted.length || wanted.includes(name)) await record(name, scene);
