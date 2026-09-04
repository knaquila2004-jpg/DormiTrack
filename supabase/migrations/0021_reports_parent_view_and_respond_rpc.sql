-- DormiTrack — Phase 6a (Reports): two gaps found while wiring the real UI
-- onto the existing reports/report_responses schema (0001_schema.sql).
--
-- 1. No policy let a linked parent see their student's reports at all
--    (only submitter/target/landlord/admin existed) — but ParentHome.tsx's
--    "Student Reports" card needs exactly that. Mirrors the existing
--    users_select_linked_parent policy's condition (0003_rls.sql).
create policy reports_select_linked_parent on public.reports for select using (
  public.is_linked_parent_of(submitter_id)
);
create policy rr_select_linked_parent on public.report_responses for select using (
  exists (
    select 1 from public.reports r where r.id = report_responses.report_id and public.is_linked_parent_of(r.submitter_id)
  )
);

-- 2. A landlord responding to a report needs to do two writes atomically
--    (insert the response row, flip the report's status) — same shape as
--    verify_payment_record/reject_payment_record (0016). Also open to admin.
create function public.respond_to_report(p_report_id uuid, p_status text, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare
  rep record;
begin
  select * into rep from public.reports where id = p_report_id;
  if rep is null then raise exception 'Report not found'; end if;
  if not (public.owns_boarding_house(rep.boarding_house_id) or public.current_role() = 'admin') then
    raise exception 'Not authorized to respond to this report';
  end if;
  if p_status not in ('pending','under-review','in-progress','resolved','rejected','closed') then
    raise exception 'Invalid status';
  end if;

  insert into public.report_responses (report_id, responder_id, note, status_after)
  values (p_report_id, auth.uid(), p_note, p_status);
  update public.reports set status = p_status, updated_at = now() where id = p_report_id;
end;
$$;
grant execute on function public.respond_to_report(uuid, text, text) to authenticated;
