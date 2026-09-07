-- Real, persisted admin notification preferences — replaces two separate
-- local-only `useState` toggle sets (AdminSystem.tsx's "Notification
-- Settings" and AdminProfile.tsx's "Notification Preferences") that reset on
-- every reload and gated nothing. Only 4 preferences are kept, each backed by
-- a real, already-tracked event this app can actually fire a notification
-- for: new user signups, new boarding house submissions, new reports, and
-- new payment submissions. Dropped entirely (not just left unpersisted):
-- Push/Email delivery (no push or email sending exists anywhere in this
-- app — only in-app notifications), "Pending Verifications"/"System Alerts"
-- (no real pending-approval gate or system-health concept exists to notify
-- about — see adminUsersStore.ts's own note that signup never sets a
-- pending status).
create table public.admin_notification_prefs (
  admin_id          uuid primary key references public.users(id) on delete cascade,
  new_user_alerts   boolean not null default true,
  bh_request_alerts boolean not null default true,
  report_alerts     boolean not null default true,
  payment_alerts    boolean not null default true,
  updated_at        timestamptz not null default now()
);

alter table public.admin_notification_prefs enable row level security;

-- Any authenticated user needs to read these to decide whether to notify a
-- given admin (mirrors role_permissions' rp_select_all — these are just
-- non-sensitive booleans, not user data) — an admin still only ever manages
-- their own row via the write policy below.
create policy anp_select_all on public.admin_notification_prefs for select to authenticated using (true);
create policy anp_write_own on public.admin_notification_prefs for all
  using (admin_id = auth.uid() and public.current_role() = 'admin')
  with check (admin_id = auth.uid() and public.current_role() = 'admin');

create trigger admin_notification_prefs_set_updated_at before update on public.admin_notification_prefs
  for each row execute function public.set_updated_at();

-- Fan-out to every admin whose preference for p_pref_key is on (a missing
-- row means "on", matching the table's own defaults) — same SECURITY DEFINER
-- pattern as notify_linked_parents (0022), needed here because the caller
-- (a student/parent/landlord completing a real action) has no reason to be
-- able to read every admin's row directly; the RPC does the join server-side
-- and only ever inserts notifications, nothing else.
create function public.notify_admins(
  p_pref_key text, p_type text, p_title text, p_description text, p_destination text, p_related_id text default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_pref_key not in ('new_user_alerts', 'bh_request_alerts', 'report_alerts', 'payment_alerts') then
    raise exception 'Unknown notification preference key: %', p_pref_key;
  end if;

  insert into public.notifications (user_id, type, title, description, destination, related_id)
  select u.id, p_type, p_title, p_description, p_destination, p_related_id
  from public.users u
  left join public.admin_notification_prefs p on p.admin_id = u.id
  where u.role = 'admin'
    and coalesce(
      case p_pref_key
        when 'new_user_alerts'   then p.new_user_alerts
        when 'bh_request_alerts' then p.bh_request_alerts
        when 'report_alerts'     then p.report_alerts
        when 'payment_alerts'    then p.payment_alerts
      end,
      true
    );
end;
$$;
grant execute on function public.notify_admins(text, text, text, text, text, text) to authenticated;
