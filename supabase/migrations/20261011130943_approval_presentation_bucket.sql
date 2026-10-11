-- v1.3 (builder decision, 11 Oct 2026), part 2 of 2: the bucket and its policies on storage.objects.
-- docs/access-matrix.md §1 storage buckets, §5 v1.3 delta, policy plan lines 50 to 55. Private, PowerPoint only, 20 MB,
-- one object per project version under <project id>/presentation.pptx. No policy for anon, no DELETE policy for anyone:
-- RLS on storage.objects is on (Supabase default) and denies whatever no policy allows. The grants on storage.objects
-- are Supabase's own and stay as they are; with no policy, anon reads nothing and the private bucket has no public URL.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('presentations', 'presentations', false, 20971520,
        array['application/vnd.openxmlformats-officedocument.presentationml.presentation']);

-- The owner of a version may put its one file in place while the version is Potential and requires a presentation.
-- Invoker: it reads projects under the caller's own read policy (a site user sees their site, the ESG lead everything).
create or replace function public.presentation_upload_allowed(p_name text)
returns boolean language sql stable set search_path = '' as $$
  select exists (
    select 1 from public.projects p
    where p_name = public.presentation_key(p.id)
      and p.status = 'Potential' and p.presentation_required
      and ((p.scope = 'group' and public.is_esg_lead()) or (p.site_id is not null and p.site_id = public.my_site_id()))
  )
$$;
revoke all on function public.presentation_upload_allowed(text) from public, anon;
grant execute on function public.presentation_upload_allowed(text) to authenticated;

-- line 52: read (the download through a signed URL) follows the project: the projects read policy applies inside the subquery
create policy presentations_read on storage.objects for select to authenticated
  using (bucket_id = 'presentations' and exists (select 1 from public.projects p where name = public.presentation_key(p.id)));
-- line 50: upload
create policy presentations_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'presentations' and public.presentation_upload_allowed(name));
-- line 51: replace (an upload with upsert updates the object row; upsert needs SELECT, INSERT and UPDATE)
create policy presentations_replace on storage.objects for update to authenticated
  using (bucket_id = 'presentations' and public.presentation_upload_allowed(name))
  with check (bucket_id = 'presentations' and public.presentation_upload_allowed(name));
-- lines 53 to 55: no policy for anon, no DELETE policy; the bucket is private
