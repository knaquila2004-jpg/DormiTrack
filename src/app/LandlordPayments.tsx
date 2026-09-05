import React, { useState, useMemo, useEffect } from "react";
import {
  ChevronLeft, ChevronRight, Search, Filter, CreditCard, CheckCircle, Clock,
  AlertCircle, XCircle, User, Users, Receipt, Edit3,
  ChevronDown, ChevronUp, X, Eye, Check, Banknote, TrendingUp,
  Calendar, FileText, ArrowRight, Circle, MoreVertical,
} from "lucide-react";
import { addNotification, notifyLinkedParents } from "./notificationStore";
import { supabase } from "../lib/supabase";
import {
  getBillingRosterForLandlord, verifyPaymentRecord, rejectPaymentRecord, createPaymentPeriod, CREATE_PERIOD_MAX_MONTHS_AHEAD,
  landlordEditBillAmount, landlordSetBillStatus, StudentBilling,
} from "./paymentStore";
import { getBoardingHousesForLandlord } from "./boardingHouseStore";
import type { BoardingHouse } from "./shared";

const GRAD    = "linear-gradient(135deg,#9772F6 0%,#7549F6 100%)";
const GRAD_H  = "linear-gradient(160deg,#9772F6 0%,#7549F6 100%)";
const QS      = "'Quicksand',sans-serif";
const IN      = "'Inter',sans-serif";
const php     = (n: number) => `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

// ── Types ─────────────────────────────────────────────────────────────────────

export type PayStatus = "paid" | "awaiting-verification" | "partially-paid" | "overdue" | "unpaid";
type BillStatus      = "paid" | "awaiting-verification" | "overdue" | "unpaid";

type BillItem = {
  id: string; key: string; label: string; amount: number;
  status: BillStatus; paidAmount: number;
};
type PayTx = {
  id: string; billKey: string; billLabel: string;
  amount: number; date: string; time: string;
  submittedBy: "student" | "parent"; submittedByName: string;
  status: "verified" | "pending" | "rejected";
  rejectionReason?: string;
  proofUrl: string | null;
};
export type StudentPayment = {
  id: string; name: string; room: string; bed: string;
  bills: BillItem[]; dueDate: string; lastUpdated: string; note?: string | null;
  transactions: PayTx[];
  studentUserId: string; // real auth user id — `id` above is the display student number
};

// ── Live data mapping ────────────────────────────────────────────────────────
// paymentStore.ts's StudentBilling is the real, provider-agnostic shape;
// this maps it onto the view model this screen's JSX already expects.

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function toLocalPayment(b: StudentBilling): StudentPayment {
  return {
    id: b.studentIdNo || b.studentId, studentUserId: b.studentId, name: b.studentName, room: b.room, bed: b.bed,
    dueDate: fmtDate(b.dueDate), lastUpdated: fmtDate(b.updatedAt), note: b.note,
    bills: b.bills.map(bill => ({ id: bill.id, key: bill.key, label: bill.label, amount: bill.amount, status: bill.status as BillStatus, paidAmount: bill.paidAmount })),
    transactions: b.transactions.map(tx => ({
      id: tx.id, billKey: tx.billKey, billLabel: tx.billLabel, amount: tx.amount,
      date: fmtDate(tx.submittedAt), time: fmtTime(tx.submittedAt),
      submittedBy: tx.submittedByRole, submittedByName: tx.submittedByName,
      status: tx.status, rejectionReason: tx.rejectionReason ?? undefined,
      proofUrl: tx.proofUrl ?? null,
    })),
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const deriveStatus = (p: StudentPayment): PayStatus => {
  const bills = p.bills;
  const allPaid   = bills.every(b => b.status === "paid");
  const anyAwait  = bills.some(b  => b.status === "awaiting-verification");
  const anyPaid   = bills.some(b  => b.status === "paid");
  const anyOver   = bills.every(b => b.status === "overdue");
  const someOver  = bills.some(b  => b.status === "overdue");
  if (allPaid)  return "paid";
  if (anyAwait) return "awaiting-verification";
  if (anyOver || someOver) return "overdue";
  if (anyPaid)  return "partially-paid";
  return "unpaid";
};

const totalDue  = (p: StudentPayment) => p.bills.reduce((s, b) => s + b.amount, 0);
const totalPaid = (p: StudentPayment) => p.bills.reduce((s, b) => s + b.paidAmount, 0);
const remaining = (p: StudentPayment) => totalDue(p) - totalPaid(p);

const statusMeta = (s: PayStatus) => ({
  "paid":                  { label: "Paid",                 color: "#16A34A", bg: "#DCFCE7", dot: "#16A34A"  },
  "awaiting-verification": { label: "Awaiting Verification",color: "#D97706", bg: "#FEF3C7", dot: "#D97706"  },
  "partially-paid":        { label: "Partially Paid",       color: "#F59E0B", bg: "#FFF7ED", dot: "#F59E0B"  },
  "overdue":               { label: "Overdue",              color: "#EF4444", bg: "#FEE2E2", dot: "#EF4444"  },
  "unpaid":                { label: "Unpaid",               color: "#6B7280", bg: "#F3F4F6", dot: "#9CA3AF"  },
}[s]);

const txStatusMeta = (s: PayTx["status"]) => ({
  verified: { label:"Verified",  color:"#16A34A", bg:"#DCFCE7" },
  pending:  { label:"Pending",   color:"#D97706", bg:"#FEF3C7" },
  rejected: { label:"Rejected",  color:"#EF4444", bg:"#FEE2E2" },
}[s]);

// ── Sub-components ────────────────────────────────────────────────────────────

function SummaryCard({ icon: Icon, label, value, color, bg }: { icon: React.ElementType; label: string; value: string|number; color: string; bg: string }) {
  return (
    <div style={{ background:"white", borderRadius:18, padding:"14px 14px", boxShadow:"0 2px 10px rgba(0,0,0,.05)", minWidth:0 }}>
      <div style={{ width:36, height:36, borderRadius:12, background:bg, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:10 }}>
        <Icon size={17} color={color}/>
      </div>
      <p style={{ margin:0, fontSize:17, fontWeight:800, color:"#1F2937", fontFamily:QS, lineHeight:1 }}>{value}</p>
      <p style={{ margin:"4px 0 0", fontSize:10, color:"#9CA3AF", fontFamily:IN, lineHeight:1.3 }}>{label}</p>
    </div>
  );
}

// ── Create Payment Period Modal ───────────────────────────────────────────────
// Lets a landlord manually open a real billing period for a chosen month (current month
// through CREATE_PERIOD_MAX_MONTHS_AHEAD ahead — matches create_payment_period's own
// server-side check) across every current occupant of one of their boarding houses, with an
// optional note. Previously the only way a period ever came into existence was
// ensure_current_period_bill() silently creating "whichever month it happens to be right now"
// the instant someone opened Payments — there was no landlord-facing way to plan ahead.
function monthOptions(): { year: number; month: number; label: string }[] {
  const now = new Date();
  const out: { year: number; month: number; label: string }[] = [];
  for (let i = 0; i <= CREATE_PERIOD_MAX_MONTHS_AHEAD; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    out.push({ year: d.getFullYear(), month: d.getMonth() + 1, label: d.toLocaleDateString("en-US", { month: "long", year: "numeric" }) });
  }
  return out;
}

function CreatePaymentPeriodModal({ boardingHouses, onClose, onCreated }: {
  boardingHouses: BoardingHouse[]; onClose: () => void;
  onCreated: (info: { boardingHouseId: string; periodLabel: string; newStudentIds: string[] }) => void;
}) {
  const months = useMemo(monthOptions, []);
  const [bhId, setBhId]   = useState(boardingHouses[0]?.id ?? "");
  const [sel, setSel]     = useState(0); // index into months
  const [dueDate, setDueDate] = useState("");
  const [note, setNote]   = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr]     = useState("");

  const chosen = months[sel];
  const todayISO = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })();
  // A due date for a bill being created right now can't already be in the past.
  const dueDateInvalid = !!dueDate && dueDate < todayISO;
  const canSubmit = !!bhId && !!dueDate && !dueDateInvalid;

  const handleCreate = async () => {
    if (!bhId || !dueDate) { setErr("Please choose a boarding house and due date."); return; }
    if (dueDateInvalid) { setErr("Due date can't be in the past."); return; }
    setSubmitting(true);
    const res = await createPaymentPeriod({ boardingHouseId: bhId, year: chosen.year, month: chosen.month, dueDate, note });
    setSubmitting(false);
    if (res.ok === false) { setErr(res.error); return; }
    onCreated({ boardingHouseId: bhId, periodLabel: chosen.label, newStudentIds: res.results.filter(r => r.isNew).map(r => r.studentId) });
  };

  return (
    <div style={{ position:"fixed" as const, inset:0, background:"rgba(0,0,0,.55)", zIndex:400, display:"flex", flexDirection:"column" as const, justifyContent:"flex-end" }} onClick={onClose}>
      <div style={{ background:"#F7F8FC", borderRadius:"28px 28px 0 0", maxHeight:"92%", display:"flex", flexDirection:"column" as const }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"center", padding:"10px 0 2px" }}><div style={{ width:40, height:4, borderRadius:2, background:"#E5E7EB" }}/></div>
        <div style={{ background:"white", borderRadius:"28px 28px 0 0", padding:"12px 18px 14px", borderBottom:"1px solid #F3F4F6", display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:44, height:44, borderRadius:15, backgroundImage:GRAD, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <Calendar size={20} color="white"/>
          </div>
          <div style={{ flex:1 }}>
            <p style={{ margin:0, fontSize:16, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Create Payment Period</p>
            <p style={{ margin:0, fontSize:11, color:"#9CA3AF", fontFamily:IN }}>Opens a real bill for every current occupant</p>
          </div>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:10, background:"#F3F4F6", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <X size={15} color="#6B7280"/>
          </button>
        </div>
        <div style={{ flex:1, overflowY:"auto" as const, scrollbarWidth:"none" as const, padding:"16px 18px 36px" }}>
          {boardingHouses.length > 1 && (
            <>
              <p style={{ margin:"0 0 6px", fontSize:12, fontWeight:800, color:"#374151", fontFamily:QS }}>Boarding House</p>
              <select value={bhId} onChange={e=>setBhId(e.target.value)} style={{ width:"100%", background:"white", borderRadius:14, padding:"12px 14px", border:"1.5px solid #E5E7EB", marginBottom:14, fontSize:13, fontFamily:IN, color:"#1F2937", outline:"none" }}>
                {boardingHouses.map(bh=> <option key={bh.id} value={bh.id}>{bh.name}</option>)}
              </select>
            </>
          )}

          <p style={{ margin:"0 0 6px", fontSize:12, fontWeight:800, color:"#374151", fontFamily:QS }}>Billing Month <span style={{ color:"#EF4444" }}>*</span></p>
          <select value={sel} onChange={e=>setSel(Number(e.target.value))} style={{ width:"100%", background:"white", borderRadius:14, padding:"12px 14px", border:"1.5px solid #E5E7EB", marginBottom:6, fontSize:13, fontFamily:IN, color:"#1F2937", outline:"none" }}>
            {months.map((m,i)=> <option key={i} value={i}>{m.label}{i===0?" (current month)":""}</option>)}
          </select>
          <p style={{ margin:"0 0 14px", fontSize:10, color:"#9CA3AF", fontFamily:IN }}>Periods can be scheduled up to {CREATE_PERIOD_MAX_MONTHS_AHEAD} months ahead.</p>

          <p style={{ margin:"0 0 6px", fontSize:12, fontWeight:800, color:"#374151", fontFamily:QS }}>Due Date <span style={{ color:"#EF4444" }}>*</span></p>
          <div style={{ background:"white", borderRadius:14, padding:"11px 14px", border:`1.5px solid ${dueDateInvalid?"#EF4444":"#E5E7EB"}`, marginBottom:dueDateInvalid?6:14 }}>
            <input type="date" min={todayISO} value={dueDate} onChange={e=>{ setDueDate(e.target.value); setErr(""); }} style={{ width:"100%", background:"none", border:"none", outline:"none", fontSize:13, fontFamily:IN, color:"#1F2937", colorScheme:"light" as const, boxSizing:"border-box" as const }}/>
          </div>
          {dueDateInvalid && <p style={{ margin:"-2px 0 14px", fontSize:11, color:"#EF4444", fontFamily:IN }}>Due date can't be in the past.</p>}

          <p style={{ margin:"0 0 6px", fontSize:12, fontWeight:800, color:"#374151", fontFamily:QS }}>Note <span style={{ fontSize:10, color:"#9CA3AF", fontWeight:600 }}>(Optional — shown to students &amp; parents)</span></p>
          <div style={{ background:"white", borderRadius:14, padding:"11px 14px", border:"1.5px solid #E5E7EB", marginBottom:14 }}>
            <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="e.g. Water rate increased this month due to summer usage." rows={3} style={{ width:"100%", background:"none", border:"none", outline:"none", fontSize:13, fontFamily:IN, color:"#1F2937", resize:"none" as const, boxSizing:"border-box" as const }}/>
          </div>

          {err && <p style={{ margin:"0 0 10px", fontSize:11, color:"#EF4444", fontFamily:IN }}>{err}</p>}

          <button onClick={handleCreate} disabled={submitting||!canSubmit} style={{ width:"100%", height:50, borderRadius:18, backgroundImage:canSubmit?GRAD:"none", background:canSubmit?undefined:"#E5E7EB", border:"none", cursor:submitting||!canSubmit?"default":"pointer", opacity:submitting?0.7:1, fontSize:14, fontWeight:800, color:canSubmit?"white":"#9CA3AF", fontFamily:QS, boxShadow:canSubmit?"0 4px 16px rgba(151,114,246,.3)":undefined }}>
            {submitting ? "Creating…" : `Create for ${chosen.label}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Payment Details Modal ─────────────────────────────────────────────────────

