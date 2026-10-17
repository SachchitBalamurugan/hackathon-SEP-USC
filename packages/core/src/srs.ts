// Adaptive spaced repetition (SM-2).
// Pure functions so they run identically in the extension and on the server.

export type SrsState = {
  ease: number; // ease factor; SM-2 starts at 2.5
  interval: number; // days until next review
  reps: number; // consecutive successful reviews
  lapses: number; // times forgotten
  dueAt: string; // ISO timestamp of next review
};

export const GRADE = { again: 2, hard: 3, good: 4, easy: 5 } as const;

/** Map a 0..1 grader score onto an SM-2 quality grade. */
export function gradeFromScore(score: number): number {
  if (score >= 0.95) return GRADE.easy;
  if (score >= 0.75) return GRADE.good;
  if (score >= 0.5) return GRADE.hard;
  return GRADE.again;
}

export function sm2(state: Partial<SrsState> | null | undefined, grade: number, now = Date.now()): SrsState {
  let ease = state?.ease ?? 2.5;
  let interval = state?.interval ?? 0;
  let reps = state?.reps ?? 0;
  let lapses = state?.lapses ?? 0;
  const q = Math.max(0, Math.min(5, Math.round(grade)));

  ease = ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (ease < 1.3) ease = 1.3;
  ease = Math.round(ease * 100) / 100;

  if (q < 3) {
    reps = 0;
    interval = 1;
    lapses += 1;
  } else {
    reps += 1;
    interval = reps === 1 ? 1 : reps === 2 ? 6 : Math.round(interval * ease);
  }
  return { ease, interval, reps, lapses, dueAt: new Date(now + interval * 86_400_000).toISOString() };
}

export function isDue(state: Partial<SrsState> | null | undefined, now = Date.now()): boolean {
  if (!state || !state.dueAt) return true;
  return new Date(state.dueAt).getTime() <= now;
}
