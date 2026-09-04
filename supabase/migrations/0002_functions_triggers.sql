-- DormiTrack — Phase 0: functions & triggers

-- ── updated_at maintenance ────────────────────────────────────────────────────

create function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_set_updated_at before update on public.users
  for each row execute function public.set_updated_at();
create trigger boarding_houses_set_updated_at before update on public.boarding_houses
  for each row execute function public.set_updated_at();
create trigger payments_set_updated_at before update on public.payments
  for each row execute function public.set_updated_at();
create trigger reports_set_updated_at before update on public.reports
  for each row execute function public.set_updated_at();

-- ── auth.users -> public.users, on every signup ──────────────────────────────
-- Reads raw_user_meta_data (passed via supabase.auth.signUp({options:{data:{...}}})).
-- Role-specific rows (students/parents/landlords) are inserted separately by the
-- client right after signUp() resolves — see plan §Auth.

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, role, email, first_name, middle_name, last_name, sex, contact_number, address)
  values (
    new.id,
    new.raw_user_meta_data->>'role',
    new.email,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'middle_name',
    new.raw_user_meta_data->>'last_name',
    new.raw_user_meta_data->>'sex',
    new.raw_user_meta_data->>'contact_number',
    new.raw_user_meta_data->>'address'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── RLS helper functions (SECURITY DEFINER — avoid recursive RLS subqueries) ──

create function public.current_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.users where id = auth.uid();
$$;

create function public.is_linked_parent_of(p_student_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.parent_student_links
    where parent_id = auth.uid() and student_id = p_student_id and status = 'linked'
  );
$$;

create function public.owns_boarding_house(p_bh_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.boarding_houses where id = p_bh_id and landlord_id = auth.uid()
  );
$$;

create function public.owns_room(p_room_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.rooms r
    join public.boarding_houses bh on bh.id = r.boarding_house_id
    where r.id = p_room_id and bh.landlord_id = auth.uid()
  );
$$;

create function public.owns_bed(p_bed_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.beds b
    join public.rooms r on r.id = b.room_id
    join public.boarding_houses bh on bh.id = r.boarding_house_id
    where b.id = p_bed_id and bh.landlord_id = auth.uid()
  );
$$;

create function public.is_conversation_member(p_conversation_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.conversation_members
    where conversation_id = p_conversation_id and user_id = auth.uid()
  );
$$;
