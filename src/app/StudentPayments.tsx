import React, { useState, useEffect } from "react";
import {
  CreditCard, CheckCircle, Clock, AlertCircle, X, Check,
  Calendar, FileText, Camera, Hash,
  Banknote, MessageSquare, ChevronRight, Receipt, Zap, Droplet,
  Wifi, Trash2, Tag, Eye, Download,
} from "lucide-react";
import { notifyLandlordOfBoardingHouse } from "./notificationStore";
import { getMyProfile, getMyAssignment, MyStudentProfile, MyAssignment } from "./studentAssignmentStore";
import { getMyBills, submitPaymentRecord, uploadPaymentProof, StudentBilling } from "./paymentStore";

const EMPTY_PROFILE: MyStudentProfile = { name: "—", firstName: "—", id: "—", program: "—", year: "—", block: "—", email: "—", contact: "—", address: "—", photo: null };
const EMPTY_ASSIGNMENT: MyAssignment = {
  bh:   { id: "", name: "—", address: "—", lat: 0, lng: 0, cover: null, landlord: "—", landlordPhoto: null, contact: "—", email: "—", status: "Active", regStatus: "Approved", checkinRadiusMeters: 50, amenities: [], rules: [], totalRooms: 0, rentAmount: null, gallery: [] },
  room: { id: "", name: "—", bed: "—", capacity: 0, occupied: 0, available: 0, floor: "—", type: "—" },
  stay: { moveIn: "—", moveOut: "—", daysStayed: 0, daysRemaining: 0, totalDays: 0, stayLength: "—" },
};

const BILL_VISUAL: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  rent:        { icon: CreditCard, color: "#9772F6", bg: "#F5F0FF" },
  water:       { icon: Droplet,    color: "#3B82F6", bg: "#EFF6FF" },
  electricity: { icon: Zap,        color: "#D97706", bg: "#FEF3C7" },
  garbage:     { icon: Trash2,     color: "#EF4444", bg: "#FEE2E2" },
  internet:    { icon: Wifi,       color: "#16A34A", bg: "#DCFCE7" },
  other:       { icon: Tag,        color: "#6B7280", bg: "#F3F4F6" },
};

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

const GRAD = "linear-gradient(135deg,#9772F6 0%,#7549F6 100%)";
const QS   = "'Quicksand',sans-serif";
const IN   = "'Inter',sans-serif";

// ── Types & Data ──────────────────────────────────────────────────────────────

type BillStatus = "awaiting-verification"|"paid"|"unpaid"|"overdue"|"partially-paid";

interface BillItem { id:string; label:string; amount:number; status:BillStatus; dueDate:string; icon:React.ElementType; color:string; bg:string }
interface PayRecord { id:string; receiptNo:string; date:string; amount:number; status:"verified"|"pending"|"rejected"; method:string; period:string; refNo:string; billLabel:string; proofUrl:string|null }

const PAYMENT_METHODS = ["GCash","Maya","Bank Transfer","Cash","BPI","Landbank","SeaBank"];

const php = (n:number) => `₱${n.toLocaleString("en-PH",{minimumFractionDigits:2,maximumFractionDigits:2})}`;

const statusMeta = (s:BillStatus) => ({
  "paid":                  { label:"Paid",                  color:"#16A34A", bg:"#DCFCE7", Icon:CheckCircle  },
  "awaiting-verification": { label:"Awaiting Verification", color:"#D97706", bg:"#FEF3C7", Icon:Clock       },
  "unpaid":                { label:"Unpaid",                color:"#6B7280", bg:"#F3F4F6", Icon:AlertCircle  },
  "overdue":               { label:"Overdue",               color:"#EF4444", bg:"#FEE2E2", Icon:AlertCircle  },
  "partially-paid":        { label:"Partially Paid",        color:"#F59E0B", bg:"#FFF7ED", Icon:Clock        },
}[s]);

const payRecStatusMeta = (s:"verified"|"pending"|"rejected") => ({
  verified: { label:"Verified",  color:"#16A34A", bg:"#DCFCE7" },
  pending:  { label:"Pending",   color:"#D97706", bg:"#FEF3C7" },
  rejected: { label:"Rejected",  color:"#EF4444", bg:"#FEE2E2" },
}[s]);

// ── Submit Payment Modal ──────────────────────────────────────────────────────

