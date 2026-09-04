// Live Supabase-backed replacement for App.tsx's INITIAL_HIGHLIGHTS mock —
// the landlord's own "Announcements" planner (task/reminder list shown on
// their dashboard; UI-facing term only — the underlying table/type/file names
// stayed "highlights"/"Highlight"). Resolves to the landlord's first boarding
// house, same convention App.tsx's RoomsScreen already uses
// (getBoardingHousesForLandlord(uid)[0]).
//
// Each highlight optionally mirrors into the real, already-BH-scoped
// `announcements` table (0041_highlights_mirror_to_announcements.sql) so it
// actually reaches that boarding house's current students + their linked
// parents — announcementStore.ts's getMyAnnouncements() already reads from
// that same table, so no change was needed on the reading side. Every
// student at the boarding house also gets a real "announcement" notification.
import { supabase } from "../lib/supabase";
import { Highlight } from "./LandlordHighlights";
import { addNotification, notifyLinkedParents } from "./notificationStore";

function mapHighlight(row: any): Highlight {
  return {
    id: row.id, title: row.title, description: row.description ?? undefined,
    date: row.date ?? undefined, time: row.time ?? undefined,
  };
}

async function myLandlordCtx(): Promise<{ uid: string; bhId: string } | null> {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return null;
  const { data, error } = await supabase.from("boarding_houses").select("id").eq("landlord_id", uid).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error || !data) return null;
  return { uid, bhId: data.id as string };
}

async function myBoardingHouseId(): Promise<string | null> {
  const ctx = await myLandlordCtx();
  return ctx?.bhId ?? null;
}

export async function getMyHighlights(): Promise<Highlight[]> {
  const bhId = await myBoardingHouseId();
  if (!bhId) return [];
  // NULLS LAST is Postgres's default for ascending order, so undated/untimed
  // rows land at the end here rather than the front — fine, the UI puts them
  // in their own "General Announcements" section regardless of this order.
  const { data, error } = await supabase.from("highlights").select("*").eq("boarding_house_id", bhId).order("date", { ascending: true }).order("time", { ascending: true });
  if (error) { console.error("getMyHighlights:", error.message); return []; }
  return (data ?? []).map(mapHighlight);
}

