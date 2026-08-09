import React, { useState } from "react";
import {
  User, Mail, Lock, Phone, MapPin, Building2, ChevronDown, ChevronUp,
  Edit3, Save, X, Camera, LogOut, Shield, BookOpen,
  Eye, EyeOff, Check, AlertCircle, Home, Bed,
  Calendar, Clock, GraduationCap, CreditCard, Users,
} from "lucide-react";
import { GRAD, GRAD_H, Screen } from "./shared";
import { STUDENT_DATA, BH_DATA, ROOM_DATA, STAY_DATA, BILLING_DATA } from "./StudentHome";

const QS = "'Quicksand',sans-serif";
const IN = "'Inter',sans-serif";

// ── Shared micro-components (matching LandlordProfile exactly) ─────────────────

function SectionCard({ title, icon, children, defaultOpen = false }: {
  title: string; icon?: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background: "white", borderRadius: 20, marginBottom: 14, boxShadow: "0 4px 20px rgba(0,0,0,.06)", overflow: "hidden" }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "16px 18px", background: "none", border: "none", cursor: "pointer", borderBottom: open ? "1px solid #F3F4F6" : "none" }}>
        <div style={{ width: 34, height: 34, borderRadius: 11, background: "#F5F0FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {icon ?? <User size={16} color="#9772F6" />}
        </div>
        <span style={{ flex: 1, fontSize: 14, fontWeight: 800, color: "#1F2937", fontFamily: QS, textAlign: "left" as const }}>{title}</span>
        {open ? <ChevronUp size={17} color="#9CA3AF" /> : <ChevronDown size={17} color="#9CA3AF" />}
      </button>
      {open && <div style={{ padding: "16px 18px" }}>{children}</div>}
    </div>
  );
}

function InfoRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <div style={{ padding: "10px 0", borderBottom: last ? "none" : "1px solid #F9FAFB" }}>
      <p style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, margin: "0 0 2px", fontFamily: QS, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>{label}</p>
      <p style={{ fontSize: 13, fontWeight: 700, color: "#1F2937", margin: 0, fontFamily: IN, lineHeight: 1.45 }}>{value || "—"}</p>
    </div>
  );
}

function LockedRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <div style={{ padding: "10px 0", borderBottom: last ? "none" : "1px solid #F9FAFB", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, margin: "0 0 2px", fontFamily: QS, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>{label}</p>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#9CA3AF", margin: 0, fontFamily: IN, lineHeight: 1.45 }}>{value || "—"}</p>
      </div>
      <Lock size={12} color="#D1D5DB" style={{ marginTop: 14, flexShrink: 0 }}/>
    </div>
  );
}

function EditableField({ label, value, onChange, placeholder, multiline = false, error }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; multiline?: boolean; error?: string;
}) {
  const base: React.CSSProperties = {
    width: "100%", boxSizing: "border-box" as const, padding: "11px 14px", borderRadius: 12,
    border: `1.5px solid ${error ? "#EF4444" : "#E5E7EB"}`, background: "#F9FAFB",
    color: "#1F2937", fontSize: 13, fontFamily: IN, outline: "none", resize: "none" as const,
  };
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: "#374151", fontFamily: QS, marginBottom: 5, display: "block" }}>{label}</label>
      {multiline
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3} style={base} />
        : <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={base} />}
      {error && <p style={{ fontSize: 11, color: "#EF4444", margin: "4px 0 0", fontFamily: IN }}>{error}</p>}
    </div>
  );
}

