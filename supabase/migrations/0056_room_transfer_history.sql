-- DormiTrack — the landlord's Occupants page shows a "Transfers" stat per
-- occupant (LandlordOccupants.tsx) but it was always hardcoded to 0: nothing
-- ever recorded that a real transfer happened, whether it came from the
-- landlord's own direct "Transfer Room" quick action or a student-requested
-- one the landlord approved (room_transfer_requests, 0051). Both paths
-- already funnel through the same transfer_student_room() RPC (0049), so
-- logging happens once, there, instead of being duplicated (and easy to
-- miss) at each call site.
create table public.room_transfer_history (
  id                 uuid primary key default gen_random_uuid(),
  student_id         uuid not null references public.students(user_id) on delete cascade,
  boarding_house_id  uuid not null references public.boarding_houses(id) on delete cascade,
  from_room_id       uuid not null references public.rooms(id),
  from_bed_id        uuid not null references public.beds(id),
  to_room_id         uuid not null references public.rooms(id),
  to_bed_id          uuid not null references public.beds(id),
  transferred_at     timestamptz not null default now()
);
create index rth_student_idx on public.room_transfer_history(student_id);
create index rth_bh_idx on public.room_transfer_history(boarding_house_id);

alter table public.room_transfer_history enable row level security;
create policy rth_select_own on public.room_transfer_history for select using (student_id = auth.uid());
create policy rth_select_landlord on public.room_transfer_history for select using (public.owns_boarding_house(boarding_house_id));
create policy rth_select_parent on public.room_transfer_history for select using (public.is_linked_parent_of(student_id));
create policy rth_select_admin on public.room_transfer_history for select using (public.current_role() = 'admin');
-- No insert policy for authenticated roles — only transfer_student_room()
-- itself (security definer) ever writes here.

create or replace function public.transfer_student_room(p_student_id uuid, p_new_room_id uuid, p_new_bed_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  a record;
  v_new_bed_status text;
  v_new_bed_room_id uuid;
begin
  select * into a from public.student_assignments where student_id = p_student_id and is_current = true;
  if a is null then
    raise exception 'No current assignment found for this student';
  end if;
  if not public.owns_boarding_house(a.boarding_house_id) then
    raise exception 'Not authorized to transfer this occupant';
  end if;

  select status, room_id into v_new_bed_status, v_new_bed_room_id from public.beds where id = p_new_bed_id for update;
  if v_new_bed_status is null then
    raise exception 'Destination bed not found';
  end if;
  if v_new_bed_room_id <> p_new_room_id then
    raise exception 'Destination bed does not belong to that room';
  end if;
  if v_new_bed_status <> 'available' then
    raise exception 'This bed is no longer available. Please choose another.';
  end if;
  if not exists (select 1 from public.rooms where id = p_new_room_id and boarding_house_id = a.boarding_house_id) then
    raise exception 'Destination room is not in this student''s boarding house';
  end if;
  if p_new_bed_id = a.bed_id then
    raise exception 'Student is already assigned to this bed';
  end if;

  insert into public.room_transfer_history (student_id, boarding_house_id, from_room_id, from_bed_id, to_room_id, to_bed_id)
  values (p_student_id, a.boarding_house_id, a.room_id, a.bed_id, p_new_room_id, p_new_bed_id);

  update public.beds set status = 'available' where id = a.bed_id;
  update public.beds set status = 'occupied' where id = p_new_bed_id;
  update public.student_assignments set room_id = p_new_room_id, bed_id = p_new_bed_id where id = a.id;
end;
$$;
grant execute on function public.transfer_student_room(uuid, uuid, uuid) to authenticated;
