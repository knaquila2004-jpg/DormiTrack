-- Lowers the allowed check-in/check-out radius floor from 10m to 5m — the landlord-facing
-- slider (BoardingHouseLocationPicker.tsx) was capped at a minimum of 20m, tighter than a
-- landlord wanted for a small/single-building property. Postgres check constraints can't be
-- altered in place, so this drops and recreates it with the new floor.
alter table public.boarding_houses
  drop constraint boarding_houses_checkin_radius_meters_check;
alter table public.boarding_houses
  add constraint boarding_houses_checkin_radius_meters_check check (checkin_radius_meters between 5 and 1000);
