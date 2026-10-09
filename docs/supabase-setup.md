# Supabase setup — Ravensberg Project Tracker

> Schema source of truth. Created by Claude Code in session 1 and updated at every save point that touches the database. Read before any schema change. The migration files in `supabase/migrations/` can rebuild this database from nothing.

## 1. Header

| Detail | Value |
|---|---|
| Project name | ravensberg-consumer-brands |
| Project ref | bqyjulvljqafubusplgm |
| URL | https://bqyjulvljqafubusplgm.supabase.co |
| Region | eu-central-1 (EU, Frankfurt) |
| Postgres | 17 |
| Plan | Free — no backups; pauses after about a week unused; switch to Pro is a manual billing step when real users rely on the tool (and for the workshop week) |
| Population pattern | P2 internal only — no anon access to any table, now or later (docs/access-matrix.md §1) |
| Key system | Publishable / secret keys (`sb_publishable_…` / `sb_secret_…`). The values are verified on the first live build; nothing in this repo holds a key value. Legacy anon / service_role keys: not checked yet (no Netlify connection in session 1) — see §9 |
| Auth | none yet (§7) |
| State on 9 October 2026 | seven tables, RLS on every one, no policy on any, seeds in `sites` (7), `profiles` (3), `targets` (4); `reference_figures`, `projects`, `decisions`, `project_history` empty |

## 2. Tables

All tables are in schema `public`. Every `uuid` primary key defaults to `gen_random_uuid()`; every `created_at` / `updated_at` / `recorded_at` defaults to `now()`. Columns named `*_by` reference `profiles.id` and stay empty until a login exists.

### sites (lookup)

| Column | Type | Constraints / default |
|---|---|---|
| id | uuid | PK |
| code | text | not null, unique, four digits (`^[0-9]{4}$`) |
| name | text | not null |
| city | text | not null |
| type | text | not null |
| active | boolean | not null, default true |
| updated_by | uuid | → profiles.id (constraint `sites_updated_by_fkey`, added in the profiles migration) |
| updated_at | timestamptz | not null, default now() |

Seeded: 1000 Werk Bielefeld (Beverages plant) · 1100 Logistikzentrum Bad Oeynhausen (Logistics centre; reports pallets handled, not tonnes) · 1200 Werk Paderborn (Confectionery plant) · 1300 Werk Gütersloh (Food ingredients plant) · 1400 Werk Minden (Home and personal care plant) · 1500 Werk Herford (Packaging plant) · 1600 Werk Lippstadt (Homeware plant). Cities and types are made up by the builder (spec §15).

### profiles

| Column | Type | Constraints / default |
|---|---|---|
| id | uuid | PK (own id, not the auth id) |
| auth_user_id | uuid | unique, nullable — empty until the access phase links each login identity by email |
| email | text | not null, unique, lower case (`email = lower(email)`); the seed key |
| name | text | not null |
| role | text | not null, in (`site_user`, `esg_lead`, `cfo`); `esg_lead` is the admin |
| site_id | uuid | → sites.id; check `profiles_site_only_for_site_users`: set exactly when role = site_user |
| retired_at | timestamptz | nullable; set = retired (the active state) |
| created_at | timestamptz | not null, default now() ("added on" on the Users screen) |
| updated_by | uuid | → profiles.id |
| updated_at | timestamptz | not null, default now() |

Seeded (spec §6): Zyad Hatquai, z.hatquai@sustainos.io, esg_lead · Zee, z.hatquai@gmail.com, site_user, site 1200 (to confirm, spec §15) · Sam, sustainatrend@gmail.com, cfo.

### targets (lookup)

| Column | Type | Constraints / default |
|---|---|---|
| id | uuid | PK |
| category | text | not null, unique, in (`emissions`, `water_absolute`, `water_intensity`, `waste_diversion`) |
| base_year | integer | not null, 2000–2100 |
| target_year | integer | not null, 2000–2100, > base_year (`targets_years`) |
| value | numeric(6,2) | not null, 0 < value ≤ 100; a percentage: reduction for emissions and water, diversion rate for waste |
| set_by | uuid | → profiles.id |
| active | boolean | not null, default true |
| updated_by | uuid | → profiles.id |
| updated_at | timestamptz | not null, default now() |

Seeded: emissions 42 · water_absolute 10 · water_intensity 20 · waste_diversion 95; base year 2024, target year 2030.

### reference_figures (record)

| Column | Type | Constraints / default |
|---|---|---|
| id | uuid | PK |
| site_id | uuid | → sites.id; null = group |
| year | integer | not null, 2000–2100 |
| kind | text | not null, in (`actual`, `plan`) |
| scope12_tco2e | numeric(14,2) | ≥ 0; Scope 1+2, location-based, FY2024 factor set |
| water_withdrawal_m3 | numeric(14,2) | ≥ 0 |
| output_t | numeric(14,2) | ≥ 0; site 1100: pallets handled |
| waste_total_t | numeric(14,2) | ≥ 0 |
| waste_diverted_t | numeric(14,2) | ≥ 0, ≤ waste_total_t (`reference_figures_diverted_within_total`) |
| entered_by | uuid | → profiles.id |
| status | text | not null, default `'active'` (the full run fixes the other values) |
| created_by, created_at, updated_by, updated_at | audit | as above |

