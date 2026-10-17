// Screenshot every page at desktop and phone width for visual review.
// Usage: npx tsx shots.ts [outDir]
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { DEMO_EMAIL, DEMO_PASSWORD, SITE } from "./lib";

const out = process.argv[2] ?? "out/shots";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();

for (const [label, viewport] of [
  ["desktop", { width: 1440, height: 900 }],
  ["phone", { width: 390, height: 844 }],
] as const) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const shot = async (name: string, full = false) => {
    await page.waitForTimeout(1200);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    await page.screenshot({ path: `${out}/${label}-${name}.png`, fullPage: full });
    console.log(`${label}-${name}${overflow ? "  [HORIZONTAL OVERFLOW]" : ""}`);
  };
  await page.goto(`${SITE}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  await shot("landing", true);
  await page.goto(`${SITE}/login?mode=signup`);
  await shot("signup");
  await page.goto(`${SITE}/login`);
  await page.fill('input[name="email"]', DEMO_EMAIL);
  await page.fill('input[name="password"]', DEMO_PASSWORD);
  await page.click('button:has-text("Sign in")');
  await page.waitForURL("**/dashboard", { timeout: 60_000 });
  await shot("today", true);
  for (const p of ["skills", "mistakes", "practice", "courses", "connect", "privacy"]) {
    await page.goto(`${SITE}/dashboard/${p}`, { waitUntil: "networkidle" });
    if (p === "skills") await page.waitForTimeout(2500);
    await shot(p, true);
  }
  await page.goto(`${SITE}/demo/worksheet`);
  await shot("worksheet");
  await page.goto(`${SITE}/demo/canvas`);
  await shot("canvas");
  await ctx.close();
}
await browser.close();
