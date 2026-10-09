-- Half B finding (builder, 9 Oct 2026): a target change affects the whole organisation, so every change from a session
-- carries its reason. The reason lives on the row (change_comment, with updated_by and updated_at); the trigger refuses a
-- change without a fresh comment. Matrix §6 line 42 (ESG lead updates targets) stays the only write rule.
alter table public.targets add column if not exists change_comment text;
comment on column public.targets.change_comment is 'the reason given for the latest change; required on every change from a session';

create or replace function public.targets_protect()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := public.current_profile_id();
begin
  if tg_op = 'UPDATE' and new.category is distinct from old.category then
    raise exception 'a target category never changes' using errcode = '42501';
  end if;
  if not public.app_write_allowed() then
    if tg_op = 'UPDATE' and (new.value is distinct from old.value or new.base_year is distinct from old.base_year
       or new.target_year is distinct from old.target_year or new.active is distinct from old.active) then
      if new.change_comment is null or length(trim(new.change_comment)) = 0 or new.change_comment is not distinct from old.change_comment then
        raise exception 'a target change needs its reason: give a comment for this change' using errcode = '22023';
      end if;
    end if;
    if tg_op = 'INSERT' and (new.change_comment is null or length(trim(new.change_comment)) = 0) then
      raise exception 'a new target needs a comment' using errcode = '22023';
    end if;
  end if;
  if v_me is not null then
    new.updated_by := v_me;
    if tg_op = 'INSERT' then new.set_by := v_me; end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
