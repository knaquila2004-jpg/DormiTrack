-- DormiTrack — Phase 0: core schema
-- Pattern: public.users (1:1 with auth.users) + one profile table per role.

create extension if not exists pgcrypto;

-- ── Identity ────────────────────────────────────────────────────────────────

create table public.users (
  id              uuid primary key references auth.users(id) on delete cascade,
  role            text not null check (role in ('student','parent','landlord','admin')),
  email           text not null unique,
  first_name      text not null,
  middle_name     text,
  last_name       text not null,
  sex             text check (sex in ('Male','Female')),
  contact_number  text check (contact_number ~ '^[0-9]{11}$'),
  address         text,
  photo_url       text,
  status          text not null default 'active' check (status in ('active','pending','suspended')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index users_role_idx on public.users(role);
create index users_status_idx on public.users(status);

create table public.students (
  user_id         uuid primary key references public.users(id) on delete cascade,
  student_id_no   text not null unique check (student_id_no ~ '^[0-9]{6}$'),
  username        text not null unique,
  age             int check (age > 0),
  birthdate       date,
  program         text check (program in (
                    'Bachelor of Science in Midwifery',
                    'Bachelor of Science in Fisheries',
                    'Bachelor of Science in Computer Science',
                    'BIndTech - ELT',
                    'BIndTech - FPST',
                    'Bachelor of Elementary Education',
                    'Bachelor of Secondary Education - English',
                    'Bachelor of Secondary Education - Mathematics')),
  year_level      smallint check (year_level between 1 and 4),
  block           text
);
create index students_student_id_no_idx on public.students(student_id_no);

create table public.parents (
  user_id         uuid primary key references public.users(id) on delete cascade,
  relation        text not null check (relation in ('Mother','Father','Guardian','Sibling','Other')),
  relation_other  text
);

create table public.landlords (
  user_id         uuid primary key references public.users(id) on delete cascade,
  display_name    text not null
);

create table public.admins (
  user_id         uuid primary key references public.users(id) on delete cascade
);

create table public.parent_student_links (
  id              uuid primary key default gen_random_uuid(),
  parent_id       uuid not null references public.parents(user_id) on delete cascade,
  student_id      uuid not null references public.students(user_id) on delete cascade,
  status          text not null default 'pending' check (status in ('pending','linked','rejected')),
  requested_at    timestamptz not null default now(),
  decided_at      timestamptz,
  decided_by      uuid references public.users(id), -- the approving student
  unique (parent_id, student_id)
);
create index parent_student_links_student_idx on public.parent_student_links(student_id);
create index parent_student_links_parent_idx on public.parent_student_links(parent_id);

-- ── Boarding houses / rooms / beds ───────────────────────────────────────────

create table public.boarding_houses (
  id                    uuid primary key default gen_random_uuid(),
  landlord_id           uuid not null references public.landlords(user_id) on delete cascade,
  name                  text not null,
  address               text not null,
  municipality          text not null,
  lat                   double precision not null,
  lng                   double precision not null,
  cover_url             text,
  description           text,
  rating                numeric(2,1) not null default 0 check (rating between 0 and 5),
  contact_number        text check (contact_number ~ '^[0-9]{11}$'),
  contact_email         text,
  rules                 text[] not null default '{}',
  rent_amount           numeric(10,2),
  electric_type         text check (electric_type in ('fixed','metered')),
  electric_amount       numeric(10,2),
  water_type            text check (water_type in ('fixed','metered')),
  water_amount          numeric(10,2),
  internet_type         text check (internet_type in ('included','separate')),
  internet_amount       numeric(10,2),
  visitor_log_enabled   boolean not null default false,
  visitor_fields        jsonb not null default '{"name":true,"contact":true,"relationship":true,"purpose":true,"visitDate":true}',
  highlights_enabled    boolean not null default true,
  status                text not null default 'pending' check (status in ('active','pending','suspended')),
  total_rooms           int not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index boarding_houses_landlord_idx on public.boarding_houses(landlord_id);
create index boarding_houses_status_idx on public.boarding_houses(status);
create index boarding_houses_municipality_idx on public.boarding_houses(municipality);

create table public.boarding_house_amenities (
  id                  uuid primary key default gen_random_uuid(),
  boarding_house_id   uuid not null references public.boarding_houses(id) on delete cascade,
  label               text not null,
  is_custom           boolean not null default false,
  unique (boarding_house_id, label)
);

create table public.boarding_house_photos (
  id                  uuid primary key default gen_random_uuid(),
  boarding_house_id   uuid not null references public.boarding_houses(id) on delete cascade,
  url                 text not null,
  label               text,
  sort_order          int not null default 0
);
create index boarding_house_photos_bh_idx on public.boarding_house_photos(boarding_house_id);

create table public.rooms (
  id                  uuid primary key default gen_random_uuid(),
  boarding_house_id   uuid not null references public.boarding_houses(id) on delete cascade,
  name                text not null,
  cover_photo_url     text,
  capacity            int not null check (capacity > 0),
  description         text,
  floor               text,
  room_type           text,
  created_at          timestamptz not null default now(),
  unique (boarding_house_id, name)
);
create index rooms_bh_idx on public.rooms(boarding_house_id);

create table public.room_amenities (
  id        uuid primary key default gen_random_uuid(),
  room_id   uuid not null references public.rooms(id) on delete cascade,
  label     text not null,
  unique (room_id, label)
);

create table public.room_photos (
  id           uuid primary key default gen_random_uuid(),
  room_id      uuid not null references public.rooms(id) on delete cascade,
  url          text not null,
  sort_order   int not null default 0
);
create index room_photos_room_idx on public.room_photos(room_id);

create table public.beds (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid not null references public.rooms(id) on delete cascade,
  label       text not null,
  status      text not null default 'available' check (status in ('available','occupied','reserved','maintenance')),
  photo_url   text,
  unique (room_id, label)
);
create index beds_room_idx on public.beds(room_id);
create index beds_status_idx on public.beds(status);

-- ── Registration → assignment → occupancy ────────────────────────────────────

create table public.student_boarding_registrations (
  id                  uuid primary key default gen_random_uuid(),
  student_id          uuid not null references public.students(user_id) on delete cascade,
  boarding_house_id   uuid not null references public.boarding_houses(id),
  room_id             uuid not null references public.rooms(id),
  bed_id              uuid references public.beds(id),
  move_in             date not null,
  move_out            date,
  stay_unit           text not null check (stay_unit in ('Weeks','Months')),
  stay_count          int not null check (stay_count > 0),
  traits              text[] not null default '{}',
  hobbies             text[] not null default '{}',
  lifestyle           text[] not null default '{}',
  notes               text,
  status              text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  submitted_at        timestamptz not null default now(),
  decided_at          timestamptz,
  decided_by          uuid references public.landlords(user_id)
);
create index sbr_student_idx on public.student_boarding_registrations(student_id);
create index sbr_bh_idx on public.student_boarding_registrations(boarding_house_id);
create index sbr_status_idx on public.student_boarding_registrations(status);

create table public.student_assignments (
  id                  uuid primary key default gen_random_uuid(),
  student_id          uuid not null references public.students(user_id) on delete cascade,
  boarding_house_id   uuid not null references public.boarding_houses(id),
  room_id             uuid not null references public.rooms(id),
  bed_id              uuid not null references public.beds(id),
  registration_id     uuid references public.student_boarding_registrations(id),
  moved_in_at         date not null,
  moved_out_at        date,
  is_current          boolean not null default true
);
create unique index student_assignments_bed_current_uq on public.student_assignments(bed_id) where is_current;
create unique index student_assignments_student_current_uq on public.student_assignments(student_id) where is_current;
create index student_assignments_bh_current_idx on public.student_assignments(boarding_house_id) where is_current;

-- ── Payments ─────────────────────────────────────────────────────────────────

create table public.payments (
  id                  uuid primary key default gen_random_uuid(),
  student_id          uuid not null references public.students(user_id) on delete cascade,
  boarding_house_id   uuid not null references public.boarding_houses(id),
  period_label        text not null,
  due_date            date not null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (student_id, period_label)
);
create index payments_bh_idx on public.payments(boarding_house_id);
create index payments_student_idx on public.payments(student_id);
create index payments_due_idx on public.payments(due_date);

create table public.payment_bills (
  id            uuid primary key default gen_random_uuid(),
  payment_id    uuid not null references public.payments(id) on delete cascade,
  bill_key      text not null check (bill_key in ('rent','water','electricity','garbage','internet','other')),
  label         text not null,
  amount        numeric(10,2) not null,
  paid_amount   numeric(10,2) not null default 0,
  status        text not null default 'unpaid' check (status in ('paid','awaiting-verification','partially-paid','overdue','unpaid')),
  unique (payment_id, bill_key)
);

create table public.payment_records (
  id                  uuid primary key default gen_random_uuid(),
  bill_id             uuid not null references public.payment_bills(id) on delete cascade,
  submitted_by        uuid not null references public.users(id),
  submitted_by_role    text not null check (submitted_by_role in ('student','parent')),
  amount              numeric(10,2) not null check (amount > 0),
  proof_url           text,
  status              text not null default 'pending' check (status in ('verified','pending','rejected')),
  rejection_reason    text,
  submitted_at        timestamptz not null default now(),
  verified_at         timestamptz,
  verified_by         uuid references public.landlords(user_id)
);
create index payment_records_bill_idx on public.payment_records(bill_id);
create index payment_records_status_idx on public.payment_records(status);

-- ── Reports ──────────────────────────────────────────────────────────────────

create table public.reports (
  id                  uuid primary key default gen_random_uuid(),
  submitter_id        uuid not null references public.users(id),
  target_user_id      uuid references public.users(id),
  boarding_house_id   uuid references public.boarding_houses(id),
  room_id             uuid references public.rooms(id),
  bed_id              uuid references public.beds(id),
  category            text not null check (category in (
                        'room-issue','bathroom','electrical','water','internet','noise','maintenance',
                        'safety','cleanliness','roommate','lost-item','harassment','rule-violation','payment','other')),
  priority            text not null default 'medium' check (priority in ('low','medium','high','critical')),
  title               text not null,
  description         text not null,
  image_urls          text[] not null default '{}',
  status              text not null default 'pending' check (status in ('pending','under-review','in-progress','resolved','rejected','closed')),
  assigned_reviewer   uuid references public.users(id),
  submitted_at        timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index reports_submitter_idx on public.reports(submitter_id);
create index reports_target_idx on public.reports(target_user_id);
create index reports_bh_idx on public.reports(boarding_house_id);
create index reports_status_idx on public.reports(status);

create table public.report_responses (
  id             uuid primary key default gen_random_uuid(),
  report_id      uuid not null references public.reports(id) on delete cascade,
  responder_id   uuid not null references public.users(id),
  note           text,
  status_after   text not null check (status_after in ('pending','under-review','in-progress','resolved','rejected','closed')),
  created_at     timestamptz not null default now()
);
create index report_responses_report_idx on public.report_responses(report_id);

-- ── Check-in / check-out ──────────────────────────────────────────────────────

create table public.check_in_out_records (
  id                  uuid primary key default gen_random_uuid(),
  student_id          uuid not null references public.students(user_id) on delete cascade,
  boarding_house_id   uuid not null references public.boarding_houses(id),
  type                text not null check (type in ('checkin','checkout')),
  occurred_at         timestamptz not null default now(),
  address_snapshot    text,
  lat                 double precision,
  lng                 double precision,
  result              text not null default 'verified' check (result in ('verified','failed','out-of-range'))
);
create index checkinout_student_idx on public.check_in_out_records(student_id, occurred_at desc);
create index checkinout_bh_idx on public.check_in_out_records(boarding_house_id, occurred_at desc);

-- ── Announcements ─────────────────────────────────────────────────────────────

create table public.announcements (
  id                  uuid primary key default gen_random_uuid(),
  boarding_house_id   uuid references public.boarding_houses(id),
  author_id           uuid not null references public.users(id),
  title               text not null,
  description         text not null,
  audience            text not null default 'everyone' check (audience in ('everyone','students','parents','landlords')),
  priority            text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  scheduled_date      date,
  expiry_date         date,
  status              text not null default 'active' check (status in ('active','pinned','archived')),
  created_at          timestamptz not null default now()
);
create index announcements_bh_idx on public.announcements(boarding_house_id);
create index announcements_audience_idx on public.announcements(audience);
create index announcements_status_idx on public.announcements(status);

-- ── Notifications ─────────────────────────────────────────────────────────────

create table public.notifications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  type          text not null check (type in (
                  'account','boarding-house','room','payment','check-in','check-out',
                  'report','announcement','verification','system','message')),
  title         text not null,
  description   text not null,
  destination   text not null,
  related_id    text,
  read          boolean not null default false,
  created_at    timestamptz not null default now()
);
create index notifications_user_read_idx on public.notifications(user_id, read);
create index notifications_user_created_idx on public.notifications(user_id, created_at desc);

-- ── Chat ─────────────────────────────────────────────────────────────────────

create table public.conversations (
  id                uuid primary key default gen_random_uuid(),
  kind              text not null check (kind in ('direct','group')),
  direct_key        text unique,
  group_name        text,
  group_photo_url   text,
  created_by        uuid references public.users(id),
  created_at        timestamptz not null default now()
);

create table public.conversation_members (
  conversation_id   uuid not null references public.conversations(id) on delete cascade,
  user_id           uuid not null references public.users(id) on delete cascade,
  joined_at         timestamptz not null default now(),
  last_read_at      timestamptz not null default now(),
  is_admin          boolean not null default false,
  primary key (conversation_id, user_id)
);
create index conversation_members_user_idx on public.conversation_members(user_id);

create table public.messages (
  id                  uuid primary key default gen_random_uuid(),
  conversation_id     uuid not null references public.conversations(id) on delete cascade,
  sender_id           uuid not null references public.users(id),
  text                text,
  attachment_kind     text check (attachment_kind in ('photo','document')),
  attachment_url      text,
  status              text not null default 'sent' check (status in ('sent','delivered','read')),
  created_at          timestamptz not null default now()
);
create index messages_conversation_idx on public.messages(conversation_id, created_at desc);

-- ── Role permission matrix (persisted, not enforced — see plan) ──────────────

create table public.role_permissions (
  role             text not null check (role in ('student','parent','landlord','admin')),
  permission_key   text not null check (permission_key in
                     ('viewDorms','checkIn','chat','fileReport','payments','viewOccupants')),
  enabled          boolean not null default true,
  primary key (role, permission_key)
);

insert into public.role_permissions (role, permission_key, enabled) values
  ('student',  'viewDorms', true), ('student',  'checkIn', true),  ('student',  'chat', true),  ('student',  'fileReport', true),  ('student',  'payments', true), ('student',  'viewOccupants', true),
  ('parent',   'viewDorms', true), ('parent',   'checkIn', false), ('parent',   'chat', true),  ('parent',   'fileReport', true),  ('parent',   'payments', true), ('parent',   'viewOccupants', true),
  ('landlord', 'viewDorms', true), ('landlord', 'checkIn', false), ('landlord', 'chat', true),  ('landlord', 'fileReport', false), ('landlord', 'payments', true), ('landlord', 'viewOccupants', true),
  ('admin',    'viewDorms', true), ('admin',    'checkIn', true),  ('admin',    'chat', true),  ('admin',    'fileReport', true),  ('admin',    'payments', true), ('admin',    'viewOccupants', true);

-- ── _migrations tracking (used by scripts/run-migration.mjs) ─────────────────

create table if not exists public._migrations (
  filename     text primary key,
  applied_at   timestamptz not null default now()
);
