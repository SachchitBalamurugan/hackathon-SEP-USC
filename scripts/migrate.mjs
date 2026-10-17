// Apply supabase/migrations/*.sql that this database hasn't had yet, in order, each in its own
// transaction, and record them in public.studylens_migrations. Safe to run on every start.
// A migration run earlier by hand in the SQL editor is detected (its first table already
// exists) and recorded instead of re-run.
// Needs SUPABASE_DB_URL in web/.env.local: Supabase → Connect → Session pooler connection string.
// Usage: node scripts/migrate.mjs
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DIR = join(ROOT, "supabase/migrations");

function envFile() {
  try {
    return Object.fromEntries(
      readFileSync(join(ROOT, "web/.env.local"), "utf8")
        .split(/\r?\n/)
        .map((l) => /^([A-Z_]+)=(.*)$/.exec(l.trim()))
        .filter(Boolean)
        .map((m) => [m[1], m[2].replace(/^["']|["']$/g, "")]),
    );
  } catch {
    return {};
  }
}

const url = process.env.SUPABASE_DB_URL || envFile().SUPABASE_DB_URL;
if (!url) {
  console.error("SUPABASE_DB_URL is not set in web/.env.local.\nSupabase dashboard → Connect → Session pooler → copy the URI (with your database password).");
  process.exit(2);
}

const client = new pg.Client({ connectionString: url, ssl: /localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query("create table if not exists public.studylens_migrations (name text primary key, applied_at timestamptz not null default now())");
  await client.query("alter table public.studylens_migrations enable row level security");
  const done = new Set((await client.query("select name from public.studylens_migrations")).rows.map((r) => r.name));

  for (const name of readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort()) {
    if (done.has(name)) continue;
    const sql = readFileSync(join(DIR, name), "utf8");
    const firstTable = /create table (?:if not exists )?public\.(\w+)/i.exec(sql)?.[1];
    if (firstTable && (await client.query("select to_regclass($1) as t", [`public.${firstTable}`])).rows[0].t) {
      await client.query("insert into public.studylens_migrations (name) values ($1)", [name]);
      console.log(`already there  ${name}  (public.${firstTable} exists; recorded)`);
      continue;
    }
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query("insert into public.studylens_migrations (name) values ($1)", [name]);
      await client.query("commit");
      console.log(`applied        ${name}`);
    } catch (e) {
      await client.query("rollback");
      console.error(`failed         ${name}: ${e.message}`);
      process.exit(1);
    }
  }
  console.log("database is up to date");
} finally {
  await client.end();
}
