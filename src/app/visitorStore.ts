// Live "Visitor Records" data — the landlord-side UI (stats card + filterable
// logbook modal in App.tsx) has existed since early in this project, reading
// from a permanently-empty local array with the comment "no visitor_records
// table exists ... no creation flow anywhere in the app for either role."
// This is that real table (0044_visitor_records.sql) plus the student-facing
// submission form it unlocks — a student logs a visitor (name/contact/etc.,
// whichever fields the landlord's own config has enabled), and can mark them
// as having left; the landlord's existing "Visitor Has Left" button can do
// the same from their side.
import { supabase } from "../lib/supabase";

// No manually-entered "Visit Date" field anymore — a visitor is only ever logged
// in the moment (time_in, always real, always "now"), so the date shown for a
// record is always derived straight from that real timestamp via loggedLabel()
// below, never something the student typed in themselves.
export type VisitorFieldsConfig = { name: boolean; contact: boolean; relationship: boolean; purpose: boolean };
const DEFAULT_FIELDS: VisitorFieldsConfig = { name: true, contact: true, relationship: true, purpose: true };

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" });
}
// Local calendar day, not a naive UTC slice — the same timezone trap found and
// fixed elsewhere this session (a Postgres timestamptz strung through
// `.toISOString()` reports the UTC date, which is silently "yesterday" for the
// first several hours of every local day in a timezone ahead of UTC, e.g. the
// Philippines, where this app is actually used).
export function toLocalISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

// The one place that decides how a record's log date reads: "Today" the same day,
// "Yesterday" the day after, "N days ago" through the rest of the week, and the
// real calendar date once it's been a week or more — never a raw ISO string.
export function loggedLabel(ts: number): string {
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOfDay(new Date()) - startOfDay(new Date(ts))) / 86400000);
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ── Student side ──────────────────────────────────────────────────────────────

export async function getMyVisitorConfig(): Promise<{ enabled: boolean; fields: VisitorFieldsConfig; bhId: string | null }> {
  const NONE = { enabled: false, fields: DEFAULT_FIELDS, bhId: null as string | null };
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return NONE;
  const { data: sa } = await supabase.from("student_assignments").select("boarding_house_id").eq("student_id", uid).eq("is_current", true).maybeSingle();
  if (!sa) return NONE;
  const { data: bh, error } = await supabase.from("boarding_houses").select("visitor_log_enabled, visitor_fields").eq("id", sa.boarding_house_id).maybeSingle();
  if (error || !bh) return NONE;
  return { enabled: bh.visitor_log_enabled ?? false, fields: bh.visitor_fields ?? DEFAULT_FIELDS, bhId: sa.boarding_house_id };
}

export type MyVisitorRecord = {
  id: string; visitorName?: string; contact?: string; relationship?: string; purpose?: string;
  ts: number; // raw time_in (ms) — feeds loggedLabel() for display
  timeIn: string; timeOut?: string; status: "inside" | "left";
};

function mapMine(row: any): MyVisitorRecord {
  return {
    id: row.id, visitorName: row.visitor_name ?? undefined, contact: row.contact ?? undefined,
    relationship: row.relationship ?? undefined, purpose: row.purpose ?? undefined,
    ts: new Date(row.time_in).getTime(),
    timeIn: fmtTime(row.time_in), timeOut: row.time_out ? fmtTime(row.time_out) : undefined,
    status: row.status,
  };
}

export async function getMyVisitorRecords(): Promise<MyVisitorRecord[]> {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return [];
  const { data, error } = await supabase.from("visitor_records").select("*").eq("student_id", uid).order("time_in", { ascending: false });
  if (error) { console.error("getMyVisitorRecords:", error.message); return []; }
  return (data ?? []).map(mapMine);
}

export type SubmitVisitorInput = { visitorName?: string; contact?: string; relationship?: string; purpose?: string };

