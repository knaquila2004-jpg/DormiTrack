// Live Supabase-backed replacement for the landlord dashboard's hardcoded
// "Reservation Requests", "Boarding House Overview" stat tiles, and the
// occupant rosters in LandlordOccupants.tsx / StudentOccupants.tsx.
import { supabase } from "../lib/supabase";

export type PendingRegistration = {
  id: string;
  studentId: string;
  studentName: string;
  studentIdNo: string;
  program: string | null;
  yearLevel: number | null;
  contact: string | null;
  address: string | null;
  photo: string | null;
  boardingHouseName: string;
  roomId: string;
  roomName: string;
  bedId: string;
  bedLabel: string;
  moveIn: string;
  moveOut: string | null;
  stayUnit: string;
  stayCount: number;
  traits: string[];
  hobbies: string[];
  lifestyle: string[];
  notes: string | null;
  submittedAt: string;
};

function fullName(u: { first_name: string; middle_name?: string | null; last_name: string }) {
  return [u.first_name, u.last_name].filter(Boolean).join(" ");
}

// Everything the student actually filled in at registration (room/bed, move-in window,
// personality/hobbies/lifestyle, notes) — a landlord needs all of this to genuinely review
// a request, not just accept/reject a bare name.
export async function getPendingRegistrationsForLandlord(landlordId: string): Promise<PendingRegistration[]> {
  const { data, error } = await supabase
    .from("student_boarding_registrations")
    .select(`
      id, submitted_at, room_id, bed_id,
      move_in, move_out, stay_unit, stay_count, traits, hobbies, lifestyle, notes,
      students!inner ( user_id, student_id_no, program, year_level, users!inner ( first_name, middle_name, last_name, contact_number, address, photo_url ) ),
      rooms ( name ), beds ( label ),
      boarding_houses!inner ( landlord_id, name )
    `)
    .eq("boarding_houses.landlord_id", landlordId)
    .eq("status", "pending")
    .order("submitted_at", { ascending: true });
  if (error) { console.error("getPendingRegistrationsForLandlord:", error.message); return []; }
  return (data ?? []).map((r: any) => ({
    id: r.id,
    studentId: r.students.user_id,
    studentName: fullName(r.students.users),
    studentIdNo: r.students.student_id_no,
    program: r.students.program,
    yearLevel: r.students.year_level,
    contact: r.students.users.contact_number ?? null,
    address: r.students.users.address ?? null,
    photo: r.students.users.photo_url ?? null,
    boardingHouseName: r.boarding_houses?.name ?? "",
    roomId: r.room_id,
    roomName: r.rooms?.name ?? "",
    bedId: r.bed_id,
    bedLabel: r.beds?.label ?? "",
    moveIn: r.move_in,
    moveOut: r.move_out,
    stayUnit: r.stay_unit,
    stayCount: r.stay_count,
    traits: r.traits ?? [],
    hobbies: r.hobbies ?? [],
    lifestyle: r.lifestyle ?? [],
    notes: r.notes,
    submittedAt: r.submitted_at,
  }));
}

