import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { DEMOS } from "../../web/src/lib/demos";
import { Page, rise, useEnter } from "./parts";
import { C } from "./theme";

export const LEARNING_FRAMES = 390;

// The README's "How the learner model learns" table, as a flow: three inputs into one model,
// and the three places it changes what the student sees.

const INPUTS = [
  { title: "Course updates", detail: "New work, deadlines and grades" },
  { title: "Claude conversations", detail: "What Claude notices as it teaches" },
  { title: "Your work in StudyLens", detail: "Checks, practice and questions" },
];
const OUTPUTS = [
  { title: "Check my work", detail: "knows your usual mistakes" },
  { title: "Explanations", detail: "pitched at your level" },
  { title: "Practice", detail: "aimed at the belief behind it" },
];
const SKILLS: [string, number, string][] = [
  ["combining like terms", 0.92, C.good],
  ["two-step equations", 0.64, "#a86516"],
  ["distributing a negative", 0.38, C.danger],
];

const IN_X = 140;
const MID_X = 760;
const OUT_X = 1380;
const ROW = (i: number) => 330 + i * 200;
const CARD_W = 400;

export function Learning() {
  const frame = useCurrentFrame();
  const head = useEnter(2);
  const model = useEnter(70);
  const foot = useEnter(300);
  const flowIn = interpolate(frame, [40, 110], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const flowOut = interpolate(frame, [170, 240], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const pulse = (frame % 60) / 60;

  return (
    <Page>
      <AbsoluteFill style={{ padding: "80px 140px" }}>
        <div style={{ ...rise(head), fontSize: 64, fontWeight: 650, letterSpacing: "-0.025em" }}>{DEMOS.learning.title}</div>
        <div style={{ ...rise(head), fontSize: 30, color: C.dim, marginTop: 12 }}>{DEMOS.learning.caption}</div>
      </AbsoluteFill>

      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {INPUTS.map((_, i) => (
          <Flow key={`in${i}`} x1={IN_X + CARD_W} y1={ROW(i) + 50} x2={MID_X} y2={ROW(1) + 50} p={flowIn} dot={(pulse + i / 3) % 1} />
        ))}
        {OUTPUTS.map((_, i) => (
          <Flow key={`out${i}`} x1={MID_X + CARD_W} y1={ROW(1) + 50} x2={OUT_X} y2={ROW(i) + 50} p={flowOut} dot={(pulse + i / 3) % 1} />
        ))}
      </svg>

      {INPUTS.map((c, i) => (
        <Card key={c.title} x={IN_X} y={ROW(i)} delay={10 + i * 10} {...c} />
      ))}
      {OUTPUTS.map((c, i) => (
        <Card key={c.title} x={OUT_X} y={ROW(i)} delay={190 + i * 10} {...c} accent />
      ))}

      {/* The model */}
      <div style={{ ...rise(model, 20), position: "absolute", left: MID_X, top: ROW(0) + 10, width: CARD_W, background: C.ink, color: "#fff", borderRadius: 20, padding: "28px 30px", boxShadow: "0 40px 80px -40px rgba(20,20,18,0.5)" }}>
        <div style={{ fontSize: 17, opacity: 0.6 }}>Your learner model</div>
        <div style={{ fontSize: 30, fontWeight: 600, marginTop: 4 }}>One profile, always current</div>
        <div style={{ display: "grid", gap: 16, marginTop: 26 }}>
          {SKILLS.map(([label, level, color], i) => {
            const fill = interpolate(frame, [100 + i * 12, 150 + i * 12], [0, level], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <div key={label}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, opacity: 0.85 }}>
                  <span>{label}</span>
                  <span>{Math.round(fill * 100)}%</span>
                </div>
                <div style={{ height: 8, borderRadius: 99, background: "rgba(255,255,255,0.14)", marginTop: 6 }}>
                  <div style={{ height: 8, width: `${fill * 100}%`, borderRadius: 99, background: color }} />
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: 17, opacity: 0.6, marginTop: 24, lineHeight: 1.4 }}>Plus a written profile Claude reads before teaching you.</div>
      </div>

      <AbsoluteFill style={{ justifyContent: "flex-end", padding: "0 140px 70px" }}>
        <div style={{ ...rise(foot), fontSize: 28, color: C.dim }}>Mastery fades with a 14-day half-life unless you show it again, so the profile stays honest.</div>
      </AbsoluteFill>
    </Page>
  );
}

function Card({ x, y, title, detail, delay, accent = false }: { x: number; y: number; title: string; detail: string; delay: number; accent?: boolean }) {
  const p = useEnter(delay);
  return (
    <div style={{ ...rise(p, 16), position: "absolute", left: x, top: y, width: CARD_W, height: 100, borderRadius: 16, border: `1px solid ${accent ? "rgba(31,95,209,0.25)" : C.lineStrong}`, background: accent ? C.accentSoft : "#fff", padding: "18px 24px", boxSizing: "border-box" }}>
      <div style={{ fontSize: 26, fontWeight: 600, color: accent ? C.accent : C.ink }}>{title}</div>
      <div style={{ fontSize: 19, color: C.dim, marginTop: 4 }}>{detail}</div>
    </div>
  );
}

function Flow({ x1, y1, x2, y2, p, dot }: { x1: number; y1: number; x2: number; y2: number; p: number; dot: number }) {
  const mx = (x1 + x2) / 2;
  const d = `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;
  // Cubic point at t for the moving dot.
  const t = dot;
  const bx = (1 - t) ** 3 * x1 + 3 * (1 - t) ** 2 * t * mx + 3 * (1 - t) * t ** 2 * mx + t ** 3 * x2;
  const by = (1 - t) ** 3 * y1 + 3 * (1 - t) ** 2 * t * y1 + 3 * (1 - t) * t ** 2 * y2 + t ** 3 * y2;
  return (
    <g>
      <path d={d} fill="none" stroke={C.lineStrong} strokeWidth={3} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} />
      {p >= 1 && <circle cx={bx} cy={by} r={6} fill={C.accent} />}
    </g>
  );
}
