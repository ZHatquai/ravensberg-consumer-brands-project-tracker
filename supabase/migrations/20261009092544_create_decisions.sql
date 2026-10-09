-- decisions: one row per decision taken on a project (endorsement, committee, decline, obsolete).
create table public.decisions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id),
  stage text not null check (stage in ('endorsement', 'committee', 'decline', 'obsolete')),
  outcome text not null check (outcome in ('Endorsed', 'Approved', 'Declined', 'Obsolete')),
  comment text not null check (length(trim(comment)) > 0),
  attendees text, -- people in the room; required for committee decisions
  decision_date date not null,
  recorded_by uuid references public.profiles (id),
  recorded_at timestamptz not null default now(),
  status text not null default 'active',
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now(),
  constraint decisions_outcome_fits_stage check (
    (stage = 'endorsement' and outcome = 'Endorsed') or
    (stage = 'committee' and outcome in ('Approved', 'Declined')) or
    (stage = 'decline' and outcome = 'Declined') or
    (stage = 'obsolete' and outcome = 'Obsolete')
  ),
  constraint decisions_committee_names_attendees check (stage <> 'committee' or length(trim(coalesce(attendees, ''))) > 0)
);
comment on table public.decisions is 'Every decision on a project, with comment, date, people in the room and who recorded it.';

alter table public.decisions enable row level security;
revoke all on table public.decisions from anon;
