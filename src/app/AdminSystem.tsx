import React, { useState, useMemo } from "react";
import {
  Settings, ChevronDown, ChevronUp, ChevronRight, X, Check,
  AlertTriangle, LogOut, Trash2, Plus, Clock, Database, RefreshCw,
  Eye, Activity, Globe, Bell, FileText, Info, Archive, Edit3,
  Building2, Shield, Users, Lock, Unlock, Search, Filter,
  Megaphone, Pin, Calendar, Smartphone, Server, Wifi, CloudOff,
  Cloud, CheckCircle, XCircle, AlertCircle, Save, Download,
  Upload, HardDrive, User, Flag, Mail, Key, MonitorOff,
  ToggleLeft, Zap, MapPin,
} from "lucide-react";

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
    <div style={{ background: "white", borderRadius: 20, marginBottom: 14, boxShadow: "0 4px 20px rgba(0,0,0,.06)", overflow: "hidden" }}>
      <div onClick={() => setOpen(o => !o)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "16px 18px", cursor: "pointer", borderBottom: open ? "1px solid #F3F4F6" : "none" }}>
        <div style={{ width: 34, height: 34, borderRadius: 11, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {icon}
        </div>
        <span style={{ flex: 1, fontSize: 14, fontWeight: 800, color: "#1F2937", fontFamily: QS }}>{title}</span>
        {badge !== undefined && <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 20, background: "#FEF3C7", color: "#D97706", fontFamily: QS, marginRight: 4 }}>{badge}</span>}
        {open ? <ChevronUp size={17} color="#9CA3AF" /> : <ChevronDown size={17} color="#9CA3AF" />}
      </div>
      {open && <div style={{ padding: "14px 18px 18px" }}>{children}</div>}
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
    <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: "1px solid #F9FAFB", cursor: onClick ? "pointer" : "default" }}>
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
    <div onClick={onClick} style={{ padding: "5px 13px", borderRadius: 20, cursor: "pointer", background: active ? "#1F2937" : "#F3F4F6", color: active ? "white" : "#6B7280", fontSize: 10, fontWeight: 800, fontFamily: QS, flexShrink: 0 }}>
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
          <button onClick={onCancel} style={{ height: 48, borderRadius: 18, border: "2px solid #E5E7EB", background: "white", cursor: "pointer", fontSize: 13, fontWeight: 800, color: "#374151", fontFamily: QS }}>Cancel</button>
          <button onClick={onConfirm} style={{ height: 48, borderRadius: 18, border: "none", background: danger ? "#EF4444" : GRAD, cursor: "pointer", fontSize: 13, fontWeight: 800, color: "white", fontFamily: QS }}>{confirmLabel}</button>
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

type Announcement = {
  id: string; title: string; desc: string; audience: string; priority: "low" | "normal" | "high" | "urgent";
  scheduledDate: string; expiryDate: string; status: "active" | "archived" | "pinned"; createdAt: string;
};

const SEED_ANNOUNCEMENTS: Announcement[] = [
  { id: "a1", title: "Monthly Rent Reminder", desc: "Please settle your rent payments for the month of August before August 5, 2026.", audience: "Students", priority: "high", scheduledDate: "Aug 1, 2026", expiryDate: "Aug 5, 2026", status: "pinned", createdAt: "Aug 1" },
  { id: "a2", title: "System Maintenance Notice", desc: "DormiTrack will undergo scheduled maintenance on August 7, 2026 from 12:00 AM to 3:00 AM.", audience: "Everyone", priority: "urgent", scheduledDate: "Aug 5, 2026", expiryDate: "Aug 7, 2026", status: "active", createdAt: "Aug 3" },
  { id: "a3", title: "GPS Check-In Policy Update", desc: "Effective August 10, all students are required to perform GPS check-in daily between 6:00 PM and 9:00 PM.", audience: "Students", priority: "normal", scheduledDate: "Aug 8, 2026", expiryDate: "Aug 31, 2026", status: "active", createdAt: "Aug 4" },
];