Unique `(site_id, year, kind)` with nulls not distinct (`reference_figures_one_per_site_year_kind`): one group row per year and kind.

### projects (main record, one row per version)

| Column | Type | Constraints / default |
|---|---|---|
| id | uuid | PK |
| project_code | text | not null, default `'PRJ-' || lpad(nextval('project_code_seq'), 4, '0')` (PRJ-0001 …); a resubmission keeps the code |
| title | text | not null, not blank |
| category | text | not null, in (`Emissions`, `Water`, `Waste`) |
| scope | text | not null, in (`site`, `group`) |
| site_id | uuid | → sites.id; `projects_site_scope_needs_site`: set exactly when scope = site |
| description | text | not null, not blank |
| total_impact | numeric(14,2) | not null, ≥ annual_impact (`projects_total_at_least_annual`) |
| annual_impact | numeric(14,2) | not null, > 0 |
| unit | text | not null; `projects_unit_follows_category`: tCO₂e per year / m³ per year / tonnes diverted per year by category |
| start_year | integer | not null, 2000–2100 (2024–2030 is a form rule; a later year is accepted with a warning) |
| capex_eur | numeric(14,2) | not null, ≥ 0 |
| opex_eur_per_year | numeric(14,2) | not null; negative = saving |
| owner_name | text | not null, not blank (personal data, spec §7) |
| status | text | not null, default `'Potential'`, in (Potential, Pending approval, Approved, Declined, Retired, Obsolete) |
| version | integer | not null, default 1, ≥ 1 |
| supersedes_project_id | uuid | → projects.id; `projects_resubmission_has_predecessor`: set exactly when version > 1 |
| created_by, created_at, updated_by, updated_at | audit | as above |

Unique `(project_code, version)` (`projects_code_version`). Sequence `public.project_code_seq` (integer, starts at 1; anon has no usage grant).

### decisions (record)

| Column | Type | Constraints / default |
|---|---|---|
| id | uuid | PK |
| project_id | uuid | not null → projects.id |
| stage | text | not null, in (`endorsement`, `committee`, `decline`, `obsolete`) |
| outcome | text | not null, in (`Endorsed`, `Approved`, `Declined`, `Obsolete`); `decisions_outcome_fits_stage`: endorsement→Endorsed, committee→Approved or Declined, decline→Declined, obsolete→Obsolete |
| comment | text | not null, not blank (always required) |
| attendees | text | people in the room; `decisions_committee_names_attendees`: required for committee decisions (personal data, spec §7) |
| decision_date | date | not null |
| recorded_by | uuid | → profiles.id |
| recorded_at | timestamptz | not null, default now() |
| status | text | not null, default `'active'` |
| created_by, created_at, updated_by, updated_at | audit | as above |

### project_history (audit trail, trigger-written)

| Column | Type | Constraints / default |
|---|---|---|
| id | uuid | PK |
| project_id | uuid | not null → projects.id |
| field | text | not null (`created` on insert, otherwise the column name) |
| old_value | text | |
| new_value | text | |
| comment | text | the change comment when one was supplied (see §4) |
| changed_by | uuid | → profiles.id |
| changed_at | timestamptz | not null, default now() |

## 3. Rules (per table)

Source: docs/access-matrix.md §6, short form. Mechanism in brackets.

| Table | Rule | Mechanism | Matrix line |
|---|---|---|---|
| every table | anon: nothing — no policy, no table grant (`revoke all … from anon` after each create), no sequence grant | none (default deny) | §6 line 1 |
| every table | authenticated: nothing until the full run — RLS enabled, no policy; Auth not configured | none (default deny) | §6 line 2 |
| every table | nothing is deleted through the app: `DELETE` and `TRUNCATE` revoked from authenticated, no DELETE policy will ever exist | grant (hardening of §7 rule 4) | §7 rule 4 |
| sites, targets | seeded by a named migration, never through the app | migration | §6 line 3 |
| profiles | the three named first holders seeded by migration (spec §6); no Auth | migration | spec §6 |

Default deny applies everywhere: where no line says yes, the answer is nothing. The browser key reads and writes nothing today, as intended; every screen runs on fixture data.

## 4. Triggers

| Trigger | Table | What it does |
|---|---|---|
| `sites_set_updated_at`, `profiles_set_updated_at`, `targets_set_updated_at`, `reference_figures_set_updated_at`, `projects_set_updated_at`, `decisions_set_updated_at` | each table | before update: sets `updated_at = now()` (function `set_updated_at`) |
| `projects_write_history` | projects | after insert: one `created` row (`PRJ-0001 v1 (Potential)`); after update: one row per changed field among title, category, scope, site_id, description, total_impact, annual_impact, unit, start_year, capex_eur, opex_eur_per_year, owner_name, status, version, supersedes_project_id, with old and new value. `changed_by` = `updated_by` (insert: `created_by`). `comment` = the transaction setting `app.change_comment` when set (`select set_config('app.change_comment', '…', true)` before the write; the narrow functions of the access phase supply it). Tested in session 1: insert → 1 row, update of two fields with a comment → 2 rows, rolled back. |

