-- DormiTrack — Phase 7 (Chat): a real bug caught by anon-key end-to-end
-- testing, not just a permissions gap. A plain client-side
-- `insert into conversations ... returning id` (used by chatStore.ts's
-- createGroup()) fails under RLS even though conv_insert_authenticated's
-- WITH CHECK (created_by = auth.uid()) is satisfied — because Postgres/
-- PostgREST also evaluates the SELECT policy (conv_select_member, which
-- requires is_conversation_member) against the RETURNING row, and the
-- creator isn't a conversation_members row yet at that exact instant
-- (that's the next statement). The insert silently reports as failed.
--
-- Fix: create the conversation AND add its members atomically inside a
-- SECURITY DEFINER function, which bypasses RLS entirely for both the
-- insert and its own internal reads — same shape as every other
-- atomic-multi-row RPC in this project (approve_registration, etc.).
create function public.create_group_conversation(p_name text, p_member_ids uuid[]) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_conv_id uuid;
begin
  insert into public.conversations (kind, group_name, created_by) values ('group', p_name, auth.uid()) returning id into v_conv_id;
  insert into public.conversation_members (conversation_id, user_id)
    select v_conv_id, m from unnest(array_append(p_member_ids, auth.uid())) as m
    on conflict do nothing;
  return v_conv_id;
end;
$$;
grant execute on function public.create_group_conversation(text, uuid[]) to authenticated;
