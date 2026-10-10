create or replace function public.demo_probe1() returns jsonb language sql security definer set search_path = '' as $$ select coalesce(jsonb_agg(to_jsonb(t) order by t.code), '[]'::jsonb) from public.sites t $$;
revoke all on function public.demo_probe1() from public, anon, authenticated;
