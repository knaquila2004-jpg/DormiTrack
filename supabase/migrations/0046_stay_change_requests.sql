-- DormiTrack — "Your Assignment" on the student's My Dorm page (Move-in Date /
-- Move-out Date / Stay Duration) has always been 100% read-only, sourced from
-- student_assignments.moved_in_at and the linked student_boarding_registrations
-- row's move_out/stay_unit/stay_count. Those are official records the landlord
-- controls, so a student can't just overwrite them directly — this is a real
-- request/approval workflow: the student proposes new values, the landlord gets
-- notified and reviews them (in the occupant's own profile, same place
-- check-in/check-out notifications already deep-link to), and only on approval
-- do the real student_assignments/student_boarding_registrations rows actually
-- change (both already grant the landlord UPDATE via sa_write_landlord /
-- sbr_update_landlord in 0003_rls.sql — no new policy needed for those two).
create table public.stay_change_requests (
  id                    uuid primary key default gen_random_uuid(),
  student_id            uuid not null references public.students(user_id) on delete cascade,
  assignment_id         uuid not null references public.student_assignments(id) on delete cascade,
  registration_id       uuid references public.student_boarding_registrations(id),
  boarding_house_id     uuid not null references public.boarding_houses(id) on delete cascade,
  current_move_in       date not null,
  current_move_out      date,
  current_stay_unit     text,
  current_stay_count    int,
  requested_move_in     date not null,
  requested_move_out    date,
  requested_stay_unit   text check (requested_stay_unit in ('Weeks','Months')),
  requested_stay_count  int check (requested_stay_count > 0),
  student_note          text,
  status                text not null default 'pending' check (status in ('pending','approved','rejected')),
  landlord_note         text,
  created_at            timestamptz not null default now(),
  decided_at            timestamptz
);
create index scr_student_idx on public.stay_change_requests(student_id);
create index scr_bh_idx on public.stay_change_requests(boarding_house_id);

alter table public.stay_change_requests enable row level security;
create policy scr_select_own on public.stay_change_requests for select using (student_id = auth.uid());
create policy scr_select_landlord on public.stay_change_requests for select using (public.owns_boarding_house(boarding_house_id));
create policy scr_select_admin on public.stay_change_requests for select using (public.current_role() = 'admin');
create policy scr_insert_own on public.stay_change_requests for insert with check (student_id = auth.uid());
create policy scr_update_landlord on public.stay_change_requests for update using (public.owns_boarding_house(boarding_house_id)) with check (public.owns_boarding_house(boarding_house_id));

-- New notification type for this feature, same reason "visitor" needed 0045: the
-- type column's CHECK constraint enumerates every allowed value.
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'account','boarding-house','room','payment','check-in','check-out',
  'report','announcement','verification','system','message','visitor','stay-change'
));
