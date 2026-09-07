// ── Notification System — live Supabase-backed store ──────────────────────────
// Same external shape as the old mock (module-level cache + pub/sub +
// useSyncExternalStore, so badges/lists re-render automatically), but the
// cache is now a periodically-refreshed mirror of the signed-in user's real
// `notifications` rows instead of a static seeded array.
//
// `role` stays in every hook/hook-adjacent signature purely so call sites
// don't need touching — a signed-in session is always exactly one role's
// data already, so the real filter is just "the current user", resolved via
// auth.uid() under the hood.

import { useEffect, useMemo, useSyncExternalStore } from "react";
import type { ComponentType } from "react";
import {
  User, Building2, DoorOpen, CreditCard, LogIn, LogOut,
  Flag, Megaphone, ShieldCheck, Settings, MessageCircle, UserCheck, Calendar, AlertTriangle,
} from "lucide-react";
import type { Role, Screen } from "./shared";
import { supabase } from "../lib/supabase";

export type NotificationType =
  | "account" | "boarding-house" | "room" | "payment"
  | "check-in" | "check-out" | "report" | "announcement"
  | "verification" | "system" | "message" | "visitor" | "stay-change" | "status-update" | "inactivity";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  timestamp: number;          // Date.now()-style epoch ms, derived from created_at
  read: boolean;
  // Distinct from `read`: `read` flips the moment the Notifications page is opened at
  // all (it's what clears the bell badge), while `opened` only flips when the user
  // actually taps into this specific card. Without the split, a card the user merely
  // scrolled past would be indistinguishable from one they opened the instant the
  // Notifications screen was left and reopened (see NotificationsScreen).
  opened: boolean;
  relatedId?: string;
  destination: Screen;
}

// ── Category → icon / color meta (no emoji, DormiTrack palette) ───────────────
export const NOTIF_META: Record<NotificationType, { label: string; Icon: ComponentType<{ size?: number; color?: string }>; color: string; bg: string }> = {
  "account":        { label: "Account",        Icon: User,        color: "#6366F1", bg: "#EEF2FF" },
  "boarding-house": { label: "Boarding House",  Icon: Building2,   color: "#9772F6", bg: "#F5F0FF" },
  "room":           { label: "Room",            Icon: DoorOpen,    color: "#3B82F6", bg: "#EFF6FF" },
  "payment":        { label: "Payment",         Icon: CreditCard,  color: "#EC4899", bg: "#FDF2F8" },
  "check-in":       { label: "Enter",           Icon: LogIn,       color: "#16A34A", bg: "#DCFCE7" },
  "check-out":      { label: "Exit",            Icon: LogOut,      color: "#D97706", bg: "#FEF3C7" },
  "report":         { label: "Report",          Icon: Flag,        color: "#EF4444", bg: "#FEE2E2" },
  "announcement":   { label: "Announcement",    Icon: Megaphone,   color: "#D97706", bg: "#FEF3C7" },
  "verification":   { label: "Verification",    Icon: ShieldCheck, color: "#0891B2", bg: "#ECFEFF" },
  "system":         { label: "System",          Icon: Settings,    color: "#6B7280", bg: "#F3F4F6" },
  "message":        { label: "Message",         Icon: MessageCircle, color: "#8B5CF6", bg: "#EDE9FE" },
  "visitor":        { label: "Visitor",         Icon: UserCheck,   color: "#EC4899", bg: "#FCE7F3" },
  "stay-change":    { label: "Stay Change",     Icon: Calendar,    color: "#D97706", bg: "#FEF3C7" },
  "status-update":  { label: "Status Update",   Icon: UserCheck,   color: "#D97706", bg: "#FEF3C7" },
  "inactivity":     { label: "Inactivity",      Icon: AlertTriangle, color: "#F87171", bg: "#FEF2F2" },
};

// ── Relative-time formatter ("2 hours ago", "Yesterday", "Aug 3, 2026") ────────
export function timeAgo(ts: number): string {
  const diffMs = Date.now() - ts;
  const sec = Math.floor(diffMs / 1000);
  if (sec < 5) return "Just now";
  if (sec < 60) return `${sec} second${sec === 1 ? "" : "s"} ago`;
  const min = Math.floor(sec / 60);
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

// ── Store internals ─────────────────────────────────────────────────────────
function mapRow(row: any): AppNotification {
  return {
    id: row.id, type: row.type, title: row.title, description: row.description,
    timestamp: new Date(row.created_at).getTime(), read: row.read, opened: row.opened,
    relatedId: row.related_id ?? undefined, destination: row.destination as Screen,
  };
}

let _notifications: AppNotification[] = [];
let _currentUserId: string | null = null;
const _listeners = new Set<() => void>();
function _emit() { _listeners.forEach(l => l()); }
function subscribe(listener: () => void): () => void {
  _listeners.add(listener);
  return () => { _listeners.delete(listener); };
}
function getSnapshot(): AppNotification[] { return _notifications; }

// Real-time channel for the signed-in user's own notifications (0033_notifications_realtime
// enabled replication for this table). Re-subscribed whenever the signed-in user changes so a
// stale subscription from a previous session never leaks into a new one. The 15s poll below
// stays as a safety net (reconnects after the tab was backgrounded, a missed websocket event,
// etc.) — this channel is what makes a brand-new notification (e.g. "New Registration Request")
// show up in an already-open tab instantly, without waiting on the poll or a manual refresh.
let _channel: ReturnType<typeof supabase.channel> | null = null;
function _subscribeRealtime(uid: string) {
  if (_channel) { supabase.removeChannel(_channel); _channel = null; }
  _channel = supabase
    .channel(`notifications:${uid}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${uid}` }, () => { refresh(); })
    .subscribe();
}
function _unsubscribeRealtime() {
  if (_channel) { supabase.removeChannel(_channel); _channel = null; }
}

