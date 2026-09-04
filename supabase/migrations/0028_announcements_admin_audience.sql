-- DormiTrack — Phase 10 (Admin System screen): AdminSystem.tsx's
-- announcement composer offers 5 audience chips ("Everyone", "Students",
-- "Parents", "Landlords", "Housing Director"), but the original CHECK
-- constraint only allowed 4 values — no way to target admins specifically.
-- Widening rather than removing the chip, to keep the existing UI intact.
alter table public.announcements drop constraint announcements_audience_check;
alter table public.announcements add constraint announcements_audience_check
  check (audience in ('everyone','students','parents','landlords','admin'));
