-- DormiTrack — StudentSignUp.tsx's Student ID field (students.student_id_no)
-- already has a real `unique` constraint (0001_schema.sql), so a duplicate was
-- never actually accepted — but the only feedback was whatever raw Postgres
-- error message the failed insert happened to return, and it only surfaced
-- AFTER supabase.auth.signUp() had already created a real auth user for that
-- attempt (now orphaned, no matching students row). This is the same
-- proactive, pre-auth availability-check pattern as is_username_taken
-- (0032): the signup form calls this before ever creating the auth user, so
-- a duplicate Student ID is caught immediately with a real message, and
-- students is not publicly readable so a plain client-side select would've
-- always returned zero rows regardless of whether the id was actually taken.
create function public.is_student_id_taken(p_student_id_no text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.students where student_id_no = p_student_id_no);
$$;
grant execute on function public.is_student_id_taken(text) to anon, authenticated;
