import React, { useState } from "react";
import {
  CreditCard, CheckCircle, Clock, AlertCircle, Bell,
  ChevronDown, ChevronUp, X, Check, Receipt,
  ArrowDown, Banknote, Droplet, Zap, Trash2, Eye,
} from "lucide-react";
import { BILLING_DATA, BH_DATA, ROOM_DATA, STAY_DATA } from "./StudentHome";

const GRAD = "linear-gradient(135deg,#9772F6 0%,#7549F6 100%)";
const GRAD_H = "linear-gradient(160deg,#9772F6 0%,#7549F6 100%)";
const QS   = "'Quicksand',sans-serif";
const IN   = "'Inter',sans-serif";

type PayStatus = "paid" | "awaiting-verification" | "overdue" | "unpaid" | "parent-submitted";

interface Payment {
  id: string; period: string; amount: number; dueDate: string;
  paidDate: string | null; status: PayStatus; method: string | null; ref: string | null;
}

const INIT_PAYMENTS: Payment[] = [
  { id:"p1", period:"August 2026",    amount:4100, dueDate:"Aug 10, 2026",  paidDate:null,          status:"awaiting-verification", method:"GCash",    ref:"GC202408042301" },
  { id:"p2", period:"July 2026",      amount:4100, dueDate:"Jul 10, 2026",  paidDate:"Jul 9, 2026", status:"paid",                  method:"GCash",    ref:"GC202407081244" },
  { id:"p3", period:"June 2026",      amount:4100, dueDate:"Jun 10, 2026",  paidDate:"Jun 8, 2026", status:"paid",                  method:"Cash",     ref:null            },
  { id:"p4", period:"May 2026",       amount:4100, dueDate:"May 10, 2026",  paidDate:"May 7, 2026", status:"paid",                  method:"GCash",    ref:"GC202405071033" },
];

const STATUS_META: Record<PayStatus,{ label:string; color:string; bg:string }> = {
  "paid":                   { label:"Paid",                       color:"#16A34A", bg:"#DCFCE7" },
  "awaiting-verification":  { label:"Awaiting Verification",      color:"#D97706", bg:"#FEF3C7" },
  "overdue":                { label:"Overdue",                    color:"#DC2626", bg:"#FEE2E2" },
  "unpaid":                 { label:"Unpaid",                     color:"#6B7280", bg:"#F3F4F6" },
  "parent-submitted":       { label:"Waiting for Landlord",       color:"#7C3AED", bg:"#EDE9FE" },
};

const BILL_ROWS = [
  { Icon:Banknote, label:"Monthly Rent",  amount:BILLING_DATA.amount,      color:"#9772F6", bg:"#F5F0FF" },
  { Icon:Droplet,  label:"Water Bill",    amount:BILLING_DATA.water,       color:"#3B82F6", bg:"#EFF6FF" },
  { Icon:Zap,      label:"Electricity",   amount:BILLING_DATA.electricity, color:"#D97706", bg:"#FEF3C7" },
  { Icon:Trash2,   label:"Garbage Fee",   amount:BILLING_DATA.garbage,     color:"#16A34A", bg:"#DCFCE7" },
];

