-- Hardening after the seven tables exist.
-- 1. Nothing is deleted through the app (access-matrix.md §7 rule 4): the authenticated role loses the DELETE and TRUNCATE
--    grants Supabase gives new tables by default, so no future policy can enable a delete by mistake.
-- 2. public.rls_auto_enable() is the Supabase platform default bound to the event trigger ensure_rls (it enables RLS on
--    new tables). It is SECURITY DEFINER and was executable by anon and authenticated through /rest/v1/rpc; an event
--    trigger needs no EXECUTE grant to fire, so the grant is revoked (security advisor 0028 / 0029).
revoke delete, truncate on table
  public.sites, public.profiles, public.targets, public.reference_figures,
  public.projects, public.decisions, public.project_history
from authenticated;

revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
