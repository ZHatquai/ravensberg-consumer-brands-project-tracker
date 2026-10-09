# PROGRESS — Ravensberg Project Tracker

> Claude Code: read this file at the start of every session, before touching anything. Update it at every save point. Replace content — do not append. History lives in git.

**Session:** 0 — build not started
**Last updated:** 9 October 2026 — by Project Governor, pre-build
**Live URL:** none yet [Rule: fill in after the first successful deploy]
**Stage:** business logic and database [Rule: one of — business logic and database / second screen and access design / login and access rules together / deploy and maintain. Advance it when that stage's items are absorbed into Current state. Decided by what exists, never by a week or a version number.]
**Supabase project:** exists and empty — ravensberg-consumer-brands, ref bqyjulvljqafubusplgm, URL https://bqyjulvljqafubusplgm.supabase.co; no tables yet [Rule: the only place project state is recorded; CLAUDE.md never carries it]

## Current state
Nothing built. Repo contains CLAUDE.md, PROGRESS.md, product-spec.md (v1.1), access-matrix.md and user-stories.md (short form, P2 internal only), and the ravensberg-brand skill files (SKILL.md, assets/, templates/ — installed in session 1).
[Rule: what exists and works right now — never what is planned. Completed checklist items are absorbed here in compressed form.]

## Last session
None — the first build session has not happened yet.
[Rule: 3–5 lines maximum. Replace each session.]

## Remaining work
- [ ] Builder: create the GitHub repo, upload the files above flat to the root, connect the repo to a Netlify site
- [ ] Builder: connect Supabase to the Netlify site with the Supabase extension (project ravensberg-consumer-brands, framework Vite), check the key values start with `sb_` (if `eyJ`: paste the publishable key by hand and add "rotate the secret key" to the Backlog), redeploy
- [ ] First Session Setup: create docs/, move the spec and the two access files into it and check each is there, install the ravensberg-brand skill, commit (see CLAUDE.md Session Protocol)
- [ ] Connect to ravensberg-consumer-brands (ref bqyjulvljqafubusplgm): confirm it is empty (stop if not), read its region (not EU → Known issues); never create a project
- [ ] Build all seven tables (every change a named migration, saved in supabase/migrations/) with RLS on every table from creation, the login-ready columns, anon's table grants revoked, no role policy (access-matrix.md lines 1–2); seed sites, targets and the three named profiles by migration (line 3) — no Auth, no screen reads a real row — then write docs/supabase-setup.md following the structure in CLAUDE.md
- [ ] Create src/fixtures/ with one JSON file per table, shaped exactly like the schema: the mock-up's 37 projects, decisions and history across every status, the seven sites' FY2024, plan-2030 and latest waste figures (made up; spec §15), the four targets, the three profiles
- [ ] Build the spec §9 calculations in src/lib as pure functions over the fixture rows (targets, pathways, bridge, waste rates, status counts, days waiting)
- [ ] Build Overview as an MVP on fixture data — KPI row, three donuts, three target cards, three pathway tabs, site and year selectors; no Supabase read, no actions
- [ ] Build Project register as an MVP on fixture data — filters, sort, Pending approval first, days waiting; no Supabase read, no row actions (Endorse / Decline / Record decision come in the access phase)
- [ ] Build Project page as an MVP on fixture data — detail, decisions, history; no Supabase read, no action bar until the access phase
- [ ] Build New project form as an MVP — fields, unit from category, every validation rule in CLAUDE.md; Submit saves nothing until the access phase
- [ ] Build Reference data as an MVP on fixture data — targets, per-site figures, derived site targets, missing-figure flags; read-only until the access phase
- [ ] Build Users as an MVP on fixture data — the user list; no Add, change or retire action until the access phase
- [ ] Build Export dialogs — CSV filter confirmation and Download; review pack year picker and Generate
- [ ] Wire Export: the filtered CSV and the four-page PDF review pack, both in the browser from the same calculations as the Overview (spec §3)
- [ ] Builder: verify mail.sustainos.io in Resend and have the SMTP settings ready for Supabase → Auth (before the access phase)
- [ ] Run the Access Architect's full run once docs/supabase-setup.md exists and someone will log in (it adds the named people to access-matrix.md; confirm Zee's site and the four carried points first); the Login screen, the login, the rules and every screen's actions are built together after that — no login before then
- [ ] Local test pass — full walkthrough of every view before deploying
- [ ] Acceptance criteria pass — verify every criterion in spec §13 that applies before the access phase (login, user actions, decisions and the refusal test wait for it)
- [ ] Builder: keep the Supabase project active, or upgrade to Pro (manual billing step), for the workshop week; Free has no backups and pauses when idle
- [ ] Push to main → Netlify auto-deploys
[Rule: completed items leave this list and are absorbed into Current state. This list only shrinks.]

## Build decisions
- Supabase project exists but is empty: built with the new-project rules on the existing ref, never recreated (Governor, 9 Oct 2026).
- PDF review pack generated in the browser, not a Netlify Function; spec bumped to v1.1 (Governor, 9 Oct 2026).
- profiles follows spec §5: role esg_lead is the admin (no separate admin flag); retired_at is the active state.
[Rule: one line per decision made during the build that is not in the spec. Future sessions depend on these to stay consistent.]

## Known issues
- Zee's site assumed 1200 Werk Paderborn in the seeded profile; confirm before the Access Architect's full run (spec §15).
- status on decisions and reference_figures defaults to 'active'; the full run fixes the other values.
- Carried to the full run (access-matrix.md): Approved is final but the ESG lead edits approved figures; Users screen changes role and site; reference_figures needs a history table; Zee's site.
[Rule: bugs, edge cases, and deferred fixes. One line each. Remove when resolved.]

## Backlog
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
