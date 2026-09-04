// Live Supabase-backed data for AdminSystem.tsx — covers exactly the two
// pieces the migration plan flagged as real for this screen (announcements
// creation UI, and the role_permissions matrix — persisted but
// deliberately not enforced, per the confirmed design decision), plus the
// boarding-house approval section since it's a cheap, natural extension of
// data already used elsewhere (boardingHouseStore.ts). The rest of this
// screen (system settings, database management, audit logs, security
// center, system health, app info) has no real backing concept in this
// schema and stays cosmetic, matching how the master plan scoped this file.
import { supabase } from "../lib/supabase";
import { addNotification } from "./notificationStore";

// ── Announcements ────────────────────────────────────────────────────────────

export type AnnouncementAudience = "everyone" | "students" | "parents" | "landlords" | "admin";
export type AnnouncementPriority = "low" | "normal" | "high" | "urgent";
export type AnnouncementStatus = "active" | "pinned" | "archived";

export type Announcement = {
  id: string; title: string; desc: string; audience: string; priority: AnnouncementPriority;
  scheduledDate: string; expiryDate: string; status: AnnouncementStatus; createdAt: string;
};

const AUDIENCE_LABEL: Record<AnnouncementAudience, string> = {
  everyone: "Everyone", students: "Students", parents: "Parents", landlords: "Landlords", admin: "Housing Director",
};
const AUDIENCE_KEY: Record<string, AnnouncementAudience> = {
  "Everyone": "everyone", "Students": "students", "Parents": "parents", "Landlords": "landlords", "Housing Director": "admin",
};

function mapAnnouncement(row: any): Announcement {
  return {
    id: row.id, title: row.title, desc: row.description,
    audience: AUDIENCE_LABEL[row.audience as AnnouncementAudience] ?? row.audience,
    priority: row.priority, scheduledDate: row.scheduled_date ?? "", expiryDate: row.expiry_date ?? "",
    status: row.status, createdAt: new Date(row.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  };
}

export async function getAllAnnouncementsForAdmin(): Promise<Announcement[]> {
  const { data, error } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
  if (error) { console.error("getAllAnnouncementsForAdmin:", error.message); return []; }
  return (data ?? []).map(mapAnnouncement);
}

export type AnnouncementInput = {
  title: string; desc: string; audience: string; priority: AnnouncementPriority;
  scheduledDate: string; expiryDate: string;
};

export async function createAnnouncement(input: AnnouncementInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return { ok: false, error: "Not signed in." };
  const { error } = await supabase.from("announcements").insert({
    title: input.title, description: input.desc, audience: AUDIENCE_KEY[input.audience] ?? "everyone",
    priority: input.priority, scheduled_date: input.scheduledDate || null, expiry_date: input.expiryDate || null,
    author_id: uid, status: "active",
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function updateAnnouncement(id: string, input: AnnouncementInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.from("announcements").update({
    title: input.title, description: input.desc, audience: AUDIENCE_KEY[input.audience] ?? "everyone",
    priority: input.priority, scheduled_date: input.scheduledDate || null, expiry_date: input.expiryDate || null,
  }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function setAnnouncementStatus(id: string, status: AnnouncementStatus): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.from("announcements").update({ status }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteAnnouncement(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ── Role permissions matrix (persisted, not enforced) ───────────────────────

export type PermRole = "student" | "parent" | "landlord" | "admin";
export type PermKey = "viewDorms" | "checkIn" | "chat" | "fileReport" | "payments" | "viewOccupants";
export type RolePermissions = Record<PermRole, Record<PermKey, boolean>>;

const DEFAULT_PERMS: RolePermissions = {
  student:  { viewDorms: true, checkIn: true,  chat: true, fileReport: true,  payments: true, viewOccupants: true },
  parent:   { viewDorms: true, checkIn: false, chat: true, fileReport: true,  payments: true, viewOccupants: true },
  landlord: { viewDorms: true, checkIn: false, chat: true, fileReport: false, payments: true, viewOccupants: true },
  admin:    { viewDorms: true, checkIn: true,  chat: true, fileReport: true,  payments: true, viewOccupants: true },
};

export async function getRolePermissions(): Promise<RolePermissions> {
  const { data, error } = await supabase.from("role_permissions").select("role, permission_key, enabled");
  if (error) { console.error("getRolePermissions:", error.message); return DEFAULT_PERMS; }
  const perms: RolePermissions = { student: { ...DEFAULT_PERMS.student }, parent: { ...DEFAULT_PERMS.parent }, landlord: { ...DEFAULT_PERMS.landlord }, admin: { ...DEFAULT_PERMS.admin } };
  for (const row of data ?? []) {
    const role = row.role as PermRole; const key = row.permission_key as PermKey;
    if (perms[role]) perms[role][key] = row.enabled;
  }
  return perms;
}

export async function setRolePermission(role: PermRole, key: PermKey, enabled: boolean): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.from("role_permissions").upsert({ role, permission_key: key, enabled }, { onConflict: "role,permission_key" });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ── Boarding house approval ──────────────────────────────────────────────────

export type BHRequest = { id: string; name: string; landlord: string; landlordUserId: string; address: string; submitted: string; status: "pending" | "approved" | "rejected" };

export async function getPendingBoardingHouses(): Promise<BHRequest[]> {
  const { data, error } = await supabase.from("boarding_houses").select("id, name, address, status, created_at, landlord_id, landlords(display_name)").eq("status", "pending").order("created_at", { ascending: false });
  if (error) { console.error("getPendingBoardingHouses:", error.message); return []; }
  return (data ?? []).map((row: any) => ({
    id: row.id, name: row.name, landlord: row.landlords?.display_name ?? "—", landlordUserId: row.landlord_id,
    address: row.address, submitted: new Date(row.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    status: "pending" as const,
  }));
}

export async function approveBoardingHouse(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.from("boarding_houses").update({ status: "active" }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function rejectBoardingHouse(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.from("boarding_houses").update({ status: "suspended" }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// No real "needs revision" status exists on boarding_houses (only
// active/pending/suspended) — this is a real communication action instead
// of a fabricated status: it notifies the landlord directly and leaves the
// BH pending for admin to reconsider once they resubmit.
export async function requestBoardingHouseRevision(landlordUserId: string, bhName: string): Promise<{ ok: true } | { ok: false; error: string }> {
  await addNotification({
    userId: landlordUserId, type: "verification", title: "Revision Requested",
    description: `Your boarding house listing "${bhName}" needs revision before it can be approved. Please check your submission.`,
    destination: "dashboard",
  });
  return { ok: true };
}
