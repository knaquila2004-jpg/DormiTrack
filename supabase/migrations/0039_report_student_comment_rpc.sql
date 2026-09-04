-- DormiTrack — Student "Add Comment" on their own report (StudentHome.tsx's
-- ReportDetailModal): the "Send Comment" button had no submit handler at all — and even
-- with one, report_responses only ever accepted inserts from the landlord/admin who owns
-- the boarding house (0003_rls.sql's rr_insert policy), so a student had no real path to
-- add a follow-up note. This RPC lets the report's own submitter append a comment without
-- changing status (status_after is set to the report's current status, unchanged) — same
-- SECURITY DEFINER shape as respond_to_report (0021), just authorized for the submitter
-- instead of the landlord/admin.
create function public.add_report_comment(p_report_id uuid, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare
  rep record;
begin
  select * into rep from public.reports where id = p_report_id;
  if rep is null then raise exception 'Report not found'; end if;
  if rep.submitter_id != auth.uid() then
    raise exception 'Not authorized to comment on this report';
  end if;
  if p_note is null or length(trim(p_note)) = 0 then
    raise exception 'Comment cannot be empty';
  end if;

  insert into public.report_responses (report_id, responder_id, note, status_after)
  values (p_report_id, auth.uid(), p_note, rep.status);
  update public.reports set updated_at = now() where id = p_report_id;
end;
$$;
grant execute on function public.add_report_comment(uuid, text) to authenticated;
