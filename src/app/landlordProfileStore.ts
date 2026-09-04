// Real Supabase-backed replacement for LandlordProfile.tsx's 100%-local mock
// state — personal info, account, boarding house info/location, amenities,
// rooms/beds, gallery, rules, payments (incl. extra fees), and stay-info
// settings were all previously held only in React state, never loaded from
// or saved to the database at all. Reuses getBoardingHousesForLandlord's
// existing full-record fetch (rooms/beds/amenities/gallery/rules/payment
// already come back in the shape every other screen already consumes) and
// adds the write-side CRUD that store never needed until now.
import { supabase } from "../lib/supabase";
import { getBoardingHousesForLandlord, uploadIfBlob } from "./boardingHouseStore";
import { BoardingHouse } from "./shared";

// ── Personal info + account ─────────────────────────────────────────────────

export type MyLandlordAccount = {
  uid: string;
  firstName: string; middleName: string; lastName: string;
  sex: string; contact: string; address: string; email: string;
  displayName: string; photoUrl: string | null;
};

export async function getMyLandlordAccount(): Promise<MyLandlordAccount | null> {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return null;
  const [{ data: user, error: userErr }, { data: landlord }] = await Promise.all([
    supabase.from("users").select("first_name, middle_name, last_name, sex, contact_number, address, email, photo_url").eq("id", uid).single(),
    supabase.from("landlords").select("display_name").eq("user_id", uid).single(),
  ]);
  if (userErr || !user) return null;
  return {
    uid,
    firstName: user.first_name ?? "", middleName: user.middle_name ?? "", lastName: user.last_name ?? "",
    sex: user.sex ?? "", contact: user.contact_number ?? "", address: user.address ?? "", email: user.email,
    displayName: landlord?.display_name ?? "", photoUrl: user.photo_url ?? null,
  };
}

