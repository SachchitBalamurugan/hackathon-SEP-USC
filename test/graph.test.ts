import { describe, expect, it } from "vitest";
import { layoutGraph, type GraphNode } from "@studylens/core";

const nodes: GraphNode[] = [
  ...["a1", "a2", "a3", "a4"].map((id) => ({ id, group: "Algebra", weight: 1 })),
  ...["c1", "c2", "c3"].map((id) => ({ id, group: "Chemistry", weight: 1 })),
];
const links = [{ source: "a1", target: "a2" }, { source: "a2", target: "a3" }, { source: "c1", target: "c2" }];
const dist = (p: { x: number; y: number; z: number }, q: { x: number; y: number; z: number }) => Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z);

describe("layoutGraph", () => {
  it("is deterministic regardless of input order", () => {
    const a = layoutGraph(nodes, links);
    const b = layoutGraph([...nodes].reverse(), [...links].reverse());
    expect(a).toEqual(b);
  });
  it("keeps groups apart and nodes separated", () => {
    const p = Object.fromEntries(layoutGraph(nodes, links).map((n) => [n.id, n]));
    const within = dist(p.a1, p.a2);
    const across = dist(p.a1, p.c1);
    expect(across).toBeGreaterThan(within);
    for (const x of Object.values(p)) for (const y of Object.values(p)) if (x !== y) expect(dist(x, y)).toBeGreaterThan(0.3);
  });
  it("handles empty, single and unknown-link inputs", () => {
    expect(layoutGraph([], [])).toEqual([]);
    expect(layoutGraph([{ id: "x", group: "g", weight: 1 }], [{ source: "x", target: "nope" }])).toHaveLength(1);
  });
});

describe("layoutGraph bounds", () => {
  it("fits every node inside the radius, centred", () => {
    const g = (n: number, grp: string) => Array.from({ length: n }, (_, i) => ({ id: grp + i, group: grp, weight: 1 }));
    const many = [...g(30, "A"), ...g(12, "B"), ...g(8, "C")];
    const p = layoutGraph(many, [{ source: "A0", target: "A1" }], { radius: 6 });
    for (const n of p) expect(Math.hypot(n.x, n.y, n.z)).toBeLessThanOrEqual(6.001);
    const mean = p.reduce((a, n) => a + n.x, 0) / p.length;
    expect(Math.abs(mean)).toBeLessThan(0.01);
  });
});