type ModalTab = "overview" | "history" | "timeline";

function PaymentDetailsModal({ p, onClose, onVerify, onReject, onEditAmount, onSetBillStatus }: {
  p: StudentPayment;
  onClose: ()=>void;
  onVerify: (studentId: string, studentUserId: string, txId: string) => void;
  onReject: (studentId: string, studentUserId: string, txId: string, reason: string) => void;
  onEditAmount: (billId: string, billLabel: string, amount: number) => Promise<{ ok: true } | { ok: false; error: string }>;
  onSetBillStatus: (billId: string, status: "unpaid"|"overdue") => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const [tab, setTab]             = useState<ModalTab>("overview");
  const [rejectingTx, setRejTx]  = useState<PayTx|null>(null);
  const [rejectReason, setRejR]  = useState("");
  const [expandBill, setExpandB] = useState<string|null>(null);
  const [editingBill, setEditingBill] = useState<BillItem|null>(null);

  const status = deriveStatus(p);
  const sm     = statusMeta(status);
  const due    = totalDue(p);
  const paid   = totalPaid(p);
  const rem    = remaining(p);
  const pendingTxs = p.transactions.filter(t => t.status === "pending");

  const tabBtn = (t: ModalTab, label: string) => (
    <button onClick={()=>setTab(t)} style={{ flex:1, padding:"9px 0", border:"none", cursor:"pointer", fontFamily:QS, fontSize:11, fontWeight:800, borderRadius:10,
      background: tab===t ? GRAD : "transparent", color: tab===t ? "white" : "#9CA3AF",
    }}>{label}</button>
  );

  const timelineSteps = [
    { label:"Billing Generated",           done: true                          },
    { label:"Payment Submitted",           done: p.transactions.length > 0     },
    { label:"Proof Uploaded",              done: p.transactions.some(t=>!!t.proofUrl) },
    { label:"Landlord Verified",           done: p.transactions.some(t=>t.status==="verified") },
    { label:"Payment Completed",           done: status === "paid"             },
  ];

  return (
    <div style={{ position: "fixed" as const, inset:0, background:"rgba(0,0,0,.55)", zIndex:70, display:"flex", flexDirection:"column" as const, justifyContent:"flex-end" }}>
      <div style={{ background:"#F3F4F8", borderRadius:"24px 24px 0 0", height:"93%", display:"flex", flexDirection:"column" as const }}>

        {/* Header */}
        <div style={{ padding:"16px 20px 12px", background:"white", borderRadius:"24px 24px 0 0", borderBottom:"1px solid #F3F4F6", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
            <div style={{ width:42, height:42, borderRadius:14, backgroundImage:GRAD, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <User size={19} color="white"/>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ fontSize:15, fontWeight:800, color:"#1F2937", margin:0, fontFamily:QS }}>{p.name}</p>
              <p style={{ fontSize:11, color:"#9CA3AF", margin:0, fontFamily:IN }}>{p.id} · {p.room} · {p.bed}</p>
            </div>
            <span style={{ fontSize:9, fontWeight:800, padding:"3px 10px", borderRadius:20, background:sm.bg, color:sm.color, fontFamily:QS, flexShrink:0 }}>{sm.label}</span>
            <button onClick={onClose} style={{ width:32, height:32, borderRadius:10, background:"#F3F4F6", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <X size={15} color="#6B7280"/>
            </button>
          </div>
          {/* Quick stats */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:12 }}>
            {[
              { label:"Total Due",  value:php(due),  color:"#1F2937" },
              { label:"Total Paid", value:php(paid), color:"#16A34A" },
              { label:"Balance",    value:php(rem),  color: rem>0?"#EF4444":"#16A34A" },
            ].map(s=>(
              <div key={s.label} style={{ background:"#F9FAFB", borderRadius:12, padding:"9px 10px", textAlign:"center" }}>
                <p style={{ margin:0, fontSize:13, fontWeight:800, color:s.color, fontFamily:QS }}>{s.value}</p>
                <p style={{ margin:"2px 0 0", fontSize:9, color:"#9CA3AF", fontFamily:IN }}>{s.label}</p>
              </div>
            ))}
          </div>
          {/* Tabs */}
          <div style={{ display:"flex", background:"#F3F4F6", borderRadius:12, padding:4 }}>
            {tabBtn("overview","Overview")}
            {tabBtn("history","History")}
            {tabBtn("timeline","Timeline")}
          </div>
        </div>

        <div style={{ flex:1, overflowY:"auto" as const, scrollbarWidth:"none" as const, padding:"14px 16px 24px" }}>

          {/* ── OVERVIEW TAB ─────────────────────────────────────── */}
          {tab === "overview" && (
            <>
              {/* Pending verification actions */}
              {pendingTxs.length > 0 && (
                <div style={{ background:"#FEF3C7", borderRadius:16, padding:"12px 14px", marginBottom:14, border:"1px solid #FDE68A" }}>
                  <p style={{ margin:"0 0 8px", fontSize:12, fontWeight:800, color:"#92400E", fontFamily:QS }}>
                    {pendingTxs.length} payment{pendingTxs.length>1?"s":""} awaiting your verification
                  </p>
                  {pendingTxs.map(tx => (
                    <div key={tx.id} style={{ background:"white", borderRadius:12, padding:"10px 12px", marginBottom:6 }}>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
                        <div>
                          <p style={{ margin:0, fontSize:12, fontWeight:800, color:"#1F2937", fontFamily:QS }}>{tx.billLabel}</p>
                          <p style={{ margin:0, fontSize:10, color:"#9CA3AF", fontFamily:IN }}>{php(tx.amount)} · {tx.date} · {tx.time}</p>
                          <p style={{ margin:"2px 0 0", fontSize:10, color:"#6B7280", fontFamily:IN, display:"flex", alignItems:"center", gap:4 }}>
                            {tx.submittedBy==="parent" ? <Users size={10} color="#6B7280"/> : <User size={10} color="#6B7280"/>}
                            {tx.submittedByName}
                          </p>
                          {tx.proofUrl && (
                            <a href={tx.proofUrl} target="_blank" rel="noopener noreferrer" style={{ margin:"3px 0 0", fontSize:10, color:"#9772F6", fontFamily:QS, fontWeight:800, textDecoration:"none", display:"inline-flex", alignItems:"center", gap:3 }}>
                              <Eye size={10}/> View Proof
                            </a>
                          )}
                        </div>
                        <div style={{ display:"flex", gap:6 }}>
                          <button onClick={()=>onVerify(p.id, p.studentUserId, tx.id)} style={{ padding:"6px 12px", borderRadius:10, background:"#DCFCE7", color:"#16A34A", fontSize:10, fontWeight:800, border:"none", cursor:"pointer", fontFamily:QS, display:"flex", alignItems:"center", gap:4 }}>
                            <Check size={11}/> Verify
                          </button>
                          <button onClick={()=>{setRejTx(tx);setRejR("");}} style={{ padding:"6px 12px", borderRadius:10, background:"#FEE2E2", color:"#EF4444", fontSize:10, fontWeight:800, border:"none", cursor:"pointer", fontFamily:QS, display:"flex", alignItems:"center", gap:4 }}>
                            <X size={11}/> Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Period note — set when this bill was created via "Create Payment Period" */}
              {p.note && (
                <div style={{ background:"#F5F0FF", borderRadius:14, padding:"10px 14px", marginBottom:14, border:"1px solid #E9DFFC", display:"flex", alignItems:"flex-start", gap:8 }}>
                  <FileText size={13} color="#9772F6" style={{ flexShrink:0, marginTop:1 }}/>
                  <p style={{ margin:0, fontSize:11, color:"#6B21D9", fontFamily:IN, lineHeight:1.5 }}>{p.note}</p>
                </div>
              )}

              {/* Billing breakdown */}
              <p style={{ fontSize:11, fontWeight:800, color:"#9CA3AF", fontFamily:QS, margin:"0 0 8px", letterSpacing:0.3, textTransform:"uppercase" as const }}>Billing Breakdown</p>
              <div style={{ background:"white", borderRadius:18, overflow:"hidden", boxShadow:"0 2px 8px rgba(0,0,0,.04)", marginBottom:14 }}>
                {p.bills.map((b, i) => {
                  const bsm = statusMeta(b.status as PayStatus);
                  const expanded = expandBill === b.key;
                  return (
                    <div key={b.key}>
                      <div onClick={()=>setExpandB(expanded?null:b.key)} style={{ display:"flex", alignItems:"center", gap:12, padding:"13px 16px", borderBottom: i<p.bills.length-1&&!expanded ? "1px solid #F3F4F6" : "none", cursor:"pointer" }}>
                        <div style={{ width:8, height:8, borderRadius:"50%", background:bsm.dot, flexShrink:0 }}/>
                        <div style={{ flex:1 }}>
                          <p style={{ margin:0, fontSize:13, fontWeight:700, color:"#1F2937", fontFamily:QS }}>{b.label}</p>
                          <p style={{ margin:0, fontSize:10, color:"#9CA3AF", fontFamily:IN }}>{php(b.paidAmount)} of {php(b.amount)} paid</p>
                        </div>
                        <span style={{ fontSize:9, fontWeight:800, padding:"2px 8px", borderRadius:20, background:bsm.bg, color:bsm.color, fontFamily:QS }}>{bsm.label}</span>
                        {expanded ? <ChevronUp size={14} color="#9CA3AF"/> : <ChevronDown size={14} color="#9CA3AF"/>}
                      </div>
                      {expanded && (
                        <div style={{ padding:"0 16px 12px", background:"#FAFAFA", borderBottom: i<p.bills.length-1?"1px solid #F3F4F6":"none" }}>
                          <div style={{ display:"flex", justifyContent:"space-between", padding:"6px 0" }}>
                            <span style={{ fontSize:11, color:"#6B7280", fontFamily:IN }}>Amount Due</span>
                            <span style={{ fontSize:11, fontWeight:700, color:"#1F2937", fontFamily:QS }}>{php(b.amount)}</span>
                          </div>
                          <div style={{ display:"flex", justifyContent:"space-between", padding:"6px 0" }}>
                            <span style={{ fontSize:11, color:"#6B7280", fontFamily:IN }}>Amount Paid</span>
                            <span style={{ fontSize:11, fontWeight:700, color:"#16A34A", fontFamily:QS }}>{php(b.paidAmount)}</span>
                          </div>
                          <div style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderTop:"1px solid #F3F4F6" }}>
                            <span style={{ fontSize:11, color:"#6B7280", fontFamily:IN }}>Remaining</span>
                            <span style={{ fontSize:11, fontWeight:800, color: b.amount-b.paidAmount>0?"#EF4444":"#16A34A", fontFamily:QS }}>{php(b.amount-b.paidAmount)}</span>
                          </div>
                          <button onClick={e=>{ e.stopPropagation(); setEditingBill(b); }} style={{ width:"100%", marginTop:8, padding:"8px 0", borderRadius:10, border:"1.5px solid #E5E7EB", background:"white", color:"#9772F6", fontSize:11, fontWeight:800, cursor:"pointer", fontFamily:QS, display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                            <Edit3 size={12}/> Edit Bill
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
                {/* Total row */}
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"13px 16px", background:"#F9FAFB", borderTop:"2px solid #F3F4F6" }}>
                  <span style={{ fontSize:13, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Total</span>
                  <div style={{ textAlign:"right" }}>
                    <p style={{ margin:0, fontSize:14, fontWeight:800, color:"#9772F6", fontFamily:QS }}>{php(due)}</p>
                    <p style={{ margin:0, fontSize:10, color:"#9CA3AF", fontFamily:IN }}>Due: {p.dueDate}</p>
                  </div>
                </div>
              </div>

              {/* Student stats */}
              <p style={{ fontSize:11, fontWeight:800, color:"#9CA3AF", fontFamily:QS, margin:"0 0 8px", letterSpacing:0.3, textTransform:"uppercase" as const }}>Payment Summary</p>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                {[
                  { label:"Bills Paid",   value:`${p.bills.filter(b=>b.status==="paid").length} / ${p.bills.length}`, color:"#16A34A" },
                  { label:"Bills Unpaid", value:`${p.bills.filter(b=>b.status==="unpaid"||b.status==="overdue").length} / ${p.bills.length}`, color:"#EF4444" },
                  { label:"Last Payment", value: p.transactions.filter(t=>t.status==="verified").at(-1)?.date ?? "—", color:"#374151" },
                  { label:"Submissions",  value:`${p.transactions.length}`, color:"#9772F6" },
                ].map(s=>(
                  <div key={s.label} style={{ background:"white", borderRadius:14, padding:"11px 12px", boxShadow:"0 1px 4px rgba(0,0,0,.05)" }}>
                    <p style={{ margin:0, fontSize:14, fontWeight:800, color:s.color, fontFamily:QS }}>{s.value}</p>
                    <p style={{ margin:"2px 0 0", fontSize:10, color:"#9CA3AF", fontFamily:IN }}>{s.label}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── HISTORY TAB ──────────────────────────────────────── */}
          {tab === "history" && (
            <>
              {p.transactions.length === 0 ? (
                <div style={{ textAlign:"center", paddingTop:40 }}>
                  <Receipt size={36} color="#D1D5DB"/>
                  <p style={{ fontSize:13, color:"#9CA3AF", marginTop:10, fontFamily:IN }}>No payment submissions yet.</p>
                </div>
              ) : [...p.transactions].reverse().map(tx => {
                const tsm = txStatusMeta(tx.status);
                return (
                  <div key={tx.id} style={{ background:"white", borderRadius:18, padding:"13px 14px", marginBottom:10, boxShadow:"0 2px 8px rgba(0,0,0,.04)" }}>
                    <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                      <div style={{ width:36, height:36, borderRadius:12, background: tx.status==="verified"?"#DCFCE7":tx.status==="rejected"?"#FEE2E2":"#FEF3C7", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        {tx.status==="verified" ? <CheckCircle size={16} color="#16A34A"/> : tx.status==="rejected" ? <XCircle size={16} color="#EF4444"/> : <Clock size={16} color="#D97706"/>}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:3 }}>
                          <p style={{ margin:0, fontSize:13, fontWeight:800, color:"#1F2937", fontFamily:QS }}>{tx.billLabel}</p>
                          <span style={{ fontSize:9, fontWeight:800, padding:"2px 8px", borderRadius:20, background:tsm.bg, color:tsm.color, fontFamily:QS }}>{tsm.label}</span>
                        </div>
                        <p style={{ margin:"0 0 4px", fontSize:13, fontWeight:700, color:"#9772F6", fontFamily:QS }}>{php(tx.amount)}</p>
                        <p style={{ margin:0, fontSize:10, color:"#9CA3AF", fontFamily:IN }}>{tx.date} · {tx.time}</p>
                        <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:4 }}>
                          {tx.submittedBy==="parent" ? <Users size={11} color="#6B7280"/> : <User size={11} color="#6B7280"/>}
                          <span style={{ fontSize:10, color:"#6B7280", fontFamily:IN }}>
                            Submitted by: {tx.submittedByName}
                          </span>
                        </div>
                        {tx.proofUrl && (
                          <a href={tx.proofUrl} target="_blank" rel="noopener noreferrer" style={{ marginTop:4, fontSize:10, color:"#9772F6", fontFamily:QS, fontWeight:800, textDecoration:"none", display:"inline-flex", alignItems:"center", gap:3 }}>
                            <Eye size={10}/> View Proof
                          </a>
                        )}
                        {tx.rejectionReason && (
                          <div style={{ marginTop:6, padding:"6px 10px", background:"#FEE2E2", borderRadius:8 }}>
                            <p style={{ margin:0, fontSize:10, color:"#EF4444", fontFamily:IN }}>Rejected: {tx.rejectionReason}</p>
                          </div>
                        )}
                        {tx.status==="pending" && (
                          <div style={{ display:"flex", gap:6, marginTop:8 }}>
                            <button onClick={()=>onVerify(p.id, p.studentUserId, tx.id)} style={{ padding:"5px 12px", borderRadius:9, background:"#DCFCE7", color:"#16A34A", fontSize:10, fontWeight:800, border:"none", cursor:"pointer", fontFamily:QS, display:"flex", alignItems:"center", gap:4 }}>
                              <Check size={11}/> Verify
                            </button>
                            <button onClick={()=>{setRejTx(tx);setRejR("");}} style={{ padding:"5px 12px", borderRadius:9, background:"#FEE2E2", color:"#EF4444", fontSize:10, fontWeight:800, border:"none", cursor:"pointer", fontFamily:QS, display:"flex", alignItems:"center", gap:4 }}>
                              <X size={11}/> Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* ── TIMELINE TAB ─────────────────────────────────────── */}
          {tab === "timeline" && (
            <div style={{ padding:"4px 0" }}>
              {timelineSteps.map((step, i) => (
                <div key={step.label} style={{ display:"flex", gap:14, marginBottom: i<timelineSteps.length-1 ? 0 : 0 }}>
                  <div style={{ display:"flex", flexDirection:"column" as const, alignItems:"center" }}>
                    <div style={{ width:32, height:32, borderRadius:"50%", background: step.done ? GRAD : "#F3F4F6", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      {step.done ? <Check size={14} color="white"/> : <Circle size={14} color="#D1D5DB"/>}
                    </div>
                    {i < timelineSteps.length-1 && (
                      <div style={{ width:2, flex:1, minHeight:32, background: step.done ? "#9772F6" : "#E5E7EB", margin:"4px 0" }}/>
                    )}
                  </div>
                  <div style={{ paddingTop:6, paddingBottom: i<timelineSteps.length-1 ? 20 : 0 }}>
                    <p style={{ margin:0, fontSize:13, fontWeight: step.done ? 800 : 600, color: step.done ? "#1F2937" : "#9CA3AF", fontFamily:QS }}>{step.label}</p>
                    {step.done && i===1 && p.transactions[0] && (
                      <p style={{ margin:"2px 0 0", fontSize:10, color:"#6B7280", fontFamily:IN }}>{p.transactions[0].date} · {p.transactions[0].submittedByName}</p>
                    )}
                    {step.done && i===3 && p.transactions.find(t=>t.status==="verified") && (
                      <p style={{ margin:"2px 0 0", fontSize:10, color:"#6B7280", fontFamily:IN }}>{p.transactions.find(t=>t.status==="verified")!.date}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reject reason dialog */}
      {rejectingTx && (
        <div style={{ position: "fixed" as const, inset:0, background:"rgba(0,0,0,.55)", zIndex:80, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 24px" }}>
          <div style={{ background:"white", borderRadius:24, padding:22, width:"100%" }}>
            <p style={{ fontSize:15, fontWeight:800, color:"#1F2937", margin:"0 0 4px", fontFamily:QS }}>Reject Payment</p>
            <p style={{ fontSize:12, color:"#6B7280", margin:"0 0 14px", fontFamily:IN }}>{rejectingTx.billLabel} · {php(rejectingTx.amount)}</p>
            <p style={{ fontSize:11, fontWeight:700, color:"#6B7280", fontFamily:QS, margin:"0 0 8px" }}>Reason for rejection:</p>
            <div style={{ display:"flex", flexWrap:"wrap" as const, gap:6, marginBottom:12 }}>
              {["Blurry receipt","Incorrect amount","Invalid proof","Duplicate submission","Other"].map(r=>(
                <button key={r} onClick={()=>setRejR(r)} style={{ padding:"5px 12px", borderRadius:20, border:"1.5px solid", borderColor:rejectReason===r?"#EF4444":"#E5E7EB", background:rejectReason===r?"#FEE2E2":"white", color:rejectReason===r?"#EF4444":"#6B7280", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:QS }}>{r}</button>
              ))}
            </div>
            <textarea value={rejectReason} onChange={e=>setRejR(e.target.value)} placeholder="Or type a custom reason…" rows={2}
              style={{ width:"100%", padding:"10px 13px", borderRadius:12, border:"1.5px solid #E5E7EB", outline:"none", fontSize:12, fontFamily:IN, color:"#1F2937", resize:"none" as const, boxSizing:"border-box" as const }}/>
            <div style={{ display:"flex", gap:10, marginTop:14 }}>
              <button onClick={()=>setRejTx(null)} style={{ flex:1, padding:"12px 0", borderRadius:14, border:"1.5px solid #E5E7EB", background:"white", color:"#6B7280", fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:QS }}>Cancel</button>
              <button onClick={()=>{ if(!rejectReason.trim()) return; onReject(p.id, p.studentUserId, rejectingTx.id, rejectReason); setRejTx(null); }} style={{ flex:1, padding:"12px 0", borderRadius:14, border:"none", background:"#EF4444", color:"white", fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:QS }}>Confirm Reject</button>
            </div>
          </div>
        </div>
      )}

      {/* Manual edit sheet */}
      {editingBill && (
        <EditBillModal
          bill={editingBill}
          studentName={p.name}
          onClose={()=>setEditingBill(null)}
          onSaveAmount={amount => onEditAmount(editingBill.id, editingBill.label, amount)}
          onSetStatus={status => onSetBillStatus(editingBill.id, status)}
        />
      )}
    </div>
  );
}

// ── Edit Bill Modal ────────────────────────────────────────────────────────────
// Opened from a bill's expanded row in the Overview tab — lets the landlord
// correct what the bill is supposed to be (the due amount), or manually flag
// it Overdue/Unpaid. Both go through real RPCs (0058) that write to the same
// payment_bills row the rest of this screen (and the student's/parent's own
// Payments page) already reads, so nothing here is a shadow/local-only edit.
// Recording that a payment was actually *made* is deliberately not here —
// that stays the student's/parent's own action (0059), with the landlord
// only ever verifying or rejecting it afterward.

function EditBillModal({ bill, studentName, onClose, onSaveAmount, onSetStatus }: {
  bill: BillItem;
  studentName: string;
  onClose: () => void;
  onSaveAmount: (amount: number) => Promise<{ ok: true } | { ok: false; error: string }>;
  onSetStatus: (status: "unpaid" | "overdue") => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const [amount, setAmount] = useState(String(bill.amount));
  const [savingAmount, setSavingAmount] = useState(false);
  const [amountErr, setAmountErr] = useState("");

  const [settingStatus, setSettingStatus] = useState(false);

  const handleSaveAmount = async () => {
    const n = Number(amount);
    if (!amount || Number.isNaN(n) || n < 0) { setAmountErr("Enter a valid amount."); return; }
    setSavingAmount(true); setAmountErr("");
    const res = await onSaveAmount(n);
    setSavingAmount(false);
    if (res.ok === false) setAmountErr(res.error); else onClose();
  };

  const handleStatus = async (status: "unpaid"|"overdue") => {
    setSettingStatus(true);
    const res = await onSetStatus(status);
    setSettingStatus(false);
    if (res.ok) onClose();
  };

  return (
    <div style={{ position:"fixed" as const, inset:0, background:"rgba(0,0,0,.55)", zIndex:150, display:"flex", flexDirection:"column" as const, justifyContent:"flex-end" }} onClick={onClose}>
      <div style={{ background:"#F7F8FC", borderRadius:"24px 24px 0 0", maxHeight:"92%", display:"flex", flexDirection:"column" as const }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"center", padding:"10px 0 2px" }}><div style={{ width:40, height:4, borderRadius:2, background:"#E5E7EB" }}/></div>
        <div style={{ background:"white", borderRadius:"24px 24px 0 0", padding:"12px 18px 14px", borderBottom:"1px solid #F3F4F6", display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:44, height:44, borderRadius:15, backgroundImage:GRAD, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <Edit3 size={20} color="white"/>
          </div>
          <div style={{ flex:1 }}>
            <p style={{ margin:0, fontSize:16, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Edit {bill.label}</p>
            <p style={{ margin:0, fontSize:11, color:"#9CA3AF", fontFamily:IN }}>{studentName}</p>
          </div>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:10, background:"#F3F4F6", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <X size={15} color="#6B7280"/>
          </button>
        </div>
        <div style={{ flex:1, overflowY:"auto" as const, scrollbarWidth:"none" as const, padding:"16px 18px 36px" }}>

          {/* Amount Due */}
          <p style={{ margin:"0 0 6px", fontSize:12, fontWeight:800, color:"#374151", fontFamily:QS }}>Amount Due</p>
          <div style={{ display:"flex", gap:8, marginBottom:amountErr?6:18 }}>
            <div style={{ flex:1, background:"white", borderRadius:14, padding:"11px 14px", border:"1.5px solid #E5E7EB" }}>
              <input type="number" min={0} step="0.01" value={amount} onChange={e=>{ setAmount(e.target.value); setAmountErr(""); }} style={{ width:"100%", background:"none", border:"none", outline:"none", fontSize:13, fontFamily:IN, color:"#1F2937" }}/>
            </div>
            <button onClick={handleSaveAmount} disabled={savingAmount} style={{ padding:"0 18px", borderRadius:14, border:"none", backgroundImage:GRAD, color:"white", fontSize:12, fontWeight:800, cursor:savingAmount?"default":"pointer", fontFamily:QS, opacity:savingAmount?0.7:1 }}>
              {savingAmount?"Saving…":"Save"}
            </button>
          </div>
          {amountErr && <p style={{ margin:"-10px 0 18px", fontSize:11, color:"#EF4444", fontFamily:IN }}>{amountErr}</p>}

          {/* Status */}
          <p style={{ margin:"0 0 6px", fontSize:12, fontWeight:800, color:"#374151", fontFamily:QS }}>Status</p>
          <div style={{ display:"flex", gap:8 }}>
            <button disabled={settingStatus || bill.paidAmount>0} onClick={()=>handleStatus("unpaid")}
              style={{ flex:1, padding:"11px 0", borderRadius:14, border:"1.5px solid #E5E7EB", background:"white", color: bill.paidAmount>0?"#D1D5DB":"#6B7280", fontSize:12, fontWeight:800, cursor: (settingStatus||bill.paidAmount>0)?"default":"pointer", fontFamily:QS }}>Mark Unpaid</button>
            <button disabled={settingStatus} onClick={()=>handleStatus("overdue")}
              style={{ flex:1, padding:"11px 0", borderRadius:14, border:"1.5px solid #FCA5A5", background:"#FEF2F2", color:"#EF4444", fontSize:12, fontWeight:800, cursor:settingStatus?"default":"pointer", fontFamily:QS }}>Mark Overdue</button>
          </div>
          {bill.paidAmount>0 && <p style={{ margin:"6px 0 0", fontSize:10, color:"#9CA3AF", fontFamily:IN }}>Can't mark unpaid while a payment has been recorded.</p>}
        </div>
      </div>
    </div>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export function LandlordPaymentsScreen({ go, relatedId, onDeepLinkConsumed }: { go: (s: string) => void; relatedId?: string; onDeepLinkConsumed?: () => void }) {
  const [payments, setPayments]         = useState<StudentPayment[]>([]);
  const [landlordId, setLandlordId]     = useState<string | null>(null);
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState<PayStatus|"all">("all");
  const [sortBy, setSortBy]             = useState<"name"|"due"|"newest"|"oldest">("newest");
  const [detailP, setDetailP]           = useState<StudentPayment|null>(null);
  const [showCreatePeriod, setShowCreatePeriod] = useState(false);
  const [boardingHouses, setBoardingHouses]     = useState<BoardingHouse[]>([]);
  const [toast, setToast]               = useState("");

  const showToast = (msg: string) => { setToast(msg); setTimeout(()=>setToast(""), 2800); };

  const refresh = async (uid: string) => {
    const roster = await getBillingRosterForLandlord(uid);
    const mapped = roster.map(toLocalPayment);
    setPayments(mapped);
    return mapped;
  };

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      const uid = session?.user?.id;
      if (!uid || !active) return;
      setLandlordId(uid);
      refresh(uid);
      getBoardingHousesForLandlord(uid).then(bhs => { if (active) setBoardingHouses(bhs); });
    });
    return () => { active = false; };
  }, []);

  // A newly-created payment period is a real bill the affected students (and their linked
  // parents) should hear about — same "notify student + notifyLinkedParents" fan-out already
  // used for verify/reject above, just addressed to whoever this period was actually new for
  // (re-running this for a period that already existed for some students shouldn't re-notify
  // them, which is exactly what createPaymentPeriod's per-student isNew flag is for).
  const handlePeriodCreated = async (info: { boardingHouseId: string; periodLabel: string; newStudentIds: string[] }) => {
    setShowCreatePeriod(false);
    for (const studentId of info.newStudentIds) {
      addNotification({ userId: studentId, type: "payment", title: "New Payment Period", description: `A new bill for ${info.periodLabel} is now due.`, destination: "payments" });
      notifyLinkedParents(studentId, { type: "payment", title: "New Payment Period", description: `Your student has a new bill for ${info.periodLabel}.`, destination: "payments" });
    }
    if (landlordId) refresh(landlordId);
    showToast(info.newStudentIds.length > 0
      ? `Created ${info.periodLabel} bills for ${info.newStudentIds.length} student${info.newStudentIds.length === 1 ? "" : "s"}.`
      : `${info.periodLabel} was already set up for every current occupant.`);
  };

  // Opened from a "Payment Awaiting Verification" notification tap — jump straight into that
  // student's payment detail (its "pending verification" section already surfaces the exact
  // transaction up top with Verify/Reject right there), instead of leaving the landlord to
  // search the whole roster themselves. Re-checks as `payments` loads in since that's async.
  useEffect(() => {
    if (!relatedId) return;
    const match = payments.find(p => p.transactions.some(t => t.id === relatedId));
    if (match) { setDetailP(match); onDeepLinkConsumed?.(); }
  }, [relatedId, payments, onDeepLinkConsumed]);

  // ── Derived stats ──────────────────────────────────────────────────────────
  const stats = useMemo(()=>({
    totalExpected: payments.reduce((s,p)=>s+totalDue(p),0),
    totalPaid:     payments.reduce((s,p)=>s+totalPaid(p),0),
    pending:       payments.filter(p=>["pending","unpaid"].includes(deriveStatus(p))).length,
    overdue:       payments.filter(p=>deriveStatus(p)==="overdue").length,
    studentsPaid:  payments.filter(p=>deriveStatus(p)==="paid").length,
  }), [payments]);

  // ── Filtered + sorted list ─────────────────────────────────────────────────
  const list = useMemo(()=>{
    let l = payments.map(p=>({ ...p, _status: deriveStatus(p) }));
    if (search) {
      const q = search.toLowerCase();
      l = l.filter(p=>p.name.toLowerCase().includes(q)||p.id.toLowerCase().includes(q)||p.room.toLowerCase().includes(q));
    }
    if (statusFilter !== "all") l = l.filter(p=>p._status === statusFilter);
    return l.sort((a,b)=>{
      if (sortBy==="name") return a.name.localeCompare(b.name);
      if (sortBy==="newest") return b.transactions.length - a.transactions.length;
      if (sortBy==="oldest") return a.transactions.length - b.transactions.length;
      return 0;
    });
  }, [payments, search, statusFilter, sortBy]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const verifyTx = async (studentId: string, studentUserId: string, txId: string) => {
    const res = await verifyPaymentRecord(txId);
    if (res.ok === false) { showToast(`Could not verify payment: ${res.error}`); return; }
    setPayments(prev => prev.map(p => {
      if (p.id !== studentId) return p;
      const tx = p.transactions.find(t=>t.id===txId);
      if (!tx) return p;
      return {
        ...p,
        lastUpdated: "Just now",
        transactions: p.transactions.map(t=>t.id===txId ? {...t, status:"verified"} : t),
        bills: p.bills.map(b=>b.key===tx.billKey ? {...b, status:"paid", paidAmount:b.amount} : b),
      };
    }));
    if (detailP) setDetailP(prev => prev ? {
      ...prev,
      lastUpdated: "Just now",
      transactions: prev.transactions.map(t=>t.id===txId?{...t,status:"verified" as const}:t),
      bills: prev.bills.map(b=>{ const tx=prev.transactions.find(t=>t.id===txId); return tx&&b.key===tx.billKey?{...b,status:"paid" as BillStatus,paidAmount:b.amount}:b; }),
    } : null);
    const studentName = payments.find(p=>p.id===studentId)?.name ?? "Student";
    addNotification({ userId: studentUserId, type: "payment", title: "Payment Verified", description: "Your payment has been verified by the landlord.", destination: "payments", relatedId: txId });
    notifyLinkedParents(studentUserId, { type: "payment", title: "Student Payment Verified", description: `${studentName}'s payment has been verified by the landlord.`, destination: "payments", relatedId: txId });
    if (landlordId) refresh(landlordId);
    showToast("Payment verified successfully");
  };

  const rejectTx = async (studentId: string, studentUserId: string, txId: string, reason: string) => {
    const res = await rejectPaymentRecord(txId, reason);
    if (res.ok === false) { showToast(`Could not reject payment: ${res.error}`); return; }
    setPayments(prev => prev.map(p => p.id!==studentId ? p : {
      ...p,
      lastUpdated: "Just now",
      transactions: p.transactions.map(t=>t.id===txId ? {...t, status:"rejected", rejectionReason:reason} : t),
      bills: p.bills.map(b=>{ const tx=p.transactions.find(t=>t.id===txId); return tx&&b.key===tx.billKey?{...b,status:"unpaid" as BillStatus,paidAmount:0}:b; }),
    }));
    if (detailP) setDetailP(prev => prev ? {
      ...prev,
      lastUpdated: "Just now",
      transactions: prev.transactions.map(t=>t.id===txId?{...t,status:"rejected" as const,rejectionReason:reason}:t),
      bills: prev.bills.map(b=>{ const tx=prev.transactions.find(t=>t.id===txId); return tx&&b.key===tx.billKey?{...b,status:"unpaid" as BillStatus,paidAmount:0}:b; }),
    } : null);
    addNotification({ userId: studentUserId, type: "payment", title: "Payment Rejected", description: `Your payment was rejected: ${reason}`, destination: "payments", relatedId: txId });
    showToast("Payment rejected.");
  };

  // ── Manual edit actions (0058) ─────────────────────────────────────────────
  // Unlike verify/reject above (which patch local state optimistically), these
  // just re-fetch the real roster and re-point detailP at the freshly-fetched
  // row — simpler to keep correct across two different kinds of edits, and
  // guarantees the open modal reflects exactly what the database now has.
  // Recording that a payment was *made* deliberately stays student/parent-only
  // (0059) — the landlord's own manual action is only ever "what is this bill
  // supposed to be", never "mark this as paid on their behalf".
  const handleEditBillAmount = async (studentId: string, studentUserId: string, billId: string, billLabel: string, amount: number) => {
    const res = await landlordEditBillAmount(billId, amount);
    if (res.ok === false) { showToast(`Could not update amount: ${res.error}`); return res; }
    if (landlordId) {
      const fresh = await refresh(landlordId);
      const updated = fresh.find(p => p.id === studentId);
      if (updated) setDetailP(updated);
    }
    addNotification({ userId: studentUserId, type: "payment", title: "Bill Amount Updated", description: `Your ${billLabel} amount was updated to ${php(amount)}.`, destination: "payments" });
    notifyLinkedParents(studentUserId, { type: "payment", title: "Student's Bill Updated", description: `${billLabel} amount for your student was updated to ${php(amount)}.`, destination: "payments" });
    showToast("Bill amount updated.");
    return res;
  };

  const handleSetBillStatus = async (studentId: string, billId: string, status: "unpaid"|"overdue") => {
    const res = await landlordSetBillStatus(billId, status);
    if (res.ok === false) { showToast(`Could not update status: ${res.error}`); return res; }
    if (landlordId) {
      const fresh = await refresh(landlordId);
      const updated = fresh.find(p => p.id === studentId);
      if (updated) setDetailP(updated);
    }
    showToast(`Marked as ${status === "overdue" ? "Overdue" : "Unpaid"}.`);
    return res;
  };

  const STATUS_FILTERS: { key: PayStatus|"all"; label: string }[] = [
    { key:"all",                  label:"All" },
    { key:"paid",                 label:"Paid" },
    { key:"awaiting-verification",label:"Awaiting" },
    { key:"partially-paid",       label:"Partial" },
    { key:"overdue",              label:"Overdue" },
    { key:"unpaid",               label:"Unpaid" },
  ];

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column" as const, background:"#F7F8FC", position:"relative" as const }}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{ flexShrink:0, padding:"52px 20px 20px", backgroundImage:GRAD_H, position:"relative" as const, overflow:"hidden" }}>
        <div style={{ position:"absolute" as const, top:-40, right:-40, width:180, height:180, borderRadius:"42% 58% 65% 35%/45% 40% 60% 55%", background:"rgba(255,255,255,.06)", filter:"blur(32px)" }}/>
        <div style={{ position:"absolute" as const, bottom:-30, left:-20, width:120, height:120, borderRadius:"60% 40% 35% 65%/55% 65% 35% 45%", background:"rgba(255,255,255,.04)", filter:"blur(24px)" }}/>
        <button onClick={()=>go("dashboard")} style={{ background:"none", border:"none", color:"rgba(255,255,255,.8)", cursor:"pointer", padding:0, marginBottom:12, display:"flex", alignItems:"center" }}>
          <ChevronLeft size={24}/>
        </button>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
          <div>
            <h1 style={{ color:"white", fontSize:22, fontWeight:800, margin:"0 0 4px", fontFamily:QS }}>Payment Management</h1>
            <p style={{ color:"rgba(255,255,255,.7)", fontSize:12, margin:0, fontFamily:IN }}>{new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })} billing cycle</p>
          </div>
          <button onClick={()=>setShowCreatePeriod(true)} style={{ display:"flex", alignItems:"center", gap:6, padding:"9px 14px", borderRadius:14, background:"rgba(255,255,255,.18)", border:"none", cursor:"pointer", color:"white", fontSize:11, fontWeight:800, fontFamily:QS }}>
            <Calendar size={13} color="white"/> Create Payment Period
          </button>
        </div>
      </div>

      <div style={{ flex:1, overflowY:"auto" as const, scrollbarWidth:"none" as const }}>

        {/* ── Summary cards ─────────────────────────────────────────────────── */}
        <div style={{ padding:"16px 16px 0" }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:10 }}>
            <SummaryCard icon={CheckCircle} label="Students Paid"   value={stats.studentsPaid} color="#16A34A" bg="#DCFCE7"/>
            <SummaryCard icon={Clock}       label="Pending"         value={stats.pending}      color="#D97706" bg="#FEF3C7"/>
            <SummaryCard icon={AlertCircle} label="Overdue"         value={stats.overdue}      color="#EF4444" bg="#FEE2E2"/>
            <SummaryCard icon={Users}       label="Total Students"  value={payments.length}    color="#9772F6" bg="#F5F0FF"/>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
            <div style={{ background:"white", borderRadius:18, padding:"14px 16px", boxShadow:"0 2px 10px rgba(0,0,0,.05)", gridColumn:"1/-1" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:40, height:40, borderRadius:13, backgroundImage:GRAD, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Banknote size={18} color="white"/>
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ margin:0, fontSize:11, color:"#9CA3AF", fontFamily:IN }}>Total Expected Collection</p>
                  <p style={{ margin:0, fontSize:20, fontWeight:800, color:"#1F2937", fontFamily:QS }}>{php(stats.totalExpected)}</p>
                </div>
                <div style={{ textAlign:"right" }}>
                  <p style={{ margin:0, fontSize:10, color:"#9CA3AF", fontFamily:IN }}>Collected</p>
                  <p style={{ margin:0, fontSize:15, fontWeight:800, color:"#16A34A", fontFamily:QS }}>{php(stats.totalPaid)}</p>
                </div>
              </div>
              {/* Progress bar */}
              <div style={{ marginTop:10, height:6, background:"#F3F4F6", borderRadius:4, overflow:"hidden" }}>
                <div style={{ height:"100%", borderRadius:4, backgroundImage:GRAD, width:`${stats.totalExpected > 0 ? Math.min(100,(stats.totalPaid/stats.totalExpected)*100).toFixed(1) : 0}%`, transition:"width .4s" }}/>
              </div>
              <p style={{ margin:"4px 0 0", fontSize:10, color:"#9CA3AF", fontFamily:IN }}>{(stats.totalExpected > 0 ? (stats.totalPaid/stats.totalExpected)*100 : 0).toFixed(0)}% collected · {php(stats.totalExpected-stats.totalPaid)} remaining</p>
            </div>
          </div>
        </div>

        {/* ── Search + filters ──────────────────────────────────────────────── */}
        <div style={{ padding:"0 16px 0" }}>
          <div style={{ display:"flex", gap:8, marginBottom:10 }}>
            <div style={{ flex:1, background:"white", borderRadius:14, padding:"9px 14px", display:"flex", alignItems:"center", gap:8, boxShadow:"0 1px 4px rgba(0,0,0,.05)" }}>
              <Search size={14} color="#9CA3AF"/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name, ID, or room…"
                style={{ flex:1, border:"none", outline:"none", fontSize:12, fontFamily:IN, color:"#1F2937", background:"transparent" }}/>
            </div>
            <select value={sortBy} onChange={e=>setSortBy(e.target.value as typeof sortBy)}
              style={{ padding:"9px 10px", borderRadius:14, border:"1.5px solid #E5E7EB", fontSize:11, fontFamily:QS, color:"#374151", background:"white", cursor:"pointer", outline:"none" }}>
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="name">Name A–Z</option>
              <option value="due">Due Date</option>
            </select>
          </div>
          <div style={{ display:"flex", gap:6, marginBottom:14, overflowX:"auto" as const, scrollbarWidth:"none" as const }}>
            {STATUS_FILTERS.map(f=>(
              <button key={f.key} onClick={()=>setStatusFilter(f.key)} style={{ flexShrink:0, padding:"5px 13px", borderRadius:20, border:"none", cursor:"pointer", fontSize:10, fontWeight:700, fontFamily:QS,
                background: statusFilter===f.key ? (f.key==="all"?"#1F2937":statusMeta(f.key as PayStatus).dot) : "white",
                color: statusFilter===f.key ? "white" : "#6B7280",
                boxShadow:"0 1px 4px rgba(0,0,0,.07)",
              }}>{f.label}</button>
            ))}
          </div>
        </div>

        {/* ── Payment records ───────────────────────────────────────────────── */}
        <div style={{ padding:"0 16px 24px" }}>
          <p style={{ fontSize:12, fontWeight:700, color:"#9CA3AF", fontFamily:QS, margin:"0 0 8px" }}>{list.length} student{list.length!==1?"s":""}</p>
          {list.length===0 ? (
            <div style={{ textAlign:"center", paddingTop:32 }}>
              <CreditCard size={36} color="#D1D5DB"/>
              <p style={{ fontSize:13, color:"#9CA3AF", marginTop:10, fontFamily:IN }}>No payment records found.</p>
            </div>
          ) : list.map(p=>{
            const status = p._status as PayStatus;
            const sm = statusMeta(status);
            const due = totalDue(p), paid = totalPaid(p);
            const pendingCount = p.transactions.filter(t=>t.status==="pending").length;
            return (
              <div key={p.id} onClick={()=>setDetailP(p)} style={{ background:"white", borderRadius:20, padding:"14px 16px", marginBottom:10, boxShadow:"0 2px 10px rgba(0,0,0,.05)", borderLeft:`4px solid ${sm.dot}`, cursor:"pointer" }}>
                {/* Row 1: student info */}
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                  <div style={{ width:40, height:40, borderRadius:13, backgroundImage:GRAD, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <User size={18} color="white"/>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" as const }}>
                      <span style={{ fontSize:13, fontWeight:800, color:"#1F2937", fontFamily:QS }}>{p.name}</span>
                      <span style={{ fontSize:9, fontWeight:800, padding:"2px 8px", borderRadius:20, background:sm.bg, color:sm.color, fontFamily:QS }}>{sm.label}</span>
                      {pendingCount>0 && <span style={{ fontSize:9, fontWeight:800, padding:"2px 7px", borderRadius:20, background:"#FEF3C7", color:"#92400E", fontFamily:QS }}>{pendingCount} awaiting</span>}
                    </div>
                    <p style={{ fontSize:10, color:"#9CA3AF", margin:0, fontFamily:IN }}>{p.id} · {p.room} · {p.bed}</p>
                  </div>
                </div>
                {/* Row 2: amounts */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6, marginBottom:10 }}>
                  {[
                    { label:"Total Due",  val:php(due),  color:"#374151" },
                    { label:"Paid",       val:php(paid), color:"#16A34A" },
                    { label:"Balance",    val:php(due-paid), color:due-paid>0?"#EF4444":"#16A34A" },
                  ].map(s=>(
                    <div key={s.label} style={{ background:"#F9FAFB", borderRadius:10, padding:"7px 8px", textAlign:"center" }}>
                      <p style={{ margin:0, fontSize:12, fontWeight:800, color:s.color, fontFamily:QS }}>{s.val}</p>
                      <p style={{ margin:0, fontSize:9, color:"#9CA3AF", fontFamily:IN }}>{s.label}</p>
                    </div>
                  ))}
                </div>
                {/* Row 3: due date */}
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <p style={{ margin:0, fontSize:10, color:"#9CA3AF", fontFamily:IN, display:"flex", alignItems:"center", gap:4 }}>
                    <Calendar size={10} color="#C4C9D4"/> Due: {p.dueDate} · Updated {p.lastUpdated}
                  </p>
                  <ChevronRight size={16} color="#D1D5DB"/>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Detail modal ───────────────────────────────────────────────────── */}
      {detailP && (
        <PaymentDetailsModal
          p={detailP}
          onClose={()=>setDetailP(null)}
          onVerify={verifyTx}
          onReject={rejectTx}
          onEditAmount={(billId, billLabel, amount) => handleEditBillAmount(detailP.id, detailP.studentUserId, billId, billLabel, amount)}
          onSetBillStatus={(billId, status) => handleSetBillStatus(detailP.id, billId, status)}
        />
      )}

      {/* ── Create Payment Period modal ───────────────────────────────────── */}
      {showCreatePeriod && (
        <CreatePaymentPeriodModal
          boardingHouses={boardingHouses}
          onClose={()=>setShowCreatePeriod(false)}
          onCreated={handlePeriodCreated}
        />
      )}

      {/* ── Toast ──────────────────────────────────────────────────────────── */}
      {toast && (
        <div style={{ position:"absolute" as const, bottom:90, left:16, right:16, background:"#1F2937", borderRadius:14, padding:"12px 16px", display:"flex", alignItems:"center", gap:10, zIndex:100, boxShadow:"0 8px 24px rgba(0,0,0,.2)" }}>
          <CheckCircle size={16} color="#4ADE80"/>
          <p style={{ margin:0, fontSize:12, fontWeight:700, color:"white", fontFamily:QS }}>{toast}</p>
        </div>
      )}
    </div>
  );
}
