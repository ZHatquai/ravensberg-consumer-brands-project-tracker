-- Access phase, part 3 of 3: the narrow functions of docs/access-matrix.md §6 (lines 10, 12 to 20).
-- Each: SECURITY DEFINER, search_path '', checks the caller's identity, active profile and role before anything else,
-- one row, one transition, a comment where the matrix requires it, the decision row and the history rows in the same call.
-- EXECUTE is revoked from public and anon and granted to authenticated; the internal helpers are not callable at all.

create or replace function public.require_me()
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare v_me uuid := public.current_profile_id();
begin
  if auth.uid() is null or v_me is null then
    raise exception 'not signed in, or no active profile' using errcode = '42501';
  end if;
  return v_me;
end $$;
create or replace function public.require_esg_lead()
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare v_me uuid := public.require_me();
begin
  if not public.is_esg_lead() then raise exception 'ESG lead only' using errcode = '42501'; end if;
  return v_me;
end $$;
create or replace function public.require_comment(p_comment text)
returns text language plpgsql immutable set search_path = '' as $$
begin
  if p_comment is null or length(trim(p_comment)) = 0 then raise exception 'a comment is required' using errcode = '22023'; end if;
  return trim(p_comment);
end $$;
create or replace function public.begin_narrow(p_comment text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform set_config('app.narrow_function', 'on', true);
  perform set_config('app.change_comment', coalesce(p_comment, ''), true);
end $$;
revoke all on function public.require_me(), public.require_esg_lead(), public.require_comment(text), public.begin_narrow(text) from public, anon, authenticated;

create or replace function public.lock_project(p_project uuid)
returns public.projects language plpgsql security definer set search_path = '' as $$
declare v_p public.projects;
begin
  select * into v_p from public.projects where id = p_project for update;
  if not found then raise exception 'project not found' using errcode = 'P0002'; end if;
  return v_p;
end $$;
revoke all on function public.lock_project(uuid) from public, anon, authenticated;

create or replace function public.owns_project(v_p public.projects)
returns boolean language sql stable security definer set search_path = '' as $$
  select (v_p.scope = 'group' and public.is_esg_lead())
      or (public.my_site_id() is not null and v_p.site_id = public.my_site_id())
$$;
revoke all on function public.owns_project(public.projects) from public, anon, authenticated;

create or replace function public.new_project_version(v_p public.projects, v_me uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_new uuid;
begin
  if exists (select 1 from public.projects n where n.supersedes_project_id = v_p.id) then
    raise exception 'a newer version of this project already exists' using errcode = '42501';
  end if;
  insert into public.projects (project_code, title, category, scope, site_id, description, total_impact, annual_impact, unit,
    start_year, capex_eur, opex_eur_per_year, owner_name, status, version, supersedes_project_id, created_by, updated_by)
  values (v_p.project_code, v_p.title, v_p.category, v_p.scope, v_p.site_id, v_p.description, v_p.total_impact, v_p.annual_impact,
    v_p.unit, v_p.start_year, v_p.capex_eur, v_p.opex_eur_per_year, v_p.owner_name, 'Potential', v_p.version + 1, v_p.id, v_me, v_me)
  returning id into v_new;
  return v_new;
end $$;
revoke all on function public.new_project_version(public.projects, uuid) from public, anon, authenticated;

create or replace function public.write_decision(p_project uuid, p_stage text, p_outcome text, p_comment text, p_attendees text, p_date date, v_me uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.decisions (project_id, stage, outcome, comment, attendees, decision_date, recorded_by, created_by, updated_by)
  values (p_project, p_stage, p_outcome, p_comment, p_attendees, coalesce(p_date, current_date), v_me, v_me, v_me);
end $$;
revoke all on function public.write_decision(uuid, text, text, text, text, date, uuid) from public, anon, authenticated;

-- line 12: Potential → Pending approval
create or replace function public.endorse_project(p_project uuid, p_comment text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public.require_esg_lead(); v_c text := public.require_comment(p_comment); v_p public.projects;
begin
  perform public.begin_narrow(v_c);
  v_p := public.lock_project(p_project);
  if v_p.status <> 'Potential' then raise exception 'only a Potential project can be endorsed' using errcode = '42501'; end if;
  perform public.write_decision(p_project, 'endorsement', 'Endorsed', v_c, null, null, v_me);
  update public.projects set status = 'Pending approval' where id = p_project;
  return p_project;
end $$;

-- line 13: Potential or Pending approval → Declined by the ESG lead
create or replace function public.decline_project(p_project uuid, p_comment text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public.require_esg_lead(); v_c text := public.require_comment(p_comment); v_p public.projects;
begin
  perform public.begin_narrow(v_c);
  v_p := public.lock_project(p_project);
  if v_p.status not in ('Potential', 'Pending approval') then raise exception 'only a Potential or Pending approval project can be declined' using errcode = '42501'; end if;
  perform public.write_decision(p_project, 'decline', 'Declined', v_c, null, null, v_me);
  update public.projects set status = 'Declined' where id = p_project;
  return p_project;
end $$;

-- line 14: Pending approval → Approved or Declined by the committee
create or replace function public.record_committee_decision(p_project uuid, p_outcome text, p_comment text, p_attendees text, p_decision_date date)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public.require_esg_lead(); v_c text := public.require_comment(p_comment); v_p public.projects;
begin
  if p_outcome not in ('Approved', 'Declined') then raise exception 'the committee outcome is Approved or Declined' using errcode = '22023'; end if;
  if p_attendees is null or length(trim(p_attendees)) = 0 then raise exception 'the people in the room are required' using errcode = '22023'; end if;
  if p_decision_date is null then raise exception 'the decision date is required' using errcode = '22023'; end if;
  perform public.begin_narrow(v_c);
  v_p := public.lock_project(p_project);
  if v_p.status <> 'Pending approval' then raise exception 'only a Pending approval project gets a committee decision' using errcode = '42501'; end if;
  perform public.write_decision(p_project, 'committee', p_outcome, v_c, trim(p_attendees), p_decision_date, v_me);
  update public.projects set status = p_outcome where id = p_project;
  return p_project;
end $$;

-- line 15: Approved → Obsolete
create or replace function public.mark_project_obsolete(p_project uuid, p_comment text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public.require_esg_lead(); v_c text := public.require_comment(p_comment); v_p public.projects;
begin
  perform public.begin_narrow(v_c);
  v_p := public.lock_project(p_project);
  if v_p.status <> 'Approved' then raise exception 'only an Approved project can be made obsolete' using errcode = '42501'; end if;
  perform public.write_decision(p_project, 'obsolete', 'Obsolete', v_c, null, null, v_me);
  update public.projects set status = 'Obsolete' where id = p_project;
  return p_project;
end $$;

-- line 16: re-approval: the Approved version becomes Obsolete, a new version starts in Potential
create or replace function public.reapprove_project(p_project uuid, p_comment text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public.require_esg_lead(); v_c text := public.require_comment(p_comment); v_p public.projects; v_new uuid;
begin
  perform public.begin_narrow(v_c);
  v_p := public.lock_project(p_project);
  if v_p.status <> 'Approved' then raise exception 'only an Approved project can be sent for re-approval' using errcode = '42501'; end if;
  v_new := public.new_project_version(v_p, v_me);
  perform public.write_decision(p_project, 'obsolete', 'Obsolete', 'Re-approval: ' || v_c, null, null, v_me);
  update public.projects set status = 'Obsolete' where id = p_project;
  return v_new;
end $$;

-- line 17: resubmit a Declined version as version n+1 in Potential (the site for its own projects; the ESG lead for group projects)
create or replace function public.resubmit_project(p_project uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public.require_me(); v_p public.projects;
begin
  perform public.begin_narrow('Resubmission of the declined version');
  v_p := public.lock_project(p_project);
  if not public.owns_project(v_p) then raise exception 'not your project' using errcode = '42501'; end if;
  if v_p.status <> 'Declined' then raise exception 'only a Declined project can be resubmitted' using errcode = '42501'; end if;
  return public.new_project_version(v_p, v_me);
end $$;

-- line 18: Declined → Retired (the site for its own projects; the ESG lead for group projects)
create or replace function public.retire_project(p_project uuid, p_comment text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public.require_me(); v_c text := public.require_comment(p_comment); v_p public.projects;
begin
  perform public.begin_narrow(v_c);
  v_p := public.lock_project(p_project);
  if not public.owns_project(v_p) then raise exception 'not your project' using errcode = '42501'; end if;
  if v_p.status <> 'Declined' then raise exception 'only a Declined project can be retired' using errcode = '42501'; end if;
  if exists (select 1 from public.projects n where n.supersedes_project_id = v_p.id) then
    raise exception 'this version was already resubmitted' using errcode = '42501';
  end if;
  update public.projects set status = 'Retired' where id = p_project;
  return p_project;
end $$;

-- line 19: Obsolete → Approved (reinstate), only while no newer version exists
create or replace function public.reinstate_project(p_project uuid, p_comment text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public.require_esg_lead(); v_c text := public.require_comment(p_comment); v_p public.projects;
begin
  perform public.begin_narrow(v_c);
  v_p := public.lock_project(p_project);
  if v_p.status <> 'Obsolete' then raise exception 'only an Obsolete project can be reinstated' using errcode = '42501'; end if;
  if exists (select 1 from public.projects n where n.supersedes_project_id = v_p.id) then
    raise exception 'a newer version exists; reinstating would count the project twice' using errcode = '42501';
  end if;
  update public.projects set status = 'Approved' where id = p_project;
  return p_project;
end $$;

-- line 10: the ESG lead corrects figures while Pending approval, with a comment
create or replace function public.edit_project_figures(p_project uuid, p_changes jsonb, p_comment text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public.require_esg_lead(); v_c text := public.require_comment(p_comment); v_p public.projects;
begin
  if p_changes is null or jsonb_typeof(p_changes) <> 'object' or p_changes = '{}'::jsonb then
    raise exception 'nothing to change' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_object_keys(p_changes) k where k not in ('total_impact', 'annual_impact', 'start_year', 'capex_eur', 'opex_eur_per_year')) then
    raise exception 'only the figures (total and annual impact, start year, capex, opex) can be corrected here' using errcode = '22023';
  end if;
  perform public.begin_narrow(v_c);
  v_p := public.lock_project(p_project);
  if v_p.status <> 'Pending approval' then raise exception 'figures are corrected only while Pending approval' using errcode = '42501'; end if;
  update public.projects set
    total_impact = coalesce((p_changes->>'total_impact')::numeric, total_impact),
    annual_impact = coalesce((p_changes->>'annual_impact')::numeric, annual_impact),
    start_year = coalesce((p_changes->>'start_year')::integer, start_year),
    capex_eur = coalesce((p_changes->>'capex_eur')::numeric, capex_eur),
    opex_eur_per_year = coalesce((p_changes->>'opex_eur_per_year')::numeric, opex_eur_per_year)
  where id = p_project;
  return p_project;
end $$;

-- line 20: GDPR anonymisation of a person's name: the profile (retired), every owner_name, every attendees mention, the history rows
create or replace function public.anonymise_person(p_profile uuid, p_name text)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public.require_esg_lead(); v_name text := public.require_comment(p_name); v_n integer := 0; v_r integer; v_pr public.profiles; r record;
begin
  perform public.begin_narrow('GDPR anonymisation');
  if p_profile is not null then
    select * into v_pr from public.profiles where id = p_profile for update;
    if not found then raise exception 'profile not found' using errcode = 'P0002'; end if;
    if v_pr.id = v_me then raise exception 'you cannot anonymise yourself' using errcode = '42501'; end if;
    if v_pr.retired_at is null then raise exception 'retire the user first' using errcode = '42501'; end if;
    update public.profiles set name = 'retired user', email = 'retired-' || left(replace(id::text, '-', ''), 12) || '@anonymised.invalid'
    where id = p_profile and name <> 'retired user';
    get diagnostics v_r = row_count; v_n := v_n + v_r;
  end if;
  update public.projects set owner_name = 'retired user' where owner_name = v_name;
  get diagnostics v_r = row_count; v_n := v_n + v_r;
  for r in select d.id, d.project_id from public.decisions d where d.attendees like '%' || v_name || '%' loop
    update public.decisions set attendees = replace(attendees, v_name, 'retired user') where id = r.id;
    insert into public.project_history (project_id, field, old_value, new_value, comment, changed_by)
    values (r.project_id, 'decision_attendees', v_name, 'retired user', 'GDPR anonymisation', v_me);
    v_n := v_n + 1;
  end loop;
  update public.project_history set old_value = replace(old_value, v_name, 'retired user'), new_value = replace(new_value, v_name, 'retired user')
  where field = 'owner_name' and (old_value = v_name or new_value = v_name);
  get diagnostics v_r = row_count; v_n := v_n + v_r;
  return v_n;
end $$;

revoke all on function
  public.endorse_project(uuid, text), public.decline_project(uuid, text), public.record_committee_decision(uuid, text, text, text, date),
  public.mark_project_obsolete(uuid, text), public.reapprove_project(uuid, text), public.resubmit_project(uuid), public.retire_project(uuid, text),
  public.reinstate_project(uuid, text), public.edit_project_figures(uuid, jsonb, text), public.anonymise_person(uuid, text)
from public, anon;
grant execute on function
  public.endorse_project(uuid, text), public.decline_project(uuid, text), public.record_committee_decision(uuid, text, text, text, date),
  public.mark_project_obsolete(uuid, text), public.reapprove_project(uuid, text), public.resubmit_project(uuid), public.retire_project(uuid, text),
  public.reinstate_project(uuid, text), public.edit_project_figures(uuid, jsonb, text), public.anonymise_person(uuid, text)
to authenticated;
