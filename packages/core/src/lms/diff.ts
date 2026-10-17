// Compare a fresh LMS sync against what we already stored and describe what changed. These
// course events are one of the three inputs to the learner model: a newly posted grade or a
// moved due date is evidence about the student's situation, not just a row update.

import type { LmsAssignment } from "./types";

export type CourseEvent =
  | { kind: "assignment_added"; assignmentId: string; title: string; dueAt: string | null }
  | { kind: "due_changed"; assignmentId: string; title: string; from: string | null; to: string | null }
  | { kind: "grade_posted"; assignmentId: string; title: string; score: number; pointsPossible: number | null }
  | { kind: "marked_missing"; assignmentId: string; title: string }
  | { kind: "submitted"; assignmentId: string; title: string };

type Stored = Pick<LmsAssignment, "externalId" | "title" | "dueAt" | "score" | "missing" | "submittedAt">;

const sameInstant = (a: string | null, b: string | null) => (a && b ? Date.parse(a) === Date.parse(b) : a === b);

export function diffAssignments(previous: Stored[], next: LmsAssignment[]): CourseEvent[] {
  const before = new Map(previous.map((p) => [p.externalId, p]));
  const events: CourseEvent[] = [];
  for (const a of next) {
    const old = before.get(a.externalId);
    if (!old) {
      events.push({ kind: "assignment_added", assignmentId: a.externalId, title: a.title, dueAt: a.dueAt });
      if (a.score !== null) events.push({ kind: "grade_posted", assignmentId: a.externalId, title: a.title, score: a.score, pointsPossible: a.pointsPossible });
      continue;
    }
    if (!sameInstant(old.dueAt, a.dueAt)) events.push({ kind: "due_changed", assignmentId: a.externalId, title: a.title, from: old.dueAt, to: a.dueAt });
    if (a.score !== null && old.score !== a.score)
      events.push({ kind: "grade_posted", assignmentId: a.externalId, title: a.title, score: a.score, pointsPossible: a.pointsPossible });
    if (a.missing && !old.missing) events.push({ kind: "marked_missing", assignmentId: a.externalId, title: a.title });
    if (a.submittedAt && !old.submittedAt) events.push({ kind: "submitted", assignmentId: a.externalId, title: a.title });
  }
  return events;
}
