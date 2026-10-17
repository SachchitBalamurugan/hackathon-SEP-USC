-- StudyLens schema.
--
-- Access model: RLS is ON for every table with NO client policies, so the browser's anon and
-- authenticated roles can read and write nothing directly. Every read and write goes through a
-- server route using the service key, which filters by the user id resolved from the session or
-- API key (never from the request body). This server-only table posture applies
-- everywhere: practice answers, learner models and behaviour events must never be readable
-- from a page script.

create extension if not exists vector;
create extension if not exists pgcrypto;

-- ── Accounts ────────────────────────────────────────────────────────────────────────────────

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  -- Behaviour tracking is opt-in. paused_hosts are sites the student switched off one by one.
  tracking_enabled boolean not null default false,
  paused_hosts text[] not null default '{}',
  auto_check_hosts text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- Long-lived bearer keys for the extension (minted by pairing) and for MCP clients (minted on
-- the dashboard). Only the SHA-256 hash is stored; the plaintext is shown once.
create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('extension', 'mcp')),
  key_hash text not null unique,
  label text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
create index api_keys_user_idx on public.api_keys (user_id);

-- Short pairing codes: 8 characters, 5-minute expiry, single use, hash only.
create table public.pair_codes (
  code_hash text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz
);

-- ── Course data (from the extension) ────────────────────────────────────────────────────────

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  external_id text not null,
  source text not null check (source in ('canvas', 'classroom', 'generic')),
  name text not null,
  code text,
  current_score numeric,
  url text,
  updated_at timestamptz not null default now(),
  unique (user_id, external_id)
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id uuid references public.courses (id) on delete cascade,
  external_id text not null,
  title text not null,
  description text,
  due_at timestamptz,
  points_possible numeric,
  score numeric,
  submitted_at timestamptz,
  missing boolean not null default false,
  url text,
  updated_at timestamptz not null default now(),
  unique (user_id, external_id)
);
create index assignments_due_idx on public.assignments (user_id, due_at);

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id uuid references public.courses (id) on delete cascade,
  external_id text not null,
  title text not null,
  kind text not null,
  url text,
  content_hash text not null,
  updated_at timestamptz not null default now(),
  unique (user_id, external_id)
);

create table public.material_chunks (
  id bigserial primary key,
  material_id uuid not null references public.materials (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  idx int not null,
  text text not null,
  embedding vector(1536),
  tsv tsvector generated always as (to_tsvector('english', text)) stored
);
create index material_chunks_user_idx on public.material_chunks (user_id);
create index material_chunks_tsv_idx on public.material_chunks using gin (tsv);
create index material_chunks_embedding_idx on public.material_chunks using hnsw (embedding vector_cosine_ops);

-- ── Learner model ───────────────────────────────────────────────────────────────────────────

-- Append-only log of everything the model learns from: course changes, Claude's observations,
-- and StudyLens usage. consolidated_at marks what has been folded into learner_profile.
create table public.learner_events (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  source text not null check (source in ('course', 'claude', 'usage')),
  kind text not null,
  payload jsonb not null default '{}',
  at timestamptz not null default now(),
  consolidated_at timestamptz
);
create index learner_events_pending_idx on public.learner_events (user_id, at) where consolidated_at is null;
create index learner_events_user_idx on public.learner_events (user_id, at desc);

-- One row per demonstration of a skill. Mastery is computed from these with a 14-day
-- half-life (packages/core/src/mastery.ts), so it is recomputable and never drifts.
create table public.skill_demos (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  skill_key text not null,
  skill_label text not null,
  correct boolean not null,
  weight real not null default 1,
  source text not null,
  at timestamptz not null default now()
);
create index skill_demos_user_idx on public.skill_demos (user_id, skill_key, at desc);

create table public.mistakes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  skill_key text not null,
  skill_label text not null,
  note text not null,
  misconception text,
  subject text,
  page_host text,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index mistakes_open_idx on public.mistakes (user_id, created_at desc) where resolved_at is null;

create table public.practice_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  skill_key text not null,
  skill_label text not null,
  question text not null,
  qtype text not null check (qtype in ('multiple_choice', 'short_answer')),
  options jsonb,
  answer text not null,           -- never sent to a client
  explanation text,
  mistake_id uuid references public.mistakes (id) on delete set null,
  srs jsonb,                      -- SrsState
  last_result jsonb,
  created_at timestamptz not null default now()
);
create index practice_items_user_idx on public.practice_items (user_id, created_at desc);

create table public.learner_profile (
  user_id uuid primary key references auth.users (id) on delete cascade,
  mind_doc text not null default '',
  traits jsonb not null default '{}',
  version int not null default 0,
  pending_events int not null default 0,
  updated_at timestamptz not null default now()
);

-- ── Lock it down ────────────────────────────────────────────────────────────────────────────

do $$
declare t text;
begin
  foreach t in array array['profiles','api_keys','pair_codes','courses','assignments','materials',
    'material_chunks','learner_events','skill_demos','mistakes','practice_items','learner_profile']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- ── Functions (service role only) ───────────────────────────────────────────────────────────

-- Hybrid search: pgvector cosine plus full-text, fused by reciprocal rank. The user filter is a parameter because only the service role can call it.
create or replace function public.search_material_chunks(
  p_user uuid, p_query text, p_embedding vector(1536), p_k int default 8
) returns table (chunk_id bigint, material_id uuid, text text, score double precision)
language sql stable as $$
  with vec as (
    select c.id, row_number() over (order by c.embedding <=> p_embedding) as r
    from public.material_chunks c
    where c.user_id = p_user and c.embedding is not null and p_embedding is not null
    order by c.embedding <=> p_embedding limit 40
  ), fts as (
    select c.id, row_number() over (order by ts_rank(c.tsv, q) desc) as r
    from public.material_chunks c, websearch_to_tsquery('english', p_query) q
    where c.user_id = p_user and c.tsv @@ q
    order by ts_rank(c.tsv, q) desc limit 40
  ), fused as (
    select id, sum(1.0 / (60 + r)) as score from (
      select id, r from vec union all select id, r from fts
    ) u group by id
  )
  select c.id, c.material_id, c.text, f.score
  from fused f join public.material_chunks c on c.id = f.id
  order by f.score desc limit p_k;
$$;

-- Count a pending event and report whether consolidation is due (every 25 events).
create or replace function public.bump_pending_events(p_user uuid, p_n int)
returns int language sql as $$
  insert into public.learner_profile (user_id, pending_events) values (p_user, p_n)
  on conflict (user_id) do update set pending_events = public.learner_profile.pending_events + p_n
  returning pending_events;
$$;

revoke all on function public.search_material_chunks(uuid, text, vector, int) from public, anon, authenticated;
revoke all on function public.bump_pending_events(uuid, int) from public, anon, authenticated;
grant execute on function public.search_material_chunks(uuid, text, vector, int) to service_role;
grant execute on function public.bump_pending_events(uuid, int) to service_role;

-- New users get a profile row.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  insert into public.learner_profile (user_id) values (new.id) on conflict do nothing;
  return new;
end $$;
revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
