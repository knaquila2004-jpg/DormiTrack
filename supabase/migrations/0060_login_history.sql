-- DormiTrack — the Housing Director/Admin's "Login History" sheet
-- (AdminProfile.tsx) showed a hardcoded array of 5 fake login events (fake
-- devices, fake locations, one fake "failed" attempt) that never reflected
-- anything a real user actually did. This is the real table behind it: one
-- row per successful sign-in, written client-side the moment
-- supabase.auth.signInWithPassword() actually succeeds (App.tsx's
-- handleLogin, shared by every role — see profileStore.ts's recordLogin()).
--
-- Deliberately real-successful-logins-only, not a general audit log: a
-- failed attempt can't be safely attributed to a specific user_id from the
-- client without risking account-enumeration (Supabase's own sign-in error
-- doesn't reveal whether the account exists), so this only ever records what
-- it can attribute honestly. There's no real IP-geolocation service wired
-- into this app, so "location" was never a field here — only a real device
-- label (parsed from the browser's own real user agent at sign-in time) and
-- the real timestamp.
create table public.login_history (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  user_agent   text,
  occurred_at  timestamptz not null default now()
);
create index login_history_user_idx on public.login_history(user_id);

alter table public.login_history enable row level security;
create policy login_history_select_own on public.login_history for select using (user_id = auth.uid());
create policy login_history_insert_own on public.login_history for insert with check (user_id = auth.uid());
