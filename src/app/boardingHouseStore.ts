// Live Supabase-backed replacement for shared.ts's old BOARDING_HOUSES mock
// array. Maps DB rows onto the same BoardingHouse/RoomData/BedData shapes
// every screen already consumes, so components need no shape changes —
// only their data source changes (mock array -> these fetchers).
import { supabase } from "../lib/supabase";
import { Sparkles } from "lucide-react";
import { AMENITIES, BoardingHouse, RoomData, BedData, Amenity, DEFAULT_BED_PHOTO, IMG, LRoom } from "./shared";

function amenityIcon(label: string): Amenity["Icon"] {
  return AMENITIES.find(a => a.label === label)?.Icon ?? Sparkles;
}

function mapBed(row: any): BedData {
  return { id: row.id, label: row.label, status: row.status, photo: row.photo_url ?? undefined };
}

function mapRoom(row: any): RoomData {
  const beds = ((row.beds ?? []) as any[]).map(mapBed);
  return {
    id: row.id,
    name: row.name,
    photo: row.cover_photo_url ?? DEFAULT_BED_PHOTO,
    cap: row.capacity,
    // A 'reserved' bed (a pending, not-yet-approved registration already holding it —
    // see submit_boarding_registration, 0047) counts as unavailable too, same as
    // 'occupied' — otherwise a room/BH's "available" count stays wrong for as long as
    // that registration sits pending, letting a second student see and pick the same bed.
    occ: beds.filter(b => b.status === "occupied" || b.status === "reserved").length,
    description: row.description ?? undefined,
    photos: ((row.room_photos ?? []) as any[]).sort((a, b) => a.sort_order - b.sort_order).map(p => p.url),
    roomAmenities: ((row.room_amenities ?? []) as any[]).map(a => a.label),
    beds,
  };
}

// LandlordSignUp's internet toggle only ever offers "fixed" (flat monthly
// fee, bundled in) or "metered" (usage-based, billed separately) — mapped
// onto the UI-facing included/separate vocabulary this field already used.
function mapBoardingHouse(row: any): BoardingHouse {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    landlord: row.landlords?.display_name ?? "—",
    cover: row.cover_url ?? IMG.ext1,
    gallery: ((row.boarding_house_photos ?? []) as any[]).sort((a, b) => a.sort_order - b.sort_order).map(p => ({ id: p.id, url: p.url, label: p.label ?? "" })),
    desc: row.description ?? "",
    rating: Number(row.rating ?? 0),
    amenities: ((row.boarding_house_amenities ?? []) as any[]).map(a => ({ label: a.label, Icon: amenityIcon(a.label) })),
    rooms: ((row.rooms ?? []) as any[]).map(mapRoom),
    contact: row.contact_number ?? undefined,
    rules: row.rules ?? [],
    // `*_type` (not `*_amount`) is the reliable enabled/disabled signal: createBoardingHouseWithRooms
    // below nulls out the *type* column whenever a fee's toggle is off, but a "metered" fee is enabled
    // with a legitimately-null amount — so amount-nullness alone can't tell disabled from enabled-metered.
    payment: {
      rent: { enabled: row.rent_amount != null, amount: Number(row.rent_amount ?? 0) },
      electric: { enabled: row.electric_type != null, type: row.electric_type ?? "fixed", amount: row.electric_amount != null ? Number(row.electric_amount) : undefined },
      water: { enabled: row.water_type != null, type: row.water_type ?? "fixed", amount: row.water_amount != null ? Number(row.water_amount) : undefined },
      internet: { enabled: row.internet_type != null, type: row.internet_type === "metered" ? "separate" : "included", amount: row.internet_amount != null ? Number(row.internet_amount) : undefined },
    },
    allowLengthOfStay: row.allow_length_of_stay ?? true,
    allowMoveIn: row.allow_move_in ?? true,
    allowPersonality: row.allow_personality ?? true,
    allowHobbies: row.allow_hobbies ?? true,
    allowLifestyle: row.allow_lifestyle ?? true,
    allowNotes: row.allow_notes ?? true,
    lat: row.lat, lng: row.lng, checkinRadiusMeters: row.checkin_radius_meters ?? 50,
    municipality: row.municipality, status: row.status,
  };
}

