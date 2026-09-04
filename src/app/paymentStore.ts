// Live Supabase-backed payments layer — the single source of truth that
// replaces LandlordPayments.tsx/StudentPayments.tsx/ParentPayments.tsx's
// three previously-independent, unsynced mock datasets.
import { supabase } from "../lib/supabase";

export type BillStatus = "paid" | "awaiting-verification" | "partially-paid" | "overdue" | "unpaid";
export type BillItem = { id: string; key: string; label: string; amount: number; paidAmount: number; status: BillStatus };
export type PayTx = {
  id: string; billId: string; billKey: string; billLabel: string;
  amount: number; submittedAt: string; submittedByRole: "student" | "parent"; submittedByName: string;
  status: "verified" | "pending" | "rejected"; rejectionReason?: string | null; proofUrl?: string | null;
  method?: string | null; referenceNo?: string | null; paymentDate?: string | null;
};
export type StudentBilling = {
  paymentId: string; studentId: string; studentIdNo: string; studentName: string; room: string; bed: string;
  periodLabel: string; dueDate: string; updatedAt: string; note?: string | null; bills: BillItem[]; transactions: PayTx[];
};

// Creates this month's payment + bill rows for a student if they don't
// already exist, using the boarding house's configured fixed-rate fees.
// Metered fees (no fixed amount) aren't auto-billable without a meter
// reading, so they're skipped — a real gap, not fabricated data.
//
// Runs via a SECURITY DEFINER RPC (not a direct client insert): RLS only
// grants write access on payments/payment_bills to the owning landlord/admin
// (0003_rls.sql), so a raw insert from the student's own session — the most
// common caller, via getMyBills() — was silently rejected. The RPC checks
// the caller is the student themselves, their linked parent, the owning
// landlord, or an admin before creating the row.
export async function ensureCurrentPeriodBill(studentId: string, boardingHouseId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc("ensure_current_period_bill", { p_student_id: studentId, p_boarding_house_id: boardingHouseId });
  if (error) { console.error("ensureCurrentPeriodBill:", error.message); return null; }
  return data ?? null;
}

function mapBilling(payment: any): StudentBilling {
  const bills: BillItem[] = (payment.payment_bills ?? []).map((b: any) => ({
    id: b.id, key: b.bill_key, label: b.label, amount: Number(b.amount), paidAmount: Number(b.paid_amount), status: b.status,
  }));
  const transactions: PayTx[] = (payment.payment_bills ?? []).flatMap((b: any) =>
    (b.payment_records ?? []).map((r: any) => ({
      id: r.id, billId: b.id, billKey: b.bill_key, billLabel: b.label,
      amount: Number(r.amount), submittedAt: r.submitted_at, submittedByRole: r.submitted_by_role,
      submittedByName: r.submitted_by_role === "parent" ? "Parent" : "Student",
      status: r.status, rejectionReason: r.rejection_reason, proofUrl: r.proof_url,
      method: r.method, referenceNo: r.reference_no, paymentDate: r.payment_date,
    })),
  );
  return {
    paymentId: payment.id, studentId: payment.student_id, studentIdNo: payment.student_id_no ?? "",
    studentName: payment.student_name ?? "", room: payment.room_name ?? "", bed: payment.bed_label ?? "",
    periodLabel: payment.period_label, dueDate: payment.due_date, updatedAt: payment.updated_at, note: payment.note, bills, transactions,
  };
}

const BILLING_SELECT = `
  id, student_id, period_label, due_date, updated_at, note,
  payment_bills ( id, bill_key, label, amount, paid_amount, status,
    payment_records ( id, amount, submitted_at, submitted_by_role, status, rejection_reason, proof_url, method, reference_no, payment_date )
  )
`;

export async function getMyBills(): Promise<StudentBilling[]> {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return [];
  const { data: sa } = await supabase.from("student_assignments").select("boarding_house_id").eq("student_id", uid).eq("is_current", true).maybeSingle();
  if (sa) await ensureCurrentPeriodBill(uid, sa.boarding_house_id);
  const { data, error } = await supabase.from("payments").select(BILLING_SELECT).eq("student_id", uid).order("due_date", { ascending: false });
  if (error) { console.error("getMyBills:", error.message); return []; }
  return (data ?? []).map(mapBilling);
}

// Lightweight aggregate for StudentHome.tsx's billing summary card — that
// screen only needs a single overall total/status/due-date, not the full
// bill/transaction breakdown getMyBills() returns.
export type BillingSummary = { total: number; dueDate: string; period: string; status: "paid" | "awaiting-verification" | "overdue" | "unpaid" };

