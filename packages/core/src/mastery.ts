// Skill mastery with forgetting. Each demonstration ({correct}) is weighted by an exponential
// decay with a 14-day half-life, so recent evidence dominates
// and an old streak of right answers does not hold a skill "mastered" forever.

export const HALF_LIFE_DAYS = 14;
export const DECAY_LAMBDA = Math.LN2 / HALF_LIFE_DAYS;
const DAY = 86_400_000;

export type Demonstration = { correct: boolean; at: string | number; weight?: number };

export type Mastery = {
  /** Decay-weighted success rate, 0..1, shrunk toward 0.5 when evidence is thin. */
  level: number;
  /** Total decayed evidence weight; ~= how many recent demonstrations back the level. */
  confidence: number;
  demonstrations: number;
  /** verified = enough fresh evidence and a high rate (at least 3 demonstrations, rate 0.7). */
  status: "unknown" | "learning" | "shaky" | "verified";
};

export function decayWeight(at: string | number, now = Date.now()): number {
  const t = typeof at === "number" ? at : Date.parse(at);
  if (!Number.isFinite(t)) return 0;
  const days = Math.max(0, (now - t) / DAY);
  return Math.exp(-DECAY_LAMBDA * days);
}

/** A Beta(1,1) prior: with no evidence the level is 0.5, and one answer cannot swing it to 0 or 1. */
const PRIOR = 1;

export function computeMastery(demos: Demonstration[], now = Date.now()): Mastery {
  let ok = 0;
  let total = 0;
  for (const d of demos) {
    const w = decayWeight(d.at, now) * (d.weight ?? 1);
    total += w;
    if (d.correct) ok += w;
  }
  const level = (ok + PRIOR) / (total + 2 * PRIOR);
  let status: Mastery["status"] = "unknown";
  if (total >= 0.5) status = "learning";
  if (total >= 2 && level < 0.55) status = "shaky";
  if (total >= 3 && level >= 0.7) status = "verified";
  return { level: round(level), confidence: round(total), demonstrations: demos.length, status };
}

const round = (n: number) => Math.round(n * 1000) / 1000;

/** Normalise a free-text skill name so "Chain Rule", "chain-rule " and "chain rule" merge. */
export function skillKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().slice(0, 80);
}
