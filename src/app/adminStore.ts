// Live Supabase-backed aggregate stats for the Admin dashboard — replaces
// AdminDashboard.tsx's hardcoded STATS/TODAY_WIDGETS arrays. Admin has
// SELECT access to every table involved here (current_role() = 'admin'
// policies throughout 0003_rls.sql), so these are plain aggregate counts,
// no RPCs needed.
import { supabase } from "../lib/supabase";

export type AdminOverviewStats = {
  totalStudents: number; totalParents: number; totalLandlords: number; totalBoardingHouses: number;
  activeInside: number; outsideBH: number; pendingVerifications: number; reportsToday: number;
};

export type AdminTodayWidgets = {
  newUsers: number; checkIns: number; checkOuts: number; pendingReports: number; bhApprovals: number;
};

async function countRows(table: string, build?: (q: any) => any): Promise<number> {
  let q = supabase.from(table).select("*", { count: "exact", head: true });
  if (build) q = build(q);
  const { count, error } = await q;
  if (error) { console.error(`countRows(${table}):`, error.message); return 0; }
  return count ?? 0;
}

function startOfToday(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function getAdminOverviewStats(): Promise<AdminOverviewStats> {
  const todayStart = startOfToday();
  const [
    totalStudents, totalParents, totalLandlords, totalBoardingHouses,
    currentlyAssigned, pendingVerifications, reportsToday, todaysRecords,
  ] = await Promise.all([
    countRows("students"),
    countRows("parents"),
    countRows("landlords"),
    countRows("boarding_houses", q => q.eq("status", "active")),
    countRows("student_assignments", q => q.eq("is_current", true)),
    countRows("student_boarding_registrations", q => q.eq("status", "pending")),
    countRows("reports", q => q.gte("submitted_at", todayStart)),
    supabase.from("check_in_out_records").select("student_id, type").gte("occurred_at", todayStart).order("occurred_at", { ascending: false }),
  ]);

  // A student's current status is whichever of today's check-in/out rows is
  // most recent for them (rows are already ordered newest-first above).
  const latestByStudent = new Map<string, string>();
  for (const r of todaysRecords.data ?? []) {
    if (!latestByStudent.has(r.student_id)) latestByStudent.set(r.student_id, r.type);
  }
  const activeInside = [...latestByStudent.values()].filter(t => t === "checkin").length;
  const outsideBH = Math.max(0, currentlyAssigned - activeInside);

  return { totalStudents, totalParents, totalLandlords, totalBoardingHouses, activeInside, outsideBH, pendingVerifications, reportsToday };
}

export async function getAdminTodayWidgets(): Promise<AdminTodayWidgets> {
  const todayStart = startOfToday();
  const [newUsers, checkIns, checkOuts, pendingReports, bhApprovals] = await Promise.all([
    countRows("users", q => q.gte("created_at", todayStart)),
    countRows("check_in_out_records", q => q.eq("type", "checkin").gte("occurred_at", todayStart)),
    countRows("check_in_out_records", q => q.eq("type", "checkout").gte("occurred_at", todayStart)),
    countRows("reports", q => q.eq("status", "pending")),
    countRows("boarding_houses", q => q.eq("status", "pending")),
  ]);
  return { newUsers, checkIns, checkOuts, pendingReports, bhApprovals };
}

// ── Reports & Analytics screen ───────────────────────────────────────────────

function startOfMonth(): string {
  const d = new Date();
  d.setDate(1); d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export type AdminAnalyticsStats = {
  monthlyCheckins: number; monthlyCheckouts: number; activeUsers: number;
  dormOccupancyPct: number; paymentCompletionPct: number;
};

export async function getAdminAnalyticsStats(): Promise<AdminAnalyticsStats> {
  const monthStart = startOfMonth();
  const periodLabel = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const [monthlyCheckins, monthlyCheckouts, activeUsers, beds, bills] = await Promise.all([
    countRows("check_in_out_records", q => q.eq("type", "checkin").gte("occurred_at", monthStart)),
    countRows("check_in_out_records", q => q.eq("type", "checkout").gte("occurred_at", monthStart)),
    countRows("users", q => q.eq("status", "active")),
    supabase.from("beds").select("status"),
    supabase.from("payment_bills").select("status, payments!inner(period_label)").eq("payments.period_label", periodLabel),
  ]);
  const bedRows = beds.data ?? [];
  const occupiedBeds = bedRows.filter((b: any) => b.status === "occupied").length;
  const dormOccupancyPct = bedRows.length ? Math.round((occupiedBeds / bedRows.length) * 100) : 0;

  const billRows = bills.data ?? [];
  const paidBills = billRows.filter((b: any) => b.status === "paid").length;
  const paymentCompletionPct = billRows.length ? Math.round((paidBills / billRows.length) * 100) : 0;

  return { monthlyCheckins, monthlyCheckouts, activeUsers, dormOccupancyPct, paymentCompletionPct };
}

export type DailyActivity = { day: string; checkins: number; checkouts: number };

export async function getDailyActivity(days = 7): Promise<DailyActivity[]> {
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  const { data, error } = await supabase.from("check_in_out_records").select("type, occurred_at").gte("occurred_at", start.toISOString());
  if (error) { console.error("getDailyActivity:", error.message); return []; }

  const buckets = new Map<string, { checkins: number; checkouts: number }>();
  for (let i = 0; i < days; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    buckets.set(d.toDateString(), { checkins: 0, checkouts: 0 });
  }
  for (const r of data ?? []) {
    const key = new Date(r.occurred_at).toDateString();
    const bucket = buckets.get(key);
    if (!bucket) continue;
    if (r.type === "checkin") bucket.checkins++; else bucket.checkouts++;
  }
  return [...buckets.entries()].map(([key, v]) => ({
    day: new Date(key).toLocaleDateString("en-US", { weekday: "short" }), ...v,
  }));
}

export type MonthlyRegistration = { month: string; val: number };

export async function getMonthlyRegistrations(months = 6): Promise<MonthlyRegistration[]> {
  const start = new Date();
  start.setMonth(start.getMonth() - (months - 1));
  start.setDate(1); start.setHours(0, 0, 0, 0);
  const { data, error } = await supabase.from("student_boarding_registrations").select("submitted_at").gte("submitted_at", start.toISOString());
  if (error) { console.error("getMonthlyRegistrations:", error.message); return []; }

  const buckets = new Map<string, number>();
  const labels: string[] = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(start); d.setMonth(start.getMonth() + i);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    buckets.set(key, 0);
    labels.push(key);
  }
  for (const r of data ?? []) {
    const d = new Date(r.submitted_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return labels.map(key => {
    const [y, m] = key.split("-").map(Number);
    return { month: new Date(y, m, 1).toLocaleDateString("en-US", { month: "short" }), val: buckets.get(key) ?? 0 };
  });
}

// ── Recent Activity (dashboard widget) ───────────────────────────────────────
// Replaces AdminDashboard.tsx's hardcoded ACTIVITIES array (fake names like
// "Juan Dela Cruz", fixed "2 min ago"/"15 min ago" timestamps shown identically
// to every admin on every login, regardless of what actually happened on the
// platform). Merges real events from 6 tables admin already has full read
// access to, sorted chronologically. Payment verifications are the one
// event type left out — the id chain to a display name (payment_records →
// payment_bills → payments → students → users) is a 4-hop join that isn't
// worth the fragility for one more feed entry; the other 6 categories already
// give a genuinely live picture.
export type PlatformActivity = { id: string; type: string; msg: string; ts: number };

export async function getRecentPlatformActivity(limit = 8): Promise<PlatformActivity[]> {
  const [
    { data: newUsers }, { data: newBhs }, { data: links },
    { data: checkins }, { data: reports }, { data: anns },
  ] = await Promise.all([
    supabase.from("users").select("id, first_name, last_name, role, created_at").order("created_at", { ascending: false }).limit(limit),
    supabase.from("boarding_houses").select("id, name, created_at, landlords(display_name)").order("created_at", { ascending: false }).limit(limit),
    supabase.from("parent_student_links").select("id, parent_id, student_id, decided_at").eq("status", "linked").not("decided_at", "is", null).order("decided_at", { ascending: false }).limit(limit),
    supabase.from("check_in_out_records").select("id, type, occurred_at, student_id, boarding_houses(name)").order("occurred_at", { ascending: false }).limit(limit),
    supabase.from("reports").select("id, title, submitted_at, submitter_id").order("submitted_at", { ascending: false }).limit(limit),
    supabase.from("announcements").select("id, title, created_at").order("created_at", { ascending: false }).limit(limit),
  ]);

  // One batched name lookup for every user id referenced above, instead of a
  // separate round-trip (or a fragile multi-hop embed) per event type —
  // mirrors adminUsersStore.ts's getAllUsersForAdmin() batching pattern.
  const neededIds = new Set<string>();
  for (const l of links ?? []) { neededIds.add(l.parent_id); neededIds.add(l.student_id); }
  for (const c of checkins ?? []) neededIds.add((c as any).student_id);
  for (const r of reports ?? []) neededIds.add((r as any).submitter_id);
  const { data: nameRows } = neededIds.size
    ? await supabase.from("users").select("id, first_name, last_name").in("id", [...neededIds])
    : { data: [] as any[] };
  const nameById = new Map((nameRows ?? []).map(u => [u.id, [u.first_name, u.last_name].filter(Boolean).join(" ")]));

  const ROLE_LABEL: Record<string, string> = { student: "Student", parent: "Parent", landlord: "Landlord", admin: "Admin" };
  const items: PlatformActivity[] = [];

  for (const u of newUsers ?? []) {
    const name = [u.first_name, u.last_name].filter(Boolean).join(" ") || "Someone";
    items.push({ id: `user-${u.id}`, type: "signup", msg: `${name} registered as ${ROLE_LABEL[u.role] ?? u.role}.`, ts: new Date(u.created_at).getTime() });
  }
  for (const b of newBhs ?? []) {
    const landlord = (b as any).landlords?.display_name ?? "A landlord";
    items.push({ id: `bh-${b.id}`, type: "bh", msg: `${landlord} added a new boarding house — ${b.name}.`, ts: new Date(b.created_at).getTime() });
  }
  for (const l of links ?? []) {
    const parentName = nameById.get(l.parent_id) ?? "A parent";
    items.push({ id: `link-${l.id}`, type: "link", msg: `${parentName}'s account was linked to their student.`, ts: new Date(l.decided_at as string).getTime() });
  }
  for (const c of checkins ?? []) {
    const studentName = nameById.get((c as any).student_id) ?? "A student";
    const bhName = (c as any).boarding_houses?.name ?? "their boarding house";
    items.push({
      id: `ci-${c.id}`, type: c.type,
      msg: `${studentName} ${c.type === "checkin" ? "entered" : "exited"} ${bhName}.`,
      ts: new Date(c.occurred_at).getTime(),
    });
  }
  for (const r of reports ?? []) {
    const name = nameById.get((r as any).submitter_id) ?? "A user";
    items.push({ id: `report-${r.id}`, type: "report", msg: `${name} submitted a report: "${r.title}".`, ts: new Date(r.submitted_at).getTime() });
  }
  for (const a of anns ?? []) {
    items.push({ id: `ann-${a.id}`, type: "announcement", msg: `New announcement posted: "${a.title}".`, ts: new Date(a.created_at).getTime() });
  }

  return items.sort((x, y) => y.ts - x.ts).slice(0, limit);
}

// A handful of real, cheaply-derivable insights — reuses data already
// fetched elsewhere on this screen rather than inventing narrative filler.
// Skips any insight it can't back with real numbers (e.g. no occupancy data
// yet) instead of showing a stock sentence with nothing behind it.
export async function getAdminInsights(daily: DailyActivity[], monthly: MonthlyRegistration[]): Promise<string[]> {
  const insights: string[] = [];

  const { data: bhOcc } = await supabase.from("boarding_houses").select("id, name, rooms(beds(status))").eq("status", "active");
  const withOccupancy = (bhOcc ?? []).map((bh: any) => {
    const beds = (bh.rooms ?? []).flatMap((r: any) => r.beds ?? []);
    const occupied = beds.filter((b: any) => b.status === "occupied").length;
    return { name: bh.name, pct: beds.length ? Math.round((occupied / beds.length) * 100) : 0, vacant: beds.length - occupied };
  }).filter((b: any) => b.name);
  if (withOccupancy.length) {
    const highest = withOccupancy.reduce((a, b) => (b.pct > a.pct ? b : a));
    insights.push(`${highest.name} has the highest occupancy rate (${highest.pct}%) among active boarding houses.`);
    const mostVacant = withOccupancy.reduce((a, b) => (b.vacant > a.vacant ? b : a));
    if (mostVacant.vacant > 0) insights.push(`${mostVacant.name} has ${mostVacant.vacant} vacant bed${mostVacant.vacant === 1 ? "" : "s"} — the most of any active boarding house.`);
  }

  const monthStart = startOfMonth();
  const { data: hourRows } = await supabase.from("check_in_out_records").select("occurred_at").eq("type", "checkin").gte("occurred_at", monthStart);
  if (hourRows && hourRows.length >= 5) {
    const hourCounts = new Map<number, number>();
    for (const r of hourRows) { const h = new Date(r.occurred_at).getHours(); hourCounts.set(h, (hourCounts.get(h) ?? 0) + 1); }
    const [peakHour] = [...hourCounts.entries()].reduce((a, b) => (b[1] > a[1] ? b : a));
    insights.push(`Peak entry hour this month: ${peakHour % 12 === 0 ? 12 : peakHour % 12}:00 ${peakHour < 12 ? "AM" : "PM"}.`);
  }

  const totalRegs = monthly.reduce((s, m) => s + m.val, 0);
  if (totalRegs > 0) {
    const peak = monthly.reduce((a, b) => (b.val > a.val ? b : a));
    insights.push(`Student registrations peaked in ${peak.month} (${peak.val} submission${peak.val === 1 ? "" : "s"}).`);
  }

  return insights;
}

// ── Admin Map — real student locations + real open-report locations ────────
// AdminMap.tsx previously plotted only real boarding houses, leaving its
// "Students" and "Reports" filters as an honest empty state (no backend data
// existed for either yet — see that file's own comment). This is that real
// data, following the exact same "only what's actually real and persisted"
// rule ParentMap.tsx already uses for a single student: this app has no live
// GPS backend, so a student's "location" is only ever their most recent real
// check_in_out_records row, at whatever position that record actually
// captured (never fabricated). Admin has full SELECT on both tables via
// current_role() = 'admin' policies (0003_rls.sql), same as everything else
// in this file.

export type AdminStudentLocation = {
  studentId: string; studentName: string; boardingHouseId: string; boardingHouseName: string;
  type: "checkin" | "checkout"; occurredAt: string; lat: number; lng: number;
};

export async function getStudentLocationsForAdmin(): Promise<AdminStudentLocation[]> {
  const { data: assignments, error: aErr } = await supabase
    .from("student_assignments")
    .select("student_id, boarding_house_id, students!inner ( user_id, users!inner ( first_name, last_name ) ), boarding_houses ( name )")
    .eq("is_current", true);
  if (aErr) { console.error("getStudentLocationsForAdmin (assignments):", aErr.message); return []; }
  if (!assignments?.length) return [];

  const nameByStudentId = new Map(assignments.map((a: any) => [a.student_id, [a.students.users.first_name, a.students.users.last_name].filter(Boolean).join(" ") || "A student"]));
  const bhByStudentId = new Map(assignments.map((a: any) => [a.student_id, { id: a.boarding_house_id, name: a.boarding_houses?.name ?? "—" }]));

  // Most recent row per student — same "take the first occurrence in a
  // newest-first feed" dedupe already used above (getAdminOverviewStats),
  // just without the "today only" filter and over a bounded window large
  // enough to cover every currently-assigned student at least once.
  const { data: records, error: rErr } = await supabase
    .from("check_in_out_records")
    .select("student_id, type, occurred_at, lat, lng")
    .in("student_id", assignments.map((a: any) => a.student_id))
    .not("lat", "is", null).not("lng", "is", null)
    .order("occurred_at", { ascending: false })
    .limit(2000);
  if (rErr) { console.error("getStudentLocationsForAdmin (records):", rErr.message); return []; }

  const seen = new Set<string>();
  const out: AdminStudentLocation[] = [];
  for (const r of records ?? []) {
    if (seen.has(r.student_id)) continue;
    seen.add(r.student_id);
    const bh = bhByStudentId.get(r.student_id);
    if (!bh) continue;
    out.push({
      studentId: r.student_id, studentName: nameByStudentId.get(r.student_id) ?? "A student",
      boardingHouseId: bh.id, boardingHouseName: bh.name,
      type: r.type, occurredAt: r.occurred_at, lat: r.lat as number, lng: r.lng as number,
    });
  }
  return out;
}

// ── Real admin activity log (0061) ──────────────────────────────────────────
// AdminProfile.tsx's "Activity History" showed a hardcoded mock array —
// replaced by this real, persisted log. Written from the screen-level
// handler right after each real action actually succeeds (user status
// changes, report responses, announcements, boarding house approvals,
// role-permission changes, report exports), since that's where the specific
// name/title/etc. needed for a real description is already in memory —
// mirrors how this app already fires notifications from screen-level
// handlers rather than from inside the low-level store functions.
export async function logAdminActivity(action: string, description: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return;
  const { error } = await supabase.from("admin_activity_log").insert({ admin_id: uid, action, description });
  if (error) console.error("logAdminActivity:", error.message);
}

export type AdminActivityEntry = { id: string; action: string; description: string; createdAt: string };

export async function getMyAdminActivity(limit = 20): Promise<AdminActivityEntry[]> {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return [];
  const { data, error } = await supabase
    .from("admin_activity_log").select("id, action, description, created_at")
    .eq("admin_id", uid).order("created_at", { ascending: false }).limit(limit);
  if (error) { console.error("getMyAdminActivity:", error.message); return []; }
  return (data ?? []).map(r => ({ id: r.id, action: r.action, description: r.description, createdAt: r.created_at }));
}

// ── Real profile-summary counts (AdminProfile.tsx's Stats card + Account
// Information section) — replaces hardcoded "11"/"8"/"2 properties" etc.
// "Reports Handled" counts reports this admin has actually resolved or
// archived (from admin_activity_log), not just every report ever filed —
// closer to what "handled" honestly means for one admin's own profile.
export type AdminProfileStats = { totalManagedUsers: number; totalBoardingHouses: number; reportsHandled: number };

export async function getMyAdminProfileStats(): Promise<AdminProfileStats> {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  const [students, parents, landlords, boardingHouses, reportsHandled] = await Promise.all([
    countRows("students"),
    countRows("parents"),
    countRows("landlords"),
    countRows("boarding_houses"),
    uid ? countRows("admin_activity_log", q => q.eq("admin_id", uid).in("action", ["resolve_report", "archive_report", "report_status"])) : Promise.resolve(0),
  ]);
  return { totalManagedUsers: students + parents + landlords, totalBoardingHouses: boardingHouses, reportsHandled };
}

// ── Real admin notification preferences (0063) ──────────────────────────────
// Replaces two separate local-only useState toggle sets (AdminSystem.tsx and
// AdminProfile.tsx each had their own, neither persisted). Only 4 kept — each
// gates a real event this app can actually fire (see notifyAdmins in
// notificationStore.ts): new signups, boarding house submissions, reports,
// payments. A missing row (no admin has customized their prefs yet) means
// every alert defaults to on, matching the table's own column defaults.
export type AdminNotificationPrefs = {
  newUserAlerts: boolean; bhRequestAlerts: boolean; reportAlerts: boolean; paymentAlerts: boolean;
};
const DEFAULT_ADMIN_NOTIF_PREFS: AdminNotificationPrefs = {
  newUserAlerts: true, bhRequestAlerts: true, reportAlerts: true, paymentAlerts: true,
};

export async function getMyNotificationPrefs(): Promise<AdminNotificationPrefs> {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return DEFAULT_ADMIN_NOTIF_PREFS;
  const { data, error } = await supabase
    .from("admin_notification_prefs").select("new_user_alerts, bh_request_alerts, report_alerts, payment_alerts")
    .eq("admin_id", uid).maybeSingle();
  if (error) { console.error("getMyNotificationPrefs:", error.message); return DEFAULT_ADMIN_NOTIF_PREFS; }
  if (!data) return DEFAULT_ADMIN_NOTIF_PREFS;
  return { newUserAlerts: data.new_user_alerts, bhRequestAlerts: data.bh_request_alerts, reportAlerts: data.report_alerts, paymentAlerts: data.payment_alerts };
}

export async function setNotificationPref(key: keyof AdminNotificationPrefs, enabled: boolean): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return { ok: false, error: "Not signed in." };
  const column = { newUserAlerts: "new_user_alerts", bhRequestAlerts: "bh_request_alerts", reportAlerts: "report_alerts", paymentAlerts: "payment_alerts" }[key];
  const { error } = await supabase.from("admin_notification_prefs").upsert({ admin_id: uid, [column]: enabled }, { onConflict: "admin_id" });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export type AdminReportLocation = {
  boardingHouseId: string; boardingHouseName: string; lat: number; lng: number; openReportCount: number;
};

// A report has no coordinate of its own (see public.reports — it's tied to a
// boarding house/room/bed, not a GPS point), so the only real, non-fabricated
// location for it is its boarding house's real lat/lng. Only open reports
// (pending/under-review/in-progress) count — a resolved/rejected/closed one
// isn't an active issue to flag on a live map.
export async function getOpenReportLocationsForAdmin(): Promise<AdminReportLocation[]> {
  const { data, error } = await supabase
    .from("reports")
    .select("boarding_house_id, boarding_houses ( name, lat, lng )")
    .in("status", ["pending", "under-review", "in-progress"])
    .not("boarding_house_id", "is", null);
  if (error) { console.error("getOpenReportLocationsForAdmin:", error.message); return []; }

  const byBh = new Map<string, AdminReportLocation>();
  for (const r of data ?? []) {
    const bh = (r as any).boarding_houses;
    if (!bh || bh.lat == null || bh.lng == null) continue;
    const existing = byBh.get(r.boarding_house_id);
    if (existing) existing.openReportCount++;
    else byBh.set(r.boarding_house_id, { boardingHouseId: r.boarding_house_id, boardingHouseName: bh.name, lat: bh.lat, lng: bh.lng, openReportCount: 1 });
  }
  return [...byBh.values()];
}
