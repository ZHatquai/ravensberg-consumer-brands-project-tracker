# Access Matrix: Ravensberg Project Tracker

**Written against:** product-spec.md v1.0 · supabase-setup.md not yet created (short run)
**Population pattern:** P2 internal only
**Date:** 9 October 2026
**Author:** Zyad Hatquai
**Status:** Confirmed
**Companion file:** user-stories.md

> The source of truth for who may do what. The Project Governor lifts Section 7 into
> CLAUDE.md. Claude Code builds every line of Section 6 with the mechanism that line names.
> This is the **short form**, written before the database exists, when nobody logs in yet.
> It is the real rule from day one. The full run (trigger: docs/supabase-setup.md exists and
> someone is about to log in) adds the role columns, ownership, the people, the schema delta
> and the full policy plan to this same file.
>
> Every cell names a real table and one of the seven actions. A screen or route is never a
> cell. Export never exceeds read.

---

## 1. The matrix

**P2, internal only:** no anon access to any table.

This covers every table the spec names: `sites`, `profiles`, `targets`, `reference_figures`,
`projects`, `decisions`, `project_history`, and any table added later. There is no `anon`
column, now or later: the pattern is final.

RLS is enabled on every table at creation. Until the full run, no role policy exists on any
table, so the browser key (publishable) reads and writes nothing. This is intended: in
Stages 1 and 2 every screen runs on fixture data and reads no real row.

---

## 2. Ownership

Not yet: nobody logs in. (Full run. The spec's intent: a site user owns the rows whose
`site_id` matches their profile's `site_id`; group rows belong to nobody but the ESG lead.)

## 3. The people

Not yet: nobody logs in, except the platform owner.

| Role | Named first holder | Layer | Screens |
|---|---|---|---|
| platform owner | Zyad Hatquai (personal accounts) | outside the app | Supabase, Netlify, Resend, GitHub |

## 4. Exceptions

Not yet: nobody logs in.

## 5. Schema delta

Not yet: nobody logs in. The Governor seeds the login-ready columns from day one
(`created_by` nullable, `status`, `created_at`, `updated_by`, `updated_at` on `projects`,
`decisions` and `reference_figures`; `profiles` per spec Section 6), so the full run is a
migration, not a rebuild.

---

## 6. Policy plan (short form)

| # | Table | Action | Role | Rule in words | Mechanism | Test |
|---|---|---|---|---|---|---|
| 1 | every table | any | anon | nothing: no policy and no table grant on any table | none (default deny) | a logged-out request through the API, with the publishable key, returns a permission error on every table, not an empty list |
| 2 | every table | any | authenticated | nothing until the full run: no role policy exists yet, and Auth is not configured | none (default deny) | no login exists; no screen reads a real row (fixture data only) |
| 3 | `sites`, `targets` | seed | platform owner | the seven sites and four targets are inserted by a named migration, never through the app | migration (secret key, server side) | rows exist after the migration; the browser cannot insert or read them |

Default deny applies to every table: where no line above says yes, the answer is nothing.

---

## 7. Hard rules for CLAUDE.md (the Governor lifts these verbatim)

1. The refusal happens in the database, or in a server function that holds the secret key
   and checks every request itself; never only in the screen. A hidden button is not a rule.
   RLS is enabled on every table and never disabled to make something work. `anon` has no
   policy and no table grant on any table. A function that holds the secret key bypasses
   RLS, so for its path the function is the rule.
2. No user can change their own `role`, admin flag, site or active state through the app; a
   trigger refuses it. Changes to another user's role, site or active state happen only
   through the narrow admin function named in the full run, or in the Supabase dashboard by
   the platform owner.
3. A row in its final state is frozen for everyone, admin included. A correction is a
   withdrawal (here: Obsolete or Retired, with a comment) plus a new version. Status changes
   and anonymisation run through narrow functions, never a free edit. The full run fixes the
   exact list of final states (see "Carried to the full run").
4. Nothing is deleted through the app. Projects are retired or made obsolete and stay
   visible; sites, targets and users are deactivated or retired. No `DELETE` policy exists on
   any table. A GDPR erasure request is actioned by the ESG lead as anonymisation of the
   personal fields (`profiles` name and email, `projects.owner_name`, `decisions.attendees`,
   and their history rows; rows and status kept) and logged; the platform owner deletes the
   login identity in the Supabase dashboard. Exported CSVs and review packs are outside the
   tool.
5. Every record table (`projects`, `decisions`, `reference_figures`) carries `created_by`,
   `created_at`, `updated_by`, `updated_at`; lookup tables (`sites`, `targets`) carry
   `updated_by`, `updated_at`, `active`; `projects` has `project_history`, written by a
   trigger.

---

## Carried to the full run (decide before it, not now)

| # | Point | Proposed answer |
|---|---|---|
| 1 | Approved is a final state in spec §5, but the ESG lead edits Approved figures (§3 roles, §8, §12, criterion 7). Rule 3 freezes a final row for everyone. | Keep Approved final; a correction to an Approved project is "mark Obsolete with a comment, register version n+1", which the version model already supports. Changes criterion 7 and the §12 line; spec bump with the Tool Architect. |
| 2 | The Users screen changes role and site in the app (§8). Rule 2 says role columns are never set through the app. | Allowed only through the admin Netlify Function (secret key, checks the caller is an active ESG lead, one change per call, comment for retire); the column trigger refuses every other path, and nobody changes their own row. Written in the full run as a named exception. |
| 3 | Reference data says "every change is logged" (§8), but history is specced only for `projects`. | Add `reference_figures_history`, written by a trigger, so criterion 12 is testable. |
| 4 | Zee's site (spec §15, blocking). | Confirm 1200 Werk Paderborn or name the site. |
