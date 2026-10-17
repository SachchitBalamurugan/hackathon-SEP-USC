import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Audio, Easing, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Logo } from "./parts";
import { C, FONT } from "./theme";
import { Agents, Compounds, Memory, Tag, TimeScale, Track } from "./Pitch";

// Part 2 of the submission: research, continual learning, agents, pricing and market, cut to a
// voiceover (out/raw/voiceover-part2.mp3). Reuses the pitch's animated scenes, replayed faster
// through TimeScale so their beats land on the words. Times come from a word-timed transcript.

const FPS = 30;
export const PART2_SECONDS = 60.4;
export const PART2_FRAMES = Math.round(PART2_SECONDS * FPS);
const f = (s: number) => Math.round(s * FPS);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.bezier(0.16, 1, 0.3, 1);
const ramp = (t: number, at: number, dur = 0.45) => interpolate(t, [at, at + dur], [0, 1], { ...clamp, easing: ease });
const show = (p: number, px = 18): CSSProperties => ({ opacity: p, transform: `translateY(${(1 - p) * px}px)` });

const CAPTIONS: [number, number, string][] = [
  [1.2, 3.2, "AI made answers free, but answers aren't learning."],
  [3.6, 6.9, "In a PNAS study, students practicing with plain ChatGPT"],
  [6.9, 9.5, "scored 17% worse once it was gone."],
  [9.9, 12.5, "A tutor that hinted at answers instead avoided the drop."],
  [13.2, 13.9, "So learning is the core."],
  [14.7, 19.4, "Every check, practice answer, course update and Claude observation lands in one evidence log,"],
  [19.9, 22.0, "and mastery fades with a 14-day half-life."],
  [22.7, 25.8, "A tool that never learns can't tell a habit from a one-off slip."],
  [26.4, 29.0, "We're building it so every mark a student flags"],
  [29.0, 31.7, "sharpens the checker for everyone and adapts to how they learn."],
  [32.6, 34.7, "Wrong feedback is the failure we design against."],
  [35.3, 36.7, "Verifiers check every answer first."],
  [37.3, 39.5, "Fixable problems get one retry with a critique."],
  [40.0, 40.7, "The rest are dropped."],
  [41.4, 43.9, "Pricing: a free trial, then $8 a month."],
  [44.4, 48.4, "The AI runs on the student's own Claude, so we never mark up usage;"],
  [49.0, 50.1, "nearly all of it is margin."],
  [50.9, 52.1, "Schools buy per-seat licenses."],
  [52.9, 55.3, "19 million US college students already use AI."],
  [56.0, 57.2, "Students first, then schools."],
  [58.6, 59.4, "Thank you."],
];

/** A scene in [from, to) seconds; `speed` replays a pitch scene faster to fit its slot. */
function Scene({ from, to, speed = 1, children }: { from: number; to: number; speed?: number; children: ReactNode }) {
  return (
    <Sequence from={f(from)} durationInFrames={f(to) - f(from)}>
      <Fade len={to - from}>
        <TimeScale.Provider value={speed}>{children}</TimeScale.Provider>
      </Fade>
    </Sequence>
  );
}

function Fade({ len, children }: { len: number; children: ReactNode }) {
  const t = useCurrentFrame() / FPS;
  return <AbsoluteFill style={{ background: C.ground, fontFamily: FONT, color: C.ink, opacity: interpolate(t, [0, 0.25, len - 0.25, len], [0, 1, 1, 0], clamp) }}>{children}</AbsoluteFill>;
}

