-- DormiTrack — Phase 10 (Admin screens): admin user-management actions.
--
-- Suspend/reactivate are plain UPDATEs (users_update_admin already grants
-- this — public.users.status is fully admin-writable). Real account
-- deletion is the one action with no client-safe path: it needs to remove
-- the auth.users row too (public.users cascades FROM auth.users, not the
-- other way), which normally requires the service-role key — explicitly
-- forbidden in frontend code throughout this project. Instead, this goes
-- through a SECURITY DEFINER function: migrations run as the `postgres`
-- role, which (verified directly) already holds DELETE on auth.users, so a
-- function it creates inherits that privilege for any caller — gated by an
-- explicit admin-only check inside the function body, the same
-- authorization pattern used by every other privileged RPC in this project.
-- Deleting auth.users cascades through public.users → students/parents/
-- landlords/admins → every table that references them, so this is a
-- complete, real deletion in one call.
create function public.admin_delete_user(p_user_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.current_role() <> 'admin' then
    raise exception 'Only admins can delete user accounts';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'Cannot delete your own account';
  end if;
  delete from auth.users where id = p_user_id;
end;
$$;
grant execute on function public.admin_delete_user(uuid) to authenticated;
