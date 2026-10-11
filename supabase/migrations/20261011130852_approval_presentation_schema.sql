-- v1.3 (builder decision, 11 Oct 2026): the approval presentation. docs/access-matrix.md §5 v1.3 delta and policy plan
-- lines 56 to 60. Part 1 of 2: the columns on projects, the exemption of every version existing today, the key helper,
-- the column trigger, the history trigger, the new-version helper and endorse_project. Part 2 creates the bucket and its policies.

-- 1. columns. presentation_required is added with default false so that every version existing today is exempt (line 60)
-- without an update (no trigger fires, no updated_at moves); the default then becomes true for every version from now on.
alter table public.projects
  add column presentation_file_name text,
  add column presentation_uploaded_by uuid references public.profiles (id),
  add column presentation_uploaded_at timestamptz,
  add column presentation_required boolean not null default false;
alter table public.projects alter column presentation_required set default true;
alter table public.projects
  add constraint projects_presentation_is_pptx check (presentation_file_name is null or presentation_file_name ~* '\.pptx$'),
  add constraint projects_presentation_fields_together check (
    (presentation_file_name is null) = (presentation_uploaded_at is null)
    and (presentation_file_name is null) = (presentation_uploaded_by is null));
comment on column public.projects.presentation_file_name is 'The approval presentation of this version: the uploaded file''s name. The object is presentations/<id>/presentation.pptx. Written by the owner while Potential; frozen from Pending approval on.';
comment on column public.projects.presentation_required is 'True for every version created from v1.3 on; false for the versions that existed before the rule and for the demo rows (exempt: no file, none accepted).';

-- 2. the object key of a version's presentation, defined once; and whether the object is in place (definer: a session
-- reads storage.objects only through its own policy, the triggers and endorse_project need the plain truth)
create or replace function public.presentation_key(p_project uuid)
returns text language sql immutable set search_path = '' as $$
  select p_project::text || '/presentation.pptx'
$$;
revoke all on function public.presentation_key(uuid) from public, anon;
grant execute on function public.presentation_key(uuid) to authenticated;

create or replace function public.presentation_object_exists(p_project uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from storage.objects o where o.bucket_id = 'presentations' and o.name = public.presentation_key(p_project))
$$;
revoke all on function public.presentation_object_exists(uuid) from public, anon, authenticated;

-- 3. the column trigger: as in the access phase, plus the presentation columns (line 56)
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
      -- v1.3: a new version requires a presentation and starts without one; the file is uploaded after the insert (line 61)
      if not new.presentation_required or new.presentation_file_name is not null
         or new.presentation_uploaded_by is not null or new.presentation_uploaded_at is not null then
        raise exception 'a new project requires a presentation, attached after it is saved' using errcode = '42501';
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
      -- v1.3, line 56: the uploader, the time and the requirement are set by the system, never by the caller
      if new.presentation_required is distinct from old.presentation_required
         or new.presentation_uploaded_by is distinct from old.presentation_uploaded_by
         or new.presentation_uploaded_at is distinct from old.presentation_uploaded_at then
        raise exception 'the uploader, the time and the requirement of the presentation are set by the system' using errcode = '42501';
      end if;
      if new.presentation_file_name is distinct from old.presentation_file_name then
        if old.status <> 'Potential' then
          raise exception 'the presentation is frozen from Pending approval on' using errcode = '42501';
        end if;
        if not old.presentation_required then
          raise exception 'this version was registered before the presentation rule and takes no file' using errcode = '42501';
        end if;
        if new.presentation_file_name is null then
          raise exception 'a presentation is replaced, never removed' using errcode = '42501';
        end if;
        if not public.presentation_object_exists(new.id) then
          raise exception 'upload the file first: no presentation is stored for this project' using errcode = '42501';
        end if;
        new.presentation_uploaded_by := v_me;
        new.presentation_uploaded_at := now();
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

