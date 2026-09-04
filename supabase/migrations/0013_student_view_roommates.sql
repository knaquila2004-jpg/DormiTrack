-- DormiTrack — students need to see their current roommates' basic profile
-- (StudentOccupants.tsx's "Your Roommates" list) — no existing policy
-- covered student-to-student visibility.
create policy students_select_roommate on public.students for select using (
  exists (
    select 1 from public.student_assignments mine
    join public.student_assignments theirs on theirs.room_id = mine.room_id and theirs.is_current and mine.is_current
    where mine.student_id = auth.uid() and theirs.student_id = students.user_id
  )
);

create policy users_select_roommate on public.users for select using (
  exists (
    select 1 from public.student_assignments mine
    join public.student_assignments theirs on theirs.room_id = mine.room_id and theirs.is_current and mine.is_current
    where mine.student_id = auth.uid() and theirs.student_id = users.id
  )
);
