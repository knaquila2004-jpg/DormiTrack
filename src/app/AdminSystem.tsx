import React, { useState, useMemo, useEffect } from "react";
import { supabase } from "../lib/supabase";
import {
  Settings, ChevronDown, ChevronRight, X, Check,
  AlertTriangle, LogOut, Trash2, Plus, Clock,
  Eye, Globe, Bell, FileText, Info, Archive, Edit3,
  Building2, Shield, Users, Search, Filter,
  Megaphone, Pin, Calendar,
  CheckCircle, Save,
  User, Flag, Mail, MonitorOff,
} from "lucide-react";
import {
  getAllAnnouncementsForAdmin, createAnnouncement, updateAnnouncement, setAnnouncementStatus, deleteAnnouncement,
  getRolePermissions, setRolePermission,
  getPendingBoardingHouses, approveBoardingHouse, rejectBoardingHouse, requestBoardingHouseRevision,
  Announcement, AnnouncementPriority, RolePermissions, PermRole, PermKey, BHRequest,
} from "./adminSystemStore";
import {
  logAdminActivity, getMyAdminActivity, AdminActivityEntry,
  getMyNotificationPrefs, setNotificationPref, AdminNotificationPrefs,
} from "./adminStore";
import { useDeviceType } from "./components/useDeviceType";
import { CountUp } from "./components/CountUp";
import { PrivacyPolicyContent, TermsConditionsContent } from "./LegalContent";

const GRAD   = "linear-gradient(135deg,#9772F6 0%,#7549F6 100%)";
const GRAD_H = "linear-gradient(160deg,#9772F6 0%,#7549F6 100%)";
const QS     = "'Quicksand',sans-serif";
const IN     = "'Inter',sans-serif";

// ── Shared primitives ─────────────────────────────────────────────────────────

function SectionCard({ title, icon, iconBg = "#F5F0FF", children, defaultOpen = false, badge }: {
  title: string; icon: React.ReactNode; iconBg?: string; children: React.ReactNode; defaultOpen?: boolean; badge?: number | string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="dt-admin-card" style={{ background: "white", borderRadius: 20, marginBottom: 14, boxShadow: "0 4px 20px rgba(0,0,0,.06)", overflow: "hidden" }}>
      <div onClick={() => setOpen(o => !o)} className="dt-admin-row" style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "16px 18px", cursor: "pointer", borderBottom: open ? "1px solid #F3F4F6" : "none" }}>
        <div style={{ width: 34, height: 34, borderRadius: 11, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {icon}
        </div>
        <span style={{ flex: 1, fontSize: 14, fontWeight: 800, color: "#1F2937", fontFamily: QS }}>{title}</span>
        {badge !== undefined && <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 20, background: "#FEF3C7", color: "#D97706", fontFamily: QS, marginRight: 4 }}>{badge}</span>}
        <div style={{ transition: "transform .2s ease", transform: open ? "rotate(180deg)" : "none" }}>
          <ChevronDown size={17} color="#9CA3AF" />
        </div>
      </div>
      {open && <div className="dt-admin-fade-in" style={{ padding: "14px 18px 18px" }}>{children}</div>}
    </div>
  );
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div onClick={e => { e.stopPropagation(); onToggle(); }} style={{ width: 46, height: 26, borderRadius: 13, backgroundImage: on ? GRAD : "none", background: on ? "none" : "#D1D5DB", position: "relative" as const, cursor: "pointer", flexShrink: 0, transition: "background .2s" }}>
      <div style={{ position: "absolute" as const, top: 3, left: on ? 23 : 3, width: 20, height: 20, borderRadius: "50%", background: "white", boxShadow: "0 1px 4px rgba(0,0,0,.2)", transition: "left .18s" }} />
    </div>
  );
}

function Row({ label, sub, right, onClick, danger }: {
  label: string; sub?: string; right?: React.ReactNode; onClick?: () => void; danger?: boolean;
}) {
  return (
    <div onClick={onClick} className={onClick ? "dt-admin-row" : undefined} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: "1px solid #F9FAFB", cursor: onClick ? "pointer" : "default", borderRadius: 10 }}>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: danger ? "#EF4444" : "#1F2937", fontFamily: QS }}>{label}</p>
        {sub && <p style={{ margin: "2px 0 0", fontSize: 10, color: "#9CA3AF", fontFamily: IN }}>{sub}</p>}
      </div>
      {right !== undefined ? right : (onClick && <ChevronRight size={14} color="#C4C9D4" />)}
    </div>
  );
}

function ToggleRow({ label, sub, on, onToggle }: { label: string; sub?: string; on: boolean; onToggle: () => void }) {
  return <Row label={label} sub={sub} right={<Toggle on={on} onToggle={onToggle} />} />;
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <div onClick={onClick} className="dt-admin-btn" style={{ padding: "5px 13px", borderRadius: 20, cursor: "pointer", background: active ? "#1F2937" : "#F3F4F6", color: active ? "white" : "#6B7280", fontSize: 10, fontWeight: 800, fontFamily: QS, flexShrink: 0 }}>
      {label}
    </div>
  );
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────

