-- DormiTrack — "already read this announcement" was purely client-side React
-- state (StudentHome.tsx's `readIds`), reset to empty on every mount — so a
-- refresh (or just navigating away and back, since screens fully unmount)
-- made every previously-read announcement look unread again. Gives it a real
-- per-user home. Deliberately its own table rather than reusing
-- `notifications.read`: not every announcement has a corresponding
-- notification (admin-authored ones don't send one at all), so that
-- wouldn't cover every announcement a student might view.
create table public.announcement_reads (
  user_id         uuid not null references public.users(id) on delete cascade,
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  read_at         timestamptz not null default now(),
  primary key (user_id, announcement_id)
);

alter table public.announcement_reads enable row level security;
create policy ar_select_own on public.announcement_reads for select using (user_id = auth.uid());
create policy ar_insert_own on public.announcement_reads for insert with check (user_id = auth.uid());
