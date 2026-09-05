-- DormiTrack — landlord-initiated "Update Status" (LandlordOccupants.tsx) now
-- carries a real note ("please move out by this date because...") and the
-- student needs to be able to tap the resulting notification and see the
-- actual details in a modal, not just land on a generic screen. That requires
-- a real record to fetch by id (a notification's relatedId), distinct from
-- stay_change_requests (a student's own proposal the landlord approves/rejects)
-- — this is the landlord directly setting the schedule, so it gets its own
-- table and its own notification type rather than overloading "stay-change".
create table public.occupant_status_updates (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users(id) on delete cascade,
  boarding_house_id uuid not null references public.boarding_houses(id) on delete cascade,
  move_out date, -- null = the landlord cleared a previously scheduled move-out ("Active" again)
  note text,
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now()
);

alter table public.occupant_status_updates enable row level security;
create policy osu_select_student on public.occupant_status_updates for select using (student_id = auth.uid());
create policy osu_select_landlord on public.occupant_status_updates for select using (public.owns_boarding_house(boarding_house_id));
create policy osu_select_parent on public.occupant_status_updates for select using (public.is_linked_parent_of(student_id));
create policy osu_insert_landlord on public.occupant_status_updates for insert
  with check (public.owns_boarding_house(boarding_house_id) and created_by = auth.uid());

-- New notification type for this feature, same reason "visitor"/"stay-change"
-- needed 0045/0046: the type column's CHECK constraint enumerates every
-- allowed value.
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'account','boarding-house','room','payment','check-in','check-out',
  'report','announcement','verification','system','message','visitor','stay-change','status-update'
));
