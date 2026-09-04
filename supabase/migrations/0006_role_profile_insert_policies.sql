-- DormiTrack — fix: 0003_rls.sql never granted INSERT on the role-profile
-- tables. The admin bootstrap script (service-role key) bypasses RLS
-- entirely, which masked this — a real signed-up user hitting these tables
-- through the anon key + their own session was blocked. Each signup wizard
-- inserts its own row right after supabase.auth.signUp() resolves, so the
-- only INSERT that should ever be allowed is "insert your own profile row".
create policy students_insert_own on public.students for insert
  with check (user_id = auth.uid());

create policy parents_insert_own on public.parents for insert
  with check (user_id = auth.uid());

create policy landlords_insert_own on public.landlords for insert
  with check (user_id = auth.uid());

-- admins intentionally has no self-serve insert policy — that role is only
-- ever created via the service-role bootstrap script (scripts/bootstrap-admin.mjs).
