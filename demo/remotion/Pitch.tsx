import { createContext, useContext, type CSSProperties, type ReactNode } from "react";
import "@fontsource/caveat/600.css";
import { AbsoluteFill, Audio, continueRender, delayRender, Easing, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Logo, LogoMark } from "./parts";
import { C, FONT, MONO } from "./theme";
import { CAPTIONS, VO_SECONDS } from "./pitchCaptions";

// The two-minute pitch: every scene is cut to the voiceover (demo/out/raw/voiceover.mp3) using
// the word timings in pitchCaptions.ts, with burned-in captions. All data on screen is dummy
// data shaped exactly like the real product's (marks, learner events, profile, MCP tools).

const FPS = 30;
const f = (s: number) => Math.round(s * FPS);
export const PITCH_FRAMES = f(VO_SECONDS + 0.8);

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.bezier(0.16, 1, 0.3, 1);
/** Playback speed for a scene reused in another video (Part2.tsx): 1.5 plays it 1.5x faster. */
export const TimeScale = createContext(1);
/** Seconds since the enclosing Sequence started, in the scene's own timeline. */
const useT = () => (useCurrentFrame() / FPS) * useContext(TimeScale);
/** 0 → 1 over `dur` seconds from `at`. */
const ramp = (t: number, at: number, dur = 0.45) => interpolate(t, [at, at + dur], [0, 1], { ...clamp, easing: ease });
const show = (p: number, px = 18): CSSProperties => ({ opacity: p, transform: `translateY(${(1 - p) * px}px)` });
const typed = (text: string, t: number, at: number, cps = 38) => text.slice(0, Math.max(0, Math.floor((t - at) * cps)));

/** A scene placed at absolute voiceover seconds [from, to). */
function Scene({ from, to, children, bg = C.ground }: { from: number; to: number; children: ReactNode; bg?: string }) {
  return (
    <Sequence from={f(from)} durationInFrames={f(to - from)}>
      <SceneFade len={to - from} bg={bg}>
        {children}
      </SceneFade>
    </Sequence>
  );
}

function SceneFade({ len, bg, children }: { len: number; bg: string; children: ReactNode }) {
  const t = useT();
  const o = interpolate(t, [0, 0.25, len - 0.25, len], [0, 1, 1, 0], clamp);
  return <AbsoluteFill style={{ background: bg, opacity: o, fontFamily: FONT, color: C.ink }}>{children}</AbsoluteFill>;
}

export function Pitch() {
  return (
    <AbsoluteFill style={{ background: C.ground, fontFamily: FONT }}>
      <Audio src={staticFile("voiceover.mp3")} />
      <Scene from={0} to={7.05}>
        <Intro />
      </Scene>
      <Scene from={7.05} to={22.0}>
        <Hook />
      </Scene>
      <Scene from={22.0} to={27.1} bg={C.sunken}>
        <Solution />
      </Scene>
      <Scene from={27.1} to={43.45} bg={C.sunken}>
        <Demo />
      </Scene>
      <Scene from={43.45} to={63.4}>
        <Memory />
      </Scene>
      <Scene from={63.4} to={72.9} bg={C.sunken}>
        <PracticeWhiteboard />
      </Scene>
      <Scene from={72.9} to={81.5}>
        <Compounds />
      </Scene>
      <Scene from={81.5} to={95.2}>
        <Agents />
      </Scene>
      <Scene from={95.2} to={110.7} bg={C.sunken}>
        <ClaudeSession />
      </Scene>
      <Scene from={110.7} to={VO_SECONDS + 0.8}>
        <Close />
      </Scene>
      <Captions />
    </AbsoluteFill>
  );
}

// ── Shared pieces ───────────────────────────────────────────────────────────────────────────

function Captions() {
  const t = useCurrentFrame() / FPS;
  const cap = CAPTIONS.find(([a, b]) => t >= a - 0.05 && t <= b + 0.25);
  if (!cap) return null;
  const o = interpolate(t, [cap[0] - 0.05, cap[0] + 0.1, cap[1] + 0.1, cap[1] + 0.25], [0, 1, 1, 0], clamp);
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 34, pointerEvents: "none" }}>
      <div style={{ opacity: o, background: "rgba(25,25,23,0.92)", color: "#fff", fontSize: 36, fontWeight: 550, lineHeight: 1.25, padding: "12px 26px", borderRadius: 14, maxWidth: 1500, textAlign: "center" }}>{cap[2]}</div>
    </AbsoluteFill>
  );
}

export function Tag({ children, tone = C.dim }: { children: ReactNode; tone?: string }) {
  return <span style={{ fontSize: 17, fontWeight: 650, letterSpacing: "0.08em", textTransform: "uppercase", color: tone, border: `1.5px solid ${tone}`, borderRadius: 999, padding: "6px 14px" }}>{children}</span>;
}

/** Track label in the top-right corner of a scene. */
export function Track({ name }: { name: string }) {
  const p = ramp(useT(), 0.2);
  return (
    <div style={{ position: "absolute", right: 56, top: 44, opacity: p }}>
      <Tag tone={C.accent}>{name}</Tag>
    </div>
  );
}

function Window({ x, y, w, h, url, children, style }: { x: number; y: number; w: number; h: number; url: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: 18, overflow: "hidden", background: "#fff", border: `1px solid ${C.lineStrong}`, boxShadow: "0 2px 4px rgba(20,20,18,0.05), 0 40px 80px -40px rgba(20,20,18,0.35)", ...style }}>
      <div style={{ height: 46, display: "flex", alignItems: "center", gap: 9, padding: "0 18px", background: C.sunken, borderBottom: `1px solid ${C.line}` }}>
        {[0, 1, 2].map((i) => (
          <span key={i} style={{ width: 12, height: 12, borderRadius: 99, background: C.lineStrong }} />
        ))}
        <div style={{ marginLeft: 14, flex: 1, height: 28, borderRadius: 8, background: "#fff", border: `1px solid ${C.line}`, display: "flex", alignItems: "center", padding: "0 14px", fontSize: 16, color: C.dim }}>{url}</div>
      </div>
      <div style={{ position: "relative", height: h - 46 }}>{children}</div>
    </div>
  );
}

