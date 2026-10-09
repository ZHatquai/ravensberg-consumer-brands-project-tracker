# Ravensberg Project Tracker

## Identity
A project register with an approval workflow and a 2030-target dashboard: the seven Ravensberg sites register energy, water and waste projects, the global ESG lead (admin) takes them through endorsement and committee approval, and the CFO reads everything; all through a browser login with a magic link.
Tier: 3 — internal tool, data persists to Supabase, three roles that see different data after login (D3+A3).
Spec version governed: v1.2 — the version of docs/product-spec.md these rules were derived from.
Position: Standalone. Its Supabase project is named after the company; if a later Ravensberg tool joins it, this repo becomes the canonical repo for the database and holds the canonical docs/access-matrix.md, docs/user-stories.md and docs/supabase-setup.md.

## Session Protocol
At the start of every session:
1. Pull the latest from main before reading anything else.
2. Check docs/product-spec.md: if its version is newer than the "Spec version governed" line above, STOP. Tell the builder: "The spec has changed since this CLAUDE.md was written — re-run the Project Governor on the revised spec before building, or these rules may contradict it." Do not build against a stale CLAUDE.md.
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
2. Install the brand skill: move the ravensberg-brand files (SKILL.md, assets/, templates/) to .claude/skills/ravensberg-brand/, keeping its structure, and copy the logo files and favicon into public/assets/.
3. Announce what moved, then commit and push before building anything.

PROGRESS.md structure (for the recreate rule): status header (Session / Last updated / Live URL / Stage / Supabase project), Current state, Last session (3–5 lines, replace each session), Remaining work (shrinking checklist), Refusal test record, Build decisions (one line each), Known issues, Backlog (deferred items, promoted only deliberately), Notes for next session.

## Commands
```
npm install
npm run dev
npm run build
```

## Tech Stack
React · Vite · Tailwind CSS · Netlify · Supabase
Deployment: GitHub push to main → Netlify auto-deploys from main. Claude Code pushes to main; it does NOT connect to Netlify, and no Netlify connector or MCP is used. The builder connects the repo to a Netlify site once and connects Supabase to that site with the Supabase extension (Vite preset), which writes the Supabase variables into the site's environment; a redeploy follows any variable change, because Vite reads browser-side variables at build time. If a Supabase variable is missing at runtime, the fix is the extension connection in the Netlify dashboard, never a value pasted anywhere; the one exception is the public publishable key, which the builder may paste if the extension wrote a legacy value.

