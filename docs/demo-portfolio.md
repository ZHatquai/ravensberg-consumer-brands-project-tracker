# Demo portfolio and reset — Ravensberg Project Tracker

The workshop runs three times on the same case. This file is the case as data and the way back to it: what the demo portfolio contains, who the people are, what a workshop changes, and how the platform owner puts everything back before the next run. Written 9 October 2026 (session 2).

## 1. The case in one paragraph

Ravensberg Consumer Brands, a family-owned consumer goods group in Bielefeld with seven German sites, has three 2030 targets against FY2024: Scope 1+2 emissions down 42 %, water withdrawal down 10 % (and intensity down 20 %), and at least 95 % of waste diverted from landfill at every site. Each site registers energy, water and waste projects; the global ESG lead endorses them and records the sustainability committee's decisions; the CFO reads everything. The Overview shows how far the approved projects carry the group and each site toward the targets, what is still uncovered, and what is waiting for a decision.

## 2. The people and their logins

| Who | Role | Logs in as | What they see and do |
|---|---|---|---|
| Zyad Hatquai | ESG lead (admin) | z.hatquai@sustainos.io | everything; endorses, declines, records committee decisions, corrects figures, re-approves, marks obsolete, reinstates, maintains targets, sites, figures and users |
| Zee | site user, 1200 Werk Paderborn | z.hatquai@gmail.com | her site only; registers and edits her projects while Potential, resubmits or retires a declined one, enters her site's figures |
| Sam | CFO | sustainatrend@gmail.com | everything, read-only, plus the CSV and the review pack |
| Six made-up site users | site users without a login (addresses on ravensberg-cb.example) | nobody | they carry the demo projects' submitter names: Tobias Wendt (1100), Miriam Koch (1300), Lars Brinkmann (1400), Petra Hollmann (1500), Jonas Feldmann (1600), Anke Rieger (1000); Dirk Sauer (1000) is retired |

Logins are magic links: the person enters the address on the login page and opens the link from the email. There is no password. Workshop participants are added by the ESG lead on the Users screen with their own addresses (a site user on the site they play, or a CFO); they get a magic link at once.

## 3. What the demo portfolio contains

Snapshot of the golden state (the seed of 9 October 2026; a reset brings exactly this back):

| Table | Rows | Content |
|---|---|---|
| sites | 7 | 1000 Werk Bielefeld (beverages), 1100 Logistikzentrum Bad Oeynhausen (logistics, reports pallets), 1200 Werk Paderborn (confectionery), 1300 Werk Gütersloh (food ingredients), 1400 Werk Minden (home and personal care), 1500 Werk Herford (packaging), 1600 Werk Lippstadt (homeware) |
| targets | 4 | emissions 42 %, water absolute 10 %, water intensity 20 %, waste diversion 95 %; base year 2024, target year 2030 |
| profiles | 10 | the three named people and the seven made-up site users above |
| reference_figures | 20 | FY2024 and FY2025 actuals for all seven sites; 2030 output plans for six sites (1500 Werk Herford has none, so its intensity path is the labelled estimate) |
| projects | 38 rows, 37 project codes | PRJ-0001 to PRJ-0037; PRJ-0010 exists as a declined version 1 and an approved version 2 |
| decisions | 57 | endorsements, committee decisions (approvals and declines), two declines at endorsement, one obsolete |
| project_history | 99 | the audit trail of every row |

Statuses in the golden state: Approved 20, Pending approval 6, Potential 6, Declined 4 (one of them superseded by its version 2), Retired 1, Obsolete 1. By category: 18 emissions, 9 water, 7 waste projects plus the versions. Group projects (ESG lead): PRJ-0009 fleet electrification, PRJ-0020 energy management system, PRJ-0030 group leak detection (declined), PRJ-0035 group hazardous-waste contract.

Rows that make a good walk-through:

- **PRJ-0004, 1200, Pending approval** (Electric ovens for the baking lines, 2,900 tCO₂e a year from 2027): the committee decision to record live; its approval moves the group emissions figure visibly.
- **PRJ-0034, 1600, Potential** (Packaging waste segregation and baler) and **PRJ-0006, 1400, Potential** (Heat pump for process hot water, 1,700 tCO₂e a year): endorse live.
- **PRJ-0037, 1000, Declined** (Glass cullet return to the supplier): the declined case a site can resubmit or retire.
- **PRJ-0010, 1200**: version 1 declined for its payback, version 2 approved with a revised capex, the resubmission story.
- **PRJ-0012, 1400, Obsolete** (Boiler economisers): left the pathway when the heat pump replaced the boiler house; reinstate is possible because no newer version exists.
- **PRJ-0021, 1400, Potential**, start year 2031: accepted with the warning that it contributes nothing to 2030.
- **PRJ-0033, 1400, Pending approval** (Sludge dewatering): takes site 1400 over the 95 % waste threshold if approved.

