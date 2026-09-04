-- DormiTrack — Payments verification caught a real bug: paymentStore.ts's
-- ensureCurrentPeriodBill() runs `insert into payments/payment_bills`
-- directly under whichever client session called it (student session from
-- getMyBills(), landlord session from getBillingRosterForLandlord()) — but
-- RLS only grants write access on payments/payment_bills to
-- pay_write_landlord/pay_write_admin (0003_rls.sql). A student's own
-- getMyBills() call was silently failing to create their first bill each
-- period (RLS violation, swallowed by the caller). Fix: move bill creation
-- into a SECURITY DEFINER RPC so it runs with elevated privilege while still
-- checking the caller is the student themselves, their linked parent, the
-- owning landlord, or an admin — the same three real call sites as before.
create function public.ensure_current_period_bill(p_student_id uuid, p_boarding_house_id uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_period_label text;
  v_due_date date;
  v_payment_id uuid;
  v_bh record;
begin
  if not (
    auth.uid() = p_student_id
    or public.is_linked_parent_of(p_student_id)
    or public.owns_boarding_house(p_boarding_house_id)
    or public.current_role() = 'admin'
  ) then
    raise exception 'Not authorized to create a bill for this student';
  end if;

  v_period_label := trim(to_char(now(), 'FMMonth YYYY'));
  v_due_date := date_trunc('month', current_date)::date + 9;

  select id into v_payment_id from public.payments
    where student_id = p_student_id and period_label = v_period_label;
  if v_payment_id is not null then
    return v_payment_id;
  end if;

  select rent_amount, electric_type, electric_amount, water_type, water_amount, internet_type, internet_amount
    into v_bh from public.boarding_houses where id = p_boarding_house_id;
  if v_bh is null then
    return null;
  end if;

  insert into public.payments (student_id, boarding_house_id, period_label, due_date)
  values (p_student_id, p_boarding_house_id, v_period_label, v_due_date)
  returning id into v_payment_id;

  if v_bh.rent_amount is not null then
    insert into public.payment_bills (payment_id, bill_key, label, amount) values (v_payment_id, 'rent', 'Monthly Rent', v_bh.rent_amount);
  end if;
  if v_bh.water_type = 'fixed' and v_bh.water_amount is not null then
    insert into public.payment_bills (payment_id, bill_key, label, amount) values (v_payment_id, 'water', 'Water', v_bh.water_amount);
  end if;
  if v_bh.electric_type = 'fixed' and v_bh.electric_amount is not null then
    insert into public.payment_bills (payment_id, bill_key, label, amount) values (v_payment_id, 'electricity', 'Electricity', v_bh.electric_amount);
  end if;
  if v_bh.internet_type = 'fixed' and v_bh.internet_amount is not null then
    insert into public.payment_bills (payment_id, bill_key, label, amount) values (v_payment_id, 'internet', 'Internet', v_bh.internet_amount);
  end if;

  return v_payment_id;
end;
$$;
grant execute on function public.ensure_current_period_bill(uuid, uuid) to authenticated;
