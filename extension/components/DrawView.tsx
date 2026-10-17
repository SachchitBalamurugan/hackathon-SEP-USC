import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { compileExpr, sampleCurve, type DrawOp } from "@studylens/core";
import { Latex, MathText } from "./MathText";

// Renders validated draw ops as an animation: each block appears after the previous one, and
// inside a block the pieces reveal in order (steps line by line, curves drawing themselves,
// diagram nodes then edges). Free-placed text and shapes share one canvas.

const COLORS: Record<string, string> = { ink: "var(--sl-ink)", blue: "#3b82f6", red: "#ef4444", green: "#16a34a", orange: "#f97316", purple: "#0f766e" };
const col = (c?: string) => COLORS[c ?? "ink"] ?? COLORS.ink;
const W = 320;
const H = 220;
const STEP = 0.55; // seconds between revealed pieces

type Block = { kind: "op"; op: Exclude<DrawOp, { type: "text" | "line" | "arrow" | "rect" | "circle" | "highlight" }> } | { kind: "free"; ops: DrawOp[] };

function group(ops: DrawOp[]): Block[] {
  const out: Block[] = [];
  for (const op of ops) {
    if (op.type === "steps" || op.type === "graph" || op.type === "diagram") out.push({ kind: "op", op });
    else {
      const last = out[out.length - 1];
      if (last?.kind === "free") last.ops.push(op);
      else out.push({ kind: "free", ops: [op] });
    }
  }
  return out;
}

/** How many reveal beats a block takes, so the next block waits for it. */
function beats(b: Block): number {
  if (b.kind === "free") return b.ops.length;
  if (b.op.type === "steps") return b.op.steps.length;
  if (b.op.type === "graph") return b.op.curves.length + (b.op.points.length ? 1 : 0) + 1;
  return 2;
}

export function DrawView({ ops }: { ops: DrawOp[] }) {
  const [run, setRun] = useState(0);
  const blocks = useMemo(() => group(ops), [ops]);
  let t = 0;
  return (
    <div className="sl-draw" key={run}>
      {blocks.map((b, i) => {
        const start = t;
        t += beats(b) * STEP + 0.3;
        return <BlockView key={i} block={b} delay={start} />;
      })}
      <button className="sl-link sl-replay" onClick={() => setRun((r) => r + 1)}>
        Replay
      </button>
    </div>
  );
}

const appear = (delay: number) => ({ initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, transition: { delay, duration: 0.35 } });

function BlockView({ block, delay }: { block: Block; delay: number }) {
  if (block.kind === "free") return <FreeCanvas ops={block.ops} delay={delay} />;
  const op = block.op;
  if (op.type === "steps") {
    return (
      <div className="sl-steps">
        {op.title && <motion.div className="sl-draw-title" {...appear(delay)}>{op.title}</motion.div>}
        {op.steps.map((s, i) => (
          <motion.div key={i} className="sl-step" {...appear(delay + i * STEP)}>
            <span className="sl-step-n">{i + 1}</span>
            <span className="sl-step-body">
              {s.latex ? <Latex tex={s.latex} /> : s.text ? <MathText text={s.text} /> : null}
              {s.note && <span className="sl-step-note">{s.note}</span>}
            </span>
          </motion.div>
        ))}
      </div>
    );
  }
  if (op.type === "graph") return <Graph op={op} delay={delay} />;
  return <Diagram op={op} delay={delay} />;
}

