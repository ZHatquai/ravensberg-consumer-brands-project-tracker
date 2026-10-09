-- Access phase, part 1 of 3: the schema delta of docs/access-matrix.md §5 and the protection triggers.
-- Nothing here grants a row to anyone: the policies come in access_policies, the narrow functions in access_functions.

-- 1. profiles: the retire comment (admin function, comment required)
alter table public.profiles add column retired_comment text;

-- 2. reference_figures_history: every change to a figure, written by a trigger, never by the app
create table public.reference_figures_history (
  id uuid primary key default gen_random_uuid(),
  reference_figure_id uuid not null references public.reference_figures (id),
  field text not null,
  old_value text,
  new_value text,
  comment text,
  changed_by uuid references public.profiles (id),
  changed_at timestamptz not null default now()
);
comment on table public.reference_figures_history is 'Written by trigger reference_figures_write_history on every insert and update of reference_figures. The app never writes here.';
alter table public.reference_figures_history enable row level security;
revoke all on table public.reference_figures_history from anon;
revoke delete, truncate on table public.reference_figures_history from authenticated;

-- 3. helpers: "me" for every policy. Definer so they read profiles regardless of the caller's own read scope.
create or replace function public.current_profile_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select p.id from public.profiles p where p.auth_user_id = auth.uid() and p.retired_at is null limit 1
$$;
create or replace function public.is_esg_lead()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.retired_at is null and p.role = 'esg_lead')
$$;
create or replace function public.is_cfo()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.retired_at is null and p.role = 'cfo')
$$;
create or replace function public.my_site_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select p.site_id from public.profiles p where p.auth_user_id = auth.uid() and p.retired_at is null and p.role = 'site_user' limit 1
$$;
revoke all on function public.current_profile_id(), public.is_esg_lead(), public.is_cfo(), public.my_site_id() from public, anon;
grant execute on function public.current_profile_id(), public.is_esg_lead(), public.is_cfo(), public.my_site_id() to authenticated;

