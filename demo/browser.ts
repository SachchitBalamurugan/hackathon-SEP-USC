// Launch Playwright's Chromium with the localhost build of the extension, already paired.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { chromium, type BrowserContext, type Page } from "playwright";
import { DEMO_EMAIL, DEMO_PASSWORD, ROOT, SITE, sleep } from "./lib";

// The extension worker's global, as seen from sw.evaluate().
declare const chrome: { storage: { local: { set(items: Record<string, unknown>): Promise<void> } } };

export const VIEWPORT = { width: 1440, height: 900 };

export async function launch(opts: { videoDir?: string; paired?: boolean } = {}) {
  const ext = `${ROOT}demo/.ext`;
  const profile = `${ROOT}demo/.profile`;
  rmSync(profile, { recursive: true, force: true });
  // A fresh profile that never offers to save passwords mid-recording.
  mkdirSync(`${profile}/Default`, { recursive: true });
  writeFileSync(`${profile}/Default/Preferences`, JSON.stringify({ credentials_enable_service: false, profile: { password_manager_enabled: false }, download: { prompt_for_download: false } }));
  if (opts.videoDir) mkdirSync(opts.videoDir, { recursive: true });
  // Extensions only load in a headed browser; on a server, run under xvfb-run (DISPLAY is set).
  // DEMO_CHROME points at a specific Chrome/Chromium build when Playwright's own isn't installed.
  const executablePath = process.env.DEMO_CHROME || undefined;
  const ctx = await chromium.launchPersistentContext(profile, {
    ...(executablePath ? { executablePath } : { channel: "chromium" }),
    headless: !process.env.DISPLAY,
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    args: [
      `--disable-extensions-except=${ext}`,
      `--load-extension=${ext}`,
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      "--hide-scrollbars",
      // No "unsupported command-line flag" bar for the --no-sandbox Playwright adds as root.
      "--test-type",
      // Headed on a virtual display: a fixed window the screen recorder can frame.
      ...(process.env.DISPLAY ? ["--window-position=0,0", `--window-size=${VIEWPORT.width},${VIEWPORT.height + 100}`] : []),
    ],
    recordVideo: opts.videoDir ? { dir: opts.videoDir, size: VIEWPORT } : undefined,
  });
  let [sw] = ctx.serviceWorkers();
  sw ??= await ctx.waitForEvent("serviceworker");
  const extId = new URL(sw.url()).host;
  if (opts.paired !== false) {
    const key = readFileSync(`${ROOT}demo/.demo-key`, "utf8").trim();
    // The worker can be listed before its extension APIs are ready; retry briefly.
    for (let i = 0; ; i++) {
      try {
        await sw.evaluate(async (k) => {
          await chrome.storage.local.set({ apiKey: k, firstRunDone: true });
        }, key);
        break;
      } catch (e) {
        if (i >= 10) throw e;
        await sleep(500);
        sw = ctx.serviceWorkers().at(-1) ?? sw;
      }
    }
  }
  // The persistent context opens a blank first tab. Headless, close it so recordings start clean;
  // headed, closing the last tab closes the window, so callers' new pages open beside it.
  if (!process.env.DISPLAY) for (const p of ctx.pages()) await p.close();
  return { ctx, sw, extId };
}

export async function signIn(page: Page) {
  await page.goto(`${SITE}/login`);
  await page.fill('input[name="email"]', DEMO_EMAIL);
  await page.fill('input[name="password"]', DEMO_PASSWORD);
  await page.click('button:has-text("Sign in")');
  await page.waitForURL("**/dashboard", { timeout: 60_000 });
}

/** Move the visible cursor smoothly to an element, then click it. */
export async function moveClick(page: Page, selector: string, opts: { delayAfter?: number } = {}) {
  const el = page.locator(selector).first();
  await el.waitFor({ state: "visible", timeout: 90_000 });
  const box = await el.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 25 });
    await sleep(250);
  }
  await el.click();
  await sleep(opts.delayAfter ?? 600);
}

/** Type like a person, not a robot. */
export async function typeSlow(page: Page, selector: string, text: string) {
  await page.locator(selector).first().click();
  await page.keyboard.type(text, { delay: 45 });
}

/** A visible cursor dot, since headless recordings don't draw the pointer. */
export async function addCursor(ctx: BrowserContext) {
  await ctx.addInitScript(() => {
    const install = () => {
      if (document.getElementById("__demo_cursor")) return;
      const c = document.createElement("div");
      c.id = "__demo_cursor";
      Object.assign(c.style, {
        position: "fixed",
        left: "0",
        top: "0",
        width: "22px",
        height: "22px",
        borderRadius: "50%",
        background: "rgba(25,25,23,0.18)",
        border: "2px solid rgba(25,25,23,0.75)",
        pointerEvents: "none",
        zIndex: "2147483647",
        transform: "translate(-200px,-200px)",
        transition: "width 120ms, height 120ms, margin 120ms",
      });
      document.documentElement.appendChild(c);
      window.addEventListener("mousemove", (e) => (c.style.transform = `translate(${e.clientX - 11}px, ${e.clientY - 11}px)`), true);
      window.addEventListener("mousedown", () => Object.assign(c.style, { width: "16px", height: "16px", margin: "3px" }), true);
      window.addEventListener("mouseup", () => Object.assign(c.style, { width: "22px", height: "22px", margin: "0" }), true);
    };
    if (document.documentElement) install();
    else document.addEventListener("DOMContentLoaded", install);
  });
}
