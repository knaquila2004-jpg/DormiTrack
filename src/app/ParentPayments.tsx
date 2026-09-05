import React, { useState, useEffect } from "react";
import {
  CreditCard, CheckCircle, Clock, AlertCircle, Bell,
  ChevronDown, ChevronUp, X, Check, Receipt,
  ArrowDown, Banknote, Droplet, Zap, Trash2, Eye, Wifi, Tag,
  Hash, Calendar, Camera, FileText,
} from "lucide-react";
import { useUnreadCount, fmtBadgeCount } from "./notificationStore";
import { getMyLinkedStudentData, MyAssignment } from "./studentAssignmentStore";
import { getLinkedStudentBills, submitPaymentRecord, uploadPaymentProof, StudentBilling } from "./paymentStore";

const PAYMENT_METHODS = ["GCash", "Maya", "Bank Transfer", "Cash", "BPI", "Landbank", "SeaBank"];

const GRAD = "linear-gradient(135deg,#9772F6 0%,#7549F6 100%)";
const GRAD_H = "linear-gradient(160deg,#9772F6 0%,#7549F6 100%)";
const QS   = "'Quicksand',sans-serif";
const IN   = "'Inter',sans-serif";

const EMPTY_ASSIGNMENT: MyAssignment = {
  bh:   { id: "", name: "—", address: "—", lat: 0, lng: 0, cover: null, landlord: "—", landlordPhoto: null, contact: "—", email: "—", status: "Active", regStatus: "Approved", checkinRadiusMeters: 50, amenities: [], rules: [], totalRooms: 0, rentAmount: null, gallery: [] },
  room: { id: "", name: "—", bed: "—", capacity: 0, occupied: 0, available: 0, floor: "—", type: "—" },
  stay: { moveIn: "—", moveOut: "—", daysStayed: 0, daysRemaining: 0, totalDays: 0, stayLength: "—" },
};

type PayStatus = "paid" | "awaiting-verification" | "overdue" | "unpaid" | "parent-submitted";

interface Payment {
  id: string; period: string; amount: number; dueDate: string; note: string | null;
  paidDate: string | null; status: PayStatus; method: string | null; ref: string | null; proofUrl: string | null;
}

const EMPTY_PAYMENT: Payment = { id:"", period:"—", amount:0, dueDate:"—", note:null, paidDate:null, status:"unpaid", method:null, ref:null, proofUrl:null };

const STATUS_META: Record<PayStatus,{ label:string; color:string; bg:string }> = {
  "paid":                   { label:"Paid",                       color:"#16A34A", bg:"#DCFCE7" },
  "awaiting-verification":  { label:"Awaiting Verification",      color:"#D97706", bg:"#FEF3C7" },
  "overdue":                { label:"Overdue",                    color:"#DC2626", bg:"#FEE2E2" },
  "unpaid":                 { label:"Unpaid",                     color:"#6B7280", bg:"#F3F4F6" },
  "parent-submitted":       { label:"Waiting for Landlord",       color:"#7C3AED", bg:"#EDE9FE" },
};

