-- Remove one test project, every version, from the live tables.
-- Platform owner only, in the Supabase SQL Editor (the app has no delete; the DELETE grant is revoked from it).
-- 1. Put the project code in v_code below.  2. Run the whole script.  3. Delete the folders the last query lists
--    in Storage → presentations by hand (a row deleted from storage.objects by SQL would hide the file, not free it).
-- The demo portfolio (PRJ-0001 to PRJ-0037) is never removed this way: that is supabase/demo-reset.sql.

do $$
declare
  v_code text := 'PRJ-0038';   -- the project to remove, every version of it
  v_ids uuid[];
  v_history int;
  v_decisions int;
  v_versions int := 0;
  v_rows int;
begin
  if v_code <= 'PRJ-0037' then
    raise exception '% is part of the demo portfolio; use supabase/demo-reset.sql', v_code;
  end if;
  select array_agg(id) into v_ids from public.projects where project_code = v_code;
  if v_ids is null then
    raise exception 'no project carries the code %', v_code;
  end if;

  delete from public.project_history where project_id = any (v_ids);
  get diagnostics v_history = row_count;
  delete from public.decisions where project_id = any (v_ids);
  get diagnostics v_decisions = row_count;

  -- newest version first: a later version references the one it supersedes
  loop
    delete from public.projects p
    where p.id = any (v_ids)
      and not exists (select 1 from public.projects q where q.supersedes_project_id = p.id);
    get diagnostics v_rows = row_count;
    exit when v_rows = 0;
    v_versions := v_versions + v_rows;
  end loop;

  -- the next registration takes the code after the highest one left (the demo baseline: PRJ-0038)
  perform setval('public.project_code_seq', (select coalesce(max(substring(project_code from 5)::int), 0) from public.projects), true);

  raise notice 'removed %: % history rows, % decisions, % versions', v_code, v_history, v_decisions, v_versions;
end $$;

-- What is left, and which bucket folders to delete by hand in the dashboard.
select
  (select count(*) from public.projects) as projects,
  (select count(*) from public.decisions) as decisions,
  (select count(*) from public.project_history) as history,
  'PRJ-' || lpad(((select last_value from public.project_code_seq) + 1)::text, 4, '0') as next_project_code,
  (select string_agg(split_part(o.name, '/', 1), ', ')
     from storage.objects o
    where o.bucket_id = 'presentations'
      and not exists (select 1 from public.projects p where p.id::text = split_part(o.name, '/', 1))) as bucket_folders_to_delete_by_hand;
