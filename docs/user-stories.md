# User Stories — Ravensberg Project Tracker

**Written against:** product-spec.md v1.2 · supabase-setup.md as of 9 October 2026
**Date:** 9 October 2026 (full run; extends the short run of the same date)
**Author:** Zyad Hatquai
**Status:** Confirmed
**Population pattern:** P2 internal only, as in access-matrix.md
**Companion file:** access-matrix.md (every story below cites exactly one cell of it: `[table · action · role]`, one of the seven actions; a story that needs two cells is two stories)

> Read by the Project Governor (Iteration Mode) and by Claude Code when it builds the login
> and the access rules together. Each acceptance line is a screen test: the named person does
> the thing and sees the result. Stories whose cell is `no` are refusal tests and are as
> important as the others.

---

## The people

| Role | Named first holder | Layer | Opens |
|---|---|---|---|
| site user | Zee, z.hatquai@gmail.com, site 1200 Werk Paderborn | business | Login, Overview (own site), Project register, Project page, New project form, Reference data, CSV dialog |
| CFO | Sam, sustainatrend@gmail.com | business | Login, Overview (group and every site), Project register, Project page, Reference data (read), CSV and PDF dialogs |
| ESG lead (admin) | Zyad Hatquai, z.hatquai@sustainos.io | business role that carries the admin actions (`profiles.role = esg_lead`) | everything, including Users |
| platform owner | Zyad Hatquai (personal accounts; sustainos.io) | outside the app | Supabase, Netlify, Resend and GitHub dashboards |

Standalone tool: every screen belongs to the one tool. There is no `anon` row: nobody reaches
anything without a login (P2).

The short-run story is kept:

- **As a visitor with no login, I reach nothing, so that nothing leaks.** `[every table · read · anon]` (= no)
  Acceptance: the login screen is the only page a visitor sees. A direct read from the browser with the publishable key, on any table, returns a permission error, not an empty list.

---

## Stories by role and screen

Format, one per line, then its acceptance line indented beneath it:

> **As a [role], I [action] [record] [qualifier], so that [purpose].** `[cell: table · action · role]`
> Acceptance: [Named person] [does this on this screen] and [sees this result].

### site user — Login

- **As a site user, I log in with a magic link to my work email, so that I need no password.** `[profiles · read · site user]`
  Acceptance: Zee enters z.hatquai@gmail.com, receives the link within a minute, opens it and lands on the Overview for 1200 Werk Paderborn, with her name and "Site user · 1200 Werk Paderborn" in the header and no site selector.
- **As a site user whose profile is retired, I cannot log in, so that a leaver is out at once.** `[profiles · read · site user]` (= nobody: a retired profile is no one)
  Acceptance: once Dirk Sauer's profile is retired, his link request lands on "This address has no access" and every API read from his session is refused.

### site user — Overview

- **As a site user, I see my site's portfolio against its share of each 2030 target, so that I know where my site stands.** `[projects · read · site user]`
  Acceptance: Zee sees the KPI row, the three donuts, the three target cards and the three pathway tabs for 1200 only; the figures match 1200's rows; the year selector recalculates them.
- **As a site user, I cannot see the group view or another site, so that nothing of the other sites leaks.** `[projects · read · site user]` (= own)
  Acceptance: Zee has no site selector; a direct read of a 1000 project or a group project through the API returns nothing.
- **As a site user, I see my site's reference figures behind the cards, so that the derived targets are mine.** `[reference_figures · read · site user]`
  Acceptance: the emissions card's required figure is 42 % of 1200's FY2024 Scope 1+2; the water intensity meter uses 1200's withdrawal and output.

### site user — Project register

- **As a site user, I see every project of my site, Pending approval first, so that I know what is waiting.** `[projects · read · site user]`
  Acceptance: Zee opens the register and sees 1200's projects in every status with days waiting; the filters apply; no row from another site and no group project appears.
- **As a site user, I export the CSV of my site's register as filtered, so that I can report locally.** `[projects · export (CSV) · site user]`
  Acceptance: Zee downloads the file; it holds 1200's rows only, with every column of spec §3.
- **As a site user, I cannot endorse, decline or record a decision, so that decisions stay with Group Sustainability.** `[projects · change state → Pending approval · site user]` (= no)
  Acceptance: Zee's rows carry no action buttons; a direct call of the endorse function from her session is refused.

### site user — Project page