## Arms
Export — browser only, no server function — CSV of the register as filtered on screen (columns and file name per spec §3; a site user's file holds only their site) and the four-page PDF "CFO review pack" (design per spec §3), built from the same calculations as the Overview. ESG lead and CFO only for the PDF.

## Environment Variables
VITE_SUPABASE_DATABASE_URL — written by the Supabase extension (this is the name it writes; the spec's VITE_SUPABASE_URL is accepted as a local fallback) — browser and the admin-users function — public
VITE_SUPABASE_ANON_KEY — written by the Supabase extension — browser — public; its value must be the publishable key (`sb_publishable_…`); RLS protects the data
SUPABASE_SERVICE_ROLE_KEY — written by the Supabase extension — Netlify Functions only (the admin-users function) — SECRET; its value must be the secret key (`sb_secret_…`); never VITE_-prefixed; refuses to run from a browser
SUPABASE_DATABASE_URL — written by the Supabase extension — server-side only — SECRET; nothing uses it
SUPABASE_ANON_KEY, SUPABASE_JWT_SECRET — written by the Supabase extension — unused by this tool; never read them, never VITE_-prefix them
No AI key, no Turnstile, no Resend variable in Netlify: Resend is the SMTP sender entered by the builder in Supabase → Auth → SMTP settings, never in a file.
The variable names are recorded in docs/supabase-setup.md §8; if the extension ever writes different names, tell the builder and record them there. This tool uses the publishable and secret keys; the older anon and service_role keys are a separate system, retiring by the end of 2026. The variable names are historical and stay as the extension writes them, but the values must start with `sb_`. If a value starts with `eyJ`, tell the builder: the publishable one they replace by hand (it is public); the secret one keeps working server-side until they replace it, which must happen before the admin-users function is deployed (a dated item in PROGRESS.md). If a build reports "Legacy API keys disabled", an old key value is in use somewhere. At session start, confirm the variables exist before first use; prompt the builder for any that are missing. No value ever appears in code or in any committed file.

## Supabase
Project: "ravensberg-consumer-brands" — already exists. Ref bqyjulvljqafubusplgm, URL https://bqyjulvljqafubusplgm.supabase.co, region eu-central-1. docs/supabase-setup.md is the schema source of truth: read it before any database work, never recreate tables or policies that exist, update it at every save point that touches the database. Plan: Free — no backups; pauses after ~1 week without use; the switch to Pro is a manual billing step in the Supabase dashboard, due when real users rely on the tool, and the project must not be paused during the workshop week.

Every schema, policy, trigger and function change goes through `apply_migration` with a descriptive name AND is saved as supabase/migrations/[timestamp]_[name].sql, committed with the save point. `execute_sql` is for reads and data fixes only. The migration files can rebuild this database from nothing.

Tables this tool uses (fields in docs/supabase-setup.md §2): sites, targets (lookup, with active, updated_by, updated_at) · profiles (own id, auth_user_id empty until the login exists, email as the seed key, name, role, site_id, retired_at) · reference_figures, projects, decisions (record tables with created_by, created_at, updated_by, updated_at, status) · project_history (trigger-written). The access phase adds, by named migration, the schema delta of docs/access-matrix.md §5: profiles.retired_comment, reference_figures_history with its trigger, the link trigger on new login identities, the column triggers, the helpers and the narrow functions.

RLS — enabled on EVERY table, never disabled. Population pattern: P2 internal only. `anon` has no policy and no table grant on any table (revoke after each table is created). Every rule below is lifted from docs/access-matrix.md and is built with the mechanism its policy plan names:
- sites, targets: every active profile reads all rows (policy); the form offers active rows only (screen); the ESG lead creates, updates and deactivates (policy), with a trigger refusing a change to sites.code or targets.category and a rename of a site a project or figure references; no delete.
- profiles: a site user reads the profiles of their own site plus the ESG lead's, the CFO and the ESG lead read all (policy); nobody writes a profile from a session (column trigger); creation, role, site and retiring happen only through the admin-users Netlify Function (secret key, ESG lead only, never the caller's own row); auth_user_id is set once by the link trigger; anonymisation by the narrow function.
- reference_figures: a site user creates and updates their own site's rows and reads them, the CFO reads all, the ESG lead creates and updates any site row and the group rows (policies plus the column trigger that fixes site, year, kind, created_by and the audit columns); reference_figures_history is trigger-written and read follows the figure; no delete.
- projects: a site user creates site projects for their own site, reads their site's rows and updates them while Potential; the ESG lead creates group projects only, reads all and updates their own group projects while Potential; the CFO reads all (policies plus the column trigger that fixes status, version, project_code, supersedes_project_id, scope, site_id, created_by and the audit columns); a figure edit while Pending approval, every status change, re-approval, resubmission, retirement, reinstatement and anonymisation run only through the narrow functions the matrix names; Approved, Declined, Retired and Obsolete rows are frozen; no delete.
- decisions: read follows the project (policy); rows are written only inside the transition functions; no update, no delete.
- project_history: read follows the project (policy); written by its trigger only.
Every access rule lives in docs/access-matrix.md; build each line of its policy plan with the mechanism it names and never loosen a table to make a screen work. In the access phase every screen switches from its fixture file (src/fixtures/[table].json) to reading as the signed-in user and gains its actions exactly as docs/user-stories.md describes them; the "View as" switch is removed. Until then no screen reads a table and no action saves.

Auth, as built (access phase only, together with the policies): Supabase Auth, magic link, by builder decision. Settings: "Enable sign-ups" OFF, email provider ON with magic link, custom SMTP (Resend: host smtp.resend.com, the Resend API key as the SMTP password, sender on a verified subdomain of sustainos.io) entered by the builder in the dashboard, never in a file; the built-in mailer is for the first tests only. There is no password and no Change password screen. The ESG lead creates each user on the Users screen; the admin-users function creates the login identity (email confirmed) and the profile together. If a link does not arrive, the platform owner generates one in the dashboard (Auth → Users → Generate link). Retiring: profiles.retired_at set through the admin function plus Ban user; deleting a login never touches a profile or a record. The login upgrade path (Microsoft OAuth or company SSO) is a handover item; do not build it.
Roles: site_user, esg_lead, cfo — stored in profiles.role; esg_lead is the admin (there is no is_admin flag); profiles.retired_at is the active state, checked by every policy. Profiles have their own id and are seeded by email; a trigger on each new Auth identity matches its email to a profile and sets profiles.auth_user_id; every policy finds the caller through current_profile_id(), is_esg_lead(), is_cfo() and my_site_id(). An identity with no matching profile, or a retired one, reaches nothing. Buckets: none.

docs/supabase-setup.md keeps this structure, in this order: (1) header — project name, ref, URL, region, plan, population pattern, key system in use (legacy keys and the rotation date noted); (2) tables — every table with field names, types, constraints and defaults; (3) rules — per table, one line per rule with its mechanism (policy / trigger / function) and its source line in docs/access-matrix.md; (4) triggers — name, table, what it refuses or does; (5) functions — name, security (invoker / definer), who may call it, what it checks first, what it does; (6) buckets — none; (7) Auth — settings as built, or "none yet"; (8) environment variable names this project expects (never values); (9) notes and flags for future sessions; (10) change log — one line per migration file name and date.

## Hard Rules
- API keys never in any frontend file or GitHub commit. Netlify env vars for Netlify Functions; always called through a server-side function.
- Netlify Identity: never. Supabase Auth is the only authentication system in this stack.
- RLS: enabled on every table from the moment it is created, never disabled on any table. If a query fails, fix the policy or the query — never disable RLS to work around it. `anon` has no policy and no table grant on any table. No screen reads a real row before the access phase builds its rules; until then every screen reads its fixture file.
- Migrations: every schema, policy, trigger and function change goes through `apply_migration` with a descriptive name and is saved as a file in supabase/migrations/, committed with the save point; `execute_sql` is for reads and data fixes only.
- Function contract: every database function is SECURITY INVOKER unless it must write a protected column or read on behalf of a policy; the exceptions (the profile link trigger, the history triggers, current_profile_id(), the role helpers, and the narrow transition functions the matrix names) are SECURITY DEFINER with `SET search_path = ''` and schema-qualified names, and the callable ones check auth.uid() and the caller's active profile and role before doing anything else, raising otherwise. On every RPC: REVOKE EXECUTE FROM public, anon; GRANT EXECUTE TO authenticated. No RPC is callable by anon. A Netlify function holding the secret key validates every input and returns only the fields the spec names.
- Auth is never configured before the FULL docs/access-matrix.md (named roles) exists; it does. The login, the row rules and every screen's actions are built together in one phase, and that phase is not deployed until the refusal test passes in both halves (Claude Code through the API; the named people on the screens).
- Every access rule comes from docs/access-matrix.md and is built with the mechanism its policy plan names. If a query needs a rule the matrix does not state, stop and tell the builder to revise the matrix; never invent one, and never write "policy" where the matrix says trigger or function.
- The refusal happens in the database, or in a server function that holds the secret key and checks every request itself; never only in the screen. A hidden button is not a rule. RLS is enabled on every table and never disabled to make something work. `anon` has no policy and no table grant on any table. A function that holds the secret key bypasses RLS, so for its path the function is the rule: the admin user function checks that the caller is an active ESG lead, validates every input and does one change per call.
- No user can change their own `role`, `site_id` or retired state through the app; a trigger refuses every direct write to a profile. Changes to another user's role, site or retired state happen only through the admin user function (`admin-users`, secret key, ESG lead only, never the caller's own row), or in the Supabase dashboard by the platform owner.
- A row in its final state (projects: Approved, Retired, Obsolete, and Declined for that version; decisions: every row) is frozen for everyone, the ESG lead included. A correction is a withdrawal plus a new version: re-approval (the approved version Obsolete, version n+1 in Potential) or resubmission (from Declined). Obsolete, reinstate, every other status change and anonymisation run through narrow functions, never a free edit; a comment is required on every one of them except resubmit.
- Nothing is deleted through the app. Projects are retired or made obsolete and stay visible; sites, targets and users are deactivated or retired. No `DELETE` policy exists on any table and the DELETE grant is revoked. A GDPR erasure request is actioned by the ESG lead as anonymisation of the personal fields (`profiles` name and email, `projects.owner_name`, `decisions.attendees`, and their history rows; rows, status and figures kept) and logged; the platform owner deletes the login identity in the Supabase dashboard. Exported CSVs and review packs are outside the tool.
- Every record table (`projects`, `decisions`, `reference_figures`) carries `created_by`, `created_at`, `updated_by`, `updated_at`; lookup tables (`sites`, `targets`) carry `updated_by`, `updated_at`, `active`; `projects` has `project_history` and `reference_figures` has `reference_figures_history`, each written by a trigger.
- Supabase secret key required for the admin-users Netlify Function (creates the login identity and the profile together, changes role or site, retires with a comment). Stored as SUPABASE_SERVICE_ROLE_KEY in Netlify env, never in code. It bypasses all RLS, so the function verifies the caller's session is an active ESG lead first and refuses a change to the caller's own row. Flag to the builder before implementing; its value must be the secret key (`sb_secret_…`) by then.
- GDPR: lawful basis legitimate interest, under the organisation's existing employee notice; by builder decision NO in-app notice, NO consent checkbox, NO privacy page. Personal data: profiles name and email (the login identities), projects.owner_name, decisions.attendees, the user behind each history row. Retention: life of the tool. Deletion requests go to the ESG lead (z.hatquai@sustainos.io) and are actioned as anonymisation per docs/access-matrix.md; the platform owner removes the login identity.
- Complexity: build no rate limit, queue, retry, scan, monitor or test suite. If a spec line asks for one, put it on the PROGRESS.md Backlog as "not in place; what it would take" and tell the builder.

