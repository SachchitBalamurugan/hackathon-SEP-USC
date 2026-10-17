export type LmsSource = "canvas" | "classroom" | "generic";

export type LmsCourse = {
  source: LmsSource;
  /** Stable, source-qualified id, e.g. "canvas:school.instructure.com:1234" or "gc_5678". */
  externalId: string;
  name: string;
  code: string | null;
  currentScore: number | null;
  url: string | null;
};

export type LmsAssignment = {
  courseExternalId: string;
  externalId: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  pointsPossible: number | null;
  score: number | null;
  submittedAt: string | null;
  missing: boolean;
  url: string | null;
};

export type LmsMaterial = {
  courseExternalId: string;
  externalId: string;
  title: string;
  kind: "page" | "syllabus" | "file" | "module";
  text: string;
  url: string | null;
};

export type LmsSnapshot = {
  source: LmsSource;
  host: string;
  courses: LmsCourse[];
  assignments: LmsAssignment[];
  materials: LmsMaterial[];
};
