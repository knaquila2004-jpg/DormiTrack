-- DormiTrack — "My Dorm" (StudentOccupants.tsx) had a real Move-In/Move-Out/
-- Duration request flow (stay_change_requests, 0046) but no equivalent for a
-- student who wants to move to a *different room/bed* within the same
-- boarding house — this is that: a student proposes a specific destination
-- bed (from the same real available-bed list the landlord's own "Transfer
-- Room" quick action already offers, LandlordOccupants.tsx/0049), the
-- landlord reviews it in that occupant's profile (same place stay-change
-- requests already render), and only on approval does the real transfer
-- happen — reusing transfer_student_room (0049) so the same atomic
-- bed-availability guard applies (a bed someone else took in the meantime
-- can't be double-booked just because a request for it is pending).
--
-- Learned from a real gap found in stay_change_requests (0046): it has no
-- "parent can see this" policy at all, so a linked parent can't see their
-- child's pending/decided stay-change requests. This table gets that policy
-- from the start.
create table public.room_transfer_requests (
  id                 uuid primary key default gen_random_uuid(),
  student_id         uuid not null references public.students(user_id) on delete cascade,
  assignment_id      uuid not null references public.student_assignments(id) on delete cascade,
  boarding_house_id  uuid not null references public.boarding_houses(id) on delete cascade,
  current_room_id    uuid not null references public.rooms(id),
  current_bed_id     uuid not null references public.beds(id),
  requested_room_id  uuid not null references public.rooms(id),
  requested_bed_id   uuid not null references public.beds(id),
  student_note       text,
  status             text not null default 'pending' check (status in ('pending','approved','rejected')),
  landlord_note      text,
  created_at         timestamptz not null default now(),
  decided_at         timestamptz
);
create index rtr_student_idx on public.room_transfer_requests(student_id);
create index rtr_bh_idx on public.room_transfer_requests(boarding_house_id);

alter table public.room_transfer_requests enable row level security;
create policy rtr_select_own on public.room_transfer_requests for select using (student_id = auth.uid());
create policy rtr_select_landlord on public.room_transfer_requests for select using (public.owns_boarding_house(boarding_house_id));
create policy rtr_select_parent on public.room_transfer_requests for select using (public.is_linked_parent_of(student_id));
create policy rtr_select_admin on public.room_transfer_requests for select using (public.current_role() = 'admin');
create policy rtr_insert_own on public.room_transfer_requests for insert with check (student_id = auth.uid());
create policy rtr_update_landlord on public.room_transfer_requests for update using (public.owns_boarding_house(boarding_house_id)) with check (public.owns_boarding_house(boarding_house_id));