export function ParentPaymentsScreen({ go }: { go:(s:string)=>void }) {
  const [payments, setPayments] = useState<Payment[]>(INIT_PAYMENTS);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDetail, setShowDetail]   = useState<Payment|null>(null);
  const [histOpen, setHistOpen]       = useState(true);

  const current = payments[0];
  const { label:statusLabel, color:statusColor, bg:statusBg } = STATUS_META[current.status];

  function markAsPaid() {
    setPayments(ps => ps.map((p,i) => i===0 ? { ...p, status:"parent-submitted", paidDate:new Date().toLocaleDateString("en-PH",{month:"short",day:"numeric",year:"numeric"}) } : p));
    setShowConfirm(false);
  }

  const canMarkPaid = current.status === "unpaid" || current.status === "overdue";

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column" as const, background:"#F2F4F8", position:"relative" as const }}>

      {/* Confirm Modal */}
      {showConfirm && (
        <div style={{ position:"absolute" as const, inset:0, background:"rgba(0,0,0,.55)", zIndex:100, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }} onClick={()=>setShowConfirm(false)}>
          <div style={{ background:"white", borderRadius:24, padding:"28px 22px", width:"100%", maxWidth:320 }} onClick={e=>e.stopPropagation()}>
            <div style={{ width:56, height:56, borderRadius:20, background:"#F5F0FF", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
              <CreditCard size={26} color="#9772F6"/>
            </div>
            <h3 style={{ margin:"0 0 8px", fontSize:17, fontWeight:800, color:"#1F2937", fontFamily:QS, textAlign:"center" as const }}>Mark as Paid?</h3>
            <p style={{ margin:"0 0 16px", fontSize:12, color:"#6B7280", fontFamily:IN, lineHeight:1.6, textAlign:"center" as const }}>
              You are marking the <strong>{current.period}</strong> payment of <strong>₱{current.amount.toLocaleString()}</strong> as paid.
            </p>
            <div style={{ background:"#FEF3C7", borderRadius:12, padding:"10px 14px", marginBottom:18, display:"flex", gap:8 }}>
              <AlertCircle size={13} color="#D97706" style={{ flexShrink:0, marginTop:2 }}/>
              <p style={{ margin:0, fontSize:11, color:"#92400E", fontFamily:IN, lineHeight:1.5 }}>
                This is for <strong>record purposes only</strong>. The landlord must verify and approve before the status becomes "Paid".
              </p>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <button onClick={()=>setShowConfirm(false)} style={{ height:44, borderRadius:18, border:"2px solid #E5E7EB", background:"white", cursor:"pointer", fontSize:13, fontWeight:800, color:"#374151", fontFamily:QS }}>Cancel</button>
              <button onClick={markAsPaid} style={{ height:44, borderRadius:18, border:"none", backgroundImage:GRAD, cursor:"pointer", fontSize:13, fontWeight:800, color:"white", fontFamily:QS, boxShadow:"0 4px 14px rgba(151,114,246,.3)" }}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Detail Modal */}
      {showDetail && (
        <div style={{ position:"absolute" as const, inset:0, background:"rgba(0,0,0,.55)", zIndex:100, display:"flex", flexDirection:"column" as const, justifyContent:"flex-end" }} onClick={()=>setShowDetail(null)}>
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
                ["Room",       ROOM_DATA.name                        ],
                ["BH",         BH_DATA.name                          ],
              ].map(([l,v])=>(
                <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"9px 0", borderBottom:"1px solid #F3F4F6" }}>
                  <span style={{ fontSize:11, color:"#9CA3AF", fontFamily:QS, fontWeight:700 }}>{l}</span>
                  <span style={{ fontSize:11, color:"#1F2937", fontFamily:IN, fontWeight:700 }}>{v}</span>
                </div>
              ))}
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
            <button style={{ width:40, height:40, borderRadius:13, background:"rgba(255,255,255,.15)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Bell size={18} color="white"/>
            </button>
          </div>
          {/* Summary strip */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginTop:16 }}>
            {[
              { label:"Monthly",  val:`₱${BILLING_DATA.total.toLocaleString()}` },
              { label:"Due Date", val:BILLING_DATA.dueDate                      },
              { label:"Period",   val:BILLING_DATA.period                       },
            ].map(({ label, val })=>(
              <div key={label} style={{ background:"rgba(255,255,255,.14)", borderRadius:14, padding:"9px 10px", textAlign:"center" as const, backdropFilter:"blur(6px)" }}>
                <p style={{ margin:0, fontSize:12, fontWeight:800, color:"white", fontFamily:QS, lineHeight:1.1 }}>{val}</p>
                <p style={{ margin:"2px 0 0", fontSize:8, color:"rgba(255,255,255,.6)", fontFamily:IN }}>{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding:"16px 16px 32px" }}>

          {/* ── Current Bill Card ────────────────────────────────────────────── */}
          <div style={{ background:"white", borderRadius:22, boxShadow:"0 6px 24px rgba(151,114,246,.14)", overflow:"hidden", marginBottom:14, border:"1.5px solid rgba(151,114,246,.1)" }}>
            <div style={{ backgroundImage:GRAD, padding:"16px 18px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div>
                  <p style={{ margin:"0 0 2px", fontSize:11, color:"rgba(255,255,255,.7)", fontFamily:IN }}>{BILLING_DATA.period}</p>
                  <p style={{ margin:0, fontSize:26, fontWeight:800, color:"white", fontFamily:QS }}>₱{BILLING_DATA.total.toLocaleString()}</p>
                </div>
                <span style={{ fontSize:10, fontWeight:800, padding:"4px 12px", borderRadius:20, background:STATUS_META[current.status].bg, color:STATUS_META[current.status].color, fontFamily:QS, marginTop:4 }}>{statusLabel}</span>
              </div>
            </div>
            <div style={{ padding:"14px 18px 18px" }}>
              {BILL_ROWS.map(({ Icon, label, amount, color, bg })=>(
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
                <p style={{ margin:0, fontSize:14, fontWeight:800, color:"#9772F6", fontFamily:QS }}>₱{BILLING_DATA.total.toLocaleString()}</p>
              </div>

              {/* Mark as paid */}
              {canMarkPaid && (
                <button onClick={()=>setShowConfirm(true)} style={{ width:"100%", height:52, borderRadius:20, backgroundImage:GRAD, border:"none", cursor:"pointer", marginTop:16, display:"flex", alignItems:"center", justifyContent:"center", gap:8, boxShadow:"0 6px 20px rgba(151,114,246,.32)", color:"white", fontSize:14, fontWeight:800, fontFamily:QS }}>
                  <CheckCircle size={18} color="white"/> Mark as Paid
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
