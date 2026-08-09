import React, { useState, useRef } from "react";
import {
  Home, Users, CreditCard, User, Search, Filter, ChevronLeft,
  Phone, MessageCircle, MapPin, Calendar, Clock, ChevronRight,
  MoreVertical, X, CheckCircle, AlertCircle, ArrowRight, Edit,
  Trash2, Send, Star, FileText, Bell, UserCheck, Navigation,
  BookOpen, Plus, GraduationCap, Layers,
} from "lucide-react";
import { GRAD, GRAD_H, Screen, NavTab } from "./shared";
import { findStudentContactByName } from "./chatStore";

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
  parentName: string; parentContact: string; initials: string; grad: string;
  visitors: VisitEntry[]; timeline: TimelineEntry[]; notes: OccupantNote[];
  totalDays: number; totalTransfers: number;
};

// ── Seed data ─────────────────────────────────────────────────────────────────

const SEED_OCCUPANTS: Occupant[] = [
  {
    id: "o1", name: "Maria Santos", studentId: "2024-0012", program: "BS Nursing", year: "2nd Year",
    room: "Room A", bed: "Bed 1", moveIn: "Aug 5, 2024", expectedMoveOut: "May 30, 2025",
    status: "active", contact: "09171234001", emergencyContact: "09171234002",
    parentName: "Rosa Santos", parentContact: "09171234003", initials: "MS",
    grad: "linear-gradient(135deg,#9772F6,#7C3AED)", totalDays: 135, totalTransfers: 0,
    visitors: [
      { id: "vv1", visitorName: "Rosa Santos", relationship: "Mother", purpose: "Bring supplies", date: "Dec 10, 2024", timeIn: "10:00 AM", timeOut: "12:00 PM", duration: "2h 00m", status: "completed" },
      { id: "vv2", visitorName: "Carl Reyes",  relationship: "Friend",  purpose: "Thesis help",   date: "Dec 18, 2024", timeIn: "2:00 PM",  timeOut: "5:00 PM",  duration: "—",       status: "pending" },
    ],
    timeline: [
      { event: "Reservation Approved",           date: "Jul 28, 2024",  color: "#16A34A" },
      { event: "Moved Into Room A · Bed 1",      date: "Aug 5, 2024",   color: "#9772F6" },
      { event: "Visitor Rosa Santos approved",   date: "Dec 10, 2024",  color: "#EC4899" },
      { event: "Visitor Rosa Santos checked in", date: "Dec 10, 2024",  color: "#EC4899" },
      { event: "Visitor Rosa Santos checked out",date: "Dec 10, 2024",  color: "#6B7280" },
    ],
    notes: [{ id: "n1", text: "Pays rent on time every month.", date: "Nov 1, 2024" }],
  },
  {
    id: "o2", name: "Kevin Cruz", studentId: "2024-0033", program: "BS Computer Science", year: "3rd Year",
    room: "Room C", bed: "Bed 2", moveIn: "Aug 10, 2024", expectedMoveOut: "May 30, 2025",
    status: "active", contact: "09221234001", emergencyContact: "09221234002",
    parentName: "Rosa Cruz", parentContact: "09221234003", initials: "KC",
    grad: "linear-gradient(135deg,#3B82F6,#6366F1)", totalDays: 130, totalTransfers: 1,
    visitors: [
      { id: "vv3", visitorName: "Ben Torres", relationship: "Father", purpose: "Personal visit", date: "Dec 17, 2024", timeIn: "9:05 AM", timeOut: "10:58 AM", duration: "1h 53m", status: "completed" },
    ],
    timeline: [
      { event: "Reservation Approved",           date: "Aug 2, 2024",   color: "#16A34A" },
      { event: "Moved Into Room B · Bed 3",      date: "Aug 10, 2024",  color: "#9772F6" },
      { event: "Transferred to Room C · Bed 2",  date: "Sep 15, 2024",  color: "#F59E0B" },
      { event: "Visitor Ben Torres checked in",  date: "Dec 17, 2024",  color: "#EC4899" },
    ],
    notes: [
      { id: "n2", text: "Requested room transfer due to noise.", date: "Sep 14, 2024" },
      { id: "n3", text: "Friendly and cooperative tenant.",       date: "Oct 5, 2024"  },
    ],
  },
  {
    id: "o3", name: "Lara Mendoza", studentId: "2024-0041", program: "BS Nursing", year: "1st Year",
    room: "Room B", bed: "Bed 1", moveIn: "Dec 15, 2024", expectedMoveOut: "May 30, 2025",
    status: "pendingMoveIn", contact: "09331234001", emergencyContact: "09331234002",
    parentName: "Carla Mendoza", parentContact: "09331234003", initials: "LM",
    grad: "linear-gradient(135deg,#10B981,#0EA5E9)", totalDays: 3, totalTransfers: 0,
    visitors: [],
    timeline: [
      { event: "Registration Submitted",         date: "Dec 12, 2024",  color: "#3B82F6" },
      { event: "Reservation Approved",           date: "Dec 14, 2024",  color: "#16A34A" },
      { event: "Assigned Room B · Bed 1",        date: "Dec 14, 2024",  color: "#9772F6" },
    ],
    notes: [],
  },
  {
    id: "o4", name: "Sofia Castillo", studentId: "2024-0043", program: "BS Education", year: "1st Year",
    room: "Room D", bed: "Bed 3", moveIn: "Aug 8, 2024", expectedMoveOut: "Dec 31, 2024",
    status: "movingOut", contact: "09441234001", emergencyContact: "09441234002",
    parentName: "Ana Castillo", parentContact: "09441234003", initials: "SC",
    grad: "linear-gradient(135deg,#EC4899,#9772F6)", totalDays: 132, totalTransfers: 0,
    visitors: [
      { id: "vv4", visitorName: "Ana Gomez", relationship: "Cousin", purpose: "Birthday cake", date: "Dec 16, 2024", timeIn: "—", timeOut: "—", duration: "—", status: "rejected" },
    ],
    timeline: [
      { event: "Reservation Approved",              date: "Aug 1, 2024",   color: "#16A34A" },
      { event: "Moved Into Room D · Bed 3",         date: "Aug 8, 2024",   color: "#9772F6" },
      { event: "Visitor request rejected",           date: "Dec 16, 2024",  color: "#EF4444" },
      { event: "Scheduled Move-Out",                 date: "Dec 31, 2024",  color: "#F59E0B" },
    ],
    notes: [{ id: "n4", text: "Moving out end of December. Room to be vacated.", date: "Dec 1, 2024" }],
  },
  {
    id: "o5", name: "John Doe", studentId: "2024-0007", program: "BS Agriculture", year: "2nd Year",
    room: "Room A", bed: "Bed 2", moveIn: "Aug 3, 2024", expectedMoveOut: "May 30, 2025",
    status: "active", contact: "09551234001", emergencyContact: "09551234002",
    parentName: "Jose Doe", parentContact: "09551234003", initials: "JD",
    grad: "linear-gradient(135deg,#F59E0B,#EF4444)", totalDays: 137, totalTransfers: 0,
    visitors: [
      { id: "vv5", visitorName: "Mark dela Cruz", relationship: "Brother", purpose: "Bring appliances", date: "Dec 16, 2024", timeIn: "1:03 PM", timeOut: "2:50 PM", duration: "1h 47m", status: "completed" },
    ],
    timeline: [
      { event: "Reservation Approved",             date: "Jul 25, 2024",  color: "#16A34A" },
      { event: "Moved Into Room A · Bed 2",        date: "Aug 3, 2024",   color: "#9772F6" },
      { event: "Visitor Mark dela Cruz checked in", date: "Dec 16, 2024", color: "#EC4899" },
      { event: "Visitor Mark dela Cruz checked out",date: "Dec 16, 2024", color: "#6B7280" },
    ],
    notes: [],
  },
  {
    id: "o6", name: "Mark Villanueva", studentId: "2024-0042", program: "BS Computer Science", year: "3rd Year",
    room: "Room D", bed: "Bed 1", moveIn: "Aug 6, 2024", expectedMoveOut: "May 30, 2025",
    status: "reserved", contact: "09661234001", emergencyContact: "09661234002",
    parentName: "Ben Villanueva", parentContact: "09661234003", initials: "MV",
    grad: "linear-gradient(135deg,#8B5CF6,#7549F6)", totalDays: 134, totalTransfers: 0,
    visitors: [],
    timeline: [
      { event: "Reservation Approved",        date: "Jul 30, 2024",  color: "#16A34A" },
      { event: "Moved Into Room D · Bed 1",   date: "Aug 6, 2024",   color: "#9772F6" },
    ],
    notes: [],
  },
];

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
  occupant, onClose, onMessage,
}: { occupant: Occupant; onClose: () => void; onMessage: (o: Occupant) => void }) {
  const [tab, setTab] = useState<"info"|"visitors"|"timeline"|"notes">("info");
  const [notes, setNotes] = useState<OccupantNote[]>(occupant.notes);
  const [noteInput, setNoteInput] = useState("");
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
    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.52)", zIndex: 80, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div style={{ background: "#F3F4F8", borderRadius: "24px 24px 0 0", height: "92%", display: "flex", flexDirection: "column" }}>

        {/* Modal header */}
        <div style={{ flexShrink: 0, background: "white", borderRadius: "24px 24px 0 0", padding: "18px 20px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 16, backgroundImage: occupant.grad, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ color: "white", fontWeight: 800, fontSize: 16, fontFamily: QS }}>{occupant.initials}</span>
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
    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 90, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px" }}>
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
  go, navLeft, navRight, onOpenChat,
}: {
  go: (s: Screen) => void;
  navLeft: NavTab[];
  navRight: NavTab[];
  onOpenChat?: (contactId: string) => void;
}) {
  const [occupants, setOccupants] = useState<Occupant[]>(SEED_OCCUPANTS);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [sort, setSort] = useState<SortType>("nameAsc");
  const [profileOccupant, setProfileOccupant] = useState<Occupant | null>(null);
  const [removeOccupant, setRemoveOccupant] = useState<Occupant | null>(null);

  // derived stats
  const total     = occupants.length;
  const active    = occupants.filter(o => o.status === "active").length;
  const available = 40 - occupants.filter(o => o.status !== "checkedOut").length;
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

  const doRemove = (o: Occupant) => {
    setOccupants(prev => prev.filter(p => p.id !== o.id));
    setRemoveOccupant(null);
    setProfileOccupant(null);
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
          <p style={{ color: "rgba(255,255,255,.65)", fontSize: 11, margin: "0 0 2px", fontFamily: IN }}>Naquila Boarding House</p>
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
          return (
            <div key={o.id} style={{ background: "white", borderRadius: 20, padding: 14, marginBottom: 10, boxShadow: "0 2px 10px rgba(0,0,0,.05)" }}>
              {/* Top row */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 15, backgroundImage: o.grad, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ color: "white", fontWeight: 800, fontSize: 14, fontFamily: QS }}>{o.initials}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#1F2937", fontFamily: QS }}>{o.name}</p>
                    <Pill label={sm.label} color={sm.color} bg={sm.bg} />
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

      {/* ── BOTTOM NAV ── */}
      <div style={{ flexShrink: 0, height: 64, background: "white", borderTop: "1px solid #F3F4F6", display: "flex", alignItems: "center", justifyContent: "space-around", padding: "0 8px" }}>
        {[...navLeft, ...navRight].map(tab => {
          const active = tab.id === "occupants";
          return (
            <button key={tab.id} onClick={() => go(tab.id as Screen)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", padding: "8px 0" }}>
              <tab.Icon size={20} color={active ? "#9772F6" : "#9CA3AF"} />
              <span style={{ fontSize: 10, fontWeight: active ? 800 : 600, color: active ? "#9772F6" : "#9CA3AF", fontFamily: QS }}>{tab.label}</span>
            </button>
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
