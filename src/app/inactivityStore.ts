// Real "inactive occupant" detection — the Check-In/Check-Out feature
// (check_in_out_records) is the only unambiguous "the student is actually
// using this app" signal already in the schema, so a student with no real
// check-in/out for INACTIVITY_THRESHOLD_DAYS+ (or who has never once used it
// since move-in) counts as inactive. This app has no server-side job runner,
// so detection runs client-side — LandlordOccupants.tsx calls
// checkAndNotifyInactiveOccupants() whenever its own roster + check-in/out
// activity are both loaded — and inactivity_notices (0052) is what keeps that
// idempotent: a notice (and the landlord/student/parent notifications that go
// with it) is only ever created once per distinct inactivity gap, keyed on the
// student's actual last real activity timestamp.
import { supabase } from "../lib/supabase";
import { addNotification, notifyLinkedParents, notifyLandlordOfBoardingHouse } from "./notificationStore";

// A student can leave/return several times a day for class or errands, so this
// isn't "3 days of silence" anymore — a single real 24-hour gap with no
// Enter/Exit at all is already worth flagging.
export const INACTIVITY_THRESHOLD_DAYS = 1;

export type InactivityNotice = {
  id: string; studentId: string; boardingHouseId: string;
  lastActivityAt: string; daysInactive: number; createdAt: string;
  response: string | null; respondedAt: string | null;
};

function mapNotice(row: any): InactivityNotice {
  return {
    id: row.id, studentId: row.student_id, boardingHouseId: row.boarding_house_id,
    lastActivityAt: row.last_activity_at, daysInactive: row.days_inactive, createdAt: row.created_at,
    response: row.response ?? null, respondedAt: row.responded_at ?? null,
  };
}

// Student/parent/landlord-facing lookup by id (inact_select_own/_landlord/_parent,
// 0052) — how the "inactivity" notification's detail modal gets its content.
export async function getInactivityNotice(id: string): Promise<InactivityNotice | null> {
  const { data, error } = await supabase.from("inactivity_notices").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return mapNotice(data);
}

export type InactivityCandidate = {
  studentId: string; studentName: string; boardingHouseId: string;
  lastActivityAt: string; // real check-in/out timestamp, or move-in date if never used
  daysInactive: number;
};

export async function checkAndNotifyInactiveOccupants(landlordId: string, candidates: InactivityCandidate[]): Promise<void> {
  for (const c of candidates) {
    if (c.daysInactive < INACTIVITY_THRESHOLD_DAYS) continue;

    // Idempotency: the same last_activity_at means nothing new has happened since
    // the last time this exact gap was already recorded/notified — re-checking on
    // every Occupants-page load must not re-notify for the same standing gap.
    const { data: existing } = await supabase.from("inactivity_notices")
      .select("id").eq("student_id", c.studentId).eq("last_activity_at", c.lastActivityAt).maybeSingle();
    if (existing) continue;

    const { data: row, error } = await supabase.from("inactivity_notices").insert({
      student_id: c.studentId, boarding_house_id: c.boardingHouseId,
      last_activity_at: c.lastActivityAt, days_inactive: c.daysInactive,
    }).select("id").single();
    if (error || !row) { console.error("checkAndNotifyInactiveOccupants:", error?.message); continue; }

    const dayWord = `${c.daysInactive} day${c.daysInactive === 1 ? "" : "s"}`;

    addNotification({
      userId: landlordId, type: "inactivity", title: "Inactive Occupant",
      description: `${c.studentName} hasn't entered or exited in ${dayWord}.`,
      destination: "occupants", relatedId: row.id,
    });
    addNotification({
      userId: c.studentId, type: "inactivity", title: "You Haven't Entered/Exited Recently",
      description: `You haven't entered or exited in ${dayWord}. Please respond so your landlord and parent know you're okay.`,
      destination: "occupants", relatedId: row.id,
    });
    notifyLinkedParents(c.studentId, {
      type: "inactivity", title: "Your Student Hasn't Entered/Exited Recently",
      description: `${c.studentName} hasn't entered or exited in ${dayWord}.`,
      destination: "dashboard", relatedId: row.id,
    });
  }
}

// Called when the student actually answers a warning they received above —
// writes their explanation onto the same real inactivity_notices row (so the
// landlord/parent's later view of it shows exactly what the student said,
// keyed off the identical record) and fans a "they responded" notification
// out to both, mirroring the original warning's own destinations.
export async function submitInactivityResponse(input: {
  id: string; studentId: string; boardingHouseId: string; studentName: string; response: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.from("inactivity_notices")
    .update({ response: input.response, responded_at: new Date().toISOString() })
    .eq("id", input.id).eq("student_id", input.studentId);
  if (error) return { ok: false, error: error.message };

  notifyLandlordOfBoardingHouse(input.boardingHouseId, {
    type: "inactivity", title: "Student Responded",
    description: `${input.studentName} responded to their inactivity notice: "${input.response}"`,
    destination: "occupants", relatedId: input.id,
  });
  notifyLinkedParents(input.studentId, {
    type: "inactivity", title: "Your Student Responded",
    description: `${input.studentName} responded to their inactivity notice: "${input.response}"`,
    destination: "dashboard", relatedId: input.id,
  });

  return { ok: true };
}
