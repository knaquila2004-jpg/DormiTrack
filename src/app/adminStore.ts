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
      msg: `${studentName} checked ${c.type === "checkin" ? "IN at" : "OUT of"} ${bhName}.`,
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
    insights.push(`Peak check-in hour this month: ${peakHour % 12 === 0 ? 12 : peakHour % 12}:00 ${peakHour < 12 ? "AM" : "PM"}.`);
  }

  const totalRegs = monthly.reduce((s, m) => s + m.val, 0);
  if (totalRegs > 0) {
    const peak = monthly.reduce((a, b) => (b.val > a.val ? b : a));
    insights.push(`Student registrations peaked in ${peak.month} (${peak.val} submission${peak.val === 1 ? "" : "s"}).`);
  }

  return insights;
}
