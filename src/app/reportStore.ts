// Live Supabase-backed reports layer — replaces the old in-memory mock store.
// Keeps the same exported names/shapes StudentHome.tsx, App.tsx (landlord),
// and ParentHome.tsx already render against, so those files only need their
// data-fetching wired up, not a UI rewrite.
//
// Scope note: this covers the student-submitted "facility/room concern" flow
// (reports.target_user_id is always null here). AdminUsers.tsx's separate
// "report a user" concept (target_user_id set) shares the same underlying
// table but is its own admin-screen phase — not touched by this store.
import { supabase } from "../lib/supabase";

export type ReportStatus   = "pending" | "in-progress" | "resolved" | "closed";
export type ReportCategory =
  | "room-issue" | "bathroom" | "electrical" | "water" | "internet"
  | "noise" | "maintenance" | "safety" | "cleanliness" | "roommate"
  | "lost-item" | "other";
export type ReportPriority = "low" | "medium" | "high";

export interface StudentReport {
  id: string;
  submitterId: string; // real auth user id — studentId below is the display student number
  studentName: string;
  studentId: string;
  boardingHouse: string;
  roomNumber: string;
  bedNumber: string;
  category: ReportCategory;
  priority: ReportPriority;
  title: string;
  description: string;
  imageUrls: string[]; // real uploaded photo URLs (Storage), empty if none attached
  dateSubmitted: string;
  timeSubmitted: string;
  status: ReportStatus;
  landlordResponse?: string;
  landlordResponseDate?: string;
  // The student's own latest follow-up note (added via addReportComment below) — kept
  // separate from landlordResponse so one doesn't overwrite/mislabel the other.
  studentComment?: string;
  studentCommentDate?: string;
  // `at` is the raw epoch-ms timestamp alongside the already-formatted `date` string — kept
  // separate so a caller building a cross-report activity feed (StudentHome.tsx's Activity
  // Timeline) can sort entries from *different* reports into one real chronological order,
  // which the formatted string alone (no year, "Aug 22, 10:02 AM") can't reliably do.
  statusHistory: { status: ReportStatus; date: string; at: number; note?: string }[];
}

export const CATEGORY_META: Record<ReportCategory, { label: string; color: string; bg: string }> = {
  "room-issue":   { label: "Room Issue",          color: "#9772F6", bg: "#F5F0FF" },
  "bathroom":     { label: "Bathroom Issue",       color: "#0891B2", bg: "#ECFEFF" },
  "electrical":   { label: "Electrical Problem",   color: "#D97706", bg: "#FEF3C7" },
  "water":        { label: "Water Supply",         color: "#3B82F6", bg: "#EFF6FF" },
  "internet":     { label: "Internet Connection",  color: "#6366F1", bg: "#EEF2FF" },
  "noise":        { label: "Noise Complaint",      color: "#EC4899", bg: "#FDF2F8" },
  "maintenance":  { label: "Maintenance Request",  color: "#16A34A", bg: "#DCFCE7" },
  "safety":       { label: "Safety Concern",       color: "#EF4444", bg: "#FEE2E2" },
  "cleanliness":  { label: "Cleanliness",          color: "#0891B2", bg: "#ECFEFF" },
  "roommate":     { label: "Roommate Concern",     color: "#F59E0B", bg: "#FEF3C7" },
  "lost-item":    { label: "Lost Item",            color: "#8B5CF6", bg: "#EDE9FE" },
  "other":        { label: "Other",                color: "#6B7280", bg: "#F3F4F6" },
};

export const PRIORITY_META: Record<ReportPriority, { label: string; color: string; bg: string; dot: string }> = {
  low:    { label: "Low",    color: "#16A34A", bg: "#DCFCE7", dot: "#16A34A" },
  medium: { label: "Medium", color: "#D97706", bg: "#FEF3C7", dot: "#D97706" },
  high:   { label: "High",   color: "#EF4444", bg: "#FEE2E2", dot: "#EF4444" },
};

export const STATUS_META: Record<ReportStatus, { label: string; color: string; bg: string; dot: string }> = {
  "pending":     { label: "Pending Review", color: "#D97706", bg: "#FEF3C7", dot: "#F59E0B" },
  "in-progress": { label: "In Progress",   color: "#3B82F6", bg: "#EFF6FF", dot: "#3B82F6" },
  "resolved":    { label: "Resolved",      color: "#16A34A", bg: "#DCFCE7", dot: "#22C55E" },
  "closed":      { label: "Closed",        color: "#6B7280", bg: "#F3F4F6", dot: "#9CA3AF" },
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}
function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" });
}
function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