function GradBtn({ children, onClick, outline = false, danger = false, small = false }: {
  children: React.ReactNode; onClick?: () => void; outline?: boolean; danger?: boolean; small?: boolean;
}) {
  return (
    <button onClick={onClick} style={{
      height: small ? 36 : 44, padding: small ? "0 14px" : "0 20px", borderRadius: 20,
      border: outline ? `2px solid ${danger ? "#EF4444" : "#9772F6"}` : "none",
      background: outline ? "white" : danger ? "#EF4444" : GRAD,
      color: outline ? (danger ? "#EF4444" : "#9772F6") : "white",
      fontSize: small ? 12 : 13, fontWeight: 800, fontFamily: QS, cursor: "pointer",
      boxShadow: outline ? "none" : "0 4px 16px rgba(151,114,246,.3)",
      display: "inline-flex", alignItems: "center", gap: 6,
    }}>{children}</button>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export function StudentProfileScreen({ go }: { go: (s: string) => void }) {
  // ── Personal Info ────────────────────────────────────────────────────────
  // Every field here is student-editable — nothing is locked. Held in local
  // state (seeded from STUDENT_DATA) so edits don't mutate the shared module
  // data other screens also read from.
  const [editPersonal, setEditPersonal] = useState(false);
  const [fullName, setFullName]   = useState(STUDENT_DATA.name);
  const [studentId, setStudentId] = useState(STUDENT_DATA.id);
  const [program, setProgram]     = useState(STUDENT_DATA.program);
  const [yearLevel, setYearLevel] = useState(STUDENT_DATA.year);
  const [block, setBlock]         = useState(STUDENT_DATA.block);
  const [contact, setContact] = useState(STUDENT_DATA.contact);
  const [address, setAddress] = useState(STUDENT_DATA.address);
  const [personalDraft, setPersonalDraft] = useState({ fullName, studentId, program, yearLevel, block, contact, address });

  const startEditPersonal = () => { setPersonalDraft({ fullName, studentId, program, yearLevel, block, contact, address }); setEditPersonal(true); };
  const savePersonal = () => {
    setFullName(personalDraft.fullName); setStudentId(personalDraft.studentId);
    setProgram(personalDraft.program); setYearLevel(personalDraft.yearLevel); setBlock(personalDraft.block);
    setContact(personalDraft.contact); setAddress(personalDraft.address);
    setEditPersonal(false); showToast("Personal information updated.");
  };

  // ── Account / Password ───────────────────────────────────────────────────
  const [showPwModal, setShowPwModal] = useState(false);
  const [curPw, setCurPw] = useState(""); const [newPw, setNewPw] = useState(""); const [conPw, setConPw] = useState("");
  const [showCur, setShowCur] = useState(false); const [showNew, setShowNew] = useState(false); const [showCon, setShowCon] = useState(false);
  const [pwError, setPwError] = useState("");

  const savePw = () => {
    if (!curPw) { setPwError("Enter your current password."); return; }
    if (newPw.length < 6) { setPwError("New password must be at least 6 characters."); return; }
    if (newPw !== conPw) { setPwError("Passwords do not match."); return; }
    setPwError(""); setCurPw(""); setNewPw(""); setConPw(""); setShowPwModal(false); showToast("Password changed successfully.");
  };

  // ── Profile photo ────────────────────────────────────────────────────────
  const [photo, setPhoto] = useState<string | null>(null);

  // ── Toast ────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState("");
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 2800); };

  const inputStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "11px 14px", borderRadius: 12, border: "1.5px solid #E5E7EB", background: "#F9FAFB", color: "#1F2937", fontSize: 13, fontFamily: IN, outline: "none" };
  const initials = STUDENT_DATA.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  // Quick stats
  const paidAmt = 0;
  const totalDue = BILLING_DATA.total;
  const payPct = totalDue > 0 ? Math.round((paidAmt / totalDue) * 100) : 0;
  const stayPct = STAY_DATA.totalDays > 0 ? Math.round((STAY_DATA.daysStayed / STAY_DATA.totalDays) * 100) : 0;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#F7F8FC", position: "relative" }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: "absolute", top: 60, left: "50%", transform: "translateX(-50%)", background: "#1F2937", color: "white", borderRadius: 20, padding: "10px 20px", fontSize: 12, fontFamily: QS, fontWeight: 700, zIndex: 999, whiteSpace: "nowrap" as const, boxShadow: "0 4px 20px rgba(0,0,0,.25)", display: "flex", alignItems: "center", gap: 8 }}>
          <Check size={13} color="#4ADE80" />{toast}
        </div>
      )}

      {/* Change Password Modal */}
      {showPwModal && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 900, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setShowPwModal(false)}>
          <div style={{ background: "white", borderRadius: 24, padding: "24px 20px", width: "100%", maxWidth: 340 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 18px", fontSize: 17, fontWeight: 800, color: "#1F2937", fontFamily: QS }}>Change Password</h3>
            {pwError && (
              <div style={{ background: "#FEF2F2", borderRadius: 12, padding: "10px 14px", marginBottom: 12, display: "flex", gap: 8 }}>
                <AlertCircle size={14} color="#EF4444" />
                <span style={{ fontSize: 12, color: "#DC2626", fontFamily: IN }}>{pwError}</span>
              </div>
            )}
            {[
              { label: "Current Password", val: curPw, set: setCurPw, show: showCur, toggle: () => setShowCur(s => !s) },
              { label: "New Password",     val: newPw, set: setNewPw, show: showNew, toggle: () => setShowNew(s => !s) },
              { label: "Confirm Password", val: conPw, set: setConPw, show: showCon, toggle: () => setShowCon(s => !s) },
            ].map(({ label, val, set, show, toggle }) => (
              <div key={label} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#374151", fontFamily: QS, marginBottom: 5, display: "block" }}>{label}</label>
                <div style={{ position: "relative" }}>
                  <input type={show ? "text" : "password"} value={val} onChange={e => set(e.target.value)} style={{ ...inputStyle, paddingRight: 42 }} />
                  <button onClick={toggle} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", padding: 4 }}>
                    {show ? <Eye size={15} /> : <EyeOff size={15} />}
                  </button>
                </div>
              </div>
            ))}
            <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
              <GradBtn outline onClick={() => { setShowPwModal(false); setPwError(""); }}>Cancel</GradBtn>
              <GradBtn onClick={savePw}>Save Password</GradBtn>
            </div>
          </div>
        </div>
      )}

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" as const }}>

        {/* Header */}
        <div style={{ padding: "52px 20px 24px", backgroundImage: GRAD_H, textAlign: "center" as const }}>
          <h1 style={{ color: "white", fontSize: 20, fontWeight: 800, margin: "0 0 20px", fontFamily: QS, textAlign: "left" as const }}>My Profile</h1>
          <div style={{ position: "relative", display: "inline-block" }}>
            <div style={{ width: 84, height: 84, borderRadius: 28, background: photo ? "transparent" : "rgba(255,255,255,.2)", border: "3px solid rgba(255,255,255,.4)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              {photo
                ? <img src={photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="profile"/>
                : <span style={{ fontSize: 30, fontWeight: 800, color: "white", fontFamily: QS }}>{initials}</span>}
            </div>
            <label style={{ position: "absolute", bottom: -6, right: -6, width: 28, height: 28, borderRadius: 10, background: "white", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,.15)" }}>
              <Camera size={13} color="#9772F6" />
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) setPhoto(URL.createObjectURL(f)); }} />
            </label>
          </div>
          {photo && (
            <button onClick={() => setPhoto(null)} style={{ display: "block", margin: "10px auto 0", background: "none", border: "none", color: "rgba(255,255,255,.7)", fontSize: 11, cursor: "pointer", fontFamily: QS }}>Remove Photo</button>
          )}
          <h2 style={{ color: "white", fontSize: 20, fontWeight: 800, margin: "14px 0 4px", fontFamily: QS }}>{STUDENT_DATA.name}</h2>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const, justifyContent: "center" }}>
            <span style={{ background: "rgba(255,255,255,.18)", borderRadius: 20, padding: "3px 12px", fontSize: 11, color: "white", fontFamily: QS, fontWeight: 700 }}>{STUDENT_DATA.id}</span>
            <span style={{ background: "rgba(255,255,255,.18)", borderRadius: 20, padding: "3px 12px", fontSize: 11, color: "white", fontFamily: QS, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 5 }}><GraduationCap size={11}/> Student</span>
          </div>
          <p style={{ color: "rgba(255,255,255,.7)", fontSize: 12, margin: "8px 0 0", fontFamily: QS }}>{STUDENT_DATA.program} · {STUDENT_DATA.year}</p>
        </div>

        {/* Statistics quick card */}
        <div style={{ padding: "0 16px 0", marginTop: -20 }}>
          <div style={{ background: "white", borderRadius: 22, padding: 16, boxShadow: "0 8px 32px rgba(117,73,246,.14)", display: "grid", gridTemplateColumns: "repeat(4,1fr)", marginBottom: 16 }}>
            {[
              ["Room",     ROOM_DATA.name],
              ["Bed",      ROOM_DATA.bed],
              ["Stayed",   `${STAY_DATA.daysStayed}d`],
              ["Status",   BH_DATA.regStatus],
            ].map(([l, v]) => (
              <div key={l} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: "#9772F6", fontFamily: QS, lineHeight: 1.1 }}>{v}</span>
                <span style={{ fontSize: 9, color: "#6B7280", fontFamily: QS, fontWeight: 700, textAlign: "center" as const, marginTop: 2 }}>{l}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: "0 16px 32px" }}>

          {/* ── Personal Information ── */}
          <SectionCard title="Personal Information" icon={<User size={16} color="#9772F6" />} defaultOpen>
            {!editPersonal ? (
              <>
                <InfoRow label="Full Name"       value={fullName}   />
                <InfoRow label="Student ID"      value={studentId}  />
                <InfoRow label="Program"         value={program}    />
                <InfoRow label="Year Level"      value={yearLevel}  />
                <InfoRow label="Block"           value={block}      />
                <InfoRow label="Contact Number"  value={contact}    />
                <InfoRow label="Home Address"    value={address} last />
                <div style={{ marginTop: 14 }}>
                  <GradBtn small outline onClick={startEditPersonal}><Edit3 size={13} />Edit Personal Info</GradBtn>
                </div>
              </>
            ) : (
              <>
                <EditableField label="Full Name" value={personalDraft.fullName} onChange={v => setPersonalDraft(d => ({ ...d, fullName: v }))} placeholder="Full name" />
                <EditableField label="Student ID" value={personalDraft.studentId} onChange={v => setPersonalDraft(d => ({ ...d, studentId: v }))} placeholder="Student ID" />
                <EditableField label="Program" value={personalDraft.program} onChange={v => setPersonalDraft(d => ({ ...d, program: v }))} placeholder="Program" />
                <EditableField label="Year Level" value={personalDraft.yearLevel} onChange={v => setPersonalDraft(d => ({ ...d, yearLevel: v }))} placeholder="Year Level" />
                <EditableField label="Block" value={personalDraft.block} onChange={v => setPersonalDraft(d => ({ ...d, block: v }))} placeholder="Block" />
                <EditableField label="Contact Number" value={personalDraft.contact} onChange={v => setPersonalDraft(d => ({ ...d, contact: v }))} placeholder="09XXXXXXXXX" />
                <EditableField label="Home Address" value={personalDraft.address} onChange={v => setPersonalDraft(d => ({ ...d, address: v }))} placeholder="Purok, Barangay, Municipality, Province" multiline />
                <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                  <GradBtn small outline onClick={() => setEditPersonal(false)}><X size={13} />Cancel</GradBtn>
                  <GradBtn small onClick={savePersonal}><Save size={13} />Save Changes</GradBtn>
                </div>
              </>
            )}
          </SectionCard>

          {/* ── Account Information ── */}
          <SectionCard title="Account Information" icon={<Mail size={16} color="#9772F6" />}>
            <InfoRow label="Email Address" value={STUDENT_DATA.email} />
            <div style={{ padding: "10px 0 0" }}>
              <p style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, margin: "0 0 2px", fontFamily: QS, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Password</p>
              <p style={{ fontSize: 14, letterSpacing: 4, color: "#1F2937", margin: "0 0 14px", fontFamily: IN }}>••••••••••</p>
              <GradBtn small outline onClick={() => setShowPwModal(true)}><Lock size={13} />Change Password</GradBtn>
            </div>
          </SectionCard>

          {/* ── Boarding House Information ── */}
          <SectionCard title="Boarding House Information" icon={<Building2 size={16} color="#9772F6" />}>
            <LockedRow label="Boarding House"   value={BH_DATA.name}      />
            <LockedRow label="Address"          value={BH_DATA.address}   />
            <LockedRow label="Landlord"         value={BH_DATA.landlord}  />
            <LockedRow label="Landlord Contact" value={BH_DATA.contact}   />
            <LockedRow label="Room Assignment"  value={ROOM_DATA.name}    />
            <LockedRow label="Bed Number"       value={ROOM_DATA.bed}     />
            <LockedRow label="Move-in Date"     value={STAY_DATA.moveIn}  />
            <LockedRow label="Expected Move-out" value={STAY_DATA.moveOut} />
            <LockedRow label="Stay Duration"    value={STAY_DATA.stayLength} />
            <LockedRow label="Registration"     value={BH_DATA.regStatus} last />
            {/* Map placeholder matching landlord style */}
            <div style={{ marginTop: 14, borderRadius: 16, overflow: "hidden", height: 150, background: "linear-gradient(135deg,#E0E7FF,#EDE9FE)", position: "relative" as const, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="100%" height="150" style={{ position: "absolute" as const, inset: 0 }}>
                <line x1="0" y1="40"  x2="100%" y2="40"  stroke="#C4B5FD" strokeWidth="1" opacity="0.4"/>
                <line x1="0" y1="80"  x2="100%" y2="80"  stroke="#C4B5FD" strokeWidth="1" opacity="0.4"/>
                <line x1="0" y1="120" x2="100%" y2="120" stroke="#C4B5FD" strokeWidth="1" opacity="0.4"/>
                <line x1="80"  y1="0" x2="80"  y2="100%" stroke="#C4B5FD" strokeWidth="1" opacity="0.4"/>
                <line x1="160" y1="0" x2="160" y2="100%" stroke="#C4B5FD" strokeWidth="1" opacity="0.4"/>
                <line x1="240" y1="0" x2="240" y2="100%" stroke="#C4B5FD" strokeWidth="1" opacity="0.4"/>
              </svg>
              <div style={{ position: "relative" as const, display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 6 }}>
                <MapPin size={28} color="#9772F6" />
                <span style={{ fontSize: 11, fontWeight: 700, color: "#9772F6", fontFamily: QS }}>Pinned Location</span>
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <GradBtn small outline onClick={() => go("map")}><MapPin size={13} />Open Map</GradBtn>
            </div>
            <div style={{ marginTop: 10, padding: "10px 12px", background: "#FEF3C7", borderRadius: 12, display: "flex", gap: 8, alignItems: "flex-start" }}>
              <AlertCircle size={13} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }}/>
              <p style={{ margin: 0, fontSize: 11, color: "#92400E", fontFamily: IN, lineHeight: 1.5 }}>
                Boarding house details are managed by your landlord and cannot be edited here.
              </p>
            </div>
          </SectionCard>

          {/* ── Stay Overview ── */}
          <SectionCard title="Stay Overview" icon={<Calendar size={16} color="#9772F6" />}>
            <InfoRow label="Move-in Date"        value={STAY_DATA.moveIn}       />
            <InfoRow label="Expected Move-out"   value={STAY_DATA.moveOut}      />
            <InfoRow label="Total Stay Duration" value={STAY_DATA.stayLength}   />
            <InfoRow label="Days Stayed"         value={`${STAY_DATA.daysStayed} days`} />
            <InfoRow label="Days Remaining"      value={`${STAY_DATA.daysRemaining} days`} last />
            {/* Progress bar */}
            <div style={{ marginTop: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#374151", fontFamily: QS }}>Stay Progress</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#9772F6", fontFamily: QS }}>{stayPct}%</span>
              </div>
              <div style={{ height: 8, background: "#F3F4F6", borderRadius: 6, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 6, backgroundImage: GRAD, width: `${stayPct}%` }}/>
              </div>
              <p style={{ margin: "6px 0 0", fontSize: 11, color: "#9CA3AF", fontFamily: IN }}>{STAY_DATA.daysStayed} of {STAY_DATA.totalDays} days completed</p>
            </div>
          </SectionCard>

          {/* ── Payment Overview ── */}
          <SectionCard title="Payment Overview" icon={<CreditCard size={16} color="#9772F6" />}>
            <InfoRow label="Billing Period"  value={BILLING_DATA.period}                     />
            <InfoRow label="Monthly Rent"    value={`₱${BILLING_DATA.amount.toLocaleString()}`} />
            <InfoRow label="Water Bill"      value={`₱${BILLING_DATA.water.toLocaleString()}`}  />
            <InfoRow label="Electricity"     value={`₱${BILLING_DATA.electricity.toLocaleString()}`} />
            <InfoRow label="Garbage Fee"     value={`₱${BILLING_DATA.garbage.toLocaleString()}`} />
            <InfoRow label="Estimated Total" value={`₱${BILLING_DATA.total.toLocaleString()}`} />
            <InfoRow label="Due Date"        value={BILLING_DATA.dueDate} last />
            <div style={{ marginTop: 14 }}>
              <GradBtn small outline onClick={() => go("payments")}><CreditCard size={13} />View Payments</GradBtn>
            </div>
          </SectionCard>

          {/* ── App Info / About ── */}
          <div style={{ background: "white", borderRadius: 20, marginBottom: 14, boxShadow: "0 4px 20px rgba(0,0,0,.06)", overflow: "hidden" }}>
            {[
              { Icon: Shield,    label: "Privacy Policy",   desc: "How we handle your data"    },
              { Icon: BookOpen,  label: "Help & Support",   desc: "FAQs and contact support"   },
              { Icon: AlertCircle, label: "About DormiTrack", desc: "Version 1.0.0" },
            ].map(({ Icon, label, desc }, i, arr) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderBottom: i < arr.length - 1 ? "1px solid #F9FAFB" : "none", cursor: "pointer" }}>
                <div style={{ width: 34, height: 34, borderRadius: 11, background: "#F5F0FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={15} color="#9772F6"/>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#1F2937", fontFamily: QS }}>{label}</p>
                  <p style={{ margin: 0, fontSize: 11, color: "#9CA3AF", fontFamily: IN }}>{desc}</p>
                </div>
                <ChevronDown size={15} color="#D1D5DB" style={{ transform: "rotate(-90deg)" }}/>
              </div>
            ))}
          </div>

          {/* ── Logout ── */}
          <button onClick={() => go("landing")} style={{ width: "100%", background: "white", borderRadius: 20, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, border: "1px solid #FEE2E2", cursor: "pointer", boxShadow: "0 4px 20px rgba(0,0,0,.05)" }}>
            <div style={{ width: 36, height: 36, borderRadius: 12, background: "#FEE2E2", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <LogOut size={16} color="#DC2626" />
            </div>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#DC2626", fontFamily: QS }}>Log Out</span>
          </button>

        </div>
      </div>
    </div>
  );
}
