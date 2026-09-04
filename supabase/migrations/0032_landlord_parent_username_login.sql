-- DormiTrack — extend username login (0031) to landlords and parents.
--
-- 0031 only ever covered students, because `username` only existed as a
-- column on public.students — landlord/parent signup already computed and
-- *displayed* a "Username" field (the exact same first_mi_last pattern) but
-- never actually persisted or wired it to anything, so it silently could
-- never be used to log in. This adds the real column to both tables,
-- backfills the (few) existing real rows from their already-stored name,
-- and widens the pre-auth lookup functions so every role's signup-time
-- promise of "you can log in with your username" is actually true.

alter table public.landlords add column username text;
alter table public.parents   add column username text;

-- Backfill existing rows with the same first_mi_last pattern every signup
-- screen already generates client-side (lowercased, whitespace stripped,
-- middle name reduced to its initial, joined with underscores — skipping
-- any missing part exactly like `[f, mi, l].filter(Boolean).join("_")`).
update public.landlords l
set username = concat_ws('_',
    nullif(lower(regexp_replace(u.first_name, '\s+', '', 'g')), ''),
    nullif(left(lower(regexp_replace(coalesce(u.middle_name, ''), '\s+', '', 'g')), 1), ''),
    nullif(lower(regexp_replace(u.last_name, '\s+', '', 'g')), '')
  )
from public.users u
where u.id = l.user_id and l.username is null;

update public.parents p
set username = concat_ws('_',
    nullif(lower(regexp_replace(u.first_name, '\s+', '', 'g')), ''),
    nullif(left(lower(regexp_replace(coalesce(u.middle_name, ''), '\s+', '', 'g')), 1), ''),
    nullif(lower(regexp_replace(u.last_name, '\s+', '', 'g')), '')
  )
from public.users u
where u.id = p.user_id and p.username is null;

alter table public.landlords alter column username set not null;
alter table public.landlords add constraint landlords_username_key unique (username);
alter table public.parents   alter column username set not null;
alter table public.parents   add constraint parents_username_key unique (username);

-- Proactive, pre-auth cross-table availability check — signup for any of the
-- three roles calls this before inserting, so two different roles can never
-- silently end up with the same username (each table's own UNIQUE constraint
-- only ever caught a same-table collision; a landlord and a parent picking
-- the identical name+initial would never have tripped either one).
create function public.is_username_taken(p_username text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.students  where username = p_username)
      or exists (select 1 from public.landlords where username = p_username)
      or exists (select 1 from public.parents   where username = p_username);
$$;
grant execute on function public.is_username_taken(text) to anon, authenticated;

-- Widened to search all three username-bearing tables (was students-only).
-- `limit 1` is defensive only — is_username_taken above is what actually
-- keeps this from ever having more than one real match.
create or replace function public.find_email_by_username(p_username text) returns text
language sql stable security definer set search_path = public as $$
  select u.email from public.students  s join public.users u on u.id = s.user_id where s.username = p_username
  union all
  select u.email from public.landlords l join public.users u on u.id = l.user_id where l.username = p_username
  union all
  select u.email from public.parents   p join public.users u on u.id = p.user_id where p.username = p_username
  limit 1;
$$;
