import "server-only";
import { randomUUID } from "node:crypto";
import { seedFixtures, userFor, MAYA } from "./seed";

// Demo fixtures (DEMO_FIXTURES=1, never in production): an in-memory stand-in for the parts of
// the Supabase client this app uses, so the real site runs with demo data and no Supabase
// project, for recording demos. State lives on globalThis so every route bundle shares it.

type Row = Record<string, unknown>;
type Store = Record<string, Row[]>;
type Result = { data: unknown; error: null | { message: string }; count?: number | null };

const SERIAL = new Set(["learner_events", "skill_demos", "agent_runs", "material_chunks"]);
const KEYS: Record<string, string> = { learner_profile: "user_id", profiles: "id" };
// Column defaults from the migrations that the app relies on when inserting.
const DEFAULTS: Record<string, Row> = {
  claude_tasks: { status: "pending", host: "", result: null, done_at: null },
  agent_runs: { observed: false, attempts: 1, violations: [], latency_ms: 0 },
  profiles: { tracking_enabled: false, paused_hosts: [], auto_check_hosts: [] },
  learner_profile: { mind_doc: "", traits: {}, version: 0, pending_events: 0 },
  mistakes: { resolved_at: null },
  api_keys: { revoked_at: null, last_used_at: null },
  assignments: { missing: false },
  skill_demos: { weight: 1 },
};

const g = globalThis as unknown as { __studylensFixtures?: { store: Store; serial: number } };

function state() {
  if (!g.__studylensFixtures) g.__studylensFixtures = { store: seedFixtures(), serial: 1000 };
  return g.__studylensFixtures;
}

const table = (name: string) => (state().store[name] ??= []);

function withDefaults(name: string, row: Row): Row {
  const now = new Date().toISOString();
  const out: Row = { ...DEFAULTS[name], ...row };
  if ((KEYS[name] ?? "id") === "id" && out.id === undefined) out.id = SERIAL.has(name) ? ++state().serial : randomUUID();
  if (name === "learner_events" || name === "skill_demos" || name === "agent_runs") out.at ??= now;
  else out.created_at ??= now;
  return out;
}

/** "id, title, courses(name)" → plain columns plus one-level joins. */
function project(cols: string | null, row: Row): Row {
  if (!cols || cols.trim() === "*") return { ...row };
  const out: Row = {};
  for (const part of cols.split(/,(?![^(]*\))/).map((s) => s.trim()).filter(Boolean)) {
    const join = /^(\w+)\(([^)]*)\)$/.exec(part);
    if (join) {
      const [, rel, inner] = join;
      const fk = `${rel.replace(/s$/, "")}_id`;
      const target = table(rel).find((r) => r.id === row[fk]);
      out[rel] = target ? project(inner, target) : null;
    } else if (part === "*") Object.assign(out, row);
    else out[part] = row[part];
  }
  return out;
}

type Filter = (r: Row) => boolean;
const cmp = (a: unknown, b: unknown) => (typeof a === "number" && typeof b === "number" ? a - b : String(a ?? "").localeCompare(String(b ?? "")));

class Query implements PromiseLike<Result> {
  private op: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  private filters: Filter[] = [];
  private cols: string | null = null;
  private returning = false;
  private head = false;
  private counting = false;
  private orders: [string, boolean][] = [];
  private max = Infinity;
  private one: "single" | "maybe" | null = null;
  private payload: Row[] = [];
  private patch: Row = {};
  private conflict: string[] = [];

  constructor(private name: string) {}

