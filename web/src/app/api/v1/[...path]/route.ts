import { DEMO_ASSIGNMENTS, DEMO_COURSES, DEMO_PAGES } from "@/lib/demoCanvas";

// A tiny fake Canvas REST API so the course-sync demo can be recorded without a real school
// account. Only answers when DEMO_MODE=1 (set locally for recording, never in production).

export async function GET(_req: Request, ctx: RouteContext<"/api/v1/[...path]">) {
  if (process.env.DEMO_MODE !== "1") return Response.json({ error: "not found" }, { status: 404 });
  const p = (await ctx.params).path;

  if (p.length === 1 && p[0] === "courses") {
    return Response.json(
      DEMO_COURSES.map((c) => ({
        id: c.id,
        name: c.name,
        course_code: c.course_code,
        enrollments: [{ type: "student", computed_current_score: c.score }],
      })),
    );
  }
  const courseId = Number(p[1]);
  if (p[0] === "courses" && p[2] === "assignments") {
    return Response.json(
      (DEMO_ASSIGNMENTS[courseId] ?? []).map((a) => ({
        id: a.id,
        name: a.name,
        due_at: a.due,
        points_possible: a.points,
        html_url: `/demo/canvas?assignment=${a.id}`,
        description: null,
        submission: { score: a.score ?? null, submitted_at: a.submitted ? a.due : null, missing: a.missing ?? false },
      })),
    );
  }
  if (p[0] === "courses" && p[2] === "pages" && p.length === 3) {
    return Response.json((DEMO_PAGES[courseId] ?? []).map((pg, i) => ({ page_id: i + 1, url: pg.url, title: pg.title })));
  }
  if (p[0] === "courses" && p[2] === "pages" && p.length === 4) {
    const page = (DEMO_PAGES[courseId] ?? []).find((pg) => pg.url === p[3]);
    return page ? Response.json({ url: page.url, title: page.title, body: page.body }) : Response.json({ error: "not found" }, { status: 404 });
  }
  return Response.json([]);
}
