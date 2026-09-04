-- DormiTrack — Phase 0: Row Level Security
-- Every public table gets RLS enabled + explicit policies. Nothing is exposed
-- via PostgREST by default beyond what's listed here.

-- ── users ──────────────────────────────────────────────────────────────────
alter table public.users enable row level security;

create policy users_select_own on public.users for select
  using (id = auth.uid());
create policy users_select_admin on public.users for select
  using (public.current_role() = 'admin');
create policy users_select_landlord_of_student on public.users for select
  using (
    public.current_role() = 'landlord' and exists (
      select 1 from public.student_assignments sa
      where sa.student_id = users.id and sa.is_current and public.owns_boarding_house(sa.boarding_house_id)
    )
  );
create policy users_select_linked_parent on public.users for select
  using (public.current_role() = 'parent' and public.is_linked_parent_of(users.id));
create policy users_select_conversation_peer on public.users for select
  using (
    exists (
      select 1 from public.conversation_members cm1
      join public.conversation_members cm2 on cm1.conversation_id = cm2.conversation_id
      where cm1.user_id = auth.uid() and cm2.user_id = users.id
    )
  );
create policy users_update_own on public.users for update
  using (id = auth.uid()) with check (id = auth.uid());
create policy users_update_admin on public.users for update
  using (public.current_role() = 'admin');

-- ── role-profile tables ───────────────────────────────────────────────────
alter table public.students enable row level security;
create policy students_select_own on public.students for select using (user_id = auth.uid());
create policy students_select_admin on public.students for select using (public.current_role() = 'admin');
create policy students_select_landlord on public.students for select using (
  public.current_role() = 'landlord' and exists (
    select 1 from public.student_assignments sa
    where sa.student_id = students.user_id and sa.is_current and public.owns_boarding_house(sa.boarding_house_id)
  )
);
create policy students_select_linked_parent on public.students for select
  using (public.is_linked_parent_of(students.user_id));
create policy students_update_own on public.students for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy students_update_admin on public.students for update using (public.current_role() = 'admin');

alter table public.parents enable row level security;
create policy parents_select_own on public.parents for select using (user_id = auth.uid());
create policy parents_select_admin on public.parents for select using (public.current_role() = 'admin');
create policy parents_update_own on public.parents for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy parents_update_admin on public.parents for update using (public.current_role() = 'admin');

alter table public.landlords enable row level security;
create policy landlords_select_own on public.landlords for select using (user_id = auth.uid());
create policy landlords_select_public on public.landlords for select using (true); -- display_name shown on listings
create policy landlords_update_own on public.landlords for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy landlords_update_admin on public.landlords for update using (public.current_role() = 'admin');

alter table public.admins enable row level security;
create policy admins_select_own on public.admins for select using (user_id = auth.uid());
create policy admins_select_admin on public.admins for select using (public.current_role() = 'admin');

-- ── parent_student_links ──────────────────────────────────────────────────
alter table public.parent_student_links enable row level security;
create policy psl_select_parent on public.parent_student_links for select using (parent_id = auth.uid());
create policy psl_select_student on public.parent_student_links for select using (student_id = auth.uid());
create policy psl_select_admin on public.parent_student_links for select using (public.current_role() = 'admin');
create policy psl_insert_parent on public.parent_student_links for insert
  with check (parent_id = auth.uid() and status = 'pending');
create policy psl_update_student on public.parent_student_links for update
  using (student_id = auth.uid()) with check (student_id = auth.uid() and decided_by = auth.uid());
create policy psl_update_admin on public.parent_student_links for update using (public.current_role() = 'admin');

-- ── boarding_houses ────────────────────────────────────────────────────────
alter table public.boarding_houses enable row level security;
create policy bh_select_public on public.boarding_houses for select
  to anon, authenticated using (status = 'active');
create policy bh_select_own_landlord on public.boarding_houses for select
  using (landlord_id = auth.uid());
create policy bh_select_admin on public.boarding_houses for select using (public.current_role() = 'admin');
create policy bh_insert_landlord on public.boarding_houses for insert
  with check (landlord_id = auth.uid());
