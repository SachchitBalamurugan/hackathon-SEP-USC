// Smoke test: extension loads in Playwright Chromium, starts paired, and Check my work runs.
import { launch } from "./browser";
import { ROOT, SITE } from "./lib";

const { ctx, extId } = await launch();
console.log("extension id:", extId);
const page = await ctx.newPage();
page.on("console", (m) => m.type() === "error" && console.log("page error:", m.text().slice(0, 200)));
await page.goto(`${SITE}/demo/worksheet`, { waitUntil: "networkidle" });
const pill = page.locator("studylens-overlay").locator("text=Check my work").first();
await pill.waitFor({ timeout: 20_000 });
console.log("pill toolbar visible");
const t0 = Date.now();
await pill.click();
await page.locator("studylens-overlay .sl-summary-count").waitFor({ timeout: 120_000 });
console.log(`check finished in ${((Date.now() - t0) / 1000).toFixed(1)}s:`, await page.locator("studylens-overlay .sl-summary-count").textContent());
const marks = await page.locator("studylens-overlay .sl-mark").count();
console.log("marks on page:", marks);
await page.waitForTimeout(4000);
await page.screenshot({ path: `${ROOT}demo/out/shots/probe-check.png` });
await ctx.close();
