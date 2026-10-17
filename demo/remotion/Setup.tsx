import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from "remotion";
import { DEMOS } from "../../web/src/lib/demos";
import { Logo, LogoMark, Page, rise, useEnter } from "./parts";
import { C, MONO } from "./theme";

// The full setup walkthrough, drawn with dummy data so it needs no backend: account, extension
// download, loading it in Chrome, pairing, course sync, a first check, and connecting Claude.
// Mirrors the steps on /dashboard/connect and the checklist in SetupChecklist.tsx.

const WIN = { x: 600, y: 96, w: 1220, h: 888 };
const BODY_H = WIN.h - 48;

type Chapter = { title: string; detail: string; url: string; len: number; Scene: () => ReactNode };

const CHAPTERS: Chapter[] = [
  { title: "Create your account", detail: "Email and a password. No confirmation email.", url: "studylens / sign up", len: 190, Scene: Signup },
  { title: "Download the extension", detail: "Connect → Download extension, then unzip it.", url: "studylens / dashboard / connect", len: 200, Scene: Download },
  { title: "Load it in Chrome", detail: "chrome://extensions → Developer mode → Load unpacked.", url: "chrome://extensions", len: 250, Scene: LoadUnpacked },
  { title: "Pair it with your account", detail: "Get a code on Connect, type it in the extension.", url: "studylens / dashboard / connect", len: 230, Scene: Pair },
  { title: "Sync your courses", detail: "Open Canvas or Classroom once. That's it.", url: "canvas.school.edu / dashboard", len: 190, Scene: Sync },
  { title: "Check your work", detail: "On any homework page: Check my work (Alt+Shift+C).", url: "kami.app / worksheet-4.pdf", len: 200, Scene: CheckWork },
  { title: "Connect Claude (optional)", detail: "Create a key, paste the config, restart Claude.", url: "claude_desktop_config.json", len: 280, Scene: Claude },
];
const START = CHAPTERS.reduce<number[]>((a, c, i) => [...a, i ? a[i - 1] + CHAPTERS[i - 1].len : 30], []);
const OUTRO = 75;
export const SETUP_FRAMES = START[START.length - 1] + CHAPTERS[CHAPTERS.length - 1].len + OUTRO;

