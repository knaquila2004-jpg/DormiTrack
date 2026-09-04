-- DormiTrack — "Visitor Records" has had a full landlord-side UI since early in
-- this project (stats card, filterable/searchable logbook modal, per-visitor
-- "Visitor Has Left" action) and a per-boarding-house enable toggle +
-- field-config (visitor_log_enabled / visitor_fields on boarding_houses,
-- 0001_schema.sql) that the landlord can configure — but no actual table to
-- store a submitted record ever existed, and no submission UI existed for
-- either role. The landlord's own card literally reads "Student-submitted
-- visitor records" while being permanently empty. This is the real table;
-- the student-facing submission form is the new part of App.tsx/StudentHome.tsx
-- this migration unlocks.
create table public.visitor_records (
  id                  uuid primary key default gen_random_uuid(),
  boarding_house_id   uuid not null references public.boarding_houses(id) on delete cascade,
  student_id          uuid not null references public.students(user_id) on delete cascade,
  visitor_name        text,
  contact             text,
  relationship        text,
  purpose             text,
  visit_date          date,
  time_in             timestamptz not null default now(),
  time_out            timestamptz,
  status              text not null default 'inside' check (status in ('inside','left')),
  created_at          timestamptz not null default now()
);
create index visitor_records_bh_idx on public.visitor_records(boarding_house_id);
create index visitor_records_student_idx on public.visitor_records(student_id);

alter table public.visitor_records enable row level security;
create policy vr_select_own on public.visitor_records for select using (student_id = auth.uid());
create policy vr_select_landlord on public.visitor_records for select using (public.owns_boarding_house(boarding_house_id));
create policy vr_select_linked_parent on public.visitor_records for select using (public.is_linked_parent_of(student_id));
create policy vr_select_admin on public.visitor_records for select using (public.current_role() = 'admin');
create policy vr_insert_own on public.visitor_records for insert with check (student_id = auth.uid());
-- Either the student or the landlord may record a visitor's departure — whoever
-- notices first (the landlord's own "Visitor Has Left" button predates this
-- migration and needs to keep working).
create policy vr_update_own on public.visitor_records for update using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy vr_update_landlord on public.visitor_records for update using (public.owns_boarding_house(boarding_house_id)) with check (public.owns_boarding_house(boarding_house_id));
