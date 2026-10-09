create or replace function public.demo_probe3() returns text language plpgsql security definer set search_path = '' as $$
begin
  delete from public.demo_snapshot where false;
  return 'ok';
end $$;
revoke all on function public.demo_probe3() from public, anon, authenticated;
