// Live Supabase-backed data for AdminUsers.tsx — replaces its ALL_USERS
// (user directory) and SEED_REPORTS (report-a-user) mocks. Admin has broad
// SELECT/UPDATE access to every table involved (current_role() = 'admin'
// policies throughout 0003_rls.sql).
import { supabase } from "../lib/supabase";

export type UserRole = "student" | "parent" | "landlord" | "admin";
export type UserStatus = "active" | "suspended" | "pending";
// Mirrors parent_student_links.status, plus "none" for a student/parent with
// no link row at all — admin needs to tell "student never linked a parent"
// apart from "a request is still awaiting the student's decision", not just
// see a name once the two accounts are fully linked.
export type ParentLinkStatus = "linked" | "pending" | "rejected" | "none";

export type AdminUser = {
  id: string; name: string; role: UserRole; email: string; contact: string;
  status: UserStatus; lastLogin: string; linked?: string; linkStatus?: ParentLinkStatus; bh?: string;
  photo: string | null;
};

export async function getAllUsersForAdmin(): Promise<AdminUser[]> {
  const { data: users, error } = await supabase
    .from("users")
    .select("id, role, first_name, last_name, email, contact_number, status, photo_url")
    .order("created_at", { ascending: false });
  if (error) { console.error("getAllUsersForAdmin:", error.message); return []; }
  const rows = users ?? [];
  const nameById = new Map(rows.map(u => [u.id, [u.first_name, u.last_name].filter(Boolean).join(" ")]));

  const studentIds = rows.filter(u => u.role === "student").map(u => u.id);
  const parentIds = rows.filter(u => u.role === "parent").map(u => u.id);

  // Every status now (not just 'linked') — admin needs to see pending/rejected requests too, not
  // just confirmed links. Ordered ascending so that when a student/parent has more than one link
  // row (e.g. a rejected request followed by a fresh one), the map below keeps the most recent.
  const [{ data: studentLinks }, { data: parentLinks }, { data: assignments }, { data: allBhs }] = await Promise.all([
    studentIds.length ? supabase.from("parent_student_links").select("student_id, parent_id, status, requested_at").in("student_id", studentIds).order("requested_at", { ascending: true }) : Promise.resolve({ data: [] as any[] }),
    parentIds.length ? supabase.from("parent_student_links").select("student_id, parent_id, status, requested_at").in("parent_id", parentIds).order("requested_at", { ascending: true }) : Promise.resolve({ data: [] as any[] }),
    studentIds.length ? supabase.from("student_assignments").select("student_id, boarding_house_id").eq("is_current", true).in("student_id", studentIds) : Promise.resolve({ data: [] as any[] }),
    supabase.from("boarding_houses").select("id, name, landlord_id"),
  ]);

  const bhNameById = new Map((allBhs ?? []).map((b: any) => [b.id, b.name]));
  const landlordBhName = new Map<string, string>();
  for (const b of allBhs ?? []) if (!landlordBhName.has((b as any).landlord_id)) landlordBhName.set((b as any).landlord_id, (b as any).name);
  const studentBhId = new Map((assignments ?? []).map((a: any) => [a.student_id, a.boarding_house_id]));
  const linkByStudent = new Map((studentLinks ?? []).map((l: any) => [l.student_id, l]));
  const linkByParent = new Map((parentLinks ?? []).map((l: any) => [l.parent_id, l]));

  return rows.map(u => {
    const name = nameById.get(u.id) ?? "—";
    let linked: string | undefined;
    let linkStatus: ParentLinkStatus | undefined;
    let bh: string | undefined;
    if (u.role === "student") {
      const link = linkByStudent.get(u.id);
      linkStatus = link ? (link.status as ParentLinkStatus) : "none";
      if (link) linked = nameById.get(link.parent_id);
      const bid = studentBhId.get(u.id);
      if (bid) bh = bhNameById.get(bid);
    } else if (u.role === "parent") {
      const link = linkByParent.get(u.id);
      linkStatus = link ? (link.status as ParentLinkStatus) : "none";
      if (link) linked = nameById.get(link.student_id);
    } else if (u.role === "landlord") {
      bh = landlordBhName.get(u.id);
    }
    return {
      id: u.id, name, role: u.role as UserRole, email: u.email, contact: u.contact_number ?? "—",
      // No real last-sign-in tracking is exposed via the public schema
      // (auth.users isn't queryable via RLS/PostgREST) — shown honestly as
      // "—" rather than approximated.
      status: u.status as UserStatus, lastLogin: "—", linked, linkStatus, bh, photo: (u as any).photo_url ?? null,
    };
  });
}

