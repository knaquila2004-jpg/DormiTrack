// Real request/approval workflow for moving to a different room/bed within the
// same boarding house — the student's "My Dorm" page previously had no way to
// ask for this at all. Mirrors stayChangeStore.ts's shape exactly: the student
// proposes a specific destination bed (from the same real available-bed list
// the landlord's own "Transfer Room" quick action already offers,
// registrationStore.ts/0049), the landlord reviews it in that occupant's
// profile, and only on approval does the real transfer happen (reusing
// transfer_student_room, 0049, so the same atomic bed-availability guard
// applies — a bed someone else took while this sat pending can't be
// double-booked).
import { supabase } from "../lib/supabase";
import { transferStudentRoom } from "./registrationStore";

export type MyCurrentRoomBed = {
  assignmentId: string; boardingHouseId: string;
  roomId: string; roomName: string; bedId: string; bedLabel: string;
};

export async function getMyCurrentRoomBed(): Promise<MyCurrentRoomBed | null> {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return null;
  const { data: sa, error } = await supabase
    .from("student_assignments")
    .select("id, boarding_house_id, room_id, bed_id, rooms(name), beds(label)")
    .eq("student_id", uid).eq("is_current", true).maybeSingle();
  if (error || !sa) return null;
  return {
    assignmentId: sa.id, boardingHouseId: sa.boarding_house_id,
    roomId: sa.room_id, roomName: (sa as any).rooms?.name ?? "—",
    bedId: sa.bed_id, bedLabel: (sa as any).beds?.label ?? "—",
  };
}

export type RoomTransferRequest = {
  id: string; status: "pending" | "approved" | "rejected";
  currentRoomName: string; currentBedLabel: string;
  requestedRoomName: string; requestedBedLabel: string;
  studentNote?: string; landlordNote?: string;
  createdAt: string;
};

async function nameRoomBed(roomId: string, bedId: string): Promise<{ roomName: string; bedLabel: string }> {
  const [{ data: room }, { data: bed }] = await Promise.all([
    supabase.from("rooms").select("name").eq("id", roomId).maybeSingle(),
    supabase.from("beds").select("label").eq("id", bedId).maybeSingle(),
  ]);
  return { roomName: room?.name ?? "—", bedLabel: bed?.label ?? "—" };
}

async function mapRequest(row: any): Promise<RoomTransferRequest> {
  const [cur, req] = await Promise.all([
    nameRoomBed(row.current_room_id, row.current_bed_id),
    nameRoomBed(row.requested_room_id, row.requested_bed_id),
  ]);
  return {
    id: row.id, status: row.status,
    currentRoomName: cur.roomName, currentBedLabel: cur.bedLabel,
    requestedRoomName: req.roomName, requestedBedLabel: req.bedLabel,
    studentNote: row.student_note ?? undefined, landlordNote: row.landlord_note ?? undefined,
    createdAt: row.created_at,
  };
}

// ── Student side ──────────────────────────────────────────────────────────────

export async function getMyPendingRoomTransferRequest(): Promise<RoomTransferRequest | null> {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return null;
  const { data, error } = await supabase.from("room_transfer_requests").select("*")
    .eq("student_id", uid).eq("status", "pending")
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error || !data) return null;
  return mapRequest(data);
}

export async function submitRoomTransferRequest(requestedRoomId: string, requestedBedId: string, note?: string): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return { ok: false, error: "Not signed in." };
  const current = await getMyCurrentRoomBed();
  if (!current) return { ok: false, error: "Could not find your current assignment." };
  if (requestedBedId === current.bedId) return { ok: false, error: "You're already assigned to that bed." };
  const { data, error } = await supabase.from("room_transfer_requests").insert({
    student_id: uid, assignment_id: current.assignmentId, boarding_house_id: current.boardingHouseId,
    current_room_id: current.roomId, current_bed_id: current.bedId,
    requested_room_id: requestedRoomId, requested_bed_id: requestedBedId,
    student_note: note?.trim() || null,
  }).select("id").single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data.id };
}

// ── Landlord side ─────────────────────────────────────────────────────────────

export type LandlordRoomTransferRequest = RoomTransferRequest & {
  studentId: string; requestedRoomId: string; requestedBedId: string;
};

export async function getRoomTransferRequestsForLandlord(landlordId: string): Promise<LandlordRoomTransferRequest[]> {
  const { data: bhs } = await supabase.from("boarding_houses").select("id").eq("landlord_id", landlordId);
  const bhIds = (bhs ?? []).map(b => b.id);
  if (!bhIds.length) return [];
  const { data, error } = await supabase.from("room_transfer_requests").select("*")
    .in("boarding_house_id", bhIds).order("created_at", { ascending: false });
  if (error) { console.error("getRoomTransferRequestsForLandlord:", error.message); return []; }
  return Promise.all((data ?? []).map(async (row: any) => ({
    ...(await mapRequest(row)), studentId: row.student_id,
    requestedRoomId: row.requested_room_id, requestedBedId: row.requested_bed_id,
  })));
}

// Approving actually moves the student (transfer_student_room, 0049) — if the
// requested bed was taken by someone else while this sat pending, the RPC's
// own availability guard raises and this surfaces that as a real error rather
// than silently marking the request "approved" with nothing having moved.
export async function respondToRoomTransferRequest(id: string, approve: boolean, landlordNote?: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: reqRow, error: fetchErr } = await supabase.from("room_transfer_requests").select("*").eq("id", id).single();
  if (fetchErr || !reqRow) return { ok: false, error: fetchErr?.message ?? "Request not found." };
  if (reqRow.status !== "pending") return { ok: false, error: "This request has already been decided." };

  if (approve) {
    const res = await transferStudentRoom(reqRow.student_id, reqRow.requested_room_id, reqRow.requested_bed_id);
    if (res.ok === false) return res;
  }

  const { error } = await supabase.from("room_transfer_requests").update({
    status: approve ? "approved" : "rejected",
    landlord_note: landlordNote?.trim() || null,
    decided_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