## Project Structure
```
/                     ← root: CLAUDE.md, PROGRESS.md only
/src/components, /src/screens
/src/lib              ← Supabase client, calculations (spec §9), exports, utilities
/src/fixtures         ← one JSON file per table; read by every screen until the access phase, then kept as the demo seed
/netlify/functions    ← admin-users (access phase)
/docs                 ← product-spec.md, access-matrix.md, user-stories.md, supabase-setup.md
/supabase/migrations  ← one .sql file per applied migration
/.claude/skills/ravensberg-brand/   ← brand skill
/public/assets, /public/fonts       ← logo files copied from the brand skill, never redrawn; the PDF fonts
```

## Brand
Brand is governed by the ravensberg-brand skill at .claude/skills/ravensberg-brand/SKILL.md. Invoke it for any UI, chart or PDF work. Hard rules that hold even if the skill is not loaded:
- Background: Soft Stone #F5F4EF; cards white #FFFFFF with a line-grey #DDDBD3 hairline border
- Accent: Ravensberg Green #0F6B3A for structure (titles, table headers, primary series) — never Tailwind blue, never read as "good"; status uses the semantic dots OK #2E8B57 / attention #D98E2B / problem #C0392B
- Font: Montserrat for titles and numbers, Source Sans 3 for everything else; never a third typeface
- Never gradients, shadows on every card, or a redrawn, recoloured or stretched logo. Chart encoding per spec §10: green = approved, taupe #C9A27F = pending, hatched = declined or gap, grey = reference anchors and target lines; estimates labelled "estimate"; the factor set named on every emissions output