-- 4. the history trigger: as before, plus the presentation row (line 58: old and new file name, who, when)
create or replace function public.projects_write_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_comment text := nullif(trim(coalesce(current_setting('app.change_comment', true), '')), '');
  v_by uuid := coalesce(new.updated_by, new.created_by);
  v_field text;
  v_old text;
  v_new text;
begin
  if tg_op = 'INSERT' then
    insert into public.project_history (project_id, field, old_value, new_value, comment, changed_by)
    values (new.id, 'created', null, new.project_code || ' v' || new.version || ' (' || new.status || ')', v_comment, new.created_by);
    return new;
  end if;

  for v_field, v_old, v_new in
    select * from (values
      ('title', old.title, new.title),
      ('category', old.category, new.category),
      ('scope', old.scope, new.scope),
      ('site_id', old.site_id::text, new.site_id::text),
      ('description', old.description, new.description),
      ('total_impact', old.total_impact::text, new.total_impact::text),
      ('annual_impact', old.annual_impact::text, new.annual_impact::text),
      ('unit', old.unit, new.unit),
      ('start_year', old.start_year::text, new.start_year::text),
      ('capex_eur', old.capex_eur::text, new.capex_eur::text),
      ('opex_eur_per_year', old.opex_eur_per_year::text, new.opex_eur_per_year::text),
      ('owner_name', old.owner_name, new.owner_name),
      ('status', old.status, new.status),
      ('version', old.version::text, new.version::text),
      ('supersedes_project_id', old.supersedes_project_id::text, new.supersedes_project_id::text),
      ('presentation', old.presentation_file_name, new.presentation_file_name)
    ) as changes (field, old_value, new_value)
    where old_value is distinct from new_value
  loop
    insert into public.project_history (project_id, field, old_value, new_value, comment, changed_by)
    values (new.id, v_field, v_old, v_new, v_comment, v_by);
  end loop;
  return new;
end;
$$;

-- 5. a new version (resubmit_project, reapprove_project; line 59) requires a presentation and starts without one
create or replace function public.new_project_version(v_p public.projects, v_me uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_new uuid;
begin
  if exists (select 1 from public.projects n where n.supersedes_project_id = v_p.id) then
    raise exception 'a newer version of this project already exists' using errcode = '42501';
  end if;
  insert into public.projects (project_code, title, category, scope, site_id, description, total_impact, annual_impact, unit,
    start_year, capex_eur, opex_eur_per_year, owner_name, status, version, supersedes_project_id, created_by, updated_by,
    presentation_required, presentation_file_name, presentation_uploaded_by, presentation_uploaded_at)
  values (v_p.project_code, v_p.title, v_p.category, v_p.scope, v_p.site_id, v_p.description, v_p.total_impact, v_p.annual_impact,
    v_p.unit, v_p.start_year, v_p.capex_eur, v_p.opex_eur_per_year, v_p.owner_name, 'Potential', v_p.version + 1, v_p.id, v_me, v_me,
    true, null, null, null)
  returning id into v_new;
  return v_new;
end $$;

-- 6. endorse (line 57): a version that requires a presentation is endorsed only with its file in place
create or replace function public.endorse_project(p_project uuid, p_comment text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public.require_esg_lead(); v_c text := public.require_comment(p_comment); v_p public.projects;
begin
  perform public.begin_narrow(v_c);
  v_p := public.lock_project(p_project);
  if v_p.status <> 'Potential' then raise exception 'only a Potential project can be endorsed' using errcode = '42501'; end if;
  if v_p.presentation_required and (v_p.presentation_file_name is null or not public.presentation_object_exists(v_p.id)) then
    raise exception 'A presentation is required before endorsement' using errcode = '42501';
  end if;
  perform public.write_decision(p_project, 'endorsement', 'Endorsed', v_c, null, null, v_me);
  update public.projects set status = 'Pending approval' where id = p_project;
  return p_project;
end $$;
