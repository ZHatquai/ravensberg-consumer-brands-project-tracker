-- sites: the seven Ravensberg sites (lookup table). Seeded here, never through the app.
-- RLS on from creation; anon has no grant and no policy; no role policy until the full access matrix.
create table public.sites (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[0-9]{4}$'),
  name text not null,
  city text not null,
  type text not null,
  active boolean not null default true,
  updated_by uuid, -- references profiles(id); the constraint is added in create_profiles (profiles does not exist yet)
  updated_at timestamptz not null default now()
);
comment on table public.sites is 'The seven Ravensberg sites. Deactivated, never deleted.';

alter table public.sites enable row level security;
revoke all on table public.sites from anon;

insert into public.sites (code, name, city, type) values
  ('1000', 'Werk Bielefeld', 'Bielefeld', 'Beverages plant'),
  ('1100', 'Logistikzentrum Bad Oeynhausen', 'Bad Oeynhausen', 'Logistics centre'),
  ('1200', 'Werk Paderborn', 'Paderborn', 'Confectionery plant'),
  ('1300', 'Werk Gütersloh', 'Gütersloh', 'Food ingredients plant'),
  ('1400', 'Werk Minden', 'Minden', 'Home and personal care plant'),
  ('1500', 'Werk Herford', 'Herford', 'Packaging plant'),
  ('1600', 'Werk Lippstadt', 'Lippstadt', 'Homeware plant');
