-- DormiTrack — Phase 5: landlord verify/reject payment submissions.
-- Atomic under SECURITY DEFINER: flips the submission's own status plus the
-- parent bill's status/paid_amount together, and checks ownership internally
-- (same shape as approve_registration/reject_registration).

create function public.verify_payment_record(p_record_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  rec record; bill record; pay record;
begin
  select * into rec from public.payment_records where id = p_record_id;
  if rec is null then raise exception 'Payment record not found'; end if;
  select * into bill from public.payment_bills where id = rec.bill_id;
  select * into pay from public.payments where id = bill.payment_id;
  if not public.owns_boarding_house(pay.boarding_house_id) then
    raise exception 'Not authorized to verify this payment';
  end if;
  if rec.status <> 'pending' then
    raise exception 'Payment record is not pending';
  end if;

  update public.payment_records set status = 'verified', verified_at = now(), verified_by = auth.uid() where id = p_record_id;
  update public.payment_bills set status = 'paid', paid_amount = bill.amount where id = bill.id;
end;
$$;
grant execute on function public.verify_payment_record(uuid) to authenticated;

create function public.reject_payment_record(p_record_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare
  rec record; bill record; pay record;
begin
  select * into rec from public.payment_records where id = p_record_id;
  if rec is null then raise exception 'Payment record not found'; end if;
  select * into bill from public.payment_bills where id = rec.bill_id;
  select * into pay from public.payments where id = bill.payment_id;
  if not public.owns_boarding_house(pay.boarding_house_id) then
    raise exception 'Not authorized to reject this payment';
  end if;
  if rec.status <> 'pending' then
    raise exception 'Payment record is not pending';
  end if;

  update public.payment_records set status = 'rejected', rejection_reason = p_reason, verified_at = now(), verified_by = auth.uid() where id = p_record_id;
  update public.payment_bills set status = 'unpaid' where id = bill.id and status = 'awaiting-verification';
end;
$$;
grant execute on function public.reject_payment_record(uuid, text) to authenticated;

-- A submitted payment_record should flip its bill to "awaiting-verification"
-- immediately and consistently, regardless of which client path submitted it
-- (student or parent) — a trigger guarantees this instead of relying on the
-- client to remember a second update call.
create function public.on_payment_record_submitted() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.payment_bills set status = 'awaiting-verification' where id = new.bill_id and status in ('unpaid', 'overdue');
  return new;
end;
$$;

create trigger payment_record_submitted
  after insert on public.payment_records
  for each row execute function public.on_payment_record_submitted();

