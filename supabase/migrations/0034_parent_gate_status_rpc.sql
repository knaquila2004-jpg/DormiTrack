-- DormiTrack — real access gate for parents, mirroring the student one
-- (getMyStudentGateStatus / "pendingVerify"). Until now a parent could reach
-- the real dashboard the moment their account existed — ParentLinkingScreen
-- had a "Continue to Dashboard" button available while status was still
-- 'pending', and even without that button, logging out and back in sent any
-- parent straight to "dashboard" with no check of parent_student_links at
-- all (App.tsx's handleLogin only ever gated students). This RPC lets the
-- login flow ask "is *this* parent actually linked yet?".
--
-- Needs to be SECURITY DEFINER: a parent's own students-table SELECT access
-- (students_select_linked_parent, 0003_rls.sql) only kicks in once
-- status = 'linked' — exactly the case this can't rely on, since it also
-- has to work while still 'pending' or 'rejected' to show the student ID
-- number that was entered. Scoped to the parent's own most recent link row
-- only (parent_id = auth.uid()), nothing else.
create function public.get_my_parent_gate_status()
returns table (link_id uuid, status text, student_id_no text)
language sql stable security definer set search_path = public as $$
  select psl.id, psl.status, s.student_id_no
  from public.parent_student_links psl
  join public.students s on s.user_id = psl.student_id
  where psl.parent_id = auth.uid()
  order by psl.requested_at desc
  limit 1;
$$;
grant execute on function public.get_my_parent_gate_status() to authenticated;
