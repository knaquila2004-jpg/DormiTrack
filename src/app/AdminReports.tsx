import React, { useState, useEffect } from "react";
import {
  Bell, MessageCircle, BarChart2, TrendingUp, Users, Building2,
  CreditCard, LogIn, LogOut, FileText, ChevronDown, ChevronUp,
  Download, Calendar, CheckCircle, Clock, AlertCircle, X, Eye,
  RefreshCw, Filter,
} from "lucide-react";
import {
  getAdminAnalyticsStats, getDailyActivity, getMonthlyRegistrations, getAdminInsights,
  AdminAnalyticsStats, DailyActivity, MonthlyRegistration,
} from "./adminStore";
import { getAllReportsForAdmin, respondToReport, AdminReportRow } from "./reportStore";

const GRAD   = "linear-gradient(135deg,#9772F6 0%,#7549F6 100%)";
const GRAD_H = "linear-gradient(160deg,#9772F6 0%,#7549F6 100%)";
const QS     = "'Quicksand',sans-serif";
const IN     = "'Inter',sans-serif";

const EMPTY_ANALYTICS: AdminAnalyticsStats = { monthlyCheckins: 0, monthlyCheckouts: 0, activeUsers: 0, dormOccupancyPct: 0, paymentCompletionPct: 0 };

function buildTopStats(s: AdminAnalyticsStats) {
  return [
    { label:"Monthly Check-ins",  val:String(s.monthlyCheckins),        color:"#16A34A", bg:"#DCFCE7", Icon:LogIn      },
    { label:"Monthly Check-outs", val:String(s.monthlyCheckouts),       color:"#D97706", bg:"#FEF3C7", Icon:LogOut     },
    { label:"Active Users",       val:String(s.activeUsers),            color:"#9772F6", bg:"#F5F0FF", Icon:Users      },
    { label:"Dorm Occupancy",     val:`${s.dormOccupancyPct}%`,         color:"#3B82F6", bg:"#EFF6FF", Icon:Building2  },
    { label:"Payment Completion", val:`${s.paymentCompletionPct}%`,     color:"#6366F1", bg:"#EEF2FF", Icon:CreditCard },
  ];
}

// UI-only status vocabulary ("archived") maps onto the real reports table's
// `closed` status when persisting — see handleAction below.
type ReportStatus = "pending"|"in-progress"|"resolved"|"closed";
type UiStatus = "pending"|"resolved"|"archived";
function toUiStatus(s: ReportStatus): UiStatus { return s === "closed" ? "archived" : s === "in-progress" ? "pending" : s; }

const STATUS_META: Record<UiStatus,{ label:string; color:string; bg:string }> = {
  pending:  { label:"Pending",  color:"#D97706", bg:"#FEF3C7" },
  resolved: { label:"Resolved", color:"#16A34A", bg:"#DCFCE7" },
  archived: { label:"Archived", color:"#6B7280", bg:"#F3F4F6" },
};

function BarChart({ data, maxVal }: { data:{day:string;checkins:number;checkouts:number}[]; maxVal:number }) {
  return (
    <div style={{ display:"flex", alignItems:"flex-end", gap:8, height:100 }}>
      {data.map(({ day, checkins, checkouts })=>(
        <div key={day} style={{ flex:1, display:"flex", flexDirection:"column" as const, alignItems:"center", gap:3 }}>
          <div style={{ width:"100%", display:"flex", gap:2, alignItems:"flex-end", height:80 }}>
            <div style={{ flex:1, backgroundImage:GRAD, borderRadius:"3px 3px 0 0", height:`${(checkins/maxVal)*80}px` }}/>
            <div style={{ flex:1, background:"#D97706", borderRadius:"3px 3px 0 0", height:`${(checkouts/maxVal)*80}px`, opacity:.8 }}/>
          </div>
          <span style={{ fontSize:8, color:"#9CA3AF", fontFamily:IN }}>{day}</span>
        </div>
      ))}
    </div>
  );
}

function LineChart({ data, maxVal }: { data:{month:string;val:number}[]; maxVal:number }) {
  const W = 320; const H = 80; const pad = 16;
  const pts = data.map((d,i)=> `${pad + i * ((W-pad*2)/(data.length-1))},${H - pad - (d.val/maxVal)*(H-pad*2)}`).join(" ");
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9772F6" stopOpacity=".3"/>
          <stop offset="100%" stopColor="#9772F6" stopOpacity="0"/>
        </linearGradient>
      </defs>
      <polyline fill="none" stroke="#9772F6" strokeWidth="2.5" points={pts} strokeLinecap="round" strokeLinejoin="round"/>
      {data.map((d,i)=>{
        const cx = pad + i * ((W-pad*2)/(data.length-1));
        const cy = H - pad - (d.val/maxVal)*(H-pad*2);
        return <circle key={i} cx={cx} cy={cy} r="4" fill="#9772F6" stroke="white" strokeWidth="2"/>;
      })}
    </svg>
  );
}

