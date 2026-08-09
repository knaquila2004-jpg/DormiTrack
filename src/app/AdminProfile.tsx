import React, { useState } from "react";
import {
  ChevronLeft, ChevronDown, ChevronUp, ChevronRight,
  User, Edit3, Shield, Mail, Phone, Key, Lock,
  Bell, Globe, Moon, Sun, Monitor, Clock, LogOut,
  AlertTriangle, CheckCircle, XCircle, Smartphone, Eye, EyeOff,
  FileText, HelpCircle, BookOpen, MessageSquare, Info,
  Calendar, Building2, Users, Flag, X, Check, RefreshCw,
  MapPin, Camera, Activity,
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
    <div style={{ background: "white", borderRadius: 20, marginBottom: 14, boxShadow: "0 4px 20px rgba(0,0,0,.06)", overflow: "hidden" }}>
      <div onClick={() => setOpen(v => !v)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "16px 18px", cursor: "pointer", borderBottom: open ? "1px solid #F3F4F6" : "none" }}>
        <div style={{ width: 34, height: 34, borderRadius: 11, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {icon}
        </div>
        <span style={{ flex: 1, fontSize: 14, fontWeight: 800, color: "#1F2937", fontFamily: QS, textAlign: "left" as const }}>{title}</span>
        {open ? <ChevronUp size={17} color="#9CA3AF" /> : <ChevronDown size={17} color="#9CA3AF" />}
      </div>
      {open && <div style={{ padding: "14px 18px 18px" }}>{children}</div>}
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
    <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #F9FAFB", cursor: onClick ? "pointer" : "default" }}>
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
          <button onClick={onCancel} style={{ height: 48, borderRadius: 18, border: "2px solid #E5E7EB", background: "white", cursor: "pointer", fontSize: 13, fontWeight: 800, color: "#374151", fontFamily: QS }}>Cancel</button>
          <button onClick={onConfirm} style={{ height: 48, borderRadius: 18, border: "none", background: "#EF4444", cursor: "pointer", fontSize: 13, fontWeight: 800, color: "white", fontFamily: QS }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ── Change Password Sheet ─────────────────────────────────────────────────────

function ChangePasswordSheet({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState(""); const [showCur, setShowCur]  = useState(false);
  const [next,    setNext]    = useState(""); const [showNext, setShowNext] = useState(false);
  const [confirm, setConfirm] = useState(""); const [showCon, setShowCon]  = useState(false);
  const [err, setErr] = useState(""); const [done, setDone] = useState(false);

  const handleSave = () => {
    if (!current)          { setErr("Enter your current password."); return; }
    if (next.length < 6)   { setErr("New password must be at least 6 characters."); return; }
    if (next !== confirm)  { setErr("Passwords do not match."); return; }
    setDone(true);
  };

  return (
    <div style={{ position: "fixed" as const, inset: 0, background: "rgba(0,0,0,.55)", zIndex: 800, display: "flex", flexDirection: "column" as const, justifyContent: "flex-end" }} onClick={onClose}>
      <div style={{ background: "white", borderRadius: "26px 26px 0 0", padding: "10px 20px 40px" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}><div style={{ width: 40, height: 4, borderRadius: 2, background: "#E5E7EB" }} /></div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#1F2937", fontFamily: QS }}>Change Password</p>
          <div onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, background: "#F3F4F6", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={14} color="#6B7280" /></div>
        </div>
        {done ? (
          <div style={{ textAlign: "center" as const, padding: "16px 0 10px" }}>
            <div style={{ width: 56, height: 56, borderRadius: 18, backgroundImage: GRAD, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}><Check size={26} color="white" /></div>
            <p style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 800, color: "#1F2937", fontFamily: QS }}>Password Updated</p>
            <p style={{ margin: "0 0 20px", fontSize: 12, color: "#9CA3AF", fontFamily: IN }}>Your password has been changed successfully.</p>
            <button onClick={onClose} style={{ height: 46, width: "100%", borderRadius: 20, backgroundImage: GRAD, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 800, color: "white", fontFamily: QS }}>Done</button>
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
            <button onClick={handleSave} style={{ width: "100%", height: 48, borderRadius: 20, backgroundImage: GRAD, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 800, color: "white", fontFamily: QS, marginTop: 4, boxShadow: "0 4px 16px rgba(151,114,246,.3)" }}>Save Password</button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Login History Sheet ───────────────────────────────────────────────────────

const LOGIN_HISTORY = [
  { device: "iPhone 15 Pro",     location: "Calape, Bohol",     time: "Today, 8:02 AM",      status: "success" },
  { device: "Chrome – Windows",  location: "Tagbilaran, Bohol", time: "Yesterday, 11:45 PM", status: "success" },
  { device: "iPhone 15 Pro",     location: "Calape, Bohol",     time: "Jul 31, 9:20 AM",     status: "success" },
  { device: "Unknown Device",    location: "Manila, NCR",        time: "Jul 29, 3:12 AM",     status: "failed"  },
  { device: "Chrome – macOS",    location: "Calape, Bohol",     time: "Jul 28, 10:00 AM",    status: "success" },
];

function LoginHistorySheet({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ position: "fixed" as const, inset: 0, background: "rgba(0,0,0,.55)", zIndex: 800, display: "flex", flexDirection: "column" as const, justifyContent: "flex-end" }} onClick={onClose}>
      <div style={{ background: "#F7F8FC", borderRadius: "26px 26px 0 0", maxHeight: "78%", display: "flex", flexDirection: "column" as const }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 2px" }}><div style={{ width: 40, height: 4, borderRadius: 2, background: "#E5E7EB" }} /></div>
        <div style={{ background: "white", borderRadius: "26px 26px 0 0", padding: "14px 20px 12px", borderBottom: "1px solid #F3F4F6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#1F2937", fontFamily: QS }}>Login History</p>
          <div onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, background: "#F3F4F6", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={14} color="#6B7280" /></div>
        </div>
        <div style={{ flex: 1, overflowY: "auto" as const, scrollbarWidth: "none" as const, padding: "12px 16px 36px" }}>
          {LOGIN_HISTORY.map((h, i) => (
            <div key={i} style={{ background: "white", borderRadius: 16, marginBottom: 10, padding: "13px 15px", boxShadow: "0 4px 20px rgba(0,0,0,.06)", borderLeft: `3px solid ${h.status === "success" ? "#22C55E" : "#EF4444"}` }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div>
                  <p style={{ margin: "0 0 3px", fontSize: 13, fontWeight: 800, color: "#1F2937", fontFamily: QS }}>{h.device}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <MapPin size={10} color="#9CA3AF" />
                    <p style={{ margin: 0, fontSize: 10, color: "#9CA3AF", fontFamily: IN }}>{h.location}</p>
                  </div>
                </div>
                <div style={{ textAlign: "right" as const }}>
                  <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 20, background: h.status === "success" ? "#DCFCE7" : "#FEE2E2", color: h.status === "success" ? "#16A34A" : "#EF4444", fontFamily: QS }}>{h.status === "success" ? "Success" : "Failed"}</span>
                  <p style={{ margin: "4px 0 0", fontSize: 9, color: "#9CA3AF", fontFamily: IN }}>{h.time}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Activity data ─────────────────────────────────────────────────────────────

const ACTIVITY = [
  { Icon: CheckCircle, color: "#16A34A", bg: "#DCFCE7", action: "Approved new user account",      sub: "Kevin Cruz – Student",              time: "Today, 9:14 AM"   },
  { Icon: Flag,        color: "#9772F6", bg: "#F5F0FF", action: "Resolved a user report",          sub: "Harassment – Ben Torres",           time: "Today, 8:45 AM"   },
  { Icon: Bell,        color: "#3B82F6", bg: "#EFF6FF", action: "Sent system announcement",        sub: "Monthly check-in reminder",         time: "Aug 2, 4:30 PM"   },
  { Icon: Building2,   color: "#D97706", bg: "#FEF3C7", action: "Updated boarding house details",  sub: "Naquila BH – Updated curfew rules", time: "Aug 2, 11:00 AM"  },
  { Icon: Shield,      color: "#6366F1", bg: "#EEF2FF", action: "Changed system settings",         sub: "Enabled maintenance mode briefly",  time: "Aug 1, 2:15 PM"   },
  { Icon: XCircle,     color: "#EF4444", bg: "#FEE2E2", action: "Suspended a user account",        sub: "Ben Torres – Policy violation",     time: "Jul 31, 3:50 PM"  },
  { Icon: FileText,    color: "#0891B2", bg: "#ECFEFF", action: "Generated monthly report",        sub: "August 2026 – Summary",            time: "Jul 30, 10:00 AM" },
];

// ── Main Screen ───────────────────────────────────────────────────────────────

export function AdminProfileScreen({ go }: { go: (s: string) => void }) {
  const [name,    setName]    = useState("Housing Director");
  const [email,   setEmail]   = useState("admin@dormitrack.edu.ph");
  const [contact, setContact] = useState("+63 912 000 0001");
  const [photo,   setPhoto]   = useState<string | null>(null);

  const [notifs, setNotifs] = useState({
    newUsers: true, pendingVerif: true, newReports: true, payments: false,
    bhRequests: true, systemAlerts: true, push: true, emailNotifs: false,
  });
  const [theme,  setTheme]  = useState<"light"|"dark"|"system">("light");
  const [twoFA,  setTwoFA]  = useState(false);

  const [showPwd,     setShowPwd]     = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showLogout,  setShowLogout]  = useState(false);

  const toggleNotif = (k: keyof typeof notifs) => setNotifs(n => ({ ...n, [k]: !n[k] }));

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" as const, background: "#F7F8FC" }}>

      {/* Sheets & dialogs */}
      {showPwd     && <ChangePasswordSheet onClose={() => setShowPwd(false)} />}
      {showHistory && <LoginHistorySheet   onClose={() => setShowHistory(false)} />}
      {showLogout  && (
        <ConfirmDialog
          title="Log Out?"
          msg="Are you sure you want to log out of the Admin account?"
          confirmLabel="Log Out"
          onConfirm={() => go("landing")}
          onCancel={() => setShowLogout(false)}
        />
      )}

      {/* ── Header (same pattern as other profiles) ──────────────────────── */}
      <div style={{ flexShrink: 0, padding: "52px 20px 24px", backgroundImage: GRAD_H, textAlign: "center" as const }}>

        {/* Back + title row */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
          <div onClick={() => go("dashboard")} style={{ display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, padding: 4 }}>
            <ChevronLeft size={18} color="white" />
          </div>
          <h1 style={{ flex: 1, color: "white", fontSize: 20, fontWeight: 800, margin: 0, fontFamily: QS, textAlign: "center" as const }}>My Profile</h1>
          <div style={{ width: 36 }} />
        </div>

        {/* Avatar */}
        <div style={{ position: "relative" as const, display: "inline-block" }}>
          <div style={{ width: 84, height: 84, borderRadius: 28, background: photo ? "transparent" : "rgba(255,255,255,.2)", border: "3px solid rgba(255,255,255,.4)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            {photo
              ? <img src={photo} style={{ width: "100%", height: "100%", objectFit: "cover" as const }} />
              : <User size={38} color="white" />}
          </div>
          <label style={{ position: "absolute" as const, bottom: -6, right: -6, width: 28, height: 28, borderRadius: 10, background: "white", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,.15)" }}>
            <Camera size={13} color="#9772F6" />
            <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) setPhoto(URL.createObjectURL(f)); }} />
          </label>
        </div>

        {photo && (
          <div style={{ marginTop: 8 }}>
            <span onClick={() => setPhoto(null)} style={{ fontSize: 11, color: "rgba(255,255,255,.7)", fontFamily: QS, cursor: "pointer", textDecoration: "underline" }}>Remove Photo</span>
          </div>
        )}

        <h2 style={{ color: "white", fontSize: 20, fontWeight: 800, margin: "14px 0 6px", fontFamily: QS }}>{name}</h2>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const, justifyContent: "center" }}>
          <span style={{ background: "rgba(255,255,255,.18)", borderRadius: 20, padding: "3px 12px", fontSize: 11, color: "white", fontFamily: QS, fontWeight: 700 }}>@admin</span>
          <span style={{ background: "rgba(255,255,255,.18)", borderRadius: 20, padding: "3px 12px", fontSize: 11, color: "white", fontFamily: QS, fontWeight: 700 }}>System Administrator</span>
        </div>
        <p style={{ color: "rgba(255,255,255,.7)", fontSize: 12, margin: "8px 0 0", fontFamily: QS }}>BISU Calape Campus</p>
      </div>

      {/* ── Stats quick card (negative margin pull-up) ───────────────────── */}
      <div style={{ padding: "0 16px", marginTop: -20 }}>
        <div style={{ background: "white", borderRadius: 22, padding: "14px 16px", boxShadow: "0 8px 32px rgba(117,73,246,.14)", display: "grid", gridTemplateColumns: "repeat(3,1fr)", marginBottom: 16 }}>
          {[
            { label: "Users",    val: "11",        color: "#9772F6" },
            { label: "Reports",  val: "8",         color: "#EF4444" },
            { label: "BH Props", val: "2",         color: "#3B82F6" },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ textAlign: "center" as const, padding: "4px 0" }}>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color, fontFamily: QS }}>{val}</p>
              <p style={{ margin: "2px 0 0", fontSize: 10, color: "#9CA3AF", fontFamily: IN }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Scrollable sections ───────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto" as const, scrollbarWidth: "none" as const, padding: "0 16px 32px" }}>

        {/* Personal Information */}
        <SectionCard icon={<User size={16} color="#9772F6" />} title="Personal Information" defaultOpen>
          {[
            { label: "Full Name",    val: name,    editable: true,  setFn: setName    },
            { label: "Email",        val: email,   editable: true,  setFn: setEmail   },
            { label: "Contact",      val: contact, editable: true,  setFn: setContact },
            { label: "Username",     val: "admin", editable: false, setFn: null       },
            { label: "Admin ID",     val: "ADM-2024-001", editable: false, setFn: null },
            { label: "Last Login",   val: "Today, 8:02 AM", editable: false, setFn: null },
            { label: "Account Status", val: "Active", editable: false, setFn: null   },
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
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: label === "Account Status" ? "#16A34A" : "#1F2937", fontFamily: QS }}>{val}</p>
              )}
            </div>
          ))}
        </SectionCard>

        {/* Security */}
        <SectionCard icon={<Shield size={16} color="#6366F1" />} iconBg="#EEF2FF" iconColor="#6366F1" title="Security Settings">
          <ActionRow Icon={Lock}       color="#9772F6" bg="#F5F0FF" label="Change Password"             sub="Update your account password"        onClick={() => setShowPwd(true)} />
          <ActionRow Icon={Shield}     color="#6366F1" bg="#EEF2FF" label="Two-Factor Authentication"   sub={twoFA ? "2FA is enabled" : "2FA is disabled"} right={<Toggle on={twoFA} onToggle={() => setTwoFA(v => !v)} />} />
          <ActionRow Icon={Smartphone} color="#0891B2" bg="#ECFEFF" label="Registered Devices"          sub="2 active devices"                    onClick={() => {}} />
          <ActionRow Icon={Clock}      color="#D97706" bg="#FEF3C7" label="Login History"               sub="View recent sign-ins"                onClick={() => setShowHistory(true)} />
          <ActionRow Icon={Eye}        color="#EC4899" bg="#FDF2F8" label="Active Sessions"             sub="Manage active logins"                onClick={() => {}} />
          <ActionRow Icon={RefreshCw}  color="#EF4444" bg="#FEE2E2" label="Logout from Other Devices"   sub="End all other sessions"              onClick={() => {}} />
        </SectionCard>

        {/* Notifications */}
        <SectionCard icon={<Bell size={16} color="#3B82F6" />} iconBg="#EFF6FF" iconColor="#3B82F6" title="Notification Preferences">
          {([
            { key: "newUsers",     label: "New User Registrations",  Icon: Users,         color: "#9772F6", bg: "#F5F0FF" },
            { key: "pendingVerif", label: "Pending Verifications",    Icon: Clock,         color: "#D97706", bg: "#FEF3C7" },
            { key: "newReports",   label: "New Reports Submitted",    Icon: Flag,          color: "#EF4444", bg: "#FEE2E2" },
            { key: "payments",     label: "Payment Updates",          Icon: FileText,      color: "#16A34A", bg: "#DCFCE7" },
            { key: "bhRequests",   label: "Boarding House Requests",  Icon: Building2,     color: "#3B82F6", bg: "#EFF6FF" },
            { key: "systemAlerts", label: "System Alerts",            Icon: AlertTriangle, color: "#F59E0B", bg: "#FEF3C7" },
            { key: "push",         label: "Push Notifications",       Icon: Bell,          color: "#6366F1", bg: "#EEF2FF" },
            { key: "emailNotifs",  label: "Email Notifications",      Icon: Mail,          color: "#0891B2", bg: "#ECFEFF" },
          ] as { key: keyof typeof notifs; label: string; Icon: any; color: string; bg: string }[]).map(({ key, label, Icon, color, bg }) => (
            <ActionRow key={key} Icon={Icon} color={color} bg={bg} label={label} right={<Toggle on={notifs[key]} onToggle={() => toggleNotif(key)} />} />
          ))}
        </SectionCard>

        {/* System Preferences */}
        <SectionCard icon={<Monitor size={16} color="#0891B2" />} iconBg="#ECFEFF" iconColor="#0891B2" title="System Preferences">
          <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: "#374151", fontFamily: QS }}>Theme</p>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {([["light", Sun, "Light"], ["dark", Moon, "Dark"], ["system", Monitor, "System"]] as const).map(([id, Ic, lbl]) => (
              <div key={id} onClick={() => setTheme(id)} style={{ flex: 1, height: 52, borderRadius: 14, border: `2px solid ${theme === id ? "#9772F6" : "#E5E7EB"}`, background: theme === id ? "#F5F0FF" : "white", cursor: "pointer", display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", gap: 4 }}>
                <Ic size={14} color={theme === id ? "#9772F6" : "#9CA3AF"} />
                <span style={{ fontSize: 9, fontWeight: 800, color: theme === id ? "#9772F6" : "#9CA3AF", fontFamily: QS }}>{lbl}</span>
              </div>
            ))}
          </div>
          <ActionRow Icon={Globe}    color="#0891B2" bg="#ECFEFF" label="Language"              sub="English (PH)"          onClick={() => {}} />
          <ActionRow Icon={Calendar} color="#D97706" bg="#FEF3C7" label="Date & Time Format"    sub="DD/MM/YYYY · 12-hour"  onClick={() => {}} />
          <ActionRow Icon={Monitor}  color="#6366F1" bg="#EEF2FF" label="Default Dashboard View" sub="Summary Cards"        onClick={() => {}} />
        </SectionCard>

        {/* Activity History */}
        <SectionCard icon={<Activity size={16} color="#EC4899" />} iconBg="#FDF2F8" iconColor="#EC4899" title="Activity History">
          {ACTIVITY.map(({ Icon, color, bg, action, sub, time }, i) => (
            <div key={i} style={{ display: "flex", gap: 12, paddingBottom: i < ACTIVITY.length - 1 ? 12 : 0, marginBottom: i < ACTIVITY.length - 1 ? 12 : 0, borderBottom: i < ACTIVITY.length - 1 ? "1px solid #F9FAFB" : "none" }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: bg, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon size={14} color={color} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: "0 0 1px", fontSize: 12, fontWeight: 700, color: "#1F2937", fontFamily: QS, lineHeight: 1.4 }}>{action}</p>
                <p style={{ margin: "0 0 3px", fontSize: 10, color: "#9CA3AF", fontFamily: IN }}>{sub}</p>
                <span style={{ fontSize: 9, color: "#C4C9D4", fontFamily: IN }}>{time}</span>
              </div>
            </div>
          ))}
        </SectionCard>

        {/* Account Information */}
        <SectionCard icon={<Info size={16} color="#374151" />} iconBg="#F3F4F6" iconColor="#374151" title="Account Information">
          <InfoRow label="Role"                  value="System Administrator" />
          <InfoRow label="Permission Level"      value="Full Access" />
          <InfoRow label="Total Managed Users"   value="11 accounts" />
          <InfoRow label="Boarding Houses"       value="2 properties" />
          <InfoRow label="Reports Handled"       value="8 reports" />
          <InfoRow label="Account Created"       value="Jun 1, 2024" />
        </SectionCard>

        {/* Support & About */}
        <SectionCard icon={<HelpCircle size={16} color="#3B82F6" />} iconBg="#EFF6FF" iconColor="#3B82F6" title="Support & About">
          <ActionRow Icon={HelpCircle}    color="#3B82F6" bg="#EFF6FF" label="Help Center"        sub="FAQs and guides"          onClick={() => {}} />
          <ActionRow Icon={BookOpen}      color="#0891B2" bg="#ECFEFF" label="User Guide"         sub="Full admin documentation" onClick={() => {}} />
          <ActionRow Icon={MessageSquare} color="#6366F1" bg="#EEF2FF" label="Contact Developer"  sub="Report bugs or feedback"  onClick={() => {}} />
          <ActionRow Icon={FileText}      color="#D97706" bg="#FEF3C7" label="Privacy Policy"     onClick={() => {}} />
          <ActionRow Icon={FileText}      color="#9CA3AF" bg="#F3F4F6" label="Terms & Conditions" onClick={() => {}} />
          <ActionRow Icon={Info}          color="#16A34A" bg="#DCFCE7" label="App Version"        sub="DormiTrack v1.0.0 (Build 42)" right={<span />} />
        </SectionCard>

        {/* Logout */}
        <div onClick={() => setShowLogout(true)} style={{ background: "white", borderRadius: 20, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, border: "1px solid #FEE2E2", cursor: "pointer", boxShadow: "0 4px 20px rgba(0,0,0,.06)", marginBottom: 8 }}>
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
