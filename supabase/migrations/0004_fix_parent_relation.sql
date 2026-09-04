-- DormiTrack — fix parents.relation to match the actual ParentSignUp UI's
-- 12-option list (0001's initial constraint only allowed 5 values).
alter table public.parents drop constraint parents_relation_check;
alter table public.parents add constraint parents_relation_check check (relation in (
  'Father','Mother','Guardian','Grandfather','Grandmother',
  'Brother','Sister','Aunt','Uncle','Relative','Foster Parent','Other'
));
