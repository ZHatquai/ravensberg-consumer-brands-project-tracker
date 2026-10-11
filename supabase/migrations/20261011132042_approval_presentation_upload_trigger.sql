-- v1.3 (builder decision, 11 Oct 2026), part 3 of 3: an upload is every write of the file name, a replacement under the
-- same name included, so the uploader, the time and the history row follow the column being written, not its value
-- changing (policy plan lines 56 and 58). projects_protect keeps the refusals of the system columns; the new trigger
-- projects_set_presentation (BEFORE UPDATE OF presentation_file_name; by name it fires after projects_protect) runs the
-- presentation checks and sets the uploader and the time. The time is clock_timestamp(), the moment of the upload.

-- 1. projects_protect without the file-name block (otherwise as in 20261011130852_approval_presentation_schema)
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
      new.updated_by := v_me;
    elsif v_me is not null then
      new.updated_by := v_me;
    end if;
    new.updated_at := now();
    return new;
  end if;
  return old;
end $$;

-- 2. the upload trigger: fires whenever a session writes presentation_file_name (line 56)
create or replace function public.projects_set_presentation()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := public.current_profile_id();
begin
  if public.app_write_allowed() then return new; end if; -- the platform owner's write: as written, the constraints apply
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
  new.presentation_uploaded_at := clock_timestamp();
  return new;
end $$;
revoke all on function public.projects_set_presentation() from public, anon, authenticated;
create trigger projects_set_presentation before update of presentation_file_name on public.projects
  for each row execute function public.projects_set_presentation();

-- 3. the history trigger: the presentation row follows the upload time, so a replacement under the same name is logged too (line 58)
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
      ('supersedes_project_id', old.supersedes_project_id::text, new.supersedes_project_id::text)
    ) as changes (field, old_value, new_value)
    where old_value is distinct from new_value
  loop
    insert into public.project_history (project_id, field, old_value, new_value, comment, changed_by)
    values (new.id, v_field, v_old, v_new, v_comment, v_by);
  end loop;
  if old.presentation_uploaded_at is distinct from new.presentation_uploaded_at then
    insert into public.project_history (project_id, field, old_value, new_value, comment, changed_by)
    values (new.id, 'presentation', old.presentation_file_name, new.presentation_file_name, v_comment, coalesce(new.presentation_uploaded_by, v_by));
  end if;
  return new;
end;
$$;
