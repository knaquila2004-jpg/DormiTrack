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

export type Occupant = {
  studentId: string;
  studentName: string;
  studentIdNo: string;
  program: string | null;
  yearLevel: number | null;
  contact?: string | null;
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
};

export async function getCurrentOccupantsForLandlord(landlordId: string): Promise<Occupant[]> {
  const { data, error } = await supabase
    .from("student_assignments")
    .select(`
      student_id, moved_in_at, room_id, bed_id,
      students!inner ( student_id_no, program, year_level, users!inner ( first_name, middle_name, last_name, contact_number, photo_url ) ),
      rooms ( name ), beds ( label ),
      boarding_houses!inner ( landlord_id ),
      student_boarding_registrations ( move_out )
    `)
    .eq("boarding_houses.landlord_id", landlordId)
    .eq("is_current", true);
  if (error) { console.error("getCurrentOccupantsForLandlord:", error.message); return []; }
  return (data ?? []).map((r: any) => ({
    studentId: r.student_id,
    movedOutAt: r.student_boarding_registrations?.move_out ?? null,
    studentName: fullName(r.students.users),
    studentIdNo: r.students.student_id_no,
    program: r.students.program,
    yearLevel: r.students.year_level,
    contact: r.students.users.contact_number ?? null,
    roomId: r.room_id,
    roomName: r.rooms?.name ?? "",
    bedId: r.bed_id,
    bedLabel: r.beds?.label ?? "",
    movedInAt: r.moved_in_at,
    photo: r.students.users.photo_url ?? null,
  }));
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