const REPORT_SELECT = `
  id, submitter_id, category, priority, title, description, image_urls, status, submitted_at, updated_at,
  boarding_houses ( name ),
  rooms ( name ),
  beds ( label ),
  report_responses ( id, responder_id, note, status_after, created_at )
`;

function mapReport(row: any, studentName: string, studentId: string): StudentReport {
  const responses = [...(row.report_responses ?? [])].sort(
    (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const statusHistory: StudentReport["statusHistory"] = [
    { status: "pending", date: fmtDateTime(row.submitted_at), at: new Date(row.submitted_at).getTime() },
    ...responses.map((r: any) => ({ status: r.status_after as ReportStatus, date: fmtDateTime(r.created_at), at: new Date(r.created_at).getTime(), note: r.note ?? undefined })),
  ];
  // The submitter (student) can also add a follow-up note via add_report_comment — those
  // rows live in the same report_responses table (with status_after left unchanged) but
  // must be kept out of "landlordResponse" below, or a student's own comment posted after
  // the landlord's real reply would overwrite it and get mislabeled as if the landlord had
  // said it. responder_id distinguishes the two: anything not from the submitter themselves
  // is the landlord/admin's actual response.
  const landlordNotes = responses.filter((r: any) => r.note && r.responder_id !== row.submitter_id);
  const latestLandlordNote = landlordNotes[landlordNotes.length - 1];
  const studentNotes = responses.filter((r: any) => r.note && r.responder_id === row.submitter_id);
  const latestStudentNote = studentNotes[studentNotes.length - 1];
  return {
    id: row.id,
    submitterId: row.submitter_id,
    studentName, studentId,
    boardingHouse: row.boarding_houses?.name ?? "—",
    roomNumber: row.rooms?.name ?? "—",
    bedNumber: row.beds?.label ?? "—",
    category: row.category, priority: row.priority,
    title: row.title, description: row.description,
    imageUrls: row.image_urls ?? [],
    dateSubmitted: fmtDate(row.submitted_at), timeSubmitted: fmtTime(row.submitted_at),
    status: row.status,
    landlordResponse: latestLandlordNote?.note ?? undefined,
    landlordResponseDate: latestLandlordNote ? fmtDate(latestLandlordNote.created_at) : undefined,
    studentComment: latestStudentNote?.note ?? undefined,
    studentCommentDate: latestStudentNote ? fmtDate(latestStudentNote.created_at) : undefined,
    statusHistory,
  };
}

async function getProfileFor(userId: string): Promise<{ name: string; idNo: string }> {
  const [{ data: user }, { data: student }] = await Promise.all([
    supabase.from("users").select("first_name, last_name").eq("id", userId).maybeSingle(),
    supabase.from("students").select("student_id_no").eq("user_id", userId).maybeSingle(),
  ]);
  return {
    name: user ? [user.first_name, user.last_name].filter(Boolean).join(" ") : "—",
    idNo: student?.student_id_no ?? "—",
  };
}

export async function getMyReports(): Promise<StudentReport[]> {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return [];
  const [profile, { data, error }] = await Promise.all([
    getProfileFor(uid),
    supabase.from("reports").select(REPORT_SELECT).eq("submitter_id", uid).is("target_user_id", null).order("submitted_at", { ascending: false }),
  ]);
  if (error) { console.error("getMyReports:", error.message); return []; }
  return (data ?? []).map(row => mapReport(row, profile.name, profile.idNo));
}

export async function getReportsForLinkedStudent(studentId: string): Promise<StudentReport[]> {
  const [profile, { data, error }] = await Promise.all([
    getProfileFor(studentId),
    supabase.from("reports").select(REPORT_SELECT).eq("submitter_id", studentId).is("target_user_id", null).order("submitted_at", { ascending: false }),
  ]);
  if (error) { console.error("getReportsForLinkedStudent:", error.message); return []; }
  return (data ?? []).map(row => mapReport(row, profile.name, profile.idNo));
}

export async function getReportsForLandlord(landlordId: string): Promise<StudentReport[]> {
  const { data: bhs } = await supabase.from("boarding_houses").select("id").eq("landlord_id", landlordId);
  const bhIds = (bhs ?? []).map(b => b.id);
  if (!bhIds.length) return [];
  const { data, error } = await supabase.from("reports").select(REPORT_SELECT).in("boarding_house_id", bhIds).is("target_user_id", null).order("submitted_at", { ascending: false });
  if (error) { console.error("getReportsForLandlord:", error.message); return []; }

  const submitterIds = [...new Set((data ?? []).map((r: any) => r.submitter_id))];
  if (!submitterIds.length) return [];
  const [{ data: users }, { data: students }] = await Promise.all([
    supabase.from("users").select("id, first_name, last_name").in("id", submitterIds),
    supabase.from("students").select("user_id, student_id_no").in("user_id", submitterIds),
  ]);
  const nameById = new Map((users ?? []).map(u => [u.id, [u.first_name, u.last_name].filter(Boolean).join(" ")]));
  const idNoById = new Map((students ?? []).map(s => [s.user_id, s.student_id_no]));

  return (data ?? []).map(row => mapReport(row, nameById.get(row.submitter_id) ?? "—", idNoById.get(row.submitter_id) ?? "—"));
}

export type SubmitReportInput = {
  category: ReportCategory; priority: ReportPriority; title: string; description: string; imageUrls?: string[];
};

export async function submitReport(input: SubmitReportInput): Promise<{ ok: true; id: string; boardingHouseId: string; submitterId: string } | { ok: false; error: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return { ok: false, error: "Not signed in." };
  const { data: sa, error: saErr } = await supabase
    .from("student_assignments")
    .select("boarding_house_id, room_id, bed_id")
    .eq("student_id", uid).eq("is_current", true).maybeSingle();
  if (saErr || !sa) return { ok: false, error: "You don't have an active boarding house assignment yet." };

  const { data, error } = await supabase.from("reports").insert({
    submitter_id: uid, boarding_house_id: sa.boarding_house_id, room_id: sa.room_id, bed_id: sa.bed_id,
    category: input.category, priority: input.priority, title: input.title, description: input.description,
    image_urls: input.imageUrls ?? [],
  }).select("id").single();
  if (error || !data) return { ok: false, error: error?.message ?? "Could not submit report." };
  return { ok: true, id: data.id, boardingHouseId: sa.boarding_house_id, submitterId: uid };
}

// Real photo-attachment upload for the concern-submission form. Reports don't have a
// pre-existing id to key the storage path off (unlike a payment's bill id), so each photo
// gets a random per-upload id instead — the report row itself only gets written once, with
// every successfully-uploaded URL already in `image_urls` (students have no RLS "update own
// report" policy, so uploading after the fact and patching the row isn't an option here).
const REPORT_IMG_EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };

export async function uploadReportImage(file: File): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return { ok: false, error: "You're not signed in." };

  const ext = REPORT_IMG_EXT[file.type] ?? (file.name.split(".").pop() || "jpg");
  const path = `${uid}/report-photo/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("boarding-house-media")
    .upload(path, file, { contentType: file.type || "image/jpeg" });
  if (uploadError) return { ok: false, error: uploadError.message };

  const { data } = supabase.storage.from("boarding-house-media").getPublicUrl(path);
  return { ok: true, url: data.publicUrl };
}

export async function respondToReport(reportId: string, status: ReportStatus, note?: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.rpc("respond_to_report", { p_report_id: reportId, p_status: status, p_note: note ?? null });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// Student's "Add Comment" on their own report — a follow-up note that doesn't change
// status (unlike respondToReport, which only the landlord/admin may call).
export async function addReportComment(reportId: string, note: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!note.trim()) return { ok: false, error: "Comment cannot be empty." };
  const { error } = await supabase.rpc("add_report_comment", { p_report_id: reportId, p_note: note.trim() });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ── Admin-wide view (all reports, both the facility-concern flow above AND
// AdminUsers.tsx's separate "report a user" concept — target_user_id set or
// not, both live in this same table) ────────────────────────────────────────
export type AdminReportRow = {
  id: string; reporterName: string; category: string; boardingHouseName: string; date: string; status: ReportStatus;
};

export async function getAllReportsForAdmin(limit = 50): Promise<AdminReportRow[]> {
  const { data, error } = await supabase
    .from("reports")
    .select("id, category, status, submitted_at, users!reports_submitter_id_fkey(first_name,last_name), boarding_houses(name)")
    .order("submitted_at", { ascending: false })
    .limit(limit);
  if (error) { console.error("getAllReportsForAdmin:", error.message); return []; }
  return (data ?? []).map((row: any) => ({
    id: row.id,
    reporterName: row.users ? [row.users.first_name, row.users.last_name].filter(Boolean).join(" ") : "—",
    category: CATEGORY_META[row.category as ReportCategory]?.label ?? row.category,
    boardingHouseName: row.boarding_houses?.name ?? "—",
    date: fmtDate(row.submitted_at),
    status: row.status,
  }));
}
