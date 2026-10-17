import { isSensitiveHost, type LearnerEvent } from "@studylens/core";

// Opt-in behaviour signals. What this records: time active vs idle, how far down the page,
// how often the student switched away, pen strokes on drawing surfaces, and bursts of
// deleting/undoing. What it never records: which keys were typed, any text, field values,
// URLs beyond the hostname, or anything on sensitive sites (see isSensitiveHost).

const IDLE_AFTER = 30_000;
const FLUSH_EVERY = 5 * 60_000;
const BURST_WINDOW = 20_000;
const BURST_MIN = 8;

export type Tracker = { stop(): void; flush(): void };

export function canTrack(host: string, settings: { tracking_enabled: boolean; paused_hosts: string[] }) {
  return settings.tracking_enabled && !settings.paused_hosts.includes(host) && !isSensitiveHost(host);
}

export function startTracker(host: string, emit: (e: LearnerEvent) => void, onStroke?: () => void): Tracker {
  let activeMs = 0;
  let idleMs = 0;
  let scrollDepth = 0;
  let tabAways = 0;
  let strokes = 0;
  let lastInput = Date.now();
  let lastTick = Date.now();
  let lastFlush = Date.now();
  let deletions: number[] = [];
  let lastBurst = 0;

  const isDrawingSurface = (t: EventTarget | null) => t instanceof Element && Boolean(t.closest("canvas, svg, [class*='annotation' i], [class*='kami' i]"));

  const onInput = () => (lastInput = Date.now());
  const onScroll = () => {
    onInput();
    const doc = document.documentElement;
    const depth = (window.scrollY + window.innerHeight) / Math.max(doc.scrollHeight, 1);
    scrollDepth = Math.max(scrollDepth, Math.min(1, depth));
  };
  const onPointerDown = (e: PointerEvent) => {
    onInput();
    if (isDrawingSurface(e.target)) {
      strokes++;
      onStroke?.();
    }
  };
  const onKey = (e: KeyboardEvent) => {
    onInput();
    // Only the fact of a deletion or undo is counted, never which text was affected.
    const del = e.key === "Backspace" || e.key === "Delete" || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z");
    if (!del) return;
    const now = Date.now();
    deletions = deletions.filter((t) => now - t < BURST_WINDOW);
    deletions.push(now);
    if (deletions.length >= BURST_MIN && now - lastBurst > 60_000) {
      lastBurst = now;
      emit({ source: "usage", kind: "rewrite_burst", payload: { host, count: deletions.length } });
      deletions = [];
    }
  };
  const onVisibility = () => {
    if (document.visibilityState === "hidden") {
      tabAways++;
      flush();
    }
  };

  const tick = setInterval(() => {
    const now = Date.now();
    const dt = now - lastTick;
    lastTick = now;
    if (document.visibilityState !== "visible") return;
    if (now - lastInput < IDLE_AFTER && document.hasFocus()) activeMs += dt;
    else idleMs += dt;
    if (now - lastFlush > FLUSH_EVERY) flush();
  }, 1000);

  function flush() {
    lastFlush = Date.now();
    if (activeMs < 10_000) return;
    emit({ source: "usage", kind: "focus_session", payload: { host, activeMs, idleMs, scrollDepth: Math.round(scrollDepth * 100) / 100, tabAways, strokes } });
    activeMs = idleMs = tabAways = strokes = 0;
  }

  const opts = { capture: true, passive: true } as const;
  window.addEventListener("scroll", onScroll, opts);
  window.addEventListener("pointerdown", onPointerDown, opts);
  window.addEventListener("keydown", onKey, opts);
  window.addEventListener("mousemove", onInput, opts);
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", flush);

  return {
    flush,
    stop() {
      flush();
      clearInterval(tick);
      window.removeEventListener("scroll", onScroll, opts);
      window.removeEventListener("pointerdown", onPointerDown, opts);
      window.removeEventListener("keydown", onKey, opts);
      window.removeEventListener("mousemove", onInput, opts);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
    },
  };
}

/** Batches events and sends them every 30s (and on page hide). */
export function eventQueue(send: (events: LearnerEvent[]) => Promise<unknown>) {
  let buf: LearnerEvent[] = [];
  const flush = () => {
    if (!buf.length) return;
    const batch = buf.splice(0, 200).map((e) => ({ ...e, at: e.at ?? new Date().toISOString() }));
    send(batch).catch(() => {
      /* dropped; signals are best-effort */
    });
  };
  const timer = setInterval(flush, 30_000);
  window.addEventListener("pagehide", flush);
  return {
    push(e: LearnerEvent) {
      buf.push({ ...e, at: new Date().toISOString() });
      if (buf.length >= 50) flush();
    },
    flush,
    stop() {
      clearInterval(timer);
      flush();
    },
  };
}