- **As a site user, I open a project of my site with its decisions and history, so that I see who decided what and when.** `[decisions · read · site user]`
  Acceptance: Zee opens a 1200 project and sees every decision with stage, outcome, date, people in the room, comment and recorder.
- **As a site user, I read the history of my site's project, so that every change is traceable.** `[project_history · read · site user]`
  Acceptance: Zee sees every field change with old value, new value, who, when and comment; the history of a 1000 project is not returned.
- **As a site user, I edit my site's project while it is Potential, so that I can correct it before endorsement.** `[projects · update (while Potential) · site user]`
  Acceptance: Zee changes the capex of a Potential 1200 project, saves, and the history shows old and new; the site, scope, status and version cannot be changed.
- **As a site user, I cannot edit a project once it is Pending approval, so that the committee decides on what it saw.** `[projects · update (final states) · site user]` (= no; Pending approval is locked for the site by the policy on line 8 of the matrix)
  Acceptance: the form is locked from Pending approval on; a direct update from Zee's session is refused.
- **As a site user, I resubmit a Declined project of my site as a new version, so that a revised case can be approved.** `[projects · create (resubmit) · site user]`
  Acceptance: Zee opens a Declined 1200 project, clicks Resubmit, the form opens pre-filled, and saving creates version n+1 in Potential with the same project ID, linked to the declined version, which stays visible as Declined.
- **As a site user, I retire a Declined project of my site with a comment, so that the register stays honest.** `[projects · change state → Retired · site user]`
  Acceptance: Zee retires a Declined 1200 project; it shows Retired with the comment; retiring a 1000 project or an Approved one is refused.
- **As a site user, I cannot open a project of another site, so that nothing leaks.** `[projects · read · site user]` (= own)
  Acceptance: Zee opens the URL of a 1000 project and sees "not found"; the API returns no row.

### site user — New project form

- **As a site user, I register a project for my site, so that it enters the approval process.** `[projects · create (site project) · site user]`
  Acceptance: Zee fills every field, submits, and the project is saved in Potential, version 1, with the next sequential project ID; the Project page opens. Every validation rule of spec §8 holds.
- **As a site user, I cannot register a project for another site or a group project, so that each site owns its own.** `[projects · create (group project) · site user]` (= no)
  Acceptance: the site field is fixed to 1200; an insert naming another site or scope `group` from Zee's session is refused.

### site user — Reference data

- **As a site user, I enter my site's figures for a year, so that the targets are measured against real numbers.** `[reference_figures · create · site user]`
  Acceptance: Zee enters 1200's FY2026 actuals and the row appears with her name and the time; an insert for site 1000 is refused.
- **As a site user, I update my site's figures, so that corrections are possible and logged.** `[reference_figures · update · site user]`
  Acceptance: Zee corrects 1200's withdrawal; the Overview recalculates; the figure's history shows old value, new value, Zee and the time.
- **As a site user, I cannot see or change another site's figures, so that nothing leaks.** `[reference_figures · read · site user]` (= own)
  Acceptance: the Reference data screen shows 1200 only; a direct read of a 1000 row returns nothing.
- **As a site user, I cannot change the group targets, so that the targets stay with Group Sustainability.** `[targets · update · site user]` (= no)
  Acceptance: the targets block is read-only for Zee; a direct update is refused.

### site user — Users and the review pack (refusals)

- **As a site user, I cannot open the Users screen, so that user administration stays with the ESG lead.** `[profiles · read · site user]` (= own site plus the ESG lead)
  Acceptance: Zee has no Users link and /users sends her to the Overview; a direct read of a 1000 user's profile returns nothing; she still sees the names on her own site's rows and Zyad's.
- **As a site user, I cannot change my own role, site or active state, so that access is never self-granted.** `[profiles · update (role, site_id) · site user]` (= no)
  Acceptance: a direct update of Zee's own profile row returns a permission error.
- **As a site user, I cannot generate the review pack, so that the CFO pack stays a group document.** `[projects · export (PDF) · site user]` (= no)
  Acceptance: Zee has no "Export review pack" button.

### CFO — Login and Overview

- **As the CFO, I log in with a magic link, so that I need no password.** `[profiles · read · CFO]`
  Acceptance: Sam enters sustainatrend@gmail.com, opens the link and lands on the group Overview with the site selector.
- **As the CFO, I see the group portfolio and switch to any site and year, so that I can read where the group stands.** `[projects · read · CFO]`
  Acceptance: Sam changes the site to 1300 and the year to 2025; every figure recalculates; the emissions chart names the factor set.

