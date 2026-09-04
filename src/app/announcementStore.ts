// Live "Announcements" widget data for StudentHome.tsx and ParentHome.tsx.
// Both screens previously rendered a hardcoded sample list even after
// AdminSystem.tsx's announcement composer (adminSystemStore.ts) was wired to
// the real `announcements` table — landlord/admin announcements never
// actually reached students or parents. This queries that same table,
// scoped by audience; boarding-house/platform-wide visibility is already
// enforced server-side by ann_select_platform / ann_select_tenant /
// ann_select_landlord_own (0023_announcements_bh_scoped_select.sql).
import { supabase } from "../lib/supabase";

// Priority (still a real column, still settable by admin's own separate composer in
// AdminSystem.tsx) is deliberately not surfaced here — students/parents no longer see
// any priority level on an announcement card, for either a landlord's or an admin's.
export type MyAnnouncement = {
  id: string; title: string; desc: string; date: string; createdAt: string;
  // The event this announcement is *about* (e.g. a landlord's scheduled highlight),
  // distinct from `date`/`createdAt` (when it was posted) — only set for
  // landlord-mirrored announcements that had a date/time (0042_announcements_event_date_time.sql).
  eventDate?: string; eventTime?: string;
};

function mapAnnouncement(row: any): MyAnnouncement {
  return {
    id: row.id,
    title: row.title,
    desc: row.description,
    date: new Date(row.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    createdAt: row.created_at,
    eventDate: row.event_date ?? undefined,
    eventTime: row.event_time ?? undefined,
  };
}

export async function getMyAnnouncements(audience: "students" | "parents" | "landlords"): Promise<MyAnnouncement[]> {
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .in("audience", ["everyone", audience])
    .neq("status", "archived")
    .order("created_at", { ascending: false });
  if (error) { console.error("getMyAnnouncements:", error.message); return []; }
  // Local calendar day, not `.toISOString()`'s UTC one — for a timezone ahead of UTC
  // (e.g. Philippines, UTC+8, where this app is actually used) that would silently be
  // *yesterday's* date for the first several hours of every local day, which could
  // hide a just-scheduled announcement or reveal an expired one a day early.
  const nowLocal = new Date();
  const today = `${nowLocal.getFullYear()}-${String(nowLocal.getMonth()+1).padStart(2,"0")}-${String(nowLocal.getDate()).padStart(2,"0")}`;
  return (data ?? [])
    .filter((row: any) => (!row.scheduled_date || row.scheduled_date <= today) && (!row.expiry_date || row.expiry_date >= today))
    .map(mapAnnouncement);
}

// Real per-user "already read this" state (0043_announcement_reads.sql) — previously
// this was only ever kept as in-memory React state on the home screen, so it reset to
// unread on every refresh/remount even for announcements the user had already opened.
export async function getMyReadAnnouncementIds(): Promise<string[]> {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return [];
  const { data, error } = await supabase.from("announcement_reads").select("announcement_id").eq("user_id", uid);
  if (error) { console.error("getMyReadAnnouncementIds:", error.message); return []; }
  return (data ?? []).map((r: any) => r.announcement_id as string);
}

export async function markAnnouncementRead(announcementId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return { ok: false, error: "Not signed in." };
  const { error } = await supabase.from("announcement_reads").upsert(
    { user_id: uid, announcement_id: announcementId },
    { onConflict: "user_id,announcement_id", ignoreDuplicates: true },
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
