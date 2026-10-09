-- projects: one row per project version. The main record.
-- project_code is sequential (PRJ-0001) for a new project; a resubmission keeps the code and takes version n+1.
create sequence public.project_code_seq as integer start with 1;
revoke all on sequence public.project_code_seq from anon;

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  project_code text not null default ('PRJ-' || lpad(nextval('public.project_code_seq')::text, 4, '0')),
  title text not null check (length(trim(title)) > 0),
  category text not null check (category in ('Emissions', 'Water', 'Waste')),
  scope text not null check (scope in ('site', 'group')),
  site_id uuid references public.sites (id),
  description text not null check (length(trim(description)) > 0),
  total_impact numeric(14, 2) not null,
  annual_impact numeric(14, 2) not null check (annual_impact > 0),
  unit text not null,
  start_year integer not null check (start_year between 2000 and 2100),
  capex_eur numeric(14, 2) not null check (capex_eur >= 0),
  opex_eur_per_year numeric(14, 2) not null, -- negative allowed for a saving
  owner_name text not null check (length(trim(owner_name)) > 0),
  status text not null default 'Potential'
    check (status in ('Potential', 'Pending approval', 'Approved', 'Declined', 'Retired', 'Obsolete')),
  version integer not null default 1 check (version >= 1),
  supersedes_project_id uuid references public.projects (id),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now(),
  constraint projects_code_version unique (project_code, version),
  constraint projects_total_at_least_annual check (total_impact >= annual_impact),
  constraint projects_site_scope_needs_site check ((scope = 'site') = (site_id is not null)),
  constraint projects_unit_follows_category check (
    unit = case category
      when 'Emissions' then 'tCO₂e per year'
      when 'Water' then 'm³ per year'
      when 'Waste' then 'tonnes diverted per year'
    end
  ),
  constraint projects_resubmission_has_predecessor check ((version > 1) = (supersedes_project_id is not null))
);
comment on table public.projects is 'One row per project version. Status is set by actions, never typed. Nothing is deleted: retired or obsolete rows stay visible.';

alter table public.projects enable row level security;
revoke all on table public.projects from anon;