### CFO — Project register and Project page

- **As the CFO, I see every project with its status and days waiting, so that I can follow the pipeline.** `[projects · read · CFO]`
  Acceptance: Sam opens the register and sees every row, Pending approval first, including those submitted by every site and by Zyad.
- **As the CFO, I open any project with its decisions and history, so that I can see who decided what.** `[decisions · read · CFO]`
  Acceptance: Sam opens a 1000 project and reads every decision and every history row.
- **As the CFO, I export the CSV of the register as filtered, so that I can take it into finance reporting.** `[projects · export (CSV) · CFO]`
  Acceptance: Sam downloads the CSV with the current filters; every column of spec §3 is present.
- **As the CFO, I generate the review pack for a year, so that the committee gets its four pages.** `[projects · export (PDF) · CFO]`
  Acceptance: Sam picks a year, generates, and downloads four pages whose figures match the Overview for that year.
- **As the CFO, I cannot create a project, so that the register stays with the sites and the ESG lead.** `[projects · create (site project) · CFO]` (= no)
  Acceptance: Sam has no Register button; /projects/new sends him back; a direct insert is refused.
- **As the CFO, I cannot act on a project, so that decisions stay with the ESG lead.** `[projects · change state → Approved or Declined · CFO]` (= no)
  Acceptance: Sam's rows carry no action buttons; a direct call of a transition function from his session is refused.

### CFO — Reference data and Users (refusals)

- **As the CFO, I read every site's figures and the targets, so that I can check the base year.** `[reference_figures · read · CFO]`
  Acceptance: Sam sees all seven sites' figures and their derived targets, read-only.
- **As the CFO, I cannot change a figure or a target, so that the base year is owned by the sites and the ESG lead.** `[reference_figures · update · CFO]` (= no)
  Acceptance: no field is editable for Sam; a direct update is refused.
- **As the CFO, I cannot open the Users screen or change any profile, so that user administration stays with the ESG lead.** `[profiles · create · CFO]` (= no)
  Acceptance: Sam has no Users link and /users sends him to the Overview; he can still read every name on the register.

### ESG lead (admin) — Login and Overview

- **As the ESG lead, I log in with a magic link, so that I need no password.** `[profiles · read · ESG lead]`
  Acceptance: Zyad enters z.hatquai@sustainos.io, opens the link and lands on the group Overview with the site selector and the Users link.
- **As the ESG lead, I read every project, figure and decision, so that I can run the programme.** `[projects · read · ESG lead]`
  Acceptance: Zyad sees every row from every site and the group in the Overview and the register.

### ESG lead (admin) — Project register and Project page

- **As the ESG lead, I endorse a Potential project with a comment, so that it goes to the committee.** `[projects · change state → Pending approval · ESG lead]`
  Acceptance: Zyad clicks Endorse on a Potential row, enters a comment, and the row becomes Pending approval with an endorsement decision and days waiting from today; a second endorsement is refused.
- **As the ESG lead, I decline a project at Potential or Pending approval with a comment, so that weak cases are closed early.** `[projects · change state → Declined · ESG lead]`
  Acceptance: Zyad declines; the row shows Declined with the comment and a decision row; the site can resubmit or retire it.
- **As the ESG lead, I record the committee decision with comment, people in the room and date, so that the approval is on record.** `[projects · change state → Approved or Declined · ESG lead]`
  Acceptance: Zyad records Approved on a Pending approval row; the Overview's covered figure rises by the project's annual impact; without attendees the dialog refuses.
- **As the ESG lead, I correct a figure while a project is Pending approval, with a comment, so that the committee decides on correct numbers.** `[projects · update (figures while Pending approval) · ESG lead]`
  Acceptance: Zyad changes the annual impact with a comment; the history shows old, new and comment; without a comment, or on a Potential or Approved row, the change is refused.
- **As the ESG lead, I mark an Approved project Obsolete with a comment, so that savings that will not happen leave the pathway.** `[projects · change state → Obsolete · ESG lead]`
  Acceptance: Zyad marks Obsolete; the project leaves every year of the pathway and the counts' separate line shows it; the row stays visible with its history.
- **As the ESG lead, I send an Approved project back for re-approval, so that a changed case is approved again from the start.** `[projects · change state → re-approval · ESG lead]`
  Acceptance: Zyad clicks Re-approve with a comment; the approved version becomes Obsolete and a new version opens in Potential, pre-filled with the same project ID; the covered figure drops at once; the site user can edit the new version while Potential.
