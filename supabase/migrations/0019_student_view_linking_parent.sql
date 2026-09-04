-- DormiTrack — Phase 9: a student needs to see the identity (name, relation)
-- of a parent who has requested to link, in order to approve/reject the
-- request. `users`/`parents` currently only expose a row to its own owner,
-- an admin, or a few narrow cross-role cases (landlord-of-student,
-- linked-parent, conversation-peer, roommate) — none cover "a parent with a
-- pending/decided link to me".
--
-- Unlike the roommate-visibility bugs (0013-0015), the condition here only
-- ever touches parent_student_links rows the querying student already owns
-- via psl_select_student (student_id = auth.uid()), so this isn't actually
-- at risk of that recursion bug — but it's wrapped in a SECURITY DEFINER
-- helper anyway, matching every other cross-table policy in this project,
-- and verified with a real anon-key+session test before shipping.
create function public.is_linking_student_of(p_parent_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.parent_student_links
    where parent_id = p_parent_id and student_id = auth.uid()
  );
$$;

create policy users_select_linking_parent on public.users for select using (
  public.is_linking_student_of(users.id)
);
create policy parents_select_linking_student on public.parents for select using (
  public.is_linking_student_of(parents.user_id)
);
