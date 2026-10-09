# Ravensberg Project Tracker

## Identity
A project register with an approval workflow and a 2030-target dashboard: the seven Ravensberg sites register energy, water and waste projects, the global ESG lead (admin) takes them through endorsement and committee approval, and the CFO reads everything; all through a browser login once the access phase is built.
Tier: 3 — internal tool, data persists to Supabase, three roles that see different data after login (D3+A3). Nobody logs in yet.
Spec version governed: v1.1 — the version of docs/product-spec.md these rules were derived from.
Position: Standalone. Its Supabase project is named after the company; if a later Ravensberg tool joins it, this repo becomes the canonical repo for the database.

## Session Protocol
At the start of every session:
1. Pull the latest from main before reading anything else.
2. Check docs/product-spec.md: if its version is newer than the "Spec version governed" line above, STOP. Tell the builder: "The spec has changed since this CLAUDE.md was written — re-run the Project Governor on the revised spec before building, or these rules may contradict it."
3. Read PROGRESS.md in the root — it is the current state of this build. If it is missing, recreate it with the structure at the end of this section, then continue.
4. Increment the session number and update the date in PROGRESS.md.
5. If "Notes for next session" has content: repeat the notes to the builder, treat them as this session's priorities, then clear the section.
6. If this is session 1, run First Session Setup below before any build work.

Save point — after completing any module, feature, fix, or schema change:
1. Update PROGRESS.md: current state, remaining work, build decisions, known issues.
2. If the database was touched (any table, policy, trigger, function or auth change), update docs/supabase-setup.md in the same save point, and make sure the migration file is in supabase/migrations/ and committed with it.
3. Commit and push to main.
4. Tell the builder in one line: "Save point committed: [what changed]."
Do not start the next piece of work before the save point is pushed. Never end a session without one — an ending session is a save point.

First Session Setup (session 1 only):
1. Create docs/ and move product-spec.md, access-matrix.md and user-stories.md into it. Check each is in docs/; if one is missing, stop: "I cannot find [file]; upload it to the repo root and I will move it." Nothing is built while a required document is missing.
2. Install the brand skill: move the ravensberg-brand files (SKILL.md, assets/, templates/) to .claude/skills/ravensberg-brand/, keeping its structure.
3. Announce what moved, then commit and push before building anything.

PROGRESS.md structure (for the recreate rule): status header (Session / Last updated / Live URL / Stage / Supabase project), Current state, Last session (3–5 lines, replace each session), Remaining work (shrinking checklist), Build decisions (one line each), Known issues, Backlog (deferred items, promoted only deliberately), Notes for next session.

## Commands
```
npm install
npm run dev
npm run build
```

## Tech Stack
React · Vite · Tailwind CSS · Netlify · Supabase
Deployment: GitHub push to main → Netlify auto-deploys from main. Claude Code pushes to main; it does NOT connect to Netlify, and no Netlify connector or MCP is used. The builder connects the repo to a Netlify site once and connects Supabase to that site with the Supabase extension, which writes the Supabase variables into the site's environment; a redeploy follows, because Vite reads browser-side variables at build time. If a Supabase variable is missing at runtime, the fix is the extension connection in the Netlify dashboard, never a value pasted anywhere; the one exception is the public publishable key, which the builder may paste if the extension wrote a legacy value.

