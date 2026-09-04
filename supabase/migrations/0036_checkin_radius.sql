-- DormiTrack — configurable check-in/check-out geofence radius per boarding house.
-- Every screen that showed a "verification radius" before this (StudentMap.tsx) had
-- it hardcoded to a fixed 50m and never actually compared it against the student's
-- real device location — this column is what the landlord now sets (while pinning
-- their boarding house's location, at signup or later in Profile) and what the
-- student's real check-in/check-out attempt is actually measured against.
alter table public.boarding_houses
  add column checkin_radius_meters int not null default 50 check (checkin_radius_meters between 10 and 1000);
