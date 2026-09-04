-- DormiTrack — fix: boarding_houses.internet_type was modeled as
-- included|separate, but LandlordSignUp's actual UI (PaymentTypePicker,
-- same component used for electric/water) offers fixed|metered for internet
-- too. Align the constraint with the real form.
alter table public.boarding_houses drop constraint boarding_houses_internet_type_check;
alter table public.boarding_houses add constraint boarding_houses_internet_type_check
  check (internet_type in ('fixed','metered'));
