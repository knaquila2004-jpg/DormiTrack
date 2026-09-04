-- DormiTrack — real-time notifications.
--
-- The notification bell/list previously only ever updated via a 15s poll
-- (or a page reload) — so a landlord with the app already open in another
-- tab never saw a brand-new "New Registration Request" land until the next
-- poll tick or a manual refresh. Enabling Postgres replication for this
-- table lets the client subscribe to live INSERT/UPDATE events instead of
-- waiting on the poll, matching how a real notification should behave.
alter publication supabase_realtime add table public.notifications;