export async function approveRegistration(registrationId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.rpc("approve_registration", { p_registration_id: registrationId });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function rejectRegistration(registrationId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.rpc("reject_registration", { p_registration_id: registrationId });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export type OccupancyStats = {
  totalRooms: number;
  currentOccupants: number;
  availableBeds: number;
  totalCapacity: number;
  fullyOccupiedRooms: number;
  availableRooms: number;
  pendingRequests: number;
  occupancyRate: number; // 0-100
};

export async function getOccupancyStatsForLandlord(landlordId: string): Promise<OccupancyStats> {
  const { data: bhs } = await supabase.from("boarding_houses").select("id").eq("landlord_id", landlordId);
  const bhIds = (bhs ?? []).map(b => b.id);
  if (bhIds.length === 0) {
    return { totalRooms: 0, currentOccupants: 0, availableBeds: 0, totalCapacity: 0, fullyOccupiedRooms: 0, availableRooms: 0, pendingRequests: 0, occupancyRate: 0 };
  }

  const { data: rooms } = await supabase.from("rooms").select("id, capacity").in("boarding_house_id", bhIds);
  const roomIds = (rooms ?? []).map(r => r.id);
  const totalCapacity = (rooms ?? []).reduce((s, r) => s + r.capacity, 0);
  const totalRooms = (rooms ?? []).length;

  const { data: beds } = roomIds.length ? await supabase.from("beds").select("id, room_id, status").in("room_id", roomIds) : { data: [] as any[] };
  const occByRoom = new Map<string, number>();
  let currentOccupants = 0, availableBeds = 0;
  for (const b of beds ?? []) {
    if (b.status === "occupied") currentOccupants++;
    // A reserved bed (a pending registration already holding it) counts toward a room's
    // fullness the same as an occupied one — otherwise fullyOccupiedRooms/availableRooms
    // stay wrong for as long as that registration sits pending (see 0047).
    if (b.status === "occupied" || b.status === "reserved") occByRoom.set(b.room_id, (occByRoom.get(b.room_id) ?? 0) + 1);
    if (b.status === "available") availableBeds++;
  }
  let fullyOccupiedRooms = 0, availableRooms = 0;
  for (const r of rooms ?? []) {
    const occ = occByRoom.get(r.id) ?? 0;
    if (occ >= r.capacity) fullyOccupiedRooms++; else availableRooms++;
  }

  const { count: pendingRequests } = await supabase
    .from("student_boarding_registrations")
    .select("id", { count: "exact", head: true })
    .in("boarding_house_id", bhIds)
    .eq("status", "pending");

  const occupancyRate = totalCapacity > 0 ? Math.round((currentOccupants / totalCapacity) * 100) : 0;

  return {
    totalRooms, currentOccupants, availableBeds, totalCapacity,
    fullyOccupiedRooms, availableRooms,
    pendingRequests: pendingRequests ?? 0,
    occupancyRate,
  };
}

// ── Student's own onboarding gate ────────────────────────────────────────────
// Login used to always land on "dashboard" no matter what — a student who
// signed up but never submitted (or is still awaiting) a boarding house
// registration would see the real home screen full of empty placeholders
// instead of being routed back into the choose/await flow. This is the real
// check that gate now runs on every login/session-restore.
export type PendingRegInfo = { studentName: string; houseName: string; roomName: string; bedLabel?: string; submittedDate: string };
export type StudentGateStatus =
  | { kind: "assigned" }
  | { kind: "pending"; registrationId: string; info: PendingRegInfo }
  | { kind: "none" };

export async function getMyStudentGateStatus(): Promise<StudentGateStatus> {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return { kind: "none" };

  const { data: assignment } = await supabase.from("student_assignments").select("id").eq("student_id", uid).eq("is_current", true).maybeSingle();
  if (assignment) return { kind: "assigned" };

  const { data: reg } = await supabase
    .from("student_boarding_registrations")
    .select(`
      id, status, submitted_at,
      boarding_houses ( name ), rooms ( name ), beds ( label ),
      students!inner ( users!inner ( first_name, middle_name, last_name ) )
    `)
    .eq("student_id", uid)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (reg && reg.status === "pending") {
    const u = (reg as any).students.users;
    return {
      kind: "pending",
      registrationId: reg.id,
      info: {
        studentName: fullName(u),
        houseName: (reg as any).boarding_houses?.name ?? "—",
        roomName: (reg as any).rooms?.name ?? "—",
        bedLabel: (reg as any).beds?.label,
        submittedDate: new Date(reg.submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      },
    };
  }
  // Rejected or never submitted at all — either way, back to choosing a
  // boarding house (no dedicated "you were rejected" screen exists yet;
  // resubmission is the only path forward regardless).
  return { kind: "none" };
}

export async function endOccupancy(studentId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.rpc("end_occupancy", { p_student_id: studentId });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ── Transfer Room (LandlordOccupants.tsx's "Transfer Room" quick action) ────

export type AvailableBed = { roomId: string; roomName: string; bedId: string; bedLabel: string };

// Every other bed still free in this same boarding house — the RPC below only
// ever moves a student within the boarding house they're already in.
export async function getAvailableBedsForTransfer(boardingHouseId: string): Promise<AvailableBed[]> {
  const { data: rooms, error: roomsErr } = await supabase.from("rooms").select("id, name").eq("boarding_house_id", boardingHouseId);
  if (roomsErr) { console.error("getAvailableBedsForTransfer:", roomsErr.message); return []; }
  const roomIds = (rooms ?? []).map(r => r.id);
  if (!roomIds.length) return [];
  const { data: beds, error: bedsErr } = await supabase.from("beds").select("id, label, room_id, status").in("room_id", roomIds).eq("status", "available");
  if (bedsErr) { console.error("getAvailableBedsForTransfer:", bedsErr.message); return []; }
  const roomNameById = new Map((rooms ?? []).map(r => [r.id, r.name]));
  return (beds ?? []).map(b => ({ roomId: b.room_id, roomName: roomNameById.get(b.room_id) ?? "—", bedId: b.id, bedLabel: b.label }));
}

// Atomic (transfer_student_room, 0049) — frees the student's current bed and
// reserves the destination bed in the same statement, so a concurrent
// registration/transfer can't double-book it in between.
export async function transferStudentRoom(studentId: string, newRoomId: string, newBedId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.rpc("transfer_student_room", { p_student_id: studentId, p_new_room_id: newRoomId, p_new_bed_id: newBedId });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ── Update Status (LandlordOccupants.tsx's "Update Status" quick action) ────
// The only real, landlord-settable "status" an occupant has is whether a
// move-out date is scheduled (student_boarding_registrations.move_out, linked
// through the current assignment's registration_id) — pass null to clear it
// back to "Active", or a real date to mark them as moving out on it. Every
// call also logs a real occupant_status_updates row (0050) — the landlord's
// optional note lives there, and the returned id becomes the notification's
// relatedId so the student can tap it and see the actual note/date in a
// detail modal, not just land on a generic screen.
export async function updateOccupantMoveOut(studentId: string, moveOut: string | null, note?: string): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return { ok: false, error: "Not signed in." };
  const { data: sa, error: saErr } = await supabase
    .from("student_assignments")
    .select("registration_id, boarding_house_id")
    .eq("student_id", studentId).eq("is_current", true).maybeSingle();
  if (saErr || !sa) return { ok: false, error: "Could not find this student's current assignment." };
  if (!sa.registration_id) return { ok: false, error: "This occupant has no linked registration to update." };
  const { error } = await supabase.from("student_boarding_registrations").update({ move_out: moveOut }).eq("id", sa.registration_id);
  if (error) return { ok: false, error: error.message };

  const { data: row, error: insErr } = await supabase.from("occupant_status_updates").insert({
    student_id: studentId, boarding_house_id: sa.boarding_house_id,
    move_out: moveOut, note: note?.trim() || null, created_by: uid,
  }).select("id").single();
  if (insErr || !row) return { ok: false, error: insErr?.message ?? "Could not record this status update." };
  return { ok: true, id: row.id };
}

export type OccupantStatusUpdate = {
  id: string; moveOut: string | null; note: string | null; createdAt: string;
};

// Student/parent/landlord-facing lookup by id (osu_select_student/_landlord/_parent,
// 0050) — how the "status-update" notification's detail modal gets its content.
export async function getOccupantStatusUpdate(id: string): Promise<OccupantStatusUpdate | null> {
  const { data, error } = await supabase.from("occupant_status_updates").select("id, move_out, note, created_at").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return { id: data.id, moveOut: data.move_out, note: data.note, createdAt: data.created_at };
}

export type Occupant = {
  studentId: string;
  studentName: string;
  studentIdNo: string;
  program: string | null;
  yearLevel: number | null;
  contact?: string | null;
  // Only populated by getCurrentOccupantsForLandlord — needed so "Transfer Room"
  // knows which boarding house's other beds to offer.
  boardingHouseId?: string;
  roomId: string;
  block?: string | null;
  roomName: string;
  bedId: string;
  bedLabel: string;
  movedInAt: string;
  // Real move_out from the assignment's linked registration — was always "—" on the
  // landlord's Occupants screen before (a hardcoded placeholder, not derived data).
  // Only populated by getCurrentOccupantsForLandlord; getRoommates doesn't need it.
  movedOutAt?: string | null;
  photo: string | null;
  // Real linked (status='linked' only — not pending/rejected) parent(s)/guardian(s) —
  // was always a hardcoded "—" on the landlord's Occupants screen before. A student can
  // have more than one linked parent, joined with ", " when there's more than one.
  // Only populated by getCurrentOccupantsForLandlord; getRoommates doesn't need it.
  parentName?: string | null;
  parentContact?: string | null;
};

export async function getCurrentOccupantsForLandlord(landlordId: string): Promise<Occupant[]> {
  const { data, error } = await supabase
    .from("student_assignments")
    .select(`
      student_id, moved_in_at, room_id, bed_id,
      students!inner ( student_id_no, program, year_level, users!inner ( first_name, middle_name, last_name, contact_number, photo_url ) ),
      rooms ( name ), beds ( label ),
      boarding_houses!inner ( id, landlord_id ),
      student_boarding_registrations ( move_out )
    `)
    .eq("boarding_houses.landlord_id", landlordId)
    .eq("is_current", true);
  if (error) { console.error("getCurrentOccupantsForLandlord:", error.message); return []; }

  // Real linked parent(s) — psl_select_landlord + users_select_landlord_of_parent
  // (0024_chat_roster_and_conversation_rpc.sql) already grant this landlord read
  // access for their own tenants; nothing previously queried it for this screen.
  // Two separate queries rather than one embed through `parents`: 0024 never
  // granted the landlord SELECT on `parents` itself (only parent_student_links and
  // the parent's own `users` row), so a `parents!inner(...)` embed silently drops
  // every row — confirmed live. Going student_links -> users directly sidesteps
  // that gap entirely instead of needing another RLS migration for it.
  const studentIds = [...new Set((data ?? []).map((r: any) => r.student_id))];
  const { data: links } = studentIds.length
    ? await supabase.from("parent_student_links").select("student_id, parent_id").in("student_id", studentIds).eq("status", "linked")
    : { data: [] as any[] };
  const parentIds = [...new Set((links ?? []).map((l: any) => l.parent_id))];
  const { data: parentUsers } = parentIds.length
    ? await supabase.from("users").select("id, first_name, last_name, contact_number").in("id", parentIds)
    : { data: [] as any[] };
  const parentUserById = new Map((parentUsers ?? []).map((u: any) => [u.id, u]));
  const parentsByStudent = new Map<string, { name: string; contact: string }[]>();
  for (const l of links ?? []) {
    const u = parentUserById.get((l as any).parent_id);
    if (!u) continue;
    const entry = { name: fullName(u), contact: u.contact_number ?? "—" };
    const arr = parentsByStudent.get((l as any).student_id) ?? [];
    arr.push(entry);
    parentsByStudent.set((l as any).student_id, arr);
  }

  return (data ?? []).map((r: any) => {
    const parents = parentsByStudent.get(r.student_id) ?? [];
    return {
    studentId: r.student_id,
    movedOutAt: r.student_boarding_registrations?.move_out ?? null,
    studentName: fullName(r.students.users),
    studentIdNo: r.students.student_id_no,
    program: r.students.program,
    yearLevel: r.students.year_level,
    contact: r.students.users.contact_number ?? null,
    boardingHouseId: r.boarding_houses?.id,
    roomId: r.room_id,
    roomName: r.rooms?.name ?? "",
    bedId: r.bed_id,
    bedLabel: r.beds?.label ?? "",
    movedInAt: r.moved_in_at,
    parentName: parents.length ? parents.map(p => p.name).join(", ") : null,
    parentContact: parents.length ? parents.map(p => p.contact).join(", ") : null,
    photo: r.students.users.photo_url ?? null,
    };
  });
}

// Roommates: everyone else currently assigned to the same room as this student.
export async function getRoommates(studentId: string): Promise<Occupant[]> {
  const { data: mine } = await supabase.from("student_assignments").select("room_id").eq("student_id", studentId).eq("is_current", true).maybeSingle();
  if (!mine) return [];
  const { data, error } = await supabase
    .from("student_assignments")
    .select(`
      student_id, moved_in_at, room_id, bed_id,
      students!inner ( student_id_no, program, year_level, block, users!inner ( first_name, middle_name, last_name, contact_number, photo_url ) ),
      rooms ( name ), beds ( label )
    `)
    .eq("room_id", mine.room_id)
    .eq("is_current", true)
    .neq("student_id", studentId);
  if (error) { console.error("getRoommates:", error.message); return []; }
  return (data ?? []).map((r: any) => ({
    studentId: r.student_id,
    studentName: fullName(r.students.users),
    studentIdNo: r.students.student_id_no,
    program: r.students.program,
    yearLevel: r.students.year_level,
    contact: r.students.users.contact_number ?? null,
    block: r.students.block,
    roomId: r.room_id,
    roomName: r.rooms?.name ?? "",
    bedId: r.bed_id,
    bedLabel: r.beds?.label ?? "",
    movedInAt: r.moved_in_at,
    photo: r.students.users.photo_url ?? null,
  }));
}
