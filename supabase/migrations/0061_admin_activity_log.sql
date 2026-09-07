-- DormiTrack — AdminProfile.tsx's "Activity History" section showed a
-- hardcoded array of 7 fake events (fake names like "Kevin Cruz"/"Ben
-- Torres", fake timestamps) that never reflected anything a real admin
-- actually did. This is the real table behind it: one row per real admin
-- action, written client-side at each real action's own existing success
-- path (user status changes, report responses, announcements, boarding
-- house approvals, role-permission changes, report exports — see
-- adminStore.ts's logAdminActivity() and its call sites).
create table public.admin_activity_log (
  id           uuid primary key default gen_random_uuid(),
  admin_id     uuid not null references public.users(id) on delete cascade,
  action       text not null,
  description  text not null,
  created_at   timestamptz not null default now()
);
create index admin_activity_log_admin_idx on public.admin_activity_log(admin_id);

alter table public.admin_activity_log enable row level security;
create policy admin_activity_log_select_own on public.admin_activity_log for select using (admin_id = auth.uid());
create policy admin_activity_log_insert_own on public.admin_activity_log for insert with check (admin_id = auth.uid());