export function Setup() {
  const frame = useCurrentFrame();
  const end = SETUP_FRAMES - OUTRO;
  const current = CHAPTERS.findIndex((_, i) => frame < START[i] + CHAPTERS[i].len);
  const fadeOut = interpolate(frame, [end, end + 12], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const outro = interpolate(frame, [end + 8, end + 24], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const head = useEnter(0);
  return (
    <Page bg={C.sunken}>
      <AbsoluteFill style={{ opacity: fadeOut }}>
        {/* Step rail */}
        <div style={{ position: "absolute", left: 96, top: 96, width: 440 }}>
          <div style={rise(head)}>
            <Logo size={40} />
          </div>
          <div style={{ ...rise(head), fontSize: 46, fontWeight: 650, letterSpacing: "-0.02em", marginTop: 26, lineHeight: 1.1 }}>{DEMOS.setup.title}</div>
          <ol style={{ listStyle: "none", padding: 0, margin: "36px 0 0", display: "grid", gap: 10 }}>
            {CHAPTERS.map((c, i) => {
              const done = i < current || current === -1;
              const on = i === current;
              return (
                <li key={c.title} style={{ display: "flex", gap: 16, padding: "12px 16px", borderRadius: 14, background: on ? "#fff" : "transparent", boxShadow: on ? "0 1px 2px rgba(20,20,18,0.05), 0 12px 28px -18px rgba(20,20,18,0.3)" : "none" }}>
                  <span style={{ width: 30, height: 30, flexShrink: 0, borderRadius: 99, display: "grid", placeItems: "center", fontSize: 15, fontWeight: 650, background: done ? C.good : on ? C.ink : "transparent", color: done || on ? "#fff" : C.dim, border: done || on ? "none" : `1.5px solid ${C.lineStrong}` }}>
                    {done ? "✓" : i + 1}
                  </span>
                  <div>
                    <div style={{ fontSize: 21, fontWeight: on ? 650 : 500, color: done && !on ? C.dim : C.ink }}>{c.title}</div>
                    {on && <div style={{ fontSize: 16, color: C.dim, marginTop: 3, lineHeight: 1.35 }}>{c.detail}</div>}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Browser window */}
        <div style={{ position: "absolute", left: WIN.x, top: WIN.y, width: WIN.w, height: WIN.h, borderRadius: 18, overflow: "hidden", background: "#fff", border: `1px solid ${C.lineStrong}`, boxShadow: "0 2px 4px rgba(20,20,18,0.05), 0 40px 80px -40px rgba(20,20,18,0.35)" }}>
          <div style={{ height: 48, display: "flex", alignItems: "center", gap: 9, padding: "0 18px", background: C.sunken, borderBottom: `1px solid ${C.line}` }}>
            {[0, 1, 2].map((i) => (
              <span key={i} style={{ width: 12, height: 12, borderRadius: 99, background: C.lineStrong }} />
            ))}
            <div style={{ marginLeft: 14, flex: 1, height: 30, borderRadius: 8, background: "#fff", border: `1px solid ${C.line}`, display: "flex", alignItems: "center", padding: "0 14px", fontSize: 16, color: C.dim }}>{CHAPTERS[Math.max(0, current)]?.url}</div>
            {/* Pinned extension icon appears once it is loaded */}
            {frame > START[2] + 200 && (
              <span style={{ marginLeft: 6 }}>
                <LogoMark size={26} />
              </span>
            )}
          </div>
          <div style={{ position: "relative", height: BODY_H }}>
            {CHAPTERS.map((c, i) => (
              <Sequence key={c.title} from={START[i]} durationInFrames={c.len} layout="none">
                <ChapterFade len={c.len}>
                  <c.Scene />
                </ChapterFade>
              </Sequence>
            ))}
          </div>
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 24, opacity: outro }}>
        <Logo size={64} />
        <div style={{ fontSize: 36, fontWeight: 600 }}>You're set up.</div>
        <div style={{ fontSize: 26, color: C.dim }}>Watch this again any time from Setup guide in the sidebar.</div>
      </AbsoluteFill>
    </Page>
  );
}

function ChapterFade({ len, children }: { len: number; children: ReactNode }) {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 8, len - 8, len], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
}

// ── Primitives ──────────────────────────────────────────────────────────────────────────────

type Key = [frame: number, x: number, y: number, click?: boolean];

/** A cursor that glides between keyframes and pulses on clicks. */
function Cursor({ path }: { path: Key[] }) {
  const f = useCurrentFrame();
  const frames = path.map((k) => k[0]);
  const x = interpolate(f, frames, path.map((k) => k[1]), { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  const y = interpolate(f, frames, path.map((k) => k[2]), { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  const click = path.filter((k) => k[3]).map((k) => f - k[0]).find((d) => d >= 0 && d < 14);
  return (
    <div style={{ position: "absolute", left: x, top: y, pointerEvents: "none", zIndex: 50 }}>
      {click !== undefined && <span style={{ position: "absolute", left: -18, top: -18, width: 36, height: 36, borderRadius: 99, border: `2px solid ${C.accent}`, opacity: 1 - click / 14, transform: `scale(${0.6 + click / 14})` }} />}
      <svg width="26" height="30" viewBox="0 0 26 30" style={{ position: "absolute", left: -3, top: -2 }}>
        <path d="M3 2 L3 24 L9 18.5 L13 27 L17 25 L13 16.5 L21 16.5 Z" fill={C.ink} stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

const clickedAt = (f: number, at: number) => f >= at;
const typed = (f: number, text: string, start: number, cps = 1.2) => text.slice(0, Math.max(0, Math.floor((f - start) * cps)));

function Btn({ children, primary = true, pressed = false, style }: { children: ReactNode; primary?: boolean; pressed?: boolean; style?: CSSProperties }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 46, padding: "0 22px", borderRadius: 10, fontSize: 19, fontWeight: 600, background: primary ? C.ink : "#fff", color: primary ? "#fff" : C.ink, border: primary ? "none" : `1px solid ${C.lineStrong}`, transform: pressed ? "scale(0.97)" : "none", ...style }}>
      {children}
    </span>
  );
}

function Field({ label, value, focus = false }: { label: string; value: string; focus?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 600, color: C.ink2, marginBottom: 8 }}>{label}</div>
      <div style={{ height: 52, borderRadius: 10, border: `1.5px solid ${focus ? C.accent : C.lineStrong}`, display: "flex", alignItems: "center", padding: "0 16px", fontSize: 19 }}>
        {value}
        {focus && <span style={{ width: 2, height: 22, background: C.ink, marginLeft: 2 }} />}
      </div>
    </div>
  );
}

function Toast({ at, children }: { at: number; children: ReactNode }) {
  const p = useEnter(at);
  if (useCurrentFrame() < at) return null;
  return (
    <div style={{ ...rise(p, 16), position: "absolute", right: 28, bottom: 28, background: C.ink, color: "#fff", borderRadius: 14, padding: "16px 22px", fontSize: 19, display: "flex", alignItems: "center", gap: 12, zIndex: 40, boxShadow: "0 18px 40px -18px rgba(20,20,18,0.5)" }}>
      {children}
    </div>
  );
}

const Tick = () => <span style={{ color: C.good, fontWeight: 700 }}>✓</span>;

// ── Chapters ────────────────────────────────────────────────────────────────────────────────

function Signup() {
  const f = useCurrentFrame();
  const email = typed(f, "alex.rivera@school.edu", 24);
  const pass = "•".repeat(Math.max(0, Math.min(12, Math.floor((f - 60) * 0.8))));
  const submitted = clickedAt(f, 104);
  const dash = useEnter(118);
  return (
    <AbsoluteFill>
      {!submitted ? (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 460, display: "grid", gap: 22 }}>
            <LogoMark size={44} />
            <div style={{ fontSize: 34, fontWeight: 650 }}>Create your account</div>
            <Field label="Email" value={email} focus={f < 58} />
            <Field label="Password" value={pass} focus={f >= 58} />
            <Btn style={{ justifyContent: "center" }}>Create account</Btn>
          </div>
        </AbsoluteFill>
      ) : (
        <div style={{ ...rise(dash, 20), padding: 48 }}>
          <div style={{ fontSize: 34, fontWeight: 650 }}>Good afternoon</div>
          <div style={{ marginTop: 28, border: `1px solid ${C.line}`, borderRadius: 16 }}>
            <div style={{ padding: "18px 24px", borderBottom: `1px solid ${C.line}`, fontSize: 19, fontWeight: 600 }}>
              Get set up <span style={{ color: C.dim, fontWeight: 400, marginLeft: 10, fontSize: 16 }}>1 of 5 done. Each step ticks off by itself.</span>
            </div>
            {["Create your account", "Add the browser extension", "Sync your courses", "Check your first assignment", "Connect Claude (optional)"].map((s, i) => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 24px", borderBottom: i < 4 ? `1px solid ${C.line}` : "none", background: i === 1 ? C.sunken : "#fff" }}>
                <span style={{ width: 26, height: 26, borderRadius: 99, display: "grid", placeItems: "center", fontSize: 13, fontWeight: 700, background: i === 0 ? C.good : i === 1 ? C.ink : "transparent", color: i < 2 ? "#fff" : C.dim, border: i > 1 ? `1.5px solid ${C.lineStrong}` : "none" }}>{i === 0 ? "✓" : i + 1}</span>
                <span style={{ fontSize: 18, textDecoration: i === 0 ? "line-through" : "none", color: i === 0 ? C.dim : C.ink }}>{s}</span>
                {i === 1 && <Btn style={{ marginLeft: "auto", height: 38, fontSize: 16 }}>Install and pair</Btn>}
              </div>
            ))}
          </div>
        </div>
      )}
      <Cursor path={[[0, 900, 600], [20, 560, 392, true], [56, 560, 476, true], [92, 600, 560], [104, 600, 560, true], [150, 1060, 290], [175, 1060, 290, true]]} />
    </AbsoluteFill>
  );
}

