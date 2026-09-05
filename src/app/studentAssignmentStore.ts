// Live replacement for StudentHome.tsx's static STUDENT_DATA/BH_DATA/ROOM_DATA/
// STAY_DATA mocks. Returns shapes close to those originals so consuming
// components need field-level substitution, not a rewrite.
import { supabase } from "../lib/supabase";

export type MyStudentProfile = {
  name: string; firstName: string; id: string; program: string; year: string;
  block: string; email: string; contact: string; address: string; photo: string | null;
};

export async function getMyProfile(): Promise<MyStudentProfile | null> {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return null;
  const { data: user, error: userErr } = await supabase.from("users").select("first_name, middle_name, last_name, email, contact_number, address, photo_url").eq("id", uid).single();
  if (userErr || !user) { console.error("getMyProfile users:", userErr?.message); return null; }
  const { data: student, error: studentErr } = await supabase.from("students").select("student_id_no, program, year_level, block").eq("user_id", uid).single();
  if (studentErr || !student) { console.error("getMyProfile students:", studentErr?.message); return null; }
  const yearLabel = student.year_level ? `${student.year_level}${student.year_level === 1 ? "st" : student.year_level === 2 ? "nd" : student.year_level === 3 ? "rd" : "th"} Year` : "—";
  return {
    name: [user.first_name, user.last_name].filter(Boolean).join(" "),
    firstName: user.first_name,
    id: student.student_id_no,
    program: student.program ?? "—",
    year: yearLabel,
    block: student.block ?? "—",
    email: user.email,
    contact: user.contact_number ?? "—",
    address: user.address ?? "—",
    photo: user.photo_url,
  };
}

export type MyBoardingHouse = {
  id: string; name: string; address: string; lat: number; lng: number; cover: string | null;
  landlord: string; landlordPhoto: string | null; contact: string; email: string; status: string; regStatus: string;
  // The only area within which this student's check-in/check-out is accepted — set by
  // the landlord, defaults to 50m for houses that predate this setting.
  checkinRadiusMeters: number;
  amenities: string[]; rules: string[]; totalRooms: number;
  // Real rent_amount column — null means the landlord left this fee disabled (0030's
  // "disabled = null" convention, same as every other fixed fee slot), not "no data".
  rentAmount: number | null;
  gallery: { id: string; url: string; label: string }[];
};
export type MyRoom = {
  id: string; name: string; bed: string; capacity: number; occupied: number; available: number;
  floor: string; type: string;
};
export type MyStay = {
  moveIn: string; moveOut: string; daysStayed: number; daysRemaining: number | null;
  totalDays: number | null; stayLength: string;
};
export type MyAssignment = { bh: MyBoardingHouse; room: MyRoom; stay: MyStay };

function daysBetween(a: Date, b: Date) {
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)));
}
function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