function Graph({ op, delay }: { op: Extract<DrawOp, { type: "graph" }>; delay: number }) {
  const [x0, x1] = op.xRange[0] < op.xRange[1] ? op.xRange : [-10, 10];
  const [y0, y1] = op.yRange[0] < op.yRange[1] ? op.yRange : [-10, 10];
  const sx = (x: number) => ((x - x0) / (x1 - x0)) * W;
  const sy = (y: number) => H - ((y - y0) / (y1 - y0)) * H;
  const curves = op.curves.map((c) => {
    try {
      const f = compileExpr(c.expr);
      return { ...c, d: sampleCurve(f, [x0, x1], [y0, y1]).map((seg) => "M" + seg.map(([x, y]) => `${sx(x).toFixed(1)},${sy(y).toFixed(1)}`).join("L")).join(" ") };
    } catch {
      return null;
    }
  });
  return (
    <figure className="sl-figure">
      {op.title && <figcaption className="sl-draw-title">{op.title}</figcaption>}
      <svg viewBox={`0 0 ${W} ${H}`} className="sl-svg" role="img" aria-label={op.title ?? "graph"}>
        <motion.g {...appear(delay)}>
          {x0 < 0 && x1 > 0 && <line x1={sx(0)} x2={sx(0)} y1={0} y2={H} className="sl-axis" />}
          {y0 < 0 && y1 > 0 && <line y1={sy(0)} y2={sy(0)} x1={0} x2={W} className="sl-axis" />}
        </motion.g>
        {curves.map((c, i) =>
          c ? (
            <g key={i}>
              <motion.path d={c.d} fill="none" stroke={col(c.color ?? (["blue", "red", "green", "orange"] as const)[i % 4])} strokeWidth={2.2} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: delay + (i + 1) * STEP, duration: 1.1, ease: "easeInOut" }} />
              {c.label && (
                <motion.text x={W - 6} y={14 + i * 14} textAnchor="end" className="sl-svg-label" fill={col(c.color)} {...appear(delay + (i + 1) * STEP + 0.8)}>
                  {c.label}
                </motion.text>
              )}
            </g>
          ) : null,
        )}
        {op.points.map((p, i) => (
          <motion.g key={i} {...appear(delay + (curves.length + 1) * STEP + i * 0.1)}>
            <circle cx={sx(p.x)} cy={sy(p.y)} r={4} fill={col(p.color ?? "red")} />
            {p.label && (
              <text x={sx(p.x) + 6} y={sy(p.y) - 6} className="sl-svg-label">
                {p.label}
              </text>
            )}
          </motion.g>
        ))}
      </svg>
    </figure>
  );
}

function layout(op: Extract<DrawOp, { type: "diagram" }>) {
  const ids = op.nodes.map((n) => n.id);
  const pos = new Map<string, { x: number; y: number }>();
  if (op.kind === "cycle") {
    ids.forEach((id, i) => {
      const a = (i / ids.length) * Math.PI * 2 - Math.PI / 2;
      pos.set(id, { x: W / 2 + Math.cos(a) * 110, y: H / 2 + Math.sin(a) * 75 });
    });
    return pos;
  }
  // Layered layout: depth by longest path from a root (flow left-to-right, tree top-down).
  const depth = new Map<string, number>(ids.map((id) => [id, 0]));
  for (let pass = 0; pass < ids.length; pass++)
    for (const e of op.edges) if (depth.has(e.from) && depth.has(e.to)) depth.set(e.to, Math.max(depth.get(e.to)!, depth.get(e.from)! + 1));
  const layers = new Map<number, string[]>();
  for (const id of ids) layers.set(depth.get(id)!, [...(layers.get(depth.get(id)!) ?? []), id]);
  const nLayers = Math.max(...layers.keys()) + 1;
  for (const [d, members] of layers) {
    members.forEach((id, i) => {
      const along = ((d + 0.5) / nLayers) * (op.kind === "tree" ? H : W);
      const across = ((i + 0.5) / members.length) * (op.kind === "tree" ? W : H);
      pos.set(id, op.kind === "tree" ? { x: across, y: along } : { x: along, y: across });
    });
  }
  return pos;
}

