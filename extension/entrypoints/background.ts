import { refineWindow, type CheckResult, type Mark } from "@studylens/core";
import { api, rawApi } from "@/lib/api";
import { apiKey, settingsCache, syncTimes, type Settings } from "@/lib/config";
import { bitmapFromDataUrl, encodeRegion } from "@/lib/image";
import { syncCanvas } from "@/lib/canvasSync";
import type { CheckResponse, ExplainStart, Reply, Request } from "@/lib/messages";

// The worker owns the API key and all network access. Content scripts ask it to capture,
// check, explain and sync; page scripts can never reach the key or the API.

/** Full-resolution captures kept briefly for the refine pass. */
const captures = new Map<string, { bmp: ImageBitmap; at: number }>();
function remember(id: string, bmp: ImageBitmap) {
  const now = Date.now();
  for (const [k, v] of captures) if (now - v.at > 120_000) captures.delete(k);
  captures.set(id, { bmp, at: now });
}

async function capture(windowId: number) {
  const dataUrl = await browser.tabs.captureVisibleTab(windowId, { format: "png" });
  return bitmapFromDataUrl(dataUrl);
}

async function handle(msg: Request, sender: Browser.runtime.MessageSender): Promise<unknown> {
  switch (msg.type) {
    case "STATUS": {
      const key = await apiKey.getValue();
      return { paired: Boolean(key), settings: await settingsCache.getValue(), syncs: await syncTimes.getValue() };
    }
    case "PAIR": {
      const res = await rawApi("/api/pair", { body: { action: "redeem", code: msg.code } });
      const data = await res.json();
      if (!res.ok || !data.key) throw new Error(data.error === "invalid_or_expired_code" ? "That code is invalid or expired. Get a new one from the dashboard." : "Pairing failed.");
      await apiKey.setValue(data.key);
      await refreshSettings();
      return { paired: true };
    }
    case "SIGN_OUT":
      await apiKey.setValue(null);
      return { paired: false };
    case "CAPTURE": {
      const windowId = sender.tab?.windowId;
      if (windowId === undefined) throw new Error("No tab to capture.");
      const checkId = crypto.randomUUID();
      remember(checkId, await capture(windowId));
      return { checkId };
    }
    case "CHECK": {
      const cap = captures.get(msg.checkId);
      if (!cap) throw new Error("The screenshot expired. Try again.");
      const checkId = msg.checkId;
      const image = await encodeRegion(cap.bmp);
      const result = await api<CheckResult>("/api/check", { body: { action: "check", image, mediaType: "image/jpeg", host: msg.host } });
      return { ...result, checkId } satisfies CheckResponse;
    }
    case "REFINE": {
      const cap = captures.get(msg.checkId);
      if (!cap) return { mark: msg.mark };
      const crop = await encodeRegion(cap.bmp, refineWindow(msg.mark), 1000);
      return api<{ mark: Mark }>("/api/check", { body: { action: "refine", mark: msg.mark, crop, mediaType: "image/jpeg" } });
    }
    case "PRACTICE":
      return api("/api/practice", { body: msg.body });
    case "CONTEXT": {
      const ctx = await api<{ settings: Settings }>("/api/context");
      await settingsCache.setValue(ctx.settings);
      return ctx;
    }
    case "EVENTS":
      return api("/api/events", { body: { events: msg.events } });
    case "SETTINGS": {
      const s = await api<Settings>("/api/settings", { body: msg.patch });
      await settingsCache.setValue(s);
      return s;
    }
    case "SYNC_CANVAS": {
      if (!(await apiKey.getValue())) return { skipped: "not_paired" };
      const snap = await syncCanvas(msg.origin, msg.force);
      return snap ? { courses: snap.courses.length, assignments: snap.assignments.length, materials: snap.materials.length } : { skipped: "recent" };
    }
    case "CLASSROOM_CAPTURE": {
      if (!(await apiKey.getValue())) return { skipped: "not_paired" };
      if (!msg.courses.length && !msg.assignments.length) return { skipped: "empty" };
      return api("/api/ingest", { body: { source: "classroom", host: "classroom.google.com", courses: msg.courses, assignments: msg.assignments, materials: [] } });
    }
  }
}

async function refreshSettings() {
  try {
    await settingsCache.setValue(await api<Settings>("/api/settings", { body: {} }));
  } catch {
    /* keep the cached copy */
  }
}

/** Streamed explanations: the content script opens a port, we relay NDJSON lines from the API. */
function handleExplainPort(port: Browser.runtime.Port) {
  const controller = new AbortController();
  port.onDisconnect.addListener(() => controller.abort());
  port.onMessage.addListener(async (start: ExplainStart) => {
    try {
      let image: { data: string; mediaType: "image/jpeg" } | undefined;
      if (start.withScreenshot && port.sender?.tab?.windowId !== undefined) {
        const bmp = await capture(port.sender.tab.windowId);
        port.postMessage({ type: "captured" }); // the overlay can reappear now
        image = { data: await encodeRegion(bmp), mediaType: "image/jpeg" };
      }
      const res = await rawApi("/api/explain", { body: { question: start.question, history: start.history, page: start.page, image } });
      if (!res.ok || !res.body) throw new Error(res.status === 401 ? "Not paired. Open the StudyLens popup." : `Explain failed (${res.status})`);
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += value;
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (line) port.postMessage(JSON.parse(line));
        }
      }
    } catch (e) {
      if (!controller.signal.aborted) port.postMessage({ type: "error", message: (e as Error).message });
    } finally {
      try {
        port.disconnect();
      } catch {
        /* already closed */
      }
    }
  });
}

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((msg: Request, sender, sendResponse) => {
    handle(msg, sender).then(
      (data) => sendResponse({ ok: true, data } satisfies Reply),
      (e: Error) => sendResponse({ ok: false, error: e.message || String(e) } satisfies Reply),
    );
    return true; // async response
  });

  browser.runtime.onConnect.addListener((port) => {
    if (port.name === "explain") handleExplainPort(port);
  });

  browser.commands.onCommand.addListener(async (command) => {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (tab?.id !== undefined) browser.tabs.sendMessage(tab.id, { type: "COMMAND", command }).catch(() => {});
  });

  browser.runtime.onInstalled.addListener(() => refreshSettings());
});
