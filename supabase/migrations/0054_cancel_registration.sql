-- DormiTrack — "Waiting for Landlord Verification" (PendingVerificationScreen,
-- App.tsx) had no way for the student to back out of a pending registration
-- they submitted by mistake — only the landlord could ever decide it
-- (reject_registration, 0010/0047). student_boarding_registrations.status
-- already allowed 'cancelled' from the start (0001_schema.sql) but nothing
-- ever set it. This is the real cancel path: only the student who owns the
-- request can call it, only while it's still 'pending', and it releases a
-- reserved bed back to 'available' exactly like a landlord rejection already
-- does — the same real double-booking guard (0047) applies either way.
create function public.cancel_registration(p_registration_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  reg record;
begin
  select * into reg from public.student_boarding_registrations where id = p_registration_id;
  if reg is null then
    raise exception 'Registration not found';
  end if;
  if reg.student_id <> auth.uid() then
    raise exception 'Not authorized to cancel this registration';
  end if;
  if reg.status <> 'pending' then
    raise exception 'Registration is not pending';
  end if;

  update public.student_boarding_registrations
    set status = 'cancelled', decided_at = now()
    where id = p_registration_id;

  update public.beds set status = 'available' where id = reg.bed_id and status = 'reserved';
end;
$$;
grant execute on function public.cancel_registration(uuid) to authenticated;