-- A write from an app session is allowed only inside a narrow function (which sets app.narrow_function for its
-- transaction). A write with no signed-in identity (a migration, the dashboard, the admin function's secret key)
-- is the platform owner's or the admin function's and passes; anon never reaches a table at all.
create or replace function public.app_write_allowed()
returns boolean language sql stable set search_path = '' as $$
  select auth.uid() is null or coalesce(current_setting('app.narrow_function', true), '') = 'on'
$$;
revoke all on function public.app_write_allowed() from public, anon;
grant execute on function public.app_write_allowed() to authenticated;

-- 4. the link trigger: a new login identity is matched to its profile by email; no profile, no link, no rows
create or replace function public.link_profile_on_signup()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform set_config('app.narrow_function', 'on', true);
  update public.profiles set auth_user_id = new.id
  where lower(email) = lower(new.email) and auth_user_id is null;
  return new;
end $$;
revoke all on function public.link_profile_on_signup() from public, anon, authenticated;
create trigger link_profile_on_signup after insert on auth.users
  for each row execute function public.link_profile_on_signup();

-- 5. profiles: nobody writes a profile from an app session; the admin function (secret key) and the narrow functions do
create or replace function public.profiles_protect()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not public.app_write_allowed() then
    raise exception 'profiles are changed only through the admin function' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  if tg_op = 'UPDATE' and new.email is distinct from old.email then
    new.email := lower(new.email);
  end if;
  return new;
end $$;
revoke all on function public.profiles_protect() from public, anon, authenticated;
create trigger profiles_protect before insert or update or delete on public.profiles
  for each row execute function public.profiles_protect();

-- 6. projects: the protected columns are set by the system; an app session edits content only, while the policy allows
create or replace function public.projects_protect()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := public.current_profile_id();
begin
  if tg_op = 'INSERT' then
    if not public.app_write_allowed() then
      -- a plain app insert: a new project in Potential, version 1, submitted by the caller
      if new.status <> 'Potential' or new.version <> 1 or new.supersedes_project_id is not null then
        raise exception 'a new project starts in Potential as version 1' using errcode = '42501';
      end if;
      new.created_by := v_me;
      new.updated_by := v_me;
      new.created_at := now();
      new.updated_at := now();
    end if;
    return new;
  end if;
  if tg_op = 'UPDATE' then
    if not public.app_write_allowed() then
      if new.status is distinct from old.status or new.version is distinct from old.version
         or new.project_code is distinct from old.project_code or new.supersedes_project_id is distinct from old.supersedes_project_id
         or new.scope is distinct from old.scope or new.site_id is distinct from old.site_id
         or new.created_by is distinct from old.created_by or new.created_at is distinct from old.created_at then
        raise exception 'status, version, code, predecessor, scope, site and submitter are set by the transition functions only' using errcode = '42501';
      end if;
      new.updated_by := v_me;
    elsif v_me is not null then
      new.updated_by := v_me;
    end if;
    new.updated_at := now();
    return new;
  end if;
  return old;
end $$;
revoke all on function public.projects_protect() from public, anon, authenticated;
create trigger projects_protect before insert or update on public.projects
  for each row execute function public.projects_protect();

-- 7. reference_figures: the figures are editable, the key columns and the submitter are not; every change is logged
create or replace function public.reference_figures_protect()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := public.current_profile_id();
begin
  if tg_op = 'INSERT' then
    if not public.app_write_allowed() then
      new.created_by := v_me;
      new.entered_by := v_me;
      new.updated_by := v_me;
      new.created_at := now();
      new.updated_at := now();
    end if;
    return new;
  end if;
  if not public.app_write_allowed() then
    if new.site_id is distinct from old.site_id or new.year is distinct from old.year or new.kind is distinct from old.kind
       or new.created_by is distinct from old.created_by or new.created_at is distinct from old.created_at
       or new.status is distinct from old.status then
      raise exception 'site, year, kind, status and submitter of a reference figure never change' using errcode = '42501';
    end if;
    new.updated_by := v_me;
    new.entered_by := v_me;
  elsif v_me is not null then
    new.updated_by := v_me;
  end if;
  new.updated_at := now();
  return new;
end $$;
revoke all on function public.reference_figures_protect() from public, anon, authenticated;
create trigger reference_figures_protect before insert or update on public.reference_figures
  for each row execute function public.reference_figures_protect();

create or replace function public.reference_figures_write_history()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_comment text := nullif(trim(coalesce(current_setting('app.change_comment', true), '')), '');
  v_by uuid := coalesce(new.updated_by, new.created_by);
  v_field text; v_old text; v_new text;
begin
  if tg_op = 'INSERT' then
    insert into public.reference_figures_history (reference_figure_id, field, old_value, new_value, comment, changed_by)
    values (new.id, 'created', null, new.year || ' ' || new.kind, v_comment, new.created_by);
    return new;
  end if;
  for v_field, v_old, v_new in
    select * from (values
      ('scope12_tco2e', old.scope12_tco2e::text, new.scope12_tco2e::text),
      ('water_withdrawal_m3', old.water_withdrawal_m3::text, new.water_withdrawal_m3::text),
      ('output_t', old.output_t::text, new.output_t::text),
      ('waste_total_t', old.waste_total_t::text, new.waste_total_t::text),
      ('waste_diverted_t', old.waste_diverted_t::text, new.waste_diverted_t::text)
    ) as changes (field, old_value, new_value)
    where old_value is distinct from new_value
  loop
    insert into public.reference_figures_history (reference_figure_id, field, old_value, new_value, comment, changed_by)
    values (new.id, v_field, v_old, v_new, v_comment, v_by);
  end loop;
  return new;
end $$;
revoke all on function public.reference_figures_write_history() from public, anon, authenticated;
create trigger reference_figures_write_history after insert or update on public.reference_figures
  for each row execute function public.reference_figures_write_history();

-- 8. sites and targets: the key never changes; a site in use is deactivated and replaced, never renamed
create or replace function public.sites_protect()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := public.current_profile_id();
begin
  if tg_op = 'UPDATE' then
    if new.code is distinct from old.code then
      raise exception 'a site code never changes' using errcode = '42501';
    end if;
    if new.name is distinct from old.name and (
      exists (select 1 from public.projects p where p.site_id = old.id) or
      exists (select 1 from public.reference_figures r where r.site_id = old.id) or
      exists (select 1 from public.profiles pr where pr.site_id = old.id)
    ) then
      raise exception 'a site that projects, figures or users reference cannot be renamed: deactivate it and add a new one' using errcode = '42501';
    end if;
  end if;
  if v_me is not null then new.updated_by := v_me; end if;
  new.updated_at := now();
  return new;
end $$;
revoke all on function public.sites_protect() from public, anon, authenticated;
create trigger sites_protect before insert or update on public.sites
  for each row execute function public.sites_protect();

create or replace function public.targets_protect()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := public.current_profile_id();
begin
  if tg_op = 'UPDATE' and new.category is distinct from old.category then
    raise exception 'a target category never changes' using errcode = '42501';
  end if;
  if v_me is not null then
    new.updated_by := v_me;
    if tg_op = 'INSERT' then new.set_by := v_me; end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
revoke all on function public.targets_protect() from public, anon, authenticated;
create trigger targets_protect before insert or update on public.targets
  for each row execute function public.targets_protect();

-- 9. decisions: written by the transition functions only; their updated_by follows the caller
create or replace function public.decisions_protect()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not public.app_write_allowed() then
    raise exception 'decisions are written by the transition functions only' using errcode = '42501';
  end if;
  return new;
end $$;
revoke all on function public.decisions_protect() from public, anon, authenticated;
create trigger decisions_protect before insert or update on public.decisions
  for each row execute function public.decisions_protect();
