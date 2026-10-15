# Access Matrix — Ravensberg Project Tracker

**Written against:** product-spec.md v1.3 · supabase-setup.md as of 10 October 2026
**Population pattern:** P2 internal only
**Date:** 9 October 2026 (full run; the short run of the same date is extended here, never replaced)
**Iteration:** 11 October 2026, the approval presentation (spec v1.3, builder decision): the storage bucket rows in Section 1, two project rows, the v1.3 delta in Section 5, lines 50 to 62 of the policy plan, rule 6 in Section 7. Extended, not replaced.
**Checked against spec v1.4** (14 October 2026, growth to 2030): no role, table, column, action or rule changes; the 2030 plan row's existing figure columns carry a site's planned business-as-usual figures under the existing create and update rules (lines 29 to 31). This matrix holds unchanged.
**Author:** Zyad Hatquai
**Status:** Confirmed
**Companion file:** user-stories.md

> The source of truth for who may do what. The Project Governor lifts Section 7 into
> CLAUDE.md. Claude Code builds the login and every line of Section 6 with the mechanism
> that line names (an RLS policy, a trigger, a narrow function, a storage policy on the
> bucket, or the screen) in the same pass. The screen test as each named person triggers every `no` and every `own` in
> Section 1. The handover ships this file unchanged. Section 6 of product-spec.md points
> here from v1.2 on and holds no grid of its own.
>
> Every cell names a real table and one of the seven actions. A screen or route is never a
> cell; screen refusals live in user-stories.md and are enforced through the tables behind
> the screen. Export never exceeds read.
>
> **Short-run line, kept as written:** P2, internal only. No anon access to any table, now or
> later: `anon` has no policy and no table grant on any table (every table in
> supabase-setup.md and any table added later). There is no `anon` column; the pattern is
> final.

---

## 1. The matrix

Legend: `yes` = all rows · `own` = rows the role owns (definition in Section 2) · `no` =
refused, in the database, not only in the screen · `—` = not applicable to this table ·
`function` = allowed only through the narrow function named in Section 6, never as a direct
write.

Roles across: **site user** (Zee) · **CFO** (Sam) · **ESG lead** (Zyad Hatquai; the role is
the admin, Section 3) · **anon** (nobody: P2).

Actions are always these seven, in this order: create, read, update, change state, delete,
export, maintain lists. Where one action has more than one shape for this tool (a site
project and a group project; one transition per target state) each shape has its own row.

### projects (main record: one row = one project version)

| Action | site user | CFO | ESG lead (admin) | anon |
|---|---|---|---|---|
| create (a site project: scope `site`, own site, status Potential, version 1) | own | no | no | no |
| create (a group project: scope `group`, no site, status Potential, version 1) | no | no | yes | no |
| create (resubmit: version n+1 in Potential from a Declined version, same project code) | own | no | own (group projects) | no |
| read | own | yes | yes | no |
| update (while Potential: title, description, total and annual impact, start year, capex, opex, owner; never status, site, scope, version, code, predecessor, submitter or the audit columns) | own | no | own (group projects) | no |
| update (figures while Pending approval, comment required) | no | no | function | no |
| update (presentation, v1.3: the file name, uploader and time on the row when the owner attaches or replaces the file; while Potential only, on a version that requires a presentation) | own | no | own (group projects) | no |
| update (Approved, Declined, Retired, Obsolete: the final states; the presentation columns also while Pending approval) | no | no | no | no |
| change state → Pending approval (endorse, comment; v1.3: refused while a version that requires a presentation has none) | no | no | function | no |
| change state → Declined (ESG lead declines at Potential or Pending approval, comment) | no | no | function | no |
| change state → Approved or Declined (committee decision: comment, people in the room, date) | no | no | function | no |
| change state → Obsolete (withdraw an Approved version, comment) | no | no | function | no |
| change state → re-approval (version n+1 in Potential, this Approved version Obsolete, comment) | no | no | function | no |
| change state → Approved (reinstate an Obsolete version, comment, only while no newer version exists) | no | no | function | no |
| change state → Retired (a Declined version, comment) | own (function) | no | own (group projects, function) | no |
| anonymise (GDPR: `owner_name` replaced; row, status and figures kept; logged) | no | no | function | no |
| delete | no | no | no | no |
| export (CSV of the register as filtered; never wider than read) | own | yes | yes | no |
| export (PDF review pack: same figures as the Overview) | no | yes | yes | no |

Obsolete (withdraw), reinstate and anonymise are the only three transitions allowed on a
final row, and they touch status or a personal field, never the business content. A change
to an Approved project is a re-approval: a new version goes through endorsement and the
committee from the start, and the approved version becomes Obsolete, so the project counts in
no target figure until approved again.

### decisions (one row = one decision taken on a project)