// Maps a bill's `bill_key` to the icon/color treatment the old hardcoded
// BILL_ROWS array used, plus fallbacks for keys the mock never had
// (internet/other) since real boarding houses can configure either.
const BILL_VISUAL: Record<string, { Icon: React.ElementType; color: string; bg: string }> = {
  rent:        { Icon: Banknote, color: "#9772F6", bg: "#F5F0FF" },
  water:       { Icon: Droplet,  color: "#3B82F6", bg: "#EFF6FF" },
  electricity: { Icon: Zap,      color: "#D97706", bg: "#FEF3C7" },
  garbage:     { Icon: Trash2,   color: "#16A34A", bg: "#DCFCE7" },
  internet:    { Icon: Wifi,     color: "#0EA5E9", bg: "#E0F2FE" },
  other:       { Icon: Tag,      color: "#6B7280", bg: "#F3F4F6" },
};

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// A period's overall status: paid only once every bill in it is paid;
// otherwise reflects the most recent pending submission's role (so the
// parent's own "waiting for landlord" state stays distinguishable from a
// submission the student made), falling back to overdue/unpaid.
function periodStatus(b: StudentBilling): PayStatus {
  if (b.bills.length > 0 && b.bills.every(x => x.status === "paid")) return "paid";
  const pending = [...b.transactions]
    .filter(t => t.status === "pending")
    .sort((a, c) => new Date(c.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0];
  if (pending) return pending.submittedByRole === "parent" ? "parent-submitted" : "awaiting-verification";
  if (b.bills.some(x => x.status === "overdue")) return "overdue";
  return "unpaid";
}

function toPayment(b: StudentBilling): Payment {
  const amount = b.bills.reduce((s, x) => s + x.amount, 0);
  const txs = [...b.transactions].sort((a, c) => new Date(c.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  const verified = txs.find(t => t.status === "verified") ?? null;
  const latest = txs[0] ?? null;
  return {
    id: b.paymentId, period: b.periodLabel, amount, dueDate: fmtDate(b.dueDate), note: b.note ?? null,
    paidDate: verified ? fmtDate(verified.paymentDate ?? verified.submittedAt) : null,
    status: periodStatus(b), method: latest?.method ?? null, ref: latest?.referenceNo ?? null, proofUrl: latest?.proofUrl ?? null,
  };
}

// ── Submit Payment Modal ─────────────────────────────────────────────────────
// Real submission form for a parent paying on their student's behalf — replaces what used to be
// a plain "Mark as Paid?" confirm that collected no method/reference/proof at all (a real gap:
// the parent's role was already accepted by submitPaymentRecord(), nothing in the UI ever asked
// for the details a landlord actually needs to verify a payment). Mirrors StudentPayments.tsx's
// own SubmitPaymentModal field-for-field so a landlord sees the same shape of submission
// regardless of which side sent it.
function SubmitPaymentModal({ billRows, periodLabel, totalDue, onClose, onSubmit }: {
  billRows: { Icon: React.ElementType; color: string; bg: string; label: string; amount: number }[];
  periodLabel: string; totalDue: number; onClose: () => void;
  onSubmit: (info: { method: string; refNo: string; date: string; proofFile: File | null }) => void;
}) {
  const [method, setMethod] = useState("");
  const [refNo, setRefNo] = useState("");
  const [date, setDate] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [proofError, setProofError] = useState("");
  const todayISO = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })();
  // A payment already made can't have happened on a date that hasn't occurred yet.
  const dateInvalid = !!date && date > todayISO;
  const canSubmit = method && refNo && date && !dateInvalid;

  const MAX_BYTES = 5 * 1024 * 1024;
  const pickProof = (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("image/") && f.type !== "application/pdf") { setProofError("Only images or PDF files are accepted."); return; }
    if (f.size > MAX_BYTES) { setProofError("File is larger than 5MB."); return; }
    setProofError("");
    setProofFile(f);
    setProofPreview(f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
  };

  return (
    <div style={{ position: "fixed" as const, inset:0, background:"rgba(0,0,0,.5)", zIndex:100, display:"flex", flexDirection:"column" as const, justifyContent:"flex-end" }}>
      <div style={{ background:"#F7F8FC", borderRadius:"24px 24px 0 0", height:"95%", display:"flex", flexDirection:"column" as const }}>
        <div style={{ padding:"16px 20px 14px", background:"white", borderRadius:"24px 24px 0 0", borderBottom:"1px solid #F3F4F6", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:44, height:44, borderRadius:14, backgroundImage:GRAD, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Receipt size={20} color="white"/>
            </div>
            <div style={{ flex:1 }}>
              <p style={{ margin:0, fontSize:15, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Submit Payment</p>
              <p style={{ margin:0, fontSize:11, color:"#9CA3AF", fontFamily:IN }}>Fill in your student's payment details</p>
            </div>
            <button onClick={onClose} style={{ width:32, height:32, borderRadius:10, background:"#F3F4F6", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <X size={15} color="#6B7280"/>
            </button>
          </div>
        </div>
        <div style={{ flex:1, overflowY:"auto" as const, scrollbarWidth:"none" as const, padding:"16px 16px 20px" }}>
          {/* Amount summary banner */}
          <div style={{ backgroundImage:GRAD, borderRadius:18, padding:"16px 18px", marginBottom:16, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div>
              <p style={{ margin:"0 0 2px", fontSize:11, color:"rgba(255,255,255,.7)", fontFamily:IN }}>Total Amount Due</p>
              <p style={{ margin:0, fontSize:24, fontWeight:800, color:"white", fontFamily:QS }}>₱{totalDue.toLocaleString()}</p>
            </div>
            <div style={{ textAlign:"right" as const }}>
              <p style={{ margin:"0 0 2px", fontSize:10, color:"rgba(255,255,255,.65)", fontFamily:IN }}>Billing Period</p>
              <p style={{ margin:0, fontSize:13, fontWeight:700, color:"white", fontFamily:QS }}>{periodLabel}</p>
            </div>
          </div>

          {/* Bill breakdown */}
          <div style={{ background:"white", borderRadius:18, padding:"14px 16px", boxShadow:"0 2px 8px rgba(0,0,0,.05)", marginBottom:12 }}>
            <p style={{ margin:"0 0 10px", fontSize:12, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Bill Breakdown</p>
            {billRows.map((b,i)=>(
              <div key={b.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:i<billRows.length-1?"1px solid #F9FAFB":"none" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <b.Icon size={13} color={b.color}/>
                  <span style={{ fontSize:12, color:"#374151", fontFamily:IN }}>{b.label}</span>
                </div>
                <span style={{ fontSize:12, fontWeight:700, color:"#1F2937", fontFamily:QS }}>₱{b.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>

          {/* Payment Method */}
          <div style={{ background:"white", borderRadius:18, padding:"16px", boxShadow:"0 2px 8px rgba(0,0,0,.05)", marginBottom:12 }}>
            <p style={{ margin:"0 0 12px", fontSize:13, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Payment Method *</p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
              {PAYMENT_METHODS.map(m=>(
                <button key={m} onClick={()=>setMethod(m)} style={{ padding:"9px 6px", borderRadius:12, fontSize:11, fontWeight:700, fontFamily:QS, cursor:"pointer",
                  border:method===m?"2px solid #9772F6":"2px solid #E5E7EB",
                  background:method===m?"#F5F0FF":"white", color:method===m?"#9772F6":"#374151" }}>{m}</button>
              ))}
            </div>
          </div>

          {/* Reference No */}
          <div style={{ background:"white", borderRadius:18, padding:"16px", boxShadow:"0 2px 8px rgba(0,0,0,.05)", marginBottom:12 }}>
            <label style={{ display:"block", fontSize:13, fontWeight:800, color:"#1F2937", fontFamily:QS, marginBottom:10 }}>Reference Number *</label>
            <div style={{ display:"flex", alignItems:"center", gap:10, background:"#F9FAFB", borderRadius:13, padding:"0 14px" }}>
              <Hash size={15} color="#9772F6"/>
              <input value={refNo} onChange={e=>setRefNo(e.target.value)} placeholder="Transaction ID or reference number"
                style={{ flex:1, padding:"11px 0", border:"none", background:"transparent", outline:"none", fontSize:13, fontFamily:IN, color:"#1F2937" }}/>
            </div>
          </div>

          {/* Date of Payment */}
          <div style={{ background:"white", borderRadius:18, padding:"16px", boxShadow:"0 2px 8px rgba(0,0,0,.05)", marginBottom:dateInvalid?6:12 }}>
            <label style={{ display:"block", fontSize:13, fontWeight:800, color:"#1F2937", fontFamily:QS, marginBottom:10 }}>Date of Payment *</label>
            <div style={{ display:"flex", alignItems:"center", gap:10, background:"#F9FAFB", borderRadius:13, padding:"0 14px", border:dateInvalid?"1.5px solid #EF4444":"1.5px solid transparent" }}>
              <Calendar size={15} color="#9772F6"/>
              <input type="date" max={todayISO} value={date} onChange={e=>setDate(e.target.value)}
                style={{ flex:1, padding:"11px 0", border:"none", background:"transparent", outline:"none", fontSize:13, fontFamily:IN, color:"#1F2937", colorScheme:"light" as const }}/>
            </div>
          </div>
          {dateInvalid && <p style={{ margin:"0 0 12px", fontSize:11, color:"#EF4444", fontFamily:IN }}>Payment date can't be in the future.</p>}

          {/* Upload Receipt */}
          <div style={{ background:"white", borderRadius:18, padding:"16px", boxShadow:"0 2px 8px rgba(0,0,0,.05)", marginBottom:14 }}>
            <p style={{ margin:"0 0 10px", fontSize:13, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Proof of Payment (Optional)</p>
            <label style={{ border:`2px dashed ${proofFile?"#9772F6":"#E5E7EB"}`, borderRadius:14, padding:"22px 16px", cursor:"pointer", display:"flex", flexDirection:"column" as const, alignItems:"center", gap:8, background:proofFile?"#F5F0FF":"#FAFAFA" }}>
              <input type="file" accept="image/*,application/pdf" style={{ display:"none" }} onChange={e=>pickProof(e.target.files?.[0])}/>
              {proofPreview ? (
                <img src={proofPreview} alt="Receipt preview" style={{ width:80, height:80, objectFit:"cover", borderRadius:10 }}/>
              ) : proofFile ? (
                <FileText size={28} color="#9772F6"/>
              ) : (
                <Camera size={28} color="#D1D5DB"/>
              )}
              <p style={{ margin:0, fontSize:12, fontWeight:700, color:proofFile?"#9772F6":"#9CA3AF", fontFamily:QS, textAlign:"center" as const, wordBreak:"break-all" as const }}>
                {proofFile ? proofFile.name : "Tap to Upload Receipt"}
              </p>
              <p style={{ margin:0, fontSize:10, color:"#9CA3AF", fontFamily:IN }}>Photo, screenshot, or PDF · Max 5MB</p>
            </label>
            {proofFile && (
              <button onClick={()=>{ setProofFile(null); setProofPreview(null); }} style={{ marginTop:8, background:"none", border:"none", color:"#EF4444", fontSize:11, fontWeight:700, fontFamily:QS, cursor:"pointer", padding:0 }}>Remove file</button>
            )}
            {proofError && <p style={{ margin:"8px 0 0", fontSize:11, color:"#EF4444", fontFamily:IN }}>{proofError}</p>}
          </div>

          {/* Record-only notice */}
          <div style={{ background:"#FEF3C7", borderRadius:12, padding:"10px 14px", display:"flex", gap:8 }}>
            <AlertCircle size={13} color="#D97706" style={{ flexShrink:0, marginTop:2 }}/>
            <p style={{ margin:0, fontSize:11, color:"#92400E", fontFamily:IN, lineHeight:1.5 }}>
              The landlord must verify this submission before the status becomes "Paid".
            </p>
          </div>
        </div>
        <div style={{ padding:"10px 16px 28px", background:"white", borderTop:"1px solid #F3F4F6", flexShrink:0, display:"flex", gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:"13px 0", borderRadius:14, border:"1.5px solid #E5E7EB", background:"white", color:"#6B7280", fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:QS }}>Cancel</button>
          <button onClick={()=>{ if(canSubmit){ onSubmit({ method, refNo, date, proofFile }); onClose(); } }} style={{ flex:2, padding:"13px 0", borderRadius:14, border:"none", background:canSubmit?GRAD:"#E5E7EB", color:canSubmit?"white":"#9CA3AF", fontSize:13, fontWeight:800, cursor:canSubmit?"pointer":"default", fontFamily:QS, display:"flex", alignItems:"center", justifyContent:"center", gap:6, boxShadow:canSubmit?"0 4px 14px rgba(151,114,246,.3)":undefined }}>
            <Check size={15}/> Submit Payment
          </button>
        </div>
      </div>
    </div>
  );
}

export function ParentPaymentsScreen({ go, relatedId, onDeepLinkConsumed }: { go:(s:string)=>void; relatedId?: string; onDeepLinkConsumed?: () => void }) {
  const notifCount = useUnreadCount("parent");

  const [linked, setLinked] = useState(false);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [assignment, setAssignment] = useState<MyAssignment>(EMPTY_ASSIGNMENT);
  const [periods, setPeriods] = useState<StudentBilling[]>([]);

  const [showSubmit, setShowSubmit]   = useState(false);
  const [showDetail, setShowDetail]   = useState<Payment|null>(null);
  const [histOpen, setHistOpen]       = useState(true);
  const [proofUploadWarning, setProofUploadWarning] = useState("");

  // Opened from a "Student Payment Verified" notification tap — jump straight to that billing
  // period's detail. relatedId is the specific payment_records transaction id; Payment.id here
  // is the whole period's, so this matches by finding which period actually contains that
  // transaction. Re-checks as `periods` loads in since that's async.
  useEffect(() => {
    if (!relatedId) return;
    const match = periods.find(p => p.transactions.some(t => t.id === relatedId));
    if (match) { setShowDetail(toPayment(match)); onDeepLinkConsumed?.(); }
  }, [relatedId, periods, onDeepLinkConsumed]);

  const refresh = async (sid: string) => {
    const data = await getLinkedStudentBills(sid);
    setPeriods(data);
  };

  useEffect(() => {
    let active = true;
    getMyLinkedStudentData().then(data => {
      if (!active) return;
      setLinked(data.linked);
      setStudentId(data.studentId);
      if (data.assignment) setAssignment(data.assignment);
      if (data.studentId) refresh(data.studentId);
    });
    return () => { active = false; };
  }, []);

  const payments: Payment[] = periods.map(toPayment);
  const currentPeriod = periods[0] ?? null;
  const current = payments[0] ?? EMPTY_PAYMENT;
  const { label:statusLabel, color:statusColor, bg:statusBg } = STATUS_META[current.status];

  const billRows = (currentPeriod?.bills ?? []).map(b => {
    const v = BILL_VISUAL[b.key] ?? BILL_VISUAL.other;
    return { Icon: v.Icon, color: v.color, bg: v.bg, label: b.label, amount: b.amount };
  });

  async function doSubmit(info: { method: string; refNo: string; date: string; proofFile: File | null }) {
    setProofUploadWarning("");
    if (!studentId || !currentPeriod) return;
    const outstanding = currentPeriod.bills.filter(b => b.status === "unpaid" || b.status === "overdue");
    if (outstanding.length === 0) return;
    // One receipt covers the whole submission — see StudentPayments.tsx's doSubmit for the same
    // "upload once, attach to every bill in this submission" reasoning.
    let proofUrl: string | undefined;
    if (info.proofFile) {
      const up = await uploadPaymentProof(info.proofFile, outstanding[0].id);
      if (up.ok === false) setProofUploadWarning(`Payment submitted, but the receipt file couldn't be uploaded: ${up.error}`);
      else proofUrl = up.url;
    }
    for (const b of outstanding) {
      const res = await submitPaymentRecord({ billId: b.id, amount: b.amount, role: "parent", method: info.method, referenceNo: info.refNo, paymentDate: info.date, proofUrl });
      if (res.ok === false) console.error("submitPaymentRecord failed:", res.error);
    }
    await refresh(studentId);
  }

  const canMarkPaid = payments.length > 0 && (current.status === "unpaid" || current.status === "overdue");

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column" as const, background:"#F2F4F8", position:"relative" as const }}>

      {/* Submit Payment Modal */}
      {showSubmit && (
        <SubmitPaymentModal
          billRows={billRows} periodLabel={current.period} totalDue={current.amount}
          onClose={()=>setShowSubmit(false)} onSubmit={doSubmit}
        />
      )}

      {/* Payment Detail Modal */}
      {showDetail && (
        <div style={{ position: "fixed" as const, inset:0, background:"rgba(0,0,0,.55)", zIndex:100, display:"flex", flexDirection:"column" as const, justifyContent:"flex-end" }} onClick={()=>setShowDetail(null)}>
          <div style={{ background:"#F2F4F8", borderRadius:"24px 24px 0 0", maxHeight:"80%", overflow:"auto" }} onClick={e=>e.stopPropagation()}>
            <div style={{ backgroundImage:GRAD, borderRadius:"24px 24px 0 0", padding:"22px 20px 18px", position:"relative" as const }}>
              <button onClick={()=>setShowDetail(null)} style={{ position:"absolute" as const, top:16, right:16, width:32, height:32, borderRadius:10, background:"rgba(255,255,255,.2)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <X size={15} color="white"/>
              </button>
              <p style={{ margin:"0 0 2px", fontSize:12, color:"rgba(255,255,255,.7)", fontFamily:IN }}>{showDetail.period}</p>
              <p style={{ margin:"0 0 4px", fontSize:24, fontWeight:800, color:"white", fontFamily:QS }}>₱{showDetail.amount.toLocaleString()}</p>
              <span style={{ fontSize:10, fontWeight:800, padding:"3px 10px", borderRadius:20, background:STATUS_META[showDetail.status].bg, color:STATUS_META[showDetail.status].color, fontFamily:QS }}>{STATUS_META[showDetail.status].label}</span>
            </div>
            <div style={{ padding:"16px 20px 32px" }}>
              {[
                ["Period",     showDetail.period                     ],
                ["Due Date",   showDetail.dueDate                    ],
                ["Paid Date",  showDetail.paidDate ?? "Not yet paid" ],
                ["Method",     showDetail.method ?? "—"              ],
                ["Reference",  showDetail.ref    ?? "—"              ],
                ["Room",       assignment.room.name                  ],
                ["BH",         assignment.bh.name                    ],
              ].map(([l,v])=>(
                <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"9px 0", borderBottom:"1px solid #F3F4F6" }}>
                  <span style={{ fontSize:11, color:"#9CA3AF", fontFamily:QS, fontWeight:700 }}>{l}</span>
                  <span style={{ fontSize:11, color:"#1F2937", fontFamily:IN, fontWeight:700 }}>{v}</span>
                </div>
              ))}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 0" }}>
                <span style={{ fontSize:11, color:"#9CA3AF", fontFamily:QS, fontWeight:700 }}>Proof of Payment</span>
                {showDetail.proofUrl
                  ? <a href={showDetail.proofUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize:11, color:"#9772F6", fontFamily:QS, fontWeight:800, textDecoration:"none" }}>View File</a>
                  : <span style={{ fontSize:11, color:"#1F2937", fontFamily:IN, fontWeight:700 }}>Not attached</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scrollable body */}
      <div style={{ flex:1, overflowY:"auto" as const, scrollbarWidth:"none" as const }}>

        {/* Header */}
        <div style={{ backgroundImage:GRAD_H, padding:"52px 20px 22px", position:"relative" as const, overflow:"hidden" }}>
          <div style={{ position:"absolute" as const, top:-40, right:-40, width:140, height:140, borderRadius:"50%", background:"rgba(255,255,255,.05)" }}/>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
            <div>
              <h1 style={{ margin:"0 0 4px", fontSize:22, fontWeight:800, color:"white", fontFamily:QS }}>Payments</h1>
              <p style={{ margin:0, fontSize:11, color:"rgba(255,255,255,.65)", fontFamily:IN }}>Monitor your student's payment status.</p>
            </div>
            <button onClick={()=>go("notifications")} style={{ position:"relative" as const, width:40, height:40, borderRadius:13, background:"rgba(255,255,255,.15)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Bell size={18} color="white"/>
              {notifCount > 0 && <span style={{ position:"absolute" as const, top:-2, right:-2, width:16, height:16, borderRadius:"50%", background:"#EF4444", color:"white", fontSize:8, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center" }}>{fmtBadgeCount(notifCount)}</span>}
            </button>
          </div>
          {/* Summary strip */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginTop:16 }}>
            {[
              { label:"Monthly",  val:`₱${current.amount.toLocaleString()}` },
              { label:"Due Date", val:current.dueDate                       },
              { label:"Period",   val:current.period                       },
            ].map(({ label, val })=>(
              <div key={label} style={{ background:"rgba(255,255,255,.14)", borderRadius:14, padding:"9px 10px", textAlign:"center" as const, backdropFilter:"blur(6px)" }}>
                <p style={{ margin:0, fontSize:12, fontWeight:800, color:"white", fontFamily:QS, lineHeight:1.1 }}>{val}</p>
                <p style={{ margin:"2px 0 0", fontSize:8, color:"rgba(255,255,255,.6)", fontFamily:IN }}>{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding:"16px 16px 32px" }}>

          {!linked && (
            <div style={{ background:"#FEF3C7", borderRadius:16, padding:"12px 14px", marginBottom:14, display:"flex", alignItems:"flex-start", gap:10 }}>
              <AlertCircle size={14} color="#D97706" style={{ flexShrink:0, marginTop:1 }}/>
              <p style={{ margin:0, fontSize:11, color:"#92400E", fontFamily:IN, lineHeight:1.55 }}>
                Your account isn't linked to a student yet. Once your student approves the link you submitted during sign-up, their payment information will appear here.
              </p>
            </div>
          )}

          {proofUploadWarning && (
            <div style={{ background:"#FEF3C7", borderRadius:16, padding:"12px 14px", marginBottom:14, display:"flex", alignItems:"flex-start", gap:10 }}>
              <AlertCircle size={14} color="#D97706" style={{ flexShrink:0, marginTop:1 }}/>
              <p style={{ margin:0, fontSize:11, color:"#92400E", fontFamily:IN, lineHeight:1.55 }}>{proofUploadWarning}</p>
            </div>
          )}

          {/* Landlord's note for this billing period, e.g. "water rate increased this month" */}
          {current.note && (
            <div style={{ background:"#F5F0FF", borderRadius:16, padding:"12px 14px", marginBottom:14, display:"flex", alignItems:"flex-start", gap:10 }}>
              <FileText size={14} color="#9772F6" style={{ flexShrink:0, marginTop:1 }}/>
              <p style={{ margin:0, fontSize:11, color:"#6B21D9", fontFamily:IN, lineHeight:1.55 }}>{current.note}</p>
            </div>
          )}

          {/* ── Current Bill Card ────────────────────────────────────────────── */}
          <div style={{ background:"white", borderRadius:22, boxShadow:"0 6px 24px rgba(151,114,246,.14)", overflow:"hidden", marginBottom:14, border:"1.5px solid rgba(151,114,246,.1)" }}>
            <div style={{ backgroundImage:GRAD, padding:"16px 18px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div>
                  <p style={{ margin:"0 0 2px", fontSize:11, color:"rgba(255,255,255,.7)", fontFamily:IN }}>{current.period}</p>
                  <p style={{ margin:0, fontSize:26, fontWeight:800, color:"white", fontFamily:QS }}>₱{current.amount.toLocaleString()}</p>
                </div>
                <span style={{ fontSize:10, fontWeight:800, padding:"4px 12px", borderRadius:20, background:STATUS_META[current.status].bg, color:STATUS_META[current.status].color, fontFamily:QS, marginTop:4 }}>{statusLabel}</span>
              </div>
            </div>
            <div style={{ padding:"14px 18px 18px" }}>
              {billRows.length === 0 && (
                <div style={{ padding:"12px 0", textAlign:"center" as const }}>
                  <span style={{ fontSize:12, color:"#9CA3AF", fontFamily:IN }}>No bills for this period yet.</span>
                </div>
              )}
              {billRows.map(({ Icon, label, amount, color, bg })=>(
                <div key={label} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:"1px solid #F9FAFB" }}>
                  <div style={{ width:30, height:30, borderRadius:10, background:bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <Icon size={13} color={color}/>
                  </div>
                  <p style={{ margin:0, flex:1, fontSize:12, fontWeight:700, color:"#374151", fontFamily:IN }}>{label}</p>
                  <p style={{ margin:0, fontSize:13, fontWeight:800, color:"#1F2937", fontFamily:QS }}>₱{amount.toLocaleString()}</p>
                </div>
              ))}
              <div style={{ display:"flex", justifyContent:"space-between", paddingTop:10 }}>
                <p style={{ margin:0, fontSize:12, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Total</p>
                <p style={{ margin:0, fontSize:14, fontWeight:800, color:"#9772F6", fontFamily:QS }}>₱{current.amount.toLocaleString()}</p>
              </div>

              {/* Submit payment */}
              {canMarkPaid && (
                <button onClick={()=>setShowSubmit(true)} style={{ width:"100%", height:52, borderRadius:20, backgroundImage:GRAD, border:"none", cursor:"pointer", marginTop:16, display:"flex", alignItems:"center", justifyContent:"center", gap:8, boxShadow:"0 6px 20px rgba(151,114,246,.32)", color:"white", fontSize:14, fontWeight:800, fontFamily:QS }}>
                  <CheckCircle size={18} color="white"/> Submit Payment
                </button>
              )}
              {current.status === "parent-submitted" && (
                <div style={{ marginTop:14, background:"#EDE9FE", borderRadius:14, padding:"11px 14px", display:"flex", gap:8 }}>
                  <Clock size={13} color="#7C3AED" style={{ flexShrink:0, marginTop:1 }}/>
                  <p style={{ margin:0, fontSize:11, color:"#5B21B6", fontFamily:IN, lineHeight:1.5 }}>
                    Payment marked. Waiting for landlord's verification before status changes to "Paid".
                  </p>
                </div>
              )}
              {current.status === "awaiting-verification" && (
                <div style={{ marginTop:14, background:"#FEF3C7", borderRadius:14, padding:"11px 14px", display:"flex", gap:8 }}>
                  <AlertCircle size={13} color="#D97706" style={{ flexShrink:0, marginTop:1 }}/>
                  <p style={{ margin:0, fontSize:11, color:"#92400E", fontFamily:IN, lineHeight:1.5 }}>
                    Payment submitted by student. Awaiting landlord verification.
                  </p>
                </div>
              )}
              {current.status === "paid" && (
                <div style={{ marginTop:14, background:"#DCFCE7", borderRadius:14, padding:"11px 14px", display:"flex", gap:8 }}>
                  <CheckCircle size={13} color="#16A34A" style={{ flexShrink:0, marginTop:1 }}/>
                  <p style={{ margin:0, fontSize:11, color:"#166534", fontFamily:IN, lineHeight:1.5 }}>
                    Payment verified and confirmed by landlord.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── Payment History ──────────────────────────────────────────────── */}
          <div style={{ background:"white", borderRadius:22, boxShadow:"0 4px 16px rgba(0,0,0,.07)", overflow:"hidden" }}>
            <button onClick={()=>setHistOpen(p=>!p)} style={{ width:"100%", display:"flex", alignItems:"center", gap:12, padding:"16px 18px", background:"none", border:"none", cursor:"pointer", borderBottom:histOpen?"1px solid #F3F4F6":"none" }}>
              <div style={{ width:34, height:34, borderRadius:11, background:"#F5F0FF", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Receipt size={15} color="#9772F6"/>
              </div>
              <span style={{ flex:1, fontSize:14, fontWeight:800, color:"#1F2937", fontFamily:QS, textAlign:"left" as const }}>Payment History</span>
              <span style={{ fontSize:10, color:"#9CA3AF", fontFamily:IN, marginRight:6 }}>{payments.length} records</span>
              {histOpen?<ChevronUp size={16} color="#9CA3AF"/>:<ChevronDown size={16} color="#9CA3AF"/>}
            </button>
            {histOpen && (
              <div style={{ padding:"4px 18px 18px" }}>
                {payments.length === 0 && (
                  <div style={{ padding:"18px 0", textAlign:"center" as const }}>
                    <span style={{ fontSize:12, color:"#9CA3AF", fontFamily:IN }}>No billing periods yet.</span>
                  </div>
                )}
                {payments.map((p,i)=>{
                  const meta = STATUS_META[p.status];
                  return (
                    <div key={p.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 0", borderBottom:i<payments.length-1?"1px solid #F9FAFB":"none", cursor:"pointer" }} onClick={()=>setShowDetail(p)}>
                      <div style={{ width:38, height:38, borderRadius:13, background:meta.bg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        {p.status==="paid"?<CheckCircle size={16} color={meta.color}/>:<Clock size={16} color={meta.color}/>}
                      </div>
                      <div style={{ flex:1 }}>
                        <p style={{ margin:"0 0 2px", fontSize:13, fontWeight:800, color:"#1F2937", fontFamily:QS }}>{p.period}</p>
                        <p style={{ margin:0, fontSize:11, color:"#9CA3AF", fontFamily:IN }}>Due {p.dueDate}{p.paidDate?` · Paid ${p.paidDate}`:""}</p>
                      </div>
                      <div style={{ textAlign:"right" as const }}>
                        <p style={{ margin:"0 0 3px", fontSize:13, fontWeight:800, color:"#1F2937", fontFamily:QS }}>₱{p.amount.toLocaleString()}</p>
                        <span style={{ fontSize:9, fontWeight:800, padding:"2px 8px", borderRadius:20, background:meta.bg, color:meta.color, fontFamily:QS }}>{meta.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
