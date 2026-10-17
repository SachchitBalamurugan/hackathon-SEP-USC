import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT } from "./theme";

/** 0 → 1 spring starting at `delay` frames, for entrances. */
export function useEnter(delay = 0, damping = 18) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping, mass: 0.7 } });
}

export const rise = (p: number, px = 24): CSSProperties => ({ opacity: p, transform: `translateY(${(1 - p) * px}px)` });

/** The StudyLens mark (web/src/components/Logo.tsx). */
export function LogoMark({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect x="1" y="1" width="30" height="30" rx="9" fill={C.ink} />
      <path d="M8 10.5h10M8 15h7M8 19.5h5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" opacity="0.55" />
      <circle cx="19.5" cy="17.5" r="5.2" stroke="#fff" strokeWidth="2" />
      <path d="M23.4 21.4 26 24" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ size = 56 }: { size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.32 }}>
      <LogoMark size={size} />
      <span style={{ fontFamily: FONT, fontSize: size * 0.56, fontWeight: 600, letterSpacing: "-0.01em", color: C.ink }}>StudyLens</span>
    </div>
  );
}

export function Page({ children, bg = C.ground }: { children: ReactNode; bg?: string }) {
  return <AbsoluteFill style={{ background: bg, fontFamily: FONT, color: C.ink }}>{children}</AbsoluteFill>;
}

export function TitleCard({ title, caption }: { title: string; caption: string }) {
  const frame = useCurrentFrame();
  const a = useEnter(2);
  const b = useEnter(8);
  const c = useEnter(14);
  const out = interpolate(frame, [48, 60], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <Page>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 36, opacity: out }}>
        <div style={rise(a)}>
          <Logo size={52} />
        </div>
        <div style={{ ...rise(b), fontSize: 76, fontWeight: 650, letterSpacing: "-0.025em", textAlign: "center" }}>{title}</div>
        <div style={{ ...rise(c), fontSize: 34, color: C.dim, maxWidth: 1180, textAlign: "center", lineHeight: 1.35 }}>{caption}</div>
      </AbsoluteFill>
    </Page>
  );
}

export function EndCard({ line }: { line: string }) {
  const a = useEnter(0);
  const b = useEnter(6);
  return (
    <Page>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 28 }}>
        <div style={rise(a)}>
          <Logo size={64} />
        </div>
        <div style={{ ...rise(b), fontSize: 32, color: C.dim }}>{line}</div>
      </AbsoluteFill>
    </Page>
  );
}

/** Caption pill along the bottom, faded in and out over its window. */
export function Caption({ text, from, to }: { text: string; from: number; to: number }) {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [from, from + 8, to - 8, to], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const y = interpolate(frame, [from, from + 12], [16, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (frame < from || frame > to) return null;
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 46, pointerEvents: "none" }}>
      <div
        style={{
          opacity: o,
          transform: `translateY(${y}px)`,
          background: C.ink,
          color: "#fff",
          fontSize: 34,
          fontWeight: 550,
          padding: "16px 30px",
          borderRadius: 999,
          boxShadow: "0 18px 40px -18px rgba(20,20,18,0.5)",
          maxWidth: 1500,
          textAlign: "center",
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
}

/** A plain browser window around a screen recording. */
export function BrowserFrame({ children, url, width, height }: { children: ReactNode; url: string; width: number; height: number }) {
  return (
    <div style={{ width, borderRadius: 18, overflow: "hidden", border: `1px solid ${C.lineStrong}`, background: C.ground, boxShadow: "0 2px 4px rgba(20,20,18,0.05), 0 40px 80px -40px rgba(20,20,18,0.35)" }}>
      <div style={{ height: 44, display: "flex", alignItems: "center", gap: 10, padding: "0 18px", borderBottom: `1px solid ${C.line}`, background: C.sunken }}>
        {[0, 1, 2].map((i) => (
          <span key={i} style={{ width: 13, height: 13, borderRadius: 99, background: C.lineStrong }} />
        ))}
        <div style={{ marginLeft: 16, flex: 1, height: 28, borderRadius: 8, background: C.ground, border: `1px solid ${C.line}`, display: "flex", alignItems: "center", padding: "0 14px", fontSize: 16, color: C.dim }}>{url}</div>
      </div>
      <div style={{ width, height, position: "relative" }}>{children}</div>
    </div>
  );
}
