-- DormiTrack — Phase 2: landlord-defined custom/extra recurring fees
-- (LandlordSignUp's "Custom Payments" section — name/amount/type per fee),
-- not covered by boarding_houses' fixed rent/electric/water/internet columns.
create table public.boarding_house_extra_fees (
  id                  uuid primary key default gen_random_uuid(),
  boarding_house_id   uuid not null references public.boarding_houses(id) on delete cascade,
  name                text not null,
  fee_type            text not null check (fee_type in ('fixed','metered')),
  amount              numeric(10,2),
  enabled             boolean not null default true
);
create index bh_extra_fees_bh_idx on public.boarding_house_extra_fees(boarding_house_id);

alter table public.boarding_house_extra_fees enable row level security;
create policy bhef_select_public on public.boarding_house_extra_fees for select to anon, authenticated using (true);
create policy bhef_write_landlord on public.boarding_house_extra_fees for all
  using (public.owns_boarding_house(boarding_house_id)) with check (public.owns_boarding_house(boarding_house_id));
create policy bhef_write_admin on public.boarding_house_extra_fees for all using (public.current_role() = 'admin');
