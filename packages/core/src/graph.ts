// Deterministic 3D force layout for the skills map. Same input always gives the same picture,
// so a student's map does not reshuffle on every visit. Nodes in the same group are pulled
// toward a shared centre; links act as springs; every pair repels.

export type GraphNode = { id: string; group: string; weight: number };
export type GraphLink = { source: string; target: string; strength?: number };
export type Placed = { id: string; x: number; y: number; z: number };

/** Small deterministic PRNG (mulberry32) seeded from a string. */
function rng(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
  let a = (h << 13) | (h >>> 19);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Evenly spread points on a sphere (Fibonacci lattice). */
function spherePoint(i: number, n: number, r: number) {
  const y = n === 1 ? 0 : 1 - (2 * i) / (n - 1);
  const rad = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = i * Math.PI * (3 - Math.sqrt(5));
  return { x: Math.cos(theta) * rad * r, y: y * r, z: Math.sin(theta) * rad * r };
}

export function layoutGraph(nodes: GraphNode[], links: GraphLink[], opts: { iterations?: number; radius?: number } = {}): Placed[] {
  const iterations = opts.iterations ?? 220;
  const R = opts.radius ?? 6;
  if (!nodes.length) return [];

  const groups = [...new Set(nodes.map((n) => n.group))].sort();
  const centres = new Map(groups.map((g, i) => [g, spherePoint(i, groups.length, groups.length > 1 ? R * 0.75 : 0)]));
  const sorted = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
  const index = new Map(sorted.map((n, i) => [n.id, i]));

  const pos = sorted.map((n) => {
    const r = rng(n.id);
    const c = centres.get(n.group)!;
    return { x: c.x + (r() - 0.5) * 2, y: c.y + (r() - 0.5) * 2, z: c.z + (r() - 0.5) * 2 };
  });
  const springs = links
    .map((l) => ({ a: index.get(l.source), b: index.get(l.target), k: l.strength ?? 1 }))
    .filter((s): s is { a: number; b: number; k: number } => s.a !== undefined && s.b !== undefined && s.a !== s.b);

  for (let it = 0; it < iterations; it++) {
    const cool = 1 - it / iterations;
    const f = pos.map(() => ({ x: 0, y: 0, z: 0 }));
    for (let i = 0; i < pos.length; i++) {
      for (let j = i + 1; j < pos.length; j++) {
        const dx = pos[i].x - pos[j].x;
        const dy = pos[i].y - pos[j].y;
        const dz = pos[i].z - pos[j].z;
        const d2 = dx * dx + dy * dy + dz * dz + 0.01;
        const rep = 1.6 / d2;
        f[i].x += dx * rep;
        f[i].y += dy * rep;
        f[i].z += dz * rep;
        f[j].x -= dx * rep;
        f[j].y -= dy * rep;
        f[j].z -= dz * rep;
      }
    }
    for (const s of springs) {
      const dx = pos[s.b].x - pos[s.a].x;
      const dy = pos[s.b].y - pos[s.a].y;
      const dz = pos[s.b].z - pos[s.a].z;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz) + 1e-6;
      const pull = 0.06 * s.k * (d - 1.8);
      f[s.a].x += (dx / d) * pull;
      f[s.a].y += (dy / d) * pull;
      f[s.a].z += (dz / d) * pull;
      f[s.b].x -= (dx / d) * pull;
      f[s.b].y -= (dy / d) * pull;
      f[s.b].z -= (dz / d) * pull;
    }
    sorted.forEach((n, i) => {
      const c = centres.get(n.group)!;
      f[i].x += (c.x - pos[i].x) * 0.04;
      f[i].y += (c.y - pos[i].y) * 0.04;
      f[i].z += (c.z - pos[i].z) * 0.04;
      const step = 0.5 * cool;
      pos[i].x += Math.max(-1, Math.min(1, f[i].x)) * step;
      pos[i].y += Math.max(-1, Math.min(1, f[i].y)) * step;
      pos[i].z += Math.max(-1, Math.min(1, f[i].z)) * step;
    });
  }
  const round = (v: number) => Math.round(v * 1000) / 1000;
  return sorted.map((n, i) => ({ id: n.id, x: round(pos[i].x), y: round(pos[i].y), z: round(pos[i].z) }));
}