- **As the ESG lead, I reinstate an Obsolete version made obsolete in error, so that a mistake does not need a new approval.** `[projects · change state → Approved (reinstate) · ESG lead]`
  Acceptance: Zyad reinstates with a comment; the project counts again; reinstating a version that has a newer version is refused.
- **As the ESG lead, I edit my own group project while it is Potential, so that I can correct it before endorsement.** `[projects · update (while Potential) · ESG lead]`
  Acceptance: Zyad edits a Potential group project's figures; editing a site's Potential project in the same way is refused (the site owns it).
- **As the ESG lead, I resubmit or retire my own Declined group project, so that group projects follow the same path as site projects.** `[projects · create (resubmit) · ESG lead]`
  Acceptance: Zyad resubmits a Declined group project and gets version n+1 in Potential; retiring one with a comment also works.
- **As the ESG lead, I cannot edit an Approved, Retired or Obsolete version in place, so that a decision is never altered after the fact.** `[projects · update (final states) · ESG lead]` (= no)
  Acceptance: Zyad opens an Approved project; every field is read-only; a direct update returns a permission error.
- **As the ESG lead, I cannot change or delete a decision, so that the record stands.** `[decisions · update · ESG lead]` (= no)
  Acceptance: no decision is editable; a direct update or insert on decisions from Zyad's session is refused; only a transition writes one.

### ESG lead (admin) — New project form

- **As the ESG lead, I register a group project, so that group-wide levers count for the group.** `[projects · create (group project) · ESG lead]`
  Acceptance: Zyad fills the form with the site fixed to Group, submits, and the project is saved in Potential, version 1, scope group.
- **As the ESG lead, I cannot register a project for a site, so that each site owns its register.** `[projects · create (site project) · ESG lead]` (= no)
  Acceptance: the form offers no site; an insert with a site from Zyad's session is refused.

### ESG lead (admin) — Reference data

- **As the ESG lead, I enter or update any site's figures and the group's, so that the base year is complete.** `[reference_figures · create / update · ESG lead]`
  Acceptance: Zyad enters the 2030 output plan for 1500; the estimate label on the Overview disappears; the figure's history shows the change.
- **As the ESG lead, I set the group targets, so that the dashboard measures against the right numbers.** `[targets · update · ESG lead]`
  Acceptance: Zyad changes a target value; the Overview recalculates; changing the category is refused.
- **As the ESG lead, I maintain the site list, so that a closed site is deactivated and a new one added without a code change.** `[sites · maintain lists · ESG lead]`
  Acceptance: Zyad deactivates a site; it leaves the form's choices and stays on its old projects; renaming a site that projects reference is refused; the code never changes.

### ESG lead (admin) — Users

- **As the ESG lead, I add a user with name, email, role and site, so that access follows the team.** `[profiles · create · ESG lead]`
  Acceptance: Zyad adds a user on the Users screen; the admin function creates the login identity and the profile together; the user requests a magic link and lands on their scoped Overview.
- **As the ESG lead, I change a user's role or site, so that a move is reflected.** `[profiles · update (role, site_id) · ESG lead]`
  Acceptance: Zyad changes a site user's site; their next login shows the new site; the change is refused on Zyad's own row.
- **As the ESG lead, I retire a user with a comment, so that a leaver is refused at once and their name stays on their records.** `[profiles · update (retired_at, retired_comment) · ESG lead]`
  Acceptance: Zyad retires a user; the next link request is refused; every project and decision they touched still shows their name; there is no delete anywhere on the screen.
- **As the ESG lead, I anonymise a retired person's personal fields on a GDPR request, so that the request is honoured and the counts stay true.** `[profiles · anonymise · ESG lead]`
  Acceptance: Zyad anonymises; the profile, the owner names and the attendee mentions read "retired user"; rows, status and figures remain; the history logs the action; the platform owner deletes the login identity in the dashboard.
