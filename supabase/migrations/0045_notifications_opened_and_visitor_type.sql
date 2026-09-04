-- Two fixes to public.notifications:
--
-- 1) `read` is the only persisted state a notification has, and it gets set to
--    true by BOTH markAllRead() (fired the instant the Notifications page is
--    opened, to clear the bell badge) and markNotificationRead() (fired when a
--    specific card is actually tapped). Because both write the same column,
--    once a card has merely been *seen* on an opened page it becomes
--    indistinguishable from one that was actually *opened* — the moment the
--    user leaves and reopens the Notifications screen (a fresh component
--    mount, so the client-only "clicked this session" set is gone too), every
--    notification collapses straight to the grey "opened" treatment, even ones
--    the user never tapped. `opened` is the missing, durable, second flag:
--    only markNotificationRead ever sets it, so the UI can tell apart
--    "new" (!read) / "seen, not opened" (read && !opened) / "opened" (read &&
--    opened) even across a remount.
--
-- 2) The `type` check constraint was never extended for the "visitor"
--    notification type added this session (App.tsx/StudentHome.tsx's new
--    Visitor Records feature) — every such insert has been silently failing
--    the constraint and getting swallowed by addNotification's own catch.
alter table public.notifications add column opened boolean not null default false;

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'account','boarding-house','room','payment','check-in','check-out',
  'report','announcement','verification','system','message','visitor'
));