const PRIORITY_META: Record<string, { label: string; color: string; bg: string }> = {
  low:    { label: "Low",    color: "#6B7280", bg: "#F3F4F6" },
  normal: { label: "Normal", color: "#3B82F6", bg: "#EFF6FF" },
  high:   { label: "High",   color: "#D97706", bg: "#FEF3C7" },
  urgent: { label: "Urgent", color: "#EF4444", bg: "#FEE2E2" },
};

function AnnouncementForm({ ann, onSave, onClose }: {
  ann?: Announcement; onSave: (a: Announcement) => void; onClose: () => void;
}) {
  const [title,     setTitle]     = useState(ann?.title     ?? "");
  const [desc,      setDesc]      = useState(ann?.desc      ?? "");
  const [audience,  setAudience]  = useState(ann?.audience  ?? "Everyone");
  const [priority,  setPriority]  = useState<Announcement["priority"]>(ann?.priority ?? "normal");
  const [scheduled, setScheduled] = useState(ann?.scheduledDate ?? "");
  const [expiry,    setExpiry]    = useState(ann?.expiryDate    ?? "");

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({
      id: ann?.id ?? `a${Date.now()}`, title, desc, audience, priority,
      scheduledDate: scheduled, expiryDate: expiry,
      status: ann?.status ?? "active", createdAt: ann?.createdAt ?? "Now",
    });
    onClose();
  };

  return (
    <div style={{ position: "fixed" as const, inset: 0, background: "rgba(0,0,0,.55)", zIndex: 800, display: "flex", flexDirection: "column" as const, justifyContent: "flex-end" }} onClick={onClose}>
      <div style={{ background: "#F7F8FC", borderRadius: "26px 26px 0 0", maxHeight: "90%", display: "flex", flexDirection: "column" as const }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px" }}><div style={{ width: 40, height: 4, borderRadius: 2, background: "#E5E7EB" }} /></div>
        <div style={{ background: "white", borderRadius: "26px 26px 0 0", padding: "14px 20px 12px", borderBottom: "1px solid #F3F4F6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#1F2937", fontFamily: QS }}>{ann ? "Edit Announcement" : "New Announcement"}</p>
          <div onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, background: "#F3F4F6", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={14} color="#6B7280" /></div>
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
                  <div key={p} onClick={() => setPriority(p)} style={{ flex: 1, height: 36, borderRadius: 12, border: `2px solid ${priority === p ? m.color : "#E5E7EB"}`, background: priority === p ? m.bg : "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
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
          <button onClick={handleSave} style={{ width: "100%", height: 48, borderRadius: 20, backgroundImage: GRAD, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 800, color: "white", fontFamily: QS, boxShadow: "0 4px 16px rgba(151,114,246,.3)" }}>
            {ann ? "Save Changes" : "Publish Announcement"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Audit log data ────────────────────────────────────────────────────────────

const AUDIT_LOGS = [
  { user: "Admin",          role: "Administrator", action: "Approved user account",    time: "Today, 9:14 AM",    device: "iPhone 15 Pro",   status: "success" },
  { user: "Admin",          role: "Administrator", action: "Resolved report",           time: "Today, 8:45 AM",    device: "iPhone 15 Pro",   status: "success" },
  { user: "Ma. Kyla Naquila",role:"Landlord",      action: "Updated boarding house",    time: "Aug 3, 11:00 AM",   device: "Android",         status: "success" },
  { user: "Admin",          role: "Administrator", action: "Sent system announcement",  time: "Aug 2, 4:30 PM",    device: "iPhone 15 Pro",   status: "success" },
  { user: "Unknown",        role: "—",             action: "Failed login attempt",      time: "Jul 29, 3:12 AM",   device: "Unknown Device",  status: "failed"  },
  { user: "Carlos Sunrise", role: "Landlord",      action: "Registered boarding house", time: "Jul 28, 9:00 AM",   device: "Chrome – macOS",  status: "success" },
  { user: "Admin",          role: "Administrator", action: "Exported database",         time: "Jul 27, 2:00 PM",   device: "Chrome – macOS",  status: "success" },
  { user: "Ben Torres",     role: "Student",       action: "Account suspended",         time: "Jul 25, 5:30 PM",   device: "iPhone 14",       status: "warning" },
];

// ── Security data ─────────────────────────────────────────────────────────────

const SECURITY_EVENTS = [
  { type: "failed",  user: "Unknown",    detail: "Wrong password — 3 attempts",      time: "Jul 29, 3:12 AM",   device: "Unknown Device" },
  { type: "locked",  user: "Ben Torres", detail: "Account locked due to suspension",  time: "Jul 25, 5:30 PM",   device: "iPhone 14"      },
  { type: "reset",   user: "Kevin Cruz", detail: "Password reset requested",          time: "Aug 1, 10:00 AM",   device: "Chrome – Windows"},
  { type: "unknown", user: "Unknown",    detail: "Unrecognized device login attempt", time: "Jul 29, 3:15 AM",   device: "Unknown Android" },
];

// ── Boarding house pending ────────────────────────────────────────────────────

type BHRequest = { id: string; name: string; landlord: string; address: string; submitted: string; status: "pending" | "approved" | "rejected" | "revision" };

const SEED_BH: BHRequest[] = [
  { id: "bh1", name: "Sunrise Dormitory 2",     landlord: "Carlos Sunrise",    address: "Poblacion, Calape, Bohol",  submitted: "Aug 3, 2026", status: "pending" },
  { id: "bh2", name: "Eden Student Residence",  landlord: "Mylene Cabatingan", address: "Cangumba, Calape, Bohol",   submitted: "Aug 2, 2026", status: "pending" },
  { id: "bh3", name: "CJ Boarding House",       landlord: "Crisanto Javier",   address: "Tultugan, Calape, Bohol",   submitted: "Jul 30, 2026",status: "revision"},
];

// ── Main Screen ───────────────────────────────────────────────────────────────

export function AdminSystemScreen({ go }: { go: (s: string) => void }) {
  // System settings
  const [appName,       setAppName]       = useState("DormiTrack");
  const [orgName,       setOrgName]       = useState("BISU Calape Campus");
  const [theme,         setTheme]         = useState<"light"|"dark"|"system">("light");
  const [lang,          setLang]          = useState("English (PH)");
  const [timezone,      setTimezone]      = useState("Asia/Manila (GMT+8)");
  const [dateFormat,    setDateFormat]    = useState("DD/MM/YYYY");
  const [maintenance,   setMaintenance]   = useState(false);

  // Announcements
  const [announcements, setAnnouncements] = useState<Announcement[]>(SEED_ANNOUNCEMENTS);
  const [showAnnForm,   setShowAnnForm]   = useState(false);
  const [editAnn,       setEditAnn]       = useState<Announcement | undefined>();
  const [deleteAnnId,   setDeleteAnnId]   = useState<string | null>(null);

  // BH requests
  const [bhRequests, setBhRequests] = useState<BHRequest[]>(SEED_BH);
  const [confirmBH,  setConfirmBH]  = useState<{ id: string; action: "approve" | "reject" | "revision" } | null>(null);

  // Audit logs
  const [auditSearch, setAuditSearch]   = useState("");
  const [auditRole,   setAuditRole]     = useState("all");
  const [auditStatus, setAuditStatus]   = useState("all");

  // Notifications
  const [notifs, setNotifs] = useState({ push: true, email: false, payment: true, verification: true, reports: true, maintenance: true });

  // Health
  const HEALTH = [
    { label: "Firebase",        status: "online"  as const, Icon: Cloud   },
    { label: "Authentication",  status: "online"  as const, Icon: Shield  },
    { label: "Database",        status: "warning" as const, Icon: Database},
    { label: "Google Maps API", status: "online"  as const, Icon: MapPin  },
    { label: "Cloud Storage",   status: "online"  as const, Icon: HardDrive},
    { label: "Cloud Sync",      status: "offline" as const, Icon: Wifi    },
  ];
  const STATUS_META = { online: { label: "Online", color: "#16A34A", bg: "#DCFCE7", dot: "#22C55E" }, warning: { label: "Warning", color: "#D97706", bg: "#FEF3C7", dot: "#F59E0B" }, offline: { label: "Offline", color: "#EF4444", bg: "#FEE2E2", dot: "#EF4444" } };

  // Role permissions
  const [perms, setPerms] = useState({
    student:  { viewDorms: true,  checkIn: true,  chat: true,  fileReport: true,  payments: true,  viewOccupants: true  },
    parent:   { viewDorms: true,  checkIn: false, chat: true,  fileReport: true,  payments: true,  viewOccupants: true  },
    landlord: { viewDorms: true,  checkIn: false, chat: true,  fileReport: false, payments: true,  viewOccupants: true  },
    admin:    { viewDorms: true,  checkIn: true,  chat: true,  fileReport: true,  payments: true,  viewOccupants: true  },
  });
  const PERM_LABELS = { viewDorms: "View Boarding Houses", checkIn: "GPS Check-In/Out", chat: "Messaging", fileReport: "File Reports", payments: "Payment Features", viewOccupants: "View Occupants" };

  // Logout
  const [showLogout, setShowLogout] = useState(false);

  // Toast
  const [toast, setToast] = useState("");
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 2200); };

  // Filtered audit logs
  const filteredLogs = useMemo(() => {
    return AUDIT_LOGS.filter(l => {
      const q = auditSearch.toLowerCase();
      const matchQ = !q || l.user.toLowerCase().includes(q) || l.action.toLowerCase().includes(q);
      const matchRole = auditRole === "all" || l.role.toLowerCase() === auditRole;
      const matchStatus = auditStatus === "all" || l.status === auditStatus;
      return matchQ && matchRole && matchStatus;
    });
  }, [auditSearch, auditRole, auditStatus]);

  const pendingBH = bhRequests.filter(b => b.status === "pending").length;
  const activeAnns = announcements.filter(a => a.status !== "archived").length;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" as const, background: "#F7F8FC" }}>

      <Toast msg={toast} />

      {/* Announcement form */}
      {showAnnForm && (
        <AnnouncementForm
          ann={editAnn}
          onSave={a => {
            if (editAnn) setAnnouncements(list => list.map(x => x.id === a.id ? a : x));
            else setAnnouncements(list => [a, ...list]);
            showToast(editAnn ? "Announcement updated." : "Announcement published.");
          }}
          onClose={() => { setShowAnnForm(false); setEditAnn(undefined); }}
        />
      )}

      {/* Delete announcement confirm */}
      {deleteAnnId && (
        <ConfirmDialog
          title="Delete Announcement"
          msg="This announcement will be permanently removed."
          confirmLabel="Delete"
          onConfirm={() => { setAnnouncements(list => list.filter(a => a.id !== deleteAnnId)); setDeleteAnnId(null); showToast("Announcement deleted."); }}
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
          onConfirm={() => {
            setBhRequests(list => list.map(b => b.id === confirmBH!.id ? { ...b, status: confirmBH!.action === "revision" ? "revision" : confirmBH!.action === "approve" ? "approved" : "rejected" } : b));
            showToast(confirmBH.action === "approve" ? "Boarding house approved." : confirmBH.action === "reject" ? "Request rejected." : "Revision request sent.");
            setConfirmBH(null);
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
          onConfirm={() => go("landing")}
          onCancel={() => setShowLogout(false)}
        />
      )}

      {/* ── App Bar ──────────────────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, backgroundImage: GRAD_H, padding: "52px 20px 20px", position: "relative" as const, overflow: "hidden" }}>
        <div style={{ position: "absolute" as const, top: -40, right: -40, width: 150, height: 150, borderRadius: "50%", background: "rgba(255,255,255,.05)", pointerEvents: "none" }} />
        <div style={{ marginBottom: 4 }}>
          <h1 style={{ margin: "0 0 2px", fontSize: 20, fontWeight: 800, color: "white", fontFamily: QS }}>System</h1>
          <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,.65)", fontFamily: IN }}>Administration & Configuration Center</p>
        </div>

        {/* Quick stat strip */}
        <div style={{ display: "flex", gap: 8, marginTop: 14, overflowX: "auto" as const, scrollbarWidth: "none" as const }}>
          {[
            { label: "Announcements", val: activeAnns,                     color: "#FDE68A" },
            { label: "BH Pending",    val: pendingBH,                      color: "#FCA5A5" },
            { label: "Audit Logs",    val: AUDIT_LOGS.length,              color: "#A5B4FC" },
            { label: "Security Events",val: SECURITY_EVENTS.length,        color: "#6EE7B7" },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ flexShrink: 0, background: "rgba(255,255,255,.15)", borderRadius: 14, padding: "9px 14px", backdropFilter: "blur(8px)", textAlign: "center" as const, minWidth: 80 }}>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color, fontFamily: QS }}>{val}</p>
              <p style={{ margin: "2px 0 0", fontSize: 8, color: "rgba(255,255,255,.7)", fontFamily: IN, whiteSpace: "nowrap" as const }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto" as const, scrollbarWidth: "none" as const, padding: "14px 16px 100px" }}>

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
              <div key={t} onClick={() => setTheme(t)} style={{ flex: 1, height: 40, borderRadius: 12, border: `2px solid ${theme === t ? "#9772F6" : "#E5E7EB"}`, background: theme === t ? "#F5F0FF" : "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
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

          <button onClick={() => showToast("Settings saved.")} style={{ marginTop: 14, width: "100%", height: 44, borderRadius: 18, backgroundImage: GRAD, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 800, color: "white", fontFamily: QS, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, boxShadow: "0 4px 16px rgba(151,114,246,.25)" }}>
            <Save size={14} color="white" /> Save Settings
          </button>
        </SectionCard>

        {/* 2. Announcement Management */}
        <SectionCard title="Announcement Management" icon={<Megaphone size={16} color="#3B82F6" />} iconBg="#EFF6FF" badge={activeAnns}>
          <button onClick={() => { setEditAnn(undefined); setShowAnnForm(true); }} style={{ width: "100%", height: 42, borderRadius: 16, backgroundImage: GRAD, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 800, color: "white", fontFamily: QS, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, marginBottom: 14, boxShadow: "0 4px 16px rgba(151,114,246,.25)" }}>
            <Plus size={14} color="white" /> New Announcement
          </button>
          {announcements.map(a => {
            const pm = PRIORITY_META[a.priority];
            return (
              <div key={a.id} style={{ background: "#F9FAFB", borderRadius: 16, padding: "12px 14px", marginBottom: 10, border: "1px solid #F3F4F6" }}>
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
                    <div onClick={() => { setEditAnn(a); setShowAnnForm(true); }} style={{ width: 28, height: 28, borderRadius: 9, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Edit3 size={11} color="#3B82F6" /></div>
                    <div onClick={() => setAnnouncements(list => list.map(x => x.id === a.id ? { ...x, status: x.status === "pinned" ? "active" : "pinned" } : x))} style={{ width: 28, height: 28, borderRadius: 9, background: a.status === "pinned" ? "#F5F0FF" : "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Pin size={11} color={a.status === "pinned" ? "#9772F6" : "#9CA3AF"} /></div>
                    <div onClick={() => setAnnouncements(list => list.map(x => x.id === a.id ? { ...x, status: "archived" } : x))} style={{ width: 28, height: 28, borderRadius: 9, background: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Archive size={11} color="#9CA3AF" /></div>
                    <div onClick={() => setDeleteAnnId(a.id)} style={{ width: 28, height: 28, borderRadius: 9, background: "#FEE2E2", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Trash2 size={11} color="#EF4444" /></div>
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
                  <div key={perm} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid #F3F4F6" }}>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#374151", fontFamily: IN }}>{PERM_LABELS[perm]}</p>
                    <Toggle on={val} onToggle={() => setPerms(p => ({ ...p, [role]: { ...p[role], [perm]: !val } }))} />
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
            const statusMeta: Record<BHRequest["status"], { label: string; color: string; bg: string }> = {
              pending:  { label: "Pending",   color: "#D97706", bg: "#FEF3C7" },
              approved: { label: "Approved",  color: "#16A34A", bg: "#DCFCE7" },
              rejected: { label: "Rejected",  color: "#EF4444", bg: "#FEE2E2" },
              revision: { label: "Revision",  color: "#6366F1", bg: "#EEF2FF" },
            };
            const sm = statusMeta[b.status];
            return (
              <div key={b.id} style={{ background: "#F9FAFB", borderRadius: 16, padding: "13px 14px", marginBottom: 10, border: "1px solid #F3F4F6" }}>
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
                    <button onClick={() => setConfirmBH({ id: b.id, action: "approve" })} style={{ flex: 1, height: 34, borderRadius: 12, border: "none", background: "#DCFCE7", cursor: "pointer", fontSize: 11, fontWeight: 800, color: "#16A34A", fontFamily: QS }}>Approve</button>
                    <button onClick={() => setConfirmBH({ id: b.id, action: "revision" })} style={{ flex: 1, height: 34, borderRadius: 12, border: "none", background: "#EEF2FF", cursor: "pointer", fontSize: 11, fontWeight: 800, color: "#6366F1", fontFamily: QS }}>Revision</button>
                    <button onClick={() => setConfirmBH({ id: b.id, action: "reject" })} style={{ flex: 1, height: 34, borderRadius: 12, border: "none", background: "#FEE2E2", cursor: "pointer", fontSize: 11, fontWeight: 800, color: "#EF4444", fontFamily: QS }}>Reject</button>
                  </div>
                )}
              </div>
            );
          })}
        </SectionCard>

        {/* 5. Database Management */}
        <SectionCard title="Database Management" icon={<Database size={16} color="#0891B2" />} iconBg="#ECFEFF">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            {[
              { label: "Status",       val: "Connected",   color: "#16A34A", bg: "#DCFCE7" },
              { label: "Storage Used", val: "1.24 GB",     color: "#9772F6", bg: "#F5F0FF" },
              { label: "Last Backup",  val: "Aug 3, 2026", color: "#D97706", bg: "#FEF3C7" },
              { label: "Total Records",val: "2,847",       color: "#0891B2", bg: "#ECFEFF" },
            ].map(({ label, val, color, bg }) => (
              <div key={label} style={{ background: bg, borderRadius: 14, padding: "12px 13px" }}>
                <p style={{ margin: "0 0 2px", fontSize: 9, color, fontFamily: QS, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 0.4 }}>{label}</p>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color, fontFamily: QS }}>{val}</p>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {[
              { label: "Backup",  Icon: Download, color: "#16A34A", bg: "#DCFCE7" },
              { label: "Restore", Icon: Upload,   color: "#D97706", bg: "#FEF3C7" },
              { label: "Export",  Icon: HardDrive,color: "#0891B2", bg: "#ECFEFF" },
            ].map(({ label, Icon, color, bg }) => (
              <button key={label} onClick={() => showToast(`${label} initiated.`)} style={{ height: 48, borderRadius: 14, border: "none", background: bg, cursor: "pointer", display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", gap: 4 }}>
                <Icon size={16} color={color} />
                <span style={{ fontSize: 10, fontWeight: 800, color, fontFamily: QS }}>{label}</span>
              </button>
            ))}
          </div>
        </SectionCard>

        {/* 6. Audit Logs */}
        <SectionCard title="Audit Logs" icon={<FileText size={16} color="#374151" />} iconBg="#F3F4F6" badge={AUDIT_LOGS.length}>
          {/* Search */}
          <div style={{ background: "#F3F4F6", borderRadius: 12, padding: "9px 12px", display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Search size={13} color="#9CA3AF" />
            <input value={auditSearch} onChange={e => setAuditSearch(e.target.value)} placeholder="Search logs…" style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 12, fontFamily: IN, color: "#1F2937" }} />
          </div>
          {/* Filters */}
          <div style={{ display: "flex", gap: 5, marginBottom: 12, flexWrap: "wrap" as const }}>
            {["all","Administrator","Landlord","Student"].map(r => (
              <Chip key={r} label={r === "all" ? "All Roles" : r} active={auditRole === r} onClick={() => setAuditRole(r)} />
            ))}
            <Chip label="Success" active={auditStatus === "success"} onClick={() => setAuditStatus(auditStatus === "success" ? "all" : "success")} />
            <Chip label="Failed"  active={auditStatus === "failed"}  onClick={() => setAuditStatus(auditStatus === "failed"  ? "all" : "failed")} />
          </div>
          {filteredLogs.map((l, i) => (
            <div key={i} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: "1px solid #F9FAFB" }}>
              <div style={{ width: 30, height: 30, borderRadius: 10, background: l.status === "success" ? "#DCFCE7" : l.status === "failed" ? "#FEE2E2" : "#FEF3C7", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {l.status === "success" ? <CheckCircle size={13} color="#16A34A" /> : l.status === "failed" ? <XCircle size={13} color="#EF4444" /> : <AlertCircle size={13} color="#D97706" />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: "0 0 1px", fontSize: 12, fontWeight: 700, color: "#1F2937", fontFamily: QS }}>{l.action}</p>
                <p style={{ margin: "0 0 2px", fontSize: 10, color: "#6B7280", fontFamily: IN }}>{l.user} · {l.role}</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ fontSize: 9, color: "#C4C9D4", fontFamily: IN }}>{l.time}</span>
                  <span style={{ fontSize: 9, color: "#C4C9D4", fontFamily: IN }}>{l.device}</span>
                </div>
              </div>
            </div>
          ))}
          {filteredLogs.length === 0 && <p style={{ margin: 0, fontSize: 12, color: "#9CA3AF", fontFamily: IN, textAlign: "center" as const, padding: "16px 0" }}>No logs match your filters.</p>}
        </SectionCard>

        {/* 7. Security Center */}
        <SectionCard title="Security Center" icon={<Lock size={16} color="#EF4444" />} iconBg="#FEE2E2" badge={SECURITY_EVENTS.length}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            {[
              { label: "Failed Logins",     val: "1", color: "#EF4444", bg: "#FEE2E2" },
              { label: "Locked Accounts",   val: "1", color: "#D97706", bg: "#FEF3C7" },
              { label: "Active Sessions",   val: "4", color: "#16A34A", bg: "#DCFCE7" },
              { label: "Password Resets",   val: "1", color: "#3B82F6", bg: "#EFF6FF" },
            ].map(({ label, val, color, bg }) => (
              <div key={label} style={{ background: bg, borderRadius: 14, padding: "11px 13px" }}>
                <p style={{ margin: "0 0 1px", fontSize: 8, color, fontFamily: QS, fontWeight: 700, textTransform: "uppercase" as const }}>{label}</p>
                <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color, fontFamily: QS }}>{val}</p>
              </div>
            ))}
          </div>
          {SECURITY_EVENTS.map((e, i) => {
            const typeMeta: Record<string, { color: string; bg: string; Icon: any }> = {
              failed:  { color: "#EF4444", bg: "#FEE2E2", Icon: XCircle     },
              locked:  { color: "#D97706", bg: "#FEF3C7", Icon: Lock        },
              reset:   { color: "#3B82F6", bg: "#EFF6FF", Icon: Key         },
              unknown: { color: "#6366F1", bg: "#EEF2FF", Icon: AlertCircle },
            };
            const tm = typeMeta[e.type];
            return (
              <div key={i} style={{ background: "#F9FAFB", borderRadius: 14, padding: "11px 13px", marginBottom: 9, border: `1px solid ${tm.bg}` }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 10, background: tm.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <tm.Icon size={13} color={tm.color} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: "0 0 1px", fontSize: 12, fontWeight: 800, color: "#1F2937", fontFamily: QS }}>{e.user}</p>
                    <p style={{ margin: "0 0 4px", fontSize: 10, color: "#6B7280", fontFamily: IN }}>{e.detail}</p>
                    <span style={{ fontSize: 9, color: "#C4C9D4", fontFamily: IN }}>{e.time} · {e.device}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 9 }}>
                  {e.type === "locked" && <button onClick={() => showToast("Account unlocked.")} style={{ flex: 1, height: 30, borderRadius: 10, border: "none", background: "#DCFCE7", cursor: "pointer", fontSize: 10, fontWeight: 800, color: "#16A34A", fontFamily: QS }}>Unlock Account</button>}
                  {(e.type === "failed" || e.type === "unknown") && <button onClick={() => showToast("User force logged out.")} style={{ flex: 1, height: 30, borderRadius: 10, border: "none", background: "#FEE2E2", cursor: "pointer", fontSize: 10, fontWeight: 800, color: "#EF4444", fontFamily: QS }}>Force Logout</button>}
                  <button onClick={() => showToast("Password reset sent.")} style={{ flex: 1, height: 30, borderRadius: 10, border: "none", background: "#EFF6FF", cursor: "pointer", fontSize: 10, fontWeight: 800, color: "#3B82F6", fontFamily: QS }}>Reset Password</button>
                </div>
              </div>
            );
          })}
        </SectionCard>

        {/* 8. Notification Settings */}
        <SectionCard title="Notification Settings" icon={<Bell size={16} color="#3B82F6" />} iconBg="#EFF6FF">
          <ToggleRow label="Push Notifications"          sub="In-app alerts"                on={notifs.push}         onToggle={() => setNotifs(n => ({ ...n, push: !n.push }))} />
          <ToggleRow label="Email Notifications"         sub="Sent to admin email"           on={notifs.email}        onToggle={() => setNotifs(n => ({ ...n, email: !n.email }))} />
          <ToggleRow label="Payment Alerts"              sub="New payments & overdue rent"   on={notifs.payment}      onToggle={() => setNotifs(n => ({ ...n, payment: !n.payment }))} />
          <ToggleRow label="User Verification Alerts"    sub="New pending accounts"          on={notifs.verification} onToggle={() => setNotifs(n => ({ ...n, verification: !n.verification }))} />
          <ToggleRow label="Report Alerts"               sub="New user reports submitted"    on={notifs.reports}      onToggle={() => setNotifs(n => ({ ...n, reports: !n.reports }))} />
          <ToggleRow label="Maintenance Notifications"   sub="System downtime alerts"        on={notifs.maintenance}  onToggle={() => setNotifs(n => ({ ...n, maintenance: !n.maintenance }))} />
        </SectionCard>

        {/* 9. System Health */}
        <SectionCard title="System Health" icon={<Activity size={16} color="#16A34A" />} iconBg="#DCFCE7">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {HEALTH.map(({ label, status, Icon }) => {
              const sm = STATUS_META[status];
              return (
                <div key={label} style={{ background: sm.bg, borderRadius: 16, padding: "12px 13px", border: `1px solid ${sm.dot}30` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
                    <Icon size={14} color={sm.color} />
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: sm.dot }} />
                    <span style={{ fontSize: 9, fontWeight: 800, color: sm.color, fontFamily: QS }}>{sm.label}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: sm.color, fontFamily: QS, lineHeight: 1.3 }}>{label}</p>
                </div>
              );
            })}
          </div>
          <button onClick={() => showToast("System health refreshed.")} style={{ marginTop: 12, width: "100%", height: 40, borderRadius: 14, border: "1.5px solid #E5E7EB", background: "white", cursor: "pointer", fontSize: 12, fontWeight: 800, color: "#374151", fontFamily: QS, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
            <RefreshCw size={13} color="#9CA3AF" /> Refresh Status
          </button>
        </SectionCard>

        {/* 10. App Information */}
        <SectionCard title="App Information" icon={<Info size={16} color="#9CA3AF" />} iconBg="#F3F4F6">
          {[
            { label: "App Name",      val: "DormiTrack"           },
            { label: "Version",       val: "v1.0.0"               },
            { label: "Build Number",  val: "42"                   },
            { label: "Last Updated",  val: "August 4, 2026"       },
            { label: "Developer",     val: "BISU Capstone Team"   },
            { label: "Platform",      val: "React 18 / Firebase"  },
          ].map(({ label, val }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid #F9FAFB" }}>
              <p style={{ margin: 0, fontSize: 12, color: "#9CA3AF", fontFamily: IN }}>{label}</p>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#1F2937", fontFamily: QS }}>{val}</p>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            {["Privacy Policy", "Terms & Conditions"].map(l => (
              <button key={l} style={{ flex: 1, height: 36, borderRadius: 12, border: "1.5px solid #E5E7EB", background: "white", cursor: "pointer", fontSize: 10, fontWeight: 800, color: "#6B7280", fontFamily: QS }}>{l}</button>
            ))}
          </div>
        </SectionCard>

        {/* 11. Logout */}
        <div onClick={() => setShowLogout(true)} style={{ background: "white", borderRadius: 20, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, border: "1px solid #FEE2E2", cursor: "pointer", boxShadow: "0 4px 20px rgba(0,0,0,.06)" }}>
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
  );
}