async function refresh(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id ?? null;
  const userChanged = uid !== _currentUserId;
  _currentUserId = uid;
  if (!uid) {
    _unsubscribeRealtime();
    if (_notifications.length) { _notifications = []; _emit(); }
    return;
  }
  if (userChanged) _subscribeRealtime(uid);
  const { data, error } = await supabase
    .from("notifications").select("*")
    .eq("user_id", uid).order("created_at", { ascending: false }).limit(100);
  if (error) { console.error("notifications refresh:", error.message); return; }
  _notifications = (data ?? []).map(mapRow);
  _emit();
}

// Poll stays as a fallback (see _subscribeRealtime above) rather than the primary mechanism —
// same cadence pattern used elsewhere in this app (PendingVerificationScreen,
// ParentLinkingScreen). Also re-syncs on every auth state change (login/logout/session restore).
let _pollStarted = false;
function ensurePolling() {
  if (_pollStarted) return;
  _pollStarted = true;
  refresh();
  setInterval(refresh, 15000);
  supabase.auth.onAuthStateChange(() => { refresh(); });
}

export function useAllNotifications(): AppNotification[] {
  useEffect(() => { ensurePolling(); }, []);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useNotifications(_role: Role): AppNotification[] {
  return useAllNotifications();
}

export function useUnreadCount(_role: Role): number {
  const all = useAllNotifications();
  return useMemo(() => all.reduce((c, n) => (n.read ? c : c + 1), 0), [all]);
}

// Called when a specific notification card is actually tapped — sets both
// `read` (same badge-clearing effect as markAllRead) and `opened` (the one
// markAllRead deliberately never touches; see AppNotification.opened above).
export async function markNotificationRead(id: string): Promise<void> {
  const target = _notifications.find(n => n.id === id);
  if (!target || (target.read && target.opened)) return;
  _notifications = _notifications.map(n => n.id === id ? { ...n, read: true, opened: true } : n);
  _emit();
  const { error } = await supabase.from("notifications").update({ read: true, opened: true }).eq("id", id);
  if (error) console.error("markNotificationRead:", error.message);
}

export async function markAllRead(_role: Role): Promise<void> {
  const uid = _currentUserId;
  if (!uid) return;
  let changed = false;
  _notifications = _notifications.map(n => {
    if (n.read) return n;
    changed = true;
    return { ...n, read: true };
  });
  if (changed) _emit();
  const { error } = await supabase.from("notifications").update({ read: true }).eq("user_id", uid).eq("read", false);
  if (error) console.error("markAllRead:", error.message);
}

export type NotifyInput = {
  userId: string; type: NotificationType; title: string; description: string;
  destination: Screen; relatedId?: string;
};

// Real insert, addressed to a specific real user. RLS (notif_insert_authenticated)
// deliberately lets any authenticated user notify anyone — the access-control
// question is "do you know the right user_id", which the two helpers below
// answer for the app's two repeating fan-out patterns.
export async function addNotification(input: NotifyInput): Promise<void> {
  const { error } = await supabase.from("notifications").insert({
    user_id: input.userId, type: input.type, title: input.title, description: input.description,
    destination: input.destination, related_id: input.relatedId ?? null,
  });
  if (error) { console.error("addNotification:", error.message); return; }
  if (input.userId === _currentUserId) refresh();
}

// "Notify the landlord who owns this boarding house" — boarding_houses is
// publicly readable, so this is just a lookup + direct insert.
export async function notifyLandlordOfBoardingHouse(bhId: string, input: Omit<NotifyInput, "userId">): Promise<void> {
  const { data: bh } = await supabase.from("boarding_houses").select("landlord_id").eq("id", bhId).maybeSingle();
  if (bh?.landlord_id) await addNotification({ ...input, userId: bh.landlord_id });
}

// "Notify this student's linked parent(s)" — parent_student_links is only
// readable by the student/parent themselves, not by the landlord who most
// often needs to trigger this (payment verified, report responded to,
// registration approved), so this goes through a SECURITY DEFINER RPC
// instead of a client-side select + fan-out.
export async function notifyLinkedParents(studentId: string, input: Omit<NotifyInput, "userId">): Promise<void> {
  const { error } = await supabase.rpc("notify_linked_parents", {
    p_student_id: studentId, p_type: input.type, p_title: input.title,
    p_description: input.description, p_destination: input.destination, p_related_id: input.relatedId ?? null,
  });
  if (error) console.error("notifyLinkedParents:", error.message);
}

// "Notify every admin who wants this kind of alert" — admin_notification_prefs
// (0063) isn't the caller's own row to read a fan-out list from (a student
// filing a report has no reason to see every admin's preferences directly),
// so this goes through the same SECURITY DEFINER RPC pattern as
// notify_linked_parents above.
export type AdminNotifPrefKey = "new_user_alerts" | "bh_request_alerts" | "report_alerts" | "payment_alerts";
export async function notifyAdmins(prefKey: AdminNotifPrefKey, input: Omit<NotifyInput, "userId">): Promise<void> {
  const { error } = await supabase.rpc("notify_admins", {
    p_pref_key: prefKey, p_type: input.type, p_title: input.title,
    p_description: input.description, p_destination: input.destination, p_related_id: input.relatedId ?? null,
  });
  if (error) console.error("notifyAdmins:", error.message);
}
