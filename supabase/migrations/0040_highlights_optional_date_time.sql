-- DormiTrack — Landlord "Highlights" (now surfaced to the landlord as
-- "Announcements") no longer requires a date or a time when created — the
-- landlord gets an independent toggle for each. Both columns were `not null`
-- (0029_highlights_table.sql), so a general/evergreen announcement with
-- neither one couldn't be stored at all until now.
alter table public.highlights alter column date drop not null;
alter table public.highlights alter column time drop not null;
