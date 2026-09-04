-- DormiTrack — Phase 11 follow-up audit: the landlord "Highlights" planner
-- (App.tsx's HighlightsDashboardSection/HighlightsFullModal — full add/edit/
-- delete UI already built) was still 100% client-local React state seeded
-- with 9 fake entries (INITIAL_HIGHLIGHTS) — any real landlord's highlights
-- were silently lost on every reload. boarding_houses.highlights_enabled
-- already existed as a config toggle (set once at signup) but never
-- actually backed anything real. This adds the real records table.
create table public.highlights (
  id                  uuid primary key default gen_random_uuid(),
  boarding_house_id   uuid not null references public.boarding_houses(id) on delete cascade,
  title               text not null,
  description         text,
  date                date not null,
  time                text not null, -- "HH:MM" 24h, matches the existing UI's Highlight.time shape
  category            text not null check (category in (
                        'announcement','maintenance','meeting','move-in','move-out',
                        'visitor-reminder','general-reminder','other')),
  priority            text not null default 'medium' check (priority in ('high','medium','low')),
  created_at          timestamptz not null default now()
);
create index highlights_bh_idx on public.highlights(boarding_house_id);
create index highlights_date_idx on public.highlights(date);

alter table public.highlights enable row level security;

-- This is a landlord's own private planning tool (never shown to
-- students/parents anywhere in the UI), so scope is landlord-owner + admin
-- only — same shape as every other owns_boarding_house-scoped table.
create policy highlights_select_landlord on public.highlights for select using (public.owns_boarding_house(boarding_house_id));
create policy highlights_select_admin    on public.highlights for select using (public.current_role() = 'admin');
create policy highlights_insert_landlord on public.highlights for insert with check (public.owns_boarding_house(boarding_house_id));
create policy highlights_update_landlord on public.highlights for update using (public.owns_boarding_house(boarding_house_id));
create policy highlights_delete_landlord on public.highlights for delete using (public.owns_boarding_house(boarding_house_id));