export function Part2() {
  return (
    <AbsoluteFill style={{ background: C.ground, fontFamily: FONT }}>
      <Audio src={staticFile("voiceover-part2.mp3")} />
      <Scene from={0} to={13.0}>
        <Research />
      </Scene>
      {/* Pitch scenes, sped up: their beats (log, decay, profile habit / disputes / verifier catch, retry, drop) land on the words. */}
      <Scene from={13.0} to={26.2} speed={1.5}>
        <Memory />
      </Scene>
      <Scene from={26.2} to={32.3} speed={1.35}>
        <Compounds />
      </Scene>
      <Scene from={32.3} to={41.1} speed={1.55}>
        <Agents />
      </Scene>
      <Scene from={41.1} to={58.2}>
        <Pricing />
      </Scene>
      <Scene from={58.2} to={PART2_SECONDS}>
        <Thanks />
      </Scene>
      <Captions />
    </AbsoluteFill>
  );
}

// ── 0:00 Research ──────────────────────────────────────────────────────────────────────────

function Research() {
  const t = useCurrentFrame() / FPS;
  const head = ramp(t, 1.1);
  const bad = ramp(t, 3.6, 0.6);
  const n = Math.round(interpolate(t, [6.9, 8.4], [0, -17], { ...clamp, easing: ease }));
  const good = ramp(t, 9.9, 0.6);
  return (
    <AbsoluteFill style={{ padding: "100px 140px" }}>
      <Track name="The research" />
      <div style={{ ...show(head), fontSize: 76, fontWeight: 700, letterSpacing: "-0.03em" }}>
        AI made answers free. <span style={{ color: C.dim }}>Answers aren&apos;t learning.</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, marginTop: 70 }}>
        <div style={{ ...show(bad, 26), background: "#fff", border: `1px solid ${C.lineStrong}`, borderRadius: 22, padding: "34px 38px" }}>
          <div style={{ fontSize: 24, color: C.dim }}>Practiced with plain ChatGPT, then tested without it</div>
          <div style={{ fontSize: 150, fontWeight: 700, letterSpacing: "-0.04em", color: C.danger, fontVariantNumeric: "tabular-nums", marginTop: 6 }}>
            {n < 0 ? "−" : ""}
            {Math.abs(n)}%
          </div>
          <div style={{ fontSize: 26, color: C.ink2 }}>on the exam, nearly 1,000 students</div>
          <div style={{ marginTop: 22 }}>
            <Tag>PNAS 2025</Tag>
          </div>
        </div>
        <div style={{ ...show(good, 26), background: C.goodSoft, border: `1px solid rgba(46,135,87,0.3)`, borderRadius: 22, padding: "34px 38px" }}>
          <div style={{ fontSize: 24, color: C.dim }}>A tutor that gave hints instead of answers</div>
          <div style={{ fontSize: 110, fontWeight: 700, letterSpacing: "-0.03em", color: C.good, marginTop: 24 }}>No drop</div>
          <div style={{ fontSize: 26, color: C.ink2, marginTop: 14 }}>Same study. StudyLens is built hint-first.</div>
          <div style={{ marginTop: 22 }}>
            <Tag>PNAS 2025</Tag>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ── 0:41 Pricing and market ────────────────────────────────────────────────────────────────

