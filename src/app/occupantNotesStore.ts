// Real, persisted private landlord notes about a specific occupant
// (occupant_notes, 0057) — replaces LandlordOccupants.tsx's OccupantProfileModal
// keeping notes only in its own component state (seeded from an always-empty
// array), which meant every note vanished the moment the modal closed and the
// "created" date shown was a hardcoded string regardless of when it was
// actually written. RLS (0057) scopes this to the owning landlord only —
// deliberately not readable by the student or a linked parent.
import { supabase } from "../lib/supabase";

export type OccupantNote = { id: string; text: string; createdAt: string };

function mapRow(row: any): OccupantNote {
  return { id: row.id, text: row.note, createdAt: row.created_at };
}

export async function getNotesForOccupant(studentId: string): Promise<OccupantNote[]> {
  const { data, error } = await supabase
    .from("occupant_notes")
    .select("id, note, created_at")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
  if (error) { console.error("getNotesForOccupant:", error.message); return []; }
  return (data ?? []).map(mapRow);
}

export async function addNoteForOccupant(studentId: string, boardingHouseId: string, text: string): Promise<{ ok: true; note: OccupantNote } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("occupant_notes")
    .insert({ student_id: studentId, boarding_house_id: boardingHouseId, note: text })
    .select("id, note, created_at")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Could not save note." };
  return { ok: true, note: mapRow(data) };
}