const FULL_SELECT = `
  *,
  landlords(display_name),
  boarding_house_amenities(label,is_custom),
  boarding_house_photos(id,url,label,sort_order),
  rooms(
    *,
    room_amenities(label),
    room_photos(url,sort_order),
    beds(*)
  )
`;

// Public browse list (students picking a boarding house) — only ever
// "active" houses, matching the status the app sets on creation.
export async function getActiveBoardingHouses(): Promise<BoardingHouse[]> {
  const { data, error } = await supabase.from("boarding_houses").select(FULL_SELECT).eq("status", "active").order("created_at", { ascending: false });
  if (error) { console.error("getActiveBoardingHouses:", error.message); return []; }
  return (data ?? []).map(mapBoardingHouse);
}

// A specific landlord's own boarding house(s) — for their management screens.
export async function getBoardingHousesForLandlord(landlordId: string): Promise<BoardingHouse[]> {
  const { data, error } = await supabase.from("boarding_houses").select(FULL_SELECT).eq("landlord_id", landlordId).order("created_at", { ascending: false });
  if (error) { console.error("getBoardingHousesForLandlord:", error.message); return []; }
  return (data ?? []).map(mapBoardingHouse);
}

// ── Dashboard feature-toggle config (Visitor Records / Highlights) ──────────
// These columns were already written once at LandlordSignUp time
// (createBoardingHouseWithRooms below) but were never read back afterward,
// nor persisted when changed later in LandlordProfile.tsx — the toggle just
// flipped local React state that reset to its hardcoded default on reload.
export type BHFeatureConfig = {
  id: string;
  visitorEnabled: boolean;
  visitorFields: { name: boolean; contact: boolean; relationship: boolean; purpose: boolean };
  highlightsEnabled: boolean;
};

export async function getMyBHFeatureConfig(landlordId: string): Promise<BHFeatureConfig | null> {
  const { data, error } = await supabase
    .from("boarding_houses")
    .select("id, visitor_log_enabled, visitor_fields, highlights_enabled")
    .eq("landlord_id", landlordId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    visitorEnabled: data.visitor_log_enabled ?? false,
    visitorFields: data.visitor_fields ?? { name: true, contact: true, relationship: true, purpose: true },
    highlightsEnabled: data.highlights_enabled ?? true,
  };
}

