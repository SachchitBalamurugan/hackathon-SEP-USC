import { AbsoluteFill, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Logo } from "./parts";
import { C, FONT } from "./theme";

// The live walkthrough: real screen recordings from live.ts (the site and extension running
// against demo fixtures, plus the Claude terminal), with chapter cards and the captions the
// recorder logged as each step happened. Clips are read from out/live (the publicDir).

export type LiveClip = { file: string; startMs: number; durationMs: number; wide: boolean; cues: { at: number; text: string }[] };
export type Chapter = { id: string; title: string; detail: string; clip: LiveClip | null };
export type WalkthroughProps = { chapters: Chapter[] };

const FPS = 30;
export const INTRO = 4 * FPS;
export const CARD = 2.5 * FPS;
export const OUTRO = 3 * FPS;
export const clipLen = (c: LiveClip | null) => (c ? Math.round((c.durationMs / 1000) * FPS) + 15 : 3 * FPS);
export const walkthroughLength = (chapters: Chapter[]) => INTRO + chapters.reduce((n, ch) => n + CARD + clipLen(ch.clip), 0) + OUTRO;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export function Walkthrough({ chapters }: WalkthroughProps) {
  let at = INTRO;
  const parts = chapters.map((ch, i) => {
    const card = at;
    const clip = at + CARD;
    at = clip + clipLen(ch.clip);
    return { ch, i, card, clip };
  });
  return (
    <AbsoluteFill style={{ background: C.sunken, fontFamily: FONT, color: C.ink }}>
      <Sequence durationInFrames={INTRO}>
        <Fade len={INTRO}>
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", background: C.ground, gap: 26 }}>
            <Logo size={72} />
            <div style={{ fontSize: 56, fontWeight: 700, letterSpacing: "-0.02em" }}>Live walkthrough</div>
            <div style={{ fontSize: 24, color: C.dim, maxWidth: 1200, textAlign: "center", lineHeight: 1.45 }}>
              Screen recordings of the real website and Chrome extension, running locally with a demo student&apos;s data. The AI&apos;s answers are prepared examples for this demo; everything else (marks, whiteboard, grading, the learner model, the MCP tools) is the product running live.
            </div>
          </AbsoluteFill>
        </Fade>
      </Sequence>
      {parts.map(({ ch, i, card, clip }) => (
        <Sequence key={ch.id} from={card} durationInFrames={CARD + clipLen(ch.clip)}>
          <Sequence durationInFrames={CARD}>
            <Fade len={CARD}>
              <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", background: C.ground, gap: 18 }}>
                <div style={{ fontSize: 22, fontWeight: 650, color: C.accent, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  Part {i + 1} of {chapters.length}
                </div>
                <div style={{ fontSize: 64, fontWeight: 700, letterSpacing: "-0.025em" }}>{ch.title}</div>
                <div style={{ fontSize: 28, color: C.dim }}>{ch.detail}</div>
              </AbsoluteFill>
            </Fade>
          </Sequence>
          <Sequence from={CARD} durationInFrames={clipLen(ch.clip)}>
            <ClipView title={ch.title} clip={ch.clip} />
          </Sequence>
        </Sequence>
      ))}
      <Sequence from={at} durationInFrames={OUTRO}>
        <Fade len={OUTRO}>
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", background: C.ground, gap: 24 }}>
            <Logo size={80} />
            <div style={{ fontSize: 40, fontWeight: 650 }}>Feedback while you work, not after the grade.</div>
          </AbsoluteFill>
        </Fade>
      </Sequence>
    </AbsoluteFill>
  );
}

function Fade({ len, children }: { len: number; children: React.ReactNode }) {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ opacity: interpolate(f, [0, 8, len - 8, len], [0, 1, 1, 0], clamp) }}>{children}</AbsoluteFill>;
}

/** One recording, framed on the page, with its captions and a chapter label. */
function ClipView({ title, clip }: { title: string; clip: LiveClip | null }) {
  const f = useCurrentFrame();
  const t = (f / FPS) * 1000;
  if (!clip) return <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", fontSize: 28, color: C.dim }}>Not recorded yet</AbsoluteFill>;
  const srcW = clip.wide ? 2880 : 1440;
  const srcH = 1000;
  const maxW = 1840;
  const maxH = 860;
  const scale = Math.min(maxW / srcW, maxH / srcH);
  const w = Math.round(srcW * scale);
  const h = Math.round(srcH * scale);
  const cue = [...clip.cues].reverse().find((c) => c.at <= t + 150);
  const next = clip.cues.find((c) => c.at > (cue?.at ?? -1));
  const end = next ? next.at : clip.durationMs + 400;
  const capO = cue ? interpolate(t, [cue.at - 100, cue.at + 200, end - 250, end], [0, 1, 1, 0], clamp) : 0;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: (1920 - w) / 2, top: 28, width: w, height: h, borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 4px rgba(20,20,18,0.06), 0 30px 60px -30px rgba(20,20,18,0.45)", background: "#000" }}>
        <OffthreadVideo src={staticFile(clip.file)} trimBefore={Math.max(0, Math.round((clip.startMs / 1000) * FPS))} muted style={{ width: w, height: h }} />
        {/* The terminal window's popup bar only shows a local file path; cover it. */}
        {clip.wide && <div style={{ position: "absolute", left: (srcW / 2) * scale, top: 0, width: (srcW / 2) * scale, height: 37 * scale, background: "#2a2926" }} />}
      </div>
      <div style={{ position: "absolute", left: 40, top: 40, display: clip.wide ? "none" : "block", fontSize: 18, fontWeight: 650, color: C.dim, writingMode: "vertical-rl", transform: "rotate(180deg)", letterSpacing: "0.12em", textTransform: "uppercase" }}>{title}</div>
      {cue && (
        <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 40 }}>
          <div style={{ opacity: capO, background: "rgba(25,25,23,0.94)", color: "#fff", fontSize: 32, fontWeight: 550, padding: "12px 26px", borderRadius: 14, maxWidth: 1600, textAlign: "center" }}>{cue.text}</div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
}
