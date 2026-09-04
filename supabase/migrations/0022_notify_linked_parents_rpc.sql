-- DormiTrack — Phase 6b (Notifications): notifications.user_id already existed
-- from Phase 0, and notif_insert_authenticated is deliberately permissive
-- (any authenticated user may insert a notification addressed to anyone —
-- see 0003_rls.sql's comment), so most "notify X" call sites just need the
-- right real user_id, resolvable client-side (e.g. boarding_houses.landlord_id
-- is public-readable).
--
-- The one exception: "notify this student's linked parent(s)" needs to read
-- parent_student_links, which only the student themselves (or their linked
-- parent, or admin) can select — not the landlord who most often needs to
-- trigger this (payment verified, report responded to, registration
-- approved). A SECURITY DEFINER RPC resolves + fans out the insert in one
-- server-side step, authorized for the student themselves, the landlord
-- who owns their current boarding house, or admin.
create function public.notify_linked_parents(
  p_student_id uuid, p_type text, p_title text, p_description text, p_destination text, p_related_id text default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (
    auth.uid() = p_student_id
    or public.current_role() = 'admin'
    or exists (
      select 1 from public.student_assignments sa
      where sa.student_id = p_student_id and sa.is_current and public.owns_boarding_house(sa.boarding_house_id)
    )
  ) then
    raise exception 'Not authorized to notify this student''s parents';
  end if;

  insert into public.notifications (user_id, type, title, description, destination, related_id)
  select parent_id, p_type, p_title, p_description, p_destination, p_related_id
  from public.parent_student_links
  where student_id = p_student_id and status = 'linked';
end;
$$;
grant execute on function public.notify_linked_parents(uuid, text, text, text, text, text) to authenticated;
