-- Lets the student who received an "inactivity" warning actually respond to it
-- (0052 could only notify — there was no way for the student to explain
-- themselves, or for the landlord/parent to see that explanation). Adds a
-- response + timestamp to the same inactivity_notices row so the whole
-- warning -> response thread stays keyed on one real record, and a new
-- update policy so the student can write only to their own row.
alter table public.inactivity_notices add column response text;
alter table public.inactivity_notices add column responded_at timestamptz;

create policy inact_update_own on public.inactivity_notices for update
  using (student_id = auth.uid())
  with check (student_id = auth.uid());
