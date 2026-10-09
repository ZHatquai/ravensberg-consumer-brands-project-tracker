-- Demo reset tooling, part 1 of 2 (builder decision, 9 Oct 2026): the table that holds the "golden" demo state, the rows of the
-- eight tables as JSON. Platform owner only: RLS on, no policy, no grant to anon or authenticated. Part 2 adds the two functions.
create table public.demo_snapshot (
  table_name text primary key,
  rows jsonb not null,
  note text,
  taken_at timestamptz not null default now()
);
alter table public.demo_snapshot enable row level security;
revoke all on public.demo_snapshot from public, anon, authenticated;