## Arms
Export — browser only, no server function — CSV of the register as filtered on screen (columns and file name per spec §3; a site user's file holds only their site) and the four-page PDF "CFO review pack" (design per spec §3), built from the same calculations as the Overview. ESG lead and CFO only for the PDF.

## Environment Variables
VITE_SUPABASE_URL — written by the Supabase extension — browser — public
VITE_SUPABASE_ANON_KEY — written by the Supabase extension — browser — public; its value is the publishable key (`sb_publishable_…`); RLS protects the data
SUPABASE_SERVICE_ROLE_KEY — written by the Supabase extension — Netlify Functions only — SECRET; its value is the secret key (`sb_secret_…`); never VITE_-prefixed; refuses to run from a browser
SUPABASE_DATABASE_URL — written by the Supabase extension — server-side only — SECRET
No AI key, no Turnstile, no Resend variable in Netlify: Resend is the SMTP sender entered by the builder in Supabase → Auth → SMTP settings, never in a file.
The variable names and values are verified on the first live build; if the extension writes different names, tell the builder and record the real names in docs/supabase-setup.md §8. This tool uses the publishable and secret keys; the older anon and service_role keys are a separate system, retiring by the end of 2026. The names above are historical; the values must start with `sb_`. If a value starts with `eyJ`, tell the builder: the publishable one they replace by hand (it is public); rotating the secret one is a dated handover item. "Legacy API keys disabled" means an old key value is in use somewhere.
Key storage follows function placement: Netlify Functions read Netlify environment variables; Supabase Edge Functions cannot. At session start, confirm these exist before first use; prompt the builder for any that are missing. No value ever appears in code or in any committed file.

## Supabase
Project: "ravensberg-consumer-brands", ref bqyjulvljqafubusplgm, URL https://bqyjulvljqafubusplgm.supabase.co. It EXISTS and is EMPTY: never create a project. In session 1, before any change, list its tables and schemas through the Supabase MCP; if anything other than Supabase's defaults exists, STOP and tell the builder. Read its region; if it is not EU, record that in PROGRESS.md Known issues. Plan: Free — no backups; pauses after ~1 week without use; the switch to Pro is a manual billing step in the Supabase dashboard, due when real users rely on the tool (and the project must not be paused during the workshop week).

Every schema, policy, trigger and function change goes through `apply_migration` with a descriptive name AND is saved as supabase/migrations/[timestamp]_[name].sql, committed with the save point. `execute_sql` is for reads and data fixes only. The migration files can rebuild this database from nothing.

Build this schema (spec §5 field names) — authoritative until docs/supabase-setup.md exists:
sites: id, code, name, city, type, active, updated_by, updated_at — seeded by migration with the seven sites (1000 Werk Bielefeld … 1600 Werk Lippstadt)
profiles: id (own uuid), auth_user_id (uuid, unique, empty until a login exists), email (unique, the seed key), name, role (site_user / esg_lead / cfo), site_id (→ sites, site users only), retired_at — seeded by migration with the three named first holders in spec §6; no Auth yet
targets: id, category, base_year, target_year, value, set_by (→ profiles), active, updated_by, updated_at — seeded by migration with the four group targets
reference_figures: id, site_id (→ sites, empty = group), year, kind (actual / plan), scope12_tco2e, water_withdrawal_m3, output_t, waste_total_t, waste_diverted_t, entered_by, status (default 'active'), created_by, created_at, updated_by, updated_at
projects: id, project_code (sequential, PRJ-0001), title, category, scope (site / group), site_id, description, total_impact, annual_impact, unit, start_year, capex_eur, opex_eur_per_year, owner_name, status (Potential / Pending approval / Approved / Declined / Retired / Obsolete, default Potential), version, supersedes_project_id (→ projects), created_by, created_at, updated_by, updated_at
decisions: id, project_id, stage, outcome, comment, attendees, decision_date, recorded_by, recorded_at, status (default 'active'), created_by, created_at, updated_by, updated_at
project_history: id, project_id, field, old_value, new_value, comment, changed_by, changed_at — written by a trigger on projects
created_by, recorded_by, entered_by, set_by, changed_by and updated_by reference profiles.id and stay empty until a login exists.

RLS — enable on EVERY table the moment it is created; never disable it. Every rule is lifted from docs/access-matrix.md and built with the mechanism its policy plan names.
Population pattern: P2 internal only — no anon access to any table. `anon` has no policy and no table grant on any table (revoke anon's grants after each table is created). Until the Access Architect's full run, no role policy exists on any table, so the publishable key reads and writes nothing; this is intended. sites and targets are seeded by a named migration, never through the app.
Every screen is an MVP on FIXTURE DATA: it reads src/fixtures/[table].json, local files of made-up rows shaped exactly like the tables above (the mock-up's 37 projects, the seven sites' reference figures, decisions and history), and reads NO table. List, count, filter, detail, the spec §9 calculations and both exports only. Build no Supabase read and no create, update, change-state or delete action until access-matrix.md carries the roles. Nothing real is reachable through any screen.

After setup, write docs/supabase-setup.md and update it at every save point that touches the database. It follows this structure, in this order: (1) header — project name, ref, URL, region, plan, population pattern, key system in use (publishable/secret; note legacy keys and the rotation date if found); (2) tables — every table with field names, types, constraints and defaults; (3) rules — per table, one line per rule with its mechanism (policy / trigger / function) and its source line in docs/access-matrix.md; (4) triggers — name, table, what it refuses or does; (5) functions — name, security (invoker / definer), who may call it, what it checks first, what it does; (6) buckets — none; (7) Auth — "none yet"; (8) environment variable names this project expects (never values); (9) notes and flags for future sessions; (10) change log — one line per migration file name and date.

## Hard Rules
- API keys never in any frontend file or GitHub commit. Netlify env vars for Netlify Functions; always called through a server-side function.
- Netlify Identity: never. Supabase Auth is the only authentication system in this stack.
- The refusal happens in the database, or in a server function that holds the secret key and checks every request itself; never only in the screen. A hidden button is not a rule. RLS is enabled on every table and never disabled to make something work. `anon` has no policy and no table grant on any table. A function that holds the secret key bypasses RLS, so for its path the function is the rule.
- No user can change their own `role`, admin flag, site or active state through the app; a trigger refuses it. Changes to another user's role, site or active state happen only through the narrow admin function named in the full run, or in the Supabase dashboard by the platform owner.
- A row in its final state is frozen for everyone, admin included. A correction is a withdrawal (here: Obsolete or Retired, with a comment) plus a new version. Status changes and anonymisation run through narrow functions, never a free edit. The full run fixes the exact list of final states (see "Carried to the full run").
- Nothing is deleted through the app. Projects are retired or made obsolete and stay visible; sites, targets and users are deactivated or retired. No `DELETE` policy exists on any table. A GDPR erasure request is actioned by the ESG lead as anonymisation of the personal fields (`profiles` name and email, `projects.owner_name`, `decisions.attendees`, and their history rows; rows and status kept) and logged; the platform owner deletes the login identity in the Supabase dashboard. Exported CSVs and review packs are outside the tool.
- Every record table (`projects`, `decisions`, `reference_figures`) carries `created_by`, `created_at`, `updated_by`, `updated_at`; lookup tables (`sites`, `targets`) carry `updated_by`, `updated_at`, `active`; `projects` has `project_history`, written by a trigger.
- No screen reads a real row before the full docs/access-matrix.md exists; every screen reads its fixture file. If a query fails, fix the policy or the query — never disable RLS.
- Migrations: every schema, policy, trigger and function change goes through `apply_migration` with a descriptive name and is saved in supabase/migrations/, committed with the save point; `execute_sql` is for reads and data fixes only.
- Function contract: every database function is SECURITY INVOKER unless it must write a protected column or read on behalf of a policy; the exceptions (the profile link trigger, current_profile_id(), the role helpers, and the narrow transition functions the matrix names) are SECURITY DEFINER with `SET search_path = ''` and schema-qualified names, and they check auth.uid() and the caller's active profile and role before anything else, raising otherwise. On every RPC: REVOKE EXECUTE FROM public, anon; GRANT EXECUTE TO authenticated. A Netlify function holding the secret key validates every input and returns only the fields the spec names.
- Auth is never configured before the FULL docs/access-matrix.md (named roles) exists. The login, the row rules and the screens' actions are built together in one phase, not deployed until the refusal test passes as each named person.
- Every access rule comes from docs/access-matrix.md and is built with the mechanism its policy plan names. If a query needs a rule the matrix does not state, stop and tell the builder to revise the matrix; never invent one, and never write "policy" where the matrix says trigger or function.
- Supabase secret key required for the admin user-creation Netlify Function (access phase only: creates the Auth user and the profile together). Stored as SUPABASE_SERVICE_ROLE_KEY in Netlify env, never in code; it bypasses all RLS, so the function checks the caller is an active ESG lead first. Flag to the builder before implementing.
- GDPR: lawful basis legitimate interest, under the organisation's existing employee notice; by builder decision NO in-app notice, NO consent checkbox, NO privacy page. Personal data: profiles name and email, projects.owner_name, decisions.attendees, the user behind each history row. Retention: life of the tool. Deletion requests go to the ESG lead (z.hatquai@sustainos.io) and are actioned as anonymisation per docs/access-matrix.md; the platform owner removes the login identity.
- Complexity: build no rate limit, queue, retry, scan, monitor or test suite. If a spec line asks for one, put it on the PROGRESS.md Backlog as "not in place; what it would take" and tell the builder.

## Project Structure
```
/                     ← root: CLAUDE.md, PROGRESS.md only
/src/components
/src/lib              ← Supabase client, calculations (spec §9), utilities
/src/fixtures         ← one JSON file per table until the access phase
/netlify/functions    ← admin user-creation (access phase only)
/docs                 ← product-spec.md, access-matrix.md, user-stories.md, supabase-setup.md
/supabase/migrations  ← one .sql file per applied migration
/.claude/skills/ravensberg-brand/   ← brand skill
/public/assets        ← logo files copied from the brand skill, never redrawn
```

## Brand
Brand is governed by the ravensberg-brand skill at .claude/skills/ravensberg-brand/SKILL.md (installed in First Session Setup). Invoke it for any UI, chart or PDF work. Hard rules that hold even if the skill is not loaded:
- Background: Soft Stone #F5F4EF; cards white #FFFFFF with a line-grey #DDDBD3 hairline border
- Accent: Ravensberg Green #0F6B3A for structure (titles, table headers, primary series) — never Tailwind blue, never read as "good"; status uses the semantic dots OK #2E8B57 / attention #D98E2B / problem #C0392B
- Font: Montserrat for titles and numbers, Source Sans 3 for everything else; never a third typeface
- Never gradients, shadows on every card, or a redrawn, recoloured or stretched logo. Chart encoding per spec §10: green = approved, taupe #C9A27F = pending, hatched = declined or gap, grey = reference anchors and target lines; estimates labelled "estimate"

## Business Rules
- New project: all fields required; annual_impact > 0; total_impact ≥ annual_impact; start_year 2024–2030 (later accepted with a warning that it contributes nothing to 2030); scope "site" needs a site_id. Saved as Potential, version 1, next sequential project_code.
- Unit is set by category: tCO₂e per year / m³ per year / tonnes diverted per year.
- Only Approved projects count toward a target; Pending approval is shown separately as "if approved"; Potential, Declined, Retired and Obsolete count in no target figure, only in the status counts. An Obsolete project leaves every year of the pathway.
- A project counts its full annual impact every year from start_year to 2030 (no ramp-up). A site project counts for its site and the group; a group project for the group only.
- Every target applies to each site's own FY2024 figure; the group requirement is the sum over sites. Uncovered = required − covered − if approved, floored at zero; over-delivery shows uncovered 0 and the surplus in the card.
- Emissions: required = 42 % × FY2024 Scope 1+2 (location-based, FY2024 factor set, frozen; named on the chart).
- Water absolute: required = 10 % × FY2024 withdrawal. Water intensity: target = 80 % of FY2024 withdrawal ÷ FY2024 output; output interpolated straight-line to planned 2030 (FY2024 flat, labelled "estimate", if no plan). Site 1100 is in m³ per pallet and excluded from the group intensity, included in the absolute.
- Waste: per-site rate = diverted ÷ total (latest actual year; incineration with energy recovery counts as diverted); projected = (diverted + approved annual tonnes at the site) ÷ total, capped at 100 % and flagged; group figure = count of sites ≥ 95 %; group waste projects change no site rate.
- A site missing a base-year figure is excluded from that group sum and flagged "reference figures missing: <site>".
- Status counts use current versions only (a resubmitted project counts once). Days waiting: Potential since submission; Pending approval since endorsement.
- Register sorts Pending approval first. Full formulas, pathway and bridge definitions: spec §9.

Out of scope — do not build:
- Suppliers (invite, login, submission, two approvals) and a supplier / Scope 3 target
- Integration with the environmental reporting tool for reference figures
- Notification emails and reminders; any email arm
- AI assistance of any kind
- Change requests on Approved projects raised by sites
- File uploads and storage buckets
- Microsoft OAuth / SSO login

## Reference Docs
Read before building the related part:
- docs/product-spec.md — full screen specs (§8), calculations (§9), export design (§3), acceptance criteria (§13)
- docs/supabase-setup.md — schema source of truth (created in session 1)
- docs/access-matrix.md — read before writing any RLS or touching a policy; every rule is built from it (short form: no anon access, no role rules yet)
- docs/user-stories.md — read before changing a screen or a role; every acceptance line is a test
- .claude/skills/ravensberg-brand/SKILL.md — full brand system
PROGRESS.md in the root is read at every session start per the Session Protocol.