  select(cols = "*", opts?: { count?: string; head?: boolean }) {
    if (this.op === "select") this.cols = cols;
    else {
      this.returning = true;
      this.cols = cols;
    }
    this.counting = Boolean(opts?.count);
    this.head = Boolean(opts?.head);
    return this;
  }
  insert(rows: Row | Row[]) {
    this.op = "insert";
    this.payload = Array.isArray(rows) ? rows : [rows];
    return this;
  }
  upsert(rows: Row | Row[], opts?: { onConflict?: string }) {
    this.op = "upsert";
    this.payload = Array.isArray(rows) ? rows : [rows];
    this.conflict = opts?.onConflict?.split(",").map((s) => s.trim()) ?? [KEYS[this.name] ?? "id"];
    return this;
  }
  update(patch: Row) {
    this.op = "update";
    this.patch = patch;
    return this;
  }
  delete() {
    this.op = "delete";
    return this;
  }
  eq(c: string, v: unknown) {
    this.filters.push((r) => r[c] === v);
    return this;
  }
  neq(c: string, v: unknown) {
    this.filters.push((r) => r[c] !== v);
    return this;
  }
  is(c: string, v: unknown) {
    this.filters.push((r) => (r[c] ?? null) === v);
    return this;
  }
  not(c: string, op: string, v: unknown) {
    this.filters.push((r) => (op === "is" ? (r[c] ?? null) !== v : r[c] !== v));
    return this;
  }
  in(c: string, vs: unknown[]) {
    this.filters.push((r) => vs.includes(r[c]));
    return this;
  }
  gt(c: string, v: unknown) {
    this.filters.push((r) => r[c] != null && cmp(r[c], v) > 0);
    return this;
  }
  gte(c: string, v: unknown) {
    this.filters.push((r) => r[c] != null && cmp(r[c], v) >= 0);
    return this;
  }
  lt(c: string, v: unknown) {
    this.filters.push((r) => r[c] != null && cmp(r[c], v) < 0);
    return this;
  }
  lte(c: string, v: unknown) {
    this.filters.push((r) => r[c] != null && cmp(r[c], v) <= 0);
    return this;
  }
  order(c: string, opts?: { ascending?: boolean }) {
    this.orders.push([c, opts?.ascending !== false]);
    return this;
  }
  limit(n: number) {
    this.max = n;
    return this;
  }
  maybeSingle() {
    this.one = "maybe";
    return this;
  }
  single() {
    this.one = "single";
    return this;
  }

  then<A = Result, B = never>(ok?: ((v: Result) => A | PromiseLike<A>) | null, bad?: ((e: unknown) => B | PromiseLike<B>) | null): PromiseLike<A | B> {
    return Promise.resolve()
      .then(() => this.run())
      .then(ok, bad);
  }

  private match = (r: Row) => this.filters.every((f) => f(r));

  private run(): Result {
    const rows = table(this.name);
    let out: Row[] = [];
    if (this.op === "select") {
      out = rows.filter(this.match);
      for (const [c, asc] of [...this.orders].reverse()) out.sort((a, b) => (asc ? cmp(a[c], b[c]) : cmp(b[c], a[c])));
      const count = out.length;
      out = out.slice(0, this.max);
      if (this.head) return { data: null, error: null, count };
      return this.finish(out.map((r) => project(this.cols, r)), this.counting ? count : null);
    }
    if (this.op === "insert") {
      out = this.payload.map((r) => withDefaults(this.name, r));
      rows.push(...out);
    } else if (this.op === "upsert") {
      for (const r of this.payload) {
        const hit = rows.find((x) => this.conflict.every((k) => x[k] === r[k]));
        if (hit) out.push(Object.assign(hit, r));
        else {
          const row = withDefaults(this.name, r);
          rows.push(row);
          out.push(row);
        }
      }
    } else if (this.op === "update") {
      out = rows.filter(this.match);
      for (const r of out) Object.assign(r, this.patch);
    } else {
      out = rows.filter(this.match);
      state().store[this.name] = rows.filter((r) => !out.includes(r));
    }
    if (!this.returning) return { data: null, error: null };
    return this.finish(out.map((r) => project(this.cols, r)), null);
  }

  private finish(data: Row[], count: number | null): Result {
    if (this.one === "maybe") return { data: data[0] ?? null, error: null, count };
    if (this.one === "single") return data[0] ? { data: data[0], error: null, count } : { data: null, error: { message: "no rows" }, count };
    return { data, error: null, count };
  }
}

export function fixtureDb() {
  return {
    from: (name: string) => new Query(name),
    rpc: async (fn: string, args: Record<string, unknown>) => {
      if (fn === "bump_pending_events") {
        const rows = table("learner_profile");
        let p = rows.find((r) => r.user_id === args.p_user);
        if (!p) rows.push((p = { user_id: args.p_user, pending_events: 0, mind_doc: "", traits: {}, version: 0 }));
        p.pending_events = Number(p.pending_events ?? 0) + Number(args.p_n);
        return { data: p.pending_events, error: null };
      }
      return { data: [], error: null };
    },
    auth: {
      admin: {
        // Creating an account that exists starts it over, so a sign-up recording can be repeated.
        createUser: async ({ email }: { email: string }) => {
          const { id } = userFor(email);
          if (id !== MAYA.id) for (const name of Object.keys(state().store)) state().store[name] = table(name).filter((r) => r.user_id !== id && r.id !== id);
          return { data: { user: { id, email } }, error: null };
        },
      },
    },
  };
}