type Key = [s: number, x: number, y: number, click?: boolean];
function Cursor({ path }: { path: Key[] }) {
  const t = useT();
  const at = path.map((k) => k[0]);
  const x = interpolate(t, at, path.map((k) => k[1]), { ...clamp, easing: ease });
  const y = interpolate(t, at, path.map((k) => k[2]), { ...clamp, easing: ease });
  const click = path.filter((k) => k[3]).map((k) => t - k[0]).find((d) => d >= 0 && d < 0.45);
  return (
    <div style={{ position: "absolute", left: x, top: y, zIndex: 60, pointerEvents: "none" }}>
      {click !== undefined && <span style={{ position: "absolute", left: -20, top: -20, width: 40, height: 40, borderRadius: 99, border: `2.5px solid ${C.accent}`, opacity: 1 - click / 0.45, transform: `scale(${0.5 + click * 2})` }} />}
      <svg width="28" height="32" viewBox="0 0 26 30" style={{ position: "absolute", left: -3, top: -2 }}>
        <path d="M3 2 L3 24 L9 18.5 L13 27 L17 25 L13 16.5 L21 16.5 Z" fill={C.ink} stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

const HAND = "Caveat, 'Segoe Print', cursive";
// Hold the first frame until the handwriting font has loaded.
if (typeof document !== "undefined") {
  const handle = delayRender("Caveat font");
  document.fonts.load("600 40px Caveat").then(() => continueRender(handle), () => continueRender(handle));
}

// ── 0:00 Intro ──────────────────────────────────────────────────────────────────────────────

function Intro() {
  const t = useT();
  const people = [
    { at: 0.7, name: "Philip", detail: "Freshman · USC" },
    { at: 3.0, name: "Sachchit", detail: "Freshman · UC Berkeley" },
  ];
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ ...show(ramp(t, 0)), marginBottom: 46 }}>
        <Logo size={76} />
      </div>
      <div style={{ display: "flex", gap: 36 }}>
        {people.map((p) => (
          <div key={p.name} style={{ ...show(ramp(t, p.at), 22), width: 380, border: `1px solid ${C.lineStrong}`, borderRadius: 18, padding: "22px 28px", background: "#fff" }}>
            <div style={{ fontSize: 34, fontWeight: 650 }}>{p.name}</div>
            <div style={{ fontSize: 22, color: C.dim, marginTop: 4 }}>{p.detail}</div>
          </div>
        ))}
      </div>
      <div style={{ ...show(ramp(t, 5.2)), marginTop: 48, display: "flex", gap: 14 }}>
        {["Continual Learning", "Design", "Agents", "Scale"].map((x) => (
          <Tag key={x}>{x}</Tag>
        ))}
      </div>
    </AbsoluteFill>
  );
}

// ── 0:07 Hook ───────────────────────────────────────────────────────────────────────────────

function Hook() {
  const t = useT();
  const stats = [
    { at: 0.2, value: 95, suffix: "%", label: "of UK undergraduates use AI", src: "HEPI 2026" },
    { at: 2.9, value: 94, suffix: "%", label: "use it on assessed work", src: "HEPI 2026" },
    { at: 4.8, value: -17, suffix: "%", label: "exam score after practicing with plain ChatGPT, once it was taken away", src: "PNAS 2025", bad: true },
  ];
  const end = ramp(t, 13.1, 0.5);
  return (
    <AbsoluteFill style={{ padding: "0 140px 120px", justifyContent: "center" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.25fr", gap: 60, opacity: 1 - end * 0.85, filter: `blur(${end * 3}px)` }}>
        {stats.map((s) => {
          const p = ramp(t, s.at, 0.6);
          const n = Math.round(interpolate(t, [s.at, s.at + 1.2], [0, s.value], { ...clamp, easing: ease }));
          return (
            <div key={s.label} style={show(p, 30)}>
              <div style={{ fontSize: 168, fontWeight: 700, letterSpacing: "-0.04em", color: s.bad ? C.danger : C.ink, fontVariantNumeric: "tabular-nums" }}>
                {n > 0 && s.value < 0 ? "" : n < 0 ? "−" : ""}
                {Math.abs(n)}
                {s.suffix}
              </div>
              <div style={{ fontSize: 30, color: C.ink2, lineHeight: 1.3, marginTop: 6 }}>{s.label}</div>
              <div style={{ marginTop: 22 }}>
                <Tag>{s.src}</Tag>
              </div>
            </div>
          );
        })}
      </div>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: end }}>
        <div style={{ fontSize: 104, fontWeight: 700, letterSpacing: "-0.035em", transform: `scale(${0.94 + end * 0.06})` }}>Answers aren&apos;t learning.</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

// ── 0:22 Solution + setup in three steps ────────────────────────────────────────────────────

function Solution() {
  const t = useT();
  const steps = ["Install the extension", "Pair it with a code", "Connect your Claude"];
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 120, top: 210, width: 640 }}>
        <div style={show(ramp(t, 0.1))}>
          <Logo size={56} />
        </div>
        <div style={{ ...show(ramp(t, 0.4)), fontSize: 58, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.08, marginTop: 30 }}>Checks your work while you do it.</div>
        <div style={{ ...show(ramp(t, 2.5)), fontSize: 32, color: C.dim, marginTop: 18 }}>Teaches instead of telling.</div>
        <div style={{ marginTop: 46, display: "grid", gap: 14 }}>
          {steps.map((s, i) => (
            <div key={s} style={{ ...show(ramp(t, 1.6 + i * 0.55), 12), display: "flex", alignItems: "center", gap: 16, fontSize: 25 }}>
              <span style={{ width: 36, height: 36, borderRadius: 99, background: C.ink, color: "#fff", display: "grid", placeItems: "center", fontSize: 18, fontWeight: 700 }}>{i + 1}</span>
              {s}
            </div>
          ))}
        </div>
        <div style={{ ...show(ramp(t, 3.4)), fontSize: 19, color: C.dim, marginTop: 22 }}>Full setup walkthrough: Setup guide in the dashboard.</div>
      </div>
      <Window x={860} y={140} w={940} h={700} url="kami.app / worksheet-4.pdf" style={{ ...show(ramp(t, 0.3), 40) }}>
        <Worksheet t={0} />
        <Pill t={t} pressAt={99} />
      </Window>
    </AbsoluteFill>
  );
}

/** The StudyLens dock pill, bottom-right of the page. */
function Pill({ t, pressAt, checking = false }: { t: number; pressAt: number; checking?: boolean }) {
  const pressed = t > pressAt && t < pressAt + 0.25;
  const p = ramp(t, 0.8);
  return (
    <div style={{ position: "absolute", right: 26, bottom: 24, display: "flex", alignItems: "center", gap: 6, background: C.ink, borderRadius: 999, padding: 6, transform: `scale(${pressed ? 0.95 : 1}) translateY(${(1 - p) * 30}px)`, opacity: p, boxShadow: "0 18px 40px -18px rgba(20,20,18,0.6)" }}>
      <span style={{ width: 36, height: 36, display: "grid", placeItems: "center" }}>
        <LogoMark size={30} />
      </span>
      <span style={{ background: "#fff", color: C.ink, borderRadius: 999, padding: "9px 20px", fontSize: 19, fontWeight: 650 }}>{checking ? "Checking…" : "Check my work"}</span>
      <span style={{ color: "#fff", padding: "9px 16px", fontSize: 19 }}>Ask</span>
    </div>
  );
}

// ── 0:27 Demo: checking real homework ───────────────────────────────────────────────────────

/** Example homework in a Kami-like PDF viewer. Student work is "handwritten". */
function Worksheet(_: { t: number }) {
  return (
    <AbsoluteFill style={{ background: "#525659", alignItems: "center" }}>
      <div style={{ position: "relative", width: 700, height: 1000, marginTop: 18, background: "#fff", padding: "34px 48px", boxSizing: "border-box", transformOrigin: "top center" }}>
        <div style={{ fontSize: 26, fontWeight: 650 }}>Worksheet 4: Linear equations</div>
        <div style={{ fontSize: 15, color: C.dim, marginTop: 4 }}>Algebra 1 · Due tomorrow · Show your work</div>
        <Problem n={1} q="Solve for x:  3x + 5 = 20" lines={["3x = 20 + 5", "3x = 25", "x = 25/3"]} top={92} />
        <Problem n={2} q="Solve for y:  2y − 4 = 10" lines={["2y = 14", "y = 7"]} top={330} />
        <Problem n={3} q="Solve for n:  4(n − 2) = 24" lines={["4n − 8 = 24", "4n = 32", "n = 8"]} top={510} messy />
      </div>
    </AbsoluteFill>
  );
}

