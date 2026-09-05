-- DormiTrack — the landlord's Occupants page had a "Notes" tab (private notes
-- about a specific occupant) but it was 100% fake: notes lived only in that
-- profile modal's own component state, seeded from an always-empty array, so
-- every note vanished the instant the modal was closed, the created date was
-- a hardcoded "Dec 18, 2024" regardless of when it was actually written, and
-- nothing was ever really saved. This is the real table behind it.
--
-- Deliberately landlord-only (no student/parent/admin select policy at all,
-- unlike every other per-occupant table in this schema) — these are private
-- landlord notes about a tenant, not something meant to be visible to the
-- student or their parent.
create table public.occupant_notes (
  id                 uuid primary key default gen_random_uuid(),
  student_id         uuid not null references public.students(user_id) on delete cascade,
  boarding_house_id  uuid not null references public.boarding_houses(id) on delete cascade,
  note               text not null,
  created_at         timestamptz not null default now()
);
create index on_student_idx on public.occupant_notes(student_id);
create index on_bh_idx on public.occupant_notes(boarding_house_id);

alter table public.occupant_notes enable row level security;
create policy on_select_landlord on public.occupant_notes for select using (public.owns_boarding_house(boarding_house_id));
create policy on_insert_landlord on public.occupant_notes for insert with check (public.owns_boarding_house(boarding_house_id));
