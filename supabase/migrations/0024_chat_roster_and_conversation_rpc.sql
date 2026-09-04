-- DormiTrack — Phase 7 (Chat): real contact-roster visibility + authorized
-- direct-conversation creation.
--
-- Roster visibility gaps (same "no policy grants this real cross-role read"
-- class as every prior phase): a landlord could see students/BHs but not the
-- linked parents of their own tenants; nobody but the admin role itself
-- could see the admin account's own identity (needed to show "Housing
-- Director" as a chat contact for every other role).

-- landlord sees parent_student_links for students currently at their BH —
-- same shape as sa_select_landlord (owns_boarding_house), safe as an inline
-- subquery since it only touches student_assignments, which the landlord
-- already has direct SELECT access to via that existing policy.
create policy psl_select_landlord on public.parent_student_links for select using (
  exists (
    select 1 from public.student_assignments sa
    where sa.student_id = parent_student_links.student_id and sa.is_current and public.owns_boarding_house(sa.boarding_house_id)
  )
);

-- landlord sees the linked parent's own `users` row (name/photo) for their
-- tenants — wrapped in a SECURITY DEFINER helper since this condition
-- reaches into parent_student_links AND student_assignments together.
create function public.is_linked_parent_of_landlord_tenant(p_parent_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.parent_student_links psl
    join public.student_assignments sa on sa.student_id = psl.student_id and sa.is_current
    where psl.parent_id = p_parent_id and psl.status = 'linked' and public.owns_boarding_house(sa.boarding_house_id)
  );
$$;
create policy users_select_landlord_of_parent on public.users for select using (
  public.is_linked_parent_of_landlord_tenant(users.id)
);

-- Admin accounts function like a small, semi-public "housing office" contact
-- (there's only ever a handful) — mirrors landlords_select_public (0003_rls.sql),
-- which already makes landlord identity fully public for the same reason.
create policy users_select_admin_target on public.users for select using (role = 'admin');

-- ── Authorized direct-conversation creation ─────────────────────────────────
-- Real permission model for 1:1 chat, matching the old mock's
-- getAuthorizedContacts(): admin reaches/is reached by everyone; landlord
-- reaches their tenants' students + those students' linked parents;
-- student/parent reach their counterpart landlord and each other (if
-- linked). Student<->student and parent<->parent stay unauthorized here —
-- 1:1 messaging between peers was never part of the base feature (group
-- chat is the only peer-to-peer path, and its membership isn't gated by
-- this function — see chatStore.ts).
create function public.can_message(p_other_user_id uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  v_my_role text := public.current_role();
  v_other_role text;
begin
  if auth.uid() = p_other_user_id then return false; end if;
  select role into v_other_role from public.users where id = p_other_user_id;
  if v_other_role is null then return false; end if;

  if v_my_role = 'admin' or v_other_role = 'admin' then return true; end if;

  if v_my_role = 'landlord' and v_other_role = 'student' then
    return exists (select 1 from public.student_assignments sa where sa.student_id = p_other_user_id and sa.is_current and public.owns_boarding_house(sa.boarding_house_id));
  end if;
  if v_my_role = 'student' and v_other_role = 'landlord' then
    return exists (
      select 1 from public.student_assignments sa join public.boarding_houses bh on bh.id = sa.boarding_house_id
      where sa.student_id = auth.uid() and sa.is_current and bh.landlord_id = p_other_user_id
    );
  end if;

  if v_my_role = 'landlord' and v_other_role = 'parent' then
    return public.is_linked_parent_of_landlord_tenant(p_other_user_id);
  end if;
  if v_my_role = 'parent' and v_other_role = 'landlord' then
    return exists (
      select 1 from public.parent_student_links psl
      join public.student_assignments sa on sa.student_id = psl.student_id and sa.is_current
      join public.boarding_houses bh on bh.id = sa.boarding_house_id
      where psl.parent_id = auth.uid() and psl.status = 'linked' and bh.landlord_id = p_other_user_id
    );
  end if;

  if v_my_role = 'parent' and v_other_role = 'student' then
    return public.is_linked_parent_of(p_other_user_id);
  end if;
  if v_my_role = 'student' and v_other_role = 'parent' then
    return exists (select 1 from public.parent_student_links where parent_id = p_other_user_id and student_id = auth.uid() and status = 'linked');
  end if;

  return false;
end;
$$;

-- Atomic get-or-create for a direct (1:1) conversation, keyed by the same
-- sorted-pair format chatStore.ts's conversationId() already computes
-- client-side (least/greatest here matches JS's [a,b].sort() on canonical
-- lowercase-hyphenated uuid strings), so the client never needs to know a
-- conversation's real id before the first message is sent.
create function public.get_or_create_direct_conversation(p_other_user_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_key text;
  v_conv_id uuid;
begin
  if auth.uid() = p_other_user_id then
    raise exception 'Cannot start a conversation with yourself';
  end if;
  if not public.can_message(p_other_user_id) then
    raise exception 'Not authorized to message this user';
  end if;

  v_key := least(auth.uid()::text, p_other_user_id::text) || '__' || greatest(auth.uid()::text, p_other_user_id::text);

  select id into v_conv_id from public.conversations where direct_key = v_key;
  if v_conv_id is not null then
    return v_conv_id;
  end if;

  insert into public.conversations (kind, direct_key, created_by) values ('direct', v_key, auth.uid()) returning id into v_conv_id;
  insert into public.conversation_members (conversation_id, user_id) values (v_conv_id, auth.uid()), (v_conv_id, p_other_user_id);
  return v_conv_id;
end;
$$;
grant execute on function public.get_or_create_direct_conversation(uuid) to authenticated;
