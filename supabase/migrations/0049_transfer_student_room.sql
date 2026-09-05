-- DormiTrack — landlord's "Transfer Room" quick action (LandlordOccupants.tsx's
-- OccupantProfileModal) was a dead button (action: () => {}). This is the real
-- move: same atomicity concern as 0047's bed-reservation fix — flipping two
-- beds' status and repointing the assignment must happen together, or a
-- concurrent registration/transfer could double-book the destination bed.
-- Scope: a transfer only ever moves a student to another room/bed within the
-- SAME boarding house they're already in (their existing assignment already
-- proves that boarding house is this landlord's — the same authorization
-- check end_occupancy/reject_registration already use).
create function public.transfer_student_room(p_student_id uuid, p_new_room_id uuid, p_new_bed_id uuid) returns void
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

  update public.beds set status = 'available' where id = a.bed_id;
  update public.beds set status = 'occupied' where id = p_new_bed_id;
  update public.student_assignments set room_id = p_new_room_id, bed_id = p_new_bed_id where id = a.id;
end;
$$;
grant execute on function public.transfer_student_room(uuid, uuid, uuid) to authenticated;
