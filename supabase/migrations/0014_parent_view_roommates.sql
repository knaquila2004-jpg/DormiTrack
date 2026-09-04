-- DormiTrack — a parent viewing ParentBoardingHouse.tsx's "Room Occupants"
-- tab needs to see the basic profile of students who share a room with
-- their linked student — distinct from the student-to-student roommate
-- policy (0013), since the viewer here is the parent, not a student.
create policy students_select_parent_roommate on public.students for select using (
  exists (
    select 1 from public.parent_student_links psl
    join public.student_assignments linked_sa on linked_sa.student_id = psl.student_id and linked_sa.is_current
    join public.student_assignments roommate_sa on roommate_sa.room_id = linked_sa.room_id and roommate_sa.is_current
    where psl.parent_id = auth.uid() and psl.status = 'linked' and roommate_sa.student_id = students.user_id
  )
);

create policy users_select_parent_roommate on public.users for select using (
  exists (
    select 1 from public.parent_student_links psl
    join public.student_assignments linked_sa on linked_sa.student_id = psl.student_id and linked_sa.is_current
    join public.student_assignments roommate_sa on roommate_sa.room_id = linked_sa.room_id and roommate_sa.is_current
    where psl.parent_id = auth.uid() and psl.status = 'linked' and roommate_sa.student_id = users.id
  )
);
