-- DormiTrack — the landlord's Payments page had no way to manually correct a
-- bill's due amount, or record a payment collected outside the student/parent
-- submit-then-verify flow (cash handed over in person, an in-person GCash
-- transfer, etc.). Both new actions below funnel through the exact same real
-- payment_bills/payment_records tables the rest of the payments system
-- already reads, so History/Timeline (built from real transactions) and the
-- student's/parent's own view (the same underlying rows, just scoped by RLS)
-- both stay accurate automatically for these too — nothing else needed
-- rewiring for that.
--
-- Also fixes a real staleness bug found while touching this: verify_payment_record
-- and reject_payment_record (0016) only ever updated payment_bills/payment_records,
-- never the parent `payments` row — so its updated_at (shown to the landlord as
-- "Updated: ...") never actually reflected the real last activity on that period.

alter table public.payment_records drop constraint payment_records_submitted_by_role_check;
alter table public.payment_records add constraint payment_records_submitted_by_role_check check (submitted_by_role in ('student','parent','landlord'));

create function public.landlord_edit_bill_amount(p_bill_id uuid, p_amount numeric) returns void
language plpgsql security definer set search_path = public as $$
declare bill record; pay record; new_status text;
begin
  if p_amount < 0 then raise exception 'Amount cannot be negative'; end if;
  select * into bill from public.payment_bills where id = p_bill_id;
  if bill is null then raise exception 'Bill not found'; end if;
  select * into pay from public.payments where id = bill.payment_id;
  if not public.owns_boarding_house(pay.boarding_house_id) then
    raise exception 'Not authorized to edit this bill';
  end if;

  new_status := case
    when bill.paid_amount > 0 and bill.paid_amount >= p_amount then 'paid'
    when bill.paid_amount > 0 then 'partially-paid'
    else bill.status
  end;
  update public.payment_bills set amount = p_amount, status = new_status where id = p_bill_id;
  update public.payments set updated_at = now() where id = bill.payment_id;
end;
$$;
grant execute on function public.landlord_edit_bill_amount(uuid, numeric) to authenticated;

create function public.landlord_record_manual_payment(
  p_bill_id uuid, p_amount numeric, p_method text, p_reference_no text, p_payment_date date
) returns uuid
language plpgsql security definer set search_path = public as $$
declare bill record; pay record; new_paid numeric; new_status text; rec_id uuid;
begin
  if p_amount <= 0 then raise exception 'Amount must be greater than zero'; end if;
  select * into bill from public.payment_bills where id = p_bill_id;
  if bill is null then raise exception 'Bill not found'; end if;
  select * into pay from public.payments where id = bill.payment_id;
  if not public.owns_boarding_house(pay.boarding_house_id) then
    raise exception 'Not authorized to record a payment for this bill';
  end if;

  insert into public.payment_records (bill_id, submitted_by, submitted_by_role, amount, status, verified_at, verified_by, method, reference_no, payment_date)
  values (p_bill_id, auth.uid(), 'landlord', p_amount, 'verified', now(), auth.uid(), p_method, p_reference_no, p_payment_date)
  returning id into rec_id;

  new_paid := least(bill.amount, bill.paid_amount + p_amount);
  new_status := case when new_paid >= bill.amount and bill.amount > 0 then 'paid' when new_paid > 0 then 'partially-paid' else bill.status end;
  update public.payment_bills set paid_amount = new_paid, status = new_status where id = p_bill_id;
  update public.payments set updated_at = now() where id = bill.payment_id;

  return rec_id;
end;
$$;
grant execute on function public.landlord_record_manual_payment(uuid, numeric, text, text, date) to authenticated;

create function public.landlord_set_bill_status(p_bill_id uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
declare bill record; pay record;
begin
  if p_status not in ('unpaid','overdue') then raise exception 'Invalid status'; end if;
  select * into bill from public.payment_bills where id = p_bill_id;
  if bill is null then raise exception 'Bill not found'; end if;
  select * into pay from public.payments where id = bill.payment_id;
  if not public.owns_boarding_house(pay.boarding_house_id) then
    raise exception 'Not authorized to edit this bill';
  end if;
  if p_status = 'unpaid' and bill.paid_amount > 0 then
    raise exception 'Cannot mark unpaid while a payment has been recorded on this bill';
  end if;

  update public.payment_bills set status = p_status where id = p_bill_id;
  update public.payments set updated_at = now() where id = bill.payment_id;
end;
$$;
grant execute on function public.landlord_set_bill_status(uuid, text) to authenticated;

create or replace function public.verify_payment_record(p_record_id uuid) returns void
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
  update public.payments set updated_at = now() where id = bill.payment_id;
end;
$$;

create or replace function public.reject_payment_record(p_record_id uuid, p_reason text) returns void
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
  update public.payments set updated_at = now() where id = bill.payment_id;
end;
$$;
