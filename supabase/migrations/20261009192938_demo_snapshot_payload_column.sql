-- the column is renamed because the migration tool hangs on an INSERT whose column list names "rows" (probes 5 and 6 of 9 Oct 2026)
alter table public.demo_snapshot rename column "rows" to payload;
