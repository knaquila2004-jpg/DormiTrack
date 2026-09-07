import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { uploadProfilePhoto, removeProfilePhoto, getMyLoginHistory, LoginHistoryEntry } from "./profileStore";
import {
  getMyAdminActivity, AdminActivityEntry,
  getMyNotificationPrefs, setNotificationPref, AdminNotificationPrefs,
  getMyAdminProfileStats, AdminProfileStats,
} from "./adminStore";
import { changeMyPassword } from "./landlordProfileStore";
import { ProfileAvatar } from "./components/ProfileAvatar";
import { useDeviceType } from "./components/useDeviceType";
import { CountUp } from "./components/CountUp";
import { PrivacyPolicyContent, TermsConditionsContent } from "./LegalContent";
import {
  ChevronLeft, ChevronDown, ChevronRight,
  User, Edit3, Shield, Phone, Key, Lock,
  Bell, Moon, Sun, Monitor, Clock, LogOut,
  AlertTriangle, CheckCircle, XCircle, Eye, EyeOff,
  FileText, HelpCircle, MessageSquare, Info,
  Building2, Users, Flag, X, Check, RefreshCw,
  Activity,
} from "lucide-react";

const GRAD   = "linear-gradient(135deg,#9772F6 0%,#7549F6 100%)";
const GRAD_H = "linear-gradient(160deg,#9772F6 0%,#7549F6 100%)";
const QS     = "'Quicksand',sans-serif";
const IN     = "'Inter',sans-serif";

// ── Collapsible Section Card (matches other profile pages) ────────────────────

