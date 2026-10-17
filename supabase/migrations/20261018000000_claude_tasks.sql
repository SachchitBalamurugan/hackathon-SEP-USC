-- Claude mode (no ANTHROPIC_API_KEY on the server): work the extension hands to the student's
-- own Claude through the MCP connector. The extension queues a screenshot; Claude fetches it
-- with get_pending_check or get_my_screen, and a check's marks come back through
-- submit_check_result, which the overlay polls for. The image is dropped once the task is done.

create table public.claude_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('check', 'ask')),
  status text not null default 'pending' check (status in ('pending', 'done')),
  host text not null default '',
  question text,
  image text,                     -- base64 JPEG, cleared when done
  result jsonb,
  created_at timestamptz not null default now(),
  done_at timestamptz
);
create index claude_tasks_pending_idx on public.claude_tasks (user_id, kind, created_at desc) where status = 'pending';

alter table public.claude_tasks enable row level security;
revoke all on public.claude_tasks from anon, authenticated;
