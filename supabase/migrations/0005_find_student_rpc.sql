-- DormiTrack — narrow lookup for the parent-linking flow.
-- Parents need to check whether a Student ID exists before any
-- parent_student_links row exists (i.e. before is_linked_parent_of() has
-- anything to check), but students' RLS rightly doesn't expose arbitrary
-- profile rows to any authenticated user. This SECURITY DEFINER function
-- returns only the matching user_id (nothing else), so the lookup can't be
-- used to scrape student profile data.
create function public.find_student_user_id(p_student_id_no text) returns uuid
language sql stable security definer set search_path = public as $$
  select user_id from public.students where student_id_no = p_student_id_no;
$$;
grant execute on function public.find_student_user_id(text) to authenticated;
