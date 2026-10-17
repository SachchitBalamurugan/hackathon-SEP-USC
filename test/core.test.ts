import { describe, expect, it } from "vitest";
import {
  FenceSplitter,
  splitReply,
  sm2,
  isDue,
  GRADE,
  gradeFromScore,
  computeMastery,
  decayWeight,
  HALF_LIFE_DAYS,
  skillKey,
  validateDrawOps,
  clampMarks,
  refineWindow,
  fromWindow,
  markToViewportRect,
  mapCanvasCourse,
  mapCanvasAssignment,
  nextLink,
  stripHtml,
  decodeClassroomId,
  parseClassroomDue,
  diffAssignments,
  isPrivateTarget,
  isSameSite,
  isSensitiveHost,
  chunkText,
  sanitizePayload,
  type Mark,
  type LmsAssignment,
} from "@studylens/core";

const DAY = 86_400_000;

describe("FenceSplitter", () => {
  it("passes prose through and emits a whole fence", () => {
    const ev = splitReply('Here is how.\n```draw\n[{"type":"text","text":"hi","nx":0.5,"ny":0.5}]\n```\nDone.');
    expect(ev).toEqual([
      { kind: "text", text: "Here is how.\n" },
      { kind: "fence", name: "draw", body: '[{"type":"text","text":"hi","nx":0.5,"ny":0.5}]' },
      { kind: "text", text: "Done." },
    ]);
  });

  it("never leaks a partial opener across any token boundary", () => {
    const full = 'A```draw\n[1]\n```B';
    for (let cut = 1; cut < full.length; cut++) {
      const s = new FenceSplitter();
      const events = [...s.push(full.slice(0, cut)), ...s.push(full.slice(cut)), ...s.end()];
      const text = events.filter((e) => e.kind === "text").map((e) => (e as { text: string }).text).join("");
      expect(text).toBe("AB");
      expect(events.filter((e) => e.kind === "fence")).toHaveLength(1);
    }
  });

  it("streams one character at a time", () => {
    const full = "x ```draw  \n[2]\n``` y";
    const s = new FenceSplitter();
    const events = [...full].flatMap((c) => s.push(c)).concat(s.end());
    expect(events.filter((e) => e.kind === "fence")).toEqual([{ kind: "fence", name: "draw", body: "[2]" }]);
    expect(events.filter((e) => e.kind === "text").map((e) => (e as { text: string }).text).join("")).toBe("x  y");
  });

  it("leaves unrelated code fences as prose", () => {
    expect(splitReply("```js\nlet a = 1\n```")).toEqual([{ kind: "text", text: "```js\nlet a = 1\n```" }]);
  });

  it("drops an unterminated fence at end of stream", () => {
    const s = new FenceSplitter();
    const events = [...s.push("ok ```draw\n[{"), ...s.end()];
    expect(events).toEqual([{ kind: "text", text: "ok " }]);
  });
});

describe("sm2", () => {
  const now = Date.UTC(2026, 0, 1);
  it("schedules 1, 6, then ease-multiplied intervals", () => {
    let s = sm2(null, GRADE.good, now);
    expect(s.interval).toBe(1);
    s = sm2(s, GRADE.good, now);
    expect(s.interval).toBe(6);
    s = sm2(s, GRADE.good, now);
    expect(s.interval).toBe(Math.round(6 * s.ease));
  });
  it("resets on a lapse and never drops ease below 1.3", () => {
    let s = sm2({ ease: 1.35, interval: 20, reps: 5, lapses: 0 }, GRADE.again, now);
    expect(s).toMatchObject({ interval: 1, reps: 0, lapses: 1, ease: 1.3 });
    s = sm2(s, 0, now);
    expect(s.ease).toBe(1.3);
  });
  it("treats unseen cards as due", () => {
    expect(isDue(null)).toBe(true);
    expect(isDue({ dueAt: new Date(now + DAY).toISOString() }, now)).toBe(false);
  });
  it("maps grader scores to grades", () => {
    expect(gradeFromScore(1)).toBe(GRADE.easy);
    expect(gradeFromScore(0.8)).toBe(GRADE.good);
    expect(gradeFromScore(0.6)).toBe(GRADE.hard);
    expect(gradeFromScore(0.1)).toBe(GRADE.again);
  });
});