// Resolves a specific student's current boarding house/room/bed assignment.
// Used directly for "my own" data, and by the parent screens (once a real
// parent-student link exists) to look up their linked student's assignment.
export async function getAssignmentForStudent(studentId: string): Promise<MyAssignment | null> {
  const { data: sa, error: saErr } = await supabase
    .from("student_assignments")
    .select("boarding_house_id, room_id, bed_id, moved_in_at, registration_id")
    .eq("student_id", studentId).eq("is_current", true).maybeSingle();
  if (saErr || !sa) return null;

  const [{ data: bh }, { data: room }, { data: bed }, { data: amenities }, { count: roomsCount }, { count: roomOccupants }, { data: reg }, { data: photos }] = await Promise.all([
    supabase.from("boarding_houses").select("id, name, address, lat, lng, cover_url, contact_number, contact_email, status, rent_amount, checkin_radius_meters, landlords(display_name, users(photo_url))").eq("id", sa.boarding_house_id).single(),
    supabase.from("rooms").select("id, name, capacity, floor, room_type").eq("id", sa.room_id).single(),
    supabase.from("beds").select("label").eq("id", sa.bed_id).single(),
    supabase.from("boarding_house_amenities").select("label").eq("boarding_house_id", sa.boarding_house_id),
    supabase.from("rooms").select("id", { count: "exact", head: true }).eq("boarding_house_id", sa.boarding_house_id),
    // Real occupant count for this specific room — student_assignments (who is
    // actually, currently assigned) rather than beds.status='occupied', which is a
    // separate column a landlord can also set by hand (LandlordProfile.tsx's bed
    // editor) without necessarily reflecting a real current assignment change.
    // (Also fixes a real pre-existing bug: `head: true` queries return their count
    // on the response's `count` field, not `data` — the old `{ data }` destructure
    // here and on roomsCount above always read null/0 regardless of the real value.)
    supabase.from("student_assignments").select("id", { count: "exact", head: true }).eq("room_id", sa.room_id).eq("is_current", true),
    sa.registration_id ? supabase.from("student_boarding_registrations").select("move_out, stay_unit, stay_count, rules:boarding_house_id").eq("id", sa.registration_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("boarding_house_photos").select("id, url, label").eq("boarding_house_id", sa.boarding_house_id).order("sort_order"),
  ]);
  if (!bh || !room || !bed) return null;

  const { data: bhRules } = await supabase.from("boarding_houses").select("rules").eq("id", sa.boarding_house_id).single();

  const moveInDate = new Date(sa.moved_in_at);
  const today = new Date();
  const daysStayed = daysBetween(moveInDate, today);
  const moveOut = (reg as any)?.move_out ?? null;
  const totalDays = moveOut ? daysBetween(moveInDate, new Date(moveOut)) : null;
  const daysRemaining = totalDays != null ? Math.max(0, totalDays - daysStayed) : null;
  // Always derived from the real Move-In/Move-Out dates (same as totalDays right
  // above), never from the stored stay_count/stay_unit columns — those can go
  // stale the moment either date changes through any of the paths that update
  // one but not the other (a landlord's "Update Status" move-out edit, a stay-
  // change request that only specifies new dates, a pre-fix registration whose
  // typed-in count never matched its own dates to begin with). stay_unit is
  // still honored as the student's real Weeks-vs-Months display preference —
  // only the count is ever recomputed, so "Stay Duration" can never contradict
  // the dates sitting right next to it.
  const stayUnitPref = (reg as any)?.stay_unit === "Weeks" ? "Weeks" : "Months";
  const stayLength = totalDays != null
    ? `${Math.max(1, Math.round(totalDays / (stayUnitPref === "Weeks" ? 7 : 30.44)))} ${stayUnitPref}`
    : "—";

  return {
    bh: {
      id: bh.id, name: bh.name, address: bh.address, lat: bh.lat, lng: bh.lng, cover: bh.cover_url,
      landlord: (bh as any).landlords?.display_name ?? "—", landlordPhoto: (bh as any).landlords?.users?.photo_url ?? null, contact: bh.contact_number ?? "—", email: bh.contact_email ?? "—",
      // Any BH a student is actually assigned to is, by construction, active
      // (RLS only exposes active houses for registration in the first
      // place) — this cosmetic badge doesn't map onto any other real state.
      status: "Active", regStatus: "Approved",
      checkinRadiusMeters: (bh as any).checkin_radius_meters ?? 50,
      amenities: (amenities ?? []).map(a => a.label),
      rules: bhRules?.rules ?? [],
      totalRooms: roomsCount ?? 0,
      rentAmount: (bh as any).rent_amount != null ? Number((bh as any).rent_amount) : null,
      gallery: (photos ?? []).map(p => ({ id: p.id, url: p.url, label: p.label ?? "" })),
    },
    room: {
      id: room.id, name: room.name, bed: bed.label, capacity: room.capacity,
      occupied: roomOccupants ?? 0, available: Math.max(0, room.capacity - (roomOccupants ?? 0)),
      floor: room.floor ?? "—", type: room.room_type ?? "Standard Room",
    },
    stay: {
      moveIn: fmtDate(sa.moved_in_at), moveOut: fmtDate(moveOut),
      daysStayed, daysRemaining, totalDays, stayLength,
    },
  };
}

export async function getMyAssignment(): Promise<MyAssignment | null> {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return null;
  return getAssignmentForStudent(uid);
}

// Parent side: resolve the parent's linked (approved) student, then their
// assignment. Returns null until a link with status='linked' exists — which,
// until the student-approval UI (a later phase) ships, means this is
// honestly empty rather than showing anyone's data.
export async function getMyLinkedStudentId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return null;
  const { data } = await supabase.from("parent_student_links").select("student_id").eq("parent_id", uid).eq("status", "linked").maybeSingle();
  return data?.student_id ?? null;
}

export type MyParentProfile = { name: string; firstName: string; relationship: string; contact: string; email: string; address: string; photo: string | null };

export async function getMyParentProfile(): Promise<MyParentProfile | null> {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return null;
  const { data: user, error: userErr } = await supabase.from("users").select("first_name, last_name, email, contact_number, address, photo_url").eq("id", uid).single();
  if (userErr || !user) return null;
  const { data: parent, error: parentErr } = await supabase.from("parents").select("relation, relation_other").eq("user_id", uid).single();
  if (parentErr || !parent) return null;
  return {
    name: [user.first_name, user.last_name].filter(Boolean).join(" "), firstName: user.first_name,
    relationship: parent.relation === "Other" ? (parent.relation_other || "Other") : parent.relation,
    contact: user.contact_number ?? "—", email: user.email, address: user.address ?? "—", photo: user.photo_url,
  };
}

// Convenience combiner for parent screens: resolves the linked student (if
// any) and their profile + assignment in one call. `linked: false` means no
// approved parent_student_links row exists yet — an honest empty state, not
// a fetch failure.
export async function getMyLinkedStudentData(): Promise<{ linked: boolean; studentId: string | null; profile: MyStudentProfile | null; assignment: MyAssignment | null }> {
  const studentId = await getMyLinkedStudentId();
  if (!studentId) return { linked: false, studentId: null, profile: null, assignment: null };
  const [profile, assignment] = await Promise.all([getMyLinkedStudentProfile(studentId), getAssignmentForStudent(studentId)]);
  return { linked: true, studentId, profile, assignment };
}

export async function getMyLinkedStudentProfile(studentId: string): Promise<MyStudentProfile | null> {
  const { data: user, error: userErr } = await supabase.from("users").select("first_name, middle_name, last_name, email, contact_number, address, photo_url").eq("id", studentId).single();
  if (userErr || !user) return null;
  const { data: student, error: studentErr } = await supabase.from("students").select("student_id_no, program, year_level, block").eq("user_id", studentId).single();
  if (studentErr || !student) return null;
  const yearLabel = student.year_level ? `${student.year_level}${student.year_level === 1 ? "st" : student.year_level === 2 ? "nd" : student.year_level === 3 ? "rd" : "th"} Year` : "—";
  return {
    name: [user.first_name, user.last_name].filter(Boolean).join(" "), firstName: user.first_name,
    id: student.student_id_no, program: student.program ?? "—", year: yearLabel, block: student.block ?? "—",
    email: user.email, contact: user.contact_number ?? "—", address: user.address ?? "—", photo: user.photo_url,
  };
}
