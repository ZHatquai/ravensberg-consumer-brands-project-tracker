-- Refusal test, half A (Claude Code): every "no" cell of docs/access-matrix.md and one "own" boundary per role,
-- plus a logged-out caller, a login with no profile and a retired profile. Run with execute_sql (a read: the
-- transaction rolls back at the end, nothing persists). Each case runs as the named person: a test auth id is
-- set on the seeded profile inside the transaction, the role is switched to authenticated (or anon) and the
-- JWT claims carry that id, exactly as PostgREST does for a session. Results: see PROGRESS.md, Refusal test record.
-- Re-run after any change to a policy, trigger or function; every row must read ok = true.
-- First run: 9 October 2026, session 2 — 119 cases, 119 ok.
begin;
create temp table results (n serial, label text, expected text, got text, ok boolean);
update public.profiles set auth_user_id = 'a0000000-0000-4000-8000-000000000001' where email = 'z.hatquai@gmail.com';           -- Zee, site user 1200
update public.profiles set auth_user_id = 'a0000000-0000-4000-8000-000000000002' where email = 'sustainatrend@gmail.com';        -- Sam, CFO
update public.profiles set auth_user_id = 'a0000000-0000-4000-8000-000000000003' where email = 'z.hatquai@sustainos.io';        -- Zy, ESG lead
update public.profiles set auth_user_id = 'a0000000-0000-4000-8000-000000000004' where email = 'dirk.sauer@ravensberg-cb.example';  -- Dirk, retired
update public.profiles set auth_user_id = 'a0000000-0000-4000-8000-000000000005' where email = 'anke.rieger@ravensberg-cb.example'; -- Anke, site user 1000
-- a0…09 = a login with no profile