function ConfirmDialog({ title, msg, confirmLabel = "Confirm", danger = true, onConfirm, onCancel }: {
  title: string; msg: string; confirmLabel?: string; danger?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div style={{ position: "fixed" as const, inset: 0, background: "rgba(0,0,0,.6)", zIndex: 900, display: "flex", alignItems: "center", justifyContent: "center", padding: 28 }} onClick={onCancel}>
      <div style={{ background: "white", borderRadius: 26, padding: "26px 22px 20px", width: "100%", maxWidth: 320, boxShadow: "0 24px 60px rgba(0,0,0,.3)" }} onClick={e => e.stopPropagation()}>
        <div style={{ width: 52, height: 52, borderRadius: 18, background: danger ? "#FEE2E2" : "#F5F0FF", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
          <AlertTriangle size={24} color={danger ? "#EF4444" : "#9772F6"} />
        </div>
        <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 800, color: "#1F2937", fontFamily: QS, textAlign: "center" as const }}>{title}</h3>
        <p style={{ margin: "0 0 22px", fontSize: 12, color: "#6B7280", fontFamily: IN, lineHeight: 1.65, textAlign: "center" as const }}>{msg}</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button className="dt-admin-btn" onClick={onCancel} style={{ height: 48, borderRadius: 18, border: "2px solid #E5E7EB", background: "white", cursor: "pointer", fontSize: 13, fontWeight: 800, color: "#374151", fontFamily: QS }}>Cancel</button>
          <button className="dt-admin-btn" onClick={onConfirm} style={{ height: 48, borderRadius: 18, border: "none", background: danger ? "#EF4444" : GRAD, cursor: "pointer", fontSize: 13, fontWeight: 800, color: "white", fontFamily: QS }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <div style={{ position: "fixed" as const, bottom: 100, left: "50%", transform: "translateX(-50%)", background: "#1F2937", color: "white", padding: "10px 20px", borderRadius: 20, fontSize: 12, fontFamily: QS, fontWeight: 700, zIndex: 999, whiteSpace: "nowrap" as const, boxShadow: "0 8px 24px rgba(0,0,0,.25)" }}>
      {msg}
    </div>
  );
}

// ── Announcement Modal ────────────────────────────────────────────────────────

const PRIORITY_META: Record<string, { label: string; color: string; bg: string }> = {
  low:    { label: "Low",    color: "#6B7280", bg: "#F3F4F6" },
  normal: { label: "Normal", color: "#3B82F6", bg: "#EFF6FF" },
  high:   { label: "High",   color: "#D97706", bg: "#FEF3C7" },
  urgent: { label: "Urgent", color: "#EF4444", bg: "#FEE2E2" },
};

function AnnouncementForm({ ann, onSaved, onClose }: {
  ann?: Announcement; onSaved: () => void; onClose: () => void;
}) {
  const isWide = useDeviceType() !== "mobile";
  const [title,     setTitle]     = useState(ann?.title     ?? "");
  const [desc,      setDesc]      = useState(ann?.desc      ?? "");
  const [audience,  setAudience]  = useState(ann?.audience  ?? "Everyone");
  const [priority,  setPriority]  = useState<AnnouncementPriority>(ann?.priority ?? "normal");
  const [scheduled, setScheduled] = useState(ann?.scheduledDate ?? "");
  const [expiry,    setExpiry]    = useState(ann?.expiryDate    ?? "");
  const [saving,    setSaving]    = useState(false);
  const [err,       setErr]       = useState("");

  const handleSave = async () => {
    if (!title.trim() || saving) return;
    setSaving(true); setErr("");
    const input = { title: title.trim(), desc, audience, priority, scheduledDate: scheduled, expiryDate: expiry };
    const res = ann ? await updateAnnouncement(ann.id, input) : await createAnnouncement(input);
    setSaving(false);
    if (res.ok === false) { setErr(res.error); return; }
    await logAdminActivity(ann ? "update_announcement" : "create_announcement", `${ann ? "Updated" : "Posted"} announcement: "${input.title}"`);
    onSaved();
    onClose();
  };

  return (
    <div style={{ position: "fixed" as const, inset: 0, background: "rgba(0,0,0,.55)", zIndex: 800, display: "flex", flexDirection: "column" as const, justifyContent: "flex-end" }} onClick={onClose}>
      <div style={{ background: "#F7F8FC", borderRadius: "26px 26px 0 0", maxHeight: "90%", display: "flex", flexDirection: "column" as const, maxWidth: isWide ? 480 : undefined, width: isWide ? "100%" : undefined, margin: isWide ? "0 auto" : undefined }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px" }}><div style={{ width: 40, height: 4, borderRadius: 2, background: "#E5E7EB" }} /></div>
        <div style={{ background: "white", borderRadius: "26px 26px 0 0", padding: "14px 20px 12px", borderBottom: "1px solid #F3F4F6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#1F2937", fontFamily: QS }}>{ann ? "Edit Announcement" : "New Announcement"}</p>
          <div onClick={onClose} className="dt-admin-btn" style={{ width: 32, height: 32, borderRadius: 10, background: "#F3F4F6", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={14} color="#6B7280" /></div>
        </div>
        <div style={{ flex: 1, overflowY: "auto" as const, scrollbarWidth: "none" as const, padding: "14px 20px 40px" }}>
          {[
            { label: "Title *", val: title, set: setTitle, placeholder: "Announcement title" },
          ].map(({ label, val, set, placeholder }) => (
            <div key={label} style={{ marginBottom: 12 }}>
              <p style={{ margin: "0 0 5px", fontSize: 11, fontWeight: 700, color: "#374151", fontFamily: QS }}>{label}</p>
              <div style={{ background: "white", borderRadius: 14, padding: "11px 14px", border: "1.5px solid #E5E7EB" }}>
                <input value={val} onChange={e => set(e.target.value)} placeholder={placeholder} style={{ width: "100%", background: "none", border: "none", outline: "none", fontSize: 13, fontFamily: IN, color: "#1F2937", boxSizing: "border-box" as const }} />
              </div>
            </div>
          ))}
          <div style={{ marginBottom: 12 }}>
            <p style={{ margin: "0 0 5px", fontSize: 11, fontWeight: 700, color: "#374151", fontFamily: QS }}>Description</p>
            <div style={{ background: "white", borderRadius: 14, padding: "11px 14px", border: "1.5px solid #E5E7EB" }}>
              <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Announcement body..." rows={3} style={{ width: "100%", background: "none", border: "none", outline: "none", fontSize: 13, fontFamily: IN, color: "#1F2937", resize: "none" as const, boxSizing: "border-box" as const }} />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <p style={{ margin: "0 0 7px", fontSize: 11, fontWeight: 700, color: "#374151", fontFamily: QS }}>Target Audience</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
              {["Everyone", "Students", "Parents", "Landlords", "Housing Director"].map(a => (
                <Chip key={a} label={a} active={audience === a} onClick={() => setAudience(a)} />
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <p style={{ margin: "0 0 7px", fontSize: 11, fontWeight: 700, color: "#374151", fontFamily: QS }}>Priority</p>
            <div style={{ display: "flex", gap: 6 }}>
              {(["low", "normal", "high", "urgent"] as const).map(p => {
                const m = PRIORITY_META[p];
                return (
                  <div key={p} onClick={() => setPriority(p)} className="dt-admin-btn" style={{ flex: 1, height: 36, borderRadius: 12, border: `2px solid ${priority === p ? m.color : "#E5E7EB"}`, background: priority === p ? m.bg : "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: priority === p ? m.color : "#9CA3AF", fontFamily: QS }}>{m.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            {[{ label: "Scheduled Date", val: scheduled, set: setScheduled }, { label: "Expiry Date", val: expiry, set: setExpiry }].map(({ label, val, set }) => (
              <div key={label}>
                <p style={{ margin: "0 0 5px", fontSize: 11, fontWeight: 700, color: "#374151", fontFamily: QS }}>{label}</p>
                <div style={{ background: "white", borderRadius: 12, padding: "10px 12px", border: "1.5px solid #E5E7EB" }}>
                  <input value={val} onChange={e => set(e.target.value)} placeholder="e.g. Aug 10, 2026" style={{ width: "100%", background: "none", border: "none", outline: "none", fontSize: 12, fontFamily: IN, color: "#1F2937", boxSizing: "border-box" as const }} />
                </div>
              </div>
            ))}
          </div>
          {err && <p style={{ margin: "0 0 10px", fontSize: 11, color: "#EF4444", fontFamily: IN }}>{err}</p>}
          <button className="dt-admin-btn" onClick={handleSave} disabled={saving} style={{ width: "100%", height: 48, borderRadius: 20, backgroundImage: GRAD, border: "none", cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1, fontSize: 14, fontWeight: 800, color: "white", fontFamily: QS, boxShadow: "0 4px 16px rgba(151,114,246,.3)" }}>
            {saving ? "Saving…" : ann ? "Save Changes" : "Publish Announcement"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
//
// Removed from here this pass, as fully fabricated and not honestly buildable
// client-side (see .env.local's service-role-key constraint):
//  - "Security Center" (fake failed-login/locked-account/session counts and
//    fake Unlock/Force Logout/Reset Password buttons — real session/lockout
//    data requires Supabase's Admin API, i.e. the service role key).
//  - "Database Management" (hardcoded "Connected"/"1.24 GB"/"2,847 records",
//    and Backup/Restore/Export buttons that only ever showed a toast).
//  - "System Health" (a static online/warning/offline list that even named
//    the wrong backend — "Firebase" — this app runs on Supabase; no real
//    infra-monitoring source exists to back it).
// "Audit Logs" below was kept, rewired to the real admin_activity_log table
// (0061_admin_activity_log.sql) instead of its former hardcoded array.

export function AdminSystemScreen({ go }: { go: (s: string) => void }) {
  // Desktop-only spacing/width adjustments (AdminShellFrame in App.tsx already
  // provides the sidebar/header chrome at this width) — same data, same tabs,
  // just no mobile-status-bar clearance and a bounded content width.
  const deviceType = useDeviceType();
  const isWide = deviceType !== "mobile";
  const isDesktop = deviceType === "desktop";
  // System settings
  const [appName,       setAppName]       = useState("DormiTrack");
  const [orgName,       setOrgName]       = useState("BISU Calape Campus");
  const [theme,         setTheme]         = useState<"light"|"dark"|"system">("light");
  const [lang,          setLang]          = useState("English (PH)");
  const [timezone,      setTimezone]      = useState("Asia/Manila (GMT+8)");
  const [dateFormat,    setDateFormat]    = useState("DD/MM/YYYY");
  const [maintenance,   setMaintenance]   = useState(false);

  // Announcements
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showAnnForm,   setShowAnnForm]   = useState(false);
  const [editAnn,       setEditAnn]       = useState<Announcement | undefined>();
  const [deleteAnnId,   setDeleteAnnId]   = useState<string | null>(null);
  const refreshAnnouncements = () => { getAllAnnouncementsForAdmin().then(setAnnouncements); };

  // BH requests
  const [bhRequests, setBhRequests] = useState<BHRequest[]>([]);
  const [confirmBH,  setConfirmBH]  = useState<{ req: BHRequest; action: "approve" | "reject" | "revision" } | null>(null);
  const refreshBhRequests = () => { getPendingBoardingHouses().then(setBhRequests); };

  useEffect(() => { refreshAnnouncements(); refreshBhRequests(); getRolePermissions().then(setPerms); }, []);

  // Audit logs — real admin_activity_log rows for this admin (RLS is
  // self-select-only, so there's no honest way to show other admins' or
  // other roles' actions here — see 0061_admin_activity_log.sql).
  const [auditLogs,   setAuditLogs]     = useState<AdminActivityEntry[]>([]);
  const [auditSearch, setAuditSearch]   = useState("");
  const refreshAuditLogs = () => { getMyAdminActivity(50).then(setAuditLogs); };
  useEffect(() => { refreshAuditLogs(); }, []);

  // Notifications — real, persisted admin_notification_prefs (0063)
  const [notifPrefs, setNotifPrefs] = useState<AdminNotificationPrefs>({ newUserAlerts: true, bhRequestAlerts: true, reportAlerts: true, paymentAlerts: true });
  useEffect(() => { getMyNotificationPrefs().then(setNotifPrefs); }, []);
  const toggleNotifPref = (key: keyof AdminNotificationPrefs) => {
    const next = !notifPrefs[key];
    setNotifPrefs(p => ({ ...p, [key]: next }));
    setNotificationPref(key, next).then(res => { if (res.ok === false) showToast(`Could not save: ${res.error}`); });
  };

  // Role permissions — persisted to role_permissions (real), deliberately
  // not enforced anywhere, matching the confirmed design decision.
  const [perms, setPerms] = useState<RolePermissions>({
    student:  { viewDorms: true,  checkIn: true,  chat: true,  fileReport: true,  payments: true,  viewOccupants: true  },
    parent:   { viewDorms: true,  checkIn: false, chat: true,  fileReport: true,  payments: true,  viewOccupants: true  },
    landlord: { viewDorms: true,  checkIn: false, chat: true,  fileReport: false, payments: true,  viewOccupants: true  },
    admin:    { viewDorms: true,  checkIn: true,  chat: true,  fileReport: true,  payments: true,  viewOccupants: true  },
  });
  const PERM_LABELS = { viewDorms: "View Boarding Houses", checkIn: "GPS Enter/Exit", chat: "Messaging", fileReport: "File Reports", payments: "Payment Features", viewOccupants: "View Occupants" };

  // Logout
  const [showLogout, setShowLogout] = useState(false);

  // Real Privacy Policy / Terms & Conditions text (same content shown from
  // the login screen's footer) — these two buttons had no onClick at all.
  const [legalDoc, setLegalDoc] = useState<"privacy" | "terms" | null>(null);

  // Toast
  const [toast, setToast] = useState("");
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 2200); };

  // Filtered audit logs — search only (no role/status filters: every row here
  // is this admin's own action, and every logged action succeeded by
  // definition, so those two dimensions no longer apply to real data).
  const filteredLogs = useMemo(() => {
    const q = auditSearch.toLowerCase();
    if (!q) return auditLogs;
    return auditLogs.filter(l => l.action.toLowerCase().includes(q) || l.description.toLowerCase().includes(q));
  }, [auditLogs, auditSearch]);

  const pendingBH = bhRequests.filter(b => b.status === "pending").length;
  const activeAnns = announcements.filter(a => a.status !== "archived").length;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" as const, background: "#F7F8FC" }}>

      <Toast msg={toast} />

      {/* Announcement form */}
      {showAnnForm && (
        <AnnouncementForm
          ann={editAnn}
          onSaved={() => { refreshAnnouncements(); refreshAuditLogs(); showToast(editAnn ? "Announcement updated." : "Announcement published."); }}
          onClose={() => { setShowAnnForm(false); setEditAnn(undefined); }}
        />
      )}

      {/* Delete announcement confirm */}
      {deleteAnnId && (
        <ConfirmDialog
          title="Delete Announcement"
          msg="This announcement will be permanently removed."
          confirmLabel="Delete"
          onConfirm={async () => {
            const target = announcements.find(a => a.id === deleteAnnId);
            const res = await deleteAnnouncement(deleteAnnId);
            setDeleteAnnId(null);
            if (res.ok === false) { showToast(`Could not delete: ${res.error}`); return; }
            await logAdminActivity("delete_announcement", `Deleted announcement: "${target?.title ?? deleteAnnId}"`);
            refreshAnnouncements();
            refreshAuditLogs();
            showToast("Announcement deleted.");
          }}
          onCancel={() => setDeleteAnnId(null)}
        />
      )}

      {/* BH action confirm */}
      {confirmBH && (
        <ConfirmDialog
          title={confirmBH.action === "approve" ? "Approve Boarding House" : confirmBH.action === "reject" ? "Reject Request" : "Request Revision"}
          msg={confirmBH.action === "approve" ? "This boarding house will be published and visible to students." : confirmBH.action === "reject" ? "This registration request will be rejected." : "Ask the landlord to revise their submission."}
          confirmLabel={confirmBH.action === "approve" ? "Approve" : confirmBH.action === "reject" ? "Reject" : "Send Revision"}
          danger={confirmBH.action === "reject"}
          onConfirm={async () => {
            const { req, action } = confirmBH;
            const res = action === "approve" ? await approveBoardingHouse(req.id)
              : action === "reject" ? await rejectBoardingHouse(req.id)
              : await requestBoardingHouseRevision(req.landlordUserId, req.name);
            setConfirmBH(null);
            if (res.ok === false) { showToast(`Action failed: ${res.error}`); return; }
            if (action !== "revision") refreshBhRequests();
            await logAdminActivity(
              action === "approve" ? "approve_bh" : action === "reject" ? "reject_bh" : "request_bh_revision",
              `${action === "approve" ? "Approved" : action === "reject" ? "Rejected" : "Requested revision for"} boarding house "${req.name}"`,
            );
            refreshAuditLogs();
            showToast(action === "approve" ? "Boarding house approved." : action === "reject" ? "Request rejected." : "Revision request sent.");
          }}
          onCancel={() => setConfirmBH(null)}
        />
      )}

      {/* Logout confirm */}
      {showLogout && (
        <ConfirmDialog
          title="Log Out?"
          msg="Are you sure you want to log out of the Admin account?"
          confirmLabel="Log Out"
          onConfirm={() => { supabase.auth.signOut(); go("landing"); }}
          onCancel={() => setShowLogout(false)}
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

      {/* ── App Bar — flat on desktop (sidebar carries the purple identity
          there); unchanged purple rectangle on mobile/tablet ──────────── */}
      <div style={{ flexShrink: 0, backgroundImage: isDesktop ? undefined : GRAD_H, background: isDesktop ? "white" : undefined, borderBottom: isDesktop ? "1px solid #EFEFF5" : undefined, padding: isWide ? "26px 32px 20px" : "52px 20px 20px", position: "relative" as const, overflow: "hidden" }}>
        {!isDesktop && <div style={{ position: "absolute" as const, top: -40, right: -40, width: 150, height: 150, borderRadius: "42% 58% 65% 35%/45% 40% 60% 55%", background: "rgba(255,255,255,.05)", filter: "blur(28px)", pointerEvents: "none" }} />}
        <div style={{ marginBottom: 4 }}>
          <h1 style={{ margin: "0 0 2px", fontSize: 20, fontWeight: 800, color: isDesktop ? "#1F2937" : "white", fontFamily: QS }}>System</h1>
          <p style={{ margin: 0, fontSize: 11, color: isDesktop ? "#9CA3AF" : "rgba(255,255,255,.65)", fontFamily: IN }}>Administration & Configuration Center</p>
        </div>

        {/* Quick stat strip */}
        <div style={{ display: "flex", gap: 8, marginTop: 14, overflowX: "auto" as const, scrollbarWidth: "none" as const }}>
          {[
            { label: "Announcements", val: activeAnns,       color: isDesktop ? "#D97706" : "#FDE68A" },
            { label: "BH Pending",    val: pendingBH,        color: isDesktop ? "#EF4444" : "#FCA5A5" },
            { label: "Audit Logs",    val: auditLogs.length, color: isDesktop ? "#6366F1" : "#A5B4FC" },
          ].map(({ label, val, color }) => (
            <div key={label} className="dt-admin-fade-in" style={{ flexShrink: 0, background: isDesktop ? `${color}14` : "rgba(255,255,255,.15)", borderRadius: 14, padding: "9px 14px", backdropFilter: isDesktop ? undefined : "blur(8px)", textAlign: "center" as const, minWidth: 80 }}>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color, fontFamily: QS }}><CountUp value={val}/></p>
              <p style={{ margin: "2px 0 0", fontSize: 8, color: isDesktop ? "#6B7280" : "rgba(255,255,255,.7)", fontFamily: IN, whiteSpace: "nowrap" as const }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto" as const, scrollbarWidth: "none" as const, padding: isWide ? "20px 32px 60px" : "14px 16px 100px" }}>
      <div style={{ maxWidth: isWide ? 800 : undefined, margin: isWide ? "0 auto" : undefined }}>

        {/* 1. System Settings */}
        <SectionCard title="System Settings" icon={<Settings size={16} color="#9772F6" />} defaultOpen>
          {/* App Name */}
          {[
            { label: "App Name",          val: appName,    set: setAppName    },
            { label: "Organization Name", val: orgName,    set: setOrgName    },
          ].map(({ label, val, set }) => (
            <div key={label} style={{ marginBottom: 12 }}>
              <p style={{ margin: "0 0 4px", fontSize: 10, fontWeight: 700, color: "#9CA3AF", fontFamily: QS, textTransform: "uppercase" as const, letterSpacing: 0.4 }}>{label}</p>
              <div style={{ background: "#F3F4F6", borderRadius: 12, padding: "10px 13px" }}>
                <input value={val} onChange={e => set(e.target.value)} style={{ width: "100%", background: "none", border: "none", outline: "none", fontSize: 13, fontWeight: 700, color: "#1F2937", fontFamily: QS, boxSizing: "border-box" as const }} />
              </div>
            </div>
          ))}

          {/* Theme */}
          <p style={{ margin: "4px 0 8px", fontSize: 10, fontWeight: 700, color: "#9CA3AF", fontFamily: QS, textTransform: "uppercase" as const, letterSpacing: 0.4 }}>Theme</p>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {(["light", "dark", "system"] as const).map(t => (
              <div key={t} onClick={() => setTheme(t)} className="dt-admin-btn" style={{ flex: 1, height: 40, borderRadius: 12, border: `2px solid ${theme === t ? "#9772F6" : "#E5E7EB"}`, background: theme === t ? "#F5F0FF" : "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: theme === t ? "#9772F6" : "#9CA3AF", fontFamily: QS, textTransform: "capitalize" as const }}>{t}</span>
              </div>
            ))}
          </div>

          {/* Other settings */}
          {[
            { label: "Language",        val: lang,       set: setLang       },
            { label: "Time Zone",       val: timezone,   set: setTimezone   },
            { label: "Date Format",     val: dateFormat, set: setDateFormat },
          ].map(({ label, val, set }) => (
            <div key={label} style={{ marginBottom: 12 }}>
              <p style={{ margin: "0 0 4px", fontSize: 10, fontWeight: 700, color: "#9CA3AF", fontFamily: QS, textTransform: "uppercase" as const, letterSpacing: 0.4 }}>{label}</p>
              <div style={{ background: "#F3F4F6", borderRadius: 12, padding: "10px 13px" }}>
                <input value={val} onChange={e => set(e.target.value)} style={{ width: "100%", background: "none", border: "none", outline: "none", fontSize: 12, color: "#1F2937", fontFamily: IN, boxSizing: "border-box" as const }} />
              </div>
            </div>
          ))}

          {/* Maintenance mode */}
          <div style={{ background: maintenance ? "#FEF3C7" : "#F9FAFB", borderRadius: 14, padding: "12px 14px", border: `1.5px solid ${maintenance ? "#FCD34D" : "#E5E7EB"}`, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: maintenance ? "#FEF3C7" : "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <MonitorOff size={14} color={maintenance ? "#D97706" : "#9CA3AF"} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: maintenance ? "#D97706" : "#374151", fontFamily: QS }}>Maintenance Mode</p>
              <p style={{ margin: "1px 0 0", fontSize: 10, color: "#9CA3AF", fontFamily: IN }}>{maintenance ? "App is currently in maintenance mode" : "App is live and accessible"}</p>
            </div>
            <Toggle on={maintenance} onToggle={() => { setMaintenance(v => !v); showToast(maintenance ? "Maintenance mode disabled." : "Maintenance mode enabled."); }} />
          </div>

          <button className="dt-admin-btn" onClick={() => showToast("Settings saved.")} style={{ marginTop: 14, width: "100%", height: 44, borderRadius: 18, backgroundImage: GRAD, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 800, color: "white", fontFamily: QS, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, boxShadow: "0 4px 16px rgba(151,114,246,.25)" }}>
            <Save size={14} color="white" /> Save Settings
          </button>
        </SectionCard>

        {/* 2. Announcement Management */}
        <SectionCard title="Announcement Management" icon={<Megaphone size={16} color="#3B82F6" />} iconBg="#EFF6FF" badge={activeAnns}>
          <button className="dt-admin-btn" onClick={() => { setEditAnn(undefined); setShowAnnForm(true); }} style={{ width: "100%", height: 42, borderRadius: 16, backgroundImage: GRAD, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 800, color: "white", fontFamily: QS, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, marginBottom: 14, boxShadow: "0 4px 16px rgba(151,114,246,.25)" }}>
            <Plus size={14} color="white" /> New Announcement
          </button>
          {announcements.map(a => {
            const pm = PRIORITY_META[a.priority];
            return (
              <div key={a.id} className="dt-admin-card" style={{ background: "#F9FAFB", borderRadius: 16, padding: "12px 14px", marginBottom: 10, border: "1px solid #F3F4F6" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                    <div style={{ display: "flex", gap: 5, marginBottom: 4, flexWrap: "wrap" as const }}>
                      {a.status === "pinned" && <span style={{ fontSize: 8, fontWeight: 800, padding: "2px 7px", borderRadius: 20, background: "#F5F0FF", color: "#9772F6", fontFamily: QS, display: "flex", alignItems: "center", gap: 3 }}><Pin size={9}/> Pinned</span>}
                      <span style={{ fontSize: 8, fontWeight: 800, padding: "2px 7px", borderRadius: 20, background: pm.bg, color: pm.color, fontFamily: QS }}>{pm.label}</span>
                      <span style={{ fontSize: 8, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: "#F3F4F6", color: "#6B7280", fontFamily: IN }}>{a.audience}</span>
                    </div>
                    <p style={{ margin: "0 0 3px", fontSize: 13, fontWeight: 800, color: "#1F2937", fontFamily: QS }}>{a.title}</p>
                    <p style={{ margin: 0, fontSize: 11, color: "#6B7280", fontFamily: IN, lineHeight: 1.5, display: "-webkit-box" as any, WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>{a.desc}</p>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 9, color: "#C4C9D4", fontFamily: IN }}>Scheduled: {a.scheduledDate || "—"}</span>
                  <div style={{ display: "flex", gap: 5 }}>
                    <div onClick={() => { setEditAnn(a); setShowAnnForm(true); }} className="dt-admin-btn" style={{ width: 28, height: 28, borderRadius: 9, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Edit3 size={11} color="#3B82F6" /></div>
                    <div onClick={async () => { const res = await setAnnouncementStatus(a.id, a.status === "pinned" ? "active" : "pinned"); if (res.ok === false) { showToast(`Could not update: ${res.error}`); return; } refreshAnnouncements(); }} className="dt-admin-btn" style={{ width: 28, height: 28, borderRadius: 9, background: a.status === "pinned" ? "#F5F0FF" : "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Pin size={11} color={a.status === "pinned" ? "#9772F6" : "#9CA3AF"} /></div>
                    <div onClick={async () => { const res = await setAnnouncementStatus(a.id, "archived"); if (res.ok === false) { showToast(`Could not archive: ${res.error}`); return; } refreshAnnouncements(); }} className="dt-admin-btn" style={{ width: 28, height: 28, borderRadius: 9, background: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Archive size={11} color="#9CA3AF" /></div>
                    <div onClick={() => setDeleteAnnId(a.id)} className="dt-admin-btn" style={{ width: 28, height: 28, borderRadius: 9, background: "#FEE2E2", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Trash2 size={11} color="#EF4444" /></div>
                  </div>
                </div>
              </div>
            );
          })}
        </SectionCard>

        {/* 3. Role & Permission Management */}
        <SectionCard title="Role & Permission Management" icon={<Shield size={16} color="#6366F1" />} iconBg="#EEF2FF">
          {(Object.entries(perms) as [keyof typeof perms, typeof perms["student"]][]).map(([role, ps]) => (
            <div key={role} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: 8, backgroundImage: GRAD, display: "flex", alignItems: "center", justifyContent: "center" }}><User size={11} color="white" /></div>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: "#1F2937", fontFamily: QS, textTransform: "capitalize" as const }}>{role === "admin" ? "Administrator" : role}</p>
              </div>
              <div style={{ background: "#F9FAFB", borderRadius: 14, padding: "4px 14px" }}>
                {(Object.entries(ps) as [keyof typeof ps, boolean][]).map(([perm, val]) => (
                  <div key={perm} className="dt-admin-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid #F3F4F6", borderRadius: 8 }}>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#374151", fontFamily: IN }}>{PERM_LABELS[perm]}</p>
                    <Toggle on={val} onToggle={() => {
                      setPerms(p => ({ ...p, [role]: { ...p[role], [perm]: !val } }));
                      setRolePermission(role as PermRole, perm as PermKey, !val).then(async res => {
                        if (res.ok === false) { showToast(`Could not save: ${res.error}`); return; }
                        await logAdminActivity("role_permission", `${!val ? "Enabled" : "Disabled"} "${PERM_LABELS[perm]}" for ${role === "admin" ? "Administrator" : role}`);
                        refreshAuditLogs();
                      });
                    }} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </SectionCard>

        {/* 4. Boarding House Approval Center */}
        <SectionCard title="Boarding House Approval" icon={<Building2 size={16} color="#D97706" />} iconBg="#FEF3C7" badge={pendingBH > 0 ? pendingBH : undefined}>
          {bhRequests.length === 0 ? (
            <p style={{ margin: 0, fontSize: 12, color: "#9CA3AF", fontFamily: IN, textAlign: "center" as const, padding: "20px 0" }}>No pending requests.</p>
          ) : bhRequests.map(b => {
            // getPendingBoardingHouses() only ever returns status='pending'
            // rows — an approved/rejected BH simply drops off this list on
            // the next refresh, so this only ever renders the pending look.
            const statusMeta: Record<BHRequest["status"], { label: string; color: string; bg: string }> = {
              pending:  { label: "Pending",   color: "#D97706", bg: "#FEF3C7" },
              approved: { label: "Approved",  color: "#16A34A", bg: "#DCFCE7" },
              rejected: { label: "Rejected",  color: "#EF4444", bg: "#FEE2E2" },
            };
            const sm = statusMeta[b.status];
            return (
              <div key={b.id} className="dt-admin-card" style={{ background: "#F9FAFB", borderRadius: 16, padding: "13px 14px", marginBottom: 10, border: "1px solid #F3F4F6" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                  <div>
                    <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 800, color: "#1F2937", fontFamily: QS }}>{b.name}</p>
                    <p style={{ margin: "0 0 1px", fontSize: 11, color: "#6B7280", fontFamily: IN }}>{b.landlord}</p>
                    <p style={{ margin: 0, fontSize: 10, color: "#9CA3AF", fontFamily: IN }}>{b.address}</p>
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 20, background: sm.bg, color: sm.color, fontFamily: QS, flexShrink: 0 }}>{sm.label}</span>
                </div>
                <p style={{ margin: "0 0 10px", fontSize: 9, color: "#C4C9D4", fontFamily: IN }}>Submitted: {b.submitted}</p>
                {b.status === "pending" && (
                  <div style={{ display: "flex", gap: 7 }}>
                    <button className="dt-admin-btn" onClick={() => setConfirmBH({ req: b, action: "approve" })} style={{ flex: 1, height: 34, borderRadius: 12, border: "none", background: "#DCFCE7", cursor: "pointer", fontSize: 11, fontWeight: 800, color: "#16A34A", fontFamily: QS }}>Approve</button>
                    <button className="dt-admin-btn" onClick={() => setConfirmBH({ req: b, action: "revision" })} style={{ flex: 1, height: 34, borderRadius: 12, border: "none", background: "#EEF2FF", cursor: "pointer", fontSize: 11, fontWeight: 800, color: "#6366F1", fontFamily: QS }}>Revision</button>
                    <button className="dt-admin-btn" onClick={() => setConfirmBH({ req: b, action: "reject" })} style={{ flex: 1, height: 34, borderRadius: 12, border: "none", background: "#FEE2E2", cursor: "pointer", fontSize: 11, fontWeight: 800, color: "#EF4444", fontFamily: QS }}>Reject</button>
                  </div>
                )}
              </div>
            );
          })}
        </SectionCard>

        {/* 5. Audit Logs — real admin_activity_log rows for this admin */}
        <SectionCard title="Audit Logs" icon={<FileText size={16} color="#374151" />} iconBg="#F3F4F6" badge={auditLogs.length}>
          {/* Search */}
          <div style={{ background: "#F3F4F6", borderRadius: 12, padding: "9px 12px", display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Search size={13} color="#9CA3AF" />
            <input value={auditSearch} onChange={e => setAuditSearch(e.target.value)} placeholder="Search logs…" style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 12, fontFamily: IN, color: "#1F2937" }} />
          </div>
          {filteredLogs.map((l) => (
            <div key={l.id} className="dt-admin-row" style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: "1px solid #F9FAFB", borderRadius: 8 }}>
              <div style={{ width: 30, height: 30, borderRadius: 10, background: "#DCFCE7", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CheckCircle size={13} color="#16A34A" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: "0 0 2px", fontSize: 12, fontWeight: 700, color: "#1F2937", fontFamily: QS }}>{l.description}</p>
                <span style={{ fontSize: 9, color: "#C4C9D4", fontFamily: IN }}>{new Date(l.createdAt).toLocaleString()}</span>
              </div>
            </div>
          ))}
          {filteredLogs.length === 0 && <p style={{ margin: 0, fontSize: 12, color: "#9CA3AF", fontFamily: IN, textAlign: "center" as const, padding: "16px 0" }}>{auditSearch ? "No logs match your search." : "No admin actions recorded yet."}</p>}
        </SectionCard>

        {/* 6. Notification Settings — real, persisted (admin_notification_prefs,
            0063), and each one actually gates whether that event notifies
            admin (see notifyAdmins in notificationStore.ts and its call sites
            in Student/Parent/LandlordSignUp, StudentHome, StudentPayments).
            Push/Email were dropped: no push or email delivery exists anywhere
            in this app, only in-app notifications. "User Verification" and
            "Maintenance" were dropped too — there's no real pending-approval
            gate or system-health concept to notify about. */}
        <SectionCard title="Notification Settings" icon={<Bell size={16} color="#3B82F6" />} iconBg="#EFF6FF">
          <ToggleRow label="New User Registrations"  sub="Student, parent & landlord signups"  on={notifPrefs.newUserAlerts}   onToggle={() => toggleNotifPref("newUserAlerts")} />
          <ToggleRow label="Boarding House Requests" sub="New submissions awaiting approval"   on={notifPrefs.bhRequestAlerts} onToggle={() => toggleNotifPref("bhRequestAlerts")} />
          <ToggleRow label="Report Alerts"           sub="New user reports submitted"          on={notifPrefs.reportAlerts}    onToggle={() => toggleNotifPref("reportAlerts")} />
          <ToggleRow label="Payment Alerts"          sub="New payments awaiting verification"  on={notifPrefs.paymentAlerts}   onToggle={() => toggleNotifPref("paymentAlerts")} />
        </SectionCard>

        {/* 7. App Information */}
        <SectionCard title="App Information" icon={<Info size={16} color="#9CA3AF" />} iconBg="#F3F4F6">
          {[
            { label: "App Name",      val: "DormiTrack"           },
            { label: "Version",       val: "v1.0.0"               },
            { label: "Build Number",  val: "42"                   },
            { label: "Last Updated",  val: "August 4, 2026"       },
            { label: "Developer",     val: "BISU Capstone Team"   },
            { label: "Platform",      val: "React 18 / Supabase"  },
          ].map(({ label, val }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid #F9FAFB" }}>
              <p style={{ margin: 0, fontSize: 12, color: "#9CA3AF", fontFamily: IN }}>{label}</p>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#1F2937", fontFamily: QS }}>{val}</p>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button className="dt-admin-btn" onClick={() => setLegalDoc("privacy")} style={{ flex: 1, height: 36, borderRadius: 12, border: "1.5px solid #E5E7EB", background: "white", cursor: "pointer", fontSize: 10, fontWeight: 800, color: "#6B7280", fontFamily: QS }}>Privacy Policy</button>
            <button className="dt-admin-btn" onClick={() => setLegalDoc("terms")} style={{ flex: 1, height: 36, borderRadius: 12, border: "1.5px solid #E5E7EB", background: "white", cursor: "pointer", fontSize: 10, fontWeight: 800, color: "#6B7280", fontFamily: QS }}>Terms & Conditions</button>
          </div>
        </SectionCard>

        {/* 8. Logout */}
        <div onClick={() => setShowLogout(true)} className="dt-admin-card" style={{ background: "white", borderRadius: 20, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, border: "1px solid #FEE2E2", cursor: "pointer", boxShadow: "0 4px 20px rgba(0,0,0,.06)" }}>
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
