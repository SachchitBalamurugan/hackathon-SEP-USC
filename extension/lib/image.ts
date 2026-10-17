import type { Window } from "@studylens/core";

// Screenshot handling in the service worker. Claude reads images best at up to ~1568px on the
// long edge, so the check image is downscaled to that; the full-resolution capture is kept
// briefly so the refine pass can crop real pixels instead of upscaling a thumbnail.

export const MAX_EDGE = 1568;

export async function bitmapFromDataUrl(dataUrl: string): Promise<ImageBitmap> {
  const blob = await (await fetch(dataUrl)).blob();
  return createImageBitmap(blob);
}

async function toBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** Draw a region of the bitmap (normalised window, default the whole image) to JPEG base64. */
export async function encodeRegion(bmp: ImageBitmap, win: Window = { x0: 0, y0: 0, x1: 1, y1: 1 }, maxEdge = MAX_EDGE): Promise<string> {
  const sx = win.x0 * bmp.width;
  const sy = win.y0 * bmp.height;
  const sw = Math.max(1, (win.x1 - win.x0) * bmp.width);
  const sh = Math.max(1, (win.y1 - win.y0) * bmp.height);
  const scale = Math.min(1, maxEdge / Math.max(sw, sh));
  const canvas = new OffscreenCanvas(Math.round(sw * scale), Math.round(sh * scale));
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bmp, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return toBase64(await canvas.convertToBlob({ type: "image/jpeg", quality: 0.85 }));
}
