# PROGRESS — Ravensberg Project Tracker

> Claude Code: read this file at the start of every session, before touching anything. Update it at every save point. Replace content — do not append. History lives in git.

**Session:** 1
**Last updated:** 9 October 2026 — session 1, Claude Code (spec bumped to v1.2 with the builder's answers)
**Live URL:** https://sustainability-project-tracker.netlify.app (the Netlify site connected to the repo; the builder walked through the live tool on 9 Oct 2026; confirm the address if the site uses another domain) [Rule: fill in after the first successful deploy]
**Stage:** second screen and access design [Rule: one of — business logic and database / second screen and access design / login and access rules together / deploy and maintain. Advance it when that stage's items are absorbed into Current state. Decided by what exists, never by a week or a version number.]
**Supabase project:** ravensberg-consumer-brands, ref bqyjulvljqafubusplgm, URL https://bqyjulvljqafubusplgm.supabase.co, region eu-central-1, Free plan. Seven tables with RLS on and no policy; seeds only (sites 7, profiles 3, targets 4); eight migrations applied and saved in supabase/migrations/. No Auth. [Rule: the only place project state is recorded; CLAUDE.md never carries it]

## Current state
- Repo layout per CLAUDE.md: docs/ (product-spec.md v1.1, access-matrix.md and user-stories.md short form, supabase-setup.md), .claude/skills/ravensberg-brand/, public/assets/ (logo files and favicon from the brand skill), public/fonts/ (Montserrat and Source Sans 3 TTFs for the PDF), supabase/migrations/, src/.
- Database: `sites`, `profiles`, `targets`, `reference_figures`, `projects`, `decisions`, `project_history`, every one with RLS on, anon revoked, authenticated without DELETE/TRUNCATE, no policy on any table; `set_updated_at` triggers; `projects_write_history` trigger (one history row per changed field, definer); `project_code_seq` (PRJ-0001 …). docs/supabase-setup.md is the schema source of truth. Nothing in the app reads a table.
- Fixture data in src/fixtures/ (one JSON file per table, shaped exactly like the tables): 37 projects (38 rows, one resubmission), 57 decisions, 99 history rows, the seven sites' FY2024 and FY2025 actuals and six 2030 output plans (1500 has none, the estimate case), the four targets, the three named profiles plus seven made-up site users and one retired user.
- src/lib/calculations.js: every spec §9 formula as pure functions (status as of a date rebuilt from history, current versions, status counts, KPIs, days waiting, emissions and water absolute targets with pathway and bridge, water intensity with interpolated output and both target lines, waste rates per site with capping, reporting years). Checked by hand against the fixtures.
- Screens (React + Vite + Tailwind, brand per the skill, recharts): Overview (KPI row, three donuts, three target cards with meters, three pathway tabs, site and year selectors), Project register (filters, column sort, Pending approval first, days waiting, row click), Project page (detail, decisions, history, version links), New project form (every validation rule; a site user's project is fixed to their site, the ESG lead's to the group; Submit shows a "nothing is saved yet" preview with the next project ID), Reference data (targets, per-site figures with derived site targets, missing and estimate flags), Users (list, ESG lead only), Export dialogs. A "View as" switch in the header stands in for the login (ESG lead, CFO, any site user); site users see only their site, no site selector, no PDF button; the CFO has no Register button; /users redirects for non-admins.
- Exports in the browser: CSV of the register as filtered (22 columns per spec §3, file name ravensberg-projects-<filter>-<date>.csv, a site user's file holds only their site); four-page PDF review pack with jsPDF (summary, pathways, approved projects with subtotals and the obsolete line, committee decisions and declined projects), brand fonts embedded, logo on every page, footer with page numbers, estimates labelled; ESG lead and CFO only.
- `npm run build` passes. Walked through in headless Chromium: every screen, both exports, three roles, 2025 and 2026 reporting years, phone width; no console errors.
[Rule: what exists and works right now — never what is planned. Completed checklist items are absorbed here in compressed form.]

## Last session
Session 1 (9 Oct 2026): First Session Setup; confirmed the Supabase project empty and in the EU; built the seven tables as eight named migrations with RLS, revoked grants and seeds; wrote docs/supabase-setup.md; generated the fixture data; built the spec §9 calculations, all seven screens and both exports on fixture data; build and browser walkthrough clean. Merged into main through pull request ZHatquai/ravensberg-consumer-brands-project-tracker#1 on 9 Oct 2026; Netlify deploys main.
[Rule: 3–5 lines maximum. Replace each session.]

## Remaining work
- [ ] Builder: the extension wrote legacy `eyJ` keys. In Netlify (Site configuration → Environment variables) replace the value of `VITE_SUPABASE_ANON_KEY` with the publishable key from the Supabase dashboard (Project Settings → API Keys, `sb_publishable_…`), then trigger a deploy. Leave `SUPABASE_SERVICE_ROLE_KEY` for now (see Backlog)
- [ ] Builder: merge the follow-up commits on branch `claude/elegant-pasteur-s4jgz3` (PROGRESS.md after the merge; the ESG lead form rule; spec v1.2) into main
- [ ] Project Governor in Iteration Mode on spec v1.2 (the governed version in CLAUDE.md is still v1.1, so the next build session stops at its step 2 until this is done); planned together with the step below
- [ ] Builder: verify mail.sustainos.io in Resend and have the SMTP settings ready for Supabase → Auth (the builder will do this once the roles exist; until then the magic link can be tested with Supabase's built-in mailer, rate-limited, testing only)
- [ ] Run the Access Architect's full run on spec v1.2 (docs/supabase-setup.md exists; the four carried points are answered in the spec): it adds the named people, ownership, states, actions and the policy plan to docs/access-matrix.md and docs/user-stories.md; Governor in Iteration Mode; then the Login screen, the login, the rules, the narrow functions, the admin user-creation Netlify Function and every screen's actions are built together, and every screen switches from its fixture file to the real rows as the signed-in user; the "View as" switch is removed
- [ ] Reference figures and the 37 demo projects into the real tables (data fix or seed migration, decided in the access phase) so the deployed tool shows the demo portfolio
- [ ] Builder: local test pass — full walkthrough of every view on fixture data before deploying (Claude Code did one in headless Chromium; a human pass is still due)
- [ ] Acceptance criteria pass — spec §13: on fixture data, 2, 3, 4 (except row actions), 5 (validation), 8, 9, 10, 11, 14, 15 and 16 (no notice, no checkbox, no privacy page) are met; 1, 6, 7, 12 (edits), 13, 17 and 18 wait for the access phase and the deploy
- [ ] Builder: keep the Supabase project active, or upgrade to Pro (manual billing step), for the workshop week; Free has no backups and pauses when idle
[Rule: completed items leave this list and are absorbed into Current state. This list only shrinks.]

## Build decisions
- Supabase project exists but is empty: built with the new-project rules on the existing ref, never recreated (Governor, 9 Oct 2026).
- PDF review pack generated in the browser, not a Netlify Function; spec bumped to v1.1 (Governor, 9 Oct 2026).
- profiles follows spec §5: role esg_lead is the admin (no separate admin flag); retired_at is the active state.
- profiles carries created_at ("added on" on the Users screen) and updated_by/updated_at like every other table (session 1).
- A resubmission keeps its project_code and takes version n+1; unique (project_code, version). A new project takes the next sequence value (session 1).
- project_history is written by a SECURITY DEFINER trigger (search_path '', schema-qualified) so no user ever needs an insert right on the history table; the change comment travels in the transaction setting app.change_comment, which the narrow functions of the access phase set (session 1).
- The authenticated role has no DELETE or TRUNCATE grant on any table, on top of "no DELETE policy" (session 1).
- Reporting year = the portfolio as of the end of that year (status rebuilt from the status rows in project_history); the current year = as of today. Register, Overview and review pack share it (session 1).
- "Both target lines" on the water intensity chart = the intensity target (−20 %) and the absolute target (−10 % withdrawal) expressed as intensity over the planned output (session 1).
- Water intensity, site missing a 2030 plan: output held flat at FY2024 and labelled estimate (spec §9); waste: a 2030 plan row with waste_total_t replaces the latest total as the denominator (session 1).
- Fixture profiles include seven made-up site users and one retired user beyond the three seeded people, so every fixture project has a submitter; the seeded table holds the three only (session 1).
- The ESG lead registers group projects only; a site's projects are registered by the site. Builder decision after the first walkthrough (9 Oct 2026), written into spec v1.2; the full run carries it as a create rule. Screen-side only until then (session 1).
- An Approved project is never edited in place: a change is a re-approval, a new version in Potential with the approved version Obsolete, out of every target figure until approved again; the ESG lead edits figures only while Pending approval (builder, 9 Oct 2026, spec v1.2). Nothing to build until the access phase: the calculations already drop a superseded version from every figure.
- Spec v1.2 was written by Claude Code from the builder's confirmed answers, not through the Tool Architect; the Governor's iteration on it is still due (session 1).
- The "View as" switch and the sessionStorage that remembers it, the site and the year are screen conveniences for the fixture phase; they are not a rule and are removed in the access phase (session 1).
- Chart palette is the brand's binding encoding (green approved, taupe pending, hatched gap or declined, grey anchors); because taupe and grey fail the dataviz contrast checks, every chart carries direct labels, a legend and the register as its table view (session 1).
- PDF fonts: Montserrat SemiBold/Bold and Source Sans 3 Regular/SemiBold TTFs (Google Fonts, OFL) in public/fonts/, loaded only when a pack is generated; jsPDF is loaded on demand so it stays out of the main bundle (session 1).
[Rule: one line per decision made during the build that is not in the spec. Future sessions depend on these to stay consistent.]

## Known issues
- CLAUDE.md governs spec v1.1 while docs/product-spec.md is v1.2: the Session Protocol stops the next build session until the Project Governor has iterated CLAUDE.md. Intended: the Governor's iteration is the next step after the Access Architect's full run.
- Legacy `eyJ` key values in Netlify until the builder pastes the publishable key (Remaining work) and the secret key is replaced (Backlog).
- The Supabase extension also writes `SUPABASE_JWT_SECRET`, not in the spec's list; nothing uses it. Recorded in docs/supabase-setup.md §8.
- status on decisions and reference_figures defaults to 'active'; the full run fixes the other values (the calculations skip rows with status 'void').
- Still carried to the full run: `reference_figures_history` (schema delta). The other carried points are answered in spec v1.2.
- Legacy API keys not checked yet (no Netlify connection in session 1); check on the first live build.
- The Supabase security advisor reports "RLS enabled, no policy" on all seven tables: intended until the full run.
- Review pack tables overflow onto extra pages when a year holds more approved projects or decisions than fit; the footer numbers all pages.
[Rule: bugs, edge cases, and deferred fixes. One line each. Remove when resolved.]

## Backlog
- Rotate the secret key: replace the legacy `SUPABASE_SERVICE_ROLE_KEY` value in Netlify by hand with the secret key (`sb_secret_…`) before the access phase deploys the admin user-creation function, and in any case before the end of 2026 when the legacy keys retire (found 9 Oct 2026)
- Suppliers: invite, login, submit, two approvals — next build, validate the internal tool first
- Supplier-programme / Scope 3 target — next build, with the suppliers
- Integration with the environmental reporting tool for reference figures — later; manual entry in v1
- Notification emails and reminders — needs an email arm and a scheduled function
- AI assistance (completeness check, portfolio summary) — validate the core tool first
- Change requests on Approved projects raised by sites — v1: ESG lead only
- File uploads (evidence documents) — not needed to validate the idea
- Handover: login upgrade path — OAuth with Microsoft or company SSO (needs an OAuth app, usually an IT ticket); the rules do not change when the door changes
- Handover: backups (Free: none, the migration files and a data copy are the rebuild path; Pro: daily); alerts (check Netlify Deploys after each push); where the keys live and how to rotate one; accounts held personally by the platform owner; who supports the tool; how to retire it
[Rule: deferred items live here, nowhere else. When a stage starts or the spec is revised, review this list: an item now in scope is promoted into Remaining work with a Build decisions line. Nothing here is built without being promoted.]

## Notes for next session
None.
[Rule: the builder writes here between sessions. Claude Code reads these aloud at session start, acts on them, then clears this section.]
