-- Access phase, part 2 of 3: the policies of docs/access-matrix.md §6 (reads and plain writes).
-- Every status change and comment-bearing edit is a narrow function (part 3). anon has no policy and no grant.
-- "Me" is the caller's active profile (current_profile_id); a login without a profile, or a retired one, matches nothing.

-- sites, targets: every active profile reads all rows (line 41); the ESG lead creates, updates, deactivates (line 42); others nothing (43)
create policy sites_read on public.sites for select to authenticated using (public.current_profile_id() is not null);
create policy sites_insert_esg on public.sites for insert to authenticated with check (public.is_esg_lead());
create policy sites_update_esg on public.sites for update to authenticated using (public.is_esg_lead()) with check (public.is_esg_lead());
create policy targets_read on public.targets for select to authenticated using (public.current_profile_id() is not null);
create policy targets_insert_esg on public.targets for insert to authenticated with check (public.is_esg_lead());
create policy targets_update_esg on public.targets for update to authenticated using (public.is_esg_lead()) with check (public.is_esg_lead());

-- profiles: a site user reads own site's profiles plus the ESG lead's; CFO and ESG lead read all (lines 35, 36); no write policy (37)
create policy profiles_read on public.profiles for select to authenticated using (
  public.is_esg_lead() or public.is_cfo()
  or (public.my_site_id() is not null and (site_id = public.my_site_id() or role = 'esg_lead'))
);

-- reference_figures: site user own site (27, 29, 31); CFO reads all (28, 32); ESG lead reads, creates and updates any (28, 30)
create policy reference_figures_read on public.reference_figures for select to authenticated using (
  public.is_esg_lead() or public.is_cfo() or (public.my_site_id() is not null and site_id = public.my_site_id())
);
create policy reference_figures_insert on public.reference_figures for insert to authenticated with check (
  public.is_esg_lead() or (public.my_site_id() is not null and site_id = public.my_site_id())
);
create policy reference_figures_update on public.reference_figures for update to authenticated
  using (public.is_esg_lead() or (public.my_site_id() is not null and site_id = public.my_site_id()))
  with check (public.is_esg_lead() or (public.my_site_id() is not null and site_id = public.my_site_id()));

-- reference_figures_history: read follows the figure (34); written by its trigger only
create policy reference_figures_history_read on public.reference_figures_history for select to authenticated using (
  exists (select 1 from public.reference_figures r where r.id = reference_figure_id)
);

-- projects: site user own site (3, 5, 8); CFO reads all (4, 7); ESG lead reads all, creates group projects, edits own group projects while Potential (4, 6, 9)
create policy projects_read on public.projects for select to authenticated using (
  public.is_esg_lead() or public.is_cfo() or (public.my_site_id() is not null and site_id = public.my_site_id())
);
create policy projects_insert on public.projects for insert to authenticated with check (
  status = 'Potential' and version = 1 and supersedes_project_id is null and (
    (public.my_site_id() is not null and scope = 'site' and site_id = public.my_site_id())
    or (public.is_esg_lead() and scope = 'group' and site_id is null)
  )
);
create policy projects_update_potential on public.projects for update to authenticated
  using (status = 'Potential' and ((public.my_site_id() is not null and site_id = public.my_site_id()) or (public.is_esg_lead() and scope = 'group')))
  with check (status = 'Potential' and ((public.my_site_id() is not null and site_id = public.my_site_id()) or (public.is_esg_lead() and scope = 'group')));

-- decisions: read follows the project (22, 23); written only inside the transition functions (24)
create policy decisions_read on public.decisions for select to authenticated using (
  exists (select 1 from public.projects p where p.id = project_id)
);

-- project_history: read follows the project (25); written by its trigger only (26)
create policy project_history_read on public.project_history for select to authenticated using (
  exists (select 1 from public.projects p where p.id = project_id)
);
