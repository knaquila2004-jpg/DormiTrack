-- DormiTrack — user request: when a parent opens the app and their link is
-- confirmed, show a real "You're Linked!" confirmation, not just a silent
-- drop into the dashboard. ParentLinkingScreen's own "success" card (added
-- in Phase 9) only ever fires for a parent who's actively sitting on that
-- screen watching the student's decision arrive via polling — a parent who
-- closed the app while pending and reopened it later (after the student
-- already approved, via 0034's login gate) never saw any confirmation at
-- all. This needs to fire exactly once, not on every login thereafter.
--
-- `ack_at` records when the parent has seen that confirmation. Set through
-- a narrow SECURITY DEFINER RPC rather than a plain UPDATE policy — a
-- broad "parent may update their own linked row" policy would also let
-- them tamper with status/decided_by/decided_at, the same column-
-- tampering risk already avoided elsewhere in this schema (see
-- mark_conversation_read's comment in 0025_chat_read_and_delete.sql).
alter table public.parent_student_links add column ack_at timestamptz;

create function public.ack_my_parent_link() returns void
language sql security definer set search_path = public as $$
  update public.parent_student_links
  set ack_at = now()
  where parent_id = auth.uid() and status = 'linked' and ack_at is null;
$$;
grant execute on function public.ack_my_parent_link() to authenticated;

-- Recreated (not CREATE OR REPLACE — the return shape is gaining a column,
-- which Postgres won't allow in place) to also expose ack_at, so the login
-- gate can tell "just linked, never acknowledged" apart from "linked ages
-- ago, already seen this".
drop function public.get_my_parent_gate_status();
create function public.get_my_parent_gate_status()
returns table (link_id uuid, status text, student_id_no text, ack_at timestamptz)
language sql stable security definer set search_path = public as $$
  select psl.id, psl.status, s.student_id_no, psl.ack_at
  from public.parent_student_links psl
  join public.students s on s.user_id = psl.student_id
  where psl.parent_id = auth.uid()
  order by psl.requested_at desc
  limit 1;
$$;
grant execute on function public.get_my_parent_gate_status() to authenticated;