- **As the ESG lead, I cannot change my own role, site or active state, so that the admin cannot lock themselves in or out by accident.** `[profiles · update (role, site_id) · ESG lead]` (= never the caller's own row)
  Acceptance: the Users screen refuses a change to Zyad's own row; a direct update returns a permission error.

### ESG lead (admin) — Exports

- **As the ESG lead, I export the CSV and generate the review pack, so that the committee and the CFO get their documents.** `[projects · export (PDF) · ESG lead]`
  Acceptance: Zyad generates the four pages for a year; the figures match the Overview; the CSV holds every row as filtered.

---

## Stories that are refusals (collected)

The screen test list once the login and the rules are on. One line per `no` in the matrix.

| # | Who | Tries | Result | Cell |
|---|---|---|---|---|
| 1 | anyone, logged out | read any table through the API | permission error | every table · read · anon |
| 2 | anyone, logged out | insert, update or delete on any table | permission error | every table · create / update / delete · anon |
| 3 | an email with no profile, or Dirk Sauer (retired) | request a link and open it | "This address has no access"; no row from any table | every table · read · no profile |
| 4 | Zee, site user | open the group view or a 1000 project | no selector; "not found"; API returns nothing | projects · read · site user |
| 5 | Zee, site user | read a decision or history row of a 1000 project | nothing returned | decisions · read · site user |
| 6 | Zee, site user | register a project for site 1000 or a group project | site fixed to 1200; direct insert refused | projects · create (group project) · site user |
| 7 | Zee, site user | edit a 1200 project once it is Pending approval | form locked; direct update refused | projects · update (final states) · site user |
| 8 | Zee, site user | write `status` directly, or endorse | refused | projects · change state → Pending approval · site user |
| 9 | Zee, site user | resubmit or retire a 1000 project, or an Approved one | refused | projects · change state → Retired · site user |
| 10 | Zee, site user | read or edit 1000's reference figures | nothing returned; update refused | reference_figures · read · site user |
| 11 | Zee, site user | change a target or a site | refused | targets · update · site user |
| 12 | Zee, site user | open /users or read a 1000 user's profile | sent to the Overview; nothing returned | profiles · read · site user |
| 13 | Zee, site user | change her own role, site or retired state | permission error | profiles · update (role, site_id) · site user |
| 14 | Zee, site user | generate the review pack | no button | projects · export (PDF) · site user |
| 15 | Sam, CFO | register a project | no button; /projects/new sends him back; insert refused | projects · create (site project) · CFO |
| 16 | Sam, CFO | endorse, decline, record, obsolete, re-approve, reinstate, retire | no buttons; function calls refused | projects · change state → Approved or Declined · CFO |
| 17 | Sam, CFO | change a figure, a target or a site | refused | reference_figures · update · CFO |
| 18 | Sam, CFO | open /users, add or change a user | sent to the Overview; function refuses | profiles · create · CFO |
| 19 | Zyad, ESG lead | edit an Approved, Retired or Obsolete version in place | read-only; direct update refused | projects · update (final states) · ESG lead |
| 20 | Zyad, ESG lead | register a project for a site | no site on the form; insert refused | projects · create (site project) · ESG lead |
| 21 | Zyad, ESG lead | edit a site's Potential project directly | refused (the site owns it; figures change only at Pending approval, with a comment) | projects · update (while Potential) · ESG lead |
| 22 | Zyad, ESG lead | change a figure without a comment, or on a Potential or Approved project | refused | projects · update (figures while Pending approval) · ESG lead |
| 23 | Zyad, ESG lead | reinstate a version that has a newer version | refused | projects · change state → Approved (reinstate) · ESG lead |
| 24 | Zyad, ESG lead | insert, edit or delete a decision directly | refused | decisions · update · ESG lead |
| 25 | Zyad, ESG lead | write a profile directly, or change his own role, site or retired state | permission error; the admin function refuses his own row | profiles · update (role, site_id) · ESG lead |
| 26 | Zyad, ESG lead | rename a site that projects reference, or change a site code or a target category | refused | sites · update · ESG lead |
| 27 | anyone | delete a project, a decision, a figure, a profile, a site or a target | no delete anywhere | every table · delete · everyone |
| 28 | anyone | write a history row | refused; the triggers write them | project_history · write · everyone |

---

## Later list (not this version)

- Hiding profile emails from site users: a view without the column, if ever wanted (access-matrix.md §4).
- A `withdrawn` status on decisions: not in version 1; a wrong decision is corrected by the next transition with its comment.
- Reinstate as a decision stage with its own row: version 1 logs it in `project_history` only.
- Change requests on Approved projects raised by sites (spec §12): version 1 has re-approval by the ESG lead only.
- Suppliers (spec §12): a second population; the matrix is extended, not replaced, when they arrive.
- Microsoft OAuth / SSO login: the door changes, the rules do not (spec §6).
