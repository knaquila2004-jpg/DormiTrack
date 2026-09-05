-- DormiTrack — reverts the "landlord records a payment" capability added in
-- 0058: only the student or the parent should ever record that a payment was
-- made (that's the whole point of the landlord then verifying/rejecting it).
-- The landlord's actual manual-edit capability is landlord_edit_bill_amount
-- (0058) — setting what a bill is supposed to be — which is unaffected and
-- stays. No real data ever used submitted_by_role = 'landlord' (verified
-- before writing this), so the CHECK constraint can revert cleanly.
drop function if exists public.landlord_record_manual_payment(uuid, numeric, text, text, date);

alter table public.payment_records drop constraint payment_records_submitted_by_role_check;
alter table public.payment_records add constraint payment_records_submitted_by_role_check check (submitted_by_role in ('student','parent'));
