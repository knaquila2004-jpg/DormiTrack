-- DormiTrack — Phase 9: a real bug caught by anon-key end-to-end testing.
-- ParentLinkingScreen's "Try Again"/"Send New Request" re-runs the same
-- `parent_student_links` upsert (parent_id, student_id on conflict) that
-- the initial request used. The first attempt is a plain INSERT
-- (psl_insert_parent covers it), but resending after a student REJECTS the
-- request hits the ON CONFLICT DO UPDATE path — and there was no UPDATE
-- policy granting the parent any access to their own row at all (only
-- psl_update_student/psl_update_admin exist), so RLS silently denied it.
--
-- Scoped narrowly: a parent may only reopen a row they own, only from
-- 'rejected' back to 'pending', and only by clearing the prior decision —
-- they can never set status to 'linked' themselves (that stays exclusively
-- a student/admin action via the existing policies).
create policy psl_update_parent_resend on public.parent_student_links for update
  using (parent_id = auth.uid() and status = 'rejected')
  with check (parent_id = auth.uid() and status = 'pending' and decided_by is null and decided_at is null);