function Download() {
  const f = useCurrentFrame();
  const clicked = clickedAt(f, 46);
  const done = interpolate(f, [52, 90], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const unzip = useEnter(120);
  return (
    <AbsoluteFill style={{ padding: 48 }}>
      <div style={{ fontSize: 34, fontWeight: 650 }}>Connect</div>
      <div style={{ marginTop: 26, border: `1.5px solid ${C.ink}`, borderRadius: 16, padding: 28 }}>
        <div style={{ fontSize: 22, fontWeight: 650 }}>1 · Install the browser extension</div>
        <div style={{ fontSize: 17, color: C.dim, marginTop: 6 }}>Works in Chrome, Edge, Arc and Brave.</div>
        <ol style={{ fontSize: 18, color: C.ink2, lineHeight: 1.8, margin: "14px 0 0", paddingLeft: 24 }}>
          <li>Download the extension and unzip it.</li>
          <li>Open chrome://extensions and turn on Developer mode.</li>
          <li>Click Load unpacked and pick the unzipped folder.</li>
        </ol>
        <div style={{ marginTop: 20 }}>
          <Btn primary={false} pressed={f > 44 && f < 52}>
            ⤓ Download extension
          </Btn>
        </div>
      </div>
      {clicked && (
        <div style={{ position: "absolute", right: 24, top: 14, width: 380, background: "#fff", border: `1px solid ${C.lineStrong}`, borderRadius: 14, padding: 18, boxShadow: "0 18px 40px -18px rgba(20,20,18,0.35)" }}>
          <div style={{ fontSize: 15, color: C.dim }}>Recent downloads</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
            <span style={{ width: 34, height: 40, borderRadius: 6, background: C.sunken, border: `1px solid ${C.line}`, display: "grid", placeItems: "center", fontSize: 12, color: C.dim }}>ZIP</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 600 }}>studylens-extension.zip</div>
              <div style={{ fontSize: 14, color: C.dim }}>{done < 1 ? `${Math.round(done * 357)} of 357 KB` : "357 KB · Done"}</div>
              <div style={{ height: 4, borderRadius: 9, background: C.sunken, marginTop: 6 }}>
                <div style={{ height: 4, borderRadius: 9, width: `${done * 100}%`, background: done < 1 ? C.accent : C.good }} />
              </div>
            </div>
          </div>
        </div>
      )}
      {f >= 120 && (
        <div style={{ ...rise(unzip, 18), position: "absolute", left: 48, right: 48, bottom: 40, display: "flex", alignItems: "center", gap: 28, background: C.sunken, borderRadius: 16, padding: "22px 28px" }}>
          <span style={{ fontSize: 17, fontWeight: 600, color: C.dim }}>Unzip it:</span>
          <span style={{ fontSize: 18 }}>studylens-extension.zip</span>
          <span style={{ fontSize: 22, color: C.dim }}>→</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 10, fontSize: 18, fontWeight: 600 }}>
            <Folder /> studylens
          </span>
          <span style={{ fontSize: 16, color: C.dim, marginLeft: "auto" }}>Keep this folder; Chrome loads it from here.</span>
        </div>
      )}
      <Cursor path={[[0, 700, 600], [36, 150, 438], [46, 150, 438, true], [100, 150, 438], [130, 400, 760]]} />
    </AbsoluteFill>
  );
}

