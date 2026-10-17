// Google Classroom, scraped from the DOM the student's own session renders. Ported from FschoolAI
// chrome-extension/content.js (collectClassroom) and background.js (decodeClassroomId,
// parseClassroomDue). Selectors use href routes, aria-labels and text only, never CSS classes,
// because Classroom's class names are generated and change between deploys.

import type { LmsAssignment, LmsCourse } from "./types";

const CR_B64 = "[A-Za-z0-9_=-]{8,}";
export const CR_COURSE_LINK_RE = new RegExp(`^/(?:u/\\d+/)?[cw]/(${CR_B64})$`);
export const CR_ITEM_LINK_RE = new RegExp(`^/(?:u/\\d+/)?c/(${CR_B64})/(a|m|sa|mc|qa)/(${CR_B64})(?:/details)?$`);
const GENERIC_LABEL_RE = /^(stream|classwork|people|grades|to-?do|open)$/i;

/** Classroom web ids are base64 of the numeric API id; decode to the same gc_<id> key the API uses. */
export function decodeClassroomId(webId: string): string {
  const s = String(webId || "").replace(/-/g, "+").replace(/_/g, "/").replace(/=+$/, "");
  try {
    const digits = atob(s + "=".repeat((4 - (s.length % 4)) % 4));
    if (/^\d{6,20}$/.test(digits)) return "gc_" + digits;
  } catch {
    /* not base64 */
  }
  return "gcw_" + String(webId).replace(/[^\w-]/g, "").slice(0, 48);
}

const MONTHS: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

/** English-locale "Due Mar 14, 11:59 PM". Unparseable text yields null rather than a wrong date. */
export function parseClassroomDue(dueText: string | null | undefined, now = new Date()): string | null {
  if (!dueText) return null;
  const s = String(dueText);
  const time = s.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
  let hours = 23;
  let minutes = 59;
  if (time) {
    const h = parseInt(time[1], 10);
    const ap = (time[3] || "").toLowerCase();
    hours = ap === "pm" ? (h % 12) + 12 : ap === "am" ? h % 12 : h;
    minutes = parseInt(time[2], 10);
  }
  if (/\btoday\b/i.test(s)) return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes).toISOString();
  if (/\btomorrow\b/i.test(s)) return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, hours, minutes).toISOString();
  const m = s.match(/([A-Za-z]{3,9})\s+(\d{1,2})(?:,\s*(\d{4}))?/);
  if (!m) return null;
  const mon = MONTHS[m[1].slice(0, 3).toLowerCase()];
  if (mon === undefined) return null;
  // Classroom omits the year only within the current calendar year, so never bump it.
  const year = m[3] ? parseInt(m[3], 10) : now.getFullYear();
  return new Date(year, mon, parseInt(m[2], 10), hours, minutes).toISOString();
}

type Doc = Pick<Document, "querySelectorAll" | "querySelector" | "title"> & { body: { innerText?: string } | null };

const label = (el: Element) => (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\s+/g, " ");

function pageCourseWebId(pathname: string): string | null {
  const m = pathname.match(new RegExp(`/(?:c|w)/(${CR_B64})`));
  return m ? m[1] : null;
}

function pageCourseName(doc: Doc): string | null {
  const h = doc.querySelector('[role="heading"][aria-level="1"], h1');
  let name = h ? (h.textContent || "").trim().replace(/\s+/g, " ") : "";
  if (!name)
    name = doc.title
      .replace(/\s*[-–]\s*Google Classroom.*$/i, "")
      .replace(/\s*[-–]\s*(Classwork|Stream|People|Grades|To-?do)\s*$/i, "")
      .trim();
  return name && name.length >= 2 && !GENERIC_LABEL_RE.test(name) ? name.slice(0, 200) : null;
}

