-- reference_figures: one row per site (or group when site_id is null) per year per kind (actual / plan).
-- Holds the base-year figures, the latest actuals and the 2030 plan. Nothing seeded: entered in the access phase.
create table public.reference_figures (
  id uuid primary key default gen_random_uuid(),
  site_id uuid references public.sites (id), -- null = group
  year integer not null check (year between 2000 and 2100),
  kind text not null check (kind in ('actual', 'plan')),
  scope12_tco2e numeric(14, 2) check (scope12_tco2e >= 0),
  water_withdrawal_m3 numeric(14, 2) check (water_withdrawal_m3 >= 0),
  output_t numeric(14, 2) check (output_t >= 0), -- site 1100: pallets handled (spec §9)
  waste_total_t numeric(14, 2) check (waste_total_t >= 0),
  waste_diverted_t numeric(14, 2) check (waste_diverted_t >= 0),
  entered_by uuid references public.profiles (id),
  status text not null default 'active',
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now(),
  constraint reference_figures_one_per_site_year_kind unique nulls not distinct (site_id, year, kind),
  constraint reference_figures_diverted_within_total check (
    waste_diverted_t is null or waste_total_t is null or waste_diverted_t <= waste_total_t
  )
);
comment on table public.reference_figures is 'Per site and year: Scope 1+2 (location-based, FY2024 factor set), water withdrawal, output, waste total and diverted.';

alter table public.reference_figures enable row level security;
revoke all on table public.reference_figures from anon;