// Returns the new row's id so the caller can notify the landlord with a real
// relatedId — every notification in this app is required to deep-link to the
// specific thing it's about, not just a generic screen (see App.tsx's
// DashboardScreen handling this type further down).
export async function submitVisitorRecord(bhId: string, input: SubmitVisitorInput): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return { ok: false, error: "Not signed in." };
  const { data, error } = await supabase.from("visitor_records").insert({
    boarding_house_id: bhId, student_id: uid,
    visitor_name: input.visitorName?.trim() || null,
    contact: input.contact?.trim() || null,
    relationship: input.relationship?.trim() || null,
    purpose: input.purpose?.trim() || null,
    status: "inside",
  }).select("id").single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data.id };
}

// Either the student or the landlord may record a departure (vr_update_own /
// vr_update_landlord, 0044) — this same call works from both sides. `timeOut`
// defaults to right now, but callers can pass a specific past moment instead —
// a student who forgot to tap this the instant their visitor actually left
// shouldn't be stuck logging a wrong (late) departure time.
export async function markVisitorLeft(id: string, timeOut: Date = new Date()): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.from("visitor_records").update({ status: "left", time_out: timeOut.toISOString() }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// A student correcting/filling in details on their own already-logged visitor
// (e.g. forgot the contact number at the time) — student_id = auth.uid() in
// vr_update_own already scopes this to their own records, same policy
// markVisitorLeft relies on.
export async function updateVisitorRecord(id: string, input: SubmitVisitorInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.from("visitor_records").update({
    visitor_name: input.visitorName?.trim() || null,
    contact: input.contact?.trim() || null,
    relationship: input.relationship?.trim() || null,
    purpose: input.purpose?.trim() || null,
  }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ── Landlord side ─────────────────────────────────────────────────────────────

export type LandlordVisitorRecord = {
  id: string; studentId: string; studentName: string; room: string;
  visitorName?: string; contact?: string; relationship?: string; purpose?: string;
  date: string; // local ISO "YYYY-MM-DD" of time_in, for the Today/Week/Month filters
  ts: number;   // raw time_in (ms) — feeds loggedLabel() for display and chronological sort
  timeIn: string; timeOut?: string; status: "inside" | "left";
};

export async function getVisitorRecordsForLandlord(landlordId: string): Promise<LandlordVisitorRecord[]> {
  const { data: bhs } = await supabase.from("boarding_houses").select("id").eq("landlord_id", landlordId);
  const bhIds = (bhs ?? []).map(b => b.id);
  if (!bhIds.length) return [];
  const { data, error } = await supabase.from("visitor_records").select("*").in("boarding_house_id", bhIds).order("time_in", { ascending: false });
  if (error) { console.error("getVisitorRecordsForLandlord:", error.message); return []; }
  const studentIds = [...new Set((data ?? []).map((r: any) => r.student_id))];
  if (!studentIds.length) return [];
  const [{ data: users }, { data: assignments }] = await Promise.all([
    supabase.from("users").select("id, first_name, last_name").in("id", studentIds),
    supabase.from("student_assignments").select("student_id, rooms(name)").in("student_id", studentIds).eq("is_current", true),
  ]);
  const nameById = new Map((users ?? []).map((u: any) => [u.id, [u.first_name, u.last_name].filter(Boolean).join(" ")]));
  const roomById = new Map((assignments ?? []).map((a: any) => [a.student_id, a.rooms?.name ?? "—"]));
  return (data ?? []).map((row: any) => ({
    id: row.id,
    studentId: row.student_id,
    studentName: nameById.get(row.student_id) ?? "—",
    room: roomById.get(row.student_id) ?? "—",
    visitorName: row.visitor_name ?? undefined, contact: row.contact ?? undefined,
    relationship: row.relationship ?? undefined, purpose: row.purpose ?? undefined,
    date: toLocalISODate(new Date(row.time_in)),
    ts: new Date(row.time_in).getTime(),
    timeIn: fmtTime(row.time_in), timeOut: row.time_out ? fmtTime(row.time_out) : undefined,
    status: row.status,
  }));
}