| Action | site user | CFO | ESG lead (admin) | anon |
|---|---|---|---|---|
| create | no | no | function only (the transition functions write the row; no direct insert for anyone) | no |
| read | own (decisions on own site's projects) | yes | yes | no |
| update | no | no | no | no |
| change state | — | — | — (status stays `active` in version 1; a wrong decision is corrected by the next transition, with its comment) | — |
| anonymise (GDPR: a name in `attendees` replaced; logged) | no | no | function | no |
| delete | no | no | no | no |
| export (in the PDF review pack) | no | yes | yes | no |

### reference_figures (one row = one site's, or the group's, figures for one year and kind)

| Action | site user | CFO | ESG lead (admin) | anon |
|---|---|---|---|---|
| create (a site row: own site, year, kind actual or plan) | own | no | yes | no |
| create (a group row: no site) | no | no | yes | no |
| read | own | yes | yes | no |
| update (the figures; never site, year, kind, submitter or the audit columns) | own | no | yes | no |
| change state | — | — | — (no final state; status stays `active`) | — |
| delete | no | no | no | no |
| export (shown on Reference data; derived figures in the PDF) | own | yes | yes | no |

### profiles (one row = one user)

| Action | site user | CFO | ESG lead (admin) | anon |
|---|---|---|---|---|
| read | own site's profiles plus the ESG lead's (the people who appear on the site's rows) | yes | yes | no |
| create (login identity and profile together) | no | no | admin function only | no |
| update (`role`, `site_id`) | no | no | admin function only; never the caller's own row | no |
| update (`retired_at`, `retired_comment`: retire, comment required) | no | no | admin function only; never the caller's own row | no |
| update (`name`, `email`) | no | no | admin function only | no |
| update (`auth_user_id`) | no | no | no in the app: the link trigger sets it once, when the login identity with that email is created | no |
| anonymise (GDPR: `name` and `email` replaced by "retired user", profile retired; logged) | no | no | function | no |
| delete | no | no | no (the platform owner deletes the login identity in the Supabase dashboard; the profile stays) | no |

The admin column carries exactly the four admin actions (users · lists · obsolete, reinstate
and anonymise · read all) on top of the ESG lead's business role. There is no `is_admin`
flag: the role `esg_lead` is the admin (spec §5, Governor's build decision).

### lookup tables (sites, targets)

| Action | site user | CFO | ESG lead (admin) | anon |
|---|---|---|---|---|
| read (active rows, for new choices) | yes | yes | yes | no |
| read (a deactivated row an existing record references) | yes | yes | yes | no |
| create (a site; a target category) | no | no | yes | no |
| update (sites: `name`, `city`, `type`; `code` never) | no | no | only while no project or figure references the site | no |
| update (targets: `value`, `base_year`, `target_year`; `category` never) | no | no | yes | no |
| deactivate (`active = false`) | no | no | yes | no |
| delete | no | no | no | no |

### history tables (project_history, reference_figures_history)

| Action | site user | CFO | ESG lead (admin) | anon |
|---|---|---|---|---|
| read | follows the parent row (own site) | yes | yes | no |
| write | trigger only | trigger only | trigger only | no |

### storage buckets

One bucket from v1.3 (spec §5): `presentations`, private, one object per project version under
the key `<project id>/presentation.pptx`, PowerPoint only (the `.pptx` extension and its MIME
type), at most 20 MB, read through signed URLs only. An object belongs to the project version
in its folder (Section 2), so every row below follows the project.

| Action | site user | CFO | ESG lead (admin) | anon |
|---|---|---|---|---|
| upload (the presentation of a version I own, while it is Potential and requires one) | own | no | own (group projects) | no |
| replace (overwrite the same key; same conditions as upload) | own | no | own (group projects) | no |
| read (download through a signed URL valid for 60 seconds; follows the project read) | own | yes | yes | no |
| update (anything else: move, copy, metadata) | no | no | no | no |
| delete | no | no | no | no |
| public URL | none: the bucket is private | none | none | none |
| templates (the three `.pptx` files under `/templates/` on the site; static files, not bucket objects, no data in them) | yes | yes | yes | reachable by URL without a login, as every static file of the site is; accepted by the builder because the templates hold no data |

From Pending approval on the file is frozen for everyone, the ESG lead included: upload and
replace require Potential. A version that existed before v1.3, and every demo row the reset
ingests, carries no file and accepts none (`presentation_required` false). Nobody deletes a
file through the app; the platform owner empties the bucket in the Supabase dashboard before a
workshop, as the runbook in docs/demo-portfolio.md says.

---

## 2. Ownership

One sentence per record table. This sentence is the `own` value above and the `USING`
clause of every scoped policy when the rules go on.

- **projects**: a row belongs to the site in `site_id`; a site user owns a row when their profile's `site_id` matches, whoever submitted it. A group row (`site_id` empty, scope `group`) belongs to no site; the ESG lead owns it. Ownership never changes: a project never moves site, and every version keeps the site of the first.
- **decisions**: a row belongs to its project; whoever may read the project may read its decisions.
- **reference_figures**: a row belongs to the site in `site_id`; a group row (`site_id` empty) belongs to the ESG lead.
- **profiles**: for reading, a row belongs to the site in `site_id`; for writing, to nobody: only the admin function changes a profile, and never the caller's own.
- **project_history, reference_figures_history**: a row follows its parent row.
- **presentations (bucket)**: an object belongs to the project version named by its folder; whoever may read the project may read the object; the owner of the version (the site for a site project, the ESG lead for a group project) uploads and replaces it while the version is Potential and requires a presentation. The object never moves to another version: a new version starts without one.

"Me" in every policy is the profile whose `auth_user_id` is the signed-in identity and whose
`retired_at` is empty. A login with no profile, or with a retired one, is nobody.

---

## 3. The people

| Role | Named first holder | Layer | Screens |
|---|---|---|---|
| site user | Zee, z.hatquai@gmail.com, site 1200 Werk Paderborn | business | Login, Overview (own site, no selector), Project register, Project page, New project form, Reference data, CSV dialog |
| CFO | Sam, sustainatrend@gmail.com | business | Login, Overview (group and every site), Project register, Project page, Reference data (read), CSV and PDF dialogs |
| ESG lead (admin) | Zyad Hatquai, z.hatquai@sustainos.io | business role that carries the admin actions (`profiles.role = esg_lead`) | everything, including Users |
| platform owner | Zyad Hatquai (personal accounts) | outside the app | Supabase, Netlify, Resend, GitHub |

Admin actions, fixed: add users, change role or site, retire users (through the admin
function) · maintain the sites and targets lists · mark Obsolete, reinstate, anonymise · read
everything. The ESG lead is not exempt from Section 7 rule 3: an Approved, Retired or
Obsolete version is never edited in place, by anyone.

Standalone tool, one database, one matrix. If a later Ravensberg tool joins the same Supabase
project (spec §2), this matrix is extended, not replaced.

---

## 4. Exceptions (column-level, not built at the access stage)

| Column | Hidden from | Why | Fix (later list) |
|---|---|---|---|
| none | | | |

Row-Level Security cannot hide a column. A site user who may read a colleague's profile row
(own site plus the ESG lead) reads its email too; the read scope in Section 1 is what limits
it. If emails are ever to be hidden from site users, the fix is a view without the column,
on the later list.

---

## 5. Schema delta (what the access stage adds to supabase-setup.md, in one pass with the login)

Claude Code adds these in the same build that puts the login on and enforces the rules. The
seven tables, their audit columns, `profiles` with `auth_user_id`, `project_history` and
its trigger already exist (supabase-setup.md), so the delta is small. Nothing here is a
rebuild.

| Table | Add | Why |
|---|---|---|
| profiles | `retired_comment` text (required by the admin function when it retires a user). The link trigger: on each new login identity, the profile whose `email` matches (lower-cased) gets its `auth_user_id`; an identity with no matching profile reaches nothing, because every policy finds the caller through their profile. Deleting the login identity never touches the profile or the records; a login re-created with the same email links to the same profile again. | the people, and how a login finds its person |
| projects | nothing new. A column trigger refuses, outside the transition functions, every write to `status`, `version`, `project_code`, `supersedes_project_id`, `scope`, `site_id`, `created_by`, `created_at`, `updated_by`, `updated_at`, and sets `created_by` / `updated_by` to the caller's profile. | ownership and state stay with the functions |
| reference_figures | `reference_figures_history` (id, reference_figure_id, field, old_value, new_value, changed_by, changed_at), written by a trigger on every insert and update, like `project_history`. A column trigger refuses writes to `site_id`, `year`, `kind`, `created_by` and the audit columns and sets the `*_by` columns. | "every change is logged with user and time" (spec §8), criterion 12 |
| decisions | nothing new; written by the transition functions only (no insert or update policy for anyone). | decisions are frozen on creation |
| sites, targets | nothing new. A trigger refuses a change to `sites.code` and to `targets.category`, and refuses renaming a site that a project or a figure references (deactivate and replace instead). | lists someone maintains |
| helpers | `current_profile_id()` (the caller's active profile), `is_esg_lead()`, `is_cfo()`, `my_site_id()`; every policy checks them first. | one place where "me" is defined |
| narrow functions | `endorse_project`, `decline_project`, `record_committee_decision`, `mark_project_obsolete`, `reapprove_project`, `resubmit_project`, `retire_project`, `reinstate_project`, `edit_project_figures`, `anonymise_person`. Each: one row, one transition, a comment where Section 1 requires it, the decision row and the history rows written inside the same call, under the function contract in CLAUDE.md (definer, `search_path = ''`, checks the caller's identity, active profile and role before anything else; execute granted to authenticated only). | change state, comment-bearing edits and anonymisation never happen as a free write |
| admin Netlify Function | `admin-users` with the secret key: verifies the caller's session is an active ESG lead, then one change per call: create (Auth user with sign-ups off + profile, by email, role, site), change role or site, retire (comment, `retired_at`, and the login banned). Refuses a change to the caller's own row. Returns only the profile fields the Users screen shows. | the four admin actions on users; the secret key never reaches the browser |
| Auth | Supabase Auth, magic link only: "Enable sign-ups" off, email provider on, custom SMTP (Resend) entered by the builder in the dashboard. No password exists, so there is no Change password screen. | the door, built with the rules |

Seed: the three named people exist already as profiles by email (migration `create_profiles`);
nothing to add. The demo portfolio (reference figures, the 37 projects, their decisions and
history) moves from the fixture files into the real tables in the same phase, by a seed
migration or a data fix, so the deployed tool shows the demo data to the named people.

### v1.3 delta (11 October 2026): the approval presentation

Added by named migrations after the access phase; nothing here is a rebuild. Every line of
the policy plan (50 to 62) is built with the mechanism it names.

| Object | Add | Why |
|---|---|---|
| projects | `presentation_file_name` text (the uploaded file's name as shown on the Project page; the object key is always `<id>/presentation.pptx`), `presentation_uploaded_by` uuid → profiles, `presentation_uploaded_at` timestamptz, `presentation_required` boolean not null default true; a check that the file name ends in `.pptx` and that name, uploader and time are set together. The migration sets `presentation_required = false` on every version that exists when it runs. The column trigger (`projects_protect`): the owner may write the file name while the version is Potential and requires a presentation, and only when an object exists under the key; the trigger sets the uploader to the caller's profile and the time to now; it refuses `presentation_required` and the uploader columns from every session; from Pending approval on every presentation column is refused, for the ESG lead too (`edit_project_figures` never touches them). | the record of the file, and its freeze |
| project_history | the history trigger (`projects_write_history`) writes a row with field `presentation`, the previous and the new file name, the uploader and the time, on every change of the file name. | "every upload and replacement is a history row" |
| storage: bucket `presentations` | `public = false`, `file_size_limit` 20971520, `allowed_mime_types` = `application/vnd.openxmlformats-officedocument.presentationml.presentation`. Policies on `storage.objects` for `bucket_id = 'presentations'`: SELECT where the object's folder is a project the caller may read (the projects read policy applies inside the subquery); INSERT and UPDATE where the key is `<project id>/presentation.pptx` and the project is the caller's own version (site user: `site_id` = my site; ESG lead: scope `group`), is Potential and requires a presentation; no DELETE policy; no policy for `anon`. The signed URL is created by the screen with the caller's session, so the SELECT policy bounds it. | the file, and who reaches it |
| endorse_project | refuses when the version requires a presentation and the file name is empty or no object exists under the key ("A presentation is required before endorsement"). | "endorsement refused in the database" |
| resubmit_project, reapprove_project | the new version is created with `presentation_required = true` and the presentation columns empty; the previous version keeps its file. | a new version needs its own deck |
| supabase/demo-reset.sql | ingests the 38 demo rows with `presentation_required = false`; it does not touch the bucket (plain data statements only). The runbook in docs/demo-portfolio.md tells the platform owner to empty the bucket in the dashboard before a workshop: the files of the deleted workshop projects are unreachable by then (no project row, so no policy reaches them) and are removed there. | the demo stays exempt |
| screens | New project form: the "Approval presentation" block (three template downloads, the chosen category highlighted) and the required file field; Project page: the presentation section with Download, Replace or Attach. No other screen changes; the CSV and the review pack are unchanged. | spec §8 |

---

## 6. Policy plan (login and rules together; one line per `own` and per `no`)

Written in words. Claude Code writes the SQL. Every line names its **mechanism** from the
fixed mapping in the skill (policy / trigger / function / screen) and has the test that
proves it. Nothing here replaces anything: before this stage no screen read a real row (every
screen ran on fixture data), so these lines are added to a database that has carried only
the short-run `anon` rule.

| # | Table | Action | Role | Rule in words | Mechanism | Screen test |
|---|---|---|---|---|---|---|
| 1 | every table | any | anon | nothing: no policy and no table grant on any table (short run, kept) | none (default deny) | a logged-out request through the API returns a permission error on every table, not an empty list; the login screen is the only page |
| 2 | every table | any | a login with no profile, or a retired profile | nothing: every policy finds the caller through `profiles.auth_user_id` with `retired_at` empty; no profile, no rows | policy condition (`current_profile_id()`), in every policy | an email with no profile, or Dirk Sauer's retired one, requests a link, lands on "This address has no access", and every API read is refused |
| 3 | projects | read | site user | rows whose `site_id` is my site; group rows are not among them | policy (SELECT) | Zee sees 1200's projects only; a 1000 row and a group row are not returned |
| 4 | projects | read | CFO, ESG lead | all rows | policy (SELECT) | Sam and Zyad see every row, the group view and the site selector |
| 5 | projects | create (site project) | site user | insert only with scope `site`, `site_id` = my site, status Potential, version 1, no predecessor, unit by category; `created_by` set to me by the trigger | policy (INSERT, WITH CHECK) + column trigger | Zee registers a project for 1200 and the Project page opens in Potential; an insert naming site 1000, scope `group` or status Approved is refused |
| 6 | projects | create (group project) | ESG lead | insert only with scope `group`, no site, status Potential, version 1 | policy (INSERT, WITH CHECK) + column trigger | Zyad registers a group project; an insert with a site is refused |
| 7 | projects | create | CFO | no policy | none | Sam has no form; a direct insert is refused |
| 8 | projects | update (while Potential) | site user | own rows while status is Potential, the content columns only; status, site, scope, version, code, predecessor, submitter and audit columns refused | policy (UPDATE) + column trigger | Zee edits a Potential 1200 project and the history shows old and new; once it is Pending approval the form is locked and a direct update is refused; writing `status` directly is refused |
| 9 | projects | update (while Potential) | ESG lead | own group rows while Potential, content columns only | policy (UPDATE) + column trigger | Zyad edits his Potential group project; editing a site's Potential project directly is refused |
| 10 | projects | update (figures while Pending approval) | ESG lead | `edit_project_figures(project, changes, comment)`: Pending approval only, comment required; the history rows carry the comment | function | Zyad corrects the annual impact of a Pending approval project with a comment; the history shows old, new and comment; without a comment, or on an Approved project, refused |
| 11 | projects | update (final states) | everyone | no update policy matches an Approved, Declined, Retired or Obsolete row; `status` is never written directly | policy (no match) + column trigger | Zyad opens an Approved project: every field read-only; a direct update returns a permission error |
| 12 | projects | change state → Pending approval | ESG lead | `endorse_project(project, comment)`: Potential only; writes the endorsement decision, the status and the history row in one call | function | Zyad endorses a Potential project; the register shows it Pending approval with days waiting from today; endorsing it again is refused |
| 13 | projects | change state → Declined | ESG lead | `decline_project(project, comment)`: Potential or Pending approval; writes a decline decision | function | Zyad declines; the project shows Declined with the comment; declining an Approved project is refused |
| 14 | projects | change state → Approved / Declined | ESG lead | `record_committee_decision(project, outcome, comment, attendees, date)`: Pending approval only; people in the room and date required | function | Zyad records Approved; the Overview's covered figure rises by the annual impact; a call without attendees is refused |
| 15 | projects | change state → Obsolete | ESG lead | `mark_project_obsolete(project, comment)`: Approved only | function | Zyad marks Approved → Obsolete; the project leaves every year of the pathway; the row stays visible |
| 16 | projects | change state → re-approval | ESG lead | `reapprove_project(project, comment)`: Approved only; creates version n+1 in Potential (same code, pre-filled, the site kept) and marks this version Obsolete with the comment, in one call | function | Zyad re-approves; the new version is Potential and the old one Obsolete; the covered figure drops at once; the site user can edit the new version while Potential |
| 17 | projects | create (resubmit) | site user / ESG lead (group) | `resubmit_project(project)`: Declined only, own, no newer version; creates version n+1 in Potential, pre-filled | function | Zee resubmits a Declined 1200 project and gets v2 in Potential; resubmitting a 1000 project, or the same project twice, is refused |
| 18 | projects | change state → Retired | site user / ESG lead (group) | `retire_project(project, comment)`: Declined only, own | function | Zee retires a Declined 1200 project with a comment; retiring an Approved one is refused |
| 19 | projects | change state → Approved (reinstate) | ESG lead | `reinstate_project(project, comment)`: Obsolete only, no newer version | function | Zyad reinstates an Obsolete project; it counts again; reinstating one that has a newer version is refused |
| 20 | projects | anonymise | ESG lead | `anonymise_person(profile, name)`: replaces the name in `owner_name` on every project, in `attendees` on every decision, and `name`/`email` on the profile (retired) by "retired user"; writes history rows; status and figures kept | function | the project keeps its figures and status; the owner reads "retired user"; the history logs the action; Sam cannot call it |
| 21 | projects | delete | everyone | no policy; the DELETE grant is revoked | none | no delete works from any account |
| 22 | decisions | read | site user | decisions whose project is on my site | policy (SELECT through projects) | Zee sees the decisions on 1200's projects; a decision on a 1000 project is not returned |
| 23 | decisions | read | CFO, ESG lead | all rows | policy (SELECT) | Sam reads every decision on every Project page |
| 24 | decisions | create / update / delete | everyone | no policy; rows are written only inside the transition functions | none + functions | a direct insert by Zyad is refused; endorsing on the screen writes exactly one row |
| 25 | project_history | read | site user / CFO / ESG lead | follows the project read (lines 3 and 4) | policy (SELECT through projects) | Zee reads the history of a 1200 project; a 1000 project's history is not returned |
| 26 | project_history | write | everyone | no policy; the trigger writes it | none + trigger | a direct insert is refused; every edit and transition adds its rows |
| 27 | reference_figures | read | site user | rows whose `site_id` is my site | policy (SELECT) | Zee sees 1200's figures only; the Reference data screen shows one site |
| 28 | reference_figures | read | CFO, ESG lead | all rows | policy (SELECT) | Sam and Zyad see all seven sites |
| 29 | reference_figures | create | site user | a site row for my site; `created_by` set by the trigger | policy (INSERT, WITH CHECK) + column trigger | Zee enters 1200's FY2026 actuals; an insert for site 1000 or a group row is refused |
| 30 | reference_figures | create / update | ESG lead | any site row or group row; the figures only on update | policy (INSERT, UPDATE) + column trigger | Zyad enters a 2030 plan for 1500; the estimate label on the Overview disappears |
| 31 | reference_figures | update | site user | own site rows, the figure columns only; site, year, kind, submitter and audit columns refused | policy (UPDATE) + column trigger | Zee corrects 1200's withdrawal; the history shows old and new; changing the year is refused |
| 32 | reference_figures | create / update / delete | CFO | no policy | none | Sam's Reference data is read-only; a direct write is refused |
| 33 | reference_figures | delete | everyone | no policy | none | no delete works |
| 34 | reference_figures_history | read / write | everyone | read follows the figure (lines 27, 28); write by trigger only | policy (SELECT through reference_figures) + trigger | Zee sees who changed 1200's figures and when; a direct insert is refused |
| 35 | profiles | read | site user | rows whose `site_id` is my site, plus every `esg_lead` row | policy (SELECT) | Zee sees the names on 1200's rows and Zyad's; the profile of a 1000 user is not returned |
| 36 | profiles | read | CFO, ESG lead | all rows | policy (SELECT) | Zyad opens Users and sees every profile; Sam sees every submitter's name |
| 37 | profiles | create / update | everyone, through the API | no policy; a trigger refuses every direct write to `role`, `site_id`, `retired_at`, `retired_comment`, `name`, `email`, `auth_user_id` | none + column trigger | Zee's direct update of her own role returns a permission error; Zyad's direct update of Sam's role is refused too |
| 38 | profiles | create / update (role, site) / retire | ESG lead | the admin Netlify Function `admin-users` (secret key): checks the caller's session is an active ESG lead, one change per call, comment on retire, never the caller's own row; creates the login identity and the profile together | function (server, secret key) | Zyad adds a user on the Users screen, changes a site, retires a user with a comment; the retired user's next link request is refused and their name stays on their records; Zyad changing his own role is refused |
| 39 | profiles | link | the login | on a new login identity, `auth_user_id` is set on the profile with that email; otherwise nothing | trigger | Zee's first magic link links her profile; an unknown email gets no profile and reaches nothing |
| 40 | profiles | anonymise | ESG lead | `anonymise_person` (line 20) | function | the retired profile reads "retired user"; its rows keep their timestamps |
| 41 | sites, targets | read | every active profile | all rows; the form offers active rows only | policy (SELECT) + screen | Zee's register shows a deactivated site's name on an old project; the form does not offer it |
| 42 | sites, targets | create / update / deactivate | ESG lead | insert and update allowed; `sites.code` and `targets.category` never change; renaming a site a project or a figure references is refused; deactivate is a normal update; a target change carries its reason in `targets.change_comment`, refused without one (builder decision at half B, 9 Oct 2026) | policy (INSERT, UPDATE) + trigger | Zyad changes a target value with a reason and the Overview recalculates; without a reason it is refused; renaming 1200 is refused while projects reference it; deactivating works |
| 43 | sites, targets | write | site user, CFO | no policy | none | Zee cannot edit the targets block; a direct update is refused |
| 44 | sites, targets | delete | everyone | no policy | none | no delete works |
| 45 | projects | export (CSV) | site user / CFO / ESG lead | the screen, bounded by the read policy: a site user's file holds only their site | screen | Zee's CSV holds 1200's rows only; Sam's holds every row |
| 46 | projects | export (PDF) | CFO, ESG lead | the screen: the button and the generator exist for the CFO and the ESG lead only; the data behind it is what each may read | screen | Zee has no PDF button; Sam and Zyad generate the four pages |
| 47 | profiles | the Users screen | site user, CFO | the route is hidden and refuses them; the table rules (lines 35 to 38) hold behind it | screen + lines 35 to 38 | Sam opening /users is sent to the Overview; Zee likewise |
| 48 | projects | the New project form | CFO | the route refuses the CFO; line 7 holds behind it | screen + line 7 | Sam has no Register button and /projects/new sends him back |
| 49 | profiles | login | every named person | magic link, sign-ups off; no password, so no Change password screen | Supabase Auth | Zee, Sam and Zyad each receive a link and land on the Overview scoped to their role |
| 50 | presentations (bucket) | upload | site user / ESG lead (group) | insert into the bucket only under the key `<project id>/presentation.pptx` where the project is a version I own (a site user: `site_id` = my site; the ESG lead: scope `group`), its status is Potential and it requires a presentation; the bucket itself refuses every type but the PowerPoint MIME type and every file over 20 MB | storage policy (INSERT on storage.objects, WITH CHECK) + bucket limits (`allowed_mime_types`, `file_size_limit`) | Zee attaches a .pptx to her new 1200 project; an upload under a 1000 project's id, a group project's id or a Pending approval project's id, a .pdf, or a 25 MB file is refused |
| 51 | presentations (bucket) | replace | site user / ESG lead (group) | overwrite the same key under the same conditions as line 50 (an upload with upsert is an update of the object row) | storage policy (UPDATE on storage.objects, USING + WITH CHECK) | Zee replaces the file of her Potential project; once it is Pending approval the button is gone and a direct overwrite is refused, for Zyad too |
| 52 | presentations (bucket) | read (download) | site user / CFO / ESG lead | the object whose folder is a project I may read (lines 3 and 4: the projects read policy applies inside the storage policy); the screen asks for a signed URL valid for 60 seconds and the browser saves the file under its original name | storage policy (SELECT on storage.objects through projects) + screen (signed URL) | Zee downloads the file of a 1200 project; a signed URL for a 1000 project's file is refused; Sam and Zyad download any |
| 53 | presentations (bucket) | any | anon | no policy; the bucket is private, so no public URL exists | none (default deny) + bucket private | a logged-out request for any object, and the public URL of any object, returns an error |
| 54 | presentations (bucket) | upload / replace | CFO | no policy | none | Sam has no file field and no Replace button; a direct upload is refused |
| 55 | presentations (bucket) | delete | everyone | no policy | none | no delete works from any account; a replacement overwrites, it never deletes |
| 56 | projects | update (presentation columns) | site user / ESG lead (group) | the owner records the file name on the row while Potential (lines 8 and 9 carry the update); the column trigger sets `presentation_uploaded_by` to me and `presentation_uploaded_at` to now whenever the file name changes, refuses a file name when no object exists under the key, refuses the presentation columns on a version that does not require a presentation or is not Potential, and refuses `presentation_required` and the uploader columns from every session | policy (UPDATE, lines 8 and 9) + column trigger | Zee's upload records the file name, Zee and the time; writing `presentation_uploaded_by` or `presentation_required` directly, or a file name on a Pending approval row, is refused |
| 57 | projects | change state → Pending approval | ESG lead | `endorse_project` (line 12) refuses a version that requires a presentation and has none: the file name empty, or no object under the key | function | Zyad endorses a v1.3 project without a presentation: refused with "A presentation is required before endorsement"; a version from before the rule is endorsed as before |
| 58 | project_history | write (presentation) | everyone | the history trigger writes a row with field `presentation`, the previous and the new file name, the uploader and the time, on every upload and replacement | trigger | after an upload the history shows presentation: (none) → the file name, Zee, now; after a replacement the old and the new name |
| 59 | projects | create (resubmit) / change state → re-approval | site user / ESG lead | `resubmit_project` and `reapprove_project` (lines 16 and 17) create version n+1 with `presentation_required` true and no file; the previous version keeps its own | function | Zee resubmits a Declined 1200 project: v2 shows "No presentation yet" and Attach; Zyad's re-approval likewise; the Declined or Obsolete version still shows its file |
| 60 | projects | exempt versions | everyone | every version that exists when the v1.3 migration runs, and every demo row the reset script ingests, has `presentation_required` false: no file can be attached (lines 50, 51 and 56 refuse) and the Project page shows "No presentation (registered before the rule)" | data (migration + reset script) + lines 50, 51, 56 | PRJ-0034 shows the line and no file field; endorsing it works; an upload under its id is refused |
| 61 | projects | the New project form | site user / ESG lead | the form refuses to submit without a file, with a file that is not .pptx, or with a file over 20 MB, inline; the row is saved first (its id is the folder), then the file is uploaded, then the file name is recorded; if the upload fails the project exists in Potential without a presentation and the Project page offers Attach | screen + lines 50, 56, 57 | Zee submits without a file: "Attach the approval presentation (.pptx, max 20 MB)"; with a .pdf the same line; with a valid file the Project page shows it with her name and the time |
| 62 | templates | download | every signed-in user | the three templates are static files of the site under `/templates/`, linked from the form only; not in the bucket, not in any table. A static file on Netlify is reachable by its URL without a login; the builder accepts this because the templates hold no data | screen (static files) | Zee, Sam and Zyad download each template from the form; the chosen category's template is highlighted |

Default deny applies to every table: where no line above says yes, the answer is nothing.
`current_profile_id()` is the one helper every policy checks first; it is empty for a login
without a profile or with a retired one, so a leaver is refused by the rules even while an
old session lives. `is_esg_lead()` widens read, the lookup writes and the functions, and
nothing else.

**The gate.** The refusal test has two halves, and both are recorded in PROGRESS.md before
the access stage is deployed. **Half A (Claude Code, during the access phase):** every `no`
cell and one `own` boundary per role attempted through the API (REST and RPC) as each named
person's session and as a logged-out visitor, with the result pasted into PROGRESS.md under
"Refusal test record". No saved script, no test-credential file: the attempts are made in
the session and the record is the evidence. **Half B (the named people):** every test in this
table, run as the named person on the screen. Any later change to a rule re-runs both halves
before the push. The v1.3 lines (50 to 62) are part of the gate: half A through the API as
Zee, Sam, Zyad and logged out, half B on the screens as the three people, before the merge.

---

## 7. Hard rules for CLAUDE.md (the Governor lifts these verbatim)

1. The refusal happens in the database, or in a server function that holds the secret key
   and checks every request itself; never only in the screen. A hidden button is not a rule.
   RLS is enabled on every table and never disabled to make something work. `anon` has no
   policy and no table grant on any table. A function that holds the secret key bypasses
   RLS, so for its path the function is the rule: the admin user function checks that the
   caller is an active ESG lead, validates every input and does one change per call.
2. No user can change their own `role`, `site_id` or retired state through the app; a
   trigger refuses every direct write to a profile. Changes to another user's role, site or
   retired state happen only through the admin user function (`admin-users`, secret key, ESG
   lead only, never the caller's own row), or in the Supabase dashboard by the platform
   owner.
3. A row in its final state (projects: Approved, Retired, Obsolete, and Declined for that
   version; decisions: every row) is frozen for everyone, the ESG lead included. A
   correction is a withdrawal plus a new version: re-approval (the approved version
   Obsolete, version n+1 in Potential) or resubmission (from Declined). Obsolete, reinstate,
   every other status change and anonymisation run through narrow functions, never a free
   edit; a comment is required on every one of them except resubmit.
4. Nothing is deleted through the app. Projects are retired or made obsolete and stay
   visible; sites, targets and users are deactivated or retired. No `DELETE` policy exists on
   any table and the DELETE grant is revoked. A GDPR erasure request is actioned by the ESG
   lead as anonymisation of the personal fields (`profiles` name and email, `projects.owner_name`,
   `decisions.attendees`, and their history rows; rows, status and figures kept) and logged;
   the platform owner deletes the login identity in the Supabase dashboard. Exported CSVs and
   review packs are outside the tool.
5. Every record table (`projects`, `decisions`, `reference_figures`) carries `created_by`,
   `created_at`, `updated_by`, `updated_at`; lookup tables (`sites`, `targets`) carry
   `updated_by`, `updated_at`, `active`; `projects` has `project_history` and
   `reference_figures` has `reference_figures_history`, each written by a trigger.
6. Files (v1.3): one private bucket, `presentations`, one PowerPoint file per project version
   under the fixed key `<project id>/presentation.pptx`, at most 20 MB. The refusal lives in
   the storage policies and the triggers, never only in the form: the owner uploads and
   replaces while the version is Potential and requires a presentation; reading follows the
   project and happens through a short-lived signed URL; from Pending approval on the file is
   frozen for everyone, the ESG lead included; `anon` reaches no object and no public URL
   exists; nobody deletes a file through the app; endorsement is refused in the database while
   a required presentation is missing; versions from before the rule and the demo rows are
   exempt and accept no file.

---

## 8. Handover paragraph (for the handover package, plain language)

The Ravensberg Project Tracker has three kinds of user. A site user (Zee, 1200 Werk
Paderborn) registers energy, water and waste projects for their own site, edits them until
they are endorsed, resubmits or retires a declined one, keeps their site's reference figures
up to date, and sees nothing of the other sites or the group. The CFO (Sam) sees every site,
every project and every decision, and can export the CSV and the review pack, but changes
nothing. The ESG lead (Zyad Hatquai) is the administrator: they register group projects,
endorse, decline and record committee decisions, mark projects obsolete or send them back for
re-approval, set the targets, keep the site list, add and retire users, and can anonymise a
person's name on a data-protection request; even they cannot change an approved, retired or
obsolete version in place. From v1.3 every new project version carries its approval presentation
as a PowerPoint file: the site (or the ESG lead for a group project) attaches it on registration
and can replace it until endorsement; after that it is frozen, readable by everyone who can read
the project, deleted by nobody. Nothing is ever deleted. The rules are enforced in the database
itself, so they hold whatever screen or tool reaches the data. The Supabase, Netlify, Resend
and GitHub accounts are held personally by Zyad Hatquai; moving them to a company account
changes nothing in the rules.
