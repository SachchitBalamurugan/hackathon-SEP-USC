import { Composition, staticFile } from "remotion";
import { DEMOS, type DemoKey } from "../../web/src/lib/demos";
import { ScreenDemo, clipFrames, type Clip, type ScreenProps } from "./ScreenDemo";
import { Intro, INTRO_FRAMES } from "./Intro";
import { Learning, LEARNING_FRAMES } from "./Learning";
import { ClaudeChat, CLAUDE_FRAMES } from "./ClaudeChat";
import { Setup, SETUP_FRAMES } from "./Setup";
import { Pitch, PITCH_FRAMES } from "./Pitch";
import { Walkthrough, walkthroughLength, type Chapter, type LiveClip, type WalkthroughProps } from "./Walkthrough";
import { END, FPS, H, TITLE, W } from "./theme";

// One composition per entry in web/src/lib/demos.ts. Screen demos wrap a clip from record.ts;
// the rest are drawn here. render.ts renders each into web/public/demos.

export const SCREEN: Partial<Record<DemoKey, string>> = {
  sync: "canvas.school.edu / dashboard",
  check: "kami.app / worksheet-4.pdf",
  ask: "kami.app / worksheet-4.pdf",
  practice: "studylens / dashboard / practice",
  skills: "studylens / dashboard / skills",
};

/** Poster frames for drawn demos whose midpoint lands on a transition. */
export const POSTER: Partial<Record<DemoKey, number>> = { setup: 1080 };

async function loadClip(scene: string): Promise<Clip | null> {
  try {
    const res = await fetch(staticFile(`${scene}.json`));
    return res.ok ? ((await res.json()) as Clip) : null;
  } catch {
    return null;
  }
}

const base = { fps: FPS, width: W, height: H };

const LIVE_CHAPTERS: Chapter[] = [
  { id: "setup", title: "Set up in a minute", detail: "Account, extension, pairing code, Claude key", clip: null },
  { id: "tour", title: "What StudyLens knows", detail: "Today, skills, mistakes, practice, courses, self-checks", clip: null },
  { id: "check", title: "Check my work", detail: "Marks on the page, the whiteboard, and targeted practice", clip: null },
  { id: "claude", title: "A session in Claude", detail: "No API key: the check goes to the student's Claude. Terminal mock-up; tool calls are live", clip: null },
];

async function loadLive(id: string): Promise<LiveClip | null> {
  try {
    const res = await fetch(staticFile(`${id}.json`));
    return res.ok ? ((await res.json()) as LiveClip) : null;
  } catch {
    return null;
  }
}

export function Root() {
  return (
    <>
      <Composition id="intro" component={Intro} durationInFrames={INTRO_FRAMES} {...base} />
      <Composition id="learning" component={Learning} durationInFrames={LEARNING_FRAMES} {...base} />
      <Composition id="claude" component={ClaudeChat} durationInFrames={CLAUDE_FRAMES} {...base} />
      <Composition id="setup" component={Setup} durationInFrames={SETUP_FRAMES} {...base} />
      {/* The pitch video; not a web demo, so render.ts skips it. Render with pitch.ts. */}
      <Composition id="pitch" component={Pitch} durationInFrames={PITCH_FRAMES} {...base} />
      {/* The live walkthrough from live.ts recordings; render with walkthrough.ts (publicDir out/live). */}
      <Composition
        id="walkthrough"
        component={Walkthrough}
        {...base}
        durationInFrames={walkthroughLength(LIVE_CHAPTERS)}
        defaultProps={{ chapters: LIVE_CHAPTERS } satisfies WalkthroughProps}
        calculateMetadata={async ({ props }) => {
          const chapters = await Promise.all(props.chapters.map(async (ch) => ({ ...ch, clip: await loadLive(ch.id) })));
          return { durationInFrames: walkthroughLength(chapters), props: { chapters } };
        }}
      />
      {Object.entries(SCREEN).map(([scene, url]) => (
        <Composition
          key={scene}
          id={scene}
          component={ScreenDemo}
          {...base}
          durationInFrames={TITLE + 90 + END}
          defaultProps={{ scene, url, title: DEMOS[scene as DemoKey].title, caption: DEMOS[scene as DemoKey].caption, clip: null } satisfies ScreenProps}
          calculateMetadata={async ({ props }) => {
            const clip = await loadClip(props.scene);
            return { durationInFrames: TITLE + clipFrames(clip) + END, props: { ...props, clip } };
          }}
        />
      ))}
    </>
  );
}
