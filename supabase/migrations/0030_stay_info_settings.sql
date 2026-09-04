-- DormiTrack — "Stay Info Settings" (which fields a student must fill in when
-- registering for a room: length of stay, move-in info, personality, hobbies,
-- lifestyle, notes). LandlordSignUp.tsx's wizard already collects these 6
-- toggles and LandlordProfile.tsx has a matching editable section, but no
-- column ever existed to persist them — both screens' toggles were 100%
-- local-only and thrown away. Defaults match the wizard's existing UI default
-- (all enabled).
alter table public.boarding_houses
  add column allow_length_of_stay boolean not null default true,
  add column allow_move_in        boolean not null default true,
  add column allow_personality    boolean not null default true,
  add column allow_hobbies        boolean not null default true,
  add column allow_lifestyle      boolean not null default true,
  add column allow_notes          boolean not null default true;
