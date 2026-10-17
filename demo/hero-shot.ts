// Quick check of the 3D hero at a few moments in its loop.
import { chromium } from "playwright";
import { SITE } from "./lib";

const out = process.argv[2] ?? "out/shots";
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("console", (m) => m.type() === "error" && console.log("console:", m.text().slice(0, 200)));
await page.goto(`${SITE}/`, { waitUntil: "networkidle" });
for (let i = 0; i < 6; i++) {
  await page.waitForTimeout(1300);
  const note = await page.evaluate(() => {
    const el = [...document.querySelectorAll("div")].find((d) => d.textContent?.startsWith("Mistake") && d.textContent.includes("20 − 5"));
    if (!el) return "no note element";
    const r = el.getBoundingClientRect();
    return `opacity ${getComputedStyle(el).opacity} at ${Math.round(r.x)},${Math.round(r.y)} size ${Math.round(r.width)}x${Math.round(r.height)}`;
  });
  console.log(`t+${(i + 1) * 1.3}s: ${note}`);
  await page.screenshot({ path: `${out}/hero-${i}.png`, clip: { x: 0, y: 0, width: 1440, height: 760 } });
}
await browser.close();
