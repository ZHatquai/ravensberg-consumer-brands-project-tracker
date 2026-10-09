# User Stories: Ravensberg Project Tracker

**Written against:** product-spec.md v1.0 · supabase-setup.md not yet created (short run)
**Date:** 9 October 2026
**Author:** Zyad Hatquai
**Status:** Confirmed
**Population pattern:** P2 internal only, as in access-matrix.md
**Companion file:** access-matrix.md (every story cites exactly one cell of it)

> Short form, written before the database exists, when nobody logs in yet. Read by the
> Project Governor and by Claude Code. The full run adds the three named people (ESG lead,
> site user, CFO) and their stories to this same file.

---

## The people

| Role | Named first holder | Layer | Opens |
|---|---|---|---|
| platform owner | Zyad Hatquai (personal accounts) | outside the app | Supabase, Netlify, Resend and GitHub dashboards |

Named for the full run, from spec §2 and §6 (not active yet): ESG lead (admin) Zyad Hatquai,
z.hatquai@sustainos.io · Site user Zee, z.hatquai@gmail.com, site to confirm (1200 Werk
Paderborn assumed) · CFO Sam, sustainatrend@gmail.com.

---

## Stories

- **As a visitor with no login, I reach nothing, so that nothing leaks.** `[every table · read · anon]` (= no)
  Acceptance: once the login exists, the login screen is the only page a visitor sees; before that, every screen runs on fixture data. A direct read from the browser with the publishable key, on any table, returns a permission error, not an empty list.

---

## Stories that are refusals (collected)

| # | Who | Tries | Result | Cell |
|---|---|---|---|---|
| 1 | anyone, logged out | read any table through the API | permission error | every table · read · anon |
| 2 | anyone, logged out | insert, update or delete on any table through the API | permission error | every table · create / update / delete · anon |

---

## Later list (not this version)

- The full run: ESG lead, site user and CFO stories per screen (Overview, register, project page, form, reference data, users, exports).
- The four points in access-matrix.md, "Carried to the full run".
- Suppliers (spec §12): a second population; the matrix is extended, not replaced, when they arrive.
