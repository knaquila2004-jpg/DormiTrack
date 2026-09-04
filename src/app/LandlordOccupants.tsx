import React, { useState, useRef } from "react";
import {
  Home, Users, CreditCard, User, Search, Filter, ChevronLeft,
  Phone, MessageCircle, MapPin, Calendar, Clock, ChevronRight,
  MoreVertical, X, CheckCircle, AlertCircle, ArrowRight, Edit,
  Trash2, Send, Star, FileText, Bell, UserCheck, Navigation,
  BookOpen, Plus, GraduationCap, Layers,
} from "lucide-react";
import { GRAD, GRAD_H, Screen } from "./shared";
import { NotificationType, addNotification } from "./notificationStore";
import { findStudentContactByName } from "./chatStore";
import { supabase } from "../lib/supabase";
import { getBoardingHousesForLandlord } from "./boardingHouseStore";
import { getCurrentOccupantsForLandlord, getOccupancyStatsForLandlord, endOccupancy, Occupant as RealOccupant } from "./registrationStore";
import { getStayChangeRequestsForLandlord, respondToStayChangeRequest, LandlordStayChangeRequest, StayUnit } from "./stayChangeStore";

const QS = "'Quicksand',sans-serif";
const IN = "'Inter',sans-serif";

// ── Types ──────────────────────────────────────────────────────────────────────

type OccupantStatus = "active" | "reserved" | "pendingMoveIn" | "movingOut" | "checkedOut";

type VisitEntry = {
  id: string; visitorName: string; relationship: string; purpose: string;
  date: string; timeIn: string; timeOut: string; duration: string;
  status: "completed" | "pending" | "rejected";
};

type TimelineEntry = {
  event: string; date: string; color: string;
};

type OccupantNote = { id: string; text: string; date: string };

type Occupant = {
  id: string; name: string; studentId: string; program: string; year: string;
  room: string; bed: string; moveIn: string; expectedMoveOut: string;
  status: OccupantStatus; contact: string; emergencyContact: string;
  parentName: string; parentContact: string; initials: string; grad: string; photo: string | null;
  visitors: VisitEntry[]; timeline: TimelineEntry[]; notes: OccupantNote[];
  totalDays: number; totalTransfers: number;
};

// ── Live data mapping ────────────────────────────────────────────────────────
// Visitor logs, timeline events, and free-text notes don't have a backing
// table yet — they render as real (empty) rather than fabricated until that
// lands. Everything else here is a real column from student_assignments.

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg,#9772F6,#7C3AED)", "linear-gradient(135deg,#3B82F6,#6366F1)",
  "linear-gradient(135deg,#10B981,#0EA5E9)", "linear-gradient(135deg,#EC4899,#9772F6)",
  "linear-gradient(135deg,#F59E0B,#EF4444)", "linear-gradient(135deg,#8B5CF6,#7549F6)",
];
function gradientFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length];
}
function initialsFor(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("");
}
function daysSince(dateStr: string) {
  const d = new Date(dateStr).getTime();
  if (Number.isNaN(d)) return 0;
  return Math.max(0, Math.round((Date.now() - d) / (1000 * 60 * 60 * 24)));
}