describe("mastery", () => {
  const now = Date.UTC(2026, 5, 1);
  it("halves evidence weight every half-life", () => {
    expect(decayWeight(now - HALF_LIFE_DAYS * DAY, now)).toBeCloseTo(0.5, 5);
    expect(decayWeight(now, now)).toBe(1);
  });
  it("starts unknown at 0.5 and verifies after fresh correct demonstrations", () => {
    expect(computeMastery([], now)).toMatchObject({ level: 0.5, status: "unknown" });
    const fresh = Array.from({ length: 5 }, () => ({ correct: true, at: now }));
    expect(computeMastery(fresh, now).status).toBe("verified");
  });
  it("lets an old streak fade and flags recent failure", () => {
    const old = Array.from({ length: 6 }, () => ({ correct: true, at: now - 90 * DAY }));
    const recentFails = Array.from({ length: 3 }, () => ({ correct: false, at: now }));
    const m = computeMastery([...old, ...recentFails], now);
    expect(m.level).toBeLessThan(0.4);
    expect(m.status).toBe("shaky");
  });
  it("normalises skill names", () => {
    expect(skillKey(" Chain-Rule ")).toBe(skillKey("chain rule"));
  });
});

describe("draw ops", () => {
  it("keeps valid ops and drops invalid ones individually", () => {
    const { ops, rejected } = validateDrawOps([
      { type: "steps", steps: [{ latex: "x=2" }] },
      { type: "text", text: "", nx: 0.5, ny: 0.5 },
      { type: "arrow", nx: 0, ny: 0, nx2: 2, ny2: 1 },
      { type: "graph", curves: [{ expr: "x^2" }] },
    ]);
    expect(ops.map((o) => o.type)).toEqual(["steps", "graph"]);
    expect(rejected).toBe(2);
  });
  it("rejects non-arrays and caps the count", () => {
    expect(validateDrawOps({}).ops).toEqual([]);
    const many = Array.from({ length: 40 }, () => ({ type: "steps", steps: [{ text: "a" }] }));
    expect(validateDrawOps(many).ops).toHaveLength(24);
  });
});

describe("marks", () => {
  const base: Mark = { kind: "error", note: "n", nx: 0.5, ny: 0.5, w: 0.1, h: 0.05, shape: "circle", skill: "s", misconception: "" };
  it("clamps coordinates and limits correct marks", () => {
    const out = clampMarks([
      { ...base, nx: 3, ny: -1 },
      { ...base, kind: "correct" },
      { ...base, kind: "correct" },
      { ...base, kind: "correct" },
    ]);
    expect(out[0]).toMatchObject({ nx: 1, ny: 0 });
    expect(out.filter((m) => m.kind === "correct")).toHaveLength(2);
  });
  it("round-trips a region through the refine window", () => {
    const win = refineWindow(base);
    const found = fromWindow(win, { nx: 0.5, ny: 0.5, w: 0.2, h: 0.2 });
    expect(found.nx).toBeCloseTo((win.x0 + win.x1) / 2, 5);
    expect(found.ny).toBeCloseTo((win.y0 + win.y1) / 2, 5);
  });
  it("maps to viewport pixels around the centre", () => {
    expect(markToViewportRect({ nx: 0.5, ny: 0.5, w: 0.1, h: 0.1 }, { width: 1000, height: 800 })).toEqual({ left: 450, top: 360, width: 100, height: 80 });
  });
});

