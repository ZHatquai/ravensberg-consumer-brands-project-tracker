# Product Spec — Ravensberg Project Tracker

**Version:** 1.1
**Date:** 9 October 2026
**Author:** Zyad Hatquai
**Status:** Confirmed
> The Tool Architect sets this to **Confirmed** when the builder confirms the Phase 10 summary. The Project Governor will not accept a spec in any other status.

---

## Section 1 — Tool Summary

**Tool name:** Ravensberg Project Tracker

**What it does:** A project register with an approval workflow and a target dashboard. Site users register energy, water and waste reduction projects for their site, the ESG lead moves each project through endorsement and committee approval, and the dashboard shows what the approved portfolio delivers against the group's 2030 targets, per site and for the group.

**Who uses it:** The seven sites of Ravensberg Consumer Brands GmbH (the EHS manager and/or site manager of each site), the global ESG lead in Group Sustainability (who is also the tool's admin), and the CFO. Ravensberg is the fictional company used in SustainOS training; this tool is the finished demonstration tool for the AI Lab workshop "Every Water, Carbon, and Waste Project. One Dashboard. Finally."

**Why it exists:** Reduction projects live in site spreadsheets, emails and slide decks. Nobody can see all of them at once, which are approved, which are waiting, and how much they contribute to the carbon, water and waste targets. The tool gives one place to register, approve and follow projects, and shows the gap to each target at any time, with a full history of who decided what and when.

**Build status:** First build — no prior version. An HTML mock-up of the dashboard (`rb-project-tracker.html`, September 2026) exists as the design reference; it holds no data and is not a version of the tool.

---

## Section 2 — Classification

This section defines the architecture of the tool. Every downstream decision follows from this.

### Data Model

**Decision:** D3

| Label | What it means | This tool? |
|-------|--------------|-----------|
| D1 — Hardcoded | All data is written into the code by the developer. Users cannot input anything that persists. The tool displays what the developer put in. | No |
| D2 — Session | Data enters the tool during use and disappears when the tab closes. No database. Covers both uploaded files and form inputs. | No |
| D3 — Persisted | Data is written to a database and survives after the session ends. Supabase is required. | Yes |

**Reason:** Projects are registered by one person, decided by another, and read by a third over months; every decision and every figure change must stay on record.

**D3 is triggered if any of the following are true — check all that apply:**
- [x] Data must be retrievable after the session ends
- [x] Multiple sessions contribute to the same dataset
- [x] An audit trail or history is needed
- [x] Data submitted by one person must be visible to another
- [x] Results must be accessible via a URL after the session ends
- [ ] Files uploaded by users must be stored and retrievable later

---

### Access Model

**Decision:** A3

| Label | What it means | This tool? |
|-------|--------------|-----------|
| A1 — Public | Anyone with the URL can use it. No login, no account required. | No |
| A2 — Authentication | Users must log in. All logged-in users see the same thing and have the same permissions. Admin work (creating users, maintaining lists) happens in the Supabase dashboard, not in the app; the moment one logged-in person has an admin action in the app, the tool is A3. | No |
| A3 — Authorization | Users must log in and have different roles. Different roles see different data or have different permissions. | Yes |

**Reason:** A site user sees and edits only their own site's projects, the ESG lead decides on every project and manages users inside the app, and the CFO reads everything and changes nothing.

> **Promotion rule:** Auth requires a database. If the access model is A2 or A3, the data model is D3 — even when all displayed content is fixed. D1/D2 combined with A2/A3 are not valid classifications; they resolve to D3.

> **Target, not state:** the access model here is what this tool is designed for. In the AILab workflow the Access Architect writes the write-only rules the moment this spec goes to D3, the database is built with RLS on every table and those rules from the first table, any screen that shows records (the first screen of an internal-only tool included) is built first as an MVP on fixture data (no database read, no actions), the Access Architect's full run then adds the named people from the real tables, and the login, the row rules and the screen's actions are built together in one pass after that, when the screen switches to real data. So a spec can say A3 while no login is on yet; that is normal. Where the build actually stands lives in PROGRESS.md, never here.

---

### If Access Model is A3 — define all roles

| Role name | Who this is | Named first holder (name, work email) | What they can see | What they can do |
|-----------|------------|----------------------------------------|-------------------|-----------------|
| Site user | The EHS manager and/or site manager of one site (one or both per site, depending on the site). Belongs to exactly one site. | Zee, z.hatquai@gmail.com, site 1200 Werk Paderborn (site to confirm, see Section 15) | Their own site only: its projects in every status, its reference figures, its share of each target and its pathway. Never another site, never the group view. | Register a project for their site; edit it while it is Potential; resubmit or retire a Declined project; enter and update their site's reference figures; export the CSV of their own site's register. |
| ESG lead (admin) | The one global ESG lead in Group Sustainability. The tool's admin. | Zyad Hatquai, z.hatquai@sustainos.io | Everything: all sites, the group overview, every project, every figure, every user. | Register group-level projects (not tied to a site); endorse a Potential project to Pending approval; decline at either stage with a comment; record the committee decision (Approved or Declined, with comment, people in the room, date); mark an Approved project Obsolete with a comment; change any project figure with a comment; set the group targets; edit any reference figure; add users, assign role and site, retire users; export CSV and the PDF review pack. |
| CFO | The group CFO (Group Management Board). | Sam, sustainatrend@gmail.com | Everything, read-only: all sites, the group overview, every project and its history. | Filter and read; export CSV and the PDF review pack. No edits, no decisions. |

> The named first holder is what the Access Architect reads; a group is not an answer. For a public tool with a reading screen planned later, name the first reader here now, so the database is built ready for the login.

---

### Tier

**Tier:** 3

| Tier | D+A combination | Stack | Deployment |
|------|----------------|-------|------------|
| 1 | D1+A1 or D2+A1 | Netlify only | Netlify |
| 2 | D3+A1 | Netlify + Supabase (no auth) | Netlify |
| 3 | D3+A2 or D3+A3 | Netlify + Supabase (auth + RLS) | Netlify |

---

### Standalone or Stack

**This tool is:** Standalone — it does not share a database with any other tool today. Its Supabase project is named after the company (ravensberg-consumer-brands) so that a later Ravensberg tool (the environmental reporting tool, or the supplier submission side in Section 12) can join the same project; when that happens, this repo is the canonical repo for the database and the stack rules in Section 4 apply.

---

## Section 3 — Arms

Arms are capabilities added to the tool. They do not change the tier. Mark each arm active or not, and complete the detail only for active arms.

> **Document search and AI knowledge bases are outside this framework version.** If your tool needs natural-language search over a document collection (RAG, embeddings, vector search), that is an advanced build with its own architecture, costs, and maintenance — it does not fit the standard AILab pipeline. Note it under Out of Scope (Section 12) and validate the core tool first.

---

### AI API Arm

**Active:** No

---

### Export Arm

**Active:** Yes

| Detail | Answer |
|--------|--------|
| Format | Both |
| What is exported | **CSV:** the project register exactly as filtered on screen (reporting year, site, category, status), one row per project: project ID, title, category, scope (site or group), site code and name, description, total impact, annual impact, unit, start year, capex, opex, owner name, status, version, submitted by, submitted on, last decision stage, last decision outcome, last decision date, last decision comment. File name `ravensberg-projects-<filter>-<YYYY-MM-DD>.csv`. A site user's CSV holds only their site. **PDF:** the "CFO review pack" for a chosen reporting year, four pages, described below. |
| PDF design intent | A4 portrait, Ravensberg brand (brand skill in Section 10): Soft Stone or white pages, the logo lockup top-left on every page, a Leaf Green rule under each page title, Montserrat for titles and numbers, Source Sans 3 for everything else, Ravensberg Green only on titles and table header rows; footer on every page "Ravensberg Consumer Brands \| Group Sustainability \| Internal" and a page number. **Page 1 — Summary:** title "Sustainability projects, review <year>", generated date and the name of the person who generated it; the KPI row (registered, approved, pending approval, declined, approved tCO₂e per year); the three target cards exactly as on the Overview (emissions; water with the absolute and the intensity meter; waste as sites at or above 95%). **Page 2 — Pathways:** the three pathway charts (emissions bridge; water intensity trajectory with both target lines; waste one bar per site), each with its one-line caption; the emissions chart names the factor set ("FY2024 factor set, frozen; location-based"). **Page 3 — Approved projects:** a table of all Approved projects in the year, grouped by category, with site, annual impact, total impact, start year, capex, opex, and category subtotals; a line of Obsolete projects of the year below it. **Page 4 — Committee decisions:** every committee decision of the year in date order: project, outcome, date, people in the room, the decision comment; then the Declined projects awaiting resubmission or retirement. Estimates are labelled "estimate" wherever a projected figure appears. Generated on demand by the ESG lead or the CFO, in the browser from the same calculations as the Overview (no server function, so the database's rules apply to it); never emailed. |

---

### Email Arm

**Active:** No

> The magic-link login mail is sent by Supabase Auth through Resend (Section 6); it is the login, not a notification, and it is not this arm. Notification emails (project submitted, decision recorded) and reminders are on the backlog, Section 12.

---

### Scheduled Automation Arm

**Active:** No

---

## Section 4 — Stack and Deployment

### All Tiers

| Detail | Answer |
|--------|--------|
| Frontend framework | React + Vite + Tailwind |
| Deployment target | Netlify |
| Deployment | GitHub push to main → Netlify auto-deploy. Claude Code is connected to GitHub and pushes to main; the repo is connected to a Netlify site once in the Netlify dashboard, and every push then deploys. Netlify is NOT connected to Claude: no Netlify connector or MCP is used or needed in this workflow. One-time builder steps in the Netlify dashboard: connect the repo to a site, and connect Supabase to the site with the Supabase extension (below). |
| Supabase ↔ Netlify connection (Tier 2/3) | **The Supabase extension in Netlify, never copy-paste.** Netlify dashboard → Extensions → Supabase → Install; then on the site → Connect → sign into Supabase → pick the project `ravensberg-consumer-brands` and the framework (Vite; if Vite is not listed, choose Other and set the prefix to `VITE_`). The extension writes into the site's environment (variable names and key values to verify on the first live build, then recorded here): `SUPABASE_DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, plus `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Then redeploy: Vite bakes the browser-side variables in at build time. **When:** existing project — before the build. **Key check, once:** the values should start with `sb_` (publishable / secret); if they start with `eyJ` the extension wrote the retiring legacy keys — the public one is replaced by hand with the publishable key, and rotating the secret one is a dated handover item. A Netlify-to-Supabase link, set once; it has nothing to do with Claude. |
| Platform owner | Zyad Hatquai personally: the Supabase, Netlify, Resend and GitHub accounts are his own, not a company account. |

**GitHub — pre-build requirement for all Tier 1, 2, and 3 tools:**
A new tool gets a new GitHub repo, created by the builder before the first Claude Code session; an iteration of an existing tool keeps the repo it has. The product-spec.md, CLAUDE.md, and PROGRESS.md must be at the repo root before Claude Code opens (and, for a database tool, user-stories.md and access-matrix.md). In its first session Claude Code moves every document into docs/ and checks that each one is there before building. Claude Code assumes the repo exists, commits changes regularly, and pushes to main. It does not create or configure the repo.

---

### CONDITIONAL: Supabase project — only complete if Tier 2 or Tier 3

**Supabase project status:** Existing — a project already exists for this context. It was created by the builder on 9 October 2026 and is empty: no tables, no auth users, no previous tool. There is no supabase-setup.md yet; Claude Code writes it at the end of the first build session, exactly as it would for a new project. It does not create a project.

**Supabase plan:** Free — for building, testing and exploring: no backups; paused after roughly one week without use; switches to Pro when: the tool is relied on by real users. For the three workshop days the project must not be paused: the builder uses it in the days before, or switches to Pro for the workshop week. The handover package explains the cost.

**If existing:**

| Detail | Answer |
|--------|--------|
| Project name | ravensberg-consumer-brands |
| Project ID | bqyjulvljqafubusplgm (dashboard URL https://bqyjulvljqafubusplgm.supabase.co) |
| supabase-setup.md location | docs/supabase-setup.md in the project folder — created by Claude Code at the end of the first build session (the project is empty today) |

> Claude Code will read supabase-setup.md before making any schema changes. It will not recreate tables or policies that already exist.

**supabase-setup.md — all Tier 2 and Tier 3 tools:**
This file is created by Claude Code at the end of the first build session and updated every time Claude Code touches the database. It lives permanently in docs/ and records the project name, project ID, all tables and fields, RLS policies, and auth configuration. It is the schema source of truth for all future build sessions and for the Supabase QA skill.

---

## Section 5 — Data Architecture

### CONDITIONAL: Only complete if Data Model is D3

This section is the input Claude Code uses to build the database schema via MCP. Describe tables and fields in plain language — Claude Code handles the technical implementation.

**What data is collected or stored in this tool:**

| Field name | Plain language label | Data type | Who provides it | Required? |
|-----------|---------------------|-----------|----------------|-----------|
| project_code | Project ID shown on screen, e.g. PRJ-0041 | Text, generated in sequence | Automatic | Yes |
| title | Project title | Text | Site user or ESG lead | Yes |
| category | Emissions / Water / Waste | Choice | Site user or ESG lead | Yes |
| scope | Site project or group project | Choice | Automatic: site for a site user, chosen by the ESG lead | Yes |
| site_id | Site the project belongs to (empty for a group project) | Reference to sites | Automatic for a site user; ESG lead chooses or leaves empty | Yes for site projects |
| description | What the project is and how it delivers the impact | Long text | Site user or ESG lead | Yes |
| total_impact | Total impact over the project's life, in the category unit | Number | Site user or ESG lead | Yes |
| annual_impact | Annual impact at full run rate, in the category unit | Number, greater than zero | Site user or ESG lead | Yes |
| unit | Unit, fixed by category: tCO₂e per year / m³ per year / tonnes diverted per year | Text, set by the tool | Automatic | Yes |
| start_year | First year the annual impact applies | Year | Site user or ESG lead | Yes |
| capex_eur | Investment, one-off, in EUR | Number | Site user or ESG lead | Yes |
| opex_eur_per_year | Running cost or saving per year, in EUR (negative allowed for a saving) | Number | Site user or ESG lead | Yes |
| owner_name | Name of the project owner at the site | Text | Site user or ESG lead | Yes |
| status | Potential / Pending approval / Approved / Declined / Retired / Obsolete | Choice | Set by actions, never typed | Yes |
| version | Version number; a resubmission creates version n+1 | Number | Automatic | Yes |
| supersedes_project_id | The declined version this one replaces | Reference to projects | Automatic on resubmission | No |
| created_by, created_at, updated_by, updated_at | Audit columns | Reference to profiles, timestamp | Automatic | Yes |
| decision: stage | Which decision: endorsement, committee, obsolete, decline | Choice | ESG lead | Yes |
| decision: outcome | Endorsed / Approved / Declined / Obsolete | Choice | ESG lead | Yes |
| decision: comment | The decision comment | Long text | ESG lead | Yes, always |
| decision: attendees | People in the room (committee decisions) | Text | ESG lead | Yes for committee decisions |
| decision: decision_date | Date of the decision | Date | ESG lead | Yes |
| decision: recorded_by, recorded_at | Who entered it and when | Reference to profiles, timestamp | Automatic | Yes |
| history: field, old_value, new_value, comment, changed_by, changed_at | One row per changed field on a project | Text, timestamp | Automatic on every edit; comment required for ESG-lead edits after approval | Yes |
| site: code, name, city, type | The seven sites from the site register (1000 Werk Bielefeld … 1600 Werk Lippstadt) | Text | Seeded by the builder | Yes |
| reference figure: site_id (empty = group), year, kind (actual / plan) | Which site and year the figure is for | Reference, year, choice | Site user (own site) or ESG lead | Yes |
| reference figure: scope12_tco2e | Scope 1 + 2 emissions, location-based, FY2024 factor set | Number | Site user or ESG lead | Yes for FY2024 |
| reference figure: water_withdrawal_m3 | Water withdrawal | Number | Site user or ESG lead | Yes for FY2024 |
| reference figure: output_t | Production output in tonnes (site 1100: pallets handled, see Section 9) | Number | Site user or ESG lead | Yes for FY2024 and plan 2030 |
| reference figure: waste_total_t, waste_diverted_t | Total waste tonnage and tonnage diverted from landfill (diversion includes incineration with energy recovery) | Number | Site user or ESG lead | Yes for the latest actual year |
| target: category, base_year, target_year, value | Group targets: emissions −42 %, water absolute −10 %, water intensity −20 %, waste diversion 95 % at every site; base year 2024, target year 2030 | Choice, year, number | ESG lead (seeded by the builder) | Yes |
| profile: name, email, role, site_id, retired_at | A user: name, email, role (site_user / esg_lead / cfo), site (site users only), retired on | Text, choice, reference, timestamp | ESG lead | Yes |

**Tables needed:**

| Table name | What it stores | Key fields |
|-----------|---------------|-----------|
| sites | The seven sites | code, name, city, type |
| profiles | One row per user, linked to the login identity by email; retired, never deleted | auth_user_id, name, email, role, site_id, retired_at |
| targets | The group targets | category, base_year, target_year, value, set_by |
| reference_figures | One row per site (or group) per year per kind: the base-year figures, the latest actuals, the 2030 plan | site_id, year, kind, scope12_tco2e, water_withdrawal_m3, output_t, waste_total_t, waste_diverted_t, entered_by |
| projects | One row per project version | project_code, title, category, scope, site_id, status, version, supersedes_project_id, annual_impact, total_impact, start_year, capex_eur, opex_eur_per_year, owner_name, created_by, created_at |
| decisions | One row per decision taken on a project | project_id, stage, outcome, comment, attendees, decision_date, recorded_by |
| project_history | One row per changed field, the audit trail | project_id, field, old_value, new_value, comment, changed_by, changed_at |

**Main record and its states** (fill whenever a login is planned now or later; the Access Architect reads it here):

| Detail | Answer |
|--------|--------|
| Main record | One row = one project version |
| States, in order | Potential → Pending approval → Approved; Declined from Potential (ESG lead) or from Pending approval (committee); from Declined the site creates a new version (back to Potential) or sets Retired; from Approved the ESG lead can set Obsolete. Final states: Approved, Retired, Obsolete. Declined is final for that version; the resubmission is a new version linked by supersedes_project_id. |
| Login-ready columns | Seeded by the Governor on every record table from day one: `created_by` (empty until a login exists), `status`, `created_at`, `updated_by`, `updated_at`; plus `profiles` whenever Section 6 names a login target. |

**File storage:** No

**Derived or calculated data:** Yes
If yes — describe what is calculated and from what:
Everything on the Overview, the target cards, the pathway charts and the review pack is calculated at read time from projects (by status and start year), reference_figures and targets; nothing calculated is stored. Section 9 holds the formulas.

---

## Section 6 — Access and Permissions

### CONDITIONAL: Only complete if Access Model is A2 or A3

**Auth configuration:**

| Detail | Answer |
|--------|--------|
| Login, as built | **Magic link, by builder decision.** The framework's default first door is email and password, admin-managed; the builder (an advanced builder with his own verified sending domain) chose to build the upgrade path directly, so there are no passwords and no Change password screen. Supabase Auth: "Enable sign-ups" OFF; email provider on with magic link; custom SMTP configured in the Supabase dashboard (Auth → SMTP settings) with Resend (host smtp.resend.com, the Resend API key as the SMTP password, sender address on a sending subdomain of sustainos.io, for example noreply@mail.sustainos.io, the subdomain added and verified in Resend before the build; the Supabase built-in mail service is rate-limited and for testing only). The ESG lead creates each user on the Users screen (name, email, role, site); an admin Netlify Function using the secret key creates the Auth user and the profile together. The user types their email on the login screen, receives the link, and is signed in. If a link does not arrive, the admin generates a login link for that user in the Supabase dashboard (Auth → Users → Generate link) and hands it over on Teams. No password ever exists. |
| Login, upgrade path | OAuth with Microsoft, or the company's single sign-on, for a real corporate tenant where every user has a Microsoft 365 account (Ravensberg runs Microsoft 365): no mail to wait for, accounts people already have; needs an OAuth app, usually an IT ticket. Delivered in the handover package, not built in the first build. The rules do not change when the door changes: authorization keys on identity, never on the login method. |
| Named first holders | ESG lead (admin) — Zyad Hatquai, z.hatquai@sustainos.io · Site user, 1200 Werk Paderborn — Zee, z.hatquai@gmail.com · CFO — Sam, sustainatrend@gmail.com. The Access Architect seeds their profiles by email before the login exists. |
| Signup model | Invite-only by construction (sign-ups off, the admin creates users). Every policy checks the profile, so an identity without a profile reaches nothing. |
| When it is built | Together with the row rules, in one pass, after the Access Architect has written user-stories.md and access-matrix.md from the real tables. Captured here; not built ahead of the rules. |

> **Privacy note — include in every A2/A3 spec:** User accounts store an email address and a name; they are personal data, listed in Section 7 as data the tool holds. For internal and client tools this falls under the organisation's existing privacy framework rather than a consent flow, and the deletion procedure includes the login.

**Roles and access — where the rules live:**

Name the roles and what each one broadly does, in plain language. Do NOT put a row-by-row grid here.

| Role | What they broadly see and do |
|------|------------------------------|
| Site user | Sees only their own site: its projects, its reference figures, its share of each target. Registers projects for their site, edits them while Potential, resubmits or retires Declined ones, enters their site's reference figures, exports their site's CSV. Cannot decide, cannot see other sites or the group view. |
| ESG lead (admin) | Sees everything. Registers group projects, endorses, declines, records committee decisions, marks Obsolete, edits any figure with a comment, sets targets, edits reference figures, exports CSV and the review pack. The four admin actions: adds users and assigns role and site, retires users (never deletes), maintains the sites and targets lists, can retire or obsolete any record; reads all. |
| CFO | Sees everything, changes nothing. Filters, reads project pages and history, exports CSV and the review pack. |

> The row-level access rules live in `access-matrix.md`, produced by the Access Architect for every tool that has a database: a short run the moment this spec goes to D3 (the write-only rules, before the database exists) and a full run against the real tables once someone will log in. Claude Code builds every line of its policy plan with the mechanism that line names (a policy, a trigger, a narrow function, a bucket policy, or the screen), and the login together with them when there is one; the Governor lifts its hard rules into CLAUDE.md and reads every rule from the matrix. This section does not duplicate the grid.

---

## Section 7 — GDPR

### MANDATORY DECISION: Complete this section for every D3 tool. It is never skipped — the outcome is either the consent framework below or an explicit, confirmed "not applicable".

**GDPR outcome:** Applies in scope, handled inside the organisation's existing privacy framework, by builder decision. Personal data enters through the form (the project owner's name) and through the login identities. The builder confirmed on 9 October 2026 that this is an internal tool and that **no in-app notice and no checkbox are built**; the data sits under the organisation's existing employee privacy notice, on the basis of legitimate interest. Claude Code builds no notice text, no consent field and no privacy page.

**Personal data the tool holds (every D3 tool with a login):** login email and name per user (profiles); the project owner's name on each project; the names of people in the room on committee decisions; the user behind every history row. Who holds the notice: the organisation's existing employee privacy notice (for the demo: the builder, who is the only real person behind every account).

**Personal data collected:**
Through the form: owner_name on a project; attendees on a committee decision. Through the login: name and email per user.

**Lawful basis:** Legitimate interest — colleagues using an internal tool to run the company's environmental programme. Confirmed by the builder; for a real deployment the organisation's privacy contact signs it off.

**Notice on the form or at first use:** No, by builder decision (internal tool). **Consent checkbox:** No. A notice drafted during the interview is kept in Section 15 in case a real deployment needs one; it is not built.

**Data notice text shown at the point of collection:** None built.

**Retention:** For the life of the tool. Nothing is deleted: projects are retired or made obsolete, users are retired. Demo data can be reset by the builder between cohorts.

**Deletion mechanism:**
A person asks the ESG lead (for the demo: z.hatquai@sustainos.io). Deletion means: the profile is retired and anonymised (name and email replaced by "retired user"), the login identity is removed by the platform owner in the Supabase dashboard, and the owner_name and attendees fields on the records that named the person are anonymised, per the access matrix. History rows keep their timestamps and the anonymised reference, so the audit trail stays complete.

> The basis, the notice, the retention period and the deletion route are the standard we build to. For an internal tool they sit inside the organisation's existing privacy framework; if the organisation has a privacy officer, the notice drafted here is theirs to sign off, and this spec says so. All must be confirmed in this spec before Claude Code begins the build.

---

## Section 8 — Screen and UI Structure

List every page or view in the tool. For each one, describe what is on it and what the user can do.

### Login

- **Purpose:** Let a known user in with a magic link.
- **What is visible:** Ravensberg logo lockup, tool name, one email field, a "Send me a login link" button, a confirmation line after sending ("Check your inbox"), and a plain line for the case the mail does not arrive ("Contact Group Sustainability").
- **User actions:** Enter email, request the link, open the link from the inbox.
- **What happens next:** The link signs the user in and opens the Overview scoped to their role. An email without a profile, or a retired profile, sees "This address has no access" and nothing else.

### Overview

- **Purpose:** The dashboard: where the portfolio stands against the targets, for the group or for one site.
- **What is visible:** Header with the logo, the signed-in user's name and role, the site (site users) or a site selector with "Group" (ESG lead, CFO), the reporting year. KPI row: projects registered, approved, pending approval, declined, approved tCO₂e per year. Projects by status: three donuts (Emissions, Water, Waste) with counts and shares for Potential, Pending approval, Approved, Declined (Retired and Obsolete in a small line below). Contribution to the 2030 targets: three cards — Emissions (one meter: approved, pending if approved, uncovered); Water (two meters, absolute and intensity); Waste (sites at or above 95 %: a meter of seven segments, with approved, pending and uncovered sites). Pathway to 2030: three tabs — Emissions bridge (base year, approved levers by site or group, projected 2030, pending, gap, target), Water intensity trajectory (actual, projected with approved, projected with approved and pending, both target lines), Waste one bar per site (FY actual marker, 2030 with approved, pending extension, 95 % line). Each chart carries its one-line caption; the emissions chart names the factor set. Buttons: "Register a project", "Export review pack (PDF)" (ESG lead and CFO), "Export CSV".
- **User actions:** Change site (ESG lead, CFO) and year; hover for values; open the register; open the export dialogs.
- **What happens next:** All figures recalculate for the chosen site and year. Site users cannot change the site.

### Project register

- **Purpose:** Every project in a list, Pending approval first.
- **What is visible:** Filters: reporting year, site (ESG lead, CFO), category, status, submitted by. Table: project ID and title, category, scope, site, annual impact with unit, start year, status with its semantic dot, submitted on, days waiting (Potential and Pending approval). Row actions for the ESG lead: Endorse, Decline, Record decision. "Export CSV" with the current filters.
- **User actions:** Filter, sort, open a project, act on a row (ESG lead), export.
- **What happens next:** Opening a row goes to the Project page. A row action opens the decision dialog (see Project page); on confirm the row's status updates and the Overview recalculates.

### Project page

- **Purpose:** One project: everything about it, its history, and the actions the role has.
- **What is visible:** Title, project ID, version and the version it supersedes (if any), status with its dot, category, scope, site, owner name, description, total impact, annual impact with unit, start year, capex, opex, submitted by and on. Decisions: each decision with stage, outcome, date, people in the room, comment, recorded by. History: every field change with old value, new value, who, when, comment. Action bar by role and status (below).
- **User actions:** Site user: Edit (Potential only); Resubmit (Declined: opens the form pre-filled, saves as a new version in Potential); Retire (Declined: comment required). ESG lead: Edit figures (any status after Potential, comment required); Endorse (Potential → Pending approval, comment required); Decline (Potential or Pending approval, comment required); Record committee decision (Pending approval → Approved or Declined: comment, people in the room, decision date, all required); Mark obsolete (Approved → Obsolete, comment required). CFO: none.
- **What happens next:** Every action writes a decision row and/or history rows and updates the status; the page reloads with the new state. A Declined project becomes read-only for the ESG lead and editable through Resubmit for the site.

### New project form

- **Purpose:** Register a project.
- **What is visible:** Title, category (Emissions / Water / Waste), site (fixed to the user's site for a site user; "Group" or a site for the ESG lead), description, total impact, annual impact, the unit shown from the category, start year, capex, opex, owner name. Inline validation messages. "Submit" and "Cancel".
- **User actions:** Fill in, submit.
- **What happens next:** The project is saved in Potential with version 1 and a new project ID, and the Project page opens. Validation: all fields required; annual impact greater than zero; total impact at least the annual impact; start year between 2024 and 2030 (a later start year is accepted with a warning that it contributes nothing to 2030).

### Reference data

- **Purpose:** The figures the targets are measured against.
- **What is visible:** Targets block (ESG lead edits; everyone reads): the four group targets with base year and target year. Per site (a site user sees only their own; ESG lead sees all, CFO reads all): FY2024 Scope 1 + 2 (location-based, FY2024 factor set), FY2024 water withdrawal, FY2024 output, planned 2030 output, latest actual year's total waste and diverted waste, with the year and who entered it. The derived site targets shown beside them (−42 % on the site's FY2024 Scope 1 + 2, and so on). Missing figures are marked.
- **User actions:** Site user: enter or update their site's figures. ESG lead: enter or update any figure, set the targets. Every change is logged with user and time.
- **What happens next:** The Overview recalculates. A site with a missing base-year figure is excluded from the group sum for that target and flagged on the Overview.

### Users (ESG lead only)

- **Purpose:** Add, assign and retire users.
- **What is visible:** The list of users: name, email, role, site, status (active / retired), added on, retired on. "Add user" form: name, email, role, site (site users only).
- **User actions:** Add a user (creates the login identity and the profile; the user can request a magic link from then on); change a user's role or site; retire a user (comment required). No delete.
- **What happens next:** A retired user can no longer log in; their name stays on every record they touched.

### Export dialogs

- **Purpose:** The CSV and the review pack.
- **What is visible:** CSV: a confirmation of the filters that apply and a "Download" button. Review pack: reporting year, a "Generate" button, then the download link.
- **User actions:** Download.
- **What happens next:** The CSV is produced in the browser from the filtered rows. The review pack is produced in the browser from the same calculations as the Overview, four pages as in Section 3, and downloaded as a file. No server function.

---

## Section 9 — Logic and Calculations

### CONDITIONAL: Only complete if the tool calculates, scores, or applies decision rules

**What is calculated or scored:** The contribution of the project portfolio to each 2030 target (per site and for the group), the gap to each target, and the yearly pathway from the base year to 2030.

**Inputs:** Projects (status, category, scope, site, annual impact, start year); reference figures per site and year (FY2024 Scope 1 + 2, FY2024 water withdrawal, FY2024 output, planned 2030 output, latest actual waste total and diverted tonnage); the four group targets.

**Formula or rules:**

*Which projects count.*
- Approved projects count in full.
- Pending approval projects are shown separately as "if approved"; they never count in the covered figure.
- Potential, Declined, Retired and Obsolete projects never count in any target figure. They appear only in the status counts. An Obsolete project is removed from every year of the pathway, not only from the year it became obsolete; its history stays.
- A project counts its full annual impact in every year from its start year to 2030 (no ramp-up). A start year after 2030 contributes nothing to any 2030 figure.
- A site project counts for its site and for the group. A group project counts for the group only.

*Site share of a group target.* Every target is applied to each site's own base-year figure, no weighting: a site's required reduction = the target percentage × that site's FY2024 figure. The group's required reduction is the sum over sites; for intensity the group figure is group withdrawal ÷ group output. Group projects count against the group's required reduction only.

*Emissions (tCO₂e per year, Scope 1 + 2, location-based, FY2024 factor set, frozen).*
- Required by 2030 = 42 % × base-year Scope 1 + 2.
- Covered (approved) = Σ annual impact of Approved emissions projects active in 2030. If approved = Σ for Pending approval. Uncovered = required − covered − if approved, floored at zero.
- Pathway: target line straight from the base-year figure in 2024 to 58 % of it in 2030; projected line for year y = base-year figure − Σ annual impact of Approved projects with start year ≤ y; a second projected line adds Pending approval projects.
- Bridge: base year; one bar per approved lever (per site for the group view, per project for a site view); projected 2030; pending pipeline; gap; target.

*Water, absolute (m³ per year).*
- Required by 2030 = 10 % × base-year withdrawal.
- Covered, if approved, uncovered: as for emissions, over water projects.

*Water, intensity (m³ per tonne output).*
- Base-year intensity = base-year withdrawal ÷ base-year output. Target 2030 = 80 % of it. Required = base-year intensity − target.
- Output per year is interpolated in a straight line from FY2024 actual to the planned 2030 output.
- Projected intensity for year y = (base-year withdrawal − Σ annual m³ of Approved water projects with start year ≤ y) ÷ output(y). A second line adds Pending approval projects. Covered = base-year intensity − projected 2030 intensity (approved); if approved = the further drop with pending; uncovered = required − covered − if approved, floored at zero.
- Site 1100 (Logistikzentrum Bad Oeynhausen) reports pallets handled, not tonnes: its intensity is m³ per pallet and it is excluded from the group intensity figure; it is included in the absolute water figure.

*Waste (diversion from landfill, per site).*
- Target: 95 % or higher at every site. There is no group percentage; the group figure is the count of sites at or above 95 %.
- Site diversion rate = diverted tonnage ÷ total tonnage, from the latest actual year. Diversion includes incineration with energy recovery.
- Projected 2030 rate = (latest diverted + Σ annual tonnes diverted of Approved waste projects at that site active in 2030) ÷ latest total tonnage, capped at 100 %. A second value adds Pending approval projects. Total tonnage is held at the latest actual unless a 2030 plan is entered.
- Covered = number of sites whose projected rate with approved projects is ≥ 95 % (sites already at target count as covered); if approved = sites that reach 95 % only with pending projects; uncovered = the rest. Group waste projects do not change any site's rate.

*Status counts.* Per category: Potential, Pending approval, Approved, Declined (current versions only; a resubmitted project counts once, in its latest version); Retired and Obsolete shown as a separate line.

*Days waiting.* Potential: days since submission. Pending approval: days since endorsement.

**Output:** Per target, per site and for the group: required, covered, if approved, uncovered, and the pathway values per year 2024 to 2030; the bridge bars; the site rates; the status counts.

**Edge cases:**
- A site with a missing base-year figure is excluded from the group sum for that target and the Overview shows "reference figures missing: <site>" on the card.
- A planned 2030 output missing for a site: intensity projection uses the FY2024 output flat, labelled "estimate".
- Annual impact ≤ 0 is rejected at the form. Total impact below annual impact is rejected.
- A project with no site and scope "site" cannot be saved.
- Covered above required (a site over-delivers) shows uncovered = 0 and the meter full; the surplus is stated in the card ("+1,240 tCO₂e above target").
- Waste rate above 100 % is capped and flagged for the ESG lead to check the site's tonnage.
- A resubmission inherits nothing automatically except the pre-filled form; the declined version stays in the register as Declined, linked.

---

## Section 10 — Brand and Visual Direction

**Brand reference:** Brand skill file — the Ravensberg brand skill (`ravensberg-brand`: SKILL.md, assets/, templates/tokens.css), uploaded flat to the repo root; Claude Code installs it to .claude/skills/ in the first session. Logo files are used as files, never redrawn.

**Visual feel:** Professional and corporate, warm: Soft Stone pages, white cards with a hairline border, Ravensberg Green for structure (titles, table headers, primary series), Warm Taupe for the comparative series, Leaf Green for rules and eyebrows, the semantic dots (OK / attention / problem) for status, never the brand green as "good". Montserrat for titles and numbers, Source Sans 3 for everything else.

**Reference or inspiration:** The HTML mock-up `rb-project-tracker.html` (24 September 2026): the Overview layout, the three donuts, the three target cards, the three pathway charts and the register table are built to match it. Chart encoding from the mock-up is binding: green = approved, taupe = pending, hatched = declined or gap, grey = reference anchors and target lines; estimates labelled.

---

## Section 11 — API and Credentials

List every external service this tool connects to.

| Service | What it does in this tool | Key required | Where key is stored |
|---------|--------------------------|-------------|-------------------|
| Supabase | Database, Auth (magic link) | **Publishable key** (`sb_publishable_…`; public, browser-safe, protected by RLS) + **Secret key** (`sb_secret_…`; server-side only, bypasses RLS, refuses to work from a browser). These replace the older anon and service_role keys, which are a separate key system being retired by the end of 2026; a project can carry both, and this tool uses the new ones. | Netlify environment variables, written by the Supabase extension; value checked once (starts with `sb_`) |
| Resend | Delivers the magic-link login mail for Supabase Auth (custom SMTP) | Resend API key, used as the SMTP password; a verified sending subdomain of sustainos.io | Supabase dashboard → Auth → SMTP settings, entered by hand by the builder. Not a Netlify variable, not in any file. |
| PDF generation | The review pack, rendered in the browser | None (a browser PDF library; Claude Code chooses) | — |

> **Security rule — no exceptions:** No API key, token, password, or credential may appear in any HTML file, any JavaScript file, or any file committed to GitHub. Key storage follows function placement: keys used by Netlify Functions and the frontend are stored as **Netlify environment variables**; keys used by Supabase Edge Functions (database-triggered arms) are stored as **Supabase Edge Function secrets** — Edge Functions cannot read Netlify environment variables. Claude Code must enforce this regardless of tier or context.

**Environment variable contract — the exact names Claude Code reads, never a value:**

| Variable name (exact) | Read by | Set where | Public or secret |
|-----------------------|---------|-----------|------------------|
| `VITE_SUPABASE_URL` | the browser (Vite bakes it in at build) | Netlify env, written by the Supabase extension | public |
| `VITE_SUPABASE_ANON_KEY` | the browser | Netlify env, written by the Supabase extension | public; its value is the **publishable** key (`sb_publishable_…`); the variable keeps its historical name |
| `SUPABASE_SERVICE_ROLE_KEY` | Netlify Functions only (the admin user-creation function) | Netlify env, written by the Supabase extension | **secret**; its value is the **secret** key (`sb_secret_…`); never `VITE_`-prefixed, never in client code; the variable keeps its historical name |
| `SUPABASE_DATABASE_URL` | server-side only, if a function needs a direct connection | Netlify env, written by the Supabase extension | secret |

No AI key, no Resend variable in Netlify (Resend lives in Supabase Auth's SMTP settings), no Turnstile (not a public tool).

> The Supabase variable names and values above are recorded from the extension's documentation and are **verified on the first live build**; if the extension writes different names or legacy values, this table, the Governor's template and supabase-setup.md are corrected in the same session. Supabase issues two key systems today. The new **publishable** and **secret** keys (`sb_publishable_…`, `sb_secret_…`) are what this tool uses. The older **anon** and **service_role** keys are a separate system that still works on projects where it is enabled and is being retired by the end of 2026. The variable names above are historical and stay as the extension writes them; what matters is the value. After connecting the extension the builder looks at the values once: `sb_` is right; `eyJ` means the legacy keys were written, and then the publishable key is pasted in by hand (it is public) while rotating the secret key is a dated handover item. If a build ever shows "Legacy API keys disabled", an old key value is in use somewhere. The Project Governor derives its environment-variable list from this table and from nothing else.

**Credentials readiness — filled during the architect interview for every active arm:**

| Credential | Status | Where to get it |
|-----------|--------|----------------|
| Supabase URL, publishable (anon) key, secret (service role) key | Written into Netlify by the Supabase extension when the site is connected (existing project: before the build) | Netlify → site → Connect (Supabase extension) |
| Resend API key + verified sending domain | Available (sustainos.io verified in Resend). Needs creating: the sending subdomain (for example mail.sustainos.io) added and verified in Resend, and the SMTP settings entered in the Supabase dashboard, before Stage 3 | Resend dashboard → Domains; Supabase dashboard → Auth → SMTP settings |
| AI API key | Not needed | — |
| Turnstile keys | Not needed (not a public tool) | — |

> Any credential marked "Needs creating" is a pre-build task for the builder — create the account before opening Claude Code. The Project Governor reads the contract above and writes the exact environment variable names and setup instructions into CLAUDE.md so Claude Code prompts for them at session start. AI and Resend keys are entered by hand as Netlify environment variables, or as Supabase Edge Function secrets for database-triggered arms — never typed into any project file. Supabase keys are never copy-pasted at all.

---

## Section 12 — Out of Scope — Phase 2

List everything this build will NOT include. Be explicit. Claude Code will not build anything listed here.

| Deferred feature | Reason it is deferred |
|-----------------|----------------------|
| Suppliers: invited by link, log in, submit projects and see their own, changes by request only, two approvals (the relevant site and the ESG lead, or the ESG lead alone when a project is not site-specific) | Next build. Decided 9 October 2026 to validate the internal tool first. It is either a supplier role in this tool or a submission tool on the same Supabase project; the Tool Architect decides at that iteration. |
| A supplier-programme / Scope 3 target that supplier projects roll into | Next build, with the suppliers. Today's targets are Scope 1 + 2 and site-based, so supplier projects would count toward nothing. |
| Integration with the environmental reporting tool for the reference figures (Scope 1 + 2, withdrawal, output, waste) | Later. Figures are entered by hand in version 1. |
| Notification emails (project submitted, decision recorded) and reminders for projects waiting too long | Backlog. Requires the email arm and a scheduled function; the register is the notification of record. |
| AI assistance (checking a submission for completeness, summarising a site's portfolio) | Backlog. Validate core tool first. |
| Change requests on Approved projects raised by sites | Backlog. In version 1 only the ESG lead changes an approved figure, with a comment. |
| File uploads (evidence documents on a project) | Not needed to validate the idea. No storage bucket in version 1. |
| Microsoft OAuth / SSO login | Handover package, upgrade path. |

---

## Section 13 — Acceptance Criteria

List the conditions that define this build as complete and ready to deploy. Claude Code reads this section and checks each item before marking any feature done. The Tool Architect derives these from the interview — the builder confirms or adds to them before signing off on the spec.

| # | What to verify | Expected result | Done? |
|---|---------------|-----------------|-------|
| 1 | Login with a magic link | A profiled email receives a link within a minute (Resend SMTP) and lands on the Overview scoped to its role; an email without a profile or with a retired profile sees "This address has no access" and reaches no data | [ ] |
| 2 | Overview, group view (ESG lead, CFO) | KPI row, three donuts, three target cards (water with two meters, waste as sites at ≥95 %), three pathway tabs render from real data; site selector and year change recalculate everything; factor set named on the emissions chart | [ ] |
| 3 | Overview, site view (site user) | Only the user's own site appears; no site selector; figures match the site's rows and its share of each target | [ ] |
| 4 | Project register | Pending approval rows first; filters apply; days waiting correct; row actions visible only to the ESG lead | [ ] |
| 5 | New project form | All validation rules in Section 8 enforced; a saved project is in Potential, version 1, with a sequential project ID, and opens on the Project page | [ ] |
| 6 | Status flow | Potential → Pending approval (Endorse, comment required) → Approved or Declined (committee decision: comment, people in the room, date required); Decline at Potential; Declined → new version in Potential (Resubmit) or Retired; Approved → Obsolete; every transition writes a decision row and history rows naming the user and the time | [ ] |
| 7 | Editing rules | A site user edits only while Potential; from Pending approval the form is locked for the site; the ESG lead's edits after Potential require a comment and appear in the history with old and new value | [ ] |
| 8 | Target logic, emissions | For a seeded site: required = 42 % of FY2024 Scope 1 + 2; covered = Σ Approved annual impact active in 2030; pending and gap as in Section 9; the bridge bars sum to the target; a project with start year 2031 contributes nothing | [ ] |
| 9 | Target logic, water | Absolute: 10 % of FY2024 withdrawal; intensity: projected 2030 = (withdrawal − savings) ÷ planned output, straight-line output; both target lines on the chart; site 1100 excluded from the group intensity | [ ] |
| 10 | Target logic, waste | Per site rate from the latest actual year; projected rate with approved and with pending; count of sites at ≥95 % correct; rate capped at 100 % and flagged | [ ] |
| 11 | Exclusions | Potential, Declined, Retired and Obsolete projects change no target figure; an Obsolete project leaves every year of the pathway; a resubmitted project is counted once | [ ] |
| 12 | Reference data | A site user edits only their own site's figures; the ESG lead edits any and the targets; a missing base-year figure excludes the site from the group sum and shows the flag | [ ] |
| 13 | Users | The ESG lead adds a user (login identity and profile created together), changes role or site, retires a user; a retired user cannot log in and still appears on their records; no delete exists anywhere | [ ] |
| 14 | CSV export | Downloads the filtered register with every column in Section 3; a site user's file holds only their site | [ ] |
| 15 | PDF review pack | Four pages as in Section 3, Ravensberg brand, footer with page numbers, figures identical to the Overview for the chosen year, estimates labelled; generated by the ESG lead and the CFO, not by a site user | [ ] |
| 16 | GDPR decision | No notice, no checkbox, no privacy page anywhere in the tool; anonymisation route works on a retired profile and its records | [ ] |
| 17 | Access refusal test (from access-matrix.md) | Every `no` and every `own` boundary tried as each named person and logged out, through the API and on the screens; refused as the matrix says; results pasted into PROGRESS.md before the access stage is deployed | [ ] |
| 18 | Deployment | Live at the Netlify URL on desktop and mobile; Supabase keys written by the extension, values start with `sb_`; no key in any file | [ ] |

> Criteria are derived from Sections 8 (views), 9 (logic), 3 (arms), 7 (GDPR), and the confirmed `access-matrix.md` (every `no` and every `own` is a refusal test, and the access stage is not deployed until each has been run as the named person). One criterion per view, one per active arm, one per critical business rule. Claude Code must not mark a feature complete without meeting its acceptance criterion.

---

## Section 14 — Build Path

**This tool's tier:** Tier 3

---

### Pre-build steps — complete these before opening Claude Code

These steps apply to all tiers. Do not open Claude Code until every applicable item is checked.

- [x] Tool Architect skill — interview complete, this spec is written and confirmed by the builder
- [ ] Tier 2/3: Access Architect, short run — the population pattern confirmed (internal only), access-matrix.md and user-stories.md in their short form, written against this spec's version. Two minutes. Every database tool has a matrix.
- [ ] Project Governor skill — CLAUDE.md and PROGRESS.md produced from this spec (and the matrix)
- [ ] GitHub repo created by the builder (new tool)
- [ ] product-spec.md uploaded to the GitHub repo root
- [ ] CLAUDE.md uploaded to the GitHub repo root
- [ ] PROGRESS.md uploaded to the GitHub repo root
- [ ] Tier 2/3: access-matrix.md and user-stories.md uploaded to the GitHub repo root
- [ ] Brand skill file (ravensberg-brand, with assets/ and templates/) uploaded to the GitHub repo root
- [ ] Netlify site connected to the GitHub repo (one-time, in the Netlify dashboard)
- [ ] Tier 2/3, EXISTING Supabase project: Supabase connected to the Netlify site with the Supabase extension (Extensions → Supabase → Install; site → Connect; pick `ravensberg-consumer-brands` and Vite); key values checked once (`sb_`)
- [ ] Resend: the sending subdomain added and verified; the SMTP settings ready to enter in the Supabase dashboard at Stage 3 — not written in any file (see Section 11)

> Claude Code moves these files into the correct folder structure (docs/, .claude/skills/) at the start of the first session and checks that every required document is there before it builds anything.

---

### Tier 3 — build in three stages, gated on state (a database; then a second screen; then someone logs in)

**Stage 1 — the database (no login yet)**
- [ ] Access Architect, short run (done in pre-build): the population pattern and the write-only matrix; the Governor seeds the login-ready columns (`profiles`, `created_by`, `status`, audit columns) so the later stages are a migration
- [ ] Open Claude Code in the project folder; First Session Setup; read product-spec.md, CLAUDE.md, PROGRESS.md, access-matrix.md
- [ ] **Supabase — existing project:** Claude Code connects to `ravensberg-consumer-brands` (ID bqyjulvljqafubusplgm), confirms it is empty, and creates docs/supabase-setup.md as it builds
- [ ] Claude Code builds all tables via Supabase MCP (every change as a named migration, saved as a file in the repo) with **RLS enabled on every table from creation** and the rules from the short matrix; seeds the seven sites and the four targets. No screen reads a real row before the full matrix exists (the first screen runs on fixture data). No Auth is configured at this stage.
- [ ] Claude Code creates docs/supabase-setup.md
- [ ] Claude Code builds the frontend (Overview and register on fixture data shaped like the real tables: the mock-up's 37 projects, the seven sites' reference figures); test locally; redeploy; push to main

**Stage 2 — the screens that show records, as an MVP on fixture data (still no login)**
- [ ] All views in Section 8 built on fixture data: list, count, filter, detail, the calculations of Section 9, both exports. **No database read, and no create, update, change-state or delete action until the full matrix exists.**
- [ ] **Access Architect, full run** — trigger: docs/supabase-setup.md exists and someone is about to log in. It extends the matrix with the three named people, ownership (a site user owns their site's rows), the states of Section 5, the actions of Section 8 and the policy plan with its mechanisms, from the real tables. Both files back to the repo.

**Stage 3 — the door, the rooms and the actions, together**
- [ ] Governor in Iteration Mode reads user-stories.md and access-matrix.md; CLAUDE.md gains the five hard rules and the Auth settings; PROGRESS.md gains ONE access phase
- [ ] Claude Code, in one build: configures Auth as built in Section 6 (magic link; sign-ups off; custom SMTP entered by the builder in the dashboard), adds the role and ownership schema, seeds the three named people as profiles by email with the trigger that links each new identity to its profile (`auth_user_id`), builds every line of the policy plan with the mechanism it names (policies; the column trigger; the narrow functions for change-state, decisions and anonymise, each under the function contract in CLAUDE.md; the admin user-creation function), switches every screen from its fixture file to reading as the signed-in user, and gives each screen its actions exactly as the stories describe
- [ ] The ESG lead creates the named users on the Users screen; each logs in with a magic link
- [ ] **Gate, before deploying this stage, two halves:** Claude Code tries every `no` cell and one `own` boundary per role through the API as each named person and logged out, and pastes the results into PROGRESS.md; then log in as each named person on the screens; every `no` in the matrix is refused, every `own` returns only their rows; the screen shows real data only when signed in
- [ ] Push to main → Netlify auto-deploys
- [ ] Optional post-build: run Supabase QA skill to verify schema, RLS, and auth configuration
- [ ] Handover: both access files go into the package unchanged

---

## Section 15 — Open Questions

List anything that remains unresolved. Tag who needs to answer it before or during the build session.

| Question | Who answers it | Blocking? |
|----------|---------------|-----------|
| Which site does the first site user (Zee) belong to? The spec assumes 1200 Werk Paderborn. | Builder | Yes — before the Access Architect's full run |
| The Resend sending subdomain (name, for example mail.sustainos.io) and the SMTP settings in the Supabase dashboard. | Builder | Yes — before Stage 3 |
| The Free plan pauses the project after about a week unused: confirm it is active, or on Pro, the week of the three workshop sessions. | Builder | Yes — before the workshop |
| The absolute water target (−10 % withdrawal by 2030 vs FY2024) is new to the Ravensberg canon; write it into company-profile.md (change the company fact first, then the use cases). | Builder | No |
| The demo data: the seven sites' FY2024 reference figures, planned 2030 output, latest waste tonnages, and the 37 mock projects. The mock-up holds the project list and the group figures; the per-site FY2024 figures do not exist yet and are made up by the builder (or taken from the environmental reporting use case's baseline file if it has them). | Builder, with Claude Code from the environmental-reporting data if available | No — needed for the fixture file at Stage 1 |
| PDF rendering library for the review pack, in the browser. | Claude Code | No |
| Kept for a real deployment, not built: the data notice drafted in the interview — "Ravensberg Consumer Brands, Group Sustainability, stores the projects you register and the name of each project owner to track reduction projects against the group's 2030 targets, on the basis of the company's legitimate interest in managing its environmental programme. Records are kept for as long as the tool is in use; nothing is deleted, projects are retired. Data is held on Supabase (EU region) and served by Netlify. To see, correct or delete your data, contact Group Sustainability. You can complain to your data protection authority." | Builder, only if the tool ever leaves the demo | No |

---

## Section 16 — Tool Version History

> This section tracks changes to the tool being built — not to this template. Each row represents a build session that changed what the tool does, how it works, or how it is structured. See the Template Changelog at the bottom of this document for changes to the template itself.

Bump the version whenever the spec changes: new arm added, access model changes, tier changes, new views added, logic updated. Small bug fixes and UI polish do not require a version bump. The version counts this tool's own iterations and nothing else: it is not tied to a cohort week, and a builder may run many iterations of the first logic before adding a database or a second screen.

| Version | Date | What changed in the tool |
|---------|------|--------------------------|
| v1.0 | 9 October 2026 | Initial build |
| v1.1 | 9 October 2026 | PDF review pack moved from a Netlify Function to the browser (framework rule: exports are browser only); the secret key's only use is the admin user-creation function. Decided with the Project Governor. |

---

*This spec is written for Claude Code. It assumes zero prior context. Every decision, rule, and requirement must be explicit enough that the builder can hand this document to Claude Code without a single verbal explanation.*
