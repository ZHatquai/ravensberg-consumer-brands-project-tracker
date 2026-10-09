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
| Key system | Publishable / secret keys (`sb_publishable_…` / `sb_secret_…`). The Netlify extension wrote the legacy `eyJ` values on 9 Oct 2026; the builder replaced both by hand the same day (`VITE_SUPABASE_ANON_KEY` = publishable key, `SUPABASE_SERVICE_ROLE_KEY` = secret key, marked secret). Nothing in this repo holds a key value. The legacy keys can be disabled in the dashboard once the live login works (§9) |
| Auth | Supabase Auth, magic link, sign-ups off; as built in session 2 (§7) |
| State on 9 October 2026 (session 2) | eight tables (the seven plus `reference_figures_history`), RLS on every one, the policies, triggers and functions of docs/access-matrix.md §6 in place; the demo portfolio seeded (profiles 10, reference_figures 20, projects 38, decisions 57, project_history 99); thirteen migrations applied and saved in supabase/migrations/; refusal test half A passed (119 cases, supabase/refusal-test-half-a.sql) |

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
| auth_user_id | uuid | unique, nullable; set once by the trigger `link_profile_on_signup` when a login identity with the same email is created (§4); never written from a session |
| email | text | not null, unique, lower case (`email = lower(email)`); the seed key |
| name | text | not null |
| role | text | not null, in (`site_user`, `esg_lead`, `cfo`); `esg_lead` is the admin |
| site_id | uuid | → sites.id; check `profiles_site_only_for_site_users`: set exactly when role = site_user |
| retired_at | timestamptz | nullable; set = retired (the active state); written only by the admin-users function |
| retired_comment | text | the reason given when retiring; written only by the admin-users function (session 2) |
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
| status | text | not null, default `'active'`; never changes from a session (trigger) |
| created_by, created_at, updated_by, updated_at | audit | as above; fixed by the trigger `reference_figures_protect` |

Unique `(site_id, year, kind)` with nulls not distinct (`reference_figures_one_per_site_year_kind`): one group row per year and kind.

### reference_figures_history (audit trail, trigger-written; session 2)

| Column | Type | Constraints / default |
|---|---|---|
| id | uuid | PK |
| reference_figure_id | uuid | not null → reference_figures.id |
| field | text | not null (`created` on insert, otherwise one of scope12_tco2e, water_withdrawal_m3, output_t, waste_total_t, waste_diverted_t) |
| old_value | text | |
| new_value | text | |
| comment | text | the transaction setting `app.change_comment` when set |
| changed_by | uuid | → profiles.id |
| changed_at | timestamptz | not null, default now() |

RLS on, anon revoked, DELETE and TRUNCATE revoked from authenticated; read follows the figure (§3); written by `reference_figures_write_history` only.

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

Source: docs/access-matrix.md §6, one line per rule with its mechanism. "Me" = the caller's active profile, found by `current_profile_id()` (auth.uid() → profiles.auth_user_id, retired_at null). A login with no profile, or a retired one, matches no row anywhere. Built in session 2 (migrations `access_schema_delta`, `access_policies`, `access_functions`).