function Diagram({ op, delay }: { op: Extract<DrawOp, { type: "diagram" }>; delay: number }) {
  const pos = layout(op);
  const nodeW = Math.min(96, (W / Math.max(1, op.nodes.length)) * 1.6);
  return (
    <figure className="sl-figure">
      {op.title && <figcaption className="sl-draw-title">{op.title}</figcaption>}
      <svg viewBox={`0 0 ${W} ${H}`} className="sl-svg" role="img" aria-label={op.title ?? "diagram"}>
        <defs>
          <marker id="sl-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="var(--sl-muted)" />
          </marker>
        </defs>
        {op.edges.map((e, i) => {
          const a = pos.get(e.from);
          const b = pos.get(e.to);
          if (!a || !b) return null;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const len = Math.hypot(dx, dy) || 1;
          const pad = 22;
          return (
            <motion.g key={i} {...appear(delay + STEP + i * 0.12)}>
              <line x1={a.x + (dx / len) * pad} y1={a.y + (dy / len) * pad} x2={b.x - (dx / len) * pad} y2={b.y - (dy / len) * pad} stroke="var(--sl-muted)" strokeWidth={1.5} markerEnd="url(#sl-arrow)" />
              {e.label && (
                <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 4} textAnchor="middle" className="sl-svg-label">
                  {e.label}
                </text>
              )}
            </motion.g>
          );
        })}
        {op.nodes.map((n, i) => {
          const p = pos.get(n.id)!;
          return (
            <motion.g key={n.id} {...appear(delay + i * 0.12)}>
              <rect x={p.x - nodeW / 2} y={p.y - 16} width={nodeW} height={32} rx={8} fill="var(--sl-surface)" stroke={col(op.color ?? "blue")} strokeWidth={1.5} />
              <text x={p.x} y={p.y + 4} textAnchor="middle" className="sl-svg-node">
                {n.label.length > 16 ? n.label.slice(0, 15) + "…" : n.label}
              </text>
            </motion.g>
          );
        })}
      </svg>
    </figure>
  );
}

function FreeCanvas({ ops, delay }: { ops: DrawOp[]; delay: number }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="sl-svg">
      <defs>
        <marker id="sl-arrow-free" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="currentColor" />
        </marker>
      </defs>
      {ops.map((op, i) => {
        const d = delay + i * STEP;
        if (op.type === "text") {
          const size = op.size === "l" ? 20 : op.size === "s" ? 11 : 14;
          return (
            <motion.foreignObject key={i} x={op.nx * W - 80} y={op.ny * H - size} width={160} height={size * 2.4} {...appear(d)}>
              <div style={{ fontSize: size, color: col(op.color), textAlign: "center" }}>
                <MathText text={op.text} />
              </div>
            </motion.foreignObject>
          );
        }
        if (op.type === "steps" || op.type === "graph" || op.type === "diagram") return null;
        const x1 = op.nx * W;
        const y1 = op.ny * H;
        const x2 = op.nx2 * W;
        const y2 = op.ny2 * H;
        const stroke = col(op.color ?? (op.type === "highlight" ? "orange" : "ink"));
        const draw = { initial: { pathLength: 0, opacity: 0 }, animate: { pathLength: 1, opacity: 1 }, transition: { delay: d, duration: 0.6 } };
        if (op.type === "line" || op.type === "arrow")
          return <motion.path key={i} d={`M${x1},${y1}L${x2},${y2}`} stroke={stroke} style={{ color: stroke }} strokeWidth={2} fill="none" markerEnd={op.type === "arrow" ? "url(#sl-arrow-free)" : undefined} {...draw} />;
        if (op.type === "circle")
          return <motion.ellipse key={i} cx={(x1 + x2) / 2} cy={(y1 + y2) / 2} rx={Math.abs(x2 - x1) / 2} ry={Math.abs(y2 - y1) / 2} stroke={stroke} strokeWidth={2} fill="none" {...draw} />;
        if (op.type === "highlight") return <motion.rect key={i} x={Math.min(x1, x2)} y={Math.min(y1, y2)} width={Math.abs(x2 - x1)} height={Math.abs(y2 - y1)} fill={stroke} opacity={0.25} rx={4} {...appear(d)} />;
        return <motion.rect key={i} x={Math.min(x1, x2)} y={Math.min(y1, y2)} width={Math.abs(x2 - x1)} height={Math.abs(y2 - y1)} stroke={stroke} strokeWidth={2} fill="none" rx={4} {...draw} />;
      })}
    </svg>
  );
}
