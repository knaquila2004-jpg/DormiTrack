-- DormiTrack — Phase 2: public Storage bucket for boarding house / room / bed
-- photos (landlord-uploaded via LandlordSignUp's file inputs). Files are
-- keyed by the uploading landlord's own auth uid as the first path segment
-- so RLS can check ownership without a DB round-trip.
insert into storage.buckets (id, name, public)
values ('boarding-house-media', 'boarding-house-media', true)
on conflict (id) do nothing;

create policy "bh media public read" on storage.objects for select
  using (bucket_id = 'boarding-house-media');

create policy "bh media landlord insert" on storage.objects for insert
  to authenticated with check (
    bucket_id = 'boarding-house-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "bh media landlord update" on storage.objects for update
  to authenticated using (
    bucket_id = 'boarding-house-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "bh media landlord delete" on storage.objects for delete
  to authenticated using (
    bucket_id = 'boarding-house-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
