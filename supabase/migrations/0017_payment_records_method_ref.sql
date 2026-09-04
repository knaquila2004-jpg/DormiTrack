-- DormiTrack — Phase 5: StudentPayments.tsx's submit form collects a
-- payment method, reference/transaction number, and the date the payment
-- was actually made — none of which payment_records had columns for.
alter table public.payment_records
  add column method text,
  add column reference_no text,
  add column payment_date date;
