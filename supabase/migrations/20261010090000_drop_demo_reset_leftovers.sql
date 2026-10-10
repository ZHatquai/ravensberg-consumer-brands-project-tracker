-- Removes the leftovers of the function-based demo reset abandoned on 9 Oct 2026 (the reset is now supabase/demo-reset.sql):
-- the unused demo_snapshot table and the four probe functions. None was reachable through the API; nothing reads them.
-- Applied by the builder in the Supabase SQL Editor on 10 Oct 2026, because the session's migration tool timed out on it;
-- the same script recorded this file in supabase_migrations.schema_migrations so the history matches the folder.
drop function if exists public.demo_probe();
drop function if exists public.demo_probe1();
drop function if exists public.demo_probe2();
drop function if exists public.demo_probe3();
drop table if exists public.demo_snapshot;
