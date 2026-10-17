// Build the Chrome extension with a placeholder API origin and zip it into web/extension/.
// web/src/app/studylens-extension.zip/route.ts swaps the placeholder for the origin of the site
// it is downloaded from, so one committed zip works on localhost and on any deployment.
// Run after changing anything in extension/: npm run build:ext-zip
import { execSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { zipSync } from "fflate";

export const PLACEHOLDER = "https://studylens-api-base.invalid";
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SRC = join(ROOT, "extension/.output/chrome-mv3");
const OUT = join(ROOT, "web/extension/studylens-extension.zip");

execSync("npm --workspace extension run build", { cwd: ROOT, stdio: "inherit", env: { ...process.env, WXT_API_BASE: PLACEHOLDER } });

const files = {};
const walk = (dir) => {
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    // Fixed timestamps keep the zip byte-identical across rebuilds of the same source.
    else files[`studylens/${relative(SRC, p).replaceAll("\\", "/")}`] = [readFileSync(p), { mtime: new Date("2026-01-01T00:00:00Z") }];
  }
};
walk(SRC);
mkdirSync(join(ROOT, "web/extension"), { recursive: true });
writeFileSync(OUT, zipSync(files, { level: 9 }));
console.log(`wrote ${relative(ROOT, OUT)} (${Object.keys(files).length} files, ${(statSync(OUT).size / 1024).toFixed(0)} KB)`);
