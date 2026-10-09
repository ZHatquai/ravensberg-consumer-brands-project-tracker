-- Half B finding (builder, 9 Oct 2026): a committee decision never carries a date in the future.
-- "Today" is the company's day (Europe/Berlin), so a decision recorded late in the evening is still today.
create or replace function public.record_committee_decision(p_project uuid, p_outcome text, p_comment text, p_attendees text, p_decision_date date)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public.require_esg_lead(); v_c text := public.require_comment(p_comment); v_p public.projects;
begin
  if p_outcome not in ('Approved', 'Declined') then raise exception 'the committee outcome is Approved or Declined' using errcode = '22023'; end if;
  if p_attendees is null or length(trim(p_attendees)) = 0 then raise exception 'the people in the room are required' using errcode = '22023'; end if;
  if p_decision_date is null then raise exception 'the decision date is required' using errcode = '22023'; end if;
  if p_decision_date > (now() at time zone 'Europe/Berlin')::date then raise exception 'the decision date cannot be in the future' using errcode = '22023'; end if;
  perform public.begin_narrow(v_c);
  v_p := public.lock_project(p_project);
  if v_p.status <> 'Pending approval' then raise exception 'only a Pending approval project gets a committee decision' using errcode = '42501'; end if;
  perform public.write_decision(p_project, 'committee', p_outcome, v_c, trim(p_attendees), p_decision_date, v_me);
  update public.projects set status = p_outcome where id = p_project;
  return p_project;
end $$;
