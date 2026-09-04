-- DormiTrack — Phase 7 (Chat): two more real gaps found while wiring the
-- store to the already-existing conversations/conversation_members/messages
-- schema (0001_schema.sql) and its RLS (0003_rls.sql).

-- 1. `messages` had SELECT + INSERT policies but no UPDATE policy at all, so
--    marking a message read (flipping its status) was rejected outright.
--    A plain UPDATE policy would also let any member edit the message TEXT,
--    not just its status — so this goes through a SECURITY DEFINER RPC
--    instead, scoped to exactly the one column that should ever change here.
create function public.mark_conversation_read(p_conversation_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_conversation_member(p_conversation_id) then
    raise exception 'Not a member of this conversation';
  end if;
  update public.messages set status = 'read' where conversation_id = p_conversation_id and sender_id <> auth.uid() and status <> 'read';
  update public.conversation_members set last_read_at = now() where conversation_id = p_conversation_id and user_id = auth.uid();
end;
$$;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

-- 2. `conversations` had no DELETE policy at all — a group's creator
--    couldn't actually delete it (GroupInfoModal's "Delete Group").
create policy conv_delete_creator on public.conversations for delete using (created_by = auth.uid());
create policy conv_delete_admin on public.conversations for delete using (public.current_role() = 'admin');