export async function getMyBillingSummary(): Promise<BillingSummary | null> {
  const periods = await getMyBills();
  const current = periods[0];
  if (!current) return null;
  const bills = current.bills;
  const total = bills.reduce((s, b) => s + b.amount, 0);
  const status: BillingSummary["status"] =
    bills.some(b => b.status === "overdue") ? "overdue" :
    bills.some(b => b.status === "awaiting-verification") ? "awaiting-verification" :
    bills.length > 0 && bills.every(b => b.status === "paid") ? "paid" :
    "unpaid";
  const dueDate = current.dueDate
    ? new Date(current.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "—";
  return { total, dueDate, period: current.periodLabel, status };
}

export async function getLinkedStudentBills(studentId: string): Promise<StudentBilling[]> {
  const { data, error } = await supabase.from("payments").select(BILLING_SELECT).eq("student_id", studentId).order("due_date", { ascending: false });
  if (error) { console.error("getLinkedStudentBills:", error.message); return []; }
  return (data ?? []).map(mapBilling);
}

export async function getBillingRosterForLandlord(landlordId: string): Promise<StudentBilling[]> {
  const { data: bhs } = await supabase.from("boarding_houses").select("id").eq("landlord_id", landlordId);
  const bhIds = (bhs ?? []).map(b => b.id);
  if (!bhIds.length) return [];
  // Make sure every currently-assigned student has a bill for this period
  // before reading, so the roster isn't missing anyone.
  const { data: assignments } = await supabase.from("student_assignments").select("student_id, boarding_house_id").in("boarding_house_id", bhIds).eq("is_current", true);
  await Promise.all((assignments ?? []).map(a => ensureCurrentPeriodBill(a.student_id, a.boarding_house_id)));

  const { data, error } = await supabase
    .from("payments")
    .select(`${BILLING_SELECT}, students!inner ( user_id, student_id_no, users!inner ( first_name, last_name ) )`)
    .in("boarding_house_id", bhIds)
    .order("due_date", { ascending: false });
  if (error) { console.error("getBillingRosterForLandlord:", error.message); return []; }

  // One row per student now that createPaymentPeriod() lets a landlord pre-create bills for
  // future months — a student can genuinely have several `payments` rows (Aug, Sep, Oct…), but
  // this roster is meant to show "where does each student's *active* billing stand right now",
  // not one card per period. Pick whichever period's due date is closest to today (ties broken
  // toward the earlier one), so this still resolves to the current month in the common case and
  // degrades sensibly once a future period is scheduled.
  const now = Date.now();
  const bestRowByStudent = new Map<string, any>();
  for (const row of data ?? []) {
    const existing = bestRowByStudent.get(row.student_id);
    if (!existing) { bestRowByStudent.set(row.student_id, row); continue; }
    const dist = Math.abs(new Date(row.due_date).getTime() - now);
    const existingDist = Math.abs(new Date(existing.due_date).getTime() - now);
    if (dist < existingDist) bestRowByStudent.set(row.student_id, row);
  }

  return Promise.all([...bestRowByStudent.values()].map(async (row: any) => {
    const mapped = mapBilling(row);
    mapped.studentName = [row.students.users.first_name, row.students.users.last_name].filter(Boolean).join(" ");
    mapped.studentIdNo = row.students.student_id_no;
    const { data: sa } = await supabase.from("student_assignments").select("room_id, bed_id, rooms(name), beds(label)").eq("student_id", row.student_id).eq("is_current", true).maybeSingle();
    if (sa) { mapped.room = (sa as any).rooms?.name ?? ""; mapped.bed = (sa as any).beds?.label ?? ""; }
    return mapped;
  }));
}

// ── Landlord dashboard "Recent Activity" feed — real payment submissions ──
// across every boarding house this landlord owns, so a student or parent
// marking a bill as paid shows up for the landlord without them having to
// go dig through the Payments tab.
export type LandlordPaymentActivity = {
  id: string; studentId: string; studentName: string; billLabel: string;
  amount: number; submittedAt: string; submittedByRole: "student" | "parent"; status: "verified" | "pending" | "rejected";
};

export async function getPaymentActivityForLandlord(landlordId: string, limit = 20): Promise<LandlordPaymentActivity[]> {
  const { data: bhs } = await supabase.from("boarding_houses").select("id").eq("landlord_id", landlordId);
  const bhIds = (bhs ?? []).map(b => b.id);
  if (!bhIds.length) return [];

  const { data: pays } = await supabase.from("payments").select("id, student_id").in("boarding_house_id", bhIds);
  const paymentIds = (pays ?? []).map(p => p.id);
  const studentIdByPaymentId = new Map((pays ?? []).map(p => [p.id, p.student_id]));
  if (!paymentIds.length) return [];

  const { data, error } = await supabase
    .from("payment_records")
    .select("id, amount, submitted_at, submitted_by_role, status, payment_bills!inner ( label, payment_id )")
    .in("payment_bills.payment_id", paymentIds)
    .order("submitted_at", { ascending: false })
    .limit(limit);
  if (error) { console.error("getPaymentActivityForLandlord:", error.message); return []; }

  const studentIds = [...new Set((data ?? []).map((r: any) => studentIdByPaymentId.get(r.payment_bills?.payment_id)).filter(Boolean))] as string[];
  const { data: nameRows } = studentIds.length
    ? await supabase.from("students").select("user_id, users!inner ( first_name, last_name )").in("user_id", studentIds)
    : { data: [] as any[] };
  const nameByStudentId = new Map((nameRows ?? []).map((s: any) => [s.user_id, [s.users.first_name, s.users.last_name].filter(Boolean).join(" ")]));

  return (data ?? []).map((r: any) => {
    const studentId = studentIdByPaymentId.get(r.payment_bills?.payment_id) ?? "";
    return {
      id: r.id, amount: Number(r.amount), submittedAt: r.submitted_at,
      submittedByRole: r.submitted_by_role, status: r.status,
      billLabel: r.payment_bills?.label ?? "Payment",
      studentId, studentName: nameByStudentId.get(studentId) ?? "A student",
    };
  });
}

// Real proof-of-payment upload — a photo, screenshot, or PDF receipt. Reuses the same public
// "boarding-house-media" bucket profileStore.ts already uses for any role's avatar (its Storage
// RLS only checks that the first path segment is the uploader's own auth uid, so it works
// identically whether the uploader is the student or the paying parent — no new bucket needed).
// Unlike a profile photo, each proof gets its own unique path (billId + timestamp) rather than
// a fixed upsert-able one, since a resubmission after a rejection is a genuinely new receipt
// that shouldn't silently overwrite/lose the old one.
const PROOF_EXT: Record<string, string> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };

