import "./style.css";
import ReactDOM from "react-dom/client";
import { collectClassroom, isCanvasHost, isSensitiveHost, type LmsAssignment, type LmsCourse } from "@studylens/core";
import { App } from "@/components/App";
import { send } from "@/lib/messages";
import { settingsCache, type Settings } from "@/lib/config";
import { canTrack, eventQueue, startTracker, type Tracker } from "@/lib/tracker";

const AUTO_CHECK_QUIET_MS = 8000;
const AUTO_CHECK_MIN_GAP_MS = 45_000;

export default defineContentScript({
  matches: ["<all_urls>"],
  cssInjectionMode: "ui",
  runAt: "document_idle",
  async main(ctx) {
    if (window !== window.top) return;
    const host = location.hostname;
    // Nothing at all runs on email, banking, health or password-manager sites.
    if (!host || isSensitiveHost(host)) return;

    if (isCanvasHost(host, document)) send({ type: "SYNC_CANVAS", origin: location.origin }).catch(() => {});
    if (host === "classroom.google.com") watchClassroom();

    // ── Behaviour signals (opt-in) ──────────────────────────────────────────────────────
    const queue = eventQueue((events) => send({ type: "EVENTS", events }));
    let tracker: Tracker | null = null;
    let settings: Settings = await settingsCache.getValue();
    let rerender: () => void = () => {};
    const applySettings = (s: Settings) => {
      settings = s;
      const want = canTrack(host, s);
      if (want && !tracker) tracker = startTracker(host, (e) => queue.push(e));
      if (!want && tracker) {
        tracker.stop();
        tracker = null;
      }
      rerender();
    };
    applySettings(settings);
    settingsCache.watch((s) => applySettings(s));

    // ── Auto-check: after a pause in pen/pointer activity on sites the student opted in ──
    let autoCheck: (() => void) | null = null;
    let quietTimer: ReturnType<typeof setTimeout> | undefined;
    let lastAuto = 0;
    window.addEventListener(
      "pointerup",
      (e) => {
        if (!settings.auto_check_hosts.includes(host)) return;
        if (!(e.target instanceof Element) || !e.target.closest("canvas, svg, [contenteditable], textarea")) return;
        clearTimeout(quietTimer);
        quietTimer = setTimeout(() => {
          if (Date.now() - lastAuto < AUTO_CHECK_MIN_GAP_MS || !autoCheck) return;
          lastAuto = Date.now();
          autoCheck();
        }, AUTO_CHECK_QUIET_MS);
      },
      { capture: true, passive: true },
    );

    // ── Overlay ─────────────────────────────────────────────────────────────────────────
    const ui = await createShadowRootUi(ctx, {
      name: "studylens-overlay",
      position: "inline",
      anchor: "body",
      append: "last",
      onMount(container, _shadow, shadowHost) {
        // Full-viewport, click-through host; only the dock, panel and marks take pointer events.
        Object.assign(shadowHost.style, { position: "fixed", inset: "0", zIndex: "2147483647", pointerEvents: "none" });
        const setHidden = (h: boolean) => (shadowHost.style.visibility = h ? "hidden" : "visible");
        const root = ReactDOM.createRoot(container);
        const render = () =>
          root.render(<App setHidden={setHidden} emit={(e) => queue.push(e)} trackingActive={Boolean(tracker)} registerAutoCheck={(fn) => (autoCheck = fn)} />);
        rerender = render;
        render();
        return root;
      },
      onRemove(root) {
        root?.unmount();
        tracker?.stop();
        queue.stop();
      },
    });
    ui.mount();
  },
});

/** Google Classroom renders lazily; re-collect as the DOM changes and send only what's new. */
function watchClassroom() {
  const sentCourses = new Set<string>();
  const sentItems = new Set<string>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const run = () => {
    const { courses, assignments } = collectClassroom(document, location);
    const newCourses: LmsCourse[] = courses.filter((c) => !sentCourses.has(c.externalId));
    const newItems: LmsAssignment[] = assignments.filter((a) => !sentItems.has(a.externalId));
    if (!newCourses.length && !newItems.length) return;
    newCourses.forEach((c) => sentCourses.add(c.externalId));
    newItems.forEach((a) => sentItems.add(a.externalId));
    send({ type: "CLASSROOM_CAPTURE", courses: newCourses, assignments: newItems }).catch(() => {});
  };
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(run, 1500);
  };
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  // Classroom is a single-page app; also catch in-app navigation.
  window.addEventListener("popstate", schedule);
  schedule();
}