| Table | Rule | Mechanism | Matrix line |
|---|---|---|---|
| every table | anon: nothing — no policy, no table grant, no sequence grant, no EXECUTE on any function | none (default deny) | §6 line 1 |
| every table | nothing is deleted through the app: DELETE and TRUNCATE revoked from authenticated, no DELETE policy | grant | §7 rule 4 |
| every table | a session writes `created_by`, `created_at`, `updated_by`, `updated_at` never by hand: the column triggers set them to me and now() | trigger | §6 lines 6, 9, 30 |
| sites, targets | every active profile reads all rows | policy `sites_read`, `targets_read` | §6 line 41 |
| sites, targets | the ESG lead creates, updates and deactivates; a site code and a target category never change; a site that projects, figures or users reference is not renamed | policies `sites_insert_esg`, `sites_update_esg`, `targets_insert_esg`, `targets_update_esg` + triggers `sites_protect`, `targets_protect` | §6 line 42 |
| sites, targets | site user and CFO: no write | no policy | §6 line 43 |
| profiles | a site user reads the profiles of their own site plus the ESG lead's; the CFO and the ESG lead read all | policy `profiles_read` | §6 lines 35, 36 |
| profiles | nobody writes a profile from a session (no role, site or retired change, own row included); creation, role, site and retiring go only through the admin-users Netlify Function (secret key, caller verified as an active ESG lead, never the caller's own row) | no write policy + trigger `profiles_protect` + the function | §6 lines 37, 38 |
| profiles | `auth_user_id` is set once by the link trigger when the login identity is created | trigger `link_profile_on_signup` | §5 schema delta |
| profiles | anonymisation of a retired person's name and email, the owner names and attendee mentions | function `anonymise_person` | §6 line 20 |
| reference_figures | a site user reads, creates and updates their own site's rows; the CFO reads all; the ESG lead reads, creates and updates any site's rows and the group rows | policies `reference_figures_read`, `reference_figures_insert`, `reference_figures_update` | §6 lines 27 to 32 |
| reference_figures | site, year, kind, status and submitter never change from a session; `entered_by` follows the last writer | trigger `reference_figures_protect` | §6 line 30 |
| reference_figures | no delete; every change logged | grant; trigger `reference_figures_write_history` | §6 line 33 |
| reference_figures_history | read follows the figure; written by its trigger only | policy `reference_figures_history_read` | §6 line 34 |
| projects | a site user reads their site's rows; the CFO and the ESG lead read all | policy `projects_read` | §6 lines 3, 4 |
| projects | a site user creates site projects for their own site; the ESG lead creates group projects only (scope group, no site); always Potential, version 1 | policy `projects_insert` + trigger `projects_protect` | §6 lines 5, 6 |
| projects | a site user updates their site's project while Potential; the ESG lead updates their own group project while Potential | policy `projects_update_potential` | §6 lines 8, 9 |
| projects | status, version, project_code, supersedes_project_id, scope, site_id and the submitter are never written from a session | trigger `projects_protect` | §6 line 7 |
| projects | the ESG lead corrects the figures while Pending approval, with a comment | function `edit_project_figures` | §6 line 10 |
| projects | Approved, Declined, Retired and Obsolete rows are frozen (no policy reaches them) | policy (none applies) | §6 line 11 |
| projects | Potential → Pending approval (endorse, comment, ESG lead) | function `endorse_project` | §6 line 12 |
| projects | Potential or Pending approval → Declined (ESG lead, comment) | function `decline_project` | §6 line 13 |
| projects | Pending approval → Approved or Declined (committee: comment, people in the room, date; ESG lead) | function `record_committee_decision` | §6 line 14 |
| projects | Approved → Obsolete (ESG lead, comment) | function `mark_project_obsolete` | §6 line 15 |
| projects | re-approval: the Approved version Obsolete, version n+1 in Potential (ESG lead, comment) | function `reapprove_project` | §6 line 16 |
| projects | Declined → version n+1 in Potential, same project_code, linked (the site for its own, the ESG lead for group projects; refused if a newer version exists) | function `resubmit_project` | §6 line 17 |
| projects | Declined → Retired (the site for its own, the ESG lead for group projects; comment) | function `retire_project` | §6 line 18 |
| projects | Obsolete → Approved (reinstate, ESG lead, comment, only while no newer version exists) | function `reinstate_project` | §6 line 19 |
| projects | no delete | grant | §6 line 21 |
| decisions | read follows the project | policy `decisions_read` | §6 lines 22, 23 |
| decisions | written only inside the transition functions; no update, no delete | no write policy + trigger `decisions_protect` + grant | §6 line 24 |
| project_history | read follows the project; written by its trigger only; no delete | policy `project_history_read`; trigger; grant | §6 lines 25, 26 |

Default deny applies everywhere: where no line says yes, the answer is nothing. The narrow functions mark their transaction with the setting `app.narrow_function = on`; the column triggers let a protected column change only inside such a transaction (or in a migration or the admin function, where auth.uid() is null). Refusal test half A: `supabase/refusal-test-half-a.sql`, 119 cases, all as expected on 9 Oct 2026 (PROGRESS.md, Refusal test record).

## 4. Triggers

| Trigger | Table | What it does |
|---|---|---|
| `sites_set_updated_at`, `profiles_set_updated_at`, `targets_set_updated_at`, `reference_figures_set_updated_at`, `projects_set_updated_at`, `decisions_set_updated_at` | each table | before update: sets `updated_at = now()` (function `set_updated_at`) |
| `projects_write_history` | projects | after insert: one `created` row (`PRJ-0001 v1 (Potential)`); after update: one row per changed field with old and new value; `changed_by` = `updated_by`; `comment` = the transaction setting `app.change_comment` (set by the narrow functions) |
| `link_profile_on_signup` | auth.users (after insert) | marks the transaction as narrow and sets `profiles.auth_user_id` on the profile whose email matches the new identity's (case-insensitive) and has no link yet; an identity without a profile stays unlinked and reaches nothing |
| `profiles_protect` | profiles (before insert, update or delete) | refuses every write that is not from a migration, the admin function or a narrow function (`app_write_allowed()` false): no role, site, retired, name or email change from a session, own row included; lower-cases the email on an update |
| `projects_protect` | projects (before insert or update) | a session insert must be Potential, version 1, no predecessor, and gets `created_by` = me; a session update may not change status, version, project_code, supersedes_project_id, scope, site_id, created_by, created_at; sets `updated_by` = me, `updated_at` = now() |
| `reference_figures_protect` | reference_figures (before insert or update) | a session insert gets created_by, entered_by, updated_by = me; a session update may not change site_id, year, kind, status, created_by, created_at; sets entered_by and updated_by = me |
| `reference_figures_write_history` | reference_figures (after insert or update) | one `created` row on insert; one row per changed figure column on update, with old and new value, the caller and the transaction comment |
| `sites_protect` | sites (before insert or update) | refuses a change to `code`; refuses a rename while a project, figure or profile references the site; sets `updated_by`, `updated_at` |
| `targets_protect` | targets (before insert or update) | refuses a change to `category`; sets `set_by` on insert, `updated_by`, `updated_at` |
| `decisions_protect` | decisions (before insert or update) | refuses every write outside a transition function (`app_write_allowed()` false) |

Platform default: event trigger `ensure_rls` (function `public.rls_auto_enable`) enables RLS on every new table in `public`. Left in place.

## 5. Functions

Every function below is `SECURITY DEFINER` with `SET search_path = ''` and schema-qualified names unless marked invoker. The callable ones check auth.uid() and the caller's active profile and role before anything else and raise `42501` otherwise; EXECUTE is revoked from public and anon and granted to authenticated. The internal helpers and the trigger functions are not callable through the API at all (EXECUTE revoked from authenticated too).

| Function | Security | Who may call it | Checks first | What it does |
|---|---|---|---|---|
| `set_updated_at()` | invoker | nobody directly | — | trigger: `updated_at = now()` |
| `current_profile_id()` | definer | policies and functions (authenticated) | — | the id of the caller's active profile (auth.uid() → auth_user_id, retired_at null), or null |
| `is_esg_lead()`, `is_cfo()`, `my_site_id()` | definer | policies and functions (authenticated) | — | the caller's role and site, from the active profile |
| `app_write_allowed()` | definer | triggers | — | true when auth.uid() is null (migration, admin function) or the transaction is inside a narrow function |
| `link_profile_on_signup()`, `profiles_protect()`, `projects_protect()`, `reference_figures_protect()`, `reference_figures_write_history()`, `sites_protect()`, `targets_protect()`, `decisions_protect()`, `projects_write_history()` | definer | nobody directly (triggers) | — | see §4 |
| `require_me()`, `require_esg_lead()`, `require_comment(text)`, `begin_narrow(text)`, `lock_project(uuid)`, `owns_project(projects)`, `new_project_version(projects, uuid)`, `write_decision(…)` | definer | nobody directly (internal) | — | the shared steps of the transition functions: identity and role, the required comment, the transaction marker and comment, the row lock, ownership (own site, or group for the ESG lead), the n+1 copy, the decision row |
| `endorse_project(p_project, p_comment)` | definer | ESG lead | active profile, role, comment, status Potential | → Pending approval; decision row (endorsement, Endorsed); history row |
| `decline_project(p_project, p_comment)` | definer | ESG lead | role, comment, status Potential or Pending approval | → Declined; decision row (decline, Declined); history row |
| `record_committee_decision(p_project, p_outcome, p_comment, p_attendees, p_decision_date)` | definer | ESG lead | role, outcome Approved or Declined, comment, attendees, date, status Pending approval | → Approved or Declined; decision row (committee); history row |
| `mark_project_obsolete(p_project, p_comment)` | definer | ESG lead | role, comment, status Approved | → Obsolete; decision row (obsolete); history row |
| `reapprove_project(p_project, p_comment)` | definer | ESG lead | role, comment, status Approved, no newer version | copies the row as version n+1 in Potential (supersedes_project_id set), the Approved version → Obsolete with a decision row; returns the new id |
| `resubmit_project(p_project)` | definer | the owner (site user for own site, ESG lead for group) | active profile, ownership, status Declined, no newer version | version n+1 in Potential, same project_code, linked; history row "Resubmission of the declined version"; returns the new id |
| `retire_project(p_project, p_comment)` | definer | the owner | active profile, ownership, comment, status Declined, not yet resubmitted | → Retired; history row (no decision row) |
| `reinstate_project(p_project, p_comment)` | definer | ESG lead | role, comment, status Obsolete, no newer version | → Approved; history row (no decision row) |
| `edit_project_figures(p_project, p_changes jsonb, p_comment)` | definer | ESG lead | role, comment, keys limited to total_impact, annual_impact, start_year, capex_eur, opex_eur_per_year, status Pending approval | updates the figures; one history row per changed field with the comment |
| `anonymise_person(p_profile, p_name)` | definer | ESG lead | role, not the caller's own row, the profile retired | profile name → "retired user" and email → retired-<id>@anonymised.invalid; every `projects.owner_name` equal to the name and every `decisions.attendees` mention → "retired user"; history rows updated and a `decision_attendees` history row written; returns the number of rows touched |

The admin-users Netlify Function (`netlify/functions/admin-users.mjs`, secret key) is not a database function but is part of the rule set: it verifies the caller's session belongs to an active ESG lead, refuses the caller's own row, validates every input, does one change per call (create = profile + login identity with email confirmed; update = role and site; retire = retired_at, retired_comment and a ban on the login) and returns only the profile fields the Users screen shows.

## 6. Buckets

None. No file storage in version 1.

## 7. Auth

As built (session 2, builder decision in spec §6): Supabase Auth, email provider with the magic link (`signInWithOtp`, `shouldCreateUser: false`), no password anywhere. Dashboard settings the builder sets: Authentication → Sign In / Providers → Email ON; "Allow new users to sign up" OFF; Site URL `https://sustainability-project-tracker.netlify.app`; additional redirect URLs `https://deploy-preview-*--sustainability-project-tracker.netlify.app/**` and `http://localhost:5173/**`; custom SMTP (Resend: host smtp.resend.com, the Resend API key as the password, a sender on a verified subdomain of sustainos.io) entered in the dashboard, never in a file; the built-in mailer is for the first tests only. Identities: the ESG lead's is created by the platform owner in the dashboard (Auth → Users → Add user, z.hatquai@sustainos.io, auto-confirm); every other one by the admin-users function from the Users screen. The trigger `link_profile_on_signup` sets `profiles.auth_user_id` by email. A login with no active profile sees "This address has no access". Retiring = `profiles.retired_at` through the admin function plus a ban on the login; deleting a login identity never touches a profile or a record. The upgrade to Microsoft OAuth or company SSO is a handover item.

## 8. Environment variable names this project expects (never values)

| Name | Read by | Set where |
|---|---|---|
| `VITE_SUPABASE_DATABASE_URL` | browser (`src/lib/supabase.js`) and the admin-users function: the project URL (`https://bqyjulvljqafubusplgm.supabase.co`). The spec and CLAUDE.md call it `VITE_SUPABASE_URL`; the extension writes this name (seen in the dashboard on 9 Oct 2026), so the code reads this one and accepts `VITE_SUPABASE_URL` only as a local fallback | Netlify env, written by the Supabase extension |
| `VITE_SUPABASE_ANON_KEY` | browser; value must be the publishable key (`sb_publishable_…`); RLS protects the data | Netlify env, written by the Supabase extension; the builder replaced the legacy value by hand on 9 Oct 2026 |
| `SUPABASE_SERVICE_ROLE_KEY` | the admin-users Netlify Function only; value must be the secret key (`sb_secret_…`); marked "contains secret values" | Netlify env, written by the Supabase extension; the builder replaced the legacy value by hand on 9 Oct 2026 |
| `SUPABASE_DATABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_JWT_SECRET` | nothing; written by the extension; never read, never `VITE_`-prefixed | Netlify env |

Verified on 9 October 2026 in the dashboard: the extension's full list is `SUPABASE_ANON_KEY`, `SUPABASE_DATABASE_URL`, `SUPABASE_JWT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_DATABASE_URL`, all for every deploy context (the secret key with one value per context, set by the builder). The values cannot be checked from Claude Code; if a build or a login reports "Legacy API keys disabled" or "Invalid API key", an old value is in use somewhere. Local development: a `.env.local` (git-ignored) with the two `VITE_` names; the admin function runs only on Netlify (`netlify dev` with the site's variables).

