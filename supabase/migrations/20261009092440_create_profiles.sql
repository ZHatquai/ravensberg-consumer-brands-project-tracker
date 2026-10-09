-- profiles: one row per user, linked to the login identity by email (auth_user_id stays empty until a login exists).
-- Retired, never deleted. Seeded with the three named first holders of spec §6; no Auth yet.
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique, -- auth.users(id), linked by the profile link trigger in the access phase
  email text not null unique check (email = lower(email)),
  name text not null,
  role text not null check (role in ('site_user', 'esg_lead', 'cfo')),
  site_id uuid references public.sites (id),
  retired_at timestamptz,
  created_at timestamptz not null default now(), -- "added on" on the Users screen (spec §8)
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now(),
  constraint profiles_site_only_for_site_users check ((role = 'site_user') = (site_id is not null))
);
comment on table public.profiles is 'One row per user; the seed key is the email. Role esg_lead is the admin. retired_at is the active state.';

alter table public.profiles enable row level security;
revoke all on table public.profiles from anon;

-- close the loop on sites.updated_by now that profiles exists
alter table public.sites
  add constraint sites_updated_by_fkey foreign key (updated_by) references public.profiles (id);

insert into public.profiles (email, name, role, site_id) values
  ('z.hatquai@sustainos.io', 'Zyad Hatquai', 'esg_lead', null),
  ('z.hatquai@gmail.com', 'Zee', 'site_user', (select id from public.sites where code = '1200')),
  ('sustainatrend@gmail.com', 'Sam', 'cfo', null);