create policy bh_update_landlord on public.boarding_houses for update
  using (landlord_id = auth.uid()) with check (landlord_id = auth.uid());
create policy bh_update_admin on public.boarding_houses for update using (public.current_role() = 'admin');
create policy bh_delete_landlord on public.boarding_houses for delete using (landlord_id = auth.uid());
create policy bh_delete_admin on public.boarding_houses for delete using (public.current_role() = 'admin');

-- ── boarding house child tables (amenities/photos) — public read, landlord write
alter table public.boarding_house_amenities enable row level security;
create policy bha_select_public on public.boarding_house_amenities for select to anon, authenticated using (true);
create policy bha_write_landlord on public.boarding_house_amenities for all
  using (public.owns_boarding_house(boarding_house_id)) with check (public.owns_boarding_house(boarding_house_id));
create policy bha_write_admin on public.boarding_house_amenities for all using (public.current_role() = 'admin');

alter table public.boarding_house_photos enable row level security;
create policy bhp_select_public on public.boarding_house_photos for select to anon, authenticated using (true);
create policy bhp_write_landlord on public.boarding_house_photos for all
  using (public.owns_boarding_house(boarding_house_id)) with check (public.owns_boarding_house(boarding_house_id));
create policy bhp_write_admin on public.boarding_house_photos for all using (public.current_role() = 'admin');

-- ── rooms / room children / beds — public read, landlord write ─────────────
alter table public.rooms enable row level security;
create policy rooms_select_public on public.rooms for select to anon, authenticated using (true);
create policy rooms_write_landlord on public.rooms for all
  using (public.owns_boarding_house(boarding_house_id)) with check (public.owns_boarding_house(boarding_house_id));
create policy rooms_write_admin on public.rooms for all using (public.current_role() = 'admin');

alter table public.room_amenities enable row level security;
create policy ra_select_public on public.room_amenities for select to anon, authenticated using (true);
create policy ra_write_landlord on public.room_amenities for all
  using (public.owns_room(room_id)) with check (public.owns_room(room_id));
create policy ra_write_admin on public.room_amenities for all using (public.current_role() = 'admin');

alter table public.room_photos enable row level security;
create policy rp_select_public on public.room_photos for select to anon, authenticated using (true);
create policy rp_write_landlord on public.room_photos for all
  using (public.owns_room(room_id)) with check (public.owns_room(room_id));
create policy rp_write_admin on public.room_photos for all using (public.current_role() = 'admin');

alter table public.beds enable row level security;
create policy beds_select_public on public.beds for select to anon, authenticated using (true);
create policy beds_write_landlord on public.beds for all
  using (public.owns_room(room_id)) with check (public.owns_room(room_id));
create policy beds_write_admin on public.beds for all using (public.current_role() = 'admin');

-- ── student_boarding_registrations ──────────────────────────────────────────
alter table public.student_boarding_registrations enable row level security;
create policy sbr_select_student on public.student_boarding_registrations for select using (student_id = auth.uid());
create policy sbr_select_landlord on public.student_boarding_registrations for select
  using (public.owns_boarding_house(boarding_house_id));
create policy sbr_select_parent on public.student_boarding_registrations for select
  using (public.is_linked_parent_of(student_id));
create policy sbr_select_admin on public.student_boarding_registrations for select using (public.current_role() = 'admin');
create policy sbr_insert_student on public.student_boarding_registrations for insert
  with check (student_id = auth.uid());
create policy sbr_update_student on public.student_boarding_registrations for update
  using (student_id = auth.uid() and status = 'pending') with check (student_id = auth.uid());
create policy sbr_update_landlord on public.student_boarding_registrations for update
  using (public.owns_boarding_house(boarding_house_id)) with check (public.owns_boarding_house(boarding_house_id));
create policy sbr_update_admin on public.student_boarding_registrations for update using (public.current_role() = 'admin');

-- ── student_assignments ─────────────────────────────────────────────────────
alter table public.student_assignments enable row level security;
create policy sa_select_student on public.student_assignments for select using (student_id = auth.uid());
create policy sa_select_landlord on public.student_assignments for select
  using (public.owns_boarding_house(boarding_house_id));