do $do$
declare r record; v_got text; v_n bigint; v_ok boolean;
begin
  for r in select * from (values
    ('anon reads projects', 'refused', 'anon', $q$read:select * from public.projects$q$),
    ('anon reads sites', 'refused', 'anon', $q$read:select * from public.sites$q$),
    ('anon calls endorse', 'refused', 'anon', $q$select public.endorse_project('b365b81e-22b5-560a-aca4-1abaaa8559ab', 'x')$q$),
    ('no profile reads projects', 'none', 'a0000000-0000-4000-8000-000000000009', $q$read:select * from public.projects$q$),
    ('no profile reads sites', 'none', 'a0000000-0000-4000-8000-000000000009', $q$read:select * from public.sites$q$),
    ('no profile reads profiles', 'none', 'a0000000-0000-4000-8000-000000000009', $q$read:select * from public.profiles$q$),
    ('no profile calls endorse', 'refused', 'a0000000-0000-4000-8000-000000000009', $q$select public.endorse_project('b365b81e-22b5-560a-aca4-1abaaa8559ab', 'x')$q$),
    ('retired (Dirk) reads projects', 'none', 'a0000000-0000-4000-8000-000000000004', $q$read:select * from public.projects$q$),
    ('retired (Dirk) reads figures', 'none', 'a0000000-0000-4000-8000-000000000004', $q$read:select * from public.reference_figures$q$),
    ('retired (Dirk) inserts a 1000 project', 'refused', 'a0000000-0000-4000-8000-000000000004', $q$insert into public.projects (title, category, scope, site_id, description, total_impact, annual_impact, unit, start_year, capex_eur, opex_eur_per_year, owner_name) values ('t', 'Emissions', 'site', (select id from public.sites where code = '1000'), 'd', 100, 10, 'tCO₂e per year', 2027, 0, 0, 'o')$q$),
    ('Zee reads projects (1200 only)', 'rows 6', 'a0000000-0000-4000-8000-000000000001', $q$read:select * from public.projects$q$),
    ('Zee reads a 1000 project', 'none', 'a0000000-0000-4000-8000-000000000001', $q$read:select * from public.projects where id = '72bba7f9-088b-597b-b270-54f925888ce6'$q$),
    ('Zee reads figures (1200 only)', 'rows 3', 'a0000000-0000-4000-8000-000000000001', $q$read:select * from public.reference_figures$q$),
    ('Zee reads profiles (1200 + ESG lead)', 'rows 2', 'a0000000-0000-4000-8000-000000000001', $q$read:select * from public.profiles$q$),
    ('Zee reads decisions of a 1000 project', 'none', 'a0000000-0000-4000-8000-000000000001', $q$read:select * from public.decisions where project_id = '72bba7f9-088b-597b-b270-54f925888ce6'$q$),
    ('Zee reads history of a 1000 project', 'none', 'a0000000-0000-4000-8000-000000000001', $q$read:select * from public.project_history where project_id = '72bba7f9-088b-597b-b270-54f925888ce6'$q$),
    ('Zee reads decisions of a 1200 project', 'some', 'a0000000-0000-4000-8000-000000000001', $q$read:select * from public.decisions where project_id = '1badd089-2050-5c09-b4d9-a40b250a11df'$q$),
    ('Zee reads sites and targets', 'rows 11', 'a0000000-0000-4000-8000-000000000001', $q$read:select id from public.sites union all select id from public.targets$q$),
    ('Sam reads all projects', 'rows 38', 'a0000000-0000-4000-8000-000000000002', $q$read:select * from public.projects$q$),
    ('Sam reads all figures', 'rows 20', 'a0000000-0000-4000-8000-000000000002', $q$read:select * from public.reference_figures$q$),
    ('Sam reads all profiles', 'rows 10', 'a0000000-0000-4000-8000-000000000002', $q$read:select * from public.profiles$q$),
    ('Zy reads all projects', 'rows 38', 'a0000000-0000-4000-8000-000000000003', $q$read:select * from public.projects$q$),
    ('Zy reads all profiles', 'rows 10', 'a0000000-0000-4000-8000-000000000003', $q$read:select * from public.profiles$q$),
    ('Zee inserts a 1000 project', 'refused', 'a0000000-0000-4000-8000-000000000001', $q$insert into public.projects (title, category, scope, site_id, description, total_impact, annual_impact, unit, start_year, capex_eur, opex_eur_per_year, owner_name) values ('t', 'Emissions', 'site', (select id from public.sites where code = '1000'), 'd', 100, 10, 'tCO₂e per year', 2027, 0, 0, 'o')$q$),
    ('Zee inserts a group project', 'refused', 'a0000000-0000-4000-8000-000000000001', $q$insert into public.projects (title, category, scope, site_id, description, total_impact, annual_impact, unit, start_year, capex_eur, opex_eur_per_year, owner_name) values ('t', 'Emissions', 'group', null, 'd', 100, 10, 'tCO₂e per year', 2027, 0, 0, 'o')$q$),
    ('Zee inserts a project as Approved', 'refused', 'a0000000-0000-4000-8000-000000000001', $q$insert into public.projects (title, category, scope, site_id, description, total_impact, annual_impact, unit, start_year, capex_eur, opex_eur_per_year, owner_name, status) values ('t', 'Emissions', 'site', (select id from public.sites where code = '1200'), 'd', 100, 10, 'tCO₂e per year', 2027, 0, 0, 'o', 'Approved')$q$),
    ('Zee inserts a 1200 project (own)', 'ok', 'a0000000-0000-4000-8000-000000000001', $q$insert into public.projects (id, title, category, scope, site_id, description, total_impact, annual_impact, unit, start_year, capex_eur, opex_eur_per_year, owner_name) values ('b0000000-0000-4000-8000-000000000001', 'Zee test', 'Emissions', 'site', (select id from public.sites where code = '1200'), 'd', 100, 10, 'tCO₂e per year', 2027, 0, 0, 'o')$q$),
    ('Sam inserts a project', 'refused', 'a0000000-0000-4000-8000-000000000002', $q$insert into public.projects (title, category, scope, site_id, description, total_impact, annual_impact, unit, start_year, capex_eur, opex_eur_per_year, owner_name) values ('t', 'Emissions', 'group', null, 'd', 100, 10, 'tCO₂e per year', 2027, 0, 0, 'o')$q$),
    ('Zy inserts a site project', 'refused', 'a0000000-0000-4000-8000-000000000003', $q$insert into public.projects (title, category, scope, site_id, description, total_impact, annual_impact, unit, start_year, capex_eur, opex_eur_per_year, owner_name) values ('t', 'Emissions', 'site', (select id from public.sites where code = '1200'), 'd', 100, 10, 'tCO₂e per year', 2027, 0, 0, 'o')$q$),
    ('Zy inserts a group project (own)', 'ok', 'a0000000-0000-4000-8000-000000000003', $q$insert into public.projects (id, title, category, scope, site_id, description, total_impact, annual_impact, unit, start_year, capex_eur, opex_eur_per_year, owner_name) values ('b0000000-0000-4000-8000-000000000002', 'Zy test', 'Water', 'group', null, 'd', 100, 10, 'm³ per year', 2027, 0, 0, 'o')$q$),
    ('Zee edits her Potential project', 'ok', 'a0000000-0000-4000-8000-000000000001', $q$update public.projects set capex_eur = 5 where id = 'b0000000-0000-4000-8000-000000000001'$q$),
    ('Zee writes status directly', 'refused', 'a0000000-0000-4000-8000-000000000001', $q$update public.projects set status = 'Approved' where id = 'b0000000-0000-4000-8000-000000000001'$q$),
    ('Zee moves her project to another site', 'refused', 'a0000000-0000-4000-8000-000000000001', $q$update public.projects set site_id = (select id from public.sites where code = '1000') where id = 'b0000000-0000-4000-8000-000000000001'$q$),
    ('Zee edits a Pending approval 1200 project', 'none', 'a0000000-0000-4000-8000-000000000001', $q$update public.projects set capex_eur = 5 where id = '1badd089-2050-5c09-b4d9-a40b250a11df'$q$),
    ('Zee edits an Approved 1200 project', 'none', 'a0000000-0000-4000-8000-000000000001', $q$update public.projects set capex_eur = 5 where id = '964082cf-2eb5-56c7-b691-885f9cac7df4'$q$),
    ('Zee edits Zy''s group project', 'none', 'a0000000-0000-4000-8000-000000000001', $q$update public.projects set capex_eur = 5 where id = 'b0000000-0000-4000-8000-000000000002'$q$),
    ('Sam edits a Potential project', 'none', 'a0000000-0000-4000-8000-000000000002', $q$update public.projects set capex_eur = 5 where id = 'b0000000-0000-4000-8000-000000000001'$q$),
    ('Zy edits a site''s Potential project directly', 'none', 'a0000000-0000-4000-8000-000000000003', $q$update public.projects set capex_eur = 5 where id = 'b365b81e-22b5-560a-aca4-1abaaa8559ab'$q$),
    ('Zy edits an Approved project in place', 'none', 'a0000000-0000-4000-8000-000000000003', $q$update public.projects set title = 'x' where id = '72bba7f9-088b-597b-b270-54f925888ce6'$q$),
    ('Zy edits a Declined project in place', 'none', 'a0000000-0000-4000-8000-000000000003', $q$update public.projects set title = 'x' where id = 'ce116942-e8c4-5a7a-b2cc-83aab108f280'$q$),
    ('Zy edits his own Potential group project', 'ok', 'a0000000-0000-4000-8000-000000000003', $q$update public.projects set capex_eur = 7 where id = 'b0000000-0000-4000-8000-000000000002'$q$),
    ('Zy corrects figures on a Potential project', 'refused', 'a0000000-0000-4000-8000-000000000003', $q$select public.edit_project_figures('b0000000-0000-4000-8000-000000000002', '{"capex_eur": 9}', 'c')$q$),
    ('Zy corrects figures without a comment', 'refused', 'a0000000-0000-4000-8000-000000000003', $q$select public.edit_project_figures('1badd089-2050-5c09-b4d9-a40b250a11df', '{"capex_eur": 9}', '')$q$),
    ('Zy corrects a non-figure field', 'refused', 'a0000000-0000-4000-8000-000000000003', $q$select public.edit_project_figures('1badd089-2050-5c09-b4d9-a40b250a11df', '{"title": "x"}', 'c')$q$),
    ('Zy corrects figures while Pending approval', 'ok', 'a0000000-0000-4000-8000-000000000003', $q$select public.edit_project_figures('1badd089-2050-5c09-b4d9-a40b250a11df', '{"annual_impact": 2950, "total_impact": 14750}', 'Site re-measured')$q$),
    ('Zee corrects figures (function)', 'refused', 'a0000000-0000-4000-8000-000000000001', $q$select public.edit_project_figures('1badd089-2050-5c09-b4d9-a40b250a11df', '{"capex_eur": 9}', 'c')$q$),
    ('Zee endorses', 'refused', 'a0000000-0000-4000-8000-000000000001', $q$select public.endorse_project('b0000000-0000-4000-8000-000000000001', 'c')$q$),
    ('Sam endorses', 'refused', 'a0000000-0000-4000-8000-000000000002', $q$select public.endorse_project('b0000000-0000-4000-8000-000000000001', 'c')$q$),
    ('Zy endorses without a comment', 'refused', 'a0000000-0000-4000-8000-000000000003', $q$select public.endorse_project('b365b81e-22b5-560a-aca4-1abaaa8559ab', ' ')$q$),
    ('Zy endorses a Potential project', 'ok', 'a0000000-0000-4000-8000-000000000003', $q$select public.endorse_project('b365b81e-22b5-560a-aca4-1abaaa8559ab', 'Good case')$q$),
    ('Zy endorses it a second time', 'refused', 'a0000000-0000-4000-8000-000000000003', $q$select public.endorse_project('b365b81e-22b5-560a-aca4-1abaaa8559ab', 'again')$q$),
    ('Sam records a committee decision', 'refused', 'a0000000-0000-4000-8000-000000000002', $q$select public.record_committee_decision('1badd089-2050-5c09-b4d9-a40b250a11df', 'Approved', 'c', 'people', current_date)$q$),
    ('Zy records without attendees', 'refused', 'a0000000-0000-4000-8000-000000000003', $q$select public.record_committee_decision('1badd089-2050-5c09-b4d9-a40b250a11df', 'Approved', 'c', '', current_date)$q$),
    ('Zy records an outcome that is not Approved or Declined', 'refused', 'a0000000-0000-4000-8000-000000000003', $q$select public.record_committee_decision('1badd089-2050-5c09-b4d9-a40b250a11df', 'Endorsed', 'c', 'people', current_date)$q$),
    ('Zy records Approved on Pending approval', 'ok', 'a0000000-0000-4000-8000-000000000003', $q$select public.record_committee_decision('1badd089-2050-5c09-b4d9-a40b250a11df', 'Approved', 'Approved.', 'Zyad, Sam, Katrin, Henning', current_date)$q$),
    ('Zy records on a Potential project', 'refused', 'a0000000-0000-4000-8000-000000000003', $q$select public.record_committee_decision('b0000000-0000-4000-8000-000000000002', 'Approved', 'c', 'people', current_date)$q$),
    ('Zy declines a Potential project', 'ok', 'a0000000-0000-4000-8000-000000000003', $q$select public.decline_project('b0000000-0000-4000-8000-000000000001', 'Weak case')$q$),
    ('Zy declines an Approved project', 'refused', 'a0000000-0000-4000-8000-000000000003', $q$select public.decline_project('964082cf-2eb5-56c7-b691-885f9cac7df4', 'c')$q$),
    ('Sam marks obsolete', 'refused', 'a0000000-0000-4000-8000-000000000002', $q$select public.mark_project_obsolete('964082cf-2eb5-56c7-b691-885f9cac7df4', 'c')$q$),
    ('Zy marks a Potential project obsolete', 'refused', 'a0000000-0000-4000-8000-000000000003', $q$select public.mark_project_obsolete('b0000000-0000-4000-8000-000000000002', 'c')$q$),
    ('Zy marks an Approved project obsolete', 'ok', 'a0000000-0000-4000-8000-000000000003', $q$select public.mark_project_obsolete('964082cf-2eb5-56c7-b691-885f9cac7df4', 'Closed')$q$),
    ('Zy reinstates it (no newer version)', 'ok', 'a0000000-0000-4000-8000-000000000003', $q$select public.reinstate_project('964082cf-2eb5-56c7-b691-885f9cac7df4', 'Error')$q$),
    ('Zy sends an Approved project for re-approval', 'ok', 'a0000000-0000-4000-8000-000000000003', $q$select public.reapprove_project('72bba7f9-088b-597b-b270-54f925888ce6', 'Changed case')$q$),
    ('Zy reinstates a version that has a newer one', 'refused', 'a0000000-0000-4000-8000-000000000003', $q$select public.reinstate_project('72bba7f9-088b-597b-b270-54f925888ce6', 'c')$q$),
    ('Zee re-approves', 'refused', 'a0000000-0000-4000-8000-000000000001', $q$select public.reapprove_project('f9934d4e-e6e8-5883-a980-a6785b8ad0c8', 'c')$q$),
    ('Zee reinstates', 'refused', 'a0000000-0000-4000-8000-000000000001', $q$select public.reinstate_project('9688a7f5-fc44-5bd3-99ff-dc5fdc10f9e9', 'c')$q$),
    ('Zee retires a 1000 Declined project', 'refused', 'a0000000-0000-4000-8000-000000000001', $q$select public.retire_project('ce116942-e8c4-5a7a-b2cc-83aab108f280', 'c')$q$),
    ('Zee retires an Approved 1200 project', 'refused', 'a0000000-0000-4000-8000-000000000001', $q$select public.retire_project('f9934d4e-e6e8-5883-a980-a6785b8ad0c8', 'c')$q$),
    ('Zee resubmits a 1000 Declined project', 'refused', 'a0000000-0000-4000-8000-000000000001', $q$select public.resubmit_project('ce116942-e8c4-5a7a-b2cc-83aab108f280')$q$),
    ('Zee resubmits a version that was already resubmitted', 'refused', 'a0000000-0000-4000-8000-000000000001', $q$select public.resubmit_project('cdcb5326-5f0e-5ef2-b7ca-54aea1193b10')$q$),
    ('Zee resubmits her own Declined project', 'ok', 'a0000000-0000-4000-8000-000000000001', $q$select public.resubmit_project('b0000000-0000-4000-8000-000000000001')$q$),
    ('Anke retires her own 1000 Declined project', 'ok', 'a0000000-0000-4000-8000-000000000005', $q$select public.retire_project('ce116942-e8c4-5a7a-b2cc-83aab108f280', 'Not pursued')$q$),
    ('Sam retires', 'refused', 'a0000000-0000-4000-8000-000000000002', $q$select public.retire_project('e9261aca-0a43-50a2-962d-9face40e695b', 'c')$q$),
    ('Zy resubmits his own Declined group project', 'ok', 'a0000000-0000-4000-8000-000000000003', $q$select public.resubmit_project('e9261aca-0a43-50a2-962d-9face40e695b')$q$),
    ('Zy retires it after the resubmission', 'refused', 'a0000000-0000-4000-8000-000000000003', $q$select public.retire_project('e9261aca-0a43-50a2-962d-9face40e695b', 'c')$q$),
    ('Zee inserts a decision', 'refused', 'a0000000-0000-4000-8000-000000000001', $q$insert into public.decisions (project_id, stage, outcome, comment, decision_date) values ('1badd089-2050-5c09-b4d9-a40b250a11df', 'endorsement', 'Endorsed', 'c', current_date)$q$),
    ('Zy inserts a decision', 'refused', 'a0000000-0000-4000-8000-000000000003', $q$insert into public.decisions (project_id, stage, outcome, comment, decision_date) values ('1badd089-2050-5c09-b4d9-a40b250a11df', 'endorsement', 'Endorsed', 'c', current_date)$q$),
    ('Zy edits a decision', 'none', 'a0000000-0000-4000-8000-000000000003', $q$update public.decisions set comment = 'x' where project_id = '1badd089-2050-5c09-b4d9-a40b250a11df'$q$),
    ('Zy deletes a decision', 'refused', 'a0000000-0000-4000-8000-000000000003', $q$delete from public.decisions where project_id = '1badd089-2050-5c09-b4d9-a40b250a11df'$q$),
    ('Zee deletes a project', 'refused', 'a0000000-0000-4000-8000-000000000001', $q$delete from public.projects where id = 'b0000000-0000-4000-8000-000000000001'$q$),
    ('Zy deletes a project', 'refused', 'a0000000-0000-4000-8000-000000000003', $q$delete from public.projects where id = 'b0000000-0000-4000-8000-000000000002'$q$),
    ('Zee inserts a history row', 'refused', 'a0000000-0000-4000-8000-000000000001', $q$insert into public.project_history (project_id, field, new_value) values ('1badd089-2050-5c09-b4d9-a40b250a11df', 'x', 'y')$q$),
    ('Zee inserts a 1000 figure', 'refused', 'a0000000-0000-4000-8000-000000000001', $q$insert into public.reference_figures (site_id, year, kind, scope12_tco2e) values ((select id from public.sites where code = '1000'), 2026, 'actual', 1)$q$),
    ('Zee updates a 1000 figure', 'none', 'a0000000-0000-4000-8000-000000000001', $q$update public.reference_figures set scope12_tco2e = 1 where id = '2d515415-efb2-54a4-a217-33a2df18708a'$q$),
    ('Zee inserts a 1200 figure (own)', 'ok', 'a0000000-0000-4000-8000-000000000001', $q$insert into public.reference_figures (site_id, year, kind, scope12_tco2e, water_withdrawal_m3) values ((select id from public.sites where code = '1200'), 2026, 'actual', 11900, 90000)$q$),
    ('Zee updates a 1200 figure (own)', 'ok', 'a0000000-0000-4000-8000-000000000001', $q$update public.reference_figures set water_withdrawal_m3 = 95000 where id = '38f8e1d6-34eb-52e8-ac5d-91abcc2cd3a2'$q$),
    ('Zee reads the history of her figure', 'some', 'a0000000-0000-4000-8000-000000000001', $q$read:select * from public.reference_figures_history where reference_figure_id = '38f8e1d6-34eb-52e8-ac5d-91abcc2cd3a2'$q$),
    ('Zee moves a figure to another site', 'refused', 'a0000000-0000-4000-8000-000000000001', $q$update public.reference_figures set site_id = (select id from public.sites where code = '1000') where id = '38f8e1d6-34eb-52e8-ac5d-91abcc2cd3a2'$q$),
    ('Sam updates a figure', 'none', 'a0000000-0000-4000-8000-000000000002', $q$update public.reference_figures set scope12_tco2e = 1 where id = '2d515415-efb2-54a4-a217-33a2df18708a'$q$),
    ('Sam inserts a figure', 'refused', 'a0000000-0000-4000-8000-000000000002', $q$insert into public.reference_figures (site_id, year, kind, scope12_tco2e) values ((select id from public.sites where code = '1000'), 2027, 'actual', 1)$q$),
    ('Zy inserts a figure for 1500 (any site)', 'ok', 'a0000000-0000-4000-8000-000000000003', $q$insert into public.reference_figures (site_id, year, kind, output_t) values ((select id from public.sites where code = '1500'), 2030, 'plan', 60000)$q$),
    ('Zy updates a 1000 figure (any site)', 'ok', 'a0000000-0000-4000-8000-000000000003', $q$update public.reference_figures set scope12_tco2e = 18500 where id = '2d515415-efb2-54a4-a217-33a2df18708a'$q$),
    ('Zee deletes a figure', 'refused', 'a0000000-0000-4000-8000-000000000001', $q$delete from public.reference_figures where id = '38f8e1d6-34eb-52e8-ac5d-91abcc2cd3a2'$q$),
    ('Zee updates a target', 'none', 'a0000000-0000-4000-8000-000000000001', $q$update public.targets set value = 50 where category = 'emissions'$q$),
    ('Sam updates a target', 'none', 'a0000000-0000-4000-8000-000000000002', $q$update public.targets set value = 50 where category = 'emissions'$q$),
    ('Zy updates a target value', 'ok', 'a0000000-0000-4000-8000-000000000003', $q$update public.targets set value = 45 where category = 'emissions'$q$),
    ('Zy changes a target category', 'refused', 'a0000000-0000-4000-8000-000000000003', $q$update public.targets set category = 'x' where category = 'emissions'$q$),
    ('Zee updates a site', 'none', 'a0000000-0000-4000-8000-000000000001', $q$update public.sites set city = 'x' where code = '1200'$q$),
    ('Zee inserts a site', 'refused', 'a0000000-0000-4000-8000-000000000001', $q$insert into public.sites (code, name, city, type) values ('1900', 'n', 'c', 't')$q$),
    ('Sam updates a site', 'none', 'a0000000-0000-4000-8000-000000000002', $q$update public.sites set city = 'x' where code = '1200'$q$),
    ('Zy renames a referenced site', 'refused', 'a0000000-0000-4000-8000-000000000003', $q$update public.sites set name = 'x' where code = '1000'$q$),
    ('Zy changes a site code', 'refused', 'a0000000-0000-4000-8000-000000000003', $q$update public.sites set code = '1999' where code = '1000'$q$),
    ('Zy deactivates a site', 'ok', 'a0000000-0000-4000-8000-000000000003', $q$update public.sites set active = false where code = '1600'$q$),
    ('Zy adds a site', 'ok', 'a0000000-0000-4000-8000-000000000003', $q$insert into public.sites (code, name, city, type) values ('1700', 'Werk Test', 'Test', 'Test')$q$),
    ('Zy deletes a site', 'refused', 'a0000000-0000-4000-8000-000000000003', $q$delete from public.sites where code = '1700'$q$),
    ('Zee changes her own role', 'none', 'a0000000-0000-4000-8000-000000000001', $q$update public.profiles set role = 'esg_lead' where email = 'z.hatquai@gmail.com'$q$),
    ('Zee changes her own site', 'none', 'a0000000-0000-4000-8000-000000000001', $q$update public.profiles set site_id = (select id from public.sites where code = '1000') where email = 'z.hatquai@gmail.com'$q$),
    ('Zee un-retires Dirk', 'none', 'a0000000-0000-4000-8000-000000000001', $q$update public.profiles set retired_at = null where email = 'dirk.sauer@ravensberg-cb.example'$q$),
    ('Sam inserts a profile', 'refused', 'a0000000-0000-4000-8000-000000000002', $q$insert into public.profiles (email, name, role) values ('x@example.com', 'x', 'cfo')$q$),
    ('Zy changes his own role', 'none', 'a0000000-0000-4000-8000-000000000003', $q$update public.profiles set role = 'cfo' where email = 'z.hatquai@sustainos.io'$q$),
    ('Zy changes another role directly', 'none', 'a0000000-0000-4000-8000-000000000003', $q$update public.profiles set role = 'cfo' where email = 'z.hatquai@gmail.com'$q$),
    ('Zy retires a user directly', 'none', 'a0000000-0000-4000-8000-000000000003', $q$update public.profiles set retired_at = now() where email = 'z.hatquai@gmail.com'$q$),
    ('Zy inserts a profile directly', 'refused', 'a0000000-0000-4000-8000-000000000003', $q$insert into public.profiles (email, name, role) values ('x@example.com', 'x', 'cfo')$q$),
    ('Zy deletes a profile', 'refused', 'a0000000-0000-4000-8000-000000000003', $q$delete from public.profiles where email = 'dirk.sauer@ravensberg-cb.example'$q$),
    ('Zee anonymises', 'refused', 'a0000000-0000-4000-8000-000000000001', $q$select public.anonymise_person('7d4eb238-4ce7-5cea-8a37-992881714c45', 'Dirk Sauer')$q$),
    ('Zy anonymises an active user', 'refused', 'a0000000-0000-4000-8000-000000000003', $q$select public.anonymise_person('e10eb550-21fc-58c5-82ed-d7abd6a4d03d', 'Anke Rieger')$q$),
    ('Zy anonymises himself', 'refused', 'a0000000-0000-4000-8000-000000000003', $q$select public.anonymise_person((select id from public.profiles where email = 'z.hatquai@sustainos.io'), 'Zyad Hatquai')$q$),
    ('Zy anonymises a retired user', 'ok', 'a0000000-0000-4000-8000-000000000003', $q$select public.anonymise_person('7d4eb238-4ce7-5cea-8a37-992881714c45', 'Dirk Sauer')$q$),
    ('after anonymisation no owner_name Dirk Sauer remains', 'none', 'a0000000-0000-4000-8000-000000000003', $q$read:select * from public.projects where owner_name = 'Dirk Sauer'$q$)
  ) v(label, expect, usr, sql) loop
    begin
      if r.usr = 'anon' then
        execute 'set local role anon';
      else
        perform set_config('request.jwt.claims', json_build_object('sub', r.usr, 'role', 'authenticated')::text, true);
        execute 'set local role authenticated';
      end if;
      if r.sql like 'read:%' then
        execute 'select count(*) from (' || substr(r.sql, 6) || ') q' into v_n;
        v_got := 'rows ' || v_n;
      else
        execute r.sql;
        get diagnostics v_n = row_count;
        v_got := 'ok ' || v_n;
      end if;
    exception when others then
      v_got := 'refused ' || sqlstate || ' ' || sqlerrm;
    end;
    execute 'reset role';
    perform set_config('request.jwt.claims', '', true);
    v_ok := case
      when r.expect = 'refused' then v_got like 'refused%'
      when r.expect = 'ok' then v_got like 'ok %' and v_got <> 'ok 0'
      when r.expect = 'none' then v_got in ('ok 0', 'rows 0')
      when r.expect = 'some' then v_got like 'rows %' and v_got <> 'rows 0'
      when r.expect like 'rows %' then v_got = r.expect
      else false end;
    insert into results (label, expected, got, ok) values (r.label, r.expect, left(v_got, 120), v_ok);
  end loop;
end $do$;

select n, ok, label, expected, got from results order by n;
rollback;