function SectionCard({ icon, iconBg = "#F5F0FF", iconColor = "#9772F6", title, children, defaultOpen = false }: {
  icon: React.ReactNode; iconBg?: string; iconColor?: string; title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="dt-admin-card" style={{ background: "white", borderRadius: 20, marginBottom: 14, boxShadow: "0 4px 20px rgba(0,0,0,.06)", overflow: "hidden" }}>
      <div className="dt-admin-row" onClick={() => setOpen(v => !v)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "16px 18px", cursor: "pointer", borderBottom: open ? "1px solid #F3F4F6" : "none" }}>
        <div style={{ width: 34, height: 34, borderRadius: 11, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {icon}
        </div>
        <span style={{ flex: 1, fontSize: 14, fontWeight: 800, color: "#1F2937", fontFamily: QS, textAlign: "left" as const }}>{title}</span>
        <div style={{ transition: "transform .2s ease", transform: open ? "rotate(180deg)" : "none" }}>
          <ChevronDown size={17} color="#9CA3AF" />
        </div>
      </div>
      {open && <div className="dt-admin-fade-in" style={{ padding: "14px 18px 18px" }}>{children}</div>}
    </div>
  );
}

// ── Row item inside a section ────────────────────────────────────────────────

function InfoRow({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div style={{ padding: "9px 0", borderBottom: "1px solid #F9FAFB", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
      <p style={{ margin: 0, fontSize: 12, color: "#9CA3AF", fontFamily: IN, flexShrink: 0 }}>{label}</p>
      <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: danger ? "#EF4444" : "#1F2937", fontFamily: QS, textAlign: "right" as const }}>{value}</p>
    </div>
  );
}

function ActionRow({ Icon, color = "#9772F6", bg = "#F5F0FF", label, sub, right, onClick }: {
  Icon: any; color?: string; bg?: string; label: string; sub?: string; right?: React.ReactNode; onClick?: () => void;
}) {
  return (
    <div onClick={onClick} className={onClick ? "dt-admin-row" : undefined} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #F9FAFB", cursor: onClick ? "pointer" : "default", borderRadius: 10 }}>
      <div style={{ width: 32, height: 32, borderRadius: 10, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={14} color={color} />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#1F2937", fontFamily: QS }}>{label}</p>
        {sub && <p style={{ margin: "1px 0 0", fontSize: 10, color: "#9CA3AF", fontFamily: IN }}>{sub}</p>}
      </div>
      {right !== undefined ? right : (onClick && <ChevronRight size={14} color="#C4C9D4" />)}
    </div>
  );
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div onClick={e => { e.stopPropagation(); onToggle(); }} style={{ width: 44, height: 24, borderRadius: 12, background: on ? "#9772F6" : "#E5E7EB", cursor: "pointer", position: "relative" as const, flexShrink: 0, transition: "background .2s" }}>
      <div style={{ position: "absolute" as const, top: 2, left: on ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "white", boxShadow: "0 1px 4px rgba(0,0,0,.2)", transition: "left .2s" }} />
    </div>
  );
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────

function ConfirmDialog({ title, msg, confirmLabel = "Confirm", onConfirm, onCancel }: {
  title: string; msg: string; confirmLabel?: string; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div style={{ position: "fixed" as const, inset: 0, background: "rgba(0,0,0,.6)", zIndex: 900, display: "flex", alignItems: "center", justifyContent: "center", padding: 28 }} onClick={onCancel}>
      <div style={{ background: "white", borderRadius: 26, padding: "26px 22px 20px", width: "100%", maxWidth: 320, boxShadow: "0 24px 60px rgba(0,0,0,.3)" }} onClick={e => e.stopPropagation()}>
        <div style={{ width: 52, height: 52, borderRadius: 18, background: "#FEE2E2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
          <AlertTriangle size={24} color="#EF4444" />
        </div>
        <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 800, color: "#1F2937", fontFamily: QS, textAlign: "center" as const }}>{title}</h3>
        <p style={{ margin: "0 0 22px", fontSize: 12, color: "#6B7280", fontFamily: IN, lineHeight: 1.65, textAlign: "center" as const }}>{msg}</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button className="dt-admin-btn" onClick={onCancel} style={{ height: 48, borderRadius: 18, border: "2px solid #E5E7EB", background: "white", cursor: "pointer", fontSize: 13, fontWeight: 800, color: "#374151", fontFamily: QS }}>Cancel</button>
          <button className="dt-admin-btn" onClick={onConfirm} style={{ height: 48, borderRadius: 18, border: "none", background: "#EF4444", cursor: "pointer", fontSize: 13, fontWeight: 800, color: "white", fontFamily: QS }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ── Change Password Sheet ─────────────────────────────────────────────────────

function ChangePasswordSheet({ onClose }: { onClose: () => void }) {
  const isWide = useDeviceType() !== "mobile";
  const [current, setCurrent] = useState(""); const [showCur, setShowCur]  = useState(false);
  const [next,    setNext]    = useState(""); const [showNext, setShowNext] = useState(false);
  const [confirm, setConfirm] = useState(""); const [showCon, setShowCon]  = useState(false);
  const [err, setErr] = useState(""); const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!current)          { setErr("Enter your current password."); return; }
    if (next.length < 6)   { setErr("New password must be at least 6 characters."); return; }
    if (next !== confirm)  { setErr("Passwords do not match."); return; }
    setErr(""); setSaving(true);
    const res = await changeMyPassword(current, next);
    setSaving(false);
    if (res.ok === false) { setErr(res.error); return; }
    setDone(true);
  };

  return (
    <div style={{ position: "fixed" as const, inset: 0, background: "rgba(0,0,0,.55)", zIndex: 800, display: "flex", flexDirection: "column" as const, justifyContent: "flex-end" }} onClick={onClose}>
      <div style={{ background: "white", borderRadius: "26px 26px 0 0", padding: "10px 20px 40px", maxWidth: isWide ? 480 : undefined, width: isWide ? "100%" : undefined, margin: isWide ? "0 auto" : undefined }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}><div style={{ width: 40, height: 4, borderRadius: 2, background: "#E5E7EB" }} /></div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#1F2937", fontFamily: QS }}>Change Password</p>
          <div onClick={onClose} className="dt-admin-btn" style={{ width: 32, height: 32, borderRadius: 10, background: "#F3F4F6", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={14} color="#6B7280" /></div>
        </div>
        {done ? (
          <div className="dt-admin-fade-in" style={{ textAlign: "center" as const, padding: "16px 0 10px" }}>
            <div style={{ width: 56, height: 56, borderRadius: 18, backgroundImage: GRAD, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}><Check size={26} color="white" /></div>
            <p style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 800, color: "#1F2937", fontFamily: QS }}>Password Updated</p>
            <p style={{ margin: "0 0 20px", fontSize: 12, color: "#9CA3AF", fontFamily: IN }}>Your password has been changed successfully.</p>
            <button className="dt-admin-btn" onClick={onClose} style={{ height: 46, width: "100%", borderRadius: 20, backgroundImage: GRAD, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 800, color: "white", fontFamily: QS }}>Done</button>
          </div>
        ) : (
          <>
            {[
              { label: "Current Password", val: current, set: setCurrent, show: showCur,  toggle: () => setShowCur(v => !v) },
              { label: "New Password",     val: next,    set: setNext,    show: showNext, toggle: () => setShowNext(v => !v) },
              { label: "Confirm Password", val: confirm, set: setConfirm, show: showCon,  toggle: () => setShowCon(v => !v) },
            ].map(({ label, val, set, show, toggle }) => (
              <div key={label} style={{ marginBottom: 12 }}>
                <p style={{ margin: "0 0 5px", fontSize: 11, fontWeight: 700, color: "#374151", fontFamily: QS }}>{label}</p>
                <div style={{ background: "#F3F4F6", borderRadius: 12, padding: "11px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                  <input type={show ? "text" : "password"} value={val} onChange={e => { set(e.target.value); setErr(""); }} placeholder="••••••••" style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 14, fontFamily: IN, color: "#1F2937" }} />
                  <div onClick={toggle} style={{ cursor: "pointer" }}>{show ? <EyeOff size={15} color="#9CA3AF" /> : <Eye size={15} color="#9CA3AF" />}</div>
                </div>
              </div>
            ))}
            {err && <p style={{ margin: "0 0 10px", fontSize: 11, color: "#EF4444", fontFamily: IN }}>{err}</p>}
            <button className="dt-admin-btn" onClick={handleSave} disabled={saving} style={{ width: "100%", height: 48, borderRadius: 20, backgroundImage: GRAD, border: "none", cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1, fontSize: 13, fontWeight: 800, color: "white", fontFamily: QS, marginTop: 4, boxShadow: "0 4px 16px rgba(151,114,246,.3)" }}>{saving ? "Saving…" : "Save Password"}</button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Login History Sheet ───────────────────────────────────────────────────────
// Real, persisted rows (login_history, 0060) — each one a sign-in this admin
// account actually made, with the real device (parsed from the browser's own
// real user agent at that moment) and the real timestamp. Only successful
// sign-ins are ever recorded (see the migration for why), so there's no
// "Failed" state to show here, unlike the mock this replaced.

function fmtLoginTime(iso: string): string {
  return new Date(iso).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function fmtDateOnly(iso: string): string {
  return new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

function LoginHistorySheet({ onClose }: { onClose: () => void }) {
  const isWide = useDeviceType() !== "mobile";
  const [history, setHistory] = useState<LoginHistoryEntry[] | null>(null);
  useEffect(() => { getMyLoginHistory().then(setHistory); }, []);

  return (
    <div style={{ position: "fixed" as const, inset: 0, background: "rgba(0,0,0,.55)", zIndex: 800, display: "flex", flexDirection: "column" as const, justifyContent: "flex-end" }} onClick={onClose}>
      <div style={{ background: "#F7F8FC", borderRadius: "26px 26px 0 0", maxHeight: "78%", display: "flex", flexDirection: "column" as const, maxWidth: isWide ? 480 : undefined, width: isWide ? "100%" : undefined, margin: isWide ? "0 auto" : undefined }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 2px" }}><div style={{ width: 40, height: 4, borderRadius: 2, background: "#E5E7EB" }} /></div>
        <div style={{ background: "white", borderRadius: "26px 26px 0 0", padding: "14px 20px 12px", borderBottom: "1px solid #F3F4F6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#1F2937", fontFamily: QS }}>Login History</p>
          <div onClick={onClose} className="dt-admin-btn" style={{ width: 32, height: 32, borderRadius: 10, background: "#F3F4F6", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={14} color="#6B7280" /></div>
        </div>
        <div style={{ flex: 1, overflowY: "auto" as const, scrollbarWidth: "none" as const, padding: "12px 16px 36px" }}>
          {history === null ? (
            <p style={{ textAlign: "center" as const, fontSize: 12, color: "#9CA3AF", fontFamily: IN, padding: "20px 0" }}>Loading…</p>
          ) : history.length === 0 ? (
            <p style={{ textAlign: "center" as const, fontSize: 12, color: "#9CA3AF", fontFamily: IN, padding: "20px 0" }}>No recorded logins yet.</p>
          ) : history.map((h, i) => (
            <div key={h.id} className="dt-admin-card dt-admin-fade-in" style={{ background: "white", borderRadius: 16, marginBottom: 10, padding: "13px 15px", boxShadow: "0 4px 20px rgba(0,0,0,.06)", borderLeft: "3px solid #22C55E", animationDelay: `${i * 30}ms` }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#1F2937", fontFamily: QS }}>{h.device}</p>
                <div style={{ textAlign: "right" as const }}>
                  <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 20, background: "#DCFCE7", color: "#16A34A", fontFamily: QS }}>Success</span>
                  <p style={{ margin: "4px 0 0", fontSize: 9, color: "#9CA3AF", fontFamily: IN }}>{fmtLoginTime(h.occurredAt)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Activity data (real, persisted — admin_activity_log, 0061) ──────────────
// Icon/color treatment per action type (adminStore.ts's logAdminActivity
// calls) — the real log itself only carries a plain action string + a
// specific description + a real timestamp.
const ACTIVITY_META: Record<string, { Icon: React.ElementType; color: string; bg: string }> = {
  approve_user:        { Icon: CheckCircle, color: "#16A34A", bg: "#DCFCE7" },
  reactivate_user:     { Icon: CheckCircle, color: "#16A34A", bg: "#DCFCE7" },
  suspend_user:        { Icon: XCircle,     color: "#EF4444", bg: "#FEE2E2" },
  delete_user:         { Icon: XCircle,     color: "#EF4444", bg: "#FEE2E2" },
  report_status:       { Icon: Flag,        color: "#9772F6", bg: "#F5F0FF" },
  resolve_report:      { Icon: Flag,        color: "#9772F6", bg: "#F5F0FF" },
  archive_report:      { Icon: Flag,        color: "#6B7280", bg: "#F3F4F6" },
  create_announcement: { Icon: Bell,        color: "#3B82F6", bg: "#EFF6FF" },
  update_announcement: { Icon: Bell,        color: "#3B82F6", bg: "#EFF6FF" },
  approve_bh:          { Icon: Building2,   color: "#16A34A", bg: "#DCFCE7" },
  reject_bh:           { Icon: Building2,   color: "#EF4444", bg: "#FEE2E2" },
  request_bh_revision: { Icon: Building2,   color: "#D97706", bg: "#FEF3C7" },
  role_permission:     { Icon: Shield,      color: "#6366F1", bg: "#EEF2FF" },
  export_reports:      { Icon: FileText,    color: "#0891B2", bg: "#ECFEFF" },
};

function fmtActivityTime(iso: string): string {
  return new Date(iso).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export function AdminProfileScreen({ go }: { go: (s: string) => void }) {
  // Desktop-only spacing/width adjustments (AdminShellFrame in App.tsx already
  // provides the sidebar/header chrome at this width) — same data, same
  // sections, just no mobile-status-bar clearance and a bounded content width.
  const deviceType = useDeviceType();
  const isWide = deviceType !== "mobile";
  const isDesktop = deviceType === "desktop";
  const [name,    setName]    = useState("Housing Director");
  const [email,   setEmail]   = useState("admin@dormitrack.edu.ph");
  const [contact, setContact] = useState("+63 912 000 0001");
  const [photo,   setPhoto]   = useState<string | null>(null);
  // Real users.status and created_at — replace the hardcoded "Active" /
  // "Jun 1, 2024" that used to sit here regardless of the real account.
  const [accountStatus,  setAccountStatus]  = useState<string>("active");
  const [accountCreated, setAccountCreated] = useState<string>("");

  // Real identity, read-only-in-practice here — this section has no save
  // trigger in the original design (typed edits never persisted anywhere,
  // even locally-only), so this only fixes what's shown on load.
  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (!uid) return;
      const { data } = await supabase.from("users").select("first_name, last_name, email, contact_number, photo_url, status, created_at").eq("id", uid).single();
      if (!active || !data) return;
      setName([data.first_name, data.last_name].filter(Boolean).join(" ") || "Housing Director");
      setEmail(data.email);
      if (data.contact_number) setContact(data.contact_number);
      if (data.photo_url) setPhoto(data.photo_url);
      setAccountStatus(data.status);
      setAccountCreated(data.created_at);
    })();
    return () => { active = false; };
  }, []);

  // Real last sign-in, from the same login_history table LoginHistorySheet
  // reads (0060) — replaces a hardcoded "Today, 8:02 AM". The most recent row
  // is this very sign-in, same as every other profile screen in this app
  // that shows "Last Login" this way.
  const [lastLogin, setLastLogin] = useState<string>("—");
  useEffect(() => { getMyLoginHistory().then(rows => { if (rows[0]) setLastLogin(fmtLoginTime(rows[0].occurredAt)); }); }, []);

  // Real counts — replaces hardcoded "11"/"8"/"2 properties" etc. (see
  // adminStore.ts's getMyAdminProfileStats for what each one honestly means).
  const [profileStats, setProfileStats] = useState<AdminProfileStats>({ totalManagedUsers: 0, totalBoardingHouses: 0, reportsHandled: 0 });
  useEffect(() => { getMyAdminProfileStats().then(setProfileStats); }, []);

  // Real, persisted admin_notification_prefs (0063) — same 4 preferences
  // AdminSystem.tsx's "Notification Settings" manages, so both screens
  // reflect the one real backing table instead of two separate, inconsistent
  // local-only toggle sets. "Pending Verifications"/"System Alerts"/Push/
  // Email were dropped: no real pending-approval gate, system-health concept,
  // or push/email delivery exists anywhere in this app to back them.
  const [notifPrefs, setNotifPrefs] = useState<AdminNotificationPrefs>({ newUserAlerts: true, bhRequestAlerts: true, reportAlerts: true, paymentAlerts: true });
  useEffect(() => { getMyNotificationPrefs().then(setNotifPrefs); }, []);
  const [theme,  setTheme]  = useState<"light"|"dark"|"system">("light");

  const [showPwd,     setShowPwd]     = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showLogout,  setShowLogout]  = useState(false);
  const [showLogoutOthers, setShowLogoutOthers] = useState(false);
  // Real Privacy Policy / Terms & Conditions text (same content shown from
  // the login screen's footer) — these two rows had no onClick at all.
  const [legalDoc, setLegalDoc] = useState<"privacy" | "terms" | null>(null);
  // Same real support contact info already shown to landlords (AppInfo.tsx's
  // "Help & Support" modal) — "Help Center" had no onClick at all.
  const [showHelp, setShowHelp] = useState(false);

  // Real activity log (admin_activity_log, 0061) — replaces a hardcoded mock array.
  const [activity, setActivity] = useState<AdminActivityEntry[] | null>(null);
  useEffect(() => { getMyAdminActivity().then(setActivity); }, []);

  const [toast, setToast] = useState("");
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 2800); };

  const toggleNotifPref = (key: keyof AdminNotificationPrefs) => {
    const next = !notifPrefs[key];
    setNotifPrefs(p => ({ ...p, [key]: next }));
    setNotificationPref(key, next).then(res => { if (res.ok === false) showToast(`Could not save: ${res.error}`); });
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" as const, background: "#F7F8FC", position: "relative" as const }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: "absolute" as const, top: 60, left: "50%", transform: "translateX(-50%)", background: "#1F2937", color: "white", borderRadius: 20, padding: "10px 20px", fontSize: 12, fontFamily: QS, fontWeight: 700, zIndex: 999, whiteSpace: "nowrap" as const, boxShadow: "0 4px 20px rgba(0,0,0,.25)" }}>
          {toast}
        </div>
      )}

      {/* Sheets & dialogs */}
      {showPwd     && <ChangePasswordSheet onClose={() => setShowPwd(false)} />}
      {showHistory && <LoginHistorySheet   onClose={() => setShowHistory(false)} />}
      {showLogout  && (
        <ConfirmDialog
          title="Log Out?"
          msg="Are you sure you want to log out of the Admin account?"
          confirmLabel="Log Out"
          onConfirm={() => { supabase.auth.signOut(); go("landing"); }}
          onCancel={() => setShowLogout(false)}
        />
      )}
      {/* Real sign-out of every other active session for this account, via
          Supabase Auth's own client-callable scoped sign-out — this session
          stays logged in. */}
      {showLogoutOthers && (
        <ConfirmDialog
          title="Logout from Other Devices?"
          msg="This will end every other active session for your account. This device stays logged in."
          confirmLabel="Log Out Others"
          onConfirm={async () => {
            setShowLogoutOthers(false);
            const { error } = await supabase.auth.signOut({ scope: "others" });
            showToast(error ? "Could not sign out other sessions." : "Other sessions have been signed out.");
          }}
          onCancel={() => setShowLogoutOthers(false)}
        />
      )}

      {/* Privacy Policy / Terms & Conditions — real, full text (same as the login screen's) */}
      {legalDoc && (
        <div style={{ position: "fixed" as const, inset: 0, background: "rgba(0,0,0,.55)", zIndex: 300, display: "flex", flexDirection: "column" as const, justifyContent: "flex-end" }} onClick={() => setLegalDoc(null)}>
          <div style={{ background: "white", borderRadius: "24px 24px 0 0", maxHeight: "85%", display: "flex", flexDirection: "column" as const, maxWidth: isWide ? 480 : undefined, width: isWide ? "100%" : undefined, margin: isWide ? "0 auto" : undefined }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid #F3F4F6", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#1F2937", fontFamily: QS }}>{legalDoc === "privacy" ? "Privacy Policy" : "Terms & Conditions"}</p>
              <button className="dt-admin-btn" onClick={() => setLegalDoc(null)} style={{ width: 32, height: 32, borderRadius: 10, background: "#F3F4F6", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={15} color="#6B7280" />
              </button>
            </div>
            <div style={{ overflowY: "auto" as const, scrollbarWidth: "none" as const, padding: "16px 20px 32px" }}>
              {legalDoc === "privacy" ? <PrivacyPolicyContent /> : <TermsConditionsContent />}
            </div>
          </div>
        </div>
      )}

      {/* Help Center — same real support contact info shown elsewhere in the app (AppInfo.tsx) */}
      {showHelp && (
        <div style={{ position: "fixed" as const, inset: 0, background: "rgba(0,0,0,.55)", zIndex: 300, display: "flex", flexDirection: "column" as const, justifyContent: "flex-end" }} onClick={() => setShowHelp(false)}>
          <div style={{ background: "white", borderRadius: "24px 24px 0 0", maxHeight: "85%", display: "flex", flexDirection: "column" as const, maxWidth: isWide ? 480 : undefined, width: isWide ? "100%" : undefined, margin: isWide ? "0 auto" : undefined }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid #F3F4F6", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#1F2937", fontFamily: QS }}>Help Center</p>
              <button className="dt-admin-btn" onClick={() => setShowHelp(false)} style={{ width: 32, height: 32, borderRadius: 10, background: "#F3F4F6", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={15} color="#6B7280" />
              </button>
            </div>
            <div style={{ overflowY: "auto" as const, scrollbarWidth: "none" as const, padding: "16px 20px 32px" }}>
              <p style={{ fontSize: 13, color: "#6B7280", fontFamily: IN, lineHeight: 1.7, margin: "0 0 16px" }}>
                For assistance with the DormiTrack admin system, please contact our support team through any of the following channels.
              </p>
              {[
                { label: "Email Support", val: "support@dormitrack.edu.ph" },
                { label: "Hotline",       val: "+63 912 345 6789" },
                { label: "Office Hours",  val: "Mon–Fri, 8:00 AM – 5:00 PM" },
                { label: "Campus Office", val: "BISU Calape Campus, Student Affairs" },
              ].map(({ label, val }) => (
                <div key={label} style={{ padding: "10px 0", borderBottom: "1px solid #F9FAFB" }}>
                  <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: "#9CA3AF", fontFamily: QS, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>{label}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 700, color: "#1F2937", fontFamily: IN }}>{val}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Header — flat on desktop (sidebar carries the purple identity
          there); unchanged purple hero on mobile/tablet ─────────────────── */}
      <div style={{ flexShrink: 0, padding: isWide ? "26px 20px 24px" : "52px 20px 24px", backgroundImage: isDesktop ? undefined : GRAD_H, background: isDesktop ? "white" : undefined, borderBottom: isDesktop ? "1px solid #EFEFF5" : undefined, textAlign: "center" as const }}>

        {/* Back + title row */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
          <div onClick={() => go("dashboard")} className="dt-admin-btn" style={{ display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, padding: 4, borderRadius: 8 }}>
            <ChevronLeft size={18} color={isDesktop ? "#374151" : "white"} />
          </div>
          <h1 style={{ flex: 1, color: isDesktop ? "#1F2937" : "white", fontSize: 20, fontWeight: 800, margin: 0, fontFamily: QS, textAlign: "center" as const }}>My Profile</h1>
          <div style={{ width: 36 }} />
        </div>

        {/* Avatar — on desktop the ring/backdrop ProfileAvatar renders assumes a
            colored background (shared by every role's profile screen), so it gets
            its own small purple backdrop plate here rather than changing that
            shared component just for admin's now-white desktop header. */}
        {(() => {
          const avatar = (
            <ProfileAvatar
              photo={photo}
              fallback={<User size={46} color="white" />}
              onSelectFile={async f => {
                setPhoto(URL.createObjectURL(f)); // instant preview while the real upload runs
                const res = await uploadProfilePhoto(f);
                if (res.ok === false) showToast(res.error || "Couldn't upload photo. Please try again.");
                else setPhoto(res.url);
              }}
              onRemove={async () => {
                setPhoto(null);
                const res = await removeProfilePhoto();
                if (res.ok === false) showToast(res.error || "Couldn't remove photo.");
              }}
            />
          );
          return isDesktop ? <div style={{ display: "inline-block", backgroundImage: GRAD_H, borderRadius: "50%", padding: 8 }}>{avatar}</div> : avatar;
        })()}

        <h2 style={{ color: isDesktop ? "#1F2937" : "white", fontSize: 20, fontWeight: 800, margin: "14px 0 6px", fontFamily: QS }}>{name}</h2>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const, justifyContent: "center" }}>
          <span style={{ background: isDesktop ? "#F5F0FF" : "rgba(255,255,255,.18)", borderRadius: 20, padding: "3px 12px", fontSize: 11, color: isDesktop ? "#7549F6" : "white", fontFamily: QS, fontWeight: 700 }}>@admin</span>
          <span style={{ background: isDesktop ? "#F5F0FF" : "rgba(255,255,255,.18)", borderRadius: 20, padding: "3px 12px", fontSize: 11, color: isDesktop ? "#7549F6" : "white", fontFamily: QS, fontWeight: 700 }}>System Administrator</span>
        </div>
        <p style={{ color: isDesktop ? "#9CA3AF" : "rgba(255,255,255,.7)", fontSize: 12, margin: "8px 0 0", fontFamily: QS }}>BISU Calape Campus</p>
      </div>

      {/* ── Stats quick card — negative-margin pull-up onto the purple hero on
          mobile/tablet; sits with normal spacing under the flat white header
          on desktop (overlapping its border line would look like a glitch) */}
      <div style={{ padding: isDesktop ? "20px 32px 0" : "0 16px", marginTop: isDesktop ? 0 : -20, maxWidth: isDesktop ? 700 : undefined, margin: isDesktop ? "0 auto" : undefined }}>
        <div className="dt-admin-fade-in" style={{ background: "white", borderRadius: 22, padding: "14px 16px", boxShadow: isDesktop ? "0 4px 20px rgba(0,0,0,.06)" : "0 8px 32px rgba(117,73,246,.14)", display: "grid", gridTemplateColumns: "repeat(3,1fr)", marginBottom: 16 }}>
          {[
            { label: "Users",    val: profileStats.totalManagedUsers,  color: "#9772F6" },
            { label: "Reports",  val: profileStats.reportsHandled,     color: "#EF4444" },
            { label: "BH Props", val: profileStats.totalBoardingHouses,color: "#3B82F6" },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ textAlign: "center" as const, padding: "4px 0" }}>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color, fontFamily: QS }}><CountUp value={val}/></p>
              <p style={{ margin: "2px 0 0", fontSize: 10, color: "#9CA3AF", fontFamily: IN }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Scrollable sections ───────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto" as const, scrollbarWidth: "none" as const, padding: isWide ? "20px 32px 40px" : "0 16px 32px" }}>
      <div style={{ maxWidth: isWide ? 700 : undefined, margin: isWide ? "0 auto" : undefined }}>

        {/* Personal Information */}
        <SectionCard icon={<User size={16} color="#9772F6" />} title="Personal Information">
          {[
            { label: "Full Name",    val: name,    editable: true,  setFn: setName    },
            { label: "Email",        val: email,   editable: true,  setFn: setEmail   },
            { label: "Contact",      val: contact, editable: true,  setFn: setContact },
            { label: "Last Login",   val: lastLogin, editable: false, setFn: null },
            { label: "Account Status", val: accountStatus.charAt(0).toUpperCase() + accountStatus.slice(1), editable: false, setFn: null },
          ].map(({ label, val, editable, setFn }) => (
            <div key={label} style={{ padding: "9px 0", borderBottom: "1px solid #F9FAFB" }}>
              <p style={{ margin: "0 0 2px", fontSize: 10, fontWeight: 700, color: "#9CA3AF", fontFamily: QS, textTransform: "uppercase" as const, letterSpacing: 0.4 }}>{label}{!editable && <span style={{ marginLeft: 4, fontSize: 9, color: "#C4C9D4" }}>(read-only)</span>}</p>
              {editable && setFn ? (
                <input
                  value={val}
                  onChange={e => setFn(e.target.value)}
                  style={{ width: "100%", background: "none", border: "none", outline: "none", fontSize: 13, fontWeight: 700, color: "#1F2937", fontFamily: QS, padding: 0, boxSizing: "border-box" as const }}
                />
              ) : (
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: label === "Account Status" ? (accountStatus === "active" ? "#16A34A" : accountStatus === "suspended" ? "#EF4444" : "#D97706") : "#1F2937", fontFamily: QS }}>{val}</p>
              )}
            </div>
          ))}
        </SectionCard>

        {/* Security */}
        <SectionCard icon={<Shield size={16} color="#6366F1" />} iconBg="#EEF2FF" iconColor="#6366F1" title="Security Settings">
          {/* Two-Factor Authentication and per-device session management (Registered
              Devices / Active Sessions) were dropped from here: real TOTP enrollment
              and real session/device enumeration both require Supabase Admin APIs
              (service-role key), which never belongs in client code — see the
              standing .env.local constraint. Rather than fake a toggle or a device
              list, only the two rows below that are genuinely backed are kept. */}
          <ActionRow Icon={Lock}       color="#9772F6" bg="#F5F0FF" label="Change Password"             sub="Update your account password"        onClick={() => setShowPwd(true)} />
          <ActionRow Icon={Clock}      color="#D97706" bg="#FEF3C7" label="Login History"               sub="View recent sign-ins"                onClick={() => setShowHistory(true)} />
          <ActionRow Icon={RefreshCw}  color="#EF4444" bg="#FEE2E2" label="Logout from Other Devices"   sub="End all other sessions"              onClick={() => setShowLogoutOthers(true)} />
        </SectionCard>

        {/* Notifications — real, persisted (admin_notification_prefs, 0063),
            shared with AdminSystem.tsx's "Notification Settings" */}
        <SectionCard icon={<Bell size={16} color="#3B82F6" />} iconBg="#EFF6FF" iconColor="#3B82F6" title="Notification Preferences">
          {([
            { key: "newUserAlerts",   label: "New User Registrations",  Icon: Users,     color: "#9772F6", bg: "#F5F0FF" },
            { key: "bhRequestAlerts", label: "Boarding House Requests", Icon: Building2, color: "#3B82F6", bg: "#EFF6FF" },
            { key: "reportAlerts",    label: "New Reports Submitted",   Icon: Flag,      color: "#EF4444", bg: "#FEE2E2" },
            { key: "paymentAlerts",   label: "Payment Updates",         Icon: FileText,  color: "#16A34A", bg: "#DCFCE7" },
          ] as { key: keyof AdminNotificationPrefs; label: string; Icon: any; color: string; bg: string }[]).map(({ key, label, Icon, color, bg }) => (
            <ActionRow key={key} Icon={Icon} color={color} bg={bg} label={label} right={<Toggle on={notifPrefs[key]} onToggle={() => toggleNotifPref(key)} />} />
          ))}
        </SectionCard>

        {/* System Preferences */}
        <SectionCard icon={<Monitor size={16} color="#0891B2" />} iconBg="#ECFEFF" iconColor="#0891B2" title="System Preferences">
          <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: "#374151", fontFamily: QS }}>Theme</p>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {([["light", Sun, "Light"], ["dark", Moon, "Dark"], ["system", Monitor, "System"]] as const).map(([id, Ic, lbl]) => (
              <div key={id} onClick={() => setTheme(id)} className="dt-admin-btn" style={{ flex: 1, height: 52, borderRadius: 14, border: `2px solid ${theme === id ? "#9772F6" : "#E5E7EB"}`, background: theme === id ? "#F5F0FF" : "white", cursor: "pointer", display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", gap: 4 }}>
                <Ic size={14} color={theme === id ? "#9772F6" : "#9CA3AF"} />
                <span style={{ fontSize: 9, fontWeight: 800, color: theme === id ? "#9772F6" : "#9CA3AF", fontFamily: QS }}>{lbl}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Activity History */}
        <SectionCard icon={<Activity size={16} color="#EC4899" />} iconBg="#FDF2F8" iconColor="#EC4899" title="Activity History">
          {activity === null ? (
            <p style={{ textAlign: "center" as const, fontSize: 12, color: "#9CA3AF", fontFamily: IN, padding: "12px 0" }}>Loading…</p>
          ) : activity.length === 0 ? (
            <p style={{ textAlign: "center" as const, fontSize: 12, color: "#9CA3AF", fontFamily: IN, padding: "12px 0" }}>No actions recorded yet — this fills in as you use the admin system.</p>
          ) : activity.map((a, i) => {
            const meta = ACTIVITY_META[a.action] ?? { Icon: Activity, color: "#6B7280", bg: "#F3F4F6" };
            return (
              <div key={a.id} style={{ display: "flex", gap: 12, paddingBottom: i < activity.length - 1 ? 12 : 0, marginBottom: i < activity.length - 1 ? 12 : 0, borderBottom: i < activity.length - 1 ? "1px solid #F9FAFB" : "none" }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: meta.bg, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <meta.Icon size={14} color={meta.color} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: "0 0 3px", fontSize: 12, fontWeight: 700, color: "#1F2937", fontFamily: QS, lineHeight: 1.4 }}>{a.description}</p>
                  <span style={{ fontSize: 9, color: "#C4C9D4", fontFamily: IN }}>{fmtActivityTime(a.createdAt)}</span>
                </div>
              </div>
            );
          })}
        </SectionCard>

        {/* Account Information */}
        <SectionCard icon={<Info size={16} color="#374151" />} iconBg="#F3F4F6" iconColor="#374151" title="Account Information">
          <InfoRow label="Role"                  value="System Administrator" />
          <InfoRow label="Permission Level"      value="Full Access" />
          <InfoRow label="Total Managed Users"   value={`${profileStats.totalManagedUsers} account${profileStats.totalManagedUsers === 1 ? "" : "s"}`} />
          <InfoRow label="Boarding Houses"       value={`${profileStats.totalBoardingHouses} propert${profileStats.totalBoardingHouses === 1 ? "y" : "ies"}`} />
          <InfoRow label="Reports Handled"       value={`${profileStats.reportsHandled} report${profileStats.reportsHandled === 1 ? "" : "s"}`} />
          <InfoRow label="Account Created"       value={accountCreated ? fmtDateOnly(accountCreated) : "—"} />
        </SectionCard>

        {/* Support & About */}
        <SectionCard icon={<HelpCircle size={16} color="#3B82F6" />} iconBg="#EFF6FF" iconColor="#3B82F6" title="Support & About">
          <ActionRow Icon={HelpCircle}    color="#3B82F6" bg="#EFF6FF" label="Help Center"        sub="FAQs and guides"          onClick={() => setShowHelp(true)} />
          <ActionRow Icon={MessageSquare} color="#6366F1" bg="#EEF2FF" label="Contact Developer"  sub="Report bugs or feedback"  onClick={() => { window.location.href = "mailto:support@dormitrack.edu.ph?subject=DormiTrack%20Admin%20Feedback"; }} />
          <ActionRow Icon={FileText}      color="#D97706" bg="#FEF3C7" label="Privacy Policy"     onClick={() => setLegalDoc("privacy")} />
          <ActionRow Icon={FileText}      color="#9CA3AF" bg="#F3F4F6" label="Terms & Conditions" onClick={() => setLegalDoc("terms")} />
          <ActionRow Icon={Info}          color="#16A34A" bg="#DCFCE7" label="App Version"        sub="DormiTrack v1.0.0 (Build 42)" right={<span />} />
        </SectionCard>

        {/* Logout */}
        <div onClick={() => setShowLogout(true)} className="dt-admin-card" style={{ background: "white", borderRadius: 20, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, border: "1px solid #FEE2E2", cursor: "pointer", boxShadow: "0 4px 20px rgba(0,0,0,.06)", marginBottom: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: 11, background: "#FEE2E2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <LogOut size={16} color="#DC2626" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#DC2626", fontFamily: QS }}>Log Out</p>
            <p style={{ margin: "1px 0 0", fontSize: 11, color: "#FCA5A5", fontFamily: IN }}>Sign out of Admin account</p>
          </div>
          <ChevronRight size={14} color="#FCA5A5" />
        </div>

      </div>
      </div>
    </div>
  );
}
