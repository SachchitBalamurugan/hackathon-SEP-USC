import type { Mark } from "@studylens/core";

// Marks are found in a screenshot of the viewport, but pages scroll, and on Kami or a PDF
// viewer it is an inner container that scrolls, not the window. At capture time each mark
// remembers the scroll container under it and that container's offsets; on scroll the mark
// moves by however far that container has moved since.

export type Anchor = { el: Element | null; left: number; top: number };

function scrollParent(el: Element | null): Element | null {
  for (let cur = el; cur && cur !== document.documentElement; cur = cur.parentElement) {
    const s = getComputedStyle(cur);
    if (/(auto|scroll|overlay)/.test(s.overflowY + s.overflowX) && (cur.scrollHeight > cur.clientHeight + 1 || cur.scrollWidth > cur.clientWidth + 1)) return cur;
  }
  return null; // the window
}

const offset = (el: Element | null) => (el ? { left: el.scrollLeft, top: el.scrollTop } : { left: window.scrollX, top: window.scrollY });

/** Call while the overlay is hidden, so elementFromPoint sees the page. */
export function anchorMarks(marks: Mark[]): Anchor[] {
  return marks.map((m) => {
    const hit = document.elementFromPoint(m.nx * window.innerWidth, m.ny * window.innerHeight);
    const el = scrollParent(hit);
    return { el, ...offset(el) };
  });
}

/** Pixels the mark has moved since capture, as [dx, dy]. */
export function drift(a: Anchor): [number, number] {
  const now = offset(a.el);
  return [a.left - now.left, a.top - now.top];
}
