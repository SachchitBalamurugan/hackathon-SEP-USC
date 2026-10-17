// A tiny, safe expression evaluator for graph curves the model writes ("x^2 - 3*x", "sin(x)/x").
// Recursive descent over a fixed grammar; no eval or Function, which extension content scripts
// cannot use anyway. Supports + - * / ^, unary minus, implicit multiplication (2x, 3(x+1), 2sin(x)),
// the constants pi and e, and a whitelist of Math functions.

type Node =
  | { k: "num"; v: number }
  | { k: "x" }
  | { k: "neg"; a: Node }
  | { k: "bin"; op: "+" | "-" | "*" | "/" | "^"; a: Node; b: Node }
  | { k: "fn"; f: (n: number) => number; a: Node };

const FNS: Record<string, (n: number) => number> = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan,
  sqrt: Math.sqrt, abs: Math.abs, exp: Math.exp, ln: Math.log, log: Math.log10, floor: Math.floor, ceil: Math.ceil,
};
const CONSTS: Record<string, number> = { pi: Math.PI, e: Math.E };
// Own-property checks only: `"constructor" in FNS` is true through the prototype.
const isFn = (t: string) => Object.hasOwn(FNS, t);
const isConst = (t: string) => Object.hasOwn(CONSTS, t);

function tokenize(src: string): string[] {
  const out: string[] = [];
  const re = /\s*(\d+\.?\d*|\.\d+|[a-z]+|\*\*|[-+*/^()])/gy;
  const s = src.toLowerCase().replace(/math\./g, "");
  let m: RegExpExecArray | null;
  let i = 0;
  while (i < s.length) {
    re.lastIndex = i;
    m = re.exec(s);
    if (!m) {
      if (/^\s*$/.test(s.slice(i))) break;
      throw new Error(`Unexpected "${s.slice(i, i + 5)}"`);
    }
    out.push(m[1] === "**" ? "^" : m[1]);
    i = re.lastIndex;
  }
  // Split identifiers like "xsin" or "pix" into known pieces.
  return out.flatMap((t) => (/^[a-z]+$/.test(t) && !isFn(t) && !isConst(t) && t !== "x" ? splitIdent(t) : [t]));
}

function splitIdent(t: string): string[] {
  const parts: string[] = [];
  let rest = t;
  const names = [...Object.keys(FNS), ...Object.keys(CONSTS), "x"].sort((a, b) => b.length - a.length);
  while (rest) {
    const n = names.find((name) => rest.startsWith(name));
    if (!n) throw new Error(`Unknown name "${t}"`);
    parts.push(n);
    rest = rest.slice(n.length);
  }
  return parts;
}

export function compileExpr(src: string): (x: number) => number {
  if (src.length > 200) throw new Error("Expression too long");
  const toks = tokenize(src.replace(/^\s*y\s*=/, ""));
  let p = 0;
  const peek = () => toks[p];
  const eat = (t?: string) => {
    const v = toks[p];
    if (t !== undefined && v !== t) throw new Error(`Expected "${t}"`);
    p++;
    return v;
  };
  const startsAtom = (t: string | undefined) => t !== undefined && (t === "(" || /^[\d.]/.test(t) || /^[a-z]+$/.test(t));

  function expr(): Node {
    let n = term();
    while (peek() === "+" || peek() === "-") {
      const op = eat() as "+" | "-";
      n = { k: "bin", op, a: n, b: term() };
    }
    return n;
  }
  function term(): Node {
    let n = unary();
    for (;;) {
      if (peek() === "*" || peek() === "/") {
        const op = eat() as "*" | "/";
        n = { k: "bin", op, a: n, b: unary() };
      } else if (startsAtom(peek())) {
        n = { k: "bin", op: "*", a: n, b: power() }; // implicit multiplication
      } else return n;
    }
  }
  function unary(): Node {
    if (peek() === "-") {
      eat();
      return { k: "neg", a: unary() };
    }
    if (peek() === "+") {
      eat();
      return unary();
    }
    return power();
  }
  function power(): Node {
    const base = atom();
    if (peek() === "^") {
      eat();
      return { k: "bin", op: "^", a: base, b: unary() }; // right-associative
    }
    return base;
  }
  function atom(): Node {
    const t = eat();
    if (t === undefined) throw new Error("Unexpected end");
    if (t === "(") {
      const n = expr();
      eat(")");
      return n;
    }
    if (/^[\d.]/.test(t)) return { k: "num", v: parseFloat(t) };
    if (t === "x") return { k: "x" };
    if (isConst(t)) return { k: "num", v: CONSTS[t] };
    if (isFn(t)) {
      const arg = peek() === "(" ? atom() : power();
      return { k: "fn", f: FNS[t], a: arg };
    }
    throw new Error(`Unexpected "${t}"`);
  }

  const tree = expr();
  if (p !== toks.length) throw new Error(`Unexpected "${toks[p]}"`);

  const run = (n: Node, x: number): number => {
    switch (n.k) {
      case "num":
        return n.v;
      case "x":
        return x;
      case "neg":
        return -run(n.a, x);
      case "fn":
        return n.f(run(n.a, x));
      case "bin": {
        const a = run(n.a, x);
        const b = run(n.b, x);
        return n.op === "+" ? a + b : n.op === "-" ? a - b : n.op === "*" ? a * b : n.op === "/" ? a / b : Math.pow(a, b);
      }
    }
  };
  return (x: number) => run(tree, x);
}

/** Sample a curve into SVG-ready segments, breaking at discontinuities and out-of-range values. */
export function sampleCurve(f: (x: number) => number, xRange: [number, number], yRange: [number, number], n = 240): [number, number][][] {
  const [x0, x1] = xRange;
  const [y0, y1] = yRange;
  const span = y1 - y0;
  const segs: [number, number][][] = [];
  let cur: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    const y = f(x);
    const ok = Number.isFinite(y) && y > y0 - span && y < y1 + span;
    const prev = cur[cur.length - 1];
    if (ok && prev && Math.abs(y - prev[1]) > span * 1.5) {
      segs.push(cur);
      cur = [];
    }
    if (ok) cur.push([x, y]);
    else if (cur.length) {
      segs.push(cur);
      cur = [];
    }
  }
  if (cur.length) segs.push(cur);
  return segs.filter((s) => s.length > 1);
}
