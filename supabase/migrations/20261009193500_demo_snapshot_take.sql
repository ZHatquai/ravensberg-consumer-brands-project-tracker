-- Demo reset tooling, part 2 of 3 (builder decision, 9 Oct 2026): demo_snapshot_take() stores the current rows of the eight
-- tables as JSON in demo_snapshot, the golden demo state. Platform owner only: refuses a session, EXECUTE revoked from
-- anon and authenticated. Part 3 adds demo_reset(). Applied by the builder in the SQL Editor on 9 Oct 2026 because the
-- session's migration tool hung; recorded in supabase_migrations.schema_migrations by a data fix afterwards.
create or replace function public.demo_snapshot_take(p_note text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v jsonb := '{}'::jsonb; r record;
begin
  if auth.uid() is not null then
    raise exception 'demo_snapshot_take runs only as the platform owner (SQL), never from a session' using errcode = '42501';
  end if;
  delete from public.demo_snapshot;
  insert into public.demo_snapshot (table_name, payload, note) select 'sites', coalesce(jsonb_agg(to_jsonb(t) order by t.code), '[]'::jsonb), p_note from public.sites t;
  insert into public.demo_snapshot (table_name, payload, note) select 'targets', coalesce(jsonb_agg(to_jsonb(t) order by t.category), '[]'::jsonb), p_note from public.targets t;
  insert into public.demo_snapshot (table_name, payload, note) select 'profiles', coalesce(jsonb_agg(to_jsonb(t) order by t.email), '[]'::jsonb), p_note from public.profiles t;
  insert into public.demo_snapshot (table_name, payload, note) select 'reference_figures', coalesce(jsonb_agg(to_jsonb(t) order by t.site_id, t.year, t.kind), '[]'::jsonb), p_note from public.reference_figures t;
  insert into public.demo_snapshot (table_name, payload, note) select 'reference_figures_history', coalesce(jsonb_agg(to_jsonb(t) order by t.changed_at, t.id), '[]'::jsonb), p_note from public.reference_figures_history t;
  insert into public.demo_snapshot (table_name, payload, note) select 'projects', coalesce(jsonb_agg(to_jsonb(t) order by t.version, t.created_at), '[]'::jsonb), p_note from public.projects t;
  insert into public.demo_snapshot (table_name, payload, note) select 'decisions', coalesce(jsonb_agg(to_jsonb(t) order by t.recorded_at, t.id), '[]'::jsonb), p_note from public.decisions t;
  insert into public.demo_snapshot (table_name, payload, note) select 'project_history', coalesce(jsonb_agg(to_jsonb(t) order by t.changed_at, t.id), '[]'::jsonb), p_note from public.project_history t;
  insert into public.demo_snapshot (table_name, payload, note) values ('meta', jsonb_build_object('project_code_seq', (select last_value from public.project_code_seq), 'taken_at', now()), p_note);
  for r in select table_name, jsonb_array_length(payload) as n from public.demo_snapshot where table_name <> 'meta' loop
    v := v || jsonb_build_object(r.table_name, r.n);
  end loop;
  return v;
end $$;
revoke all on function public.demo_snapshot_take(text) from public, anon, authenticated;
