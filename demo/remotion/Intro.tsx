import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { DEMOS } from "../../web/src/lib/demos";
import { Logo, Page, rise, useEnter } from "./parts";
import { C, MONO } from "./theme";

export const INTRO_FRAMES = 420;

const FEATURES = ["Syncs Canvas and Google Classroom", "Checks your work on any page", "Explains with steps, graphs and diagrams", "Writes practice aimed at your mistakes"];

/** What StudyLens is: a worksheet gets checked, then the four things it does. */
export function Intro() {
  const frame = useCurrentFrame();
  const head = useEnter(4);
  const sub = useEnter(12);
  const sheet = useEnter(40);
  const press = interpolate(frame, [96, 102, 110], [1, 0.94, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const circle = interpolate(frame, [118, 150], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const note = useEnter(152);
  const ask = useEnter(176);
  const outro = interpolate(frame, [372, 392], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <Page>
      <AbsoluteFill style={{ padding: "90px 120px", opacity: 1 - outro }}>
        <div style={rise(head)}>
          <Logo size={48} />
        </div>
        <div style={{ ...rise(sub), marginTop: 34, fontSize: 64, fontWeight: 650, letterSpacing: "-0.025em", lineHeight: 1.1, maxWidth: 1500 }}>{DEMOS.intro.caption}</div>

        <div style={{ display: "flex", gap: 80, marginTop: 70, alignItems: "flex-start" }}>
          {/* A worksheet being checked */}
          <div style={{ ...rise(sheet, 40), width: 860, height: 560, borderRadius: 18, border: `1px solid ${C.lineStrong}`, background: "#fff", boxShadow: "0 40px 80px -40px rgba(20,20,18,0.3)", position: "relative", padding: "36px 44px" }}>
            <div style={{ fontSize: 30, fontWeight: 600 }}>Worksheet 4: Linear equations</div>
            <div style={{ fontSize: 22, color: C.dim, marginTop: 18 }}>1. Solve for x: 3x + 5 = 20</div>
            {["3x = 20 + 5", "3x = 25", "x = 25/3"].map((t, i) => (
              <div key={t} style={{ fontFamily: "'Segoe Print', 'Bradley Hand', cursive", fontSize: 46, color: C.pen, marginTop: i ? 18 : 30, marginLeft: 70 }}>
                {t}
              </div>
            ))}
            <svg style={{ position: "absolute", left: 92, top: 128, overflow: "visible" }} width={330} height={92}>
              <ellipse cx={165} cy={46} rx={165} ry={44} fill="none" stroke={C.danger} strokeWidth={5} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - circle} strokeLinecap="round" />
            </svg>
            <div style={{ ...rise(note, 12), position: "absolute", left: 460, top: 136, width: 340, background: C.ink, color: "#fff", borderRadius: 12, padding: "14px 18px", fontSize: 21, lineHeight: 1.35 }}>
              <div style={{ fontSize: 15, opacity: 0.6, marginBottom: 4 }}>Mistake</div>
              To undo +5, subtract 5 from both sides: 3x = 15.
            </div>
            <div style={{ ...rise(ask, 12), position: "absolute", left: 44, right: 44, bottom: 96, background: C.accentSoft, color: C.accent, borderRadius: 12, padding: "14px 18px", fontSize: 22 }}>
              What do you do to both sides to undo “+ 5”?
            </div>
            {/* The dock pill */}
            <div style={{ position: "absolute", right: 28, bottom: 26, display: "flex", gap: 6, background: C.ink, borderRadius: 999, padding: 6, transform: `scale(${press})` }}>
              <span style={{ background: "#fff", color: C.ink, borderRadius: 999, padding: "8px 18px", fontSize: 19, fontWeight: 600 }}>{frame > 100 && frame < 150 ? "Checking…" : "Check my work"}</span>
              <span style={{ color: "#fff", padding: "8px 14px", fontSize: 19 }}>Ask</span>
              <span style={{ color: "rgba(255,255,255,0.5)", padding: "8px 10px 8px 0", fontSize: 15, fontFamily: MONO, alignSelf: "center" }}>Alt⇧C</span>
            </div>
          </div>

          <div style={{ display: "grid", gap: 26, marginTop: 20 }}>
            {FEATURES.map((f, i) => (
              <Feature key={f} text={f} delay={210 + i * 24} />
            ))}
          </div>
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 26, opacity: outro }}>
        <Logo size={72} />
        <div style={{ fontSize: 32, color: C.dim }}>A browser extension and a Claude connector for students.</div>
      </AbsoluteFill>
    </Page>
  );
}

function Feature({ text, delay }: { text: string; delay: number }) {
  const p = useEnter(delay);
  return (
    <div style={{ ...rise(p, 18), display: "flex", alignItems: "center", gap: 18, fontSize: 34, fontWeight: 550 }}>
      <span style={{ width: 16, height: 16, borderRadius: 99, background: C.good, boxShadow: `0 0 0 6px ${C.goodSoft}` }} />
      {text}
    </div>
  );
}