export async function updateBHFeatureConfig(bhId: string, patch: Partial<{ visitorEnabled: boolean; visitorFields: BHFeatureConfig["visitorFields"]; highlightsEnabled: boolean }>): Promise<{ ok: true } | { ok: false; error: string }> {
  const update: Record<string, unknown> = {};
  if (patch.visitorEnabled !== undefined) update.visitor_log_enabled = patch.visitorEnabled;
  if (patch.visitorFields !== undefined) update.visitor_fields = patch.visitorFields;
  if (patch.highlightsEnabled !== undefined) update.highlights_enabled = patch.highlightsEnabled;
  const { error } = await supabase.from("boarding_houses").update(update).eq("id", bhId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ── Creation (LandlordSignUp's boarding-house setup step) ────────────────────

// Room/CR/bed photo inputs arrive as `blob:` object URLs (real files picked
// via <input type="file">, never uploaded anywhere before now). They stay
// valid for the lifetime of this page load, so re-fetching them here and
// uploading to Storage is safe without restructuring the wizard's state.
export async function uploadIfBlob(landlordId: string, blobUrl: string | undefined, path: string): Promise<string | null> {
  if (!blobUrl) return null;
  if (!blobUrl.startsWith("blob:")) return blobUrl;
  try {
    const res = await fetch(blobUrl);
    const blob = await res.blob();
    const ext = (blob.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
    const fullPath = `${landlordId}/${path}.${ext}`;
    const { error } = await supabase.storage.from("boarding-house-media").upload(fullPath, blob, { upsert: true, contentType: blob.type || "image/jpeg" });
    if (error) { console.error("photo upload failed:", error.message); return null; }
    const { data } = supabase.storage.from("boarding-house-media").getPublicUrl(fullPath);
    return data.publicUrl;
  } catch (e) {
    console.error("photo upload failed:", e);
    return null;
  }
}

export type NewBoardingHouseInput = {
  name: string; address: string; municipality: string; lat: number; lng: number;
  checkinRadiusMeters: number;
  description: string; contactNumber: string;
  amenities: string[]; customAmenities: string[];
  rulesText: string;
  rent: { enabled: boolean; amount: string };
  electric: { enabled: boolean; type: "fixed" | "metered"; amount: string };
  water: { enabled: boolean; type: "fixed" | "metered"; amount: string };
  internet: { enabled: boolean; type: "fixed" | "metered"; amount: string };
  extraFees: { name: string; type: "fixed" | "metered"; amount: string; enabled: boolean }[];
  visitorRecordsEnabled: boolean;
  visitorFields: { name: boolean; contact: boolean; relationship: boolean; purpose: boolean };
  highlightsEnabled: boolean;
  stayInfo: { lengthOfStay: boolean; moveIn: boolean; personality: boolean; hobbies: boolean; lifestyle: boolean; notes: boolean };
  rooms: LRoom[];
  galleryPhotos: { label: string; url: string }[];
};

const num = (s: string): number | null => (s.trim() === "" ? null : Number(s));

export async function createBoardingHouseWithRooms(
  landlordId: string,
  input: NewBoardingHouseInput,
): Promise<{ id: string } | { error: string }> {
  const { data: bh, error: bhError } = await supabase.from("boarding_houses").insert({
    landlord_id: landlordId,
    name: input.name.trim(),
    address: input.address.trim(),
    municipality: input.municipality || "",
    lat: input.lat, lng: input.lng,
    checkin_radius_meters: Math.round(input.checkinRadiusMeters) || 50,
    description: input.description.trim() || null,
    contact_number: input.contactNumber.trim() || null,
    rules: input.rulesText.split("\n").map(s => s.trim()).filter(Boolean),
    rent_amount: input.rent.enabled ? num(input.rent.amount) : null,
    electric_type: input.electric.enabled ? input.electric.type : null,
    electric_amount: input.electric.enabled ? num(input.electric.amount) : null,
    water_type: input.water.enabled ? input.water.type : null,
    water_amount: input.water.enabled ? num(input.water.amount) : null,
    internet_type: input.internet.enabled ? input.internet.type : null,
    internet_amount: input.internet.enabled ? num(input.internet.amount) : null,
    visitor_log_enabled: input.visitorRecordsEnabled,
    visitor_fields: input.visitorFields,
    highlights_enabled: input.highlightsEnabled,
    allow_length_of_stay: input.stayInfo.lengthOfStay,
    allow_move_in: input.stayInfo.moveIn,
    allow_personality: input.stayInfo.personality,
    allow_hobbies: input.stayInfo.hobbies,
    allow_lifestyle: input.stayInfo.lifestyle,
    allow_notes: input.stayInfo.notes,
    status: "active",
  }).select("id").single();
  if (bhError || !bh) return { error: bhError?.message ?? "Could not create boarding house." };
  const bhId = bh.id as string;

  const amenityRows = input.amenities.map(label => ({
    boarding_house_id: bhId, label, is_custom: input.customAmenities.includes(label),
  }));
  if (amenityRows.length) {
    const { error } = await supabase.from("boarding_house_amenities").insert(amenityRows);
    if (error) console.error("boarding_house_amenities insert failed:", error.message);
  }

  const extraFeeRows = input.extraFees.filter(f => f.name.trim()).map(f => ({
    boarding_house_id: bhId, name: f.name.trim(), fee_type: f.type, amount: num(f.amount), enabled: f.enabled,
  }));
  if (extraFeeRows.length) {
    const { error } = await supabase.from("boarding_house_extra_fees").insert(extraFeeRows);
    if (error) console.error("boarding_house_extra_fees insert failed:", error.message);
  }

  // Gallery photos each arrive as a `blob:` object URL (same as room/bed photos) plus whatever
  // label the landlord typed or picked from a suggested category — uploaded one at a time so a
  // failed upload can be dropped without misaligning the labels of the ones after it.
  const uploadedGallery: ({ label: string; url: string } | null)[] = [];
  for (let i = 0; i < input.galleryPhotos.length; i++) {
    const photo = input.galleryPhotos[i];
    const url = await uploadIfBlob(landlordId, photo.url, `${bhId}/gallery/${i}`);
    uploadedGallery.push(url ? { label: photo.label, url } : null);
  }
  const galleryRows = uploadedGallery
    .filter((g): g is { label: string; url: string } => !!g)
    .map((g, i) => ({ boarding_house_id: bhId, url: g.url, label: g.label, sort_order: i }));
  if (galleryRows.length) {
    const { error } = await supabase.from("boarding_house_photos").insert(galleryRows);
    if (error) console.error("boarding_house_photos insert failed:", error.message);
    // First uploaded photo doubles as the listing's cover photo (shown on browse/map cards).
    await supabase.from("boarding_houses").update({ cover_url: galleryRows[0].url }).eq("id", bhId);
  }

  for (const room of input.rooms) {
    const { data: roomRow, error: roomError } = await supabase.from("rooms").insert({
      boarding_house_id: bhId,
      name: room.name.trim() || "Room",
      capacity: Math.max(1, parseInt(room.cap) || room.beds.length || 1),
      description: room.desc.trim() || null,
    }).select("id").single();
    if (roomError || !roomRow) { console.error("room insert failed:", roomError?.message); continue; }
    const roomId = roomRow.id as string;

    const roomPhotoUrl = await uploadIfBlob(landlordId, room.roomPhoto, `${bhId}/rooms/${roomId}/room`);
    if (roomPhotoUrl) {
      await supabase.from("rooms").update({ cover_photo_url: roomPhotoUrl }).eq("id", roomId);
    }
    const crPhotoUrl = await uploadIfBlob(landlordId, room.crPhoto, `${bhId}/rooms/${roomId}/cr`);
    if (crPhotoUrl) {
      await supabase.from("room_photos").insert({ room_id: roomId, url: crPhotoUrl, label: "CR" });
    }

    if (room.amenities.length) {
      const { error } = await supabase.from("room_amenities").insert(
        room.amenities.map(label => ({ room_id: roomId, label })),
      );
      if (error) console.error("room_amenities insert failed:", error.message);
    }

    for (let i = 0; i < room.beds.length; i++) {
      const bed = room.beds[i];
      const { data: bedRow, error: bedError } = await supabase.from("beds").insert({
        room_id: roomId, label: bed.label || `Bed ${i + 1}`, status: bed.status,
      }).select("id").single();
      if (bedError || !bedRow) { console.error("bed insert failed:", bedError?.message); continue; }
      const bedPhotoUrl = await uploadIfBlob(landlordId, bed.photo, `${bhId}/rooms/${roomId}/beds/${bedRow.id}`);
      if (bedPhotoUrl) {
        await supabase.from("beds").update({ photo_url: bedPhotoUrl }).eq("id", bedRow.id);
      }
    }
  }

  await supabase.from("boarding_houses").update({ total_rooms: input.rooms.length }).eq("id", bhId);

  return { id: bhId };
}