export async function updateMyPersonalInfo(patch: { firstName: string; middleName: string; lastName: string; sex: string; contact: string; address: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return { ok: false, error: "Not signed in." };
  const { error } = await supabase.from("users").update({
    first_name: patch.firstName.trim(), middle_name: patch.middleName.trim() || null, last_name: patch.lastName.trim(),
    sex: patch.sex || null, contact_number: patch.contact.trim() || null, address: patch.address.trim() || null,
  }).eq("id", uid);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// Re-authenticates with the current password first (Supabase's updateUser API has no separate
// "verify current password" check of its own) so a landlord can't change their password just by
// having an already-open session — matches the real intent of a "Current Password" field.
export async function changeMyPassword(currentPassword: string, newPassword: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  const email = session?.user?.email;
  if (!email) return { ok: false, error: "Not signed in." };
  const { error: verifyError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
  if (verifyError) return { ok: false, error: "Current password is incorrect." };
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ── Boarding house: load ────────────────────────────────────────────────────

export type ExtraFee = { id: string; name: string; type: "fixed" | "metered"; amount: number | null; enabled: boolean };
export type StayInfoSettings = { lengthOfStay: boolean; moveIn: boolean; personality: boolean; hobbies: boolean; lifestyle: boolean; notes: boolean };

export type MyBoardingHouseFull = {
  bh: BoardingHouse;
  extraFees: ExtraFee[];
  stayInfo: StayInfoSettings;
};

export async function getMyBoardingHouseFull(landlordId: string): Promise<MyBoardingHouseFull | null> {
  const houses = await getBoardingHousesForLandlord(landlordId);
  const bh = houses[0];
  if (!bh) return null;
  const [{ data: fees }, { data: stay }] = await Promise.all([
    supabase.from("boarding_house_extra_fees").select("id, name, fee_type, amount, enabled").eq("boarding_house_id", bh.id),
    supabase.from("boarding_houses").select("allow_length_of_stay, allow_move_in, allow_personality, allow_hobbies, allow_lifestyle, allow_notes").eq("id", bh.id).single(),
  ]);
  return {
    bh,
    extraFees: (fees ?? []).map(f => ({ id: f.id, name: f.name, type: f.fee_type as "fixed" | "metered", amount: f.amount, enabled: f.enabled })),
    stayInfo: {
      lengthOfStay: stay?.allow_length_of_stay ?? true,
      moveIn: stay?.allow_move_in ?? true,
      personality: stay?.allow_personality ?? true,
      hobbies: stay?.allow_hobbies ?? true,
      lifestyle: stay?.allow_lifestyle ?? true,
      notes: stay?.allow_notes ?? true,
    },
  };
}

// ── Boarding house info + location ──────────────────────────────────────────

export async function updateBoardingHouseInfo(bhId: string, patch: {
  name: string; address: string; municipality?: string; lat: number; lng: number; contact: string; description: string;
  checkinRadiusMeters?: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const update: Record<string, unknown> = {
    name: patch.name.trim(), address: patch.address.trim(), lat: patch.lat, lng: patch.lng,
    contact_number: patch.contact.trim() || null, description: patch.description.trim() || null,
  };
  if (patch.municipality) update.municipality = patch.municipality;
  if (patch.checkinRadiusMeters != null) update.checkin_radius_meters = Math.round(patch.checkinRadiusMeters);
  const { error } = await supabase.from("boarding_houses").update(update).eq("id", bhId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ── Amenities ────────────────────────────────────────────────────────────────

export async function updateBoardingHouseAmenities(bhId: string, amenities: string[]): Promise<{ ok: true } | { ok: false; error: string }> {
  // Simplest correct approach for a small set like this: replace wholesale rather than diffing.
  const { error: delError } = await supabase.from("boarding_house_amenities").delete().eq("boarding_house_id", bhId);
  if (delError) return { ok: false, error: delError.message };
  if (amenities.length) {
    const { error } = await supabase.from("boarding_house_amenities").insert(amenities.map(label => ({ boarding_house_id: bhId, label })));
    if (error) return { ok: false, error: error.message };
  }
  return { ok: true };
}

// ── Rules ────────────────────────────────────────────────────────────────────

export async function updateBoardingHouseRules(bhId: string, rules: string[]): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.from("boarding_houses").update({ rules }).eq("id", bhId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ── Payments (fixed rent/electric/water/internet + custom extra fees) ──────

export async function updateBoardingHousePayments(bhId: string, patch: {
  rentAmount: number | null;
  electricType: "fixed" | "metered" | null; electricAmount: number | null;
  waterType: "fixed" | "metered" | null; waterAmount: number | null;
  // The DB column is actually fixed|metered too (migration 0007 aligned it with the real form,
  // which only ever offers those two) — NOT included|separate, despite that being the UI-facing
  // vocabulary getBoardingHousesForLandlord's mapper translates it into for display everywhere else.
  internetType: "fixed" | "metered" | null; internetAmount: number | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.from("boarding_houses").update({
    rent_amount: patch.rentAmount,
    electric_type: patch.electricType, electric_amount: patch.electricAmount,
    water_type: patch.waterType, water_amount: patch.waterAmount,
    internet_type: patch.internetType, internet_amount: patch.internetAmount,
  }).eq("id", bhId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function addExtraFee(bhId: string, fee: { name: string; type: "fixed" | "metered"; amount: number | null; enabled: boolean }): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { data, error } = await supabase.from("boarding_house_extra_fees").insert({
    boarding_house_id: bhId, name: fee.name.trim(), fee_type: fee.type, amount: fee.amount, enabled: fee.enabled,
  }).select("id").single();
  if (error || !data) return { ok: false, error: error?.message ?? "Could not add payment." };
  return { ok: true, id: data.id };
}

export async function updateExtraFee(id: string, patch: Partial<{ name: string; type: "fixed" | "metered"; amount: number | null; enabled: boolean }>): Promise<{ ok: true } | { ok: false; error: string }> {
  const update: Record<string, unknown> = {};
  if (patch.name !== undefined) update.name = patch.name.trim();
  if (patch.type !== undefined) update.fee_type = patch.type;
  if (patch.amount !== undefined) update.amount = patch.amount;
  if (patch.enabled !== undefined) update.enabled = patch.enabled;
  const { error } = await supabase.from("boarding_house_extra_fees").update(update).eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteExtraFee(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.from("boarding_house_extra_fees").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ── Rooms + beds ─────────────────────────────────────────────────────────────

export async function addRoom(bhId: string, room: { name: string; capacity: number; description: string }): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { data, error } = await supabase.from("rooms").insert({
    boarding_house_id: bhId, name: room.name.trim(), capacity: Math.max(1, room.capacity), description: room.description.trim() || null,
  }).select("id").single();
  if (error || !data) return { ok: false, error: error?.message ?? "Could not add room." };
  // Every room needs at least one bed to be usable — matches the signup wizard's default.
  const { error: bedErr } = await supabase.from("beds").insert({ room_id: data.id, label: "Bed 1", status: "available" });
  if (bedErr) console.error("addRoom: default bed insert failed:", bedErr.message);
  return { ok: true, id: data.id };
}

export async function updateRoom(roomId: string, patch: { name?: string; description?: string; amenities?: string[] }): Promise<{ ok: true } | { ok: false; error: string }> {
  const update: Record<string, unknown> = {};
  if (patch.name !== undefined) update.name = patch.name.trim();
  if (patch.description !== undefined) update.description = patch.description.trim() || null;
  if (Object.keys(update).length) {
    const { error } = await supabase.from("rooms").update(update).eq("id", roomId);
    if (error) return { ok: false, error: error.message };
  }
  if (patch.amenities !== undefined) {
    const { error: delError } = await supabase.from("room_amenities").delete().eq("room_id", roomId);
    if (delError) return { ok: false, error: delError.message };
    if (patch.amenities.length) {
      const { error } = await supabase.from("room_amenities").insert(patch.amenities.map(label => ({ room_id: roomId, label })));
      if (error) return { ok: false, error: error.message };
    }
  }
  return { ok: true };
}

export async function deleteRoom(roomId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.from("rooms").delete().eq("id", roomId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function updateBedStatusReal(bedId: string, status: "available" | "occupied" | "reserved" | "maintenance"): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.from("beds").update({ status }).eq("id", bedId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ── Gallery ──────────────────────────────────────────────────────────────────

export async function addGalleryPhoto(landlordId: string, bhId: string, blobUrl: string, label: string): Promise<{ ok: true; id: string; url: string } | { ok: false; error: string }> {
  const url = await uploadIfBlob(landlordId, blobUrl, `${bhId}/gallery/${Date.now()}`);
  if (!url) return { ok: false, error: "Photo upload failed." };
  // sort_order is a plain 4-byte int column — Date.now() (~1.7 trillion in 2026) overflows it.
  // Append to the end instead: one more than however many photos already exist.
  const { count } = await supabase.from("boarding_house_photos").select("id", { count: "exact", head: true }).eq("boarding_house_id", bhId);
  const { data, error } = await supabase.from("boarding_house_photos").insert({ boarding_house_id: bhId, url, label: label.trim() || "Photo", sort_order: count ?? 0 }).select("id").single();
  if (error || !data) return { ok: false, error: error?.message ?? "Could not save photo." };
  return { ok: true, id: data.id, url };
}

export async function updateGalleryPhotoLabel(id: string, label: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.from("boarding_house_photos").update({ label: label.trim() }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function removeGalleryPhoto(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.from("boarding_house_photos").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ── Stay Info Settings ───────────────────────────────────────────────────────

export async function updateStayInfoSettings(bhId: string, patch: StayInfoSettings): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.from("boarding_houses").update({
    allow_length_of_stay: patch.lengthOfStay, allow_move_in: patch.moveIn, allow_personality: patch.personality,
    allow_hobbies: patch.hobbies, allow_lifestyle: patch.lifestyle, allow_notes: patch.notes,
  }).eq("id", bhId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
