-- Column/row-level data-exposure re-audit for the admin role (requested:
-- "confirm admin sees only what's authorized/needed, not just that broad
-- SELECT policies exist").
--
-- 0003_rls.sql granted admin full SELECT on conversations, conversation_members,
-- and messages — i.e. every private 1:1 and group chat's participant list and
-- full message content, for every user in the system. No admin-facing feature
-- ever queries these tables (verified: only chatStore.ts, the regular chat
-- feature used by students/parents/landlords, reads them — grepped across the
-- whole src/app tree). Nothing in the admin spec calls for chat oversight
-- either. This was a real, live exposure: any admin session's Supabase client
-- could read every user's private messages directly, whether or not any
-- screen ever showed them.
--
-- Dropping the three read grants; member-based access (conv_select_member,
-- cm_select_member, msg_select_member) is untouched, so real chat
-- participants keep reading their own conversations exactly as before.
-- conv_delete_admin (0025_chat_read_and_delete.sql) is also left in place —
-- it's a moderation capability (delete a conversation), not a content-read
-- grant, so it doesn't expose private message data.
drop policy if exists conv_select_admin on public.conversations;
drop policy if exists cm_select_admin   on public.conversation_members;
drop policy if exists msg_select_admin  on public.messages;