export async function setUserStatus(id: string, status: "active" | "suspended"): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.from("users").update({ status }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// Real, complete account deletion — see 0027_admin_user_management_rpc.sql
// for why this needs an RPC rather than a client-side delete.
export async function deleteUserAccount(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.rpc("admin_delete_user", { p_user_id: id });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ── "Report a user" — shares the same `reports` table as the student-concern
// flow (reportStore.ts), distinguished by a non-null target_user_id. There's
// no submission UI anywhere in the app yet for this (a real, separately-
// scoped gap, not this screen's job to fill) — this only wires the real
// admin-side viewing/status-management of whatever rows exist.
export type AdminReportStatus = "pending" | "under-review" | "resolved" | "rejected" | "closed";
export type AdminReportPriority = "low" | "medium" | "high" | "critical";
export type AdminReportCategory =
  | "room-issue" | "bathroom" | "electrical" | "water" | "internet" | "noise" | "maintenance"
  | "safety" | "cleanliness" | "roommate" | "lost-item" | "harassment" | "rule-violation" | "payment" | "other";

export type AdminUserReport = {
  id: string;
  targetUserId: string | null; submitterUserId: string;
  reporterName: string; reporterRole: UserRole;
  category: AdminReportCategory; title: string; shortDesc: string; fullDesc: string;
  status: AdminReportStatus; priority: AdminReportPriority;
  dateSubmitted: string; timeSubmitted: string; lastUpdated: string;
  boardingHouse?: string; roomNumber?: string; assignedReviewer?: string; resolutionNotes?: string;
};

function fmtDate(iso: string): string { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
function fmtTime(iso: string): string { return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }); }

// Separate from reportStore.ts's respondToReport() — that wrapper's status
// param is deliberately narrowed to the 4 values the student-concern flow's
// UI actually offers. Admin needs the full set (adds under-review/rejected),
// so this calls the same respond_to_report RPC directly rather than
// widening (and risking) that already-verified, narrower public API.
export async function respondToReportAsAdmin(reportId: string, status: AdminReportStatus, note?: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.rpc("respond_to_report", { p_report_id: reportId, p_status: status, p_note: note ?? null });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function getAllUserReportsForAdmin(limit = 100): Promise<AdminUserReport[]> {
  const { data, error } = await supabase
    .from("reports")
    .select(`
      id, submitter_id, target_user_id, category, priority, title, description, status, assigned_reviewer, submitted_at, updated_at,
      submitter:users!reports_submitter_id_fkey ( first_name, last_name, role ),
      boarding_houses ( name ), rooms ( name ),
      report_responses ( note, created_at )
    `)
    .order("submitted_at", { ascending: false })
    .limit(limit);
  if (error) { console.error("getAllUserReportsForAdmin:", error.message); return []; }

  return (data ?? []).map((row: any) => {
    const responses = [...(row.report_responses ?? [])].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const latestNote = responses.find((r: any) => r.note)?.note;
    return {
      id: row.id,
      targetUserId: row.target_user_id, submitterUserId: row.submitter_id,
      reporterName: row.submitter ? [row.submitter.first_name, row.submitter.last_name].filter(Boolean).join(" ") : "—",
      reporterRole: row.submitter?.role ?? "student",
      category: row.category, title: row.title,
      shortDesc: row.description.length > 140 ? row.description.slice(0, 140) + "…" : row.description,
      fullDesc: row.description,
      status: row.status, priority: row.priority,
      dateSubmitted: fmtDate(row.submitted_at), timeSubmitted: fmtTime(row.submitted_at), lastUpdated: fmtDate(row.updated_at),
      boardingHouse: row.boarding_houses?.name, roomNumber: row.rooms?.name,
      assignedReviewer: row.assigned_reviewer ?? undefined, resolutionNotes: latestNote,
    };
  });
}
