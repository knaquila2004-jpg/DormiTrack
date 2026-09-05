-- DormiTrack — real bug: StudentOccupants.tsx's "Occupants" tab (My Dorm) has
-- always called registrationStore.ts's getRoommates(), which queries FROM
-- student_assignments (embedding students/users for each roommate's name,
-- program, year, block, photo). 0013/0015 already fixed student-to-student
-- visibility on the students and users tables (shares_room_with(), a
-- SECURITY DEFINER helper) — but never added the matching policy on
-- student_assignments itself, the table the query actually starts from. RLS
-- filters that base table before the nested students/users embeds are even
-- considered, so a roommate's row was excluded right at the source regardless
-- of the other two tables being fixed — the roommate card never showed up at
-- all, no matter how many roommates a student actually had. Confirmed live
-- against two real students sharing a room before writing this (their
-- assignment rows are mutually invisible under the current policies).
create policy sa_select_roommate on public.student_assignments for select
  using (is_current and public.shares_room_with(student_id));