const Folder = () => (
  <svg width="30" height="24" viewBox="0 0 30 24">
    <path d="M2 4a2 2 0 0 1 2-2h7l3 3h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2Z" fill="#e8b84a" />
  </svg>
);

function LoadUnpacked() {
  const f = useCurrentFrame();
  const dev = interpolate(f, [34, 42], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const picker = f >= 84 && f < 150;
  const loaded = useEnter(150);
  const pinned = f >= 200;
  return (
    <AbsoluteFill style={{ background: "#f8f9fa" }}>
      <div style={{ height: 70, display: "flex", alignItems: "center", padding: "0 32px", background: "#fff", borderBottom: `1px solid ${C.line}` }}>
        <span style={{ fontSize: 24, fontWeight: 500 }}>Extensions</span>
        <span style={{ marginLeft: "auto", fontSize: 17, color: C.ink2, display: "flex", alignItems: "center", gap: 12 }}>
          Developer mode
          <span style={{ width: 44, height: 24, borderRadius: 99, background: dev ? "#1a73e8" : "#bdc1c6", position: "relative" }}>
            <span style={{ position: "absolute", top: 3, left: 3 + dev * 20, width: 18, height: 18, borderRadius: 99, background: "#fff" }} />
          </span>
        </span>
      </div>
      <div style={{ height: 64, display: "flex", alignItems: "center", gap: 14, padding: "0 32px", background: "#fff", borderBottom: `1px solid ${C.line}`, opacity: dev }}>
        {["Load unpacked", "Pack extension", "Update"].map((b, i) => (
          <span key={b} style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #dadce0", fontSize: 16, color: "#1a73e8", fontWeight: 500, background: i === 0 && f > 70 && f < 84 ? "#e8f0fe" : "#fff" }}>
            {b}
          </span>
        ))}
      </div>
      {f >= 150 && (
        <div style={{ ...rise(loaded, 18), margin: 32, width: 420, background: "#fff", borderRadius: 10, border: "1px solid #dadce0", padding: 22 }}>
          <div style={{ display: "flex", gap: 16 }}>
            <LogoMark size={46} />
            <div>
              <div style={{ fontSize: 19, fontWeight: 600 }}>
                StudyLens <span style={{ color: C.dim, fontWeight: 400, fontSize: 15 }}>0.1.0</span>
              </div>
              <div style={{ fontSize: 15, color: C.dim, marginTop: 4, lineHeight: 1.35 }}>A tutor that knows your courses, checks your work on any page, and learns how you learn.</div>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
            <span style={{ width: 40, height: 22, borderRadius: 99, background: "#1a73e8", position: "relative" }}>
              <span style={{ position: "absolute", top: 3, right: 3, width: 16, height: 16, borderRadius: 99, background: "#fff" }} />
            </span>
          </div>
        </div>
      )}
      {picker && (
        <AbsoluteFill style={{ background: "rgba(20,20,18,0.25)", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 560, background: "#fff", borderRadius: 12, boxShadow: "0 30px 60px -20px rgba(0,0,0,0.4)", overflow: "hidden" }}>
            <div style={{ padding: "16px 22px", fontSize: 18, fontWeight: 600, borderBottom: `1px solid ${C.line}` }}>Select the extension directory</div>
            {["Desktop", "Documents", "studylens"].map((d) => (
              <div key={d} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 22px", fontSize: 17, background: d === "studylens" && f > 112 ? "#e8f0fe" : "#fff" }}>
                <Folder /> {d}
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "flex-end", padding: 16, borderTop: `1px solid ${C.line}` }}>
              <span style={{ padding: "8px 20px", borderRadius: 6, background: "#1a73e8", color: "#fff", fontSize: 16 }}>Select Folder</span>
            </div>
          </div>
        </AbsoluteFill>
      )}
      {pinned && (
        <div style={{ position: "absolute", right: 14, top: 8, background: C.ink, color: "#fff", fontSize: 15, padding: "8px 12px", borderRadius: 8 }}>Pinned to your toolbar ↑</div>
      )}
      <Cursor
        path={[
          [0, 600, 500],
          [28, 1150, 35],
          [34, 1150, 35, true],
          [64, 90, 102],
          [72, 90, 102, true],
          [104, 560, 512],
          [112, 560, 512, true],
          [128, 830, 573],
          [136, 830, 573, true],
          [180, 1100, -20],
          [192, 1100, -20, true],
          [240, 900, 400],
        ]}
      />
    </AbsoluteFill>
  );
}

function Pair() {
  const f = useCurrentFrame();
  const code = f >= 34 ? "KZ5268X6" : null;
  const popup = useEnter(80);
  const entry = typed(f, "KZ5268X6", 104, 0.45);
  const paired = f >= 140;
  return (
    <AbsoluteFill style={{ padding: 48 }}>
      <div style={{ fontSize: 34, fontWeight: 650 }}>Connect</div>
      <div style={{ marginTop: 26, border: `1.5px solid ${paired ? C.good : C.ink}`, borderRadius: 16, padding: 28, width: 620 }}>
        <div style={{ fontSize: 22, fontWeight: 650 }}>
          2 · Pair it with your account {paired && <Tick />}
        </div>
        <div style={{ fontSize: 17, color: C.dim, margin: "6px 0 20px" }}>Click the StudyLens icon in your toolbar and type this code.</div>
        {code ? (
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <span style={{ fontFamily: MONO, fontSize: 38, fontWeight: 650, letterSpacing: "0.26em", background: C.sunken, border: `1px solid ${C.lineStrong}`, borderRadius: 12, padding: "12px 22px" }}>{code}</span>
            <span style={{ fontSize: 16, color: C.dim }}>Expires in 4:{String(59 - Math.min(59, Math.floor((f - 34) / 30))).padStart(2, "0")}</span>
          </div>
        ) : (
          <Btn pressed={f > 26 && f < 34}>Get pairing code</Btn>
        )}
      </div>
      {f >= 80 && (
        <div style={{ ...rise(popup, 14), position: "absolute", right: 22, top: 6, width: 380, background: "#fff", border: `1px solid ${C.lineStrong}`, borderRadius: 14, padding: 22, boxShadow: "0 24px 50px -20px rgba(20,20,18,0.4)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <LogoMark size={28} />
            <span style={{ fontSize: 18, fontWeight: 650 }}>StudyLens</span>
          </div>
          {paired ? (
            <div style={{ marginTop: 18, fontSize: 19, display: "flex", alignItems: "center", gap: 10 }}>
              <Tick /> Paired as alex.rivera@school.edu
            </div>
          ) : (
            <>
              <div style={{ fontSize: 15, color: C.dim, margin: "12px 0" }}>Get a pairing code on your dashboard and type it here.</div>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1, height: 44, borderRadius: 8, border: `1.5px solid ${C.accent}`, display: "flex", alignItems: "center", padding: "0 12px", fontFamily: MONO, fontSize: 19, letterSpacing: "0.15em" }}>{entry || <span style={{ color: C.faint }}>ABCD2345</span>}</div>
                <Btn style={{ height: 44 }} pressed={f > 132 && f < 140}>
                  Pair
                </Btn>
              </div>
            </>
          )}
        </div>
      )}
      {paired && <Toast at={150}>Extension paired. Step 2 ticks off on its own.</Toast>}
      <Cursor path={[[0, 500, 600], [22, 160, 236], [28, 160, 236, true], [64, 600, 500], [76, 1180, -30], [80, 1180, -30, true], [98, 1020, 132], [128, 1150, 134], [134, 1150, 134, true], [200, 900, 500]]} />
    </AbsoluteFill>
  );
}

const COURSES = [
  { name: "Algebra 1", code: "MATH-101", color: "#0b874b" },
  { name: "Chemistry", code: "CHEM-110", color: "#c41e3a" },
  { name: "World History", code: "HIST-120", color: "#2d3b45" },
];

function Sync() {
  const f = useCurrentFrame();
  const synced = f >= 70;
  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "row", fontFamily: "Lato, 'Helvetica Neue', Arial, sans-serif", color: "#2d3b45" }}>
      <div style={{ width: 84, background: "#394b58" }} />
      <div style={{ flex: 1, padding: "28px 36px" }}>
        <div style={{ fontSize: 28, fontWeight: 300, paddingBottom: 18, borderBottom: "1px solid #c7cdd1" }}>Dashboard</div>
        <div style={{ display: "flex", gap: 24, marginTop: 28 }}>
          {COURSES.map((c) => (
            <div key={c.name} style={{ width: 300, border: "1px solid #c7cdd1", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: 130, background: c.color }} />
              <div style={{ padding: 14 }}>
                <div style={{ fontSize: 19, fontWeight: 700, color: c.color }}>{c.name}</div>
                <div style={{ fontSize: 15, color: "#6b7780" }}>{c.code}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 30, fontSize: 18, fontWeight: 700 }}>To Do</div>
        {["Worksheet 4: Solving Linear Equations · tomorrow", "Lab report: reaction rates · Friday", "Quiz 2: Two-step equations · Thursday"].map((t) => (
          <div key={t} style={{ fontSize: 16, padding: "10px 0", borderBottom: "1px solid #e1e4e6" }}>
            {t}
          </div>
        ))}
      </div>
      {synced && (
        <Toast at={70}>
          <LogoMark size={26} /> Synced 3 courses and 8 assignments
        </Toast>
      )}
      {f >= 120 && (
        <div style={{ ...rise(interpolate(f, [120, 140], [0, 1], { extrapolateRight: "clamp" }), 20), position: "absolute", left: 220, right: 60, top: 470, background: "#fff", border: `1px solid ${C.lineStrong}`, borderRadius: 16, boxShadow: "0 40px 80px -30px rgba(20,20,18,0.4)", fontFamily: "Inter, sans-serif", color: C.ink }}>
          <div style={{ padding: "16px 24px", fontSize: 19, fontWeight: 600, borderBottom: `1px solid ${C.line}` }}>StudyLens · Due in the next two weeks</div>
          {[["Worksheet 4: Solving Linear Equations", "Algebra 1", "Tomorrow"], ["Quiz 2: Two-step equations", "Algebra 1", "Thursday"], ["Lab report: reaction rates", "Chemistry", "Friday"]].map(([t, c, d]) => (
            <div key={t} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 24px", borderBottom: `1px solid ${C.line}` }}>
              <span style={{ width: 10, height: 10, borderRadius: 99, border: `2px solid ${d === "Tomorrow" ? "#a86516" : C.faint}` }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 17, fontWeight: 550 }}>{t}</div>
                <div style={{ fontSize: 14, color: C.dim }}>{c}</div>
              </div>
              <span style={{ fontSize: 15, color: C.dim }}>{d}</span>
            </div>
          ))}
        </div>
      )}
    </AbsoluteFill>
  );
}