describe("canvas mapping", () => {
  it("takes the scored enrollment and nulls non-numeric values", () => {
    const c = mapCanvasCourse({ id: 7, name: "Calc", enrollments: [{ type: "ta" }, { computed_current_score: "91.5" }] }, "u.instructure.com");
    expect(c).toMatchObject({ externalId: "canvas:u.instructure.com:7", currentScore: 91.5 });
    const a = mapCanvasAssignment(c.externalId, { id: 3, name: "HW1", points_possible: "n/a", submission: { score: 8, missing: true } });
    expect(a).toMatchObject({ externalId: "canvas:u.instructure.com:a3", pointsPossible: null, score: 8, missing: true });
  });
  it("does not fabricate a score without a submission", () => {
    expect(mapCanvasAssignment("canvas:h:1", { id: 1 }).score).toBeNull();
  });
  it("parses the next link and strips html", () => {
    expect(nextLink('<https://x/a?page=1>; rel="current", <https://x/a?page=2>; rel="next"')).toBe("https://x/a?page=2");
    expect(nextLink(null)).toBeNull();
    expect(stripHtml("<p>a &amp; b</p><script>x</script>")).toBe("a & b");
  });
});

describe("classroom", () => {
  it("decodes base64 web ids to gc_ keys", () => {
    expect(decodeClassroomId(btoa("123456789"))).toBe("gc_123456789");
    expect(decodeClassroomId("not*base64")).toMatch(/^gcw_/);
  });
  it("parses due text without bumping the year", () => {
    const now = new Date(2026, 6, 1);
    expect(parseClassroomDue("Due Mar 14, 11:30 PM", now)).toBe(new Date(2026, 2, 14, 23, 30).toISOString());
    expect(parseClassroomDue("Due tomorrow", now)).toBe(new Date(2026, 6, 2, 23, 59).toISOString());
    expect(parseClassroomDue("whenever", now)).toBeNull();
  });
});

describe("diffAssignments", () => {
  const a = (over: Partial<LmsAssignment>): LmsAssignment => ({
    courseExternalId: "c", externalId: "a1", title: "HW", description: null, dueAt: "2026-03-01T00:00:00Z",
    pointsPossible: 10, score: null, submittedAt: null, missing: false, url: null, ...over,
  });
  it("reports new work, moved deadlines, grades, missing and submissions", () => {
    const prev = [a({})];
    const next = [a({ dueAt: "2026-03-02T00:00:00Z", score: 9, missing: true, submittedAt: "2026-03-01T00:00:00Z" }), a({ externalId: "a2", title: "HW2" })];
    expect(diffAssignments(prev, next).map((e) => e.kind)).toEqual(["due_changed", "grade_posted", "marked_missing", "submitted", "assignment_added"]);
  });
  it("is quiet when nothing changed, including equal instants in different formats", () => {
    expect(diffAssignments([a({})], [a({ dueAt: "2026-03-01T00:00:00.000Z" })])).toEqual([]);
  });
});

describe("guards", () => {
  it("blocks private and non-http targets", () => {
    for (const u of ["http://localhost/x", "http://10.0.0.1", "http://172.20.1.1", "file:///etc/passwd", "nonsense"]) expect(isPrivateTarget(u)).toBe(true);
    expect(isPrivateTarget("https://canvas.school.edu/files/1")).toBe(false);
  });
  it("matches same-site files", () => {
    expect(isSameSite("https://files.school.edu/x", "canvas.school.edu")).toBe(true);
    expect(isSameSite("https://evil.com/x", "canvas.school.edu")).toBe(false);
  });
  it("flags sensitive hosts", () => {
    expect(isSensitiveHost("mail.google.com")).toBe(true);
    expect(isSensitiveHost("www.chase.com")).toBe(true);
    expect(isSensitiveHost("web.kamiapp.com")).toBe(false);
  });
});

describe("chunkText and sanitizePayload", () => {
  it("bounds every chunk", () => {
    const text = "word ".repeat(2000) + "\n\n" + "a".repeat(5000);
    for (const c of chunkText(text)) expect(c.length).toBeLessThanOrEqual(900);
  });
  it("keeps paragraphs together when they fit", () => {
    expect(chunkText("one\n\ntwo")).toEqual(["one\n\ntwo"]);
  });
  it("drops objects and caps strings in usage payloads", () => {
    expect(sanitizePayload({ host: "x".repeat(300), n: 3, nested: { secret: 1 }, bad: NaN })).toEqual({ host: "x".repeat(120), n: 3 });
  });
});