Platform default: event trigger `ensure_rls` (function `public.rls_auto_enable`, owner postgres) enables RLS on every new table in `public`. Shipped by Supabase on this project; left in place.

## 5. Functions

| Function | Security | Who may call it | Checks first | What it does |
|---|---|---|---|---|
| `public.set_updated_at()` | invoker, `search_path = ''` | nobody directly (returns trigger; EXECUTE revoked from public, anon, authenticated) | — | sets `updated_at` |
| `public.projects_write_history()` | **definer**, `search_path = ''`, schema-qualified names | nobody directly (returns trigger; EXECUTE revoked from public, anon, authenticated); fires only on a write to `projects` that RLS has already allowed | — (not an RPC; it never runs on its own) | writes `project_history` so that no user ever needs an insert right on the history table. Build decision: the audit trail is written by the system, not by the user. |
| `public.rls_auto_enable()` | definer (Supabase platform default) | nobody through the API: EXECUTE revoked from public, anon, authenticated in `harden_grants` | — | event trigger function; enables RLS on new tables |

No RPC exists yet. The function contract in CLAUDE.md applies to every function the access phase adds.

## 6. Buckets

None. No file storage in version 1.

## 7. Auth

None yet. Configured in the access phase only, after the full docs/access-matrix.md: magic link, sign-ups off, custom SMTP (Resend) entered by the builder in the dashboard. The `profiles` table is ready: `auth_user_id` empty, email is the link key.

## 8. Environment variable names this project expects (never values)

| Name | Read by | Set where |
|---|---|---|
| `VITE_SUPABASE_URL` | browser | Netlify env, written by the Supabase extension |
| `VITE_SUPABASE_ANON_KEY` | browser; value must be the publishable key (`sb_publishable_…`) | Netlify env, written by the Supabase extension (paste the publishable key by hand only if the extension wrote a legacy `eyJ` value) |
| `SUPABASE_SERVICE_ROLE_KEY` | Netlify Functions only (admin user-creation, access phase); value must be the secret key (`sb_secret_…`) | Netlify env, written by the Supabase extension |
| `SUPABASE_DATABASE_URL` | server-side only, if ever needed | Netlify env, written by the Supabase extension |

Names to be verified on the first live build; if the extension writes different names, record the real names here. Nothing reads them yet: `src/lib/supabase.js` exists but no screen calls it.

## 9. Notes and flags for future sessions

- The database holds the seeds only. Every screen reads `src/fixtures/*.json`; the fixture `profiles.json` holds the three seeded people plus seven made-up site users (one per site, Zee for 1200) and one retired user, so every fixture project has a submitter and the Users screen has a list. The seeded `profiles` table holds the three named holders only.
- Zee's site is seeded as 1200 Werk Paderborn; confirm before the Access Architect's full run (spec §15).
- Legacy API keys: not checked yet (the Netlify site is not connected in session 1). On the first live build, check that the values start with `sb_`; if `eyJ`, the publishable key is pasted by hand and rotating the secret key becomes a dated handover item.
- `status` on decisions and reference_figures defaults to `'active'`; the full run fixes the other values (the calculations ignore rows with status `void`).
- Reporting year = the portfolio as of the end of that year (status rebuilt from `project_history` status rows); the current year = as of today. Build decision in PROGRESS.md.
- Carried to the full run (docs/access-matrix.md): Approved final yet editable by the ESG lead; Users screen changes role and site; `reference_figures_history`; Zee's site.
- The security advisor reports "RLS enabled, no policy" on all seven tables: intended until the full run.

## 10. Change log

| Session | Date | Migration file | What changed |
|---|---|---|---|
| 1 | 9 Oct 2026 | `20261009092418_create_sites.sql` | sites table, RLS on, anon revoked, seven sites seeded |
| 1 | 9 Oct 2026 | `20261009092440_create_profiles.sql` | profiles table, RLS on, anon revoked, FK sites.updated_by → profiles, three named holders seeded |
| 1 | 9 Oct 2026 | `20261009092452_create_targets.sql` | targets table, RLS on, anon revoked, four group targets seeded |
| 1 | 9 Oct 2026 | `20261009092507_create_reference_figures.sql` | reference_figures table, RLS on, anon revoked |
| 1 | 9 Oct 2026 | `20261009092518_create_projects.sql` | project_code_seq sequence, projects table with its checks, RLS on, anon revoked |
| 1 | 9 Oct 2026 | `20261009092544_create_decisions.sql` | decisions table with stage/outcome and attendee checks, RLS on, anon revoked |
| 1 | 9 Oct 2026 | `20261009092551_create_project_history_and_triggers.sql` | project_history table, RLS on, anon revoked; `set_updated_at` on six tables; `projects_write_history` trigger (definer) |
| 1 | 9 Oct 2026 | `20261009093037_harden_grants.sql` | DELETE and TRUNCATE revoked from authenticated on all seven tables; EXECUTE on the platform function `rls_auto_enable` revoked from public, anon, authenticated |