## Business Rules
- New project: all fields required; annual_impact > 0; total_impact ≥ annual_impact; start_year 2024–2030 (later accepted with a warning that it contributes nothing to 2030). A site user's project is fixed to their site (scope site); the ESG lead registers group projects only (scope group, no site). Saved as Potential, version 1, next sequential project_code.
- Unit is set by category: tCO₂e per year / m³ per year / tonnes diverted per year.
- Status is set by the transition functions, never typed: Potential → Pending approval (endorse, comment) → Approved or Declined (committee decision: comment, people in the room, date); Declined from Potential by the ESG lead (comment); Declined → Retired by the site (comment) or a new version in Potential (resubmit, same project_code, version n+1, linked by supersedes_project_id); Approved → Obsolete (comment) or re-approval (version n+1 in Potential, the approved version Obsolete, comment); Obsolete → Approved only by reinstate (comment, no newer version). Every transition writes its decision row (none for retire and reinstate) and its history rows in the same call.
- An Approved project is never edited in place. The ESG lead edits a project's figures only while it is Pending approval, with a comment, through the function; a site user edits their own project only while Potential.
- Only Approved projects count toward a target; Pending approval is shown separately as "if approved"; Potential, Declined, Retired and Obsolete count in no target figure, only in the status counts. An Obsolete project leaves every year of the pathway; a project under re-approval counts as Potential or "if approved" until approved again.
- A project counts its full annual impact every year from start_year to 2030 (no ramp-up). A site project counts for its site and the group; a group project for the group only.
- Every target applies to each site's own FY2024 figure; the group requirement is the sum over sites. Uncovered = required − covered − if approved, floored at zero; over-delivery shows uncovered 0 and the surplus in the card.
- Emissions: required = 42 % × FY2024 Scope 1+2 (location-based, FY2024 factor set, frozen; named on the chart).
- Water absolute: required = 10 % × FY2024 withdrawal. Water intensity: target = 80 % of FY2024 withdrawal ÷ FY2024 output; output interpolated straight-line to planned 2030 (FY2024 flat, labelled "estimate", if no plan). Site 1100 is in m³ per pallet and excluded from the group intensity, included in the absolute.
- Waste: per-site rate = diverted ÷ total (latest actual year; incineration with energy recovery counts as diverted); projected = (diverted + approved annual tonnes at the site) ÷ total, capped at 100 % and flagged; group figure = count of sites ≥ 95 %; group waste projects change no site rate.
- A site missing a base-year figure is excluded from that group sum and flagged "reference figures missing: <site>".
- Status counts use current versions only (a resubmitted project counts once). Days waiting: Potential since submission; Pending approval since endorsement.
- Reporting year = the portfolio as of the end of that year (status rebuilt from project_history); the current year = as of today. Register sorts Pending approval first. Full formulas, pathway and bridge definitions: spec §9.
- Reference figures are updated in place by their site or the ESG lead, every change logged in reference_figures_history with user and time; sites and targets are deactivated, never deleted.

Out of scope — do not build:
- Suppliers (invite, login, submission, two approvals) and a supplier / Scope 3 target
- Integration with the environmental reporting tool for reference figures
- Notification emails and reminders; any email arm
- AI assistance of any kind
- Change requests on Approved projects raised by sites (version 1: re-approval by the ESG lead only)
- File uploads and storage buckets
- Microsoft OAuth / SSO login (handover item)

## Reference Docs
Read before building the related part:
- docs/product-spec.md — full screen specs (§8), calculations (§9), export design (§3), acceptance criteria (§13)
- docs/supabase-setup.md — schema source of truth (exists — read first)
- docs/access-matrix.md — read before writing any RLS or touching a policy; every rule is built from it (full form: roles, ownership, the policy plan with its mechanisms, the schema delta)
- docs/user-stories.md — read before changing a screen or a role; every acceptance line is a test
- .claude/skills/ravensberg-brand/SKILL.md — full brand system
PROGRESS.md in the root is read at every session start per the Session Protocol.