create policy sa_select_parent on public.student_assignments for select
  using (public.is_linked_parent_of(student_id));
create policy sa_select_admin on public.student_assignments for select using (public.current_role() = 'admin');
create policy sa_write_landlord on public.student_assignments for all
  using (public.owns_boarding_house(boarding_house_id)) with check (public.owns_boarding_house(boarding_house_id));
create policy sa_write_admin on public.student_assignments for all using (public.current_role() = 'admin');

-- ── payments / payment_bills / payment_records ──────────────────────────────
alter table public.payments enable row level security;
create policy pay_select_student on public.payments for select using (student_id = auth.uid());
create policy pay_select_parent on public.payments for select using (public.is_linked_parent_of(student_id));
create policy pay_select_landlord on public.payments for select using (public.owns_boarding_house(boarding_house_id));
create policy pay_select_admin on public.payments for select using (public.current_role() = 'admin');
create policy pay_write_landlord on public.payments for all
  using (public.owns_boarding_house(boarding_house_id)) with check (public.owns_boarding_house(boarding_house_id));
create policy pay_write_admin on public.payments for all using (public.current_role() = 'admin');

alter table public.payment_bills enable row level security;
create policy pb_select on public.payment_bills for select using (
  exists (select 1 from public.payments p where p.id = payment_bills.payment_id and (
    p.student_id = auth.uid() or public.is_linked_parent_of(p.student_id) or public.owns_boarding_house(p.boarding_house_id)
  ))
);
create policy pb_select_admin on public.payment_bills for select using (public.current_role() = 'admin');
create policy pb_write_landlord on public.payment_bills for all using (
  exists (select 1 from public.payments p where p.id = payment_bills.payment_id and public.owns_boarding_house(p.boarding_house_id))
) with check (
  exists (select 1 from public.payments p where p.id = payment_bills.payment_id and public.owns_boarding_house(p.boarding_house_id))
);
create policy pb_write_admin on public.payment_bills for all using (public.current_role() = 'admin');

alter table public.payment_records enable row level security;
create policy pr_select_submitter on public.payment_records for select using (submitted_by = auth.uid());
create policy pr_select_landlord on public.payment_records for select using (
  exists (
    select 1 from public.payment_bills pb join public.payments p on p.id = pb.payment_id
    where pb.id = payment_records.bill_id and public.owns_boarding_house(p.boarding_house_id)
  )
);
create policy pr_select_admin on public.payment_records for select using (public.current_role() = 'admin');
create policy pr_insert_own on public.payment_records for insert with check (
  submitted_by = auth.uid() and exists (
    select 1 from public.payment_bills pb join public.payments p on p.id = pb.payment_id
    where pb.id = payment_records.bill_id and (p.student_id = auth.uid() or public.is_linked_parent_of(p.student_id))
  )
);
create policy pr_update_landlord on public.payment_records for update using (
  exists (
    select 1 from public.payment_bills pb join public.payments p on p.id = pb.payment_id
    where pb.id = payment_records.bill_id and public.owns_boarding_house(p.boarding_house_id)
  )
);
create policy pr_update_admin on public.payment_records for update using (public.current_role() = 'admin');

-- ── reports / report_responses ───────────────────────────────────────────────
alter table public.reports enable row level security;
create policy reports_select_submitter on public.reports for select using (submitter_id = auth.uid());
create policy reports_select_target on public.reports for select using (target_user_id = auth.uid());
create policy reports_select_landlord on public.reports for select using (public.owns_boarding_house(boarding_house_id));
create policy reports_select_admin on public.reports for select using (public.current_role() = 'admin');
create policy reports_insert_own on public.reports for insert with check (submitter_id = auth.uid());
create policy reports_update_landlord on public.reports for update using (public.owns_boarding_house(boarding_house_id));
create policy reports_update_admin on public.reports for update using (public.current_role() = 'admin');

