-- DormiTrack — Phase 4: landlords need to see basic profile info for a
-- student who has an outstanding registration at their boarding house, even
-- before it's approved (no student_assignments row exists yet at that point,
-- so the existing "landlord sees assigned occupants" policies don't cover
-- this — same chicken-and-egg shape as the parent-linking lookup fixed in
-- 0005_find_student_rpc.sql).
create policy students_select_landlord_applicant on public.students for select using (
  exists (
    select 1 from public.student_boarding_registrations sbr
    where sbr.student_id = students.user_id and public.owns_boarding_house(sbr.boarding_house_id)
  )
);

create policy users_select_landlord_applicant on public.users for select using (
  public.current_role() = 'landlord' and exists (
    select 1 from public.student_boarding_registrations sbr
    where sbr.student_id = users.id and public.owns_boarding_house(sbr.boarding_house_id)
  )
);
