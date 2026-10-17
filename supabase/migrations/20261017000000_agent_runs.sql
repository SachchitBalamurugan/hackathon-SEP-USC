-- Watchdog log: one row per agent step (check, refine, practice generate/grade, explain,
-- consolidate) with what the verifiers in packages/core/src/monitor.ts found and how the run
-- ended. Student-reported problems ("that mark was wrong") land here too with observed = true,
-- and are left out of the circuit breaker, which only trusts what the server measured.

create table public.agent_runs (
  id bigserial primary key,
  user_id uuid references auth.users (id) on delete cascade,
  pipeline text not null check (pipeline in ('check', 'refine', 'practice_generate', 'practice_grade', 'explain', 'consolidate')),
  outcome text not null check (outcome in ('ok', 'repaired', 'degraded', 'failed')),
  violations jsonb not null default '[]',
  attempts int not null default 1,
  latency_ms int not null default 0,
  observed boolean not null default false,
  at timestamptz not null default now()
);
create index agent_runs_pipeline_idx on public.agent_runs (pipeline, at desc) where not observed;
create index agent_runs_user_idx on public.agent_runs (user_id, at desc);

alter table public.agent_runs enable row level security;
revoke all on public.agent_runs from anon, authenticated;
