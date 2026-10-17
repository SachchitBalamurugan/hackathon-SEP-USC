import { describe, expect, it } from "vitest";
import { compileExpr, sampleCurve } from "@studylens/core";

describe("compileExpr", () => {
  const cases: [string, number, number][] = [
    ["x^2 - 3*x", 2, -2],
    ["2x + 1", 3, 7],
    ["3(x+1)", 1, 6],
    ["-x^2", 3, -9],
    ["2^3^2", 0, 512],
    ["sin(pi/2)", 0, 1],
    ["sqrt x", 9, 3],
    ["2sin(x)", Math.PI / 2, 2],
    ["y = x/2", 4, 2],
    ["Math.abs(x) + e*0", -4, 4],
    ["x**2", 3, 9],
    ["xsin(x)", Math.PI / 2, Math.PI / 2],
  ];
  for (const [src, x, want] of cases) it(`${src} at ${x}`, () => expect(compileExpr(src)(x)).toBeCloseTo(want, 9));

  it("rejects anything outside the grammar", () => {
    for (const bad of ["alert(1)", "x; 1", "constructor", "x[0]", "(x", "2 +", "window.x"]) expect(() => compileExpr(bad)).toThrow();
  });
});

describe("sampleCurve", () => {
  it("breaks at the asymptote of 1/x", () => {
    const segs = sampleCurve(compileExpr("1/x"), [-5, 5], [-5, 5], 101);
    expect(segs.length).toBe(2);
  });
  it("produces one segment for a smooth curve", () => {
    expect(sampleCurve(compileExpr("x^2"), [-2, 2], [0, 4])).toHaveLength(1);
  });
});