function SubmitPaymentModal({ bills, periodLabel, onClose, onSubmit }: {
  bills: BillItem[]; periodLabel: string; onClose:()=>void;
  onSubmit:(info:{ method:string; refNo:string; date:string; notes:string; proofFile:File|null })=>void;
}) {
  const [method, setMethod] = useState("");
  const [refNo,  setRefNo]  = useState("");
  const [date,   setDate]   = useState("");
  const [notes,  setNotes]  = useState("");
  const [proofFile, setProofFile] = useState<File|null>(null);
  const [proofPreview, setProofPreview] = useState<string|null>(null);
  const [proofError, setProofError] = useState("");
  const todayISO = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })();
  // A payment already made can't have happened on a date that hasn't occurred yet.
  const dateInvalid = !!date && date > todayISO;
  const canSubmit = method && refNo && date && !dateInvalid;
  const totalDue = bills.filter(b=>b.status==="unpaid"||b.status==="awaiting-verification").reduce((s,b)=>s+b.amount,0);

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
    <div style={{ position:"fixed" as const, inset:0, background:"rgba(0,0,0,.5)", zIndex:80, display:"flex", flexDirection:"column" as const, justifyContent:"flex-end" }}>
      <div style={{ background:"#F7F8FC", borderRadius:"24px 24px 0 0", height:"95%", display:"flex", flexDirection:"column" as const }}>
        <div style={{ padding:"16px 20px 14px", background:"white", borderRadius:"24px 24px 0 0", borderBottom:"1px solid #F3F4F6", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:44, height:44, borderRadius:14, backgroundImage:GRAD, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Receipt size={20} color="white"/>
            </div>
            <div style={{ flex:1 }}>
              <p style={{ margin:0, fontSize:15, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Submit Payment</p>
              <p style={{ margin:0, fontSize:11, color:"#9CA3AF", fontFamily:IN }}>Fill in your payment details</p>
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
              <p style={{ margin:0, fontSize:24, fontWeight:800, color:"white", fontFamily:QS }}>{php(totalDue)}</p>
            </div>
            <div style={{ textAlign:"right" as const }}>
              <p style={{ margin:"0 0 2px", fontSize:10, color:"rgba(255,255,255,.65)", fontFamily:IN }}>Billing Period</p>
              <p style={{ margin:0, fontSize:13, fontWeight:700, color:"white", fontFamily:QS }}>{periodLabel}</p>
            </div>
          </div>

          {/* Bill breakdown */}
          <div style={{ background:"white", borderRadius:18, padding:"14px 16px", boxShadow:"0 2px 8px rgba(0,0,0,.05)", marginBottom:12 }}>
            <p style={{ margin:"0 0 10px", fontSize:12, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Bill Breakdown</p>
            {bills.map((b,i)=>(
              <div key={b.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:i<bills.length-1?"1px solid #F9FAFB":"none" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <b.icon size={13} color={b.color}/>
                  <span style={{ fontSize:12, color:"#374151", fontFamily:IN }}>{b.label}</span>
                </div>
                <span style={{ fontSize:12, fontWeight:700, color:"#1F2937", fontFamily:QS }}>{php(b.amount)}</span>
              </div>
            ))}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", paddingTop:10, borderTop:"1.5px solid #F3F4F6", marginTop:4 }}>
              <span style={{ fontSize:13, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Total</span>
              <span style={{ fontSize:15, fontWeight:800, color:"#9772F6", fontFamily:QS }}>{php(totalDue)}</span>
            </div>
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
            {dateInvalid && <p style={{ margin:"10px 0 0", fontSize:11, color:"#EF4444", fontFamily:IN }}>Payment date can't be in the future.</p>}
          </div>

          {/* Upload Receipt */}
          <div style={{ background:"white", borderRadius:18, padding:"16px", boxShadow:"0 2px 8px rgba(0,0,0,.05)", marginBottom:12 }}>
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

          {/* Notes */}
          <div style={{ background:"white", borderRadius:18, padding:"16px", boxShadow:"0 2px 8px rgba(0,0,0,.05)", marginBottom:14 }}>
            <label style={{ display:"block", fontSize:13, fontWeight:800, color:"#1F2937", fontFamily:QS, marginBottom:10 }}>Notes (Optional)</label>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Any additional message for your landlord…" rows={3}
              style={{ width:"100%", resize:"none" as const, border:"1.5px solid #E5E7EB", borderRadius:13, padding:"11px 14px", fontSize:13, fontFamily:IN, color:"#1F2937", outline:"none", background:"#F9FAFB", boxSizing:"border-box" as const, lineHeight:1.5 }}/>
          </div>
        </div>
        <div style={{ padding:"10px 16px 28px", background:"white", borderTop:"1px solid #F3F4F6", flexShrink:0, display:"flex", gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:"13px 0", borderRadius:14, border:"1.5px solid #E5E7EB", background:"white", color:"#6B7280", fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:QS }}>Cancel</button>
          <button onClick={()=>{ if(canSubmit){ onSubmit({ method, refNo, date, notes, proofFile }); onClose(); } }} style={{ flex:2, padding:"13px 0", borderRadius:14, border:"none", background:canSubmit?GRAD:"#E5E7EB", color:canSubmit?"white":"#9CA3AF", fontSize:13, fontWeight:800, cursor:canSubmit?"pointer":"default", fontFamily:QS, display:"flex", alignItems:"center", justifyContent:"center", gap:6, boxShadow:canSubmit?"0 4px 14px rgba(151,114,246,.3)":undefined }}>
            <Check size={15}/> Submit Payment
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Payment History Modal ─────────────────────────────────────────────────────

function PaymentHistoryModal({ history, onClose, onSelect }: { history: PayRecord[]; onClose:()=>void; onSelect:(rec:PayRecord)=>void }) {
  return (
    <div style={{ position:"fixed" as const, inset:0, background:"rgba(0,0,0,.5)", zIndex:75, display:"flex", flexDirection:"column" as const, justifyContent:"flex-end" }} onClick={onClose}>
      <div style={{ background:"#F7F8FC", borderRadius:"24px 24px 0 0", height:"85%", display:"flex", flexDirection:"column" as const }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding:"16px 20px 14px", background:"white", borderRadius:"24px 24px 0 0", borderBottom:"1px solid #F3F4F6", flexShrink:0, display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:42, height:42, borderRadius:14, backgroundImage:GRAD, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <FileText size={19} color="white"/>
          </div>
          <div style={{ flex:1 }}>
            <p style={{ margin:0, fontSize:15, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Payment History</p>
            <p style={{ margin:0, fontSize:11, color:"#9CA3AF", fontFamily:IN }}>{history.length} past payments</p>
          </div>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:10, background:"#F3F4F6", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <X size={15} color="#6B7280"/>
          </button>
        </div>
        <div style={{ flex:1, overflowY:"auto" as const, scrollbarWidth:"none" as const, padding:"14px 16px 28px", display:"flex", flexDirection:"column" as const, gap:10 }}>
          {history.length === 0 && (
            <div style={{ textAlign:"center", paddingTop:40 }}>
              <Receipt size={36} color="#D1D5DB"/>
              <p style={{ fontSize:13, color:"#9CA3AF", marginTop:10, fontFamily:IN }}>No payment submissions yet.</p>
            </div>
          )}
          {history.map(rec=>{
            const sm = payRecStatusMeta(rec.status);
            return (
              <div key={rec.id} onClick={()=>onSelect(rec)} style={{ background:"white", borderRadius:18, padding:"14px 16px", boxShadow:"0 2px 8px rgba(0,0,0,.05)", cursor:"pointer" }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:40, height:40, borderRadius:13, backgroundImage:GRAD, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <Receipt size={18} color="white"/>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3 }}>
                      <p style={{ margin:0, fontSize:13, fontWeight:800, color:"#1F2937", fontFamily:QS }}>{rec.period}</p>
                      <span style={{ fontSize:9, fontWeight:800, padding:"2px 8px", borderRadius:20, background:sm.bg, color:sm.color, fontFamily:QS }}>{sm.label}</span>
                    </div>
                    <p style={{ margin:"0 0 2px", fontSize:11, color:"#9CA3AF", fontFamily:IN }}>{rec.receiptNo}</p>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:10, color:"#6B7280", fontFamily:IN }}>{rec.date}</span>
                      <span style={{ fontSize:10, color:"#6B7280", fontFamily:IN }}>· {rec.method}</span>
                    </div>
                  </div>
                  <div style={{ textAlign:"right" as const }}>
                    <p style={{ margin:0, fontSize:15, fontWeight:800, color:"#9772F6", fontFamily:QS }}>{php(rec.amount)}</p>
                    <ChevronRight size={14} color="#D1D5DB" style={{ marginTop:4 }}/>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Payment Detail Modal ──────────────────────────────────────────────────────

function PaymentDetailModal({ rec, bhName, onClose }: { rec:PayRecord; bhName:string; onClose:()=>void }) {
  const sm = payRecStatusMeta(rec.status);
  return (
    <div style={{ position:"fixed" as const, inset:0, background:"rgba(0,0,0,.5)", zIndex:80, display:"flex", flexDirection:"column" as const, justifyContent:"flex-end" }}>
      <div style={{ background:"#F7F8FC", borderRadius:"24px 24px 0 0", height:"88%", display:"flex", flexDirection:"column" as const }}>
        <div style={{ padding:"16px 20px 14px", background:"white", borderRadius:"24px 24px 0 0", borderBottom:"1px solid #F3F4F6", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:42, height:42, borderRadius:14, backgroundImage:GRAD, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <FileText size={20} color="white"/>
            </div>
            <div style={{ flex:1 }}>
              <p style={{ margin:0, fontSize:14, fontWeight:800, color:"#1F2937", fontFamily:QS }}>{rec.receiptNo}</p>
              <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:3 }}>
                <span style={{ fontSize:9, fontWeight:800, padding:"2px 8px", borderRadius:20, background:sm.bg, color:sm.color, fontFamily:QS }}>{sm.label}</span>
                <span style={{ fontSize:10, color:"#9CA3AF", fontFamily:IN }}>{rec.period}</span>
              </div>
            </div>
            <button onClick={onClose} style={{ width:32, height:32, borderRadius:10, background:"#F3F4F6", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <X size={15} color="#6B7280"/>
            </button>
          </div>
        </div>
        <div style={{ flex:1, overflowY:"auto" as const, scrollbarWidth:"none" as const, padding:"14px 16px 28px" }}>
          {/* Amount card */}
          <div style={{ backgroundImage:GRAD, borderRadius:18, padding:"18px", marginBottom:14, textAlign:"center" as const }}>
            <p style={{ margin:"0 0 4px", fontSize:11, color:"rgba(255,255,255,.7)", fontFamily:IN }}>Total Amount Paid</p>
            <p style={{ margin:"0 0 6px", fontSize:28, fontWeight:800, color:"white", fontFamily:QS }}>{php(rec.amount)}</p>
            <div style={{ display:"flex", justifyContent:"center", gap:8 }}>
              <span style={{ fontSize:9, fontWeight:800, padding:"3px 10px", borderRadius:20, background:"rgba(255,255,255,.2)", color:"white", fontFamily:QS }}>{rec.method}</span>
              <span style={{ fontSize:9, fontWeight:800, padding:"3px 10px", borderRadius:20, background:sm.bg, color:sm.color, fontFamily:QS }}>{sm.label}</span>
            </div>
          </div>
          {/* Details */}
          <div style={{ background:"white", borderRadius:18, padding:"16px", boxShadow:"0 2px 8px rgba(0,0,0,.05)", marginBottom:12 }}>
            <p style={{ margin:"0 0 12px", fontSize:13, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Payment Details</p>
            {[
              { label:"Receipt No.",     val:rec.receiptNo   },
              { label:"Reference No.",   val:rec.refNo       },
              { label:"Payment Date",    val:rec.date        },
              { label:"Billing Period",  val:rec.period      },
              { label:"Payment Method",  val:rec.method      },
              { label:"Boarding House",  val:bhName          },
            ].map(({ label, val })=>(
              <div key={label} style={{ display:"flex", justifyContent:"space-between", padding:"9px 0", borderBottom:"1px solid #F9FAFB" }}>
                <p style={{ margin:0, fontSize:12, color:"#9CA3AF", fontFamily:IN }}>{label}</p>
                <p style={{ margin:0, fontSize:12, fontWeight:700, color:"#1F2937", fontFamily:QS, textAlign:"right" as const, maxWidth:"55%" }}>{val}</p>
              </div>
            ))}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 0" }}>
              <p style={{ margin:0, fontSize:12, color:"#9CA3AF", fontFamily:IN }}>Proof of Payment</p>
              {rec.proofUrl
                ? <a href={rec.proofUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize:12, color:"#9772F6", fontFamily:QS, fontWeight:800, textDecoration:"none" }}>View File</a>
                : <p style={{ margin:0, fontSize:12, fontWeight:700, color:"#1F2937", fontFamily:QS }}>Not attached</p>}
            </div>
          </div>
          {/* This payment's bill */}
          <div style={{ background:"white", borderRadius:18, padding:"16px", boxShadow:"0 2px 8px rgba(0,0,0,.05)", marginBottom:12 }}>
            <p style={{ margin:"0 0 12px", fontSize:13, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Payment For</p>
            <div style={{ display:"flex", justifyContent:"space-between", paddingBottom:10, borderBottom:"1px solid #F9FAFB" }}>
              <span style={{ fontSize:12, color:"#374151", fontFamily:IN }}>{rec.billLabel}</span>
              <span style={{ fontSize:12, fontWeight:700, color:"#1F2937", fontFamily:QS }}>{php(rec.amount)}</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", paddingTop:10 }}>
              <span style={{ fontSize:13, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Total</span>
              <span style={{ fontSize:15, fontWeight:800, color:"#9772F6", fontFamily:QS }}>{php(rec.amount)}</span>
            </div>
          </div>
          {/* Verification status */}
          <div style={{ background:sm.bg, borderRadius:16, padding:"13px 16px", display:"flex", alignItems:"center", gap:10 }}>
            {rec.status==="verified" ? <CheckCircle size={18} color={sm.color}/> : <Clock size={18} color={sm.color}/>}
            <div>
              <p style={{ margin:0, fontSize:13, fontWeight:700, color:sm.color, fontFamily:QS }}>
                {rec.status==="verified" ? "Payment Verified by Landlord" : rec.status==="pending" ? "Awaiting Landlord Verification" : "Payment Rejected"}
              </p>
              <p style={{ margin:0, fontSize:10, color:sm.color+"AA", fontFamily:IN }}>{rec.date}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export function StudentPaymentsScreen({ go, relatedId, onDeepLinkConsumed }: { go:(s:string)=>void; relatedId?: string; onDeepLinkConsumed?: () => void }) {
  const [showSubmit, setShowSubmit] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [selRec, setSelRec]         = useState<PayRecord|null>(null);
  const [histOpen, setHistOpen]     = useState(false);
  const [selBill, setSelBill]       = useState<BillItem|null>(null);

  const [profile, setProfile] = useState<MyStudentProfile>(EMPTY_PROFILE);
  const [assignment, setAssignment] = useState<MyAssignment>(EMPTY_ASSIGNMENT);
  const [current, setCurrent] = useState<StudentBilling | null>(null);
  const [allHistory, setAllHistory] = useState<PayRecord[]>([]);
  const [proofUploadWarning, setProofUploadWarning] = useState("");

  // Opened from a "Payment Verified"/"Payment Rejected" notification tap — jump straight to
  // that exact transaction's receipt, instead of leaving the student to hunt through their
  // whole payment history for it. Re-checks as allHistory loads in since that's async.
  useEffect(() => {
    if (!relatedId) return;
    const match = allHistory.find(r => r.id === relatedId);
    if (match) { setSelRec(match); onDeepLinkConsumed?.(); }
  }, [relatedId, allHistory, onDeepLinkConsumed]);

  const refresh = async () => {
    const periods = await getMyBills();
    const latest = periods[0] ?? null;
    setCurrent(latest);
    setAllHistory(periods.flatMap(p => p.transactions.map((tx): PayRecord => ({
      id: tx.id, receiptNo: `RCP-${tx.id.slice(0, 8).toUpperCase()}`,
      date: fmtDate(tx.paymentDate ?? tx.submittedAt), amount: tx.amount, status: tx.status,
      method: tx.method ?? "—", period: p.periodLabel, refNo: tx.referenceNo ?? "—", billLabel: tx.billLabel, proofUrl: tx.proofUrl ?? null,
    }))));
  };

  useEffect(() => {
    let active = true;
    Promise.all([getMyProfile(), getMyAssignment()]).then(([p, a]) => {
      if (!active) return;
      if (p) setProfile(p);
      if (a) setAssignment(a);
    });
    refresh();
    return () => { active = false; };
  }, []);

  const bills: BillItem[] = (current?.bills ?? []).map(b => ({
    id: b.id, label: b.label, amount: b.amount,
    status: submitted && b.status === "unpaid" ? "awaiting-verification" : b.status,
    dueDate: fmtDate(current?.dueDate), ...(BILL_VISUAL[b.key] ?? BILL_VISUAL.other),
  }));
  const periodLabel = current?.periodLabel ?? "—";

  const totalDue  = bills.reduce((s,b)=>s+b.amount,0);
  const totalPaid = (current?.bills ?? []).reduce((s,b)=>s+b.paidAmount,0);
  const balance   = totalDue - totalPaid;
  const pct       = totalDue>0 ? Math.round((totalPaid/totalDue)*100) : 0;

  const doSubmit = async (info: { method:string; refNo:string; date:string; notes:string; proofFile:File|null }) => {
    setProofUploadWarning("");
    const outstanding = (current?.bills ?? []).filter(b => b.status === "unpaid" || b.status === "overdue");
    if (outstanding.length === 0) return;
    // One receipt covers the whole submission — uploaded once against the first bill, then the
    // same URL is attached to every payment_records row this submission creates, rather than
    // re-uploading (and duplicating storage of) the identical file per bill.
    let proofUrl: string | undefined;
    if (info.proofFile) {
      const up = await uploadPaymentProof(info.proofFile, outstanding[0].id);
      if (up.ok === false) setProofUploadWarning(`Payment submitted, but the receipt file couldn't be uploaded: ${up.error}`);
      else proofUrl = up.url;
    }
    let firstRecordId: string | undefined;
    for (const b of outstanding) {
      const res = await submitPaymentRecord({ billId: b.id, amount: b.amount, role: "student", method: info.method, referenceNo: info.refNo, paymentDate: info.date, proofUrl });
      if (res.ok === false) { console.error("submitPaymentRecord failed:", res.error); continue; }
      if (!firstRecordId) firstRecordId = res.id;
    }
    setSubmitted(true);
    // relatedId lets the landlord's notification tap open this exact transaction directly
    // (same deep-link pattern as a registration request), instead of just a generic nudge
    // to go check the Payments screen themselves.
    notifyLandlordOfBoardingHouse(assignment.bh.id, {
      type: "payment", title: "Payment Awaiting Verification",
      description: `${profile.name} submitted a payment for verification.`,
      destination: "payments", relatedId: firstRecordId,
    });
    refresh();
  };

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column" as const, background:"#F7F8FC", position:"relative" as const }}>

      {/* Header */}
      <div style={{ flexShrink:0, padding:"52px 20px 24px", backgroundImage:GRAD, position:"relative" as const, overflow:"hidden" }}>
        <div style={{ position:"absolute" as const, top:-40, right:-40, width:160, height:160, borderRadius:"50%", background:"rgba(255,255,255,.06)" }}/>
        <p style={{ margin:"0 0 2px", fontSize:13, color:"rgba(255,255,255,.7)", fontFamily:IN }}>Billing Period</p>
        <h1 style={{ margin:"0 0 16px", fontSize:22, fontWeight:800, color:"white", fontFamily:QS }}>{periodLabel}</h1>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:14 }}>
          {[
            { label:"Total Due", val:php(totalDue),  color:"rgba(255,255,255,.85)" },
            { label:"Paid",      val:php(totalPaid), color:"#86EFAC" },
            { label:"Balance",   val:php(balance),   color:balance>0?"#FCA5A5":"#86EFAC" },
          ].map(({ label, val, color })=>(
            <div key={label} style={{ background:"rgba(255,255,255,.12)", borderRadius:14, padding:"10px 10px" }}>
              <p style={{ margin:"0 0 2px", fontSize:9, color:"rgba(255,255,255,.65)", fontFamily:IN }}>{label}</p>
              <p style={{ margin:0, fontSize:14, fontWeight:800, color, fontFamily:QS }}>{val}</p>
            </div>
          ))}
        </div>
        <div style={{ height:6, background:"rgba(255,255,255,.2)", borderRadius:4, overflow:"hidden" }}>
          <div style={{ height:"100%", borderRadius:4, background:"#86EFAC", width:`${pct}%`, transition:"width .4s ease" }}/>
        </div>
        <p style={{ margin:"5px 0 0", fontSize:10, color:"rgba(255,255,255,.65)", fontFamily:IN }}>Due by {fmtDate(current?.dueDate)}</p>
      </div>

      <div style={{ flex:1, overflowY:"auto" as const, scrollbarWidth:"none" as const }}>

        {/* Landlord's note for this billing period, e.g. "water rate increased this month" */}
        {current?.note && (
          <div style={{ margin:"14px 16px 0", background:"#F5F0FF", borderRadius:16, padding:"12px 14px", display:"flex", alignItems:"flex-start", gap:10 }}>
            <FileText size={14} color="#9772F6" style={{ flexShrink:0, marginTop:1 }}/>
            <p style={{ margin:0, fontSize:11, color:"#6B21D9", fontFamily:IN, lineHeight:1.55 }}>{current.note}</p>
          </div>
        )}

        {proofUploadWarning && (
          <div style={{ margin:"14px 16px 0", background:"#FEF3C7", borderRadius:16, padding:"12px 14px", display:"flex", alignItems:"flex-start", gap:10 }}>
            <AlertCircle size={14} color="#D97706" style={{ flexShrink:0, marginTop:1 }}/>
            <p style={{ margin:0, fontSize:11, color:"#92400E", fontFamily:IN, lineHeight:1.55 }}>{proofUploadWarning}</p>
          </div>
        )}

        {/* Success banner */}
        {submitted && (
          <div style={{ margin:"14px 16px 0", background:"#DCFCE7", borderRadius:16, padding:"12px 16px", display:"flex", alignItems:"center", gap:10 }}>
            <CheckCircle size={18} color="#16A34A"/>
            <div>
              <p style={{ margin:0, fontSize:13, fontWeight:700, color:"#16A34A", fontFamily:QS }}>Payment Submitted!</p>
              <p style={{ margin:0, fontSize:11, color:"#16A34A", fontFamily:IN }}>Awaiting landlord verification.</p>
            </div>
          </div>
        )}

        {/* ── Payment Summary ───────────────────────────────────────────────── */}
        <div style={{ padding:"14px 16px 0" }}>
          <p style={{ fontSize:15, fontWeight:800, color:"#1F2937", margin:"0 0 12px", fontFamily:QS }}>Payment Summary</p>
          <div style={{ background:"white", borderRadius:20, overflow:"hidden", boxShadow:"0 2px 10px rgba(0,0,0,.05)", marginBottom:6 }}>
            {bills.length === 0 && (
              <div style={{ padding:"18px 16px", textAlign:"center" as const }}>
                <span style={{ fontSize:12, color:"#9CA3AF", fontFamily:IN }}>No bills for this period yet.</span>
              </div>
            )}
            {bills.map(({ id, label, amount, color })=>(
              <div key={id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 16px" }}>
                <span style={{ fontSize:12, color:"#374151", fontFamily:IN }}>{label}</span>
                <span style={{ fontSize:13, fontWeight:700, color, fontFamily:QS }}>{php(amount)}</span>
              </div>
            ))}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 16px", background:"#F9FAFB", borderTop:"1.5px solid #F3F4F6" }}>
              <span style={{ fontSize:14, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Estimated Monthly Total</span>
              <span style={{ fontSize:16, fontWeight:800, color:"#9772F6", fontFamily:QS }}>{php(totalDue)}</span>
            </div>
          </div>
        </div>

        {/* ── Current Bill ─────────────────────────────────────────────────── */}
        <div style={{ padding:"14px 16px 0" }}>
          <p style={{ fontSize:15, fontWeight:800, color:"#1F2937", margin:"0 0 12px", fontFamily:QS }}>Current Bill</p>
          <div style={{ background:"white", borderRadius:20, overflow:"hidden", boxShadow:"0 2px 10px rgba(0,0,0,.05)", marginBottom:6 }}>
            {bills.map((bill,i)=>{
              const sm = statusMeta(submitted && bill.status==="unpaid" ? "awaiting-verification" : bill.status);
              const SIcon = sm.Icon;
              return (
                <div key={bill.id} onClick={()=>setSelBill(bill)} style={{ padding:"14px 16px", borderBottom:i<bills.length-1?"1px solid #F3F4F6":"none", cursor:"pointer" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:40, height:40, borderRadius:13, background:bill.bg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <bill.icon size={18} color={bill.color}/>
                    </div>
                    <div style={{ flex:1 }}>
                      <p style={{ margin:0, fontSize:13, fontWeight:800, color:"#1F2937", fontFamily:QS }}>{bill.label}</p>
                      <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:3 }}>
                        <span style={{ fontSize:9, fontWeight:800, padding:"2px 8px", borderRadius:20, background:sm.bg, color:sm.color, fontFamily:QS }}>{sm.label}</span>
                        <span style={{ fontSize:10, color:"#9CA3AF", fontFamily:IN }}>Due: {bill.dueDate}</span>
                      </div>
                    </div>
                    <p style={{ margin:0, fontSize:15, fontWeight:800, color:"#1F2937", fontFamily:QS }}>{php(bill.amount)}</p>
                    <ChevronRight size={14} color="#D1D5DB"/>
                  </div>
                </div>
              );
            })}
            {/* Billing period row */}
            <div style={{ padding:"12px 16px", background:"#FAFAFA", borderTop:"1px solid #F3F4F6" }}>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ fontSize:11, color:"#9CA3AF", fontFamily:IN }}>Billing Period</span>
                <span style={{ fontSize:11, fontWeight:700, color:"#374151", fontFamily:QS }}>{periodLabel}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── I Have Paid Button ────────────────────────────────────────────── */}
        {!submitted && (
          <div style={{ padding:"14px 16px 0" }}>
            <button onClick={()=>setShowSubmit(true)} style={{ width:"100%", padding:"15px 0", borderRadius:18, backgroundImage:GRAD, color:"white", fontSize:15, fontWeight:800, border:"none", cursor:"pointer", fontFamily:QS, display:"flex", alignItems:"center", justifyContent:"center", gap:8, boxShadow:"0 6px 20px rgba(151,114,246,.35)" }}>
              <Banknote size={20} color="white"/> I Have Paid
            </button>
          </div>
        )}

        {/* ── Payment History ───────────────────────────────────────────────── */}
        <div style={{ padding:"14px 16px 28px" }}>
          <button onClick={()=>setHistOpen(true)} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", background:"white", border:"none", cursor:"pointer", borderRadius:18, padding:"14px 16px", boxShadow:"0 2px 8px rgba(0,0,0,.05)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:36, height:36, borderRadius:11, background:"#F5F0FF", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <FileText size={16} color="#9772F6"/>
              </div>
              <div style={{ textAlign:"left" as const }}>
                <p style={{ margin:0, fontSize:13, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Payment History</p>
                <p style={{ margin:0, fontSize:10, color:"#9CA3AF", fontFamily:IN }}>{allHistory.length} past payments</p>
              </div>
            </div>
            <ChevronRight size={16} color="#9CA3AF"/>
          </button>
        </div>
      </div>

      {/* Bill detail inline modal */}
      {selBill && (
        <div style={{ position:"fixed" as const, inset:0, background:"rgba(0,0,0,.45)", zIndex:70, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 16px" }}>
          <div style={{ background:"white", borderRadius:24, padding:22, width:"100%" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:18 }}>
              <div style={{ width:44, height:44, borderRadius:14, background:selBill.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <selBill.icon size={20} color={selBill.color}/>
              </div>
              <div style={{ flex:1 }}>
                <p style={{ margin:0, fontSize:15, fontWeight:800, color:"#1F2937", fontFamily:QS }}>{selBill.label}</p>
                <span style={{ fontSize:9, fontWeight:800, padding:"2px 8px", borderRadius:20, background:statusMeta(selBill.status).bg, color:statusMeta(selBill.status).color, fontFamily:QS }}>{statusMeta(selBill.status).label}</span>
              </div>
              <button onClick={()=>setSelBill(null)} style={{ width:30, height:30, borderRadius:9, background:"#F3F4F6", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <X size={14} color="#6B7280"/>
              </button>
            </div>
            {[
              { label:"Amount Due",    val:php(selBill.amount) },
              { label:"Due Date",      val:selBill.dueDate     },
              { label:"Billing Month", val:periodLabel },
              { label:"Status",        val:statusMeta(selBill.status).label },
            ].map(({ label, val })=>(
              <div key={label} style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderBottom:"1px solid #F3F4F6" }}>
                <p style={{ margin:0, fontSize:12, color:"#9CA3AF", fontFamily:IN }}>{label}</p>
                <p style={{ margin:0, fontSize:13, fontWeight:700, color:"#1F2937", fontFamily:QS }}>{val}</p>
              </div>
            ))}
            <button onClick={()=>setSelBill(null)} style={{ width:"100%", marginTop:18, padding:"12px 0", borderRadius:14, border:"none", backgroundImage:GRAD, color:"white", fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:QS }}>Close</button>
          </div>
        </div>
      )}

      {showSubmit && <SubmitPaymentModal bills={bills} periodLabel={periodLabel} onClose={()=>setShowSubmit(false)} onSubmit={doSubmit}/>}
      {histOpen  && <PaymentHistoryModal history={allHistory} onClose={()=>setHistOpen(false)} onSelect={rec=>setSelRec(rec)}/>}
      {selRec    && <PaymentDetailModal rec={selRec} bhName={assignment.bh.name} onClose={()=>setSelRec(null)}/>}
    </div>
  );
}
