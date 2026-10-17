import { AbsoluteFill, Audio, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Logo } from "./parts";
import { C, FONT } from "./theme";

// The one-minute walkthrough: the live.ts recordings cut to a voiceover (out/live/voiceover-short.mp3).
// Each shot plays [from, to] seconds of a recording (after its trim point) in the voiceover window
// [at, end], sped up to fit. Times come from a word-timed transcript of the voiceover.

const FPS = 30;
export const SHORT_SECONDS = 59.4;
export const SHORT_FRAMES = Math.round(SHORT_SECONDS * FPS);

type Clip = "setup" | "tour" | "check" | "claude";
type Shot = { clip: Clip; from: number; to: number; at: number; end: number };

/** Seconds into each recording's file where its scene starts (startMs in out/live/<clip>.json). */
export type Starts = Record<Clip, number>;

const SECTIONS: { label: string; at: number; end: number }[] = [
  { label: "Setup", at: 8.2, end: 15.2 },
  { label: "Dashboard", at: 15.2, end: 25.0 },
  { label: "Check my work", at: 25.0, end: 41.0 },
  { label: "Claude", at: 41.0, end: 53.4 },
];

const SHOTS: Shot[] = [
  { clip: "setup", from: 0.5, to: 8.5, at: 8.2, end: 10.4 },
  { clip: "setup", from: 13.4, to: 17.5, at: 10.4, end: 11.7 },
  { clip: "setup", from: 22.5, to: 28.5, at: 11.7, end: 13.0 },
  { clip: "setup", from: 29.6, to: 36.0, at: 13.0, end: 15.2 },
  { clip: "tour", from: 0.3, to: 2.9, at: 15.2, end: 17.1 },
  { clip: "tour", from: 8.0, to: 12.0, at: 17.1, end: 18.3 },
  { clip: "tour", from: 17.6, to: 20.5, at: 18.3, end: 19.9 },
  { clip: "tour", from: 3.0, to: 6.5, at: 19.9, end: 21.8 },
  { clip: "tour", from: 26.0, to: 36.0, at: 21.8, end: 25.0 },
  { clip: "check", from: 0.2, to: 6.2, at: 25.0, end: 28.2 },
  { clip: "check", from: 5.0, to: 11.3, at: 28.2, end: 34.5 },
  { clip: "check", from: 10.2, to: 15.2, at: 34.5, end: 36.9 },
  { clip: "check", from: 22.5, to: 29.5, at: 36.9, end: 39.3 },
  { clip: "check", from: 33.0, to: 39.9, at: 39.3, end: 41.0 },
  { clip: "claude", from: 0.5, to: 7.0, at: 41.0, end: 44.6 },
  { clip: "claude", from: 9.0, to: 20.0, at: 44.6, end: 48.6 },
  { clip: "claude", from: 20.5, to: 25.0, at: 48.6, end: 50.3 },
  { clip: "claude", from: 27.0, to: 33.5, at: 50.3, end: 53.4 },
];

const CAPTIONS: [number, number, string][] = [
  [0.96, 2.88, "I'm Philip, a freshman at USC."],
  [3.04, 4.88, "I'm Sachchit, a freshman at Berkeley."],
  [5.1, 7.92, "This is StudyLens, running with a demo student, Maya."],
  [8.38, 11.44, "Setup takes a minute: creating the account, downloading the extension,"],
  [11.74, 14.88, "pairing with a one-time code, and connecting to Claude with one command."],
  [15.24, 19.4, "The dashboard shows what's due, Maya's weak skills, her open mistakes,"],
  [19.96, 21.52, "and a profile she can edit."],
  [21.92, 24.4, "Practice comes back right before she'd forget."],
  [25.24, 28.08, "On her worksheet, one click checks her work."],
  [28.26, 29.4, "Red is a mistake."],
  [29.58, 32.98, "Green is right, and amber means it can't read her handwriting,"],
  [33.04, 34.04, "so it asks."],
  [34.62, 38.08, "It names the belief behind the error, explains it on a whiteboard,"],
  [38.4, 40.72, "and writes practice for that exact mistake."],
  [41.08, 42.42, "No API key needed."],
  [42.48, 43.84, "It runs on Maya's own Claude."],
  [44.8, 50.36, "Through our MCP connector, Claude reads her screen and profile, sends the marks back to the page,"],
  [50.42, 53.24, "and saves what it learned for next time."],
  [53.58, 54.52, "StudyLens."],
  [54.68, 57.64, "Feedback while you work, not after the grade."],
];

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const f = (s: number) => Math.round(s * FPS);

