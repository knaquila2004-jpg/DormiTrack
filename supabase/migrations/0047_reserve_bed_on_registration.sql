-- DormiTrack — real bug: a boarding house's "available rooms/beds" count (shown
-- on the student's Browse Boarding Houses cards, and gating which rooms/beds
-- can even be selected in BoardingReg.tsx) was only ever computed from
-- beds.status = 'occupied'. A bed only ever flipped to 'occupied' once the
-- landlord APPROVED a registration — while a registration sat 'pending', the
-- bed it referenced stayed 'available' the entire time. So two students could
-- both see (and both submit for) the exact same "last" bed: the second one's
-- card still said "1 available" right up until they opened it, at which point
-- the room legitimately had zero free beds — not stale data, a real modeling
-- gap. The schema already had a 'reserved' bed status for exactly this
-- (0001_schema.sql's beds.status check), and BoardingReg.tsx's own bed picker
-- already renders a 'reserved' state distinctly — nothing ever actually set it.
--
-- This migration is the real fix: submitting a registration now reserves the
-- bed atomically (with the same insert), so a second student's view reflects
-- it immediately and a genuinely-conflicting second submission is rejected
-- server-side rather than silently succeeding. Rejecting a registration
-- releases the bed back to 'available'; approving (already existed, 0010)
-- flips 'reserved' straight to 'occupied'.
create function public.submit_boarding_registration(
  p_boarding_house_id uuid, p_room_id uuid, p_bed_id uuid,
  p_move_in date, p_move_out date, p_stay_unit text, p_stay_count int,
  p_traits text[] default '{}', p_hobbies text[] default '{}', p_lifestyle text[] default '{}',
  p_notes text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_bed_status text;
  v_reg_id uuid;
begin
  select status into v_bed_status from public.beds where id = p_bed_id for update;
  if v_bed_status is null then
    raise exception 'Bed not found';
  end if;
  if v_bed_status <> 'available' then
    raise exception 'This bed is no longer available. Please choose another.';
  end if;

  insert into public.student_boarding_registrations (
    student_id, boarding_house_id, room_id, bed_id, move_in, move_out, stay_unit, stay_count, traits, hobbies, lifestyle, notes
  ) values (
    auth.uid(), p_boarding_house_id, p_room_id, p_bed_id, p_move_in, p_move_out, p_stay_unit, p_stay_count,
    coalesce(p_traits, '{}'), coalesce(p_hobbies, '{}'), coalesce(p_lifestyle, '{}'), p_notes
  ) returning id into v_reg_id;

  update public.beds set status = 'reserved' where id = p_bed_id;

  return v_reg_id;
end;
$$;
grant execute on function public.submit_boarding_registration(uuid,uuid,uuid,date,date,text,int,text[],text[],text[],text) to authenticated;

-- Releasing a rejected request's hold on its bed — the one real gap in the
-- existing reject_registration (0010): it never touched bed status at all,
-- which was harmless only because nothing ever reserved a bed in the first
-- place. Guarded on status='reserved' so this can never accidentally free an
-- already-occupied bed.
create or replace function public.reject_registration(p_registration_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  reg record;
begin
  select * into reg from public.student_boarding_registrations where id = p_registration_id;
  if reg is null then
    raise exception 'Registration not found';
  end if;
  if not public.owns_boarding_house(reg.boarding_house_id) then
    raise exception 'Not authorized to reject this registration';
  end if;
  if reg.status <> 'pending' then
    raise exception 'Registration is not pending';
  end if;

  update public.student_boarding_registrations
    set status = 'rejected', decided_at = now(), decided_by = auth.uid()
    where id = p_registration_id;

  update public.beds set status = 'available' where id = reg.bed_id and status = 'reserved';
end;
$$;
