create or replace function public.demo_probe2() returns jsonb language sql security definer set search_path = '' as $$ select rows from public.demo_snapshot where table_name = 'meta' $$;
revoke all on function public.demo_probe2() from public, anon, authenticated;