function CheckWork() {
  const f = useCurrentFrame();
  const circle = interpolate(f, [62, 92], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const note = useEnter(94);
  const q = useEnter(120);
  const working = f >= 40 && f < 92;
  return (
    <AbsoluteFill style={{ background: "#525659", alignItems: "center" }}>
      <div style={{ position: "relative", width: 760, height: BODY_H - 40, marginTop: 20, background: "#fff", padding: "40px 56px", boxSizing: "border-box" }}>
        <div style={{ fontSize: 28, fontWeight: 600 }}>Worksheet 4: Linear equations</div>
        <div style={{ fontSize: 20, color: C.dim, marginTop: 16 }}>1. Solve for x: 3x + 5 = 20</div>
        {["3x = 20 + 5", "3x = 25", "x = 25/3"].map((t, i) => (
          <div key={t} style={{ fontFamily: "'Segoe Print', 'Bradley Hand', cursive", fontSize: 42, color: C.pen, marginTop: i ? 14 : 26, marginLeft: 70 }}>
            {t}
          </div>
        ))}
        <div style={{ fontSize: 20, color: C.dim, marginTop: 40 }}>2. Solve for y: 2y − 4 = 10</div>
        <svg style={{ position: "absolute", left: 104, top: 128, overflow: "visible" }} width={300} height={84}>
          <ellipse cx={150} cy={42} rx={152} ry={40} fill="none" stroke={C.danger} strokeWidth={4.5} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - circle} strokeLinecap="round" />
        </svg>
        {f >= 94 && (
          <div style={{ ...rise(note, 10), position: "absolute", left: 420, top: 132, width: 300, background: C.ink, color: "#fff", borderRadius: 12, padding: "12px 16px", fontSize: 18, lineHeight: 1.35 }}>
            <div style={{ fontSize: 13, opacity: 0.6 }}>Mistake</div>
            To undo +5, subtract 5 from both sides: 3x = 15.
          </div>
        )}
        {f >= 120 && <div style={{ ...rise(q, 10), position: "absolute", left: 56, right: 56, top: 460, background: C.accentSoft, color: C.accent, borderRadius: 12, padding: "14px 18px", fontSize: 19 }}>What do you do to both sides to undo “+ 5”?</div>}
      </div>
      <div style={{ position: "absolute", right: 30, bottom: 26, display: "flex", gap: 6, background: C.ink, borderRadius: 999, padding: 6, transform: f > 36 && f < 42 ? "scale(0.95)" : "none" }}>
        <span style={{ background: "#fff", color: C.ink, borderRadius: 999, padding: "9px 20px", fontSize: 18, fontWeight: 600 }}>{working ? "Checking…" : "Check my work"}</span>
        <span style={{ color: "#fff", padding: "9px 14px", fontSize: 18 }}>Ask</span>
      </div>
      <Cursor path={[[0, 600, 400], [30, 1040, 812], [38, 1040, 812, true], [140, 1000, 700]]} />
    </AbsoluteFill>
  );
}

