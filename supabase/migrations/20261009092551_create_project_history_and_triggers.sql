-- project_history: the audit trail of projects, one row per changed field, written by a trigger. Never written by the app.
create table public.project_history (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id),
  field text not null,
  old_value text,
  new_value text,
  comment text,
  changed_by uuid references public.profiles (id),
  changed_at timestamptz not null default now()
);
comment on table public.project_history is 'Written by trigger projects_write_history on every insert and update of projects. The app never writes here.';

alter table public.project_history enable row level security;
revoke all on table public.project_history from anon;

-- updated_at: set on every update, on every table that carries the column. Security invoker: writes only the row being written.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.set_updated_at() from public, anon, authenticated;

create trigger sites_set_updated_at before update on public.sites
  for each row execute function public.set_updated_at();
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger targets_set_updated_at before update on public.targets
  for each row execute function public.set_updated_at();
create trigger reference_figures_set_updated_at before update on public.reference_figures
  for each row execute function public.set_updated_at();
create trigger projects_set_updated_at before update on public.projects
  for each row execute function public.set_updated_at();
create trigger decisions_set_updated_at before update on public.decisions
  for each row execute function public.set_updated_at();

-- history: one row per changed field on projects. Security definer so that history is written on every project write
-- without any user holding an insert right on project_history. Not callable directly (returns trigger; execute revoked);
-- it fires only on a write to projects that RLS has already allowed. The change comment, when the narrow functions of the
-- access phase supply one, is read from the transaction setting app.change_comment.
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
  return new;
end;
$$;
revoke all on function public.projects_write_history() from public, anon, authenticated;

create trigger projects_write_history after insert or update on public.projects
  for each row execute function public.projects_write_history();
