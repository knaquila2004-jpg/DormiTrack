-- DormiTrack — `announcements.scheduled_date` means "don't publish this until
-- then" (a delayed-publish concept, filtered client-side in
-- announcementStore.ts's getMyAnnouncements). A landlord's highlight has a
-- different, unrelated date/time: when the reminded-about EVENT happens, not
-- when the announcement should appear — that's why highlightsStore.ts's
-- mirroredDescription() only ever wrote it as prose text into `description`,
-- deliberately leaving `scheduled_date` null so it always publishes
-- immediately. These two new columns give that event date/time a real,
-- structured home instead of only living inside free text — needed so the
-- student home screen can pick out "an announcement about today" and sort
-- multiple same-day ones by time, rather than parsing prose.
alter table public.announcements add column event_date date;
alter table public.announcements add column event_time text; -- "HH:MM" 24h, same shape as highlights.time
