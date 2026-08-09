// ── Notification System — module-level store ──────────────────────────────────
// Mirrors the pattern used by reportStore.ts: a single in-memory store (no
// backend in this prototype) that every role's Home screen and Notifications
// page reads from. A tiny pub/sub layer + useSyncExternalStore gives every
// subscriber (badges, the Notifications list) an automatic re-render the
// instant a notification is added or its read state changes — no manual
// refresh needed anywhere in the app.

import { useMemo, useSyncExternalStore } from "react";
import type { ComponentType } from "react";
import {
  User, Building2, DoorOpen, CreditCard, LogIn, LogOut,
  Flag, Megaphone, ShieldCheck, Settings, MessageCircle,
} from "lucide-react";
import type { Role, Screen } from "./shared";

export type NotificationType =
  | "account" | "boarding-house" | "room" | "payment"
  | "check-in" | "check-out" | "report" | "announcement"
  | "verification" | "system" | "message";

export interface AppNotification {
  id: string;
  role: Role;                 // which account's inbox this belongs to
  type: NotificationType;
  title: string;
  description: string;
  timestamp: number;          // Date.now() epoch ms — used for sort + relative time
  read: boolean;
  relatedId?: string;         // e.g. a report id, payment/student id — lets the
                               // destination screen open the exact record
  destination: Screen;        // page this notification opens when tapped
}

// ── Category → icon / color meta (no emoji, DormiTrack palette) ───────────────
export const NOTIF_META: Record<NotificationType, { label: string; Icon: ComponentType<{ size?: number; color?: string }>; color: string; bg: string }> = {
  "account":        { label: "Account",        Icon: User,        color: "#6366F1", bg: "#EEF2FF" },
  "boarding-house": { label: "Boarding House",  Icon: Building2,   color: "#9772F6", bg: "#F5F0FF" },
  "room":           { label: "Room",            Icon: DoorOpen,    color: "#3B82F6", bg: "#EFF6FF" },
  "payment":        { label: "Payment",         Icon: CreditCard,  color: "#EC4899", bg: "#FDF2F8" },
  "check-in":       { label: "Check-In",        Icon: LogIn,       color: "#16A34A", bg: "#DCFCE7" },
  "check-out":      { label: "Check-Out",       Icon: LogOut,      color: "#D97706", bg: "#FEF3C7" },
  "report":         { label: "Report",          Icon: Flag,        color: "#EF4444", bg: "#FEE2E2" },
  "announcement":   { label: "Announcement",    Icon: Megaphone,   color: "#D97706", bg: "#FEF3C7" },
  "verification":   { label: "Verification",    Icon: ShieldCheck, color: "#0891B2", bg: "#ECFEFF" },
  "system":         { label: "System",          Icon: Settings,    color: "#6B7280", bg: "#F3F4F6" },
  "message":        { label: "Message",         Icon: MessageCircle, color: "#8B5CF6", bg: "#EDE9FE" },
};

// ── Relative-time formatter ("2 hours ago", "Yesterday", "Aug 3, 2026") ────────
export function timeAgo(ts: number): string {
  const diffMs = Date.now() - ts;
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min} minute${min === 1 ? "" : "s"} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  const day = Math.floor(hr / 24);
  if (day === 1) return "Yesterday";
  if (day < 7) return `${day} days ago`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Badge count display, capped per spec: "99+" beyond 99.
export function fmtBadgeCount(n: number): string { return n > 99 ? "99+" : String(n); }

// ── Seed data — realistic starting inbox per role ──────────────────────────────
const now = Date.now();
const H = 60 * 60 * 1000;
const D = 24 * H;

let _seq = 0;
const mk = (n: Omit<AppNotification, "id">): AppNotification => ({ id: `ntf_seed_${_seq++}`, ...n });

