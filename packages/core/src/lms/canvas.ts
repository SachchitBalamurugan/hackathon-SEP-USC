// Raw Canvas REST objects onto StudyLens course/assignment records. Canvas sends numbers, numeric
// strings, null and prose like "n/a" in the same field, and repeats an enrollment per section.

import type { LmsAssignment, LmsCourse } from "./types";

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Vercel rejects request bodies over ~4.5MB; one enormous HTML description must not fail a sync. */
export const MAX_DESCRIPTION_CHARS = 10_000;

export function mapCanvasCourse(c: any, host: string): LmsCourse {
  const enrollments: any[] = Array.isArray(c?.enrollments) ? c.enrollments : [];
  const scored = enrollments.find(
    (e) => e && (e.computed_current_score !== undefined || e.computed_final_score !== undefined),
  );
  return {
    source: "canvas",
    externalId: `canvas:${host}:${c?.id}`,
    name: c?.name || c?.course_code || String(c?.id),
    code: c?.course_code || null,
    currentScore: num(scored?.computed_current_score),
    url: `https://${host}/courses/${c?.id}`,
  };
}

export function mapCanvasAssignment(courseExternalId: string, a: any): LmsAssignment {
  const sub = a?.submission && typeof a.submission === "object" ? a.submission : null;
  const description = typeof a?.description === "string" && a.description ? stripHtml(a.description).slice(0, MAX_DESCRIPTION_CHARS) : null;
  const host = courseExternalId.split(":")[1] ?? "canvas";
  return {
    courseExternalId,
    externalId: `canvas:${host}:a${a?.id}`,
    title: a?.name || "Untitled",
    description,
    dueAt: a?.due_at || null,
    pointsPossible: num(a?.points_possible),
    score: num(sub?.score),
    submittedAt: sub?.submitted_at || null,
    missing: sub?.missing === true,
    url: a?.html_url || null,
  };
}

/** Assignment descriptions are HTML; the tutor wants text. Good enough for prompts, not for display. */
export function stripHtml(html: string): string {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Parse a Canvas `Link` header and return the rel="next" URL, if any. */
export function nextLink(linkHeader: string | null): string | null {
  if (!linkHeader) return null;
  for (const part of linkHeader.split(",")) {
    const m = part.match(/<([^>]+)>\s*;\s*rel="next"/);
    if (m) return m[1];
  }
  return null;
}

export function isCanvasHost(host: string, doc?: { querySelector(s: string): unknown }): boolean {
  if (/(^|\.)instructure\.com$/i.test(host)) return true;
  if (/(^|\.)canvas\./i.test(host) || /^canvas\./i.test(host)) return true;
  return Boolean(doc?.querySelector(".ic-app, #application.ic-app"));
}