// The `announcements` table only has a `scheduled_date` (meaning "don't show
// this until then" — a delayed-publish concept), not a time, and it isn't
// the same idea as a highlight's own date/time (which describes when the
// reminded-about event happens, not when the announcement should appear).
// So the mirrored copy always publishes immediately and instead states the
// schedule in its own description text, appended after whatever the
// landlord actually wrote.
function fmtTime12h(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${ap}`;
}
function fmtDateLong(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}
function mirroredDescription(description: string | undefined, date?: string, time?: string): string {
  const base = description?.trim() ?? "";
  let scheduleLine = "";
  if (date && time) scheduleLine = `Scheduled for ${fmtDateLong(date)} at ${fmtTime12h(time)}.`;
  else if (date) scheduleLine = `Scheduled for ${fmtDateLong(date)}.`;
  else if (time) scheduleLine = `Time: ${fmtTime12h(time)}.`;
  return [base, scheduleLine].filter(Boolean).join("\n\n");
}

// Every current student at this boarding house + each of their linked
// parents — the same "who's actually a tenant here right now" scope the
// mirrored announcement's own RLS (ann_select_tenant / is_at_boarding_house)
// already enforces for reading it.
async function notifyBoardingHouseTenants(bhId: string, announcementId: string, title: string, description: string): Promise<void> {
  const { data: assignments, error } = await supabase
    .from("student_assignments").select("student_id").eq("boarding_house_id", bhId).eq("is_current", true);
  if (error) { console.error("notifyBoardingHouseTenants:", error.message); return; }
  const studentIds = [...new Set((assignments ?? []).map((a: any) => a.student_id as string))];
  await Promise.all(studentIds.flatMap(studentId => [
    addNotification({ userId: studentId, type: "announcement", title, description, destination: "dashboard", relatedId: announcementId }),
    notifyLinkedParents(studentId, { type: "announcement", title, description, destination: "dashboard", relatedId: announcementId }),
  ]));
}

export async function createHighlight(input: Omit<Highlight, "id">): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const ctx = await myLandlordCtx();
  if (!ctx) return { ok: false, error: "No boarding house found for this account." };
  const { uid, bhId } = ctx;

  // Mirror into `announcements` first — its id needs to be on the highlight row.
  // event_date/event_time (0042) are the structured copy of the same date/time
  // already stated in prose within the description — lets a reader (e.g. the
  // student home screen's "Today's Overview") pick out "an announcement about
  // today" without parsing text.
  const { data: ann, error: annErr } = await supabase.from("announcements").insert({
    boarding_house_id: bhId, author_id: uid, title: input.title,
    description: mirroredDescription(input.description, input.date, input.time),
    audience: "everyone", priority: "normal", status: "active",
    event_date: input.date ?? null, event_time: input.time ?? null,
  }).select("id").single();
  if (annErr || !ann) return { ok: false, error: annErr?.message ?? "Could not publish the announcement." };

  const { data, error } = await supabase.from("highlights").insert({
    // No `priority`/`category` sent — both removed UI fields just fall back to
    // their DB defaults ('medium' / not applicable — category is fixed below
    // since the column itself has no default), unused by anything now.
    boarding_house_id: bhId, title: input.title, description: input.description ?? null,
    date: input.date ?? null, time: input.time ?? null, category: "announcement",
    announcement_id: ann.id,
  }).select("id").single();
  if (error || !data) return { ok: false, error: error?.message ?? "Could not create highlight." };

  notifyBoardingHouseTenants(bhId, ann.id as string, input.title, input.description?.trim() || input.title);
  return { ok: true, id: data.id as string };
}

export async function updateHighlight(h: Highlight): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: existing, error: fetchErr } = await supabase.from("highlights").select("announcement_id, boarding_house_id").eq("id", h.id).maybeSingle();
  if (fetchErr || !existing) return { ok: false, error: fetchErr?.message ?? "Announcement not found." };

  let announcementId = existing.announcement_id as string | null;
  const mirroredDesc = mirroredDescription(h.description, h.date, h.time);

  if (announcementId) {
    const { error: annErr } = await supabase.from("announcements").update({
      title: h.title, description: mirroredDesc,
      event_date: h.date ?? null, event_time: h.time ?? null,
    }).eq("id", announcementId);
    if (annErr) console.error("updateHighlight (mirrored announcement):", annErr.message);
  } else {
    // A highlight from before the mirroring feature existed has no announcement to
    // update — publish one now instead of leaving it permanently invisible to
    // students/parents just because it predates this.
    const ctx = await myLandlordCtx();
    if (ctx) {
      const { data: ann, error: annErr } = await supabase.from("announcements").insert({
        boarding_house_id: existing.boarding_house_id, author_id: ctx.uid, title: h.title,
        description: mirroredDesc, audience: "everyone", priority: "normal", status: "active",
        event_date: h.date ?? null, event_time: h.time ?? null,
      }).select("id").single();
      if (annErr) console.error("updateHighlight (create mirrored announcement):", annErr.message);
      else if (ann) {
        announcementId = ann.id as string;
        const { error: linkErr } = await supabase.from("highlights").update({ announcement_id: announcementId }).eq("id", h.id);
        if (linkErr) console.error("updateHighlight (link mirrored announcement):", linkErr.message);
      }
    }
  }

  const { error } = await supabase.from("highlights").update({
    // Explicit `null` (not `undefined`) so switching the date/time toggle off
    // during an edit actually clears the column — `undefined` values get
    // dropped from the JSON payload entirely, which would silently leave the
    // old value in place instead of removing it.
    title: h.title, description: h.description ?? null, date: h.date ?? null, time: h.time ?? null,
  }).eq("id", h.id);
  if (error) return { ok: false, error: error.message };

  // Same fan-out as creating one — an edit is real new information (a changed date,
  // a corrected detail) and the tenants who already saw the original deserve to know
  // it changed, not just whoever sees it for the first time.
  if (announcementId) {
    const notifDesc = `"${h.title}" was updated.${h.description?.trim() ? ` ${h.description.trim()}` : ""}`;
    notifyBoardingHouseTenants(existing.boarding_house_id, announcementId, "Announcement Updated", notifDesc);
  }
  return { ok: true };
}

export async function deleteHighlight(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: existing } = await supabase.from("highlights").select("announcement_id").eq("id", id).maybeSingle();
  const { error } = await supabase.from("highlights").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  if (existing?.announcement_id) {
    const { error: annErr } = await supabase.from("announcements").delete().eq("id", existing.announcement_id);
    if (annErr) console.error("deleteHighlight (mirrored announcement):", annErr.message);
  }
  return { ok: true };
}