function Claude() {
  const f = useCurrentFrame();
  const key = f >= 30;
  const paste = useEnter(70);
  const restart = useEnter(150);
  const chat = useEnter(186);
  const config = `{
  "mcpServers": {
    "studylens": {
      "command": "npx",
      "args": ["-y", "mcp-remote",
        "https://your-site/api/mcp",
        "--header", "Authorization:\${AUTH_HEADER}"],
      "env": { "AUTH_HEADER": "Bearer sl_Q7f…3kZ" }
    }
  }
}`;
  return (
    <AbsoluteFill style={{ padding: 40 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ fontSize: 22, fontWeight: 650 }}>3 · Connect Claude</span>
        {key ? <span style={{ fontFamily: MONO, fontSize: 17, background: C.sunken, border: `1px solid ${C.lineStrong}`, borderRadius: 8, padding: "8px 14px" }}>sl_Q7fW2mK9xLp0aV4r…3kZ</span> : <Btn pressed={f > 22 && f < 30}>Create a Claude key</Btn>}
        {key && <span style={{ fontSize: 15, color: C.dim }}>Shown once. It goes in the config below.</span>}
      </div>
      {f >= 70 && (
        <div style={{ ...rise(paste, 14), marginTop: 24, display: "flex", gap: 24 }}>
          <pre style={{ margin: 0, flex: "0 0 600px", fontFamily: MONO, fontSize: 16, lineHeight: 1.55, background: C.ink, color: "#e9e7e1", borderRadius: 14, padding: "20px 24px" }}>{config.slice(0, Math.max(0, Math.floor((f - 70) * 9)))}</pre>
          <div style={{ fontSize: 17, color: C.ink2, lineHeight: 1.6 }}>
            <div style={{ fontWeight: 650, color: C.ink }}>Claude Desktop</div>
            Paste into
            <div style={{ fontFamily: MONO, fontSize: 15, background: C.sunken, borderRadius: 6, padding: "4px 8px", margin: "6px 0" }}>%APPDATA%\Claude\claude_desktop_config.json</div>
            or on a Mac
            <div style={{ fontFamily: MONO, fontSize: 15, background: C.sunken, borderRadius: 6, padding: "4px 8px", margin: "6px 0" }}>~/Library/Application Support/Claude/</div>
            {f >= 150 && <div style={{ ...rise(restart, 8), marginTop: 12, fontWeight: 600, color: C.ink }}>Then quit Claude fully and reopen it.</div>}
          </div>
        </div>
      )}
      {f >= 186 && (
        <div style={{ ...rise(chat, 16), position: "absolute", left: 40, right: 40, bottom: 30, background: "#faf9f5", border: `1px solid ${C.lineStrong}`, borderRadius: 16, padding: "18px 24px", display: "grid", gap: 12 }}>
          <div style={{ alignSelf: "end", justifySelf: "end", background: "#efede6", borderRadius: 14, padding: "10px 16px", fontSize: 18 }}>Tutor me on what I got wrong this week</div>
          <div style={{ fontSize: 15, color: C.dim, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 9, height: 9, borderRadius: 9, background: C.good }} /> StudyLens <span style={{ fontFamily: MONO, color: C.ink }}>get_learner_profile</span>
          </div>
          <div style={{ fontSize: 18 }}>{typed(f, "This week you added 5 instead of subtracting it in Worksheet 4. Let's fix that first: what undoes “+ 5”?", 206, 1.5)}</div>
        </div>
      )}
      <Cursor path={[[0, 700, 500], [16, 300, 24], [24, 300, 24, true], [60, 700, 300]]} />
    </AbsoluteFill>
  );
}
