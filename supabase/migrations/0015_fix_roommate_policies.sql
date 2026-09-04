-- DormiTrack — fix: 0013/0014's roommate-visibility policies referenced
-- student_assignments directly inside the policy body. That subquery runs
-- under the querying user's own RLS, and student_assignments' own policies
-- don't let a student see a DIFFERENT student's assignment row — so the
-- EXISTS(...) was always false and the "can see my roommate" policies never
-- actually matched (verified: real query returned 0 rows). Same class of
-- bug the SECURITY DEFINER helpers elsewhere in this schema exist to avoid;
-- missed it for these two. Wrapping the same logic in SECURITY DEFINER
-- functions bypasses that recursion correctly.

create function public.shares_room_with(p_other_student_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.student_assignments mine
    join public.student_assignments theirs on theirs.room_id = mine.room_id and theirs.is_current and mine.is_current
    where mine.student_id = auth.uid() and theirs.student_id = p_other_student_id
  );
$$;

create function public.parent_linked_student_shares_room_with(p_other_student_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.parent_student_links psl
    join public.student_assignments linked_sa on linked_sa.student_id = psl.student_id and linked_sa.is_current
    join public.student_assignments roommate_sa on roommate_sa.room_id = linked_sa.room_id and roommate_sa.is_current
    where psl.parent_id = auth.uid() and psl.status = 'linked' and roommate_sa.student_id = p_other_student_id
  );
$$;

drop policy students_select_roommate on public.students;
create policy students_select_roommate on public.students for select using (
  public.shares_room_with(students.user_id)
);

drop policy users_select_roommate on public.users;
create policy users_select_roommate on public.users for select using (
  public.shares_room_with(users.id)
);

drop policy students_select_parent_roommate on public.students;
create policy students_select_parent_roommate on public.students for select using (
  public.parent_linked_student_shares_room_with(students.user_id)
);

drop policy users_select_parent_roommate on public.users;
create policy users_select_parent_roommate on public.users for select using (
  public.parent_linked_student_shares_room_with(users.id)
);
