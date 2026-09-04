-- DormiTrack — Landlord-initiated payment periods. Until now, a billing period only ever
-- came into existence via ensure_current_period_bill() (0018), which is silently pinned to
-- "whatever the calendar month is right now" the instant someone opens Payments — there was no
-- way for a landlord to announce/create a period for a specific month, add a note ("water rate
-- increased this month"), or set one up ahead of time. This adds that real landlord-facing flow.
--
-- Mirrors ensure_current_period_bill's bill-line-item logic (same fixed-rate fee columns off
-- boarding_houses) rather than refactoring it into a shared helper, matching this codebase's
-- existing convention of self-contained, additive migrations per phase.

alter table public.payments add column note text;

create function public.create_payment_period(
  p_boarding_house_id uuid, p_year int, p_month int, p_due_date date, p_note text default null
) returns table(student_id uuid, is_new boolean)
language plpgsql security definer set search_path = public as $$
declare
  v_target_month date;
  v_period_label text;
  v_bh record;
  v_student record;
  v_payment_id uuid;
  v_existing_id uuid;
begin
  if not (public.owns_boarding_house(p_boarding_house_id) or public.current_role() = 'admin') then
    raise exception 'Not authorized to create a payment period for this boarding house';
  end if;
  if p_month < 1 or p_month > 12 then
    raise exception 'Invalid month';
  end if;

  v_target_month := make_date(p_year, p_month, 1);
  -- Current month through 6 months ahead — a landlord setting up bills for a semester at a
  -- time, not an open-ended future ledger.
  if v_target_month < date_trunc('month', current_date)::date
     or v_target_month > (date_trunc('month', current_date) + interval '6 months')::date then
    raise exception 'Payment periods can only be created from the current month up to 6 months ahead';
  end if;

  v_period_label := trim(to_char(v_target_month, 'FMMonth YYYY'));

  select rent_amount, electric_type, electric_amount, water_type, water_amount, internet_type, internet_amount
    into v_bh from public.boarding_houses where id = p_boarding_house_id;
  if v_bh is null then
    raise exception 'Boarding house not found';
  end if;

  for v_student in
    select sa.student_id from public.student_assignments sa
    where sa.boarding_house_id = p_boarding_house_id and sa.is_current
  loop
    select id into v_existing_id from public.payments
      where student_id = v_student.student_id and period_label = v_period_label;

    if v_existing_id is not null then
      -- Already exists (e.g. auto-created by ensure_current_period_bill, or the landlord
      -- re-running this to update the note) — leave bills/due_date alone, just let a real
      -- note attach or be updated, and report it as not-new so the caller doesn't re-notify.
      if p_note is not null then
        update public.payments set note = p_note where id = v_existing_id;
      end if;
      student_id := v_student.student_id; is_new := false;
      return next;
      continue;
    end if;

    insert into public.payments (student_id, boarding_house_id, period_label, due_date, note)
    values (v_student.student_id, p_boarding_house_id, v_period_label, p_due_date, p_note)
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

    student_id := v_student.student_id; is_new := true;
    return next;
  end loop;
end;
$$;
grant execute on function public.create_payment_period(uuid, int, int, date, text) to authenticated;
