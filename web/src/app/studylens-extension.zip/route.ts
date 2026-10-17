import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";

// The extension download. The committed zip (npm run build:ext-zip) was built against a
// placeholder origin; this swaps in the origin it is downloaded from, so the extension talks to
// the same site the student signed up on, whether that is localhost or a deployment.

const PLACEHOLDER = "https://studylens-api-base.invalid";
const TEXT = /\.(js|html|json|css)$/;
const cache = new Map<string, Uint8Array>();

export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  let zip = cache.get(origin);
  if (!zip) {
    const files = unzipSync(new Uint8Array(await readFile(join(process.cwd(), "extension/studylens-extension.zip"))));
    for (const [name, data] of Object.entries(files)) {
      if (TEXT.test(name)) files[name] = strToU8(strFromU8(data).replaceAll(PLACEHOLDER, origin));
    }
    zip = zipSync(files, { level: 6 });
    cache.set(origin, zip);
  }
  return new Response(new Blob([zip as BlobPart]), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="studylens-extension.zip"',
      "Cache-Control": "public, max-age=300",
    },
  });
}
