-- DormiTrack — landlord "Announcements" (the renamed Highlights planner) now
-- also reaches students/parents: each highlight optionally mirrors into the
-- real, already-BH-scoped `announcements` table (0001_schema.sql's
-- boarding_house_id + 0003_rls.sql's ann_write_landlord policy already
-- supported exactly this — it just had no UI wired to it until now). This
-- column tracks that mirrored row so edits/deletes stay in sync instead of
-- leaving an orphaned announcement behind.
alter table public.highlights add column announcement_id uuid references public.announcements(id) on delete set null;
