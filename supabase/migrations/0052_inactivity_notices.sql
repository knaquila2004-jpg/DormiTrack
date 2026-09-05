-- DormiTrack — landlord's Occupants page ("status statistics of the occupants")
-- had no way to flag a student who's stopped using the app at all: the
-- Check-In/Check-Out feature (check_in_out_records) is the only real,
-- unambiguous "the student is actively using this" signal already in the
-- schema, so a student with no real check-in/out for 3+ days (or who has
-- never once used it since move-in) is treated as inactive. Detection runs
-- client-side (LandlordOccupants.tsx, whenever the landlord's own roster +
-- check-in/out activity are both loaded) since this app has no server-side
-- job runner — this table is what makes that idempotent: a notice (and the
-- landlord/student/parent notifications that go with it) is only ever
-- created once per distinct inactivity gap, keyed on the student's actual
-- last real activity timestamp, so re-checking on every page load doesn't
-- spam duplicate notifications.
create table public.inactivity_notices (
  id                 uuid primary key default gen_random_uuid(),
  student_id         uuid not null references public.students(user_id) on delete cascade,
  boarding_house_id  uuid not null references public.boarding_houses(id) on delete cascade,
  last_activity_at   timestamptz not null,
  days_inactive      int not null,
  created_at         timestamptz not null default now()
);
create index inact_student_idx on public.inactivity_notices(student_id);
create index inact_bh_idx on public.inactivity_notices(boarding_house_id);

alter table public.inactivity_notices enable row level security;
create policy inact_select_own on public.inactivity_notices for select using (student_id = auth.uid());
create policy inact_select_landlord on public.inactivity_notices for select using (public.owns_boarding_house(boarding_house_id));
create policy inact_select_parent on public.inactivity_notices for select using (public.is_linked_parent_of(student_id));
create policy inact_select_admin on public.inactivity_notices for select using (public.current_role() = 'admin');
-- Only the landlord's own client ever detects/records this (it's their roster +
-- check-in/out data driving the check) — same authorization shape as every
-- other landlord-write table in this schema.
create policy inact_insert_landlord on public.inactivity_notices for insert with check (public.owns_boarding_house(boarding_house_id));

-- New notification type for this feature, same reason "visitor"/"stay-change"/
-- "status-update" needed their own migrations: the type column's CHECK
-- constraint enumerates every allowed value.
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'account','boarding-house','room','payment','check-in','check-out',
  'report','announcement','verification','system','message','visitor','stay-change','status-update','inactivity'
));