function Problem({ n, q, lines, top, messy }: { n: number; q: string; lines: string[]; top: number; messy?: boolean }) {
  return (
    <div style={{ position: "absolute", left: 48, top }}>
      <div style={{ fontSize: 19, color: C.ink2 }}>
        {n}. {q}
      </div>
      {lines.map((l, i) => (
        <div key={l} style={{ fontFamily: HAND, fontWeight: 600, fontSize: 40, lineHeight: 1.05, color: C.pen, marginTop: i ? 6 : 14, marginLeft: 56, ...(messy && i === lines.length - 1 ? { transform: "rotate(-4deg) skewX(-8deg)", letterSpacing: "-0.04em" } : {}) }}>
          {l}
        </div>
      ))}
    </div>
  );
}

function Demo() {
  const t = useT();
  // Voiceover anchors (seconds from 27.1): click 0.4, reading 1.5-4.7, red 5.0, green 6.6, amber 7.9,
  // belief 11.1, one question 12.3, interact 13.6.
  const reading = t >= 1.0 && t < 4.9;
  const stage = t < 1.6 ? 0 : t < 3.6 ? 1 : 2;
  const scan = interpolate(t, [1.4, 4.7], [0, 1], clamp);
  const red = interpolate(t, [5.0, 5.7], [0, 1], { ...clamp, easing: ease });
  const green = ramp(t, 6.6);
  const amber = interpolate(t, [7.9, 8.6], [0, 1], { ...clamp, easing: ease });
  const panel = ramp(t, 0.6);
  const belief = ramp(t, 11.1);
  const question = ramp(t, 12.3);
  const pop = ramp(t, 14.2, 0.3);
  // Page geometry: the worksheet is 700 wide, centred in a 1180-wide window body.
  const PX = 240;
  return (
    <AbsoluteFill>
      <Track name="Design" />
      <Window x={70} y={70} w={1180} h={890} url="kami.app / worksheet-4.pdf">
        <Worksheet t={t} />
        {reading && <div style={{ position: "absolute", left: PX, width: 700, top: 18 + scan * 800, height: 90, background: "linear-gradient(180deg, rgba(31,95,209,0) 0%, rgba(31,95,209,0.16) 60%, rgba(31,95,209,0.5) 100%)", pointerEvents: "none" }} />}
        {/* Red: line 1 of problem 1 */}
        <svg style={{ position: "absolute", left: PX + 92, top: 128, overflow: "visible" }} width={260} height={64}>
          <ellipse cx={130} cy={32} rx={138} ry={34} fill="none" stroke={C.danger} strokeWidth={4.5} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - red} strokeLinecap="round" />
        </svg>
        {red > 0.9 && <Note x={PX + 380} y={120} tone={C.danger} label="Mistake" text="To undo +5, subtract 5 from both sides: 3x = 15." p={ramp(t, 5.6)} />}
        {/* Green: problem 2 */}
        <div style={{ position: "absolute", left: PX + 300, top: 392, fontSize: 64, color: C.good, fontWeight: 700, opacity: green, transform: `scale(${0.6 + green * 0.4})` }}>✓</div>
        {green > 0.5 && <Note x={PX + 380} y={378} tone={C.good} label="Nailed it" text="Clean inverse operations." p={green} />}
        {/* Amber: messy last line of problem 3 */}
        <svg style={{ position: "absolute", left: PX + 92, top: 650, overflow: "visible" }} width={150} height={56}>
          <ellipse cx={75} cy={28} rx={84} ry={32} fill="none" stroke={C.warn} strokeWidth={4} strokeDasharray="0.03 0.025" pathLength={1} opacity={amber} />
        </svg>
        {amber > 0.5 && <Note x={PX + 380} y={636} tone={C.warn} label="Can't read this" text="Is this an 8 or a 6?" p={amber} />}
        {/* Interaction: clicking the red circle */}
        {t > 14.0 && (
          <div style={{ ...show(pop, 8), position: "absolute", left: PX + 110, top: 205, width: 430, background: "#fff", border: `1px solid ${C.lineStrong}`, borderRadius: 14, padding: 16, boxShadow: "0 24px 50px -20px rgba(20,20,18,0.45)", zIndex: 20 }}>
            <div style={{ fontSize: 16, lineHeight: 1.4 }}>Moving +5 across the equals sign changes it to −5.</div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              {["Explain it", "Practice this", "That's wrong"].map((b, i) => (
                <span key={b} style={{ whiteSpace: "nowrap", fontSize: 15, fontWeight: 600, padding: "8px 12px", borderRadius: 8, background: i === 0 ? C.ink : "#fff", color: i === 0 ? "#fff" : C.ink, border: i === 0 ? "none" : `1px solid ${C.lineStrong}` }}>
                  {b}
                </span>
              ))}
            </div>
          </div>
        )}
        <Pill t={t} pressAt={0.4} checking={t > 0.5 && t < 4.9} />
      </Window>

      {/* StudyLens panel */}
      <div style={{ ...show(panel, 20), position: "absolute", left: 1290, top: 70, width: 560, display: "grid", gap: 16 }}>
        <div style={{ background: "#fff", border: `1px solid ${C.lineStrong}`, borderRadius: 18, padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <LogoMark size={30} />
            <span style={{ fontSize: 22, fontWeight: 650 }}>Check my work</span>
          </div>
          <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
            {["Capturing your screen", "Reading your work", "Placing marks"].map((s, i) => {
              const done = t >= 4.9 || i < stage;
              const now = !done && i === stage;
              return (
                <div key={s} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 20, color: done ? C.dim : C.ink }}>
                  <span style={{ width: 14, height: 14, borderRadius: 99, background: done ? C.good : now ? C.accent : C.line, boxShadow: now ? `0 0 0 ${5 + Math.sin(t * 8) * 3}px ${C.accentSoft}` : "none" }} />
                  {s}
                </div>
              );
            })}
          </div>
          {t > 5 && (
            <div style={{ ...show(ramp(t, 5.1)), marginTop: 18, display: "flex", gap: 10 }}>
              <Count n={1} color={C.danger} label="to fix" />
              <Count n={1} color={C.good} label="nailed" />
              <Count n={1} color={C.warn} label="unsure" />
            </div>
          )}
        </div>
        <div style={{ ...show(belief, 16), background: "#fff", border: `1px solid ${C.lineStrong}`, borderRadius: 18, padding: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 650, color: C.dim, textTransform: "uppercase", letterSpacing: "0.06em" }}>The belief behind it</div>
          <div style={{ fontSize: 22, marginTop: 8, lineHeight: 1.4 }}>&ldquo;A term keeps its sign when it moves across the equals sign.&rdquo;</div>
        </div>
        <div style={{ ...show(question, 16), background: C.accentSoft, color: C.accent, borderRadius: 18, padding: 24, fontSize: 24, lineHeight: 1.4, fontWeight: 550 }}>
          What do you do to both sides to undo &ldquo;+ 5&rdquo;?
          <div style={{ fontSize: 16, color: C.dim, fontWeight: 400, marginTop: 8 }}>One question. No answer given.</div>
        </div>
      </div>
      <Cursor path={[[0, 900, 760], [0.35, 1105, 905, true], [1.2, 1000, 700], [13.4, 520, 230], [13.9, 470, 215, true], [15.5, 470, 215]]} />
    </AbsoluteFill>
  );
}

