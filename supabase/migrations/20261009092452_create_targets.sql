-- targets: the four group targets (lookup table). Seeded here, never through the app.
-- value is a percentage: the reduction for emissions and water, the diversion rate for waste.
create table public.targets (
  id uuid primary key default gen_random_uuid(),
  category text not null unique check (category in ('emissions', 'water_absolute', 'water_intensity', 'waste_diversion')),
  base_year integer not null check (base_year between 2000 and 2100),
  target_year integer not null check (target_year between 2000 and 2100),
  value numeric(6, 2) not null check (value > 0 and value <= 100),
  set_by uuid references public.profiles (id),
  active boolean not null default true,
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now(),
  constraint targets_years check (target_year > base_year)
);
comment on table public.targets is 'Group targets: emissions −42 %, water absolute −10 %, water intensity −20 %, waste diversion 95 % at every site; base year 2024, target year 2030.';

alter table public.targets enable row level security;
revoke all on table public.targets from anon;

insert into public.targets (category, base_year, target_year, value) values
  ('emissions', 2024, 2030, 42),
  ('water_absolute', 2024, 2030, 10),
  ('water_intensity', 2024, 2030, 20),
  ('waste_diversion', 2024, 2030, 95);
