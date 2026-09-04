// Real request/approval workflow for "Your Assignment" (Move-in Date / Move-out
// Date / Stay Duration) on the student's My Dorm page — previously 100%
// read-only. A student proposes new values; the landlord is notified, reviews
// them in that occupant's profile, and only on approval do the real
// student_assignments.moved_in_at / student_boarding_registrations.move_out
// /stay_unit/stay_count rows actually change (0046_stay_change_requests.sql).
import { supabase } from "../lib/supabase";

export type StayUnit = "Weeks" | "Months";

export type MyCurrentStay = {
  assignmentId: string;
  registrationId: string | null;
  boardingHouseId: string;
  moveIn: string; // YYYY-MM-DD
  moveOut: string | null;
  stayUnit: StayUnit | null;
  stayCount: number | null;
};

// Raw (unformatted) values for pre-filling the edit form's date/number inputs —
// studentAssignmentStore.ts's MyStay only exposes already-formatted display
// strings ("August 22, 2026"), not parseable ISO dates.
export async function getMyCurrentStayRaw(): Promise<MyCurrentStay | null> {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return null;
  const { data: sa, error } = await supabase
    .from("student_assignments")
    .select("id, boarding_house_id, moved_in_at, registration_id")
    .eq("student_id", uid).eq("is_current", true).maybeSingle();
  if (error || !sa) return null;
  let moveOut: string | null = null, stayUnit: StayUnit | null = null, stayCount: number | null = null;
  if (sa.registration_id) {
    const { data: reg } = await supabase.from("student_boarding_registrations").select("move_out, stay_unit, stay_count").eq("id", sa.registration_id).maybeSingle();
    if (reg) { moveOut = reg.move_out; stayUnit = reg.stay_unit as StayUnit; stayCount = reg.stay_count; }
  }
  return { assignmentId: sa.id, registrationId: sa.registration_id, boardingHouseId: sa.boarding_house_id, moveIn: sa.moved_in_at, moveOut, stayUnit, stayCount };
}

export type StayChangeRequest = {
  id: string; status: "pending" | "approved" | "rejected";
  currentMoveIn: string; currentMoveOut: string | null; currentStayUnit: StayUnit | null; currentStayCount: number | null;
  requestedMoveIn: string; requestedMoveOut: string | null; requestedStayUnit: StayUnit | null; requestedStayCount: number | null;
  studentNote?: string; landlordNote?: string;
  createdAt: string;
};

function mapRequest(row: any): StayChangeRequest {
  return {
    id: row.id, status: row.status,
    currentMoveIn: row.current_move_in, currentMoveOut: row.current_move_out,
    currentStayUnit: row.current_stay_unit, currentStayCount: row.current_stay_count,
    requestedMoveIn: row.requested_move_in, requestedMoveOut: row.requested_move_out,
    requestedStayUnit: row.requested_stay_unit, requestedStayCount: row.requested_stay_count,
    studentNote: row.student_note ?? undefined, landlordNote: row.landlord_note ?? undefined,
    createdAt: row.created_at,
  };
}

// ── Student side ──────────────────────────────────────────────────────────────

export async function getMyPendingStayChangeRequest(): Promise<StayChangeRequest | null> {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return null;
  const { data, error } = await supabase.from("stay_change_requests").select("*")
    .eq("student_id", uid).eq("status", "pending")
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error || !data) return null;
  return mapRequest(data);
}

export type SubmitStayChangeInput = {
  moveIn: string; moveOut?: string | null; stayUnit?: StayUnit | null; stayCount?: number | null; note?: string;
};

export async function submitStayChangeRequest(input: SubmitStayChangeInput): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return { ok: false, error: "Not signed in." };
  const current = await getMyCurrentStayRaw();
  if (!current) return { ok: false, error: "Could not find your current assignment." };
  const { data, error } = await supabase.from("stay_change_requests").insert({
    student_id: uid, assignment_id: current.assignmentId, registration_id: current.registrationId, boarding_house_id: current.boardingHouseId,
    current_move_in: current.moveIn, current_move_out: current.moveOut, current_stay_unit: current.stayUnit, current_stay_count: current.stayCount,
    requested_move_in: input.moveIn, requested_move_out: input.moveOut ?? null,
    requested_stay_unit: input.stayUnit ?? null, requested_stay_count: input.stayCount ?? null,
    student_note: input.note?.trim() || null,
  }).select("id").single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data.id };
}

// ── Landlord side ─────────────────────────────────────────────────────────────

export type LandlordStayChangeRequest = StayChangeRequest & { studentId: string };

export async function getStayChangeRequestsForLandlord(landlordId: string): Promise<LandlordStayChangeRequest[]> {
  const { data: bhs } = await supabase.from("boarding_houses").select("id").eq("landlord_id", landlordId);
  const bhIds = (bhs ?? []).map(b => b.id);
  if (!bhIds.length) return [];
  const { data, error } = await supabase.from("stay_change_requests").select("*")
    .in("boarding_house_id", bhIds).order("created_at", { ascending: false });
  if (error) { console.error("getStayChangeRequestsForLandlord:", error.message); return []; }
  return (data ?? []).map((row: any) => ({ ...mapRequest(row), studentId: row.student_id }));
}

// Approving writes the real assignment/registration rows; rejecting only ever
// touches this request's own status. Either way the student is notified back.
export async function respondToStayChangeRequest(id: string, approve: boolean, landlordNote?: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: reqRow, error: fetchErr } = await supabase.from("stay_change_requests").select("*").eq("id", id).single();
  if (fetchErr || !reqRow) return { ok: false, error: fetchErr?.message ?? "Request not found." };

  if (approve) {
    const { error: saErr } = await supabase.from("student_assignments").update({ moved_in_at: reqRow.requested_move_in }).eq("id", reqRow.assignment_id);
    if (saErr) return { ok: false, error: saErr.message };
    if (reqRow.registration_id) {
      const patch: Record<string, unknown> = {};
      if (reqRow.requested_move_out !== null) patch.move_out = reqRow.requested_move_out;
      if (reqRow.requested_stay_unit !== null) patch.stay_unit = reqRow.requested_stay_unit;
      if (reqRow.requested_stay_count !== null) patch.stay_count = reqRow.requested_stay_count;
      if (Object.keys(patch).length) {
        const { error: regErr } = await supabase.from("student_boarding_registrations").update(patch).eq("id", reqRow.registration_id);
        if (regErr) return { ok: false, error: regErr.message };
      }
    }
  }

  const { error } = await supabase.from("stay_change_requests").update({
    status: approve ? "approved" : "rejected",
    landlord_note: landlordNote?.trim() || null,
    decided_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
