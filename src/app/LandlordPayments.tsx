import React, { useState, useMemo } from "react";
import {
  ChevronLeft, Search, Filter, CreditCard, CheckCircle, Clock,
  AlertCircle, XCircle, User, Users, Receipt, Download, Printer,
  ChevronDown, ChevronUp, X, Eye, Check, Banknote, TrendingUp,
  Calendar, FileText, ArrowRight, Circle, MoreVertical,
} from "lucide-react";

const GRAD    = "linear-gradient(135deg,#9772F6 0%,#7549F6 100%)";
const GRAD_H  = "linear-gradient(160deg,#9772F6 0%,#7549F6 100%)";
const QS      = "'Quicksand',sans-serif";
const IN      = "'Inter',sans-serif";
const php     = (n: number) => `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

// ── Types ─────────────────────────────────────────────────────────────────────

export type PayStatus = "paid" | "awaiting-verification" | "partially-paid" | "overdue" | "unpaid";
type BillStatus      = "paid" | "awaiting-verification" | "overdue" | "unpaid";

type BillItem = {
  key: string; label: string; amount: number;
  status: BillStatus; paidAmount: number;
};
type PayTx = {
  id: string; billKey: string; billLabel: string;
  amount: number; date: string; time: string;
  submittedBy: "student" | "parent"; submittedByName: string;
  status: "verified" | "pending" | "rejected";
  rejectionReason?: string;
};
export type StudentPayment = {
  id: string; name: string; room: string; bed: string;
  bills: BillItem[]; dueDate: string; lastUpdated: string;
  transactions: PayTx[];
};

// ── Billing config (mirrors landlord payment setup) ───────────────────────────

const BILLING: { key: string; label: string; amount: number }[] = [
  { key: "rent",        label: "Monthly Rent",    amount: 3500 },
  { key: "water",       label: "Water Bill",      amount: 150  },
  { key: "electricity", label: "Electricity Bill", amount: 350  },
  { key: "garbage",     label: "Garbage Fee",      amount: 100  },
];
// Internet disabled in this setup → not in BILLING

// ── Seed data ─────────────────────────────────────────────────────────────────

const mkBills = (overrides: Partial<Record<string, Partial<BillItem>>>): BillItem[] =>
  BILLING.map(b => ({
    key: b.key, label: b.label, amount: b.amount,
    status: "unpaid" as BillStatus, paidAmount: 0,
    ...(overrides[b.key] ?? {}),
  }));

export const INITIAL_PAYMENTS: StudentPayment[] = [
  {
    id: "2024-0041", name: "Maria Santos",    room: "Room A", bed: "Bed 2", dueDate: "Aug 1, 2026", lastUpdated: "Jul 30, 2026",
    bills: mkBills({ rent: { status:"paid", paidAmount:3500 }, water: { status:"paid", paidAmount:150 }, electricity: { status:"paid", paidAmount:350 }, garbage: { status:"paid", paidAmount:100 } }),
    transactions: [
      { id:"t1", billKey:"rent",        billLabel:"Monthly Rent",    amount:3500, date:"Jul 30, 2026", time:"10:14 AM", submittedBy:"student", submittedByName:"Maria Santos",          status:"verified" },
      { id:"t2", billKey:"water",       billLabel:"Water Bill",       amount:150,  date:"Jul 30, 2026", time:"10:15 AM", submittedBy:"student", submittedByName:"Maria Santos",          status:"verified" },
      { id:"t3", billKey:"electricity", billLabel:"Electricity Bill", amount:350,  date:"Jul 30, 2026", time:"10:15 AM", submittedBy:"student", submittedByName:"Maria Santos",          status:"verified" },
      { id:"t4", billKey:"garbage",     billLabel:"Garbage Fee",      amount:100,  date:"Jul 30, 2026", time:"10:16 AM", submittedBy:"student", submittedByName:"Maria Santos",          status:"verified" },
    ],
  },
  {
    id: "2024-0042", name: "Juan Dela Cruz",  room: "Room A", bed: "Bed 1", dueDate: "Aug 1, 2026", lastUpdated: "Aug 1, 2026",
    bills: mkBills({ rent: { status:"awaiting-verification", paidAmount:3500 }, water: { status:"awaiting-verification", paidAmount:150 }, electricity: { status:"unpaid", paidAmount:0 }, garbage: { status:"unpaid", paidAmount:0 } }),
    transactions: [
      { id:"t5", billKey:"rent",  billLabel:"Monthly Rent", amount:3500, date:"Aug 1, 2026", time:"8:44 AM", submittedBy:"parent", submittedByName:"Rosa Dela Cruz (Mother)", status:"pending" },
      { id:"t6", billKey:"water", billLabel:"Water Bill",   amount:150,  date:"Aug 1, 2026", time:"8:45 AM", submittedBy:"parent", submittedByName:"Rosa Dela Cruz (Mother)", status:"pending" },
    ],
  },
  {
    id: "2024-0043", name: "Kevin Cruz",      room: "Room C", bed: "Bed 3", dueDate: "Aug 1, 2026", lastUpdated: "Aug 3, 2026",
    bills: mkBills({ rent: { status:"overdue", paidAmount:0 }, water: { status:"overdue", paidAmount:0 }, electricity: { status:"overdue", paidAmount:0 }, garbage: { status:"overdue", paidAmount:0 } }),
    transactions: [],
  },
  {
    id: "2024-0044", name: "Lara Mendoza",    room: "Room B", bed: "Bed 1", dueDate: "Aug 1, 2026", lastUpdated: "Jul 31, 2026",
    bills: mkBills({ rent: { status:"paid", paidAmount:3500 }, water: { status:"unpaid", paidAmount:0 }, electricity: { status:"unpaid", paidAmount:0 }, garbage: { status:"unpaid", paidAmount:0 } }),
    transactions: [
      { id:"t7", billKey:"rent", billLabel:"Monthly Rent", amount:3500, date:"Jul 31, 2026", time:"3:02 PM", submittedBy:"student", submittedByName:"Lara Mendoza", status:"verified" },
    ],
  },
  {
    id: "2024-0045", name: "Ben Torres",      room: "Room B", bed: "Bed 2", dueDate: "Aug 1, 2026", lastUpdated: "Aug 3, 2026",
    bills: mkBills({}),
    transactions: [],
  },
  {
    id: "2024-0046", name: "Sofia Castillo",  room: "Room D", bed: "Bed 1", dueDate: "Aug 1, 2026", lastUpdated: "Aug 3, 2026",
    bills: mkBills({ rent: { status:"awaiting-verification", paidAmount:3500 }, water: { status:"unpaid" }, electricity: { status:"unpaid" }, garbage: { status:"unpaid" } }),
    transactions: [
      { id:"t8", billKey:"rent", billLabel:"Monthly Rent", amount:3500, date:"Aug 2, 2026", time:"6:30 PM", submittedBy:"student", submittedByName:"Sofia Castillo", status:"pending" },
    ],
  },
];

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

// ── Payment Details Modal ─────────────────────────────────────────────────────

type ModalTab = "overview" | "history" | "timeline";

function PaymentDetailsModal({ p, onClose, onVerify, onReject }: {
  p: StudentPayment;
  onClose: ()=>void;
  onVerify: (studentId: string, txId: string) => void;
  onReject: (studentId: string, txId: string, reason: string) => void;
}) {
  const [tab, setTab]             = useState<ModalTab>("overview");
  const [rejectingTx, setRejTx]  = useState<PayTx|null>(null);
  const [rejectReason, setRejR]  = useState("");
  const [expandBill, setExpandB] = useState<string|null>(null);

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
    { label:"Proof Uploaded",              done: p.transactions.some(t=>t.status!=="rejected") },
    { label:"Landlord Verified",           done: p.transactions.some(t=>t.status==="verified") },
    { label:"Payment Completed",           done: status === "paid"             },
  ];

  return (
    <div style={{ position:"absolute" as const, inset:0, background:"rgba(0,0,0,.55)", zIndex:70, display:"flex", flexDirection:"column" as const, justifyContent:"flex-end" }}>
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
                        </div>
                        <div style={{ display:"flex", gap:6 }}>
                          <button onClick={()=>onVerify(p.id, tx.id)} style={{ padding:"6px 12px", borderRadius:10, background:"#DCFCE7", color:"#16A34A", fontSize:10, fontWeight:800, border:"none", cursor:"pointer", fontFamily:QS, display:"flex", alignItems:"center", gap:4 }}>
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
                        {tx.rejectionReason && (
                          <div style={{ marginTop:6, padding:"6px 10px", background:"#FEE2E2", borderRadius:8 }}>
                            <p style={{ margin:0, fontSize:10, color:"#EF4444", fontFamily:IN }}>Rejected: {tx.rejectionReason}</p>
                          </div>
                        )}
                        {tx.status==="pending" && (
                          <div style={{ display:"flex", gap:6, marginTop:8 }}>
                            <button onClick={()=>onVerify(p.id, tx.id)} style={{ padding:"5px 12px", borderRadius:9, background:"#DCFCE7", color:"#16A34A", fontSize:10, fontWeight:800, border:"none", cursor:"pointer", fontFamily:QS, display:"flex", alignItems:"center", gap:4 }}>
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
        <div style={{ position:"absolute" as const, inset:0, background:"rgba(0,0,0,.55)", zIndex:80, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 24px" }}>
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
              <button onClick={()=>{ if(!rejectReason.trim()) return; onReject(p.id, rejectingTx.id, rejectReason); setRejTx(null); }} style={{ flex:1, padding:"12px 0", borderRadius:14, border:"none", background:"#EF4444", color:"white", fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:QS }}>Confirm Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export function LandlordPaymentsScreen({ go }: { go: (s: string) => void }) {
  const [payments, setPayments]         = useState<StudentPayment[]>(INITIAL_PAYMENTS);
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState<PayStatus|"all">("all");
  const [sortBy, setSortBy]             = useState<"name"|"due"|"newest"|"oldest">("newest");
  const [detailP, setDetailP]           = useState<StudentPayment|null>(null);
  const [showExport, setShowExport]     = useState(false);
  const [toast, setToast]               = useState("");

  const showToast = (msg: string) => { setToast(msg); setTimeout(()=>setToast(""), 2800); };

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
  const verifyTx = (studentId: string, txId: string) => {
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
    showToast("✓ Payment verified successfully");
  };

  const rejectTx = (studentId: string, txId: string, reason: string) => {
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
    showToast("Payment rejected.");
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
        <div style={{ position:"absolute" as const, top:-40, right:-40, width:180, height:180, borderRadius:"50%", background:"rgba(255,255,255,.06)" }}/>
        <div style={{ position:"absolute" as const, bottom:-30, left:-20, width:120, height:120, borderRadius:"50%", background:"rgba(255,255,255,.04)" }}/>
        <button onClick={()=>go("dashboard")} style={{ background:"none", border:"none", color:"rgba(255,255,255,.8)", cursor:"pointer", padding:0, marginBottom:12, display:"flex", alignItems:"center" }}>
          <ChevronLeft size={24}/>
        </button>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
          <div>
            <h1 style={{ color:"white", fontSize:22, fontWeight:800, margin:"0 0 4px", fontFamily:QS }}>Payment Management</h1>
            <p style={{ color:"rgba(255,255,255,.7)", fontSize:12, margin:0, fontFamily:IN }}>August 2026 billing cycle</p>
          </div>
          <button onClick={()=>setShowExport(true)} style={{ display:"flex", alignItems:"center", gap:6, padding:"9px 14px", borderRadius:14, background:"rgba(255,255,255,.18)", border:"none", cursor:"pointer", color:"white", fontSize:11, fontWeight:800, fontFamily:QS }}>
            <Download size={13} color="white"/> Export
          </button>
        </div>
      </div>

      <div style={{ flex:1, overflowY:"auto" as const, scrollbarWidth:"none" as const }}>

        {/* ── Summary cards ─────────────────────────────────────────────────── */}
        <div style={{ padding:"16px 16px 0" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
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
                <div style={{ height:"100%", borderRadius:4, backgroundImage:GRAD, width:`${Math.min(100,(stats.totalPaid/stats.totalExpected)*100).toFixed(1)}%`, transition:"width .4s" }}/>
              </div>
              <p style={{ margin:"4px 0 0", fontSize:10, color:"#9CA3AF", fontFamily:IN }}>{((stats.totalPaid/stats.totalExpected)*100).toFixed(0)}% collected · {php(stats.totalExpected-stats.totalPaid)} remaining</p>
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:16 }}>
            <SummaryCard icon={CheckCircle} label="Students Paid"   value={stats.studentsPaid} color="#16A34A" bg="#DCFCE7"/>
            <SummaryCard icon={Clock}       label="Pending"         value={stats.pending}      color="#D97706" bg="#FEF3C7"/>
            <SummaryCard icon={AlertCircle} label="Overdue"         value={stats.overdue}      color="#EF4444" bg="#FEE2E2"/>
            <SummaryCard icon={Users}       label="Total Students"  value={payments.length}    color="#9772F6" bg="#F5F0FF"/>
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
              <div key={p.id} style={{ background:"white", borderRadius:20, padding:"14px 16px", marginBottom:10, boxShadow:"0 2px 10px rgba(0,0,0,.05)", borderLeft:`4px solid ${sm.dot}` }}>
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
                {/* Row 3: due date + view */}
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <p style={{ margin:0, fontSize:10, color:"#9CA3AF", fontFamily:IN, display:"flex", alignItems:"center", gap:4 }}>
                    <Calendar size={10} color="#C4C9D4"/> Due: {p.dueDate} · Updated {p.lastUpdated}
                  </p>
                  <button onClick={()=>setDetailP(p)} style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 14px", borderRadius:12, backgroundImage:GRAD, border:"none", cursor:"pointer", color:"white", fontSize:11, fontWeight:800, fontFamily:QS }}>
                    <Eye size={12} color="white"/> View Details
                  </button>
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
        />
      )}

      {/* ── Export sheet ───────────────────────────────────────────────────── */}
      {showExport && (
        <div style={{ position:"absolute" as const, inset:0, background:"rgba(0,0,0,.45)", zIndex:60, display:"flex", flexDirection:"column" as const, justifyContent:"flex-end" }}>
          <div style={{ background:"white", borderRadius:"24px 24px 0 0", padding:"20px 20px 32px" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
              <p style={{ margin:0, fontSize:15, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Export Report</p>
              <button onClick={()=>setShowExport(false)} style={{ width:32, height:32, borderRadius:10, background:"#F3F4F6", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <X size={15} color="#6B7280"/>
              </button>
            </div>
            {[
              { Icon:FileText,  label:"Export as PDF",   sub:"Save a printable PDF report",  action:()=>{setShowExport(false);showToast("PDF export ready to download.");} },
              { Icon:Download,  label:"Export as Excel", sub:"Download spreadsheet (.xlsx)",  action:()=>{setShowExport(false);showToast("Excel export ready to download.");} },
              { Icon:Printer,   label:"Print Report",    sub:"Open browser print dialog",     action:()=>{setShowExport(false);window.print();} },
            ].map(({ Icon, label, sub, action })=>(
              <button key={label} onClick={action} style={{ width:"100%", display:"flex", alignItems:"center", gap:14, padding:"14px 16px", borderRadius:16, background:"#F9FAFB", border:"1.5px solid #F3F4F6", cursor:"pointer", marginBottom:10, textAlign:"left" as const }}>
                <div style={{ width:40, height:40, borderRadius:13, backgroundImage:GRAD, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <Icon size={18} color="white"/>
                </div>
                <div>
                  <p style={{ margin:0, fontSize:13, fontWeight:800, color:"#1F2937", fontFamily:QS }}>{label}</p>
                  <p style={{ margin:0, fontSize:11, color:"#9CA3AF", fontFamily:IN }}>{sub}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
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