The reporting year selector rebuilds the portfolio as it stood at the end of 2025 (fewer approvals, the gaps larger), the current year is as of today.

## 4. What a workshop changes, and what the reset does with it

A workshop touches the real tables: endorsements, decisions, new projects, resubmissions, figure entries, target changes, users added or retired. The reset puts the eight tables back to the golden state:

- **Wiped and restored exactly:** projects, decisions, project history, reference figures and their history. Every row the workshop created or changed disappears; the 38 demo projects with their decisions and history come back as stored.
- **Restored by id:** sites and targets (a target changed in the workshop goes back to its value and loses the change reason; a site added in the workshop is deactivated, never deleted).
- **People:** the ten demo profiles come back as stored. Every profile that has a login is kept, including participants added in the workshop, so they can log in again next time; their projects do not survive. A profile without a login that is not in the demo is removed. Login identities (Supabase Auth) are never touched: nobody has to be invited again, and a retired participant stays retired on their profile until the ESG lead changes it.
- **Project codes:** the sequence goes back to PRJ-0037, so the next registered project is PRJ-0038 again.

Not reset: the Auth users, the SMTP settings, the email templates, the Netlify site, this repository.

## 5. The reset, step by step

Who: the platform owner (Zyad), as the database itself, never a tool user. The functions refuse any session and are not callable through the API.

**Before a workshop (every time):**

1. Open a Claude Code session on this repository and say: "reset the demo portfolio". Claude Code runs, through the Supabase MCP, as a data fix:
   ```sql
   select public.demo_reset();
   ```
   and reports the counts it returns (sites 7, targets 4, profiles 10 plus participants, reference figures 20, projects 38, decisions 57, project history 99, next project code PRJ-0038).
2. Alternatively, without Claude Code: Supabase dashboard → SQL Editor → run the same line. The result is the same JSON.
3. Open the live tool as Zyad and check the Overview: Pending approval 6, Potential 6, the group emissions card as in section 3. Done.

The reset runs in one transaction. If anything fails, nothing changes: the database stays as it was.

**After the first workshop, if the golden state should change** (for example you prefer to keep a participant's good project as demo data, or you tune a figure):

1. Make the database look exactly as the next workshop should start. The reset above, then your changes through the tool as Zyad.
2. Take the snapshot, as the platform owner:
   ```sql
   select public.demo_snapshot_take('Golden state after workshop 1, <date>: <what changed>');
   ```
   It replaces the stored state with the current rows and returns the row counts. From then on, every reset returns to this state.
3. Note the change in PROGRESS.md (Build decisions) so the next session knows the golden state moved.

**To see what is stored:**

```sql
select table_name, jsonb_array_length(rows) as rows, note, taken_at from public.demo_snapshot where table_name <> 'meta' order by 1;
```

## 6. Where it lives

- `public.demo_snapshot`: one row per table with the rows as JSON, plus a `meta` row with the project-code sequence. RLS on, no policy, no grant: unreachable through the API.
- `public.demo_snapshot_take(note)` and `public.demo_reset()`: SECURITY DEFINER, `search_path` empty, refuse a session (`auth.uid()` must be null), EXECUTE revoked from anon and authenticated. Migrations `20261009191230_demo_snapshot_table.sql` and the two function migrations that follow it; details in docs/supabase-setup.md §5.
- The golden state was loaded on 9 October 2026 from the seed migrations (`20261009142725_seed_demo_portfolio_1.sql`, `20261009143326_seed_demo_portfolio_2.sql`), so a database rebuilt from the migration files and then snapshotted gives the same state.

## 7. Known limits

- The demo dates are fixed (projects submitted between January 2025 and October 2026). "Days waiting" and "as of today" grow with the calendar; by a workshop in 2027 the Pending approval rows will have waited longer than they do today. If that matters, shift the dates in the golden state and take a new snapshot.
- A participant's profile survives the reset, their login too; if you want a clean Users screen, retire them on the Users screen after the workshop (never delete), or anonymise them on request.
- The reset is not an undo for a single action; it is all or nothing.
