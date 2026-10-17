import { Composition, staticFile } from "remotion";
import { DEMOS, type DemoKey } from "../../web/src/lib/demos";
import { ScreenDemo, clipFrames, type Clip, type ScreenProps } from "./ScreenDemo";
import { Intro, INTRO_FRAMES } from "./Intro";
import { Learning, LEARNING_FRAMES } from "./Learning";
import { ClaudeChat, CLAUDE_FRAMES } from "./ClaudeChat";
import { END, FPS, H, TITLE, W } from "./theme";

// One composition per entry in web/src/lib/demos.ts. Screen demos wrap a clip from record.ts;
// the rest are drawn here. render.ts renders each into web/public/demos.

export const SCREEN: Partial<Record<DemoKey, string>> = {
  setup: "studylens / dashboard / connect",
  sync: "canvas.school.edu / dashboard",
  check: "kami.app / worksheet-4.pdf",
  ask: "kami.app / worksheet-4.pdf",
  practice: "studylens / dashboard / practice",
  skills: "studylens / dashboard / skills",
};

async function loadClip(scene: string): Promise<Clip | null> {
  try {
    const res = await fetch(staticFile(`${scene}.json`));
    return res.ok ? ((await res.json()) as Clip) : null;
  } catch {
    return null;
  }
}

const base = { fps: FPS, width: W, height: H };

export function Root() {
  return (
    <>
      <Composition id="intro" component={Intro} durationInFrames={INTRO_FRAMES} {...base} />
      <Composition id="learning" component={Learning} durationInFrames={LEARNING_FRAMES} {...base} />
      <Composition id="claude" component={ClaudeChat} durationInFrames={CLAUDE_FRAMES} {...base} />
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
