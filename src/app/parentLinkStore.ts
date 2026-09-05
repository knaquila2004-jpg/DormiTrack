// Student-side half of parent-student linking (Phase 9). The parent side —
// looking up the student and creating the `pending` request — lives in
// ParentSignUp.tsx's ParentLinkingScreen. This file is the approve/reject
// step: a real link only ever becomes `linked` once the student acts on it
// here (RLS: psl_update_student requires student_id = auth.uid() AND
// decided_by = auth.uid() — see 0003_rls.sql).
import { supabase } from "../lib/supabase";
import { notifyLandlordOfBoardingHouse } from "./notificationStore";

export type ParentLinkRequest = {
  id: string;
  parentId: string;
  parentName: string;
  relation: string;
  contact: string;
  requestedAt: string;
};

export async function getMyPendingParentLinkRequests(): Promise<ParentLinkRequest[]> {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return [];
  const { data, error } = await supabase
    .from("parent_student_links")
    .select("id, parent_id, requested_at, parents!inner ( relation, relation_other, users!inner ( first_name, last_name, contact_number ) )")
    .eq("student_id", uid).eq("status", "pending")
    .order("requested_at", { ascending: false });
  if (error) { console.error("getMyPendingParentLinkRequests:", error.message); return []; }
  return (data ?? []).map((row: any) => ({
    id: row.id,
    parentId: row.parent_id,
    parentName: [row.parents.users.first_name, row.parents.users.last_name].filter(Boolean).join(" "),
    relation: row.parents.relation === "Other" ? (row.parents.relation_other || "Other") : row.parents.relation,
    contact: row.parents.users.contact_number ?? "—",
    requestedAt: row.requested_at,
  }));
}

export async function approveParentLink(linkId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return { ok: false, error: "Not signed in." };
  const { error } = await supabase.from("parent_student_links")
    .update({ status: "linked", decided_at: new Date().toISOString(), decided_by: uid })
    .eq("id", linkId);
  if (error) return { ok: false, error: error.message };

  // Real notification to the landlord — a parent now being linked to one of their
  // tenants is something they should see, and be able to tap straight into that
  // student's profile for (relatedId = the student's own user id, same convention
  // LandlordOccupants.tsx already uses for check-in/check-out/stay-change deep
  // links). psl_select_landlord + users_select_landlord_of_parent
  // (0024_chat_roster_and_conversation_rpc.sql) already grant the reads this needs.
  const [{ data: link }, { data: me }, { data: sa }] = await Promise.all([
    supabase.from("parent_student_links").select("parents!inner ( users!inner ( first_name, last_name ) )").eq("id", linkId).maybeSingle(),
    supabase.from("users").select("first_name, last_name").eq("id", uid).maybeSingle(),
    supabase.from("student_assignments").select("boarding_house_id").eq("student_id", uid).eq("is_current", true).maybeSingle(),
  ]);
  if (sa?.boarding_house_id) {
    const parentUser = (link as any)?.parents?.users;
    const parentName = parentUser ? [parentUser.first_name, parentUser.last_name].filter(Boolean).join(" ") : "A parent";
    const studentName = me ? [me.first_name, me.last_name].filter(Boolean).join(" ") : "Your student";
    notifyLandlordOfBoardingHouse(sa.boarding_house_id, {
      type: "account", title: "Parent Linked",
      description: `${parentName} is now linked as ${studentName}'s parent/guardian.`,
      destination: "occupants", relatedId: uid,
    });
  }
  return { ok: true };
}

export async function rejectParentLink(linkId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return { ok: false, error: "Not signed in." };
  const { error } = await supabase.from("parent_student_links")
    .update({ status: "rejected", decided_at: new Date().toISOString(), decided_by: uid })
    .eq("id", linkId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ── Parent-side access gate ─────────────────────────────────────────────────
// Mirrors registrationStore.ts's getMyStudentGateStatus() for the parent
// role: a parent whose link request hasn't been approved yet must not reach
// the real dashboard (it would just show another family's — or nobody's —
// data). App.tsx's login flow calls this the same way it already gates
// students, instead of sending every parent straight to "dashboard".
export type ParentGateStatus =
  // justLinked = the parent has never acknowledged this link yet (ack_at is
  // still null) — lets the login flow show a one-time "You're Linked!"
  // confirmation for a parent who wasn't watching ParentLinkingScreen's own
  // live "success" card when the student actually approved (e.g. they'd
  // closed the app while pending), without repeating it on every later login.
  | { kind: "linked"; linkId: string; justLinked: boolean }
  | { kind: "pending"; linkId: string; studentIdNo: string }
  | { kind: "rejected"; linkId: string; studentIdNo: string }
  | { kind: "none" };

export async function getMyParentGateStatus(): Promise<ParentGateStatus> {
  // SECURITY DEFINER on the DB side (0034/0035_*.sql) — a parent's RLS access
  // to the students table only exists once status is already 'linked', which
  // is exactly the case this needs to see through.
  const { data, error } = await supabase.rpc("get_my_parent_gate_status");
  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row) return { kind: "none" };
  if (row.status === "linked") return { kind: "linked", linkId: row.link_id, justLinked: !row.ack_at };
  if (row.status === "pending") return { kind: "pending", linkId: row.link_id, studentIdNo: row.student_id_no };
  if (row.status === "rejected") return { kind: "rejected", linkId: row.link_id, studentIdNo: row.student_id_no };
  return { kind: "none" };
}

// Marks the confirmation as seen — call once the parent dismisses the
// "You're Linked!" modal, so it doesn't reappear on the next login.
export async function acknowledgeParentLink(): Promise<void> {
  const { error } = await supabase.rpc("ack_my_parent_link");
  if (error) console.error("acknowledgeParentLink:", error.message);
}