alter table public.report_responses enable row level security;
create policy rr_select on public.report_responses for select using (
  exists (
    select 1 from public.reports r where r.id = report_responses.report_id and (
      r.submitter_id = auth.uid() or r.target_user_id = auth.uid() or public.owns_boarding_house(r.boarding_house_id)
    )
  )
);
create policy rr_select_admin on public.report_responses for select using (public.current_role() = 'admin');
create policy rr_insert on public.report_responses for insert with check (
  responder_id = auth.uid() and exists (
    select 1 from public.reports r where r.id = report_responses.report_id and public.owns_boarding_house(r.boarding_house_id)
  )
);
create policy rr_insert_admin on public.report_responses for insert with check (public.current_role() = 'admin');

-- ── check_in_out_records ─────────────────────────────────────────────────────
alter table public.check_in_out_records enable row level security;
create policy cior_select_student on public.check_in_out_records for select using (student_id = auth.uid());
create policy cior_select_landlord on public.check_in_out_records for select using (public.owns_boarding_house(boarding_house_id));
create policy cior_select_parent on public.check_in_out_records for select using (public.is_linked_parent_of(student_id));
create policy cior_select_admin on public.check_in_out_records for select using (public.current_role() = 'admin');
create policy cior_insert_student on public.check_in_out_records for insert with check (student_id = auth.uid());

-- ── announcements ─────────────────────────────────────────────────────────────
alter table public.announcements enable row level security;
create policy ann_select on public.announcements for select using (status <> 'archived');
create policy ann_write_landlord on public.announcements for all
  using (public.owns_boarding_house(boarding_house_id)) with check (public.owns_boarding_house(boarding_house_id));
create policy ann_write_admin on public.announcements for all using (public.current_role() = 'admin');

-- ── notifications ─────────────────────────────────────────────────────────────
alter table public.notifications enable row level security;
create policy notif_select_own on public.notifications for select using (user_id = auth.uid());
create policy notif_update_own on public.notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
-- Any authenticated user may create a notification addressed to someone else
-- (e.g. a student's registration notifies their landlord) — this is deliberately
-- permissive for now, matching the current app's addNotification() call pattern.
-- Phase 6 tightens this to trigger-generated-only inserts.
create policy notif_insert_authenticated on public.notifications for insert
  to authenticated with check (true);
create policy notif_all_admin on public.notifications for all using (public.current_role() = 'admin');

-- ── chat ─────────────────────────────────────────────────────────────────────
alter table public.conversations enable row level security;
create policy conv_select_member on public.conversations for select using (public.is_conversation_member(id));
create policy conv_select_admin on public.conversations for select using (public.current_role() = 'admin');
create policy conv_insert_authenticated on public.conversations for insert
  to authenticated with check (created_by = auth.uid());
create policy conv_update_member on public.conversations for update using (public.is_conversation_member(id));

alter table public.conversation_members enable row level security;
create policy cm_select_member on public.conversation_members for select using (public.is_conversation_member(conversation_id));
create policy cm_select_admin on public.conversation_members for select using (public.current_role() = 'admin');
create policy cm_insert on public.conversation_members for insert
  with check (user_id = auth.uid() or public.is_conversation_member(conversation_id));
create policy cm_update_own on public.conversation_members for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy cm_delete on public.conversation_members for delete
  using (user_id = auth.uid() or public.is_conversation_member(conversation_id));

alter table public.messages enable row level security;
create policy msg_select_member on public.messages for select using (public.is_conversation_member(conversation_id));
create policy msg_select_admin on public.messages for select using (public.current_role() = 'admin');
create policy msg_insert_member on public.messages for insert
  with check (sender_id = auth.uid() and public.is_conversation_member(conversation_id));

-- ── role_permissions ─────────────────────────────────────────────────────────
alter table public.role_permissions enable row level security;
create policy rp_select_all on public.role_permissions for select to authenticated using (true);
create policy rp_write_admin on public.role_permissions for all using (public.current_role() = 'admin');

-- ── _migrations (internal tracking, never exposed via PostgREST) ────────────
alter table public._migrations enable row level security;
-- No policies: RLS enabled with zero policies denies all access via the API;
-- the migration runner connects directly over Postgres and bypasses PostgREST/RLS.
