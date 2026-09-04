-- DormiTrack — Phase 4: landlord "Remove Occupant" action — ends the
-- student's current assignment for real (frees the bed) instead of just
-- dropping them from a local list.
create function public.end_occupancy(p_student_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  a record;
begin
  select * into a from public.student_assignments where student_id = p_student_id and is_current = true;
  if a is null then
    raise exception 'No current assignment found for this student';
  end if;
  if not public.owns_boarding_house(a.boarding_house_id) then
    raise exception 'Not authorized to end this occupancy';
  end if;

  update public.student_assignments set is_current = false, moved_out_at = current_date where id = a.id;
  update public.beds set status = 'available' where id = a.bed_id;
end;
$$;
grant execute on function public.end_occupancy(uuid) to authenticated;
