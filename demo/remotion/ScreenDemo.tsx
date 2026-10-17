import { AbsoluteFill, OffthreadVideo, Series, staticFile } from "remotion";
import { BrowserFrame, Caption, EndCard, Page, TitleCard } from "./parts";
import { C, END, FPS, TITLE } from "./theme";

export type Clip = { trimMs: number; durationMs: number; cues: { at: number; text: string }[] };
export type ScreenProps = { scene: string; title: string; caption: string; url: string; clip: Clip | null };

// Recordings are 1440x900; framed at 16/15 scale they fill the 1080p canvas with a margin.
const SCALE = 16 / 15;
const VW = 1440 * SCALE;
const VH = 900 * SCALE;

export const clipFrames = (clip: Clip | null) => (clip ? Math.max(30, Math.round(((clip.durationMs - clip.trimMs) / 1000) * FPS)) : 90);

/** Title card, the framed recording with timed captions, then an end card. */
export function ScreenDemo({ scene, title, caption, url, clip }: ScreenProps) {
  const frames = clipFrames(clip);
  const cues = (clip?.cues ?? []).map((c, i, all) => ({
    text: c.text,
    from: Math.round((c.at / 1000) * FPS),
    to: i + 1 < all.length ? Math.round((all[i + 1].at / 1000) * FPS) - 4 : frames - 6,
  }));
  return (
    <Series>
      <Series.Sequence durationInFrames={TITLE}>
        <TitleCard title={title} caption={caption} />
      </Series.Sequence>
      <Series.Sequence durationInFrames={frames}>
        <Page bg={C.sunken}>
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
            <BrowserFrame url={url} width={VW} height={VH}>
              {clip ? (
                <OffthreadVideo src={staticFile(`${scene}.webm`)} trimBefore={Math.round((clip.trimMs / 1000) * FPS)} muted style={{ width: VW, height: VH }} />
              ) : (
                <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", fontSize: 30, color: C.dim }}>Not recorded yet: run npm -w demo run record -- {scene}</AbsoluteFill>
              )}
            </BrowserFrame>
          </AbsoluteFill>
          {cues.map((c) => (
            <Caption key={c.from} {...c} />
          ))}
        </Page>
      </Series.Sequence>
      <Series.Sequence durationInFrames={END}>
        <EndCard line={caption} />
      </Series.Sequence>
    </Series>
  );
}