/** Collect every course and gradable item visible on the current Classroom page. */
export function collectClassroom(doc: Doc, location: { href: string; pathname: string; hostname: string }, now = new Date()) {
  const courses = new Map<string, LmsCourse>();
  const assignments = new Map<string, LmsAssignment>();
  const pageCid = pageCourseWebId(location.pathname);

  const addCourse = (webId: string, name: string) => {
    const id = decodeClassroomId(webId);
    if (!courses.has(id))
      courses.set(id, { source: "classroom", externalId: id, name, code: null, currentScore: null, url: `https://classroom.google.com/c/${webId}` });
  };
  const addItem = (courseWebId: string, kind: string, itemId: string, title: string, dueText: string | null, url: string | null) => {
    if (kind === "m" || kind === "mc") return; // materials are not gradable work
    const externalId = /^\d+$/.test(itemId) ? "gc_" + itemId : decodeClassroomId(itemId);
    if (assignments.has(externalId)) return;
    assignments.set(externalId, {
      courseExternalId: decodeClassroomId(courseWebId),
      externalId,
      title: title || "Untitled",
      description: null,
      dueAt: parseClassroomDue(dueText, now),
      pointsPossible: null,
      score: null,
      submittedAt: null,
      missing: /\bmissing\b/i.test(dueText || ""),
      url,
    });
  };

  const self = location.pathname.match(CR_ITEM_LINK_RE);
  if (self) {
    const title = doc.title.replace(/\s*[-–]\s*Google Classroom.*$/i, "").trim();
    const due = (doc.body?.innerText || "").match(/\bdue\b[^\n]{0,60}/i);
    addItem(self[1], self[2], self[3], title, due ? due[0] : null, location.href);
  }

  for (const a of Array.from(doc.querySelectorAll("a[href]"))) {
    let u: URL;
    try {
      u = new URL((a as HTMLAnchorElement).href, location.href);
    } catch {
      continue;
    }
    if (u.hostname !== location.hostname) continue;
    let m = u.pathname.match(CR_COURSE_LINK_RE);
    if (m) {
      const name = label(a);
      if (name.length >= 2 && !GENERIC_LABEL_RE.test(name)) addCourse(m[1], name.slice(0, 200));
      continue;
    }
    m = u.pathname.match(CR_ITEM_LINK_RE);
    if (m) {
      let dueText: string | null = null;
      let el: Element | null = a;
      for (let i = 0; i < 4 && el; i++, el = el.parentElement) {
        const t = ((el as HTMLElement).innerText || el.textContent || "").match(/\bdue\b[^\n]{0,60}/i);
        if (t) {
          dueText = t[0].slice(0, 80);
          break;
        }
      }
      addItem(m[1], m[2], m[3], label(a).slice(0, 300), dueText, u.href);
    }
  }

  // Classwork list rows are expandable <li>s with the numeric id in data attributes, not links.
  if (pageCid) {
    for (const row of Array.from(doc.querySelectorAll("[data-stream-item-id]"))) {
      const sid = row.getAttribute("data-stream-item-id") || "";
      if (!/^\d{6,20}$/.test(sid)) continue;
      const type = row.getAttribute("data-stream-item-type");
      const txt = ((row as HTMLElement).innerText || row.textContent || "").replace(/\s+/g, " ").trim();
      const noDue = /\bno\s+due\s+date\b/i.test(txt);
      const dueM = noDue ? null : txt.match(/\bdue\b[^]*?(?=\s+more_vert|$)/i);
      const title =
        txt
          .replace(/^(completed\s+|turned in\s+|assigned\s+|missing\s+|done\s+late\s+)?(assignment|material|question|quiz)\s+\S+\s+/i, "")
          .replace(/\s+no\s+due\s+date\b.*$/i, "")
          .replace(/\s+(due|posted|edited|assigned)\b.*$/i, "")
          .replace(/\s*more_vert.*$/i, "")
          .trim() || "Untitled";
      addItem(pageCid, type === "5" ? "m" : "a", sid, title.slice(0, 300), dueM ? dueM[0].slice(0, 80) : null, null);
    }
    const name = pageCourseName(doc);
    if (name) addCourse(pageCid, name);
  }

  return { courses: [...courses.values()], assignments: [...assignments.values()] };
}
