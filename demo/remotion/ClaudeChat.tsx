import type { ReactNode } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { DEMOS } from "../../web/src/lib/demos";
import { Page, rise, useEnter } from "./parts";
import { C, MONO } from "./theme";

export const CLAUDE_FRAMES = 480;

// A Claude conversation using the StudyLens connector: it reads the profile before teaching
// and saves what it learned afterwards (the get_learner_profile and record_observation tools).

const REPLY_1 = "You've been dropping the sign when you distribute a negative, and Quiz 2 is Thursday. Let's start there: what is −3(x − 4)?";
const REPLY_2 = "Close. −3 times −4 is +12, so it's −3x + 12. The negative goes to both terms. Try −2(5 − y).";

export function ClaudeChat() {
  const frame = useCurrentFrame();
  const head = useEnter(2);
  const typed = (text: string, start: number, cps = 1.6) => text.slice(0, Math.max(0, Math.floor((frame - start) * cps)));

  return (
    <Page bg={C.sunken}>
      <AbsoluteFill style={{ padding: "70px 0 0 140px" }}>
        <div style={{ ...rise(head), fontSize: 60, fontWeight: 650, letterSpacing: "-0.025em" }}>{DEMOS.claude.title}</div>
        <div style={{ ...rise(head), fontSize: 28, color: C.dim, marginTop: 10 }}>{DEMOS.claude.caption}</div>
      </AbsoluteFill>

      <div style={{ position: "absolute", left: 260, top: 250, width: 1400, height: 760, borderRadius: 20, background: "#fff", border: `1px solid ${C.lineStrong}`, boxShadow: "0 40px 80px -40px rgba(20,20,18,0.3)", padding: "36px 60px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 22, overflow: "hidden" }}>
        <Bubble at={20} user>
          Can you help me get ready for my Algebra quiz?
        </Bubble>
        <Tool at={60} name="get_learner_profile" result="Weak: distributing a negative (38%) · Due Thu: Quiz 2, two-step equations" />
        {frame >= 110 && <Bubble at={110}>{typed(REPLY_1, 110)}</Bubble>}
        <Bubble at={210} user>
          −3x − 12
        </Bubble>
        {frame >= 250 && <Bubble at={250}>{typed(REPLY_2, 250)}</Bubble>}
        <Tool at={330} name="record_observation" result="Saved: distributes the negative to the first term only" />
      </div>

      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 26 }}>
        <div style={{ ...rise(useEnter(380)), fontSize: 26, color: C.dim }}>Next time you press Check my work, StudyLens already knows to look for it.</div>
      </AbsoluteFill>
    </Page>
  );
}

function Bubble({ at, user = false, children }: { at: number; user?: boolean; children: ReactNode }) {
  const p = useEnter(at);
  if (useCurrentFrame() < at) return null;
  return (
    <div style={{ ...rise(p, 14), alignSelf: user ? "flex-end" : "flex-start", maxWidth: 1000, fontSize: 27, lineHeight: 1.45, ...(user ? { background: C.sunken, borderRadius: 18, padding: "14px 22px" } : { color: C.ink }) }}>
      {children}
    </div>
  );
}

function Tool({ at, name, result }: { at: number; name: string; result: string }) {
  const frame = useCurrentFrame();
  const p = useEnter(at);
  const open = interpolate(frame, [at + 14, at + 28], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (frame < at) return null;
  return (
    <div style={{ ...rise(p, 10), alignSelf: "flex-start", border: `1px solid ${C.line}`, borderRadius: 12, padding: "10px 16px", fontSize: 20, background: C.ground }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, color: C.dim }}>
        <span style={{ width: 10, height: 10, borderRadius: 99, background: open >= 1 ? C.good : C.faint }} />
        <span>StudyLens</span>
        <span style={{ fontFamily: MONO, color: C.ink }}>{name}</span>
      </div>
      <div style={{ opacity: open, maxHeight: open * 40, overflow: "hidden", marginTop: 6 * open, color: C.ink2 }}>{result}</div>
    </div>
  );
}