const SEED: AppNotification[] = [
  // ── Student ──────────────────────────────────────────────────────────────
  mk({ role: "student", type: "payment",        title: "Payment Verified",             description: "Your payment for August has been verified by the landlord.",              timestamp: now - 2 * H,  read: false, destination: "payments",  relatedId: "p-aug" }),
  mk({ role: "student", type: "announcement",    title: "New Landlord Announcement",    description: "Water Service Interruption — scheduled maintenance on August 5.",         timestamp: now - 5 * H,  read: false, destination: "dashboard", relatedId: "a1" }),
  mk({ role: "student", type: "check-in",        title: "Check-In Recorded",            description: "Your check-in was successfully verified at Naquila Boarding House.",       timestamp: now - 1 * D,  read: false, destination: "map" }),
  mk({ role: "student", type: "boarding-house",  title: "Registration Approved",        description: "Your boarding house registration has been approved by the landlord.",     timestamp: now - 2 * D,  read: true,  destination: "occupants" }),
  mk({ role: "student", type: "report",          title: "Landlord Responded",           description: "Your landlord responded to \"Broken Electric Fan in Room A\".",            timestamp: now - 3 * D,  read: true,  destination: "dashboard", relatedId: "sr1" }),
  mk({ role: "student", type: "room",            title: "Room Assignment Updated",      description: "You have been assigned to Room A · Bed 1.",                                timestamp: now - 6 * D,  read: true,  destination: "occupants" }),

  // ── Parent / Guardian ────────────────────────────────────────────────────
  mk({ role: "parent", type: "payment",        title: "Student Payment Verified",   description: "Juan's payment for August has been verified by the landlord.",              timestamp: now - 3 * H,  read: false, destination: "payments" }),
  mk({ role: "parent", type: "check-in",       title: "Student Checked In",         description: "Juan Dela Cruz checked in at Naquila Boarding House.",                       timestamp: now - 1 * D,  read: false, destination: "map" }),
  mk({ role: "parent", type: "report",         title: "Student Submitted a Concern", description: "Juan reported \"Broken Electric Fan in Room A\" to the landlord.",           timestamp: now - 3 * D,  read: true,  destination: "dashboard", relatedId: "sr1" }),
  mk({ role: "parent", type: "boarding-house", title: "Registration Approved",       description: "Juan's boarding house registration has been approved.",                     timestamp: now - 6 * D,  read: true,  destination: "occupants" }),

  // ── Landlord ─────────────────────────────────────────────────────────────
  mk({ role: "landlord", type: "verification",    title: "New Registration Request",     description: "Sofia Castillo submitted a boarding house registration request.",         timestamp: now - 1 * H,  read: false, destination: "dashboard" }),
  mk({ role: "landlord", type: "payment",         title: "Payment Awaiting Verification", description: "Juan Dela Cruz submitted a payment for verification.",                    timestamp: now - 4 * H,  read: false, destination: "payments" }),
  mk({ role: "landlord", type: "report",          title: "New Student Concern",           description: "Juan Dela Cruz submitted a concern about Room A.",                        timestamp: now - 1 * D,  read: false, destination: "dashboard", relatedId: "sr1" }),
  mk({ role: "landlord", type: "check-out",       title: "Student Checked Out",           description: "Maria Santos checked out of Room B.",                                     timestamp: now - 2 * D,  read: true,  destination: "occupants" }),
  mk({ role: "landlord", type: "room",            title: "New Student Assigned",          description: "Kevin Cruz was assigned to Room C.",                                      timestamp: now - 4 * D,  read: true,  destination: "occupants" }),

  // ── Admin / Housing Director ─────────────────────────────────────────────
  mk({ role: "admin", type: "verification",    title: "New Landlord Registration",   description: "A new landlord account is awaiting verification.",                          timestamp: now - 2 * H,  read: false, destination: "adminUsers" }),
  mk({ role: "admin", type: "boarding-house",  title: "Boarding House Update",       description: "Naquila Boarding House updated its room capacity.",                          timestamp: now - 8 * H,  read: false, destination: "adminMap" }),
  mk({ role: "admin", type: "report",          title: "Report Requires Attention",   description: "A safety concern was flagged and needs review.",                             timestamp: now - 1 * D,  read: false, destination: "adminReports" }),
  mk({ role: "admin", type: "system",          title: "System Alert",               description: "Scheduled maintenance completed successfully.",                              timestamp: now - 3 * D,  read: true,  destination: "adminSystem" }),
];

// ── Store internals ─────────────────────────────────────────────────────────
let _notifications: AppNotification[] = [...SEED];
const _listeners = new Set<() => void>();
function _emit() { _listeners.forEach(l => l()); }

function subscribe(listener: () => void): () => void {
  _listeners.add(listener);
  return () => { _listeners.delete(listener); };
}
function getSnapshot(): AppNotification[] { return _notifications; }

/** All notifications, unfiltered, kept in a referentially-stable array
 *  (only reassigned on real mutation) so it's safe to feed straight into
 *  useSyncExternalStore. Filter/sort per-role in the caller. */
export function useAllNotifications(): AppNotification[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useNotifications(role: Role): AppNotification[] {
  const all = useAllNotifications();
  return useMemo(
    () => all.filter(n => n.role === role).sort((a, b) => b.timestamp - a.timestamp),
    [all, role],
  );
}

export function useUnreadCount(role: Role): number {
  const all = useAllNotifications();
  return useMemo(
    () => all.reduce((c, n) => (n.role === role && !n.read ? c + 1 : c), 0),
    [all, role],
  );
}

export function markNotificationRead(id: string): void {
  const target = _notifications.find(n => n.id === id);
  if (!target || target.read) return;
  _notifications = _notifications.map(n => n.id === id ? { ...n, read: true } : n);
  _emit();
}

export function markAllRead(role: Role): void {
  let changed = false;
  _notifications = _notifications.map(n => {
    if (n.role === role && !n.read) { changed = true; return { ...n, read: true }; }
    return n;
  });
  if (changed) _emit();
}

export function addNotification(input: {
  role: Role; type: NotificationType; title: string; description: string;
  destination: Screen; relatedId?: string; read?: boolean;
}): AppNotification {
  const n: AppNotification = {
    id: `ntf_${Date.now()}_${_seq++}`,
    role: input.role, type: input.type, title: input.title, description: input.description,
    destination: input.destination, relatedId: input.relatedId,
    timestamp: Date.now(), read: input.read ?? false,
  };
  _notifications = [n, ..._notifications];
  _emit();
  return n;
}
