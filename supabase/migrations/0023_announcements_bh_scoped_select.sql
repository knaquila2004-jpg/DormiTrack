-- DormiTrack — found while wiring notifications (adjacent read of
-- announcements.select policy): ann_select (0003_rls.sql) has no
-- boarding_house_id check at all — any authenticated user can read every
-- landlord's BH-scoped announcements, not just their own boarding house's.
-- Platform-wide announcements (boarding_house_id is null, per the schema
-- comment) should stay visible to everyone; BH-scoped ones should only be
-- visible to that BH's current tenants (+ their linked parents) and the
-- owning landlord.
drop policy ann_select on public.announcements;

create function public.is_at_boarding_house(p_bh_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.student_assignments sa
    where sa.boarding_house_id = p_bh_id and sa.is_current
      and (sa.student_id = auth.uid() or public.is_linked_parent_of(sa.student_id))
  );
$$;

create policy ann_select_platform on public.announcements for select using (
  boarding_house_id is null and status <> 'archived'
);
create policy ann_select_tenant on public.announcements for select using (
  status <> 'archived' and public.is_at_boarding_house(boarding_house_id)
);
create policy ann_select_landlord_own on public.announcements for select using (
  public.owns_boarding_house(boarding_house_id)
);