export function Short({ starts }: { starts: Starts }) {
  return (
    <AbsoluteFill style={{ background: C.sunken, fontFamily: FONT, color: C.ink }}>
      <Audio src={staticFile("voiceover-short.mp3")} />
      <Sequence durationInFrames={f(8.2)}>
        <Intro />
      </Sequence>
      {SHOTS.map((s, i) => (
        <Sequence key={i} from={f(s.at)} durationInFrames={f(s.end) - f(s.at)}>
          <ShotView shot={s} start={starts[s.clip]} />
        </Sequence>
      ))}
      {SECTIONS.map((s) => (
        <Sequence key={s.label} from={f(s.at)} durationInFrames={f(s.end) - f(s.at)}>
          <SectionLabel label={s.label} len={s.end - s.at} />
        </Sequence>
      ))}
      <Sequence from={f(53.4)} durationInFrames={SHORT_FRAMES - f(53.4)}>
        <End />
      </Sequence>
      <Captions />
    </AbsoluteFill>
  );
}

function Intro() {
  const t = useCurrentFrame() / FPS;
  const p = (at: number) => interpolate(t, [at, at + 0.5], [0, 1], clamp);
  const out = interpolate(t, [7.8, 8.2], [1, 0], clamp);
  const card = (at: number): React.CSSProperties => ({ opacity: p(at), transform: `translateY(${(1 - p(at)) * 16}px)`, width: 420, border: `1px solid ${C.lineStrong}`, borderRadius: 18, padding: "20px 26px", background: "#fff" });
  return (
    <AbsoluteFill style={{ background: C.ground, alignItems: "center", justifyContent: "center", gap: 40, opacity: out }}>
      <div style={{ opacity: p(0) }}>
        <Logo size={76} />
      </div>
      <div style={{ display: "flex", gap: 30 }}>
        <div style={card(0.9)}>
          <div style={{ fontSize: 32, fontWeight: 650 }}>Philip Baker</div>
          <div style={{ fontSize: 21, color: C.dim, marginTop: 4 }}>Freshman · USC</div>
        </div>
        <div style={card(3.0)}>
          <div style={{ fontSize: 32, fontWeight: 650 }}>Sachchit Balamurugan</div>
          <div style={{ fontSize: 21, color: C.dim, marginTop: 4 }}>Freshman · UC Berkeley</div>
        </div>
      </div>
      <div style={{ opacity: p(5.2), fontSize: 26, color: C.dim }}>Live demo · student: Maya R., Algebra 1</div>
    </AbsoluteFill>
  );
}

function ShotView({ shot, start }: { shot: Shot; start: number }) {
  const srcW = shot.clip === "claude" ? 2880 : 1440;
  const srcH = 1000;
  const scale = Math.min(1840 / srcW, 880 / srcH);
  const w = Math.round(srcW * scale);
  const h = Math.round(srcH * scale);
  const rate = (shot.to - shot.from) / (shot.end - shot.at);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: (1920 - w) / 2, top: shot.clip === "claude" ? 170 : 24, width: w, height: h, borderRadius: 14, overflow: "hidden", background: "#000", boxShadow: "0 2px 4px rgba(20,20,18,0.06), 0 30px 60px -30px rgba(20,20,18,0.45)" }}>
        <OffthreadVideo src={staticFile(`${shot.clip}.mp4`)} trimBefore={f(start + shot.from)} playbackRate={rate} muted style={{ width: w, height: h }} />
        {/* The terminal window's popup bar only shows a local file path; cover it. */}
        {shot.clip === "claude" && <div style={{ position: "absolute", left: w / 2, top: 0, width: w / 2, height: 37 * scale, background: "#2a2926" }} />}
      </div>
    </AbsoluteFill>
  );
}

function SectionLabel({ label, len }: { label: string; len: number }) {
  const t = useCurrentFrame() / FPS;
  const o = interpolate(t, [0, 0.3, len - 0.3, len], [0, 1, 1, 0], clamp);
  return (
    <div style={{ position: "absolute", left: 22, top: 30, opacity: o, fontSize: 17, fontWeight: 700, color: C.accent, letterSpacing: "0.12em", textTransform: "uppercase", writingMode: "vertical-rl", transform: "rotate(180deg)" }}>{label}</div>
  );
}

function End() {
  const t = useCurrentFrame() / FPS;
  const p = interpolate(t, [0, 0.5], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ background: C.ground, alignItems: "center", justifyContent: "center", gap: 30, opacity: p }}>
      <Logo size={96} />
      <div style={{ fontSize: 48, fontWeight: 650, letterSpacing: "-0.02em" }}>Feedback while you work, not after the grade.</div>
    </AbsoluteFill>
  );
}

function Captions() {
  const t = useCurrentFrame() / FPS;
  const cap = CAPTIONS.find(([a, b]) => t >= a - 0.05 && t <= b + 0.25);
  if (!cap) return null;
  const o = interpolate(t, [cap[0] - 0.05, cap[0] + 0.1, cap[1] + 0.1, cap[1] + 0.25], [0, 1, 1, 0], clamp);
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 30, pointerEvents: "none" }}>
      <div style={{ opacity: o, background: "rgba(25,25,23,0.94)", color: "#fff", fontSize: 34, fontWeight: 550, lineHeight: 1.25, padding: "11px 26px", borderRadius: 14, maxWidth: 1700, textAlign: "center" }}>{cap[2]}</div>
    </AbsoluteFill>
  );
}
