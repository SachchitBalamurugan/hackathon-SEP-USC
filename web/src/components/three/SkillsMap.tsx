"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Html, Line, OrbitControls } from "@react-three/drei";
import { useMemo, useRef, useState } from "react";
import type { Group, Mesh } from "three";
import type { SkillGraph, SkillNode } from "@/lib/overview";

const COLOR: Record<string, string> = { verified: "#2e8757", learning: "#c47a1c", shaky: "#b3372b", unknown: "#a9a49a" };

function Node({ n, selected, onSelect, onHover }: { n: SkillNode; selected: boolean; onSelect: () => void; onHover: (on: boolean) => void }) {
  const mesh = useRef<Mesh>(null);
  const [hover, setHover] = useState(false);
  const r = 0.22 + Math.min(1.5, n.evidence) * 0.16;
  useFrame((_, dt) => {
    if (!mesh.current) return;
    const target = selected || hover ? 1.3 : 1;
    const s = mesh.current.scale.x + (target - mesh.current.scale.x) * Math.min(1, dt * 10);
    mesh.current.scale.setScalar(s);
  });
  return (
    <group position={[n.x, n.y, n.z]}>
      <mesh
        ref={mesh}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
          onHover(true);
        }}
        onPointerOut={() => {
          setHover(false);
          onHover(false);
        }}
      >
        <sphereGeometry args={[r, 32, 32]} />
        <meshStandardMaterial color={COLOR[n.status] ?? COLOR.unknown} roughness={0.35} metalness={0.05} />
      </mesh>
      {selected && (
        <mesh>
          <ringGeometry args={[r * 1.55, r * 1.7, 48]} />
          <meshBasicMaterial color="#191917" />
        </mesh>
      )}
      {(hover || selected) && (
        <Html center distanceFactor={11} position={[0, r + 0.42, 0]} style={{ pointerEvents: "none" }}>
          <div className="whitespace-nowrap rounded-full border border-line bg-surface px-2.5 py-1 text-[12px] font-medium text-ink shadow-[var(--shadow)]">
            {n.label} · {Math.round(n.level * 100)}%
          </div>
        </Html>
      )}
    </group>
  );
}

function Scene({ graph, selected, setSelected }: { graph: SkillGraph; selected: string | null; setSelected: (id: string | null) => void }) {
  const group = useRef<Group>(null);
  const [hovering, setHovering] = useState(false);
  const pos = useMemo(() => new Map(graph.nodes.map((n) => [n.id, [n.x, n.y, n.z] as [number, number, number]])), [graph]);
  useFrame((_, dt) => {
    // Drift slowly until the student interacts with a node.
    if (group.current && !hovering && !selected) group.current.rotation.y += dt * 0.06;
  });
  return (
    <group ref={group}>
      {graph.links.map((l, i) => {
        const a = pos.get(l.source);
        const b = pos.get(l.target);
        return a && b ? <Line key={i} points={[a, b]} color="#191917" transparent opacity={0.14 + 0.06 * (l.strength ?? 1)} lineWidth={1} /> : null;
      })}
      {graph.nodes.map((n) => (
        <Node key={n.id} n={n} selected={selected === n.id} onSelect={() => setSelected(selected === n.id ? null : n.id)} onHover={setHovering} />
      ))}
    </group>
  );
}

export default function SkillsMap({ graph, selected, setSelected }: { graph: SkillGraph; selected: string | null; setSelected: (id: string | null) => void }) {
  return (
    <Canvas camera={{ position: [0, 2, 14], fov: 42 }} dpr={[1, 2]} onPointerMissed={() => setSelected(null)} aria-label="3D map of your skills">
      <color attach="background" args={["#ffffff"]} />
      <hemisphereLight args={["#ffffff", "#e9e7e1", 1.1]} />
      <directionalLight position={[6, 8, 6]} intensity={1.4} />
      <Scene graph={graph} selected={selected} setSelected={setSelected} />
      <OrbitControls enablePan={false} minDistance={6} maxDistance={26} enableDamping />
    </Canvas>
  );
}