function mapRealOccupant(o: RealOccupant): Occupant {
  return {
    id: o.studentId, name: o.studentName, studentId: o.studentIdNo,
    program: o.program ?? "—", year: o.yearLevel ? `${o.yearLevel}${o.yearLevel === 1 ? "st" : o.yearLevel === 2 ? "nd" : o.yearLevel === 3 ? "rd" : "th"} Year` : "—",
    room: o.roomName, bed: o.bedLabel, moveIn: o.movedInAt, expectedMoveOut: o.movedOutAt ?? "—",
    status: "active", contact: o.contact ?? "—", emergencyContact: "—",
    parentName: "—", parentContact: "—", initials: initialsFor(o.studentName), grad: gradientFor(o.studentId), photo: o.photo,
    visitors: [], timeline: [], notes: [],
    totalDays: daysSince(o.movedInAt), totalTransfers: 0,
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function statusMeta(s: OccupantStatus): { label: string; color: string; bg: string } {
  return {
    active:       { label: "Active",           color: "#16A34A", bg: "#DCFCE7" },
    reserved:     { label: "Reserved",         color: "#D97706", bg: "#FEF3C7" },
    pendingMoveIn:{ label: "Pending Move-In",  color: "#3B82F6", bg: "#EFF6FF" },
    movingOut:    { label: "Moving Out",       color: "#EF4444", bg: "#FEE2E2" },
    checkedOut:   { label: "Checked Out",      color: "#6B7280", bg: "#F3F4F6" },
  }[s];
}

function visitStatusMeta(s: "completed"|"pending"|"rejected") {
  return {
    completed: { label: "Completed", color: "#16A34A", bg: "#DCFCE7" },
    pending:   { label: "Pending",   color: "#D97706", bg: "#FEF3C7" },
    rejected:  { label: "Rejected",  color: "#EF4444", bg: "#FEE2E2" },
  }[s];
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Pill({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 9px", borderRadius: 20, background: bg, color, fontFamily: QS }}>
      {label}
    </span>
  );
}

function SH({ title, sub, action, onAction }: { title: string; sub?: string; action?: string; onAction?: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
      <div>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#1F2937", fontFamily: QS }}>{title}</p>
        {sub && <p style={{ margin: "2px 0 0", fontSize: 10, color: "#9CA3AF", fontFamily: IN }}>{sub}</p>}
      </div>
      {action && (
        <button onClick={onAction} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, color: "#9772F6", fontFamily: QS }}>{action}</button>
      )}
    </div>
  );
}

// ── Profile Modal ──────────────────────────────────────────────────────────────

function OccupantProfileModal({
  occupant, onClose, onMessage, stayChangeRequest, onDecideStayChange,
}: {
  occupant: Occupant; onClose: () => void; onMessage: (o: Occupant) => void;
  stayChangeRequest?: LandlordStayChangeRequest;
  onDecideStayChange?: (id: string, approve: boolean) => Promise<void>;
}) {
  const [tab, setTab] = useState<"info"|"visitors"|"timeline"|"notes">("info");
  const [notes, setNotes] = useState<OccupantNote[]>(occupant.notes);
  const [noteInput, setNoteInput] = useState("");
  const [decidingStay, setDecidingStay] = useState(false);
  const sm = statusMeta(occupant.status);

  const addNote = () => {
    if (!noteInput.trim()) return;
    const n: OccupantNote = { id: Date.now().toString(), text: noteInput.trim(), date: "Dec 18, 2024" };
    setNotes(prev => [n, ...prev]);
    setNoteInput("");
  };

  const TABS: { id: typeof tab; label: string }[] = [
    { id: "info",     label: "Info"     },
    { id: "visitors", label: "Visitors" },
    { id: "timeline", label: "Timeline" },
    { id: "notes",    label: "Notes"    },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.52)", zIndex: 80, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div style={{ background: "#F3F4F8", borderRadius: "24px 24px 0 0", height: "92%", display: "flex", flexDirection: "column" }}>

        {/* Modal header */}
        <div style={{ flexShrink: 0, background: "white", borderRadius: "24px 24px 0 0", padding: "18px 20px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", backgroundImage: occupant.grad, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
              {occupant.photo ? <img src={occupant.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}/> : <span style={{ color: "white", fontWeight: 800, fontSize: 16, fontFamily: QS }}>{occupant.initials}</span>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#1F2937", fontFamily: QS }}>{occupant.name}</p>
                <Pill label={sm.label} color={sm.color} bg={sm.bg} />
              </div>
              <p style={{ margin: 0, fontSize: 11, color: "#9CA3AF", fontFamily: IN }}>{occupant.studentId} · {occupant.program}</p>
            </div>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, background: "#F3F4F6", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <X size={15} color="#6B7280" />
            </button>
          </div>

          {/* Quick stats row */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {[
              { label: "Days Stayed",   value: String(occupant.totalDays) },
              { label: "Transfers",     value: String(occupant.totalTransfers) },
              { label: "Visitor Records", value: String(occupant.visitors.length) },
            ].map(s => (
              <div key={s.label} style={{ flex: 1, background: "#F5F0FF", borderRadius: 12, padding: "8px 0", textAlign: "center" }}>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#9772F6", fontFamily: QS }}>{s.value}</p>
                <p style={{ margin: 0, fontSize: 9, color: "#6B7280", fontFamily: IN }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Tab bar */}
          <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #F3F4F6" }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: "10px 0", border: "none", background: "none", cursor: "pointer", fontSize: 12, fontWeight: 800, fontFamily: QS,
                color: tab === t.id ? "#9772F6" : "#9CA3AF",
                borderBottom: tab === t.id ? "2px solid #9772F6" : "2px solid transparent",
              }}>{t.label}</button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" as const, padding: "16px 20px 24px" }}>

          {/* ── INFO TAB ── */}
          {tab === "info" && (
            <>
              {/* Pending stay-change request — a student-proposed edit to their own
                  Move-In/Move-Out/Duration, awaiting this landlord's confirmation before
                  the real student_assignments/student_boarding_registrations rows change. */}
              {stayChangeRequest && (
                <div style={{ background: "white", borderRadius: 18, padding: 16, marginBottom: 12, boxShadow: "0 2px 8px rgba(0,0,0,.04)", border: "1.5px solid #FDE68A" }}>
                  <SH title="Stay Change Requested" sub="Awaiting your confirmation" />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                    {[
                      ["Current Move-In", stayChangeRequest.currentMoveIn, "Requested Move-In", stayChangeRequest.requestedMoveIn],
                      ["Current Move-Out", stayChangeRequest.currentMoveOut ?? "—", "Requested Move-Out", stayChangeRequest.requestedMoveOut ?? "—"],
                      ["Current Duration",
                        stayChangeRequest.currentStayCount && stayChangeRequest.currentStayUnit ? `${stayChangeRequest.currentStayCount} ${stayChangeRequest.currentStayUnit}` : "—",
                        "Requested Duration",
                        stayChangeRequest.requestedStayCount && stayChangeRequest.requestedStayUnit ? `${stayChangeRequest.requestedStayCount} ${stayChangeRequest.requestedStayUnit}` : "—"],
                    ].flatMap(([curLabel, curVal, reqLabel, reqVal], i) => ([
                      <div key={`${i}-cur`}>
                        <p style={{ margin: "0 0 2px", fontSize: 9, color: "#9CA3AF", fontFamily: QS, textTransform: "uppercase" as const, fontWeight: 700 }}>{curLabel}</p>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#1F2937", fontFamily: QS }}>{curVal}</p>
                      </div>,
                      <div key={`${i}-req`}>
                        <p style={{ margin: "0 0 2px", fontSize: 9, color: "#D97706", fontFamily: QS, textTransform: "uppercase" as const, fontWeight: 700 }}>{reqLabel}</p>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#D97706", fontFamily: QS }}>{reqVal}</p>
                      </div>,
                    ]))}
                  </div>
                  {stayChangeRequest.studentNote && (
                    <div style={{ marginBottom: 12, padding: "8px 10px", background: "#F9FAFB", borderRadius: 10 }}>
                      <p style={{ margin: 0, fontSize: 11, color: "#6B7280", fontFamily: IN, lineHeight: 1.5 }}>"{stayChangeRequest.studentNote}"</p>
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button disabled={decidingStay} onClick={async () => { setDecidingStay(true); await onDecideStayChange?.(stayChangeRequest.id, false); setDecidingStay(false); }} style={{ flex: 1, padding: "10px 0", borderRadius: 12, border: "none", background: "#FEE2E2", color: "#EF4444", fontSize: 12, fontWeight: 800, fontFamily: QS, cursor: decidingStay ? "default" : "pointer", opacity: decidingStay ? 0.7 : 1 }}>Reject</button>
                    <button disabled={decidingStay} onClick={async () => { setDecidingStay(true); await onDecideStayChange?.(stayChangeRequest.id, true); setDecidingStay(false); }} style={{ flex: 1, padding: "10px 0", borderRadius: 12, border: "none", backgroundImage: GRAD, color: "white", fontSize: 12, fontWeight: 800, fontFamily: QS, cursor: decidingStay ? "default" : "pointer", opacity: decidingStay ? 0.7 : 1 }}>Approve</button>
                  </div>
                </div>
              )}

              {/* BH info */}
              <div style={{ background: "white", borderRadius: 18, padding: 16, marginBottom: 12, boxShadow: "0 2px 8px rgba(0,0,0,.04)" }}>
                <SH title="Boarding House Info" />
                {[
                  { label: "Room",              value: occupant.room },
                  { label: "Bed",               value: occupant.bed },
                  { label: "Move-In Date",       value: occupant.moveIn },
                  { label: "Expected Move-Out",  value: occupant.expectedMoveOut },
                  { label: "Length of Stay",     value: `${occupant.totalDays} days` },
                ].map((r, i, arr) => (
                  <div key={r.label} style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "9px 0", borderBottom: i < arr.length - 1 ? "1px solid #F3F4F6" : "none" }}>
                    <span style={{ fontSize: 12, color: "#9CA3AF", fontFamily: IN }}>{r.label}</span>
                    <span style={{ fontSize: 12, color: "#1F2937", fontWeight: 700, fontFamily: QS }}>{r.value}</span>
                  </div>
                ))}
              </div>

              {/* Student info */}
              <div style={{ background: "white", borderRadius: 18, padding: 16, marginBottom: 12, boxShadow: "0 2px 8px rgba(0,0,0,.04)" }}>
                <SH title="Student Information" sub="Read-only — provided by the school" />
                {[
                  { label: "Full Name",    value: occupant.name },
                  { label: "Student ID",   value: occupant.studentId },
                  { label: "Program",      value: occupant.program },
                  { label: "Year Level",   value: occupant.year },
                  { label: "Contact",      value: occupant.contact },
                  { label: "Emergency",    value: occupant.emergencyContact },
                ].map((r, i, arr) => (
                  <div key={r.label} style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "9px 0", borderBottom: i < arr.length - 1 ? "1px solid #F3F4F6" : "none" }}>
                    <span style={{ fontSize: 12, color: "#9CA3AF", fontFamily: IN }}>{r.label}</span>
                    <span style={{ fontSize: 12, color: "#1F2937", fontWeight: 700, fontFamily: QS }}>{r.value}</span>
                  </div>
                ))}
              </div>

              {/* Parent / guardian */}
              <div style={{ background: "white", borderRadius: 18, padding: 16, marginBottom: 12, boxShadow: "0 2px 8px rgba(0,0,0,.04)" }}>
                <SH title="Parent / Guardian" />
                {[
                  { label: "Name",    value: occupant.parentName    },
                  { label: "Contact", value: occupant.parentContact },
                ].map((r, i, arr) => (
                  <div key={r.label} style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "9px 0", borderBottom: i < arr.length - 1 ? "1px solid #F3F4F6" : "none" }}>
                    <span style={{ fontSize: 12, color: "#9CA3AF", fontFamily: IN }}>{r.label}</span>
                    <span style={{ fontSize: 12, color: "#1F2937", fontWeight: 700, fontFamily: QS }}>{r.value}</span>
                  </div>
                ))}
              </div>

              {/* Quick actions */}
              <div style={{ background: "white", borderRadius: 18, padding: 16, boxShadow: "0 2px 8px rgba(0,0,0,.04)" }}>
                <SH title="Quick Actions" />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {[
                    { icon: MessageCircle, label: "Message",         color: "#9772F6", bg: "#F5F0FF", action: () => onMessage(occupant) },
                    { icon: Phone,         label: "Call Parent",     color: "#16A34A", bg: "#DCFCE7", action: () => {} },
                    { icon: ArrowRight,    label: "Transfer Room",   color: "#3B82F6", bg: "#EFF6FF", action: () => {} },
                    { icon: UserCheck,     label: "Update Status",   color: "#D97706", bg: "#FEF3C7", action: () => {} },
                  ].map(({ icon: IC, label, color, bg, action }) => (
                    <button key={label} onClick={action} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 14, background: bg, border: "none", cursor: "pointer" }}>
                      <IC size={14} color={color} />
                      <span style={{ fontSize: 11, fontWeight: 700, color, fontFamily: QS }}>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── VISITORS TAB ── */}
          {tab === "visitors" && (
            <>
              {/* Summary mini-cards */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
                {[
                  { label: "Total",     value: occupant.visitors.length,                                     color: "#9772F6", bg: "#F5F0FF" },
                  { label: "This Month",value: occupant.visitors.filter(v => v.date.includes("Dec")).length, color: "#3B82F6", bg: "#EFF6FF" },
                  { label: "Last Visit",value: occupant.visitors.filter(v => v.status === "completed").length > 0 ? occupant.visitors.filter(v => v.status === "completed").slice(-1)[0].date.split(",")[0] : "—", color: "#16A34A", bg: "#DCFCE7" },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} style={{ background: bg, borderRadius: 14, padding: "10px 0", textAlign: "center" }}>
                    <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color, fontFamily: QS }}>{value}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 9, color: "#6B7280", fontFamily: IN }}>{label}</p>
                  </div>
                ))}
              </div>

              {occupant.visitors.length === 0 ? (
                <div style={{ background: "white", borderRadius: 18, padding: "28px 16px", textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,.04)" }}>
                  <Users size={28} color="#D1D5DB" style={{ marginBottom: 8 }} />
                  <p style={{ fontSize: 13, color: "#9CA3AF", margin: 0, fontFamily: IN }}>No visitor records yet.</p>
                </div>
              ) : occupant.visitors.map((v) => {
                const vsm = visitStatusMeta(v.status);
                return (
                  <div key={v.id} style={{ background: "white", borderRadius: 18, padding: 14, marginBottom: 10, boxShadow: "0 2px 8px rgba(0,0,0,.04)" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                      <div>
                        <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 800, color: "#1F2937", fontFamily: QS }}>{v.visitorName}</p>
                        <p style={{ margin: 0, fontSize: 10, color: "#9CA3AF", fontFamily: IN }}>{v.relationship} · {v.purpose}</p>
                      </div>
                      <Pill label={vsm.label} color={vsm.color} bg={vsm.bg} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                      {[
                        { label: "Date",     value: v.date },
                        { label: "Time In",  value: v.timeIn },
                        { label: "Duration", value: v.duration },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <p style={{ margin: 0, fontSize: 9, color: "#C4C9D4", fontFamily: IN }}>{label}</p>
                          <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: "#374151", fontFamily: IN }}>{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* ── TIMELINE TAB ── */}
          {tab === "timeline" && (
            <div style={{ background: "white", borderRadius: 18, padding: "16px 16px", boxShadow: "0 2px 8px rgba(0,0,0,.04)" }}>
              {occupant.timeline.map((t, i) => (
                <div key={i} style={{ display: "flex", gap: 12, paddingBottom: i < occupant.timeline.length - 1 ? 16 : 0, position: "relative" }}>
                  {/* Connector line */}
                  {i < occupant.timeline.length - 1 && (
                    <div style={{ position: "absolute", left: 10, top: 22, width: 2, bottom: 0, background: "#F3F4F6" }} />
                  )}
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: t.color + "20", border: `2px solid ${t.color}`, flexShrink: 0, zIndex: 1 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: "0 0 2px", fontSize: 12, fontWeight: 700, color: "#1F2937", fontFamily: IN }}>{t.event}</p>
                    <p style={{ margin: 0, fontSize: 10, color: "#9CA3AF", fontFamily: IN }}>{t.date}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── NOTES TAB ── */}
          {tab === "notes" && (
            <>
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <input
                  value={noteInput}
                  onChange={e => setNoteInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addNote()}
                  placeholder="Add a private note…"
                  style={{ flex: 1, padding: "10px 14px", borderRadius: 14, border: "1.5px solid #E5E7EB", outline: "none", fontSize: 12, fontFamily: IN, color: "#1F2937" }}
                />
                <button onClick={addNote} style={{ width: 42, height: 42, borderRadius: 14, backgroundImage: GRAD, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Plus size={16} color="white" />
                </button>
              </div>
              {notes.length === 0 ? (
                <div style={{ background: "white", borderRadius: 18, padding: "28px 16px", textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,.04)" }}>
                  <FileText size={28} color="#D1D5DB" style={{ marginBottom: 8 }} />
                  <p style={{ fontSize: 13, color: "#9CA3AF", margin: 0, fontFamily: IN }}>No notes yet. Add your first note above.</p>
                </div>
              ) : notes.map(n => (
                <div key={n.id} style={{ background: "white", borderRadius: 16, padding: "12px 14px", marginBottom: 10, boxShadow: "0 2px 8px rgba(0,0,0,.04)", display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: "#F5F0FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <FileText size={14} color="#9772F6" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: "0 0 3px", fontSize: 12, color: "#1F2937", fontFamily: IN, lineHeight: 1.5 }}>{n.text}</p>
                    <p style={{ margin: 0, fontSize: 10, color: "#9CA3AF", fontFamily: IN }}>{n.date} · Landlord</p>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Remove Confirmation Dialog ─────────────────────────────────────────────────

function RemoveDialog({ occupant, onConfirm, onCancel }: { occupant: Occupant; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 90, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px" }}>
      <div style={{ background: "white", borderRadius: 24, padding: 24, width: "100%" }}>
        <div style={{ width: 48, height: 48, borderRadius: 16, background: "#FEE2E2", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
          <Trash2 size={20} color="#EF4444" />
        </div>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: "#1F2937", margin: "0 0 8px", fontFamily: QS }}>Remove Occupant?</h3>
        <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 20px", fontFamily: IN, lineHeight: 1.6 }}>
          Are you sure you want to remove <strong>{occupant.name}</strong>? This will update room availability. The student's boarding house stay history will be archived.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "11px 0", borderRadius: 14, border: "1.5px solid #E5E7EB", background: "none", color: "#6B7280", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: QS }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: "11px 0", borderRadius: 14, background: "#EF4444", border: "none", color: "white", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: QS }}>Remove</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────

type FilterType = "all" | OccupantStatus | "withVisitors" | "noVisitors";
type SortType = "nameAsc" | "nameDesc" | "newestMoveIn" | "oldestMoveIn" | "room";

export function LandlordOccupantsScreen({
  go, onOpenChat, pendingDeepLink, onDeepLinkConsumed,
}: {
  go: (s: Screen) => void;
  onOpenChat?: (contactId: string) => void;
  pendingDeepLink?: { type: NotificationType; relatedId?: string } | null;
  onDeepLinkConsumed?: () => void;
}) {
  const [occupants, setOccupants] = useState<Occupant[]>([]);
  const [landlordId, setLandlordId] = useState<string | null>(null);
  const [bhName, setBhName] = useState("");
  const [availableBeds, setAvailableBeds] = useState(0);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [sort, setSort] = useState<SortType>("nameAsc");
  const [profileOccupant, setProfileOccupant] = useState<Occupant | null>(null);
  const [removeOccupant, setRemoveOccupant] = useState<Occupant | null>(null);
  const [stayChangeRequests, setStayChangeRequests] = useState<LandlordStayChangeRequest[]>([]);

  // Independent fetches, so each sets its own state as soon as it resolves rather than
  // being batched behind Promise.all — a "check-in"/"check-out" notification deep-link
  // only needs `occupants`, and waiting on all three together meant it sat blocked on
  // whichever of the other two queries happened to be slowest.
  const refresh = (uid: string) => {
    getCurrentOccupantsForLandlord(uid).then(realOccupants => setOccupants(realOccupants.map(mapRealOccupant)));
    getBoardingHousesForLandlord(uid).then(bhs => setBhName(bhs[0]?.name ?? ""));
    getOccupancyStatsForLandlord(uid).then(stats => setAvailableBeds(stats.availableBeds));
    getStayChangeRequestsForLandlord(uid).then(setStayChangeRequests);
  };

  React.useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      const uid = session?.user?.id;
      if (!uid || !active) return;
      setLandlordId(uid);
      refresh(uid);
    });
    return () => { active = false; };
  }, []);

  // Opened from a "Student checked in/out" (or "stay-change") notification tap — jump
  // straight to that occupant's profile once the real roster has actually loaded
  // (relatedId is the student's own user id, which is also this list's occupant id).
  React.useEffect(() => {
    const types: (NotificationType | undefined)[] = ["check-in", "check-out", "stay-change"];
    if (!types.includes(pendingDeepLink?.type) || !pendingDeepLink?.relatedId) return;
    const match = occupants.find(o => o.id === pendingDeepLink.relatedId);
    if (match) { setProfileOccupant(match); onDeepLinkConsumed?.(); }
  }, [pendingDeepLink, occupants, onDeepLinkConsumed]);

  // A separate notification from "New Visitor Logged"-style events, going landlord →
  // student once the decision is actually made real (see stayChangeStore.ts).
  const handleDecideStayChange = async (id: string, approve: boolean) => {
    const req = stayChangeRequests.find(r => r.id === id);
    const res = await respondToStayChangeRequest(id, approve);
    if (res.ok === false) { console.error("respondToStayChangeRequest failed:", res.error); return; }
    if (landlordId) refresh(landlordId);
    setProfileOccupant(null);
    if (req) {
      addNotification({
        userId: req.studentId, type: "stay-change",
        title: approve ? "Stay Change Approved" : "Stay Change Declined",
        description: approve
          ? "Your landlord approved your requested move-in/move-out change."
          : "Your landlord declined your requested move-in/move-out change.",
        destination: "occupants", relatedId: id,
      });
    }
  };

  // derived stats
  const total     = occupants.length;
  const active    = occupants.filter(o => o.status === "active").length;
  const available = availableBeds;
  const movingOut = occupants.filter(o => o.status === "movingOut").length;
  const withVis   = occupants.filter(o => o.visitors.length > 0).length;

  const filtered = occupants.filter(o => {
    const q = search.toLowerCase();
    const matchQ = !q || o.name.toLowerCase().includes(q) || o.studentId.toLowerCase().includes(q) || o.room.toLowerCase().includes(q);
    const matchF =
      filter === "all"          ? true :
      filter === "withVisitors" ? o.visitors.length > 0 :
      filter === "noVisitors"   ? o.visitors.length === 0 :
      o.status === filter;
    return matchQ && matchF;
  }).sort((a, b) => {
    if (sort === "nameDesc")     return b.name.localeCompare(a.name);
    if (sort === "newestMoveIn") return b.moveIn.localeCompare(a.moveIn);
    if (sort === "oldestMoveIn") return a.moveIn.localeCompare(b.moveIn);
    if (sort === "room")         return a.room.localeCompare(b.room);
    return a.name.localeCompare(b.name);
  });

  const doRemove = async (o: Occupant) => {
    const res = await endOccupancy(o.id);
    if (res.ok === false) { console.error("endOccupancy failed:", res.error); return; }
    setOccupants(prev => prev.filter(p => p.id !== o.id));
    setRemoveOccupant(null);
    setProfileOccupant(null);
    if (landlordId) refresh(landlordId);
  };

  const FILTERS: { id: FilterType; label: string }[] = [
    { id: "all",          label: "All" },
    { id: "active",       label: "Active" },
    { id: "reserved",     label: "Reserved" },
    { id: "pendingMoveIn",label: "Move-In" },
    { id: "movingOut",    label: "Moving Out" },
    { id: "withVisitors", label: "With Visitors" },
    { id: "noVisitors",   label: "No Visitors" },
  ];

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#F3F4F8", position: "relative" }}>

      {/* ── HEADER ── */}
      <div style={{ flexShrink: 0, backgroundImage: GRAD_H, paddingTop: 52, paddingBottom: 20, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,.06)" }} />
        <div style={{ padding: "0 16px" }}>
          <p style={{ color: "rgba(255,255,255,.65)", fontSize: 11, margin: "0 0 2px", fontFamily: IN }}>{bhName || "—"}</p>
          <h1 style={{ color: "white", fontSize: 20, fontWeight: 800, margin: "0 0 16px", fontFamily: QS }}>Occupants</h1>

          {/* 6 summary cards — 3+3 grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
            {[
              { label: "Total",         value: total,           color: "#fff",     bg: "rgba(255,255,255,.18)" },
              { label: "Active",        value: active,          color: "#4ADE80",  bg: "rgba(74,222,128,.18)"  },
              { label: "Avail. Beds",   value: available,       color: "#60A5FA",  bg: "rgba(96,165,250,.18)"  },
              { label: "Moving Out",    value: movingOut,       color: "#FCA5A5",  bg: "rgba(252,165,165,.18)" },
              { label: "Vacated/Mo.",   value: 0,               color: "#D1D5DB",  bg: "rgba(255,255,255,.1)"  },
              { label: "w/ Visitors",   value: withVis,         color: "#F9A8D4",  bg: "rgba(249,168,212,.18)" },
            ].map(({ label, value, color, bg }) => (
              <div key={label} style={{ borderRadius: 14, padding: "10px 0", textAlign: "center", background: bg }}>
                <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color, fontFamily: QS }}>{value}</p>
                <p style={{ margin: "2px 0 0", fontSize: 9, color: "rgba(255,255,255,.65)", fontFamily: IN }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── SEARCH + SORT ── */}
      <div style={{ flexShrink: 0, background: "white", padding: "12px 16px 0", borderBottom: "1px solid #F3F4F6" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <div style={{ flex: 1, background: "#F3F4F6", borderRadius: 13, padding: "9px 12px", display: "flex", alignItems: "center", gap: 8 }}>
            <Search size={14} color="#9CA3AF" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Name, ID, or room…"
              style={{ flex: 1, border: "none", outline: "none", fontSize: 13, fontFamily: IN, color: "#1F2937", background: "transparent" }}
            />
          </div>
          <select value={sort} onChange={e => setSort(e.target.value as SortType)} style={{ padding: "8px 10px", borderRadius: 12, border: "1px solid #E5E7EB", fontSize: 11, fontFamily: QS, color: "#374151", background: "white", cursor: "pointer", outline: "none" }}>
            <option value="nameAsc">A–Z</option>
            <option value="nameDesc">Z–A</option>
            <option value="newestMoveIn">Newest</option>
            <option value="oldestMoveIn">Oldest</option>
            <option value="room">Room</option>
          </select>
        </div>
        {/* Filter chips */}
        <div style={{ display: "flex", gap: 6, paddingBottom: 12, overflowX: "auto", scrollbarWidth: "none" as const }}>
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{ flexShrink: 0, padding: "5px 13px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: QS,
              background: filter === f.id ? "#9772F6" : "#F3F4F6",
              color: filter === f.id ? "white" : "#6B7280",
              boxShadow: filter === f.id ? "0 2px 8px rgba(151,114,246,.25)" : "none",
            }}>{f.label}</button>
          ))}
        </div>
      </div>

      {/* ── LIST ── */}
      <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" as const, padding: "12px 16px 20px" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", paddingTop: 48 }}>
            <Users size={36} color="#D1D5DB" />
            <p style={{ fontSize: 13, color: "#9CA3AF", marginTop: 12, fontFamily: IN }}>No occupants match your search.</p>
          </div>
        ) : filtered.map(o => {
          const sm = statusMeta(o.status);
          const hasPendingStayChange = stayChangeRequests.some(r => r.studentId === o.id && r.status === "pending");
          return (
            <div key={o.id} style={{ background: "white", borderRadius: 20, padding: 14, marginBottom: 10, boxShadow: "0 2px 10px rgba(0,0,0,.05)" }}>
              {/* Top row */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", backgroundImage: o.grad, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                  {o.photo ? <img src={o.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}/> : <span style={{ color: "white", fontWeight: 800, fontSize: 14, fontFamily: QS }}>{o.initials}</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2, flexWrap: "wrap" as const }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#1F2937", fontFamily: QS }}>{o.name}</p>
                    <Pill label={sm.label} color={sm.color} bg={sm.bg} />
                    {hasPendingStayChange && <Pill label="Stay Change Requested" color="#D97706" bg="#FEF3C7" />}
                  </div>
                  <p style={{ margin: 0, fontSize: 10, color: "#9CA3AF", fontFamily: IN }}>{o.studentId} · {o.year}</p>
                </div>
              </div>

              {/* Info badges */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const, marginBottom: 12 }}>
                {[
                  { icon: Layers,    label: o.room },
                  { icon: BookOpen,  label: o.program },
                  { icon: Calendar,  label: `In: ${o.moveIn}` },
                  { icon: Users,     label: `${o.visitors.length} visitor${o.visitors.length !== 1 ? "s" : ""}` },
                ].map(({ icon: IC, label }) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 9px", borderRadius: 10, background: "#F9FAFB" }}>
                    <IC size={10} color="#9CA3AF" />
                    <span style={{ fontSize: 10, color: "#6B7280", fontFamily: IN }}>{label}</span>
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
                <button onClick={() => setProfileOccupant(o)} style={{ padding: "7px 13px", borderRadius: 11, background: "#F5F0FF", color: "#9772F6", fontSize: 11, fontWeight: 800, border: "none", cursor: "pointer", fontFamily: QS }}>View Profile</button>
                <button onClick={() => setProfileOccupant(o)} style={{ padding: "7px 13px", borderRadius: 11, background: "#EFF6FF", color: "#3B82F6", fontSize: 11, fontWeight: 800, border: "none", cursor: "pointer", fontFamily: QS }}>Edit</button>
                <button onClick={() => setProfileOccupant(o)} style={{ padding: "7px 13px", borderRadius: 11, background: "#FEF3C7", color: "#D97706", fontSize: 11, fontWeight: 800, border: "none", cursor: "pointer", fontFamily: QS }}>Transfer</button>
                <button onClick={() => setRemoveOccupant(o)} style={{ padding: "7px 13px", borderRadius: 11, background: "#FEE2E2", color: "#EF4444", fontSize: 11, fontWeight: 800, border: "none", cursor: "pointer", fontFamily: QS }}>Remove</button>
                <button onClick={() => setProfileOccupant(o)} style={{ width: 32, height: 32, borderRadius: 10, background: "#DCFCE7", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <MessageCircle size={14} color="#16A34A" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── PROFILE MODAL ── */}
      {profileOccupant && (
        <OccupantProfileModal
          occupant={profileOccupant}
          onClose={() => setProfileOccupant(null)}
          onMessage={o => {
            setProfileOccupant(null);
            const contact = findStudentContactByName(o.name);
            if (contact && onOpenChat) onOpenChat(contact.id); else go("messages");
          }}
          stayChangeRequest={stayChangeRequests.find(r => r.studentId === profileOccupant.id && r.status === "pending")}
          onDecideStayChange={handleDecideStayChange}
        />
      )}

      {/* ── REMOVE DIALOG ── */}
      {removeOccupant && (
        <RemoveDialog
          occupant={removeOccupant}
          onConfirm={() => doRemove(removeOccupant)}
          onCancel={() => setRemoveOccupant(null)}
        />
      )}
    </div>
  );
}