## 9. Notes and flags for future sessions

- The demo portfolio (the former fixtures) lives in the real tables since session 2: ten profiles (the three named people, six made-up site users with no login identity, Dirk Sauer retired with a comment), 20 reference figures, 38 project rows, 57 decisions, 99 history rows; `project_code_seq` continues at PRJ-0038. src/fixtures/ is kept as the demo seed only; no screen reads it.
- The made-up site users are active profiles without a login: they appear on the Users screen as "no login yet" and can be retired by the ESG lead; no one can log in as them while sign-ups are off and no identity exists.
- Zee's site is 1200 Werk Paderborn (builder, 9 Oct 2026).
- Keys: the builder replaced both Netlify values with the `sb_` keys on 9 Oct 2026 (the publishable key pasted; the secret key pasted and marked secret). The dashboard's legacy keys can be disabled once the live login works; re-check the two values after any reconnect of the extension.
- Refusal test: half A passed on 9 Oct 2026 (`supabase/refusal-test-half-a.sql`, re-run after any change to a policy, trigger or function); half B (the named people on the screens) is the deploy gate of the access phase and is recorded in PROGRESS.md.
- Reporting year = the portfolio as of the end of that year (status rebuilt from `project_history` status rows); the current year = as of today; every action applies to the current year only.
- `status` on decisions and reference_figures stays `'active'` in version 1; the calculations ignore rows with status `void`, which never occurs.
- The security advisor's "RLS enabled, no policy" warnings are gone; "function search_path mutable" never applies (every function sets it).

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
| 2 | 9 Oct 2026 | `20261009140756_access_schema_delta.sql` | docs/access-matrix.md §5: `profiles.retired_comment`; `reference_figures_history` (RLS on, grants hardened); helpers `current_profile_id`, `is_esg_lead`, `is_cfo`, `my_site_id`, `app_write_allowed`; trigger `link_profile_on_signup` on auth.users; column triggers `profiles_protect`, `projects_protect`, `reference_figures_protect`, `sites_protect`, `targets_protect`, `decisions_protect`; `reference_figures_write_history` |
| 2 | 9 Oct 2026 | `20261009141057_access_policies.sql` | the read and plain-write policies of §6: sites, targets, profiles, reference_figures, reference_figures_history, projects, decisions, project_history |
| 2 | 9 Oct 2026 | `20261009141108_access_functions.sql` | the narrow functions of §6 lines 10 and 12 to 20 and their internal helpers; EXECUTE revoked from public and anon, granted to authenticated on the ten RPCs only |
| 2 | 9 Oct 2026 | `20261009142725_seed_demo_portfolio_1.sql` | demo portfolio part 1: seven profiles (six site users, one retired), 20 reference figures, 38 project rows (history triggers paused for the seed) |
| 2 | 9 Oct 2026 | `20261009143326_seed_demo_portfolio_2.sql` | demo portfolio part 2: 57 decisions, 99 project_history rows; `project_code_seq` set to 37 |