function Count({ n, color, label }: { n: number; color: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 18, padding: "6px 12px", borderRadius: 99, background: C.sunken }}>
      <span style={{ width: 10, height: 10, borderRadius: 99, background: color }} />
      {n} {label}
    </span>
  );
}

function Note({ x, y, tone, label, text, p }: { x: number; y: number; tone: string; label: string; text: string; p: number }) {
  return (
    <div style={{ ...show(p, 8), position: "absolute", left: x, top: y, width: 300, background: "#fff", borderLeft: `5px solid ${tone}`, borderRadius: 10, padding: "10px 14px", boxShadow: "0 12px 28px -14px rgba(20,20,18,0.4)" }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: tone, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
      <div style={{ fontSize: 17, marginTop: 3, lineHeight: 1.35 }}>{text}</div>
    </div>
  );
}

// ── 0:43 Memory: school + work + Claude → one learner model ─────────────────────────────────

const SOURCES = [
  { title: "Your school", sub: "Canvas · Google Classroom", items: ["Quiz 2 due Thursday", "Worksheet 3 graded 14/20", "Syllabus: Unit 4 equations"], color: "#0b874b" },
  { title: "Your work", sub: "Checks · practice · explanations", items: ["Check: sign error, line 1", "Practice: 2 of 3 right", "Asked: why subtract first?"], color: C.accent },
  { title: "Your Claude window", sub: "Through the MCP connector", items: ["Observed: prefers one worked example", "Goal: B+ in Algebra 1", "Demonstrated: combining like terms ✓"], color: "#c96442" },
];

export function Memory() {
  const t = useT();
  // Anchors (seconds from 43.45): sources 0.3, log 2.8, mastery 8.0, decay 10.0, fold 14.4, profile 16.5.
  const logP = ramp(t, 2.8);
  const masteryP = ramp(t, 8.0);
  const fold = ramp(t, 14.4);
  const profile = ramp(t, 16.2);
  const events = Math.min(25, Math.floor(interpolate(t, [3.0, 15.0], [11, 25], clamp)));
  return (
    <AbsoluteFill>
      <Track name="Continual Learning" />
      <div style={{ position: "absolute", left: 90, top: 60, fontSize: 44, fontWeight: 700, letterSpacing: "-0.02em", ...show(ramp(t, 0)) }}>One memory, from everywhere you learn</div>

      {/* Sources */}
      {SOURCES.map((s, i) => (
        <div key={s.title} style={{ ...show(ramp(t, 0.3 + i * 0.5), 16), position: "absolute", left: 90, top: 160 + i * 250, width: 470, background: "#fff", border: `1px solid ${C.lineStrong}`, borderRadius: 18, padding: "20px 24px", borderTop: `5px solid ${s.color}` }}>
          <div style={{ fontSize: 26, fontWeight: 650 }}>{s.title}</div>
          <div style={{ fontSize: 17, color: C.dim }}>{s.sub}</div>
          <div style={{ display: "grid", gap: 6, marginTop: 12 }}>
            {s.items.map((it, j) => (
              <div key={it} style={{ ...show(ramp(t, 1.2 + i * 0.5 + j * 0.25), 6), fontSize: 17, background: C.sunken, borderRadius: 8, padding: "6px 10px" }}>
                {it}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Flows into the log */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {SOURCES.map((s, i) => {
          const y1 = 270 + i * 250;
          const d = `M560,${y1} C640,${y1} 640,520 720,520`;
          const dot = ((t * 0.6 + i / 3) % 1) || 0;
          return (
            <g key={s.title} opacity={logP}>
              <path d={d} fill="none" stroke={C.lineStrong} strokeWidth={3} />
              <circle r={7} fill={s.color} cx={560 + dot * 160} cy={y1 + (520 - y1) * (dot * dot * (3 - 2 * dot))} />
            </g>
          );
        })}
      </svg>

      {/* Evidence log */}
      <div style={{ ...show(logP, 16), position: "absolute", left: 720, top: 170, width: 420, height: 700, background: C.ink, color: "#fff", borderRadius: 20, padding: 24, overflow: "hidden" }}>
        <div style={{ fontSize: 15, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Evidence log</div>
        <div style={{ fontSize: 26, fontWeight: 650, marginTop: 4 }}>learner_events</div>
        <div style={{ display: "grid", gap: 8, marginTop: 18, fontFamily: MONO, fontSize: 15 }}>
          {LOG.map((e, i) => {
            const p = ramp(t, 3.2 + i * 0.6, 0.3);
            return (
              <div key={i} style={{ ...show(p, 10), display: "flex", gap: 10, background: "rgba(255,255,255,0.07)", borderRadius: 8, padding: "7px 10px" }}>
                <span style={{ color: e[0] === "course" ? "#6fd39a" : e[0] === "claude" ? "#f0a481" : "#8fb6ff", width: 64 }}>{e[0]}</span>
                <span style={{ opacity: 0.9 }}>{e[1]}</span>
              </div>
            );
          })}
        </div>
        <div style={{ position: "absolute", left: 24, right: 24, bottom: 22, display: "flex", alignItems: "center", gap: 12, fontSize: 18 }}>
          <span style={{ fontFamily: MONO, fontSize: 30, fontWeight: 700, color: events >= 25 ? "#6fd39a" : "#fff" }}>{events}</span>
          <span style={{ opacity: 0.7 }}>/ 25 new events {events >= 25 ? "→ fold into profile" : "until the next fold"}</span>
        </div>
      </div>

      {/* Mastery with decay */}
      <div style={{ ...show(masteryP, 16), position: "absolute", left: 1200, top: 150, width: 640, background: "#fff", border: `1px solid ${C.lineStrong}`, borderRadius: 20, padding: 26, opacity: masteryP * (1 - fold * 0.25) }}>
        <div style={{ fontSize: 15, fontWeight: 650, color: C.dim, textTransform: "uppercase", letterSpacing: "0.06em" }}>Mastery, recomputed on every read</div>
        <DecayChart t={t} />
      </div>

      {/* Versioned profile */}
      <div style={{ ...show(profile, 20), position: "absolute", left: 1200, top: 640, width: 640, background: "#fff", border: `1.5px solid ${C.ink}`, borderRadius: 20, padding: 26 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 15, fontWeight: 650, color: C.dim, textTransform: "uppercase", letterSpacing: "0.06em" }}>Learner profile</span>
          <span style={{ fontFamily: MONO, fontSize: 15, background: C.sunken, borderRadius: 6, padding: "3px 8px" }}>{t < 17.4 ? "v3" : "v4"}</span>
          <span style={{ marginLeft: "auto", fontSize: 15, color: C.accent, fontWeight: 600 }}>✎ Edit</span>
        </div>
        <div style={{ fontSize: 19, lineHeight: 1.5, marginTop: 12, color: C.ink2 }}>
          They learn best from <b>one worked example, then a try</b>.{" "}
          <span style={{ background: t > 17.4 ? "rgba(46,135,87,0.14)" : "transparent", borderRadius: 4 }}>{typed("Still drops the sign when distributing a negative; ask before correcting.", t, 17.4, 48)}</span>
        </div>
      </div>
    </AbsoluteFill>
  );
}

const LOG: [string, string][] = [
  ["course", "assignment_due  Quiz 2 · Thu"],
  ["usage", "check  1 error · inverse ops"],
  ["claude", "observation  prefers examples"],
  ["usage", "practice  correct · 2-step eqs"],
  ["course", "grade_posted  WS3 14/20"],
  ["claude", "demonstration  like terms ✓"],
  ["usage", "explain  why subtract first?"],
  ["usage", "practice  wrong · distributing"],
  ["claude", "goal  B+ in Algebra 1"],
  ["usage", "check  1 error · signs"],
];

/** Evidence weight halving every 14 days, and skill bars that fade without fresh evidence. */
function DecayChart({ t }: { t: number }) {
  const W = 588;
  const H = 150;
  const draw = interpolate(t, [10.0, 12.6], [0, 1], clamp);
  const pts = Array.from({ length: 50 }, (_, i) => {
    const day = (i / 49) * 56;
    return `${(day / 56) * W},${H - Math.pow(0.5, day / 14) * (H - 10)}`;
  }).join(" ");
  const skills: [string, number, number][] = [
    ["combining like terms", 0.92, 0.9],
    ["two-step equations", 0.68, 0.61],
    ["distributing a negative", 0.38, 0.38],
  ];
  const fade = interpolate(t, [11.0, 13.0], [0, 1], clamp);
  return (
    <div>
      <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
        {skills.map(([label, a, b]) => {
          const v = a + (b - a) * fade;
          const color = v > 0.8 ? C.good : v > 0.5 ? C.warn : C.danger;
          return (
            <div key={label}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18 }}>
                <span>{label}</span>
                <span style={{ fontVariantNumeric: "tabular-nums", color: C.dim }}>{Math.round(v * 100)}%</span>
              </div>
              <div style={{ height: 9, borderRadius: 9, background: C.sunken, marginTop: 5 }}>
                <div style={{ height: 9, width: `${v * 100}%`, borderRadius: 9, background: color }} />
              </div>
            </div>
          );
        })}
      </div>
      <svg width={W} height={H + 30} style={{ marginTop: 18, overflow: "visible" }}>
        <line x1={0} y1={H} x2={W} y2={H} stroke={C.line} />
        {[14, 28, 42].map((d) => (
          <g key={d}>
            <line x1={(d / 56) * W} y1={0} x2={(d / 56) * W} y2={H} stroke={C.line} strokeDasharray="4 6" />
            <text x={(d / 56) * W} y={H + 22} fontSize={14} fill={C.dim} textAnchor="middle" fontFamily={FONT}>
              {d} days
            </text>
          </g>
        ))}
        <polyline points={pts} fill="none" stroke={C.accent} strokeWidth={4} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
        <text x={(14 / 56) * W + 10} y={22} fontSize={15} fill={C.accent} fontFamily={FONT} opacity={draw}>
          evidence weight halves every 14 days
        </text>
      </svg>
    </div>
  );
}

// ── 1:03 Practice + whiteboard + skill turns green ─────────────────────────────────────────

function PracticeWhiteboard() {
  const t = useT();
  // Anchors (seconds from 63.4): question 0.2, wrong answer 1.6, whiteboard 2.6, spacing 4.2, green 6.8.
  const answer = typed("-3x - 12", t, 1.0, 12);
  const graded = ramp(t, 1.9);
  const board = ramp(t, 2.5);
  const spaced = ramp(t, 4.4);
  const green = interpolate(t, [6.8, 7.6], [0, 1], { ...clamp, easing: ease });
  const steps = [
    { tex: "−3(x − 4)", note: "distribute −3 to both terms" },
    { tex: "(−3)·x + (−3)·(−4)", note: "a negative times a negative…" },
    { tex: "−3x + 12", note: "…is positive" },
  ];
  return (
    <AbsoluteFill>
      <Track name="Continual Learning" />
      {/* Practice card */}
      <div style={{ ...show(ramp(t, 0.1), 16), position: "absolute", left: 90, top: 110, width: 700, background: "#fff", border: `1px solid ${C.lineStrong}`, borderRadius: 20, overflow: "hidden" }}>
        <div style={{ padding: 28 }}>
          <span style={{ fontSize: 15, fontWeight: 600, background: C.sunken, borderRadius: 99, padding: "5px 12px" }}>distributing a negative</span>
          <div style={{ fontSize: 15, color: C.dim, marginTop: 14 }}>Aimed at: &ldquo;the sign only applies to the first term&rdquo;</div>
          <div style={{ fontSize: 34, fontWeight: 600, marginTop: 10 }}>Expand: −3(x − 4)</div>
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <div style={{ flex: 1, height: 54, borderRadius: 10, border: `1.5px solid ${t < 1.9 ? C.accent : C.lineStrong}`, display: "flex", alignItems: "center", padding: "0 16px", fontSize: 24, fontFamily: MONO }}>{answer}</div>
            <span style={{ height: 54, padding: "0 24px", borderRadius: 10, background: C.ink, color: "#fff", display: "grid", placeItems: "center", fontSize: 20, fontWeight: 600 }}>Check</span>
          </div>
        </div>
        <div style={{ ...show(graded, 8), background: C.dangerSoft, padding: "18px 28px", fontSize: 20 }}>
          <b style={{ color: C.danger }}>Not yet.</b> The −3 multiplies the −4 too. <span style={{ color: C.accent, fontWeight: 600 }}>Show me ▸</span>
        </div>
      </div>

      {/* Whiteboard */}
      <div style={{ ...show(board, 20), position: "absolute", left: 90, top: 520, width: 700, height: 400, background: "#fbfaf7", border: `1px solid ${C.lineStrong}`, borderRadius: 20, padding: 28, backgroundImage: "radial-gradient(rgba(25,25,23,0.08) 1.2px, transparent 1.2px)", backgroundSize: "22px 22px" }}>
        <div style={{ fontSize: 15, fontWeight: 650, color: C.dim, textTransform: "uppercase", letterSpacing: "0.06em" }}>Whiteboard</div>
        {steps.map((s, i) => {
          const p = ramp(t, 2.8 + i * 0.6);
          return (
            <div key={s.tex} style={{ ...show(p, 10), display: "flex", alignItems: "baseline", gap: 22, marginTop: i ? 22 : 18 }}>
              <span style={{ fontFamily: "'KaTeX_Main', 'Times New Roman', serif", fontSize: 40, color: i === 2 ? C.good : C.ink, minWidth: 380 }}>{s.tex}</span>
              <span style={{ fontSize: 18, color: C.accent }}>{s.note}</span>
            </div>
          );
        })}
      </div>

      {/* Spaced review */}
      <div style={{ ...show(spaced, 16), position: "absolute", left: 860, top: 110, width: 980, background: "#fff", border: `1px solid ${C.lineStrong}`, borderRadius: 20, padding: 28 }}>
        <div style={{ fontSize: 15, fontWeight: 650, color: C.dim, textTransform: "uppercase", letterSpacing: "0.06em" }}>Comes back before you forget (SM-2)</div>
        <div style={{ position: "relative", height: 90, marginTop: 18 }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 40, height: 3, background: C.line }} />
          {[
            ["Today", 0],
            ["Tomorrow", 0.12],
            ["4 days", 0.34],
            ["11 days", 0.66],
            ["4 weeks", 1],
          ].map(([l, x], i) => (
            <div key={l as string} style={{ ...show(ramp(t, 4.6 + i * 0.25), 8), position: "absolute", left: `calc(${(x as number) * 92}% )`, top: 26, textAlign: "center" }}>
              <div style={{ width: 30, height: 30, borderRadius: 99, background: i === 0 ? C.danger : C.accent, border: "4px solid #fff", boxShadow: `0 0 0 1.5px ${i === 0 ? C.danger : C.accent}` }} />
              <div style={{ fontSize: 16, color: C.dim, marginTop: 8, whiteSpace: "nowrap", transform: "translateX(-25%)" }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Skill turns green */}
      <SkillNode t={t} green={green} />
    </AbsoluteFill>
  );
}

function SkillNode({ t, green }: { t: number; green: number }) {
  const p = ramp(t, 5.6);
  const level = Math.round(38 + green * 44);
  const color = green < 0.5 ? C.danger : C.good;
  const others: [number, number, string, string][] = [
    [-260, -40, "combining like terms", C.good],
    [250, -70, "two-step equations", C.warn],
    [-200, 130, "checking by substitution", C.good],
    [230, 120, "inverse operations", C.warn],
  ];
  return (
    <div style={{ ...show(p, 20), position: "absolute", left: 860, top: 330, width: 980, height: 590, background: "#fff", border: `1px solid ${C.lineStrong}`, borderRadius: 20, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 28, top: 24, fontSize: 15, fontWeight: 650, color: C.dim, textTransform: "uppercase", letterSpacing: "0.06em" }}>Skills map</div>
      <svg width={980} height={590} style={{ position: "absolute", inset: 0 }}>
        {others.map(([dx, dy]) => (
          <line key={`${dx}${dy}`} x1={490} y1={300} x2={490 + dx} y2={300 + dy} stroke={C.line} strokeWidth={3} />
        ))}
      </svg>
      {others.map(([dx, dy, l, c]) => (
        <div key={l} style={{ position: "absolute", left: 490 + dx, top: 300 + dy, transform: "translate(-50%,-50%)", textAlign: "center" }}>
          <div style={{ width: 26, height: 26, borderRadius: 99, background: c, margin: "0 auto", opacity: 0.8 }} />
          <div style={{ fontSize: 16, color: C.dim, marginTop: 6, whiteSpace: "nowrap" }}>{l}</div>
        </div>
      ))}
      <div style={{ position: "absolute", left: 490, top: 300, transform: "translate(-50%,-50%)", textAlign: "center" }}>
        <div style={{ width: 70, height: 70, borderRadius: 99, background: color, margin: "0 auto", boxShadow: `0 0 0 ${10 + green * 14}px ${green < 0.5 ? C.dangerSoft : C.goodSoft}`, transform: `scale(${1 + Math.sin(green * Math.PI) * 0.18})` }} />
        <div style={{ fontSize: 22, fontWeight: 650, marginTop: 16 }}>distributing a negative</div>
        <div style={{ fontSize: 18, color, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
          {level}% · {green < 0.5 ? "Shaky" : "Solid"}
        </div>
      </div>
    </div>
  );
}

// ── 1:13 Compounds across students ──────────────────────────────────────────────────────────

export function Compounds() {
  const t = useT();
  // Anchors (seconds from 72.9): title 0.2, disputes 1.4, examples 3.0, sharper 4.6.
  const N = 72;
  const count = Math.round(interpolate(t, [1.6, 7.4], [0, 1284], clamp));
  const sharp = ramp(t, 4.6, 1.2);
  return (
    <AbsoluteFill>
      <Track name="Continual Learning" />
      <div style={{ position: "absolute", left: 90, top: 60, fontSize: 44, fontWeight: 700, letterSpacing: "-0.02em", ...show(ramp(t, 0)) }}>Every student makes it sharper for the next</div>
      <div style={{ position: "absolute", left: 90, top: 160, width: 640, display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 14 }}>
        {Array.from({ length: N }, (_, i) => {
          const at = 1.2 + ((i * 37) % N) * 0.075;
          const p = ramp(t, at, 0.25);
          const flagged = i % 3 === 0;
          return (
            <div key={i} style={{ position: "relative", height: 62 }}>
              <div style={{ width: 52, height: 52, borderRadius: 99, background: C.sunken, border: `2px solid ${flagged && p > 0.5 ? C.danger : C.line}`, display: "grid", placeItems: "center", fontSize: 22, color: C.dim }}>●</div>
              {flagged && <span style={{ position: "absolute", right: 0, top: -6, fontSize: 14, fontWeight: 700, background: C.danger, color: "#fff", borderRadius: 99, padding: "2px 6px", opacity: p, transform: `scale(${p})` }}>✕</span>}
            </div>
          );
        })}
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <path d="M740 480 C 830 480, 830 480, 900 480" stroke={C.lineStrong} strokeWidth={4} fill="none" markerEnd="url(#a)" opacity={ramp(t, 2.6)} />
        <defs>
          <marker id="a" markerWidth="10" markerHeight="10" refX="6" refY="5" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill={C.lineStrong} />
          </marker>
        </defs>
      </svg>
      <div style={{ ...show(ramp(t, 2.8), 16), position: "absolute", left: 920, top: 300, width: 420, background: C.ink, color: "#fff", borderRadius: 20, padding: 26 }}>
        <div style={{ fontSize: 15, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Labeled examples</div>
        <div style={{ fontFamily: MONO, fontSize: 64, fontWeight: 700, marginTop: 8, fontVariantNumeric: "tabular-nums" }}>{count.toLocaleString("en-US")}</div>
        <div style={{ display: "grid", gap: 8, marginTop: 14, fontSize: 16, fontFamily: MONO }}>
          {["mark wrong · misread 6 as 8", "grade disputed · 0.5 = 1/2", "mark wrong · correct step circled"].map((x, i) => (
            <div key={x} style={{ ...show(ramp(t, 3.4 + i * 0.5), 6), background: "rgba(255,255,255,0.08)", borderRadius: 8, padding: "7px 10px" }}>
              {x}
            </div>
          ))}
        </div>
      </div>
      <div style={{ ...show(ramp(t, 4.4), 16), position: "absolute", left: 1390, top: 300, width: 440, background: "#fff", border: `1.5px solid ${C.ink}`, borderRadius: 20, padding: 26 }}>
        <div style={{ fontSize: 15, fontWeight: 650, color: C.dim, textTransform: "uppercase", letterSpacing: "0.06em" }}>The checker</div>
        <div style={{ fontSize: 22, marginTop: 10, lineHeight: 1.45 }}>Re-tested on every labeled example before a prompt or verifier change ships.</div>
        <div style={{ marginTop: 22, display: "flex", alignItems: "center", gap: 16 }}>
          <svg width={120} height={120} viewBox="0 0 120 120">
            <circle cx={60} cy={60} r={50} fill="none" stroke={C.sunken} strokeWidth={12} />
            <circle cx={60} cy={60} r={50} fill="none" stroke={C.good} strokeWidth={12} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - (0.35 + sharp * 0.55)} transform="rotate(-90 60 60)" strokeLinecap="round" />
          </svg>
          <div style={{ fontSize: 20, color: C.ink2 }}>More students,
            <br />
            more examples,
            <br />
            sharper checks.</div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ── 1:21 Agents: what counts as failure and what happens next ───────────────────────────────

export function Agents() {
  const t = useT();
  // Anchors (seconds from 81.5): failure 0.2, verifiers 3.3, contradiction 3.8-8.6, retry 8.8, dropped 11.6.
  const checks = [
    { at: 3.4, text: "Every error mark has a note" },
    { at: 3.8, text: "Summary agrees with the marks", fail: true },
    { at: 4.2, text: "No duplicate or zero-size marks" },
    { at: 4.6, text: "Answer is one of its own options" },
    { at: 5.0, text: "Grade agrees with its own score" },
  ];
  const caught = ramp(t, 6.2);
  const retry = ramp(t, 8.8);
  const passed = ramp(t, 10.4);
  const dropped = ramp(t, 11.6);
  return (
    <AbsoluteFill>
      <Track name="Agents" />
      <div style={{ position: "absolute", left: 90, top: 60, ...show(ramp(t, 0)) }}>
        <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: "-0.02em" }}>The failure we design against: wrong feedback</div>
        <div style={{ fontSize: 24, color: C.dim, marginTop: 8 }}>Every model step is checked before a student sees it.</div>
      </div>

      {/* Model output */}
      <div style={{ ...show(ramp(t, 1.4), 16), position: "absolute", left: 90, top: 240, width: 470, background: "#fff", border: `1px solid ${C.lineStrong}`, borderRadius: 20, padding: 24 }}>
        <div style={{ fontSize: 15, fontWeight: 650, color: C.dim, textTransform: "uppercase", letterSpacing: "0.06em" }}>Model output · check</div>
        <div style={{ fontSize: 21, marginTop: 12, lineHeight: 1.45, background: caught > 0 ? `rgba(179,55,43,${0.1 * caught})` : "transparent", borderRadius: 8, padding: "4px 6px" }}>&ldquo;Looks perfect, no mistakes!&rdquo;</div>
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          {[0, 1].map((i) => (
            <span key={i} style={{ fontSize: 17, borderRadius: 8, padding: "6px 10px", background: C.dangerSoft, color: C.danger, fontWeight: 600 }}>
              ● error mark
            </span>
          ))}
        </div>
      </div>

      {/* Verifiers */}
      <div style={{ ...show(ramp(t, 3.1), 16), position: "absolute", left: 640, top: 240, width: 560, background: C.ink, color: "#fff", borderRadius: 20, padding: 26 }}>
        <div style={{ fontSize: 15, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Verifiers</div>
        <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
          {checks.map((c) => {
            const p = ramp(t, c.at, 0.3);
            const bad = c.fail && t > 6.2 && t < 10.4;
            return (
              <div key={c.text} style={{ ...show(p, 8), display: "flex", alignItems: "center", gap: 12, fontSize: 20, padding: "8px 12px", borderRadius: 10, background: bad ? "rgba(179,55,43,0.35)" : "rgba(255,255,255,0.06)" }}>
                <span style={{ width: 26, height: 26, borderRadius: 99, display: "grid", placeItems: "center", fontSize: 15, fontWeight: 800, background: bad ? C.danger : C.good }}>{bad ? "✕" : "✓"}</span>
                {c.text}
              </div>
            );
          })}
        </div>
        {t > 6.2 && t < 10.4 && <div style={{ ...show(caught, 6), marginTop: 14, fontFamily: MONO, fontSize: 16, color: "#ffb3a8" }}>summary_contradicts_marks · repairable</div>}
      </div>

      {/* Outcomes */}
      <div style={{ position: "absolute", left: 1270, top: 240, width: 560, display: "grid", gap: 16 }}>
        <div style={{ ...show(retry, 14), background: "#fff", border: `1px solid ${C.lineStrong}`, borderRadius: 18, padding: 22 }}>
          <div style={{ fontSize: 22, fontWeight: 650 }}>↻ Retry once, with a critique</div>
          <div style={{ fontFamily: MONO, fontSize: 15, color: C.ink2, marginTop: 10, lineHeight: 1.5 }}>&ldquo;Your previous answer failed these checks: summary says no mistakes but 2 error marks exist. Fix only these problems.&rdquo;</div>
          {passed > 0 && <div style={{ ...show(passed, 6), marginTop: 10, fontSize: 18, color: C.good, fontWeight: 650 }}>✓ Passed on retry → repaired</div>}
        </div>
        <div style={{ ...show(dropped, 14), background: "#fff", border: `1px solid ${C.lineStrong}`, borderRadius: 18, padding: 22 }}>
          <div style={{ fontSize: 22, fontWeight: 650 }}>✂ Not fixable? Patch or drop</div>
          <div style={{ fontSize: 18, color: C.ink2, marginTop: 8, lineHeight: 1.45 }}>Duplicate marks removed. A practice question whose answer isn&apos;t among its options never reaches the student.</div>
        </div>
      </div>

      {/* Breaker + log */}
      <div style={{ ...show(ramp(t, 12.2), 14), position: "absolute", left: 90, top: 600, right: 90, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        {[
          ["Logged", "Every run: outcome, violations, latency (agent_runs)"],
          ["Circuit breaker", "If 30% of the last 20 runs fail, skip extra calls until it recovers"],
          ["Students report too", "“That mark was wrong” and disputed grades are tracked separately"],
        ].map(([h, d]) => (
          <div key={h} style={{ background: C.sunken, borderRadius: 16, padding: "18px 22px" }}>
            <div style={{ fontSize: 20, fontWeight: 650 }}>{h}</div>
            <div style={{ fontSize: 17, color: C.dim, marginTop: 4, lineHeight: 1.4 }}>{d}</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
}

// ── 1:35 A session on Claude ────────────────────────────────────────────────────────────────

function ClaudeSession() {
  const t = useT();
  // Anchors (seconds from 95.2): connector 0.1, own Claude 2.1, keys 5.0, pricing 7.9.
  const reply = "I see it. In line 1 you added 5 instead of subtracting it, and you've done that with signs before. What undoes \"+ 5\"?";
  const marks = interpolate(t, [3.9, 4.6], [0, 1], { ...clamp, easing: ease });
  const keys = ramp(t, 5.0);
  const price = ramp(t, 7.9);
  return (
    <AbsoluteFill>
      <Track name="Scale" />
      {/* Claude Desktop */}
      <div style={{ ...show(ramp(t, 0.1), 20), position: "absolute", left: 70, top: 70, width: 900, height: 860, background: "#faf9f5", border: `1px solid ${C.lineStrong}`, borderRadius: 18, overflow: "hidden", boxShadow: "0 40px 80px -40px rgba(20,20,18,0.35)" }}>
        <div style={{ height: 52, display: "flex", alignItems: "center", gap: 12, padding: "0 20px", borderBottom: `1px solid ${C.line}`, fontSize: 18, fontWeight: 600 }}>
          <span style={{ width: 22, height: 22, borderRadius: 6, background: "#c96442" }} /> Claude
          <span style={{ marginLeft: "auto", fontSize: 15, color: C.dim, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 9, height: 9, borderRadius: 9, background: C.good }} /> StudyLens connected
          </span>
        </div>
        <div style={{ padding: "26px 34px", display: "grid", gap: 18 }}>
          <div style={{ ...show(ramp(t, 0.3), 8), justifySelf: "end", background: "#efede6", borderRadius: 16, padding: "12px 18px", fontSize: 21 }}>Check my work with StudyLens</div>
          <ToolCall t={t} at={0.9} name="get_pending_check" result={<Thumb />} />
          <ToolCall t={t} at={1.6} name="get_learner_profile" result="Weak: distributing a negative (38%) · prefers one worked example · Quiz 2 Thursday" />
          {t > 2.6 && <div style={{ fontSize: 21, lineHeight: 1.5 }}>{typed(reply, t, 2.6, 60)}</div>}
          <ToolCall t={t} at={3.6} name="submit_check_result" result="3 marks sent to the student's page" />
          <ToolCall t={t} at={4.4} name="record_observation" result="confusion · signs when moving terms" />
        </div>
      </div>

      {/* The student's page, getting the marks */}
      <Window x={1010} y={70} w={840} h={520} url="kami.app / worksheet-4.pdf" style={{ ...show(ramp(t, 0.4), 20) }}>
        <div style={{ transform: "scale(0.62)", transformOrigin: "top left", width: 1355, height: 760, position: "relative" }}>
          <Worksheet t={0} />
          <svg style={{ position: "absolute", left: 420, top: 128, overflow: "visible" }} width={260} height={64}>
            <ellipse cx={130} cy={32} rx={138} ry={34} fill="none" stroke={C.danger} strokeWidth={6} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - marks} strokeLinecap="round" />
          </svg>
          <div style={{ position: "absolute", left: 628, top: 392, fontSize: 64, color: C.good, fontWeight: 700, opacity: marks }}>✓</div>
        </div>
      </Window>

      {/* Answer keys stay on the server */}
      <div style={{ ...show(keys, 14), position: "absolute", left: 1010, top: 620, width: 840, display: "flex", alignItems: "center", gap: 18, background: "#fff", border: `1px solid ${C.lineStrong}`, borderRadius: 18, padding: "20px 24px" }}>
        <span style={{ fontSize: 34 }}>🔒</span>
        <div>
          <div style={{ fontSize: 22, fontWeight: 650 }}>Answer keys never reach the browser</div>
          <div style={{ fontSize: 17, color: C.dim, marginTop: 2 }}>Practice is graded on the server; the page only ever gets the question.</div>
        </div>
      </div>

      {/* Pricing */}
      <div style={{ ...show(price, 14), position: "absolute", left: 1010, top: 760, width: 840, display: "flex", gap: 16 }}>
        <div style={{ flex: 1, background: C.ink, color: "#fff", borderRadius: 18, padding: "20px 24px" }}>
          <div style={{ fontSize: 15, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Pricing</div>
          <div style={{ fontSize: 26, fontWeight: 650, marginTop: 6 }}>Free trial → monthly plan</div>
        </div>
        <div style={{ flex: 1.3, background: "#fff", border: `1px solid ${C.lineStrong}`, borderRadius: 18, padding: "20px 24px" }}>
          <div style={{ fontSize: 22, fontWeight: 650 }}>Runs on your own Claude</div>
          <div style={{ fontSize: 17, color: C.dim, marginTop: 4 }}>No markup on AI usage.</div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

function ToolCall({ t, at, name, result }: { t: number; at: number; name: string; result: ReactNode }) {
  const p = ramp(t, at, 0.3);
  const open = ramp(t, at + 0.35, 0.3);
  if (t < at) return null;
  return (
    <div style={{ ...show(p, 8), justifySelf: "start", border: `1px solid ${C.line}`, borderRadius: 12, padding: "10px 16px", background: "#fff", maxWidth: 780 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 17, color: C.dim }}>
        <span style={{ width: 9, height: 9, borderRadius: 9, background: open >= 1 ? C.good : C.faint }} />
        StudyLens <span style={{ fontFamily: MONO, color: C.ink }}>{name}</span>
      </div>
      <div style={{ opacity: open, marginTop: 6 * open, fontSize: 17, color: C.ink2 }}>{result}</div>
    </div>
  );
}

function Thumb() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 96, height: 64, borderRadius: 6, background: "#525659", display: "grid", placeItems: "center" }}>
        <div style={{ width: 48, height: 58, background: "#fff", borderRadius: 2 }} />
      </div>
      screenshot · kami.app · with marking instructions
    </div>
  );
}

// ── 1:51 Close ──────────────────────────────────────────────────────────────────────────────

function Close() {
  const t = useT();
  // Anchors (seconds from 110.7): free 0.15, understanding 1.9, students 3.7, tagline 6.0.
  const a = ramp(t, 0.15);
  const b = ramp(t, 1.9);
  const road = ramp(t, 3.6);
  const end = ramp(t, 6.0, 0.6);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", opacity: 1 - end, transform: `translateY(${-end * 30}px)` }}>
        <div style={{ ...show(a), fontSize: 82, fontWeight: 700, letterSpacing: "-0.03em", color: C.dim }}>AI made answers free.</div>
        <div style={{ ...show(b), fontSize: 82, fontWeight: 700, letterSpacing: "-0.03em", marginTop: 6 }}>The next winner sells understanding.</div>
        <div style={{ ...show(road, 12), display: "flex", justifyContent: "center", alignItems: "center", gap: 22, marginTop: 48, fontSize: 30, fontWeight: 600 }}>
          <span style={{ background: C.ink, color: "#fff", borderRadius: 99, padding: "10px 26px" }}>Students</span>
          <span style={{ color: C.faint }}>→</span>
          <span style={{ border: `2px solid ${C.ink}`, borderRadius: 99, padding: "8px 24px" }}>Schools</span>
        </div>
      </div>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: end }}>
        <Logo size={96} />
        <div style={{ fontSize: 46, fontWeight: 650, letterSpacing: "-0.02em", marginTop: 34 }}>Feedback while you work, not after the grade.</div>
        <div style={{ display: "flex", gap: 14, marginTop: 34 }}>
          {["Continual Learning", "Design", "Agents", "Scale"].map((x) => (
            <Tag key={x}>{x}</Tag>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
