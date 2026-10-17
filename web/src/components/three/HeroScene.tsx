"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Html, RoundedBox } from "@react-three/drei";
import { Caveat } from "next/font/google";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import * as THREE from "three";

const hand = Caveat({ subsets: ["latin"], weight: ["500"] });

// A worksheet floats in soft light. Every 8 seconds a red ring traces around the wrong step and
// the tutor's note slides out beside it: the product in one loop.
const W = 1024;
const H = 1325;
const LOOP = 8;
const RING = { cx: 370, cy: 455, rx: 215, ry: 58 };

function drawSheet(ctx: CanvasRenderingContext2D, ring: number, family: string) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(31,95,209,0.10)";
  ctx.lineWidth = 2;
  for (let y = 250; y < H - 60; y += 70) {
    ctx.beginPath();
    ctx.moveTo(70, y);
    ctx.lineTo(W - 70, y);
    ctx.stroke();
  }
  ctx.fillStyle = "#191917";
  ctx.font = "600 44px Inter, system-ui, sans-serif";
  ctx.fillText("Worksheet 4: Linear equations", 80, 120);
  ctx.fillStyle = "#6f6b63";
  ctx.font = "30px Inter, system-ui, sans-serif";
  ctx.fillText("1.  Solve for x:   3x + 5 = 20", 80, 220);

  ctx.fillStyle = "#24408f";
  ctx.font = `74px ${family}`;
  ctx.fillText("3x = 20 + 5", 200, 478);
  ctx.fillText("3x = 25", 200, 618);
  ctx.fillText("x = 25/3", 200, 758);

  ctx.fillStyle = "#6f6b63";
  ctx.font = "30px Inter, system-ui, sans-serif";
  ctx.fillText("2.  Solve for y:   2y - 4 = 10", 80, 920);
  ctx.fillStyle = "#24408f";
  ctx.font = `74px ${family}`;
  ctx.fillText("2y = 14", 200, 1040);
  ctx.fillText("y = 7", 200, 1170);

  if (ring > 0) {
    ctx.strokeStyle = "#b3372b";
    ctx.lineWidth = 9;
    ctx.lineCap = "round";
    ctx.beginPath();
    const start = -Math.PI * 0.9;
    // Slightly more than a full turn, like a pen ring.
    ctx.ellipse(RING.cx, RING.cy, RING.rx, RING.ry, -0.04, start, start + Math.PI * 2.12 * ring);
    ctx.stroke();
  }
  // A green tick beside the correct answer.
  ctx.strokeStyle = "#2e8757";
  ctx.lineWidth = 9;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(470, 1150);
  ctx.lineTo(495, 1178);
  ctx.lineTo(545, 1115);
  ctx.stroke();
}

const ease = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

function Sheet({ reduced }: { reduced: boolean }) {
  const group = useRef<THREE.Group>(null);
  const [family, setFamily] = useState<string | null>(null);
  const [noteOn, setNoteOn] = useState(reduced);
  // The canvas texture lives in refs: three.js objects are mutated every frame, which React
  // state must never be. It is attached to the material imperatively once fonts are ready.
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const tex = useRef<{ canvas: HTMLCanvasElement; texture: THREE.CanvasTexture } | null>(null);
  const { pointer, invalidate } = useThree();
  const lastRing = useRef(-1);

  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    tex.current = { canvas, texture };
    const f = hand.style.fontFamily;
    document.fonts.load(`74px ${f}`).finally(() => {
      drawSheet(canvas.getContext("2d")!, 0, f);
      texture.needsUpdate = true;
      if (material.current) {
        material.current.map = texture;
        material.current.needsUpdate = true;
      }
      setFamily(f);
    });
    return () => texture.dispose();
  }, []);

  useFrame(({ clock }, dt) => {
    const res = tex.current;
    if (!family || !res) return;
    const t = reduced ? 3.5 : clock.elapsedTime % LOOP;
    const ring = t < 1.4 ? 0 : t < 6.8 ? ease((t - 1.4) / 1.1) : 1 - ease((t - 6.8) / 0.6);
    const r = Math.round(ring * 60) / 60;
    if (r !== lastRing.current) {
      lastRing.current = r;
      drawSheet(res.canvas.getContext("2d")!, r, family);
      res.texture.needsUpdate = true;
    }
    const show = t > 2.6 && t < 6.8;
    if (show !== noteOn) setNoteOn(show);
    if (group.current) {
      const g = group.current;
      const tx = -0.18 + pointer.y * -0.08;
      const ty = 0.32 + pointer.x * 0.14;
      g.rotation.x += (tx - g.rotation.x) * Math.min(1, dt * 3);
      g.rotation.y += (ty - g.rotation.y) * Math.min(1, dt * 3);
      g.position.y = reduced ? 0 : Math.sin(clock.elapsedTime * 0.8) * 0.06;
    }
    if (reduced) invalidate();
  });

  const aspect = H / W;
  const width = 3.2;
  return (
    <group ref={group} rotation={[-0.18, 0.32, 0.04]}>
      <RoundedBox args={[width + 0.04, width * aspect + 0.04, 0.03]} radius={0.04} smoothness={4} position={[0, 0, -0.03]}>
        <meshStandardMaterial color="#f4f4f2" roughness={0.9} />
      </RoundedBox>
      <mesh>
        <planeGeometry args={[width, width * aspect]} />
        <meshStandardMaterial ref={material} color="#ffffff" roughness={0.85} />
      </mesh>
      <Html position={[width * 0.52, width * aspect * 0.15, 0.05]} transform distanceFactor={4.2} style={{ pointerEvents: "none" }}>
        <div
          style={{
            width: 270,
            opacity: noteOn ? 1 : 0,
            transform: `translateX(${noteOn ? 0 : -16}px)`,
            transition: "opacity 420ms cubic-bezier(0.16,1,0.3,1), transform 520ms cubic-bezier(0.16,1,0.3,1)",
          }}
          className="rounded-[14px] border border-line bg-surface p-3.5 text-left shadow-[var(--shadow-lift)]"
        >
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-danger">Mistake</div>
          <div className="mt-1 text-[13.5px] leading-5 text-ink">Moving +5 across should give 20 − 5, so 3x = 15.</div>
          <div className="mt-2 border-l-2 border-ink pl-2 text-[12.5px] leading-[18px] text-ink-2">What do you do to both sides to make the +5 disappear?</div>
        </div>
      </Html>
    </group>
  );
}

const REDUCED = "(prefers-reduced-motion: reduce)";
function subscribeReducedMotion(cb: () => void) {
  const mq = window.matchMedia(REDUCED);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

export default function HeroScene() {
  const reduced = useSyncExternalStore(subscribeReducedMotion, () => window.matchMedia(REDUCED).matches, () => false);
  return (
    <Canvas camera={{ position: [0.4, 0.1, 6.2], fov: 38 }} dpr={[1, 2]} frameloop={reduced ? "demand" : "always"} gl={{ antialias: true, alpha: true }} aria-label="A worksheet with a mistake circled and a tutor's note">
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 5, 6]} intensity={1.6} />
      <directionalLight position={[-4, -2, 3]} intensity={0.35} />
      <Sheet reduced={reduced} />
      <ContactShadows position={[0, -2.35, 0]} opacity={0.22} scale={9} blur={2.6} far={4} />
    </Canvas>
  );
}
