-- Demo reset tooling, part 3 of 3 (builder decision, 9 Oct 2026): demo_reset() wipes the record tables and restores the golden
-- demo state stored by demo_snapshot_take(), keeping every login identity and every profile that has one (a workshop
-- participant). Platform owner only: refuses a session, EXECUTE revoked from anon and authenticated. One transaction:
-- an error anywhere leaves the database as it was, the paused triggers included. Applied by the builder in the SQL Editor
-- on 9 Oct 2026 because the session's migration tool hung; recorded in schema_migrations by a data fix afterwards.
create or replace function public.demo_reset()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_rows jsonb; v_meta jsonb; v_ids uuid[];
begin
  if auth.uid() is not null then
    raise exception 'demo_reset runs only as the platform owner (SQL), never from a session' using errcode = '42501';
  end if;
  if (select count(*) from public.demo_snapshot where table_name in ('sites', 'targets', 'profiles', 'reference_figures', 'reference_figures_history', 'projects', 'decisions', 'project_history', 'meta')) < 9 then
    raise exception 'no complete demo snapshot: run public.demo_snapshot_take() on a clean state first';
  end if;

  -- the user triggers pause so the snapshot's audit columns and history rows come back exactly as stored
  alter table public.sites disable trigger user;
  alter table public.targets disable trigger user;
  alter table public.profiles disable trigger user;
  alter table public.reference_figures disable trigger user;
  alter table public.projects disable trigger user;
  alter table public.decisions disable trigger user;

  -- 1. the record tables are wiped, children first
  delete from public.decisions;
  delete from public.project_history;
  delete from public.reference_figures_history;
  delete from public.reference_figures;
  delete from public.projects;

  -- 2. people: the snapshot's profiles come back by id; a login that exists today is always kept;
  --    a profile outside the snapshot stays if it has a login (a workshop participant), otherwise it goes
  select payload into v_rows from public.demo_snapshot where table_name = 'profiles';
  select array_agg((e->>'id')::uuid) into v_ids from jsonb_array_elements(v_rows) e;
  update public.sites set updated_by = null where updated_by is not null and updated_by <> all(v_ids) and updated_by in (select id from public.profiles where auth_user_id is null);
  update public.targets set updated_by = null where updated_by is not null and updated_by <> all(v_ids) and updated_by in (select id from public.profiles where auth_user_id is null);
  update public.targets set set_by = null where set_by is not null and set_by <> all(v_ids) and set_by in (select id from public.profiles where auth_user_id is null);
  update public.profiles set updated_by = null where updated_by is not null and updated_by <> all(v_ids) and updated_by in (select id from public.profiles where auth_user_id is null);
  delete from public.profiles p where p.auth_user_id is null and p.id <> all(v_ids);
  insert into public.profiles select r.* from jsonb_populate_recordset(null::public.profiles, v_rows) r
  on conflict (id) do update set
    email = excluded.email, name = excluded.name, role = excluded.role, site_id = excluded.site_id,
    retired_at = excluded.retired_at, retired_comment = excluded.retired_comment,
    created_at = excluded.created_at, updated_by = excluded.updated_by, updated_at = excluded.updated_at,
    auth_user_id = coalesce(public.profiles.auth_user_id, excluded.auth_user_id);

  -- 3. lookups: restored by id; a site added since the snapshot is deactivated, never deleted
  select payload into v_rows from public.demo_snapshot where table_name = 'sites';
  select array_agg((e->>'id')::uuid) into v_ids from jsonb_array_elements(v_rows) e;
  insert into public.sites select r.* from jsonb_populate_recordset(null::public.sites, v_rows) r
  on conflict (id) do update set code = excluded.code, name = excluded.name, city = excluded.city, type = excluded.type, active = excluded.active, updated_by = excluded.updated_by, updated_at = excluded.updated_at;
  update public.sites set active = false where id <> all(v_ids);
  select payload into v_rows from public.demo_snapshot where table_name = 'targets';
  insert into public.targets select r.* from jsonb_populate_recordset(null::public.targets, v_rows) r
  on conflict (id) do update set category = excluded.category, base_year = excluded.base_year, target_year = excluded.target_year, value = excluded.value, set_by = excluded.set_by, active = excluded.active, updated_by = excluded.updated_by, updated_at = excluded.updated_at, change_comment = excluded.change_comment;

  -- 4. the records, in dependency order (a project before its newer version)
  select payload into v_rows from public.demo_snapshot where table_name = 'reference_figures';
  insert into public.reference_figures select r.* from jsonb_populate_recordset(null::public.reference_figures, v_rows) r;
  select payload into v_rows from public.demo_snapshot where table_name = 'reference_figures_history';
  insert into public.reference_figures_history select r.* from jsonb_populate_recordset(null::public.reference_figures_history, v_rows) r;
  select payload into v_rows from public.demo_snapshot where table_name = 'projects';
  insert into public.projects select r.* from jsonb_populate_recordset(null::public.projects, v_rows) r order by r.version, r.created_at;
  select payload into v_rows from public.demo_snapshot where table_name = 'decisions';
  insert into public.decisions select r.* from jsonb_populate_recordset(null::public.decisions, v_rows) r;
  select payload into v_rows from public.demo_snapshot where table_name = 'project_history';
  insert into public.project_history select r.* from jsonb_populate_recordset(null::public.project_history, v_rows) r;
  select payload into v_meta from public.demo_snapshot where table_name = 'meta';
  perform setval('public.project_code_seq', (v_meta->>'project_code_seq')::bigint, true);

  alter table public.sites enable trigger user;
  alter table public.targets enable trigger user;
  alter table public.profiles enable trigger user;
  alter table public.reference_figures enable trigger user;
  alter table public.projects enable trigger user;
  alter table public.decisions enable trigger user;

  return jsonb_build_object(
    'sites', (select count(*) from public.sites), 'targets', (select count(*) from public.targets), 'profiles', (select count(*) from public.profiles),
    'profiles_with_login', (select count(*) from public.profiles where auth_user_id is not null),
    'reference_figures', (select count(*) from public.reference_figures), 'reference_figures_history', (select count(*) from public.reference_figures_history),
    'projects', (select count(*) from public.projects), 'decisions', (select count(*) from public.decisions), 'project_history', (select count(*) from public.project_history),
    'next_project_code', 'PRJ-' || lpad(((select last_value from public.project_code_seq) + 1)::text, 4, '0'),
    'snapshot_taken_at', (select taken_at from public.demo_snapshot where table_name = 'meta'),
    'snapshot_note', (select note from public.demo_snapshot where table_name = 'meta'));
end $$;
revoke all on function public.demo_reset() from public, anon, authenticated;
