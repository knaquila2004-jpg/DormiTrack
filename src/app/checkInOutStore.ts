// Live Supabase-backed check-in/out history — replaces StudentMap.tsx's
// local-only SEED_LOGS array and simulated attendance state. The GPS/
// proximity "verification" itself stays a demo simulation (this app has no
// real device geolocation wired up — the Simulate GPS/Location toggles are
// explicitly a stand-in for that), but every check-in/out a student
// actually submits is now a real, persisted check_in_out_records row.
import { supabase } from "../lib/supabase";

export type CheckInOutType = "checkin" | "checkout";
export type CheckInOutResult = "verified" | "failed" | "out-of-range";

export type CheckInOutRecord = {
  id: string;
  type: CheckInOutType;
  occurredAt: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  result: CheckInOutResult;
};

function mapRow(row: any): CheckInOutRecord {
  return {
    id: row.id, type: row.type, occurredAt: row.occurred_at,
    address: row.address_snapshot ?? null, lat: row.lat ?? null, lng: row.lng ?? null,
    result: row.result,
  };
}

export async function getMyCheckInOutHistory(limit = 20): Promise<CheckInOutRecord[]> {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return [];
  return getCheckInOutHistoryForStudent(uid, limit);
}

// Parent/landlord-facing lookup — RLS (cior_select_parent/cior_select_landlord,
// 0003_rls.sql) already scopes this to a student's owning landlord or linked
// parent, so no extra authorization check is needed client-side.
export async function getCheckInOutHistoryForStudent(studentId: string, limit = 20): Promise<CheckInOutRecord[]> {
  const { data, error } = await supabase
    .from("check_in_out_records")
    .select("id, type, occurred_at, address_snapshot, lat, lng, result")
    .eq("student_id", studentId)
    .order("occurred_at", { ascending: false })
    .limit(limit);
  if (error) { console.error("getCheckInOutHistoryForStudent:", error.message); return []; }
  return (data ?? []).map(mapRow);
}

// ── Landlord dashboard "Recent Activity" feed — real check-ins/check-outs ──
// across every boarding house this landlord owns (not just one student), so
// they see it the moment a student taps check-in/check-out, same as a parent
// or the student themselves would.
export type LandlordCheckInOutEvent = { id: string; type: CheckInOutType; occurredAt: string; studentId: string; studentName: string };

export async function getCheckInOutActivityForLandlord(landlordId: string, limit = 20): Promise<LandlordCheckInOutEvent[]> {
  const { data: bhs } = await supabase.from("boarding_houses").select("id").eq("landlord_id", landlordId);
  const bhIds = (bhs ?? []).map(b => b.id);
  if (!bhIds.length) return [];

  const { data, error } = await supabase
    .from("check_in_out_records")
    .select("id, type, occurred_at, student_id")
    .in("boarding_house_id", bhIds)
    .order("occurred_at", { ascending: false })
    .limit(limit);
  if (error) { console.error("getCheckInOutActivityForLandlord:", error.message); return []; }

  const studentIds = [...new Set((data ?? []).map(r => r.student_id))];
  const { data: nameRows } = studentIds.length
    ? await supabase.from("students").select("user_id, users!inner ( first_name, last_name )").in("user_id", studentIds)
    : { data: [] as any[] };
  const nameByStudentId = new Map((nameRows ?? []).map((s: any) => [s.user_id, [s.users.first_name, s.users.last_name].filter(Boolean).join(" ")]));

  return (data ?? []).map(r => ({
    id: r.id, type: r.type as CheckInOutType, occurredAt: r.occurred_at, studentId: r.student_id,
    studentName: nameByStudentId.get(r.student_id) ?? "A student",
  }));
}

// The most recent check-in/out that happened today determines the
// student's current attendance status for the day.
export function todaysAttendanceStatus(history: CheckInOutRecord[]): "not-checked-in" | "checked-in" | "checked-out" {
  const now = new Date();
  const latestToday = history.find(r => new Date(r.occurredAt).toDateString() === now.toDateString());
  if (!latestToday) return "not-checked-in";
  return latestToday.type === "checkin" ? "checked-in" : "checked-out";
}

export type RecordCheckInOutInput = {
  type: CheckInOutType; boardingHouseId: string;
  address?: string; lat?: number; lng?: number; result?: CheckInOutResult;
};

export async function recordCheckInOut(input: RecordCheckInOutInput): Promise<{ ok: true; record: CheckInOutRecord } | { ok: false; error: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return { ok: false, error: "Not signed in." };
  const { data, error } = await supabase.from("check_in_out_records").insert({
    student_id: uid, boarding_house_id: input.boardingHouseId, type: input.type,
    address_snapshot: input.address ?? null, lat: input.lat ?? null, lng: input.lng ?? null,
    result: input.result ?? "verified",
  }).select("id, type, occurred_at, address_snapshot, lat, lng, result").single();
  if (error || !data) return { ok: false, error: error?.message ?? "Could not record check-in/out." };
  return { ok: true, record: mapRow(data) };
}