function Pricing() {
  const t = useCurrentFrame() / FPS;
  // Anchors (seconds from 41.1): pricing 0.3, trial 1.0, $8 2.0, own Claude 3.3, margin 7.9,
  // schools 9.8, 19M 11.8, roadmap 14.9.
  const card = (at: number): CSSProperties => ({ ...show(ramp(t, at), 20), background: "#fff", border: `1px solid ${C.lineStrong}`, borderRadius: 20, padding: "26px 30px" });
  const margin = interpolate(t, [7.9, 9.0], [0, 0.92], { ...clamp, easing: ease });
  const students = Math.round(interpolate(t, [11.8, 13.6], [0, 19], { ...clamp, easing: ease }));
  return (
    <AbsoluteFill style={{ padding: "90px 120px" }}>
      <Track name="Scale" />
      <div style={{ ...show(ramp(t, 0.3)), fontSize: 64, fontWeight: 700, letterSpacing: "-0.025em" }}>Pricing</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 26, marginTop: 40 }}>
        <div style={card(1.0)}>
          <div style={{ fontSize: 18, fontWeight: 650, color: C.dim, textTransform: "uppercase", letterSpacing: "0.06em" }}>Students</div>
          <div style={{ fontSize: 34, fontWeight: 650, marginTop: 10 }}>Free trial</div>
          <div style={{ ...show(ramp(t, 2.0), 10), fontSize: 64, fontWeight: 700, letterSpacing: "-0.03em", marginTop: 6 }}>
            $8<span style={{ fontSize: 28, color: C.dim, fontWeight: 500 }}> / month</span>
          </div>
        </div>
        <div style={card(3.3)}>
          <div style={{ fontSize: 18, fontWeight: 650, color: C.dim, textTransform: "uppercase", letterSpacing: "0.06em" }}>Runs on the student&apos;s own Claude</div>
          <div style={{ fontSize: 30, fontWeight: 650, marginTop: 10, lineHeight: 1.25 }}>No markup on AI usage</div>
          <div style={{ marginTop: 18, fontSize: 20, color: C.dim }}>Gross margin</div>
          <div style={{ height: 16, borderRadius: 99, background: C.sunken, marginTop: 8 }}>
            <div style={{ height: 16, width: `${margin * 100}%`, borderRadius: 99, background: C.good }} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 650, color: C.good, marginTop: 8, opacity: ramp(t, 8.6) }}>Nearly all of it</div>
        </div>
        <div style={card(9.8)}>
          <div style={{ fontSize: 18, fontWeight: 650, color: C.dim, textTransform: "uppercase", letterSpacing: "0.06em" }}>Schools</div>
          <div style={{ fontSize: 34, fontWeight: 650, marginTop: 10 }}>Per-seat licenses</div>
          <div style={{ fontSize: 22, color: C.dim, marginTop: 10, lineHeight: 1.4 }}>Every student covered, one contract.</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 60, marginTop: 46 }}>
        <div style={show(ramp(t, 11.8), 16)}>
          <div style={{ fontSize: 120, fontWeight: 700, letterSpacing: "-0.04em", fontVariantNumeric: "tabular-nums" }}>{students}M</div>
          <div style={{ fontSize: 26, color: C.ink2 }}>US college students already use AI</div>
        </div>
        <div style={{ ...show(ramp(t, 14.9), 14), display: "flex", alignItems: "center", gap: 22, fontSize: 34, fontWeight: 600 }}>
          <span style={{ background: C.ink, color: "#fff", borderRadius: 99, padding: "12px 30px" }}>Students</span>
          <span style={{ color: C.faint }}>→</span>
          <span style={{ border: `2px solid ${C.ink}`, borderRadius: 99, padding: "10px 28px" }}>Schools</span>
        </div>
      </div>
    </AbsoluteFill>
  );
}

function Thanks() {
  const t = useCurrentFrame() / FPS;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 28, opacity: ramp(t, 0) }}>
      <Logo size={88} />
      <div style={{ fontSize: 52, fontWeight: 700, letterSpacing: "-0.02em" }}>Thank you</div>
      <div style={{ fontSize: 26, color: C.dim }}>Sachchit Balamurugan · Philip Baker</div>
    </AbsoluteFill>
  );
}

function Captions() {
  const t = useCurrentFrame() / FPS;
  const cap = CAPTIONS.find(([a, b]) => t >= a - 0.05 && t <= b + 0.25);
  if (!cap) return null;
  const o = interpolate(t, [cap[0] - 0.05, cap[0] + 0.1, cap[1] + 0.1, cap[1] + 0.25], [0, 1, 1, 0], clamp);
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 34, pointerEvents: "none" }}>
      <div style={{ opacity: o, background: "rgba(25,25,23,0.92)", color: "#fff", fontSize: 36, fontWeight: 550, lineHeight: 1.25, padding: "12px 26px", borderRadius: 14, maxWidth: 1600, textAlign: "center" }}>{cap[2]}</div>
    </AbsoluteFill>
  );
}