export async function uploadPaymentProof(file: File, billId: string): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return { ok: false, error: "You're not signed in." };

  const ext = PROOF_EXT[file.type] ?? (file.name.split(".").pop() || "bin");
  const path = `${uid}/payment-proof/${billId}-${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("boarding-house-media")
    .upload(path, file, { contentType: file.type || "application/octet-stream" });
  if (uploadError) return { ok: false, error: uploadError.message };

  const { data } = supabase.storage.from("boarding-house-media").getPublicUrl(path);
  return { ok: true, url: data.publicUrl };
}

export type SubmitPaymentInput = {
  billId: string; amount: number; role: "student" | "parent";
  method?: string; referenceNo?: string; paymentDate?: string; proofUrl?: string;
};

// Returns the new record's real id so the caller can point a landlord's "Payment Awaiting
// Verification" notification at this exact transaction (letting it deep-link straight to it,
// same as a registration request does), instead of just a generic "go check Payments" nudge.
export async function submitPaymentRecord(input: SubmitPaymentInput): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return { ok: false, error: "Not signed in." };
  const { data, error } = await supabase.from("payment_records").insert({
    bill_id: input.billId, submitted_by: uid, submitted_by_role: input.role, amount: input.amount,
    proof_url: input.proofUrl ?? null, method: input.method ?? null,
    reference_no: input.referenceNo ?? null, payment_date: input.paymentDate ?? null,
  }).select("id").single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data.id };
}

export async function verifyPaymentRecord(recordId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.rpc("verify_payment_record", { p_record_id: recordId });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function rejectPaymentRecord(recordId: string, reason: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.rpc("reject_payment_record", { p_record_id: recordId, p_reason: reason });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// Landlord-initiated payment period — real bills for every current occupant of a boarding
// house, for a chosen month (current month through 6 months ahead, enforced server-side too),
// with an optional note ("water rate increased this month"). Existing periods are left alone
// (bills/due date untouched) but still get the note attached/updated, and are reported back as
// not-new so the caller doesn't re-notify students who were already billed for that month.
export const CREATE_PERIOD_MAX_MONTHS_AHEAD = 6;

export type CreatePaymentPeriodResult = { studentId: string; isNew: boolean };

export async function createPaymentPeriod(input: {
  boardingHouseId: string; year: number; month: number; dueDate: string; note?: string;
}): Promise<{ ok: true; results: CreatePaymentPeriodResult[] } | { ok: false; error: string }> {
  const { data, error } = await supabase.rpc("create_payment_period", {
    p_boarding_house_id: input.boardingHouseId, p_year: input.year, p_month: input.month,
    p_due_date: input.dueDate, p_note: input.note?.trim() || null,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, results: (data ?? []).map((r: any) => ({ studentId: r.student_id, isNew: r.is_new })) };
}
