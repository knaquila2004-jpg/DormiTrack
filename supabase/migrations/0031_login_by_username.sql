-- DormiTrack — let a student log in with either their email OR their
-- auto-generated username (Supabase Auth itself only ever authenticates by
-- email). The login form is used before any session exists, so this needs
-- to run as an anonymous, pre-auth lookup — students' own RLS rightly
-- doesn't expose other students' rows to an anonymous caller, so this
-- SECURITY DEFINER function returns only the matching email (nothing else),
-- the same narrow-lookup shape as find_student_user_id.
create function public.find_email_by_username(p_username text) returns text
language sql stable security definer set search_path = public as $$
  select u.email
  from public.students s
  join public.users u on u.id = s.user_id
  where s.username = p_username;
$$;
grant execute on function public.find_email_by_username(text) to anon, authenticated;
