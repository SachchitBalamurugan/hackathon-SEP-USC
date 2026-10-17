import { mapCanvasAssignment, mapCanvasCourse, nextLink, stripHtml, isPrivateTarget, type LmsMaterial, type LmsSnapshot } from "@studylens/core";
import { api } from "./api";
import { syncTimes } from "./config";

// Canvas sync through the student's own session, after FschoolAI's enumCanvasSW: the worker's
// host permission lets fetch() carry the Canvas cookies, so no Canvas token is ever needed.

const RESYNC_MS = 6 * 60 * 60 * 1000;
const MAX_COURSES = 20;
const MAX_PAGES_PER_COURSE = 8;

/** Canvas prefixes JSON with "while(1);" as a JSON-hijacking guard on some routes. */
async function canvasJson(url: string): Promise<{ data: any; next: string | null }> {
  const res = await fetch(url, { credentials: "include", headers: { accept: "application/json" } });
  if (res.status === 401 || res.status === 403) throw new Error("canvas_signed_out");
  if (!res.ok) throw new Error(`canvas ${res.status}`);
  const text = (await res.text()).replace(/^while\(1\);/, "");
  return { data: JSON.parse(text), next: nextLink(res.headers.get("link")) };
}

async function canvasAll(url: string, cap = 500): Promise<any[]> {
  const out: any[] = [];
  let next: string | null = url;
  while (next && out.length < cap) {
    if (isPrivateTarget(next)) break;
    const page: { data: any; next: string | null } = await canvasJson(next);
    if (!Array.isArray(page.data)) break;
    out.push(...page.data);
    next = page.next;
  }
  return out;
}

const MAX_MATERIAL_CHARS = 60_000;

/** Group items so each group's JSON stays under maxBytes (and the API's 60-item cap). */
function bySize<T>(items: T[], maxBytes: number): T[][] {
  const out: T[][] = [];
  let cur: T[] = [];
  let size = 0;
  for (const it of items) {
    const n = JSON.stringify(it).length;
    if (cur.length && (size + n > maxBytes || cur.length >= 60)) {
      out.push(cur);
      cur = [];
      size = 0;
    }
    cur.push(it);
    size += n;
  }
  if (cur.length) out.push(cur);
  return out;
}

let running: string | null = null;

export async function syncCanvas(origin: string, force = false): Promise<LmsSnapshot | null> {
  const url = new URL(origin);
  if (url.protocol !== "https:" && url.hostname !== "localhost") return null;
  const host = url.host;
  const times = await syncTimes.getValue();
  if (!force && Date.now() - (times[host] ?? 0) < RESYNC_MS) return null;
  if (running === host) return null;
  running = host;
  try {
    const base = `${url.origin}/api/v1`;
    const raw = await canvasAll(`${base}/courses?enrollment_state=active&include[]=total_scores&include[]=syllabus_body&per_page=50`, 100);
    const courses = raw.filter((c) => c && c.id && !c.access_restricted_by_date).slice(0, MAX_COURSES);
    const snapshot: LmsSnapshot = { source: "canvas", host, courses: courses.map((c) => mapCanvasCourse(c, host)), assignments: [], materials: [] };

    for (const c of courses) {
      const course = mapCanvasCourse(c, host);
      try {
        const assignments = await canvasAll(`${base}/courses/${c.id}/assignments?include[]=submission&order_by=due_at&per_page=100`, 400);
        snapshot.assignments.push(...assignments.map((a) => mapCanvasAssignment(course.externalId, a)));
      } catch (e) {
        if (String(e).includes("signed_out")) throw e;
      }
      if (c.syllabus_body) {
        snapshot.materials.push({ courseExternalId: course.externalId, externalId: `${course.externalId}:syllabus`, title: `${course.name} syllabus`, kind: "syllabus", text: stripHtml(c.syllabus_body), url: `${course.url}/assignments/syllabus` });
      }
      snapshot.materials.push(...(await coursePages(base, c.id, course.externalId, course.url)));
    }

    // Courses and assignments first, then materials in batches under Vercel's ~4.5MB body limit.
    await api("/api/ingest", { body: { ...snapshot, materials: [] } });
    for (const batch of bySize(snapshot.materials.map((m) => ({ ...m, text: m.text.slice(0, MAX_MATERIAL_CHARS) })), 2_500_000)) {
      await api("/api/ingest", { body: { source: "canvas", host, courses: [], assignments: [], materials: batch } });
    }
    await syncTimes.setValue({ ...(await syncTimes.getValue()), [host]: Date.now() });
    return snapshot;
  } finally {
    running = null;
  }
}

async function coursePages(base: string, courseId: number, courseExternalId: string, courseUrl: string | null): Promise<LmsMaterial[]> {
  try {
    const pages = await canvasAll(`${base}/courses/${courseId}/pages?sort=updated_at&order=desc&per_page=${MAX_PAGES_PER_COURSE}`, MAX_PAGES_PER_COURSE);
    const out: LmsMaterial[] = [];
    for (const p of pages.slice(0, MAX_PAGES_PER_COURSE)) {
      const { data } = await canvasJson(`${base}/courses/${courseId}/pages/${encodeURIComponent(p.url)}`);
      if (data?.body) out.push({ courseExternalId, externalId: `${courseExternalId}:page:${p.page_id ?? p.url}`, title: p.title || "Page", kind: "page", text: stripHtml(data.body), url: courseUrl ? `${courseUrl}/pages/${p.url}` : null });
    }
    return out;
  } catch {
    return []; // pages are often disabled for students; not an error
  }
}
