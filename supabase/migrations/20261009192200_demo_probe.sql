-- probe: does a one-line function apply? dropped again in the next migration if it does
create or replace function public.demo_probe() returns text language sql security definer set search_path = '' as $$ select 'ok' $$;
revoke all on function public.demo_probe() from public, anon, authenticated;