export function AdminReportsScreen({ go }: { go:(s:string)=>void }) {
  const [reports,   setReports]   = useState<AdminReportRow[]>([]);
  const [selected,  setSelected]  = useState<AdminReportRow|null>(null);
  const [dateRange, setDateRange] = useState("This Month");
  const [showDate,  setShowDate]  = useState(false);

  const [analytics, setAnalytics] = useState<AdminAnalyticsStats>(EMPTY_ANALYTICS);
  const [daily,     setDaily]     = useState<DailyActivity[]>([]);
  const [monthly,   setMonthly]   = useState<MonthlyRegistration[]>([]);
  const [insights,  setInsights]  = useState<string[]>([]);

  const refreshReports = () => { getAllReportsForAdmin().then(setReports); };
  useEffect(() => {
    let active = true;
    refreshReports();
    Promise.all([getAdminAnalyticsStats(), getDailyActivity(), getMonthlyRegistrations()]).then(([a, d, m]) => {
      if (!active) return;
      setAnalytics(a); setDaily(d); setMonthly(m);
      getAdminInsights(d, m).then(ins => { if (active) setInsights(ins); });
    });
    return () => { active = false; };
  }, []);

  const TOP_STATS = buildTopStats(analytics);
  const MAX_VAL = Math.max(1, ...daily.map(d=>d.checkins));
  const MAX_REG = Math.max(1, ...monthly.map(r=>r.val));

  const DATE_OPTS = ["Today","This Week","This Month","Last 3 Months","This Year"];

  const handleAction = async (id:string, act:string) => {
    const res = await respondToReport(id, act === "resolve" ? "resolved" : "closed");
    if (res.ok === false) { console.error("respondToReport failed:", res.error); return; }
    refreshReports();
    setSelected(null);
  };

  // Real CSV download of the currently-loaded reports — this button previously had no onClick
  // handler at all (a completely dead button, not even a fake success message).
  const exportReportsCsv = () => {
    const headers = ["Report ID", "Reporter", "Category", "Boarding House", "Date", "Status"];
    const csvEscape = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const rows = reports.map(r => [r.id, r.reporterName, r.category, r.boardingHouseName, r.date, r.status]);
    const csv = [headers, ...rows].map(row => row.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `admin-reports-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column" as const, background:"#F2F4F8", position:"relative" as const }}>

      {/* Report Detail Modal */}
      {selected && (
        <div style={{ position:"fixed" as const, inset:0, background:"rgba(0,0,0,.55)", zIndex:200, display:"flex", flexDirection:"column" as const, justifyContent:"flex-end" }} onClick={()=>setSelected(null)}>
          <div style={{ background:"#F2F4F8", borderRadius:"24px 24px 0 0", padding:"20px 18px 36px" }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
              <h3 style={{ margin:0, fontSize:15, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Report Details</h3>
              <button onClick={()=>setSelected(null)} style={{ width:30, height:30, borderRadius:10, background:"#F3F4F6", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><X size={13} color="#6B7280"/></button>
            </div>
            {[["Reporter",selected.reporterName],["Category",selected.category],["Boarding House",selected.boardingHouseName],["Date",selected.date],["Status",STATUS_META[toUiStatus(selected.status)].label]].map(([l,v])=>(
              <div key={l} style={{ padding:"8px 0", borderBottom:"1px solid #F3F4F6" }}>
                <p style={{ margin:0, fontSize:9, color:"#9CA3AF", fontFamily:QS, fontWeight:700, textTransform:"uppercase" as const }}>{l}</p>
                <p style={{ margin:"2px 0 0", fontSize:12, fontWeight:700, color:"#1F2937", fontFamily:IN }}>{v}</p>
              </div>
            ))}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:16 }}>
              {toUiStatus(selected.status) !== "resolved" && <button onClick={()=>handleAction(selected.id,"resolve")} style={{ height:44, borderRadius:16, backgroundImage:GRAD, border:"none", cursor:"pointer", color:"white", fontSize:12, fontWeight:800, fontFamily:QS }}>Mark Resolved</button>}
              {toUiStatus(selected.status) !== "archived" && <button onClick={()=>handleAction(selected.id,"archive")} style={{ height:44, borderRadius:16, border:"1.5px solid #9CA3AF", background:"white", cursor:"pointer", color:"#374151", fontSize:12, fontWeight:800, fontFamily:QS }}>Archive</button>}
            </div>
          </div>
        </div>
      )}

      {/* Scrollable body */}
      <div style={{ flex:1, overflowY:"auto" as const, scrollbarWidth:"none" as const }}>

        {/* Header */}
        <div style={{ backgroundImage:GRAD_H, padding:"52px 20px 18px", position:"relative" as const, overflow:"hidden" }}>
          <div style={{ position:"absolute" as const, top:-40, right:-40, width:140, height:140, borderRadius:"50%", background:"rgba(255,255,255,.05)" }}/>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
            <div>
              <h1 style={{ margin:"0 0 3px", fontSize:20, fontWeight:800, color:"white", fontFamily:QS }}>Reports & Analytics</h1>
              <p style={{ margin:0, fontSize:11, color:"rgba(255,255,255,.65)", fontFamily:IN }}>System-wide monitoring center</p>
            </div>
          </div>

          {/* Date range + export */}
          <div style={{ display:"flex", gap:8, marginTop:12 }}>
            <div style={{ position:"relative" as const, flex:1 }}>
              <button onClick={()=>setShowDate(p=>!p)} style={{ width:"100%", height:36, borderRadius:14, background:"rgba(255,255,255,.18)", border:"none", cursor:"pointer", color:"rgba(255,255,255,.9)", fontSize:11, fontWeight:700, fontFamily:QS, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 12px", backdropFilter:"blur(6px)" }}>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}><Calendar size={12} color="rgba(255,255,255,.8)"/>{dateRange}</div>
                <ChevronDown size={12} color="rgba(255,255,255,.7)"/>
              </button>
              {showDate && (
                <div style={{ position:"absolute" as const, top:42, left:0, right:0, background:"white", borderRadius:14, padding:6, boxShadow:"0 8px 24px rgba(0,0,0,.2)", zIndex:50 }}>
                  {DATE_OPTS.map(o=>(
                    <button key={o} onClick={()=>{ setDateRange(o); setShowDate(false); }} style={{ width:"100%", padding:"9px 12px", borderRadius:9, border:"none", cursor:"pointer", background:dateRange===o?"#F5F0FF":"white", color:dateRange===o?"#9772F6":"#374151", fontSize:12, fontWeight:700, fontFamily:QS, textAlign:"left" as const }}>
                      {o}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={exportReportsCsv} style={{ height:36, padding:"0 14px", borderRadius:14, backgroundImage:GRAD, border:"none", cursor:"pointer", color:"white", fontSize:11, fontWeight:800, fontFamily:QS, display:"flex", alignItems:"center", gap:5 }}>
              <Download size={12} color="white"/>Export
            </button>
          </div>
        </div>

        <div style={{ padding:"16px 16px 32px" }}>

          {/* Top stat cards scroll */}
          <div style={{ display:"flex", gap:10, overflowX:"auto" as const, scrollbarWidth:"none" as const, marginBottom:18, paddingBottom:2 }}>
            {TOP_STATS.map(({ label, val, color, bg, Icon })=>(
              <div key={label} style={{ flexShrink:0, width:120, background:"white", borderRadius:18, padding:"14px 14px", boxShadow:"0 3px 12px rgba(0,0,0,.07)" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                  <div style={{ width:28, height:28, borderRadius:9, background:bg, display:"flex", alignItems:"center", justifyContent:"center" }}><Icon size={13} color={color}/></div>
                </div>
                <p style={{ margin:0, fontSize:18, fontWeight:800, color:"#1F2937", fontFamily:QS }}>{val}</p>
                <p style={{ margin:"2px 0 0", fontSize:8, color:"#9CA3AF", fontFamily:IN, lineHeight:1.3 }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Daily Activity chart */}
          <div style={{ background:"white", borderRadius:20, padding:"16px 16px", boxShadow:"0 4px 16px rgba(0,0,0,.07)", marginBottom:14 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
              <p style={{ margin:0, fontSize:13, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Daily Student Activity</p>
              <div style={{ display:"flex", gap:12 }}>
                <div style={{ display:"flex", alignItems:"center", gap:4 }}><div style={{ width:8, height:8, borderRadius:2, backgroundImage:GRAD }}/><span style={{ fontSize:9, color:"#6B7280", fontFamily:IN }}>Check-in</span></div>
                <div style={{ display:"flex", alignItems:"center", gap:4 }}><div style={{ width:8, height:8, borderRadius:2, background:"#D97706" }}/><span style={{ fontSize:9, color:"#6B7280", fontFamily:IN }}>Check-out</span></div>
              </div>
            </div>
            {daily.length === 0 ? (
              <p style={{ textAlign:"center" as const, fontSize:11, color:"#9CA3AF", fontFamily:IN, padding:"20px 0" }}>No check-in/out activity in this range yet.</p>
            ) : (<>
              <BarChart data={daily} maxVal={MAX_VAL}/>
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:6 }}>
                {daily.map(d=><span key={d.day} style={{ flex:1, fontSize:8, color:"#9CA3AF", fontFamily:IN, textAlign:"center" as const }}>{d.day}</span>)}
              </div>
            </>)}
          </div>

          {/* Monthly Registrations chart */}
          <div style={{ background:"white", borderRadius:20, padding:"16px 16px", boxShadow:"0 4px 16px rgba(0,0,0,.07)", marginBottom:14 }}>
            <p style={{ margin:"0 0 12px", fontSize:13, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Monthly Registrations</p>
            {monthly.length === 0 ? (
              <p style={{ textAlign:"center" as const, fontSize:11, color:"#9CA3AF", fontFamily:IN, padding:"20px 0" }}>No registrations submitted in this range yet.</p>
            ) : (<>
              <LineChart data={monthly} maxVal={MAX_REG}/>
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:6 }}>
                {monthly.map(d=><span key={d.month} style={{ flex:1, fontSize:8, color:"#9CA3AF", fontFamily:IN, textAlign:"center" as const }}>{d.month}</span>)}
              </div>
            </>)}
          </div>

          {/* Submitted Reports */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
            <p style={{ margin:0, fontSize:13, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Submitted Reports</p>
            <span style={{ fontSize:9, fontWeight:800, padding:"3px 9px", borderRadius:20, background:"#FEF3C7", color:"#D97706", fontFamily:QS }}>{reports.filter(r=>toUiStatus(r.status)==="pending").length} pending</span>
          </div>
          <div style={{ background:"white", borderRadius:20, overflow:"hidden", boxShadow:"0 4px 16px rgba(0,0,0,.07)", marginBottom:14 }}>
            {reports.length === 0 && (
              <p style={{ textAlign:"center" as const, fontSize:11, color:"#9CA3AF", fontFamily:IN, padding:"20px 0" }}>No reports submitted yet.</p>
            )}
            {reports.map((r,i)=>{
              const sm = STATUS_META[toUiStatus(r.status)];
              return (
                <div key={r.id} onClick={()=>setSelected(r)} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", borderBottom:i<reports.length-1?"1px solid #F9FAFB":"none", cursor:"pointer" }}>
                  <div style={{ width:36, height:36, borderRadius:12, background:sm.bg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <FileText size={15} color={sm.color}/>
                  </div>
                  <div style={{ flex:1 }}>
                    <p style={{ margin:"0 0 2px", fontSize:12, fontWeight:800, color:"#1F2937", fontFamily:QS }}>{r.category}</p>
                    <p style={{ margin:0, fontSize:10, color:"#9CA3AF", fontFamily:IN }}>{r.reporterName} · {r.boardingHouseName} · {r.date}</p>
                  </div>
                  <span style={{ fontSize:9, fontWeight:800, padding:"2px 8px", borderRadius:20, background:sm.bg, color:sm.color, fontFamily:QS }}>{sm.label}</span>
                </div>
              );
            })}
          </div>

          {/* System Insights */}
          {insights.length > 0 && (<>
          <p style={{ margin:"0 0 10px", fontSize:13, fontWeight:800, color:"#1F2937", fontFamily:QS }}>System Insights</p>
          <div style={{ background:"white", borderRadius:20, overflow:"hidden", boxShadow:"0 4px 16px rgba(0,0,0,.07)" }}>
            {insights.map((insight,i)=>(
              <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"11px 16px", borderBottom:i<insights.length-1?"1px solid #F9FAFB":"none" }}>
                <div style={{ width:20, height:20, borderRadius:7, backgroundImage:GRAD, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1 }}>
                  <span style={{ fontSize:9, fontWeight:800, color:"white", fontFamily:QS }}>{i+1}</span>
                </div>
                <p style={{ margin:0, fontSize:11, color:"#374151", fontFamily:IN, lineHeight:1.5 }}>{insight}</p>
              </div>
            ))}
          </div>
          </>)}

        </div>
      </div>
    </div>
  );
}
