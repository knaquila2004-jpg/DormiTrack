-- DormiTrack — Phase 4: landlord approve/reject registration RPCs.
-- Runs the whole approval as one atomic transaction (status update + real
-- occupancy assignment + bed status flip) under SECURITY DEFINER, so the
-- double-booking guard (student_assignments' partial unique indexes, see
-- 0001_schema.sql) is the actual enforcement point — a second approval
-- racing for the same bed/student fails here with a unique_violation
-- instead of silently corrupting occupancy data.

create function public.approve_registration(p_registration_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  reg record;
begin
  select * into reg from public.student_boarding_registrations where id = p_registration_id;
  if reg is null then
    raise exception 'Registration not found';
  end if;
  if not public.owns_boarding_house(reg.boarding_house_id) then
    raise exception 'Not authorized to approve this registration';
  end if;
  if reg.status <> 'pending' then
    raise exception 'Registration is not pending';
  end if;

  update public.student_boarding_registrations
    set status = 'approved', decided_at = now(), decided_by = auth.uid()
    where id = p_registration_id;

  insert into public.student_assignments (student_id, boarding_house_id, room_id, bed_id, registration_id, moved_in_at, is_current)
    values (reg.student_id, reg.boarding_house_id, reg.room_id, reg.bed_id, reg.id, coalesce(reg.move_in, current_date), true);

  update public.beds set status = 'occupied' where id = reg.bed_id;
end;
$$;
grant execute on function public.approve_registration(uuid) to authenticated;

create function public.reject_registration(p_registration_id uuid) returns void
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
end;
$$;
grant execute on function public.reject_registration(uuid) to authenticated;
