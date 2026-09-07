import React, { useState, useEffect } from "react";
import {
  Bell, MessageCircle, BarChart2, TrendingUp, Users, Building2,
  CreditCard, LogIn, LogOut, FileText, ChevronDown, ChevronUp,
  Download, Calendar, CheckCircle, Clock, AlertCircle, X, Eye,
  RefreshCw, Filter,
} from "lucide-react";
import {
  getAdminAnalyticsStats, getDailyActivity, getMonthlyRegistrations, getAdminInsights, logAdminActivity,
  AdminAnalyticsStats, DailyActivity, MonthlyRegistration,
} from "./adminStore";
import { getAllReportsForAdmin, respondToReport, AdminReportRow } from "./reportStore";
import { useDeviceType } from "./components/useDeviceType";
import { CountUp } from "./components/CountUp";

const GRAD   = "linear-gradient(135deg,#9772F6 0%,#7549F6 100%)";
const GRAD_H = "linear-gradient(160deg,#9772F6 0%,#7549F6 100%)";
const QS     = "'Quicksand',sans-serif";
const IN     = "'Inter',sans-serif";

const EMPTY_ANALYTICS: AdminAnalyticsStats = { monthlyCheckins: 0, monthlyCheckouts: 0, activeUsers: 0, dormOccupancyPct: 0, paymentCompletionPct: 0 };

function buildTopStats(s: AdminAnalyticsStats) {
  return [
    { label:"Monthly Entries",    val:s.monthlyCheckins,       suffix:"", color:"#16A34A", bg:"#DCFCE7", Icon:LogIn      },
    { label:"Monthly Exits",      val:s.monthlyCheckouts,      suffix:"", color:"#D97706", bg:"#FEF3C7", Icon:LogOut     },
    { label:"Active Users",       val:s.activeUsers,           suffix:"", color:"#9772F6", bg:"#F5F0FF", Icon:Users      },
    { label:"Dorm Occupancy",     val:s.dormOccupancyPct,      suffix:"%",color:"#3B82F6", bg:"#EFF6FF", Icon:Building2  },
    { label:"Payment Completion", val:s.paymentCompletionPct,  suffix:"%",color:"#6366F1", bg:"#EEF2FF", Icon:CreditCard },
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

// Desktop/tablet data-table cell styles — same fields as the mobile row list,
// just columned at wide widths.
const TH: React.CSSProperties = { textAlign:"left" as const, padding:"11px 16px", fontSize:9, fontWeight:800, color:"#9CA3AF", fontFamily:QS, textTransform:"uppercase" as const, letterSpacing:0.5, whiteSpace:"nowrap" as const };
const TD: React.CSSProperties = { padding:"12px 16px", fontSize:12, color:"#374151", fontFamily:IN, verticalAlign:"middle" as const };

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
  // Desktop-only layout adjustments (AdminShellFrame in App.tsx already
  // provides the sidebar/header chrome at this width) — same data, same
  // charts, just more columns and no mobile-status-bar clearance.
  const deviceType = useDeviceType();
  const isWide = deviceType !== "mobile";
  const isDesktop = deviceType === "desktop";
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
    logAdminActivity(act === "resolve" ? "resolve_report" : "archive_report", `${act === "resolve" ? "Resolved" : "Archived"} report from ${selected?.reporterName ?? "a user"}`);
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
    logAdminActivity("export_reports", `Exported ${reports.length} report record${reports.length === 1 ? "" : "s"} to CSV`);
  };

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column" as const, background:"#F2F4F8", position:"relative" as const }}>

      {/* Report Detail Modal */}
      {selected && (
        <div style={{ position:"fixed" as const, inset:0, background:"rgba(0,0,0,.55)", zIndex:200, display:"flex", flexDirection:"column" as const, justifyContent:"flex-end" }} onClick={()=>setSelected(null)}>
          <div style={{ background:"#F2F4F8", borderRadius:"24px 24px 0 0", padding:"20px 18px 36px", maxWidth: isWide ? 480 : undefined, width: isWide ? "100%" : undefined, margin: isWide ? "0 auto" : undefined }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
              <h3 style={{ margin:0, fontSize:15, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Report Details</h3>
              <button className="dt-admin-btn" onClick={()=>setSelected(null)} style={{ width:30, height:30, borderRadius:10, background:"#F3F4F6", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><X size={13} color="#6B7280"/></button>
            </div>
            {[["Reporter",selected.reporterName],["Category",selected.category],["Boarding House",selected.boardingHouseName],["Date",selected.date],["Status",STATUS_META[toUiStatus(selected.status)].label]].map(([l,v])=>(
              <div key={l} style={{ padding:"8px 0", borderBottom:"1px solid #F3F4F6" }}>
                <p style={{ margin:0, fontSize:9, color:"#9CA3AF", fontFamily:QS, fontWeight:700, textTransform:"uppercase" as const }}>{l}</p>
                <p style={{ margin:"2px 0 0", fontSize:12, fontWeight:700, color:"#1F2937", fontFamily:IN }}>{v}</p>
              </div>
            ))}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:16 }}>
              {toUiStatus(selected.status) !== "resolved" && <button className="dt-admin-btn" onClick={()=>handleAction(selected.id,"resolve")} style={{ height:44, borderRadius:16, backgroundImage:GRAD, border:"none", cursor:"pointer", color:"white", fontSize:12, fontWeight:800, fontFamily:QS }}>Mark Resolved</button>}
              {toUiStatus(selected.status) !== "archived" && <button className="dt-admin-btn" onClick={()=>handleAction(selected.id,"archive")} style={{ height:44, borderRadius:16, border:"1.5px solid #9CA3AF", background:"white", cursor:"pointer", color:"#374151", fontSize:12, fontWeight:800, fontFamily:QS }}>Archive</button>}
            </div>
          </div>
        </div>
      )}

      {/* Scrollable body */}
      <div style={{ flex:1, overflowY:"auto" as const, scrollbarWidth:"none" as const }}>

        {/* Header — flat on desktop (sidebar carries the purple identity
            there); unchanged purple rectangle on mobile/tablet */}
        <div style={{ backgroundImage: isDesktop ? undefined : GRAD_H, background: isDesktop ? "white" : undefined, borderBottom: isDesktop ? "1px solid #EFEFF5" : undefined, padding: isWide ? "26px 32px 18px" : "52px 20px 18px", position:"relative" as const, overflow:"hidden" }}>
          {!isDesktop && <div style={{ position:"absolute" as const, top:-40, right:-40, width:140, height:140, borderRadius:"42% 58% 65% 35%/45% 40% 60% 55%", background:"rgba(255,255,255,.05)", filter:"blur(24px)" }}/>}
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
            <div>
              <h1 style={{ margin:"0 0 3px", fontSize:20, fontWeight:800, color: isDesktop ? "#1F2937" : "white", fontFamily:QS }}>Reports & Analytics</h1>
              <p style={{ margin:0, fontSize:11, color: isDesktop ? "#9CA3AF" : "rgba(255,255,255,.65)", fontFamily:IN }}>System-wide monitoring center</p>
            </div>
          </div>

          {/* Date range + export */}
          <div style={{ display:"flex", gap:8, marginTop:12 }}>
            <div style={{ position:"relative" as const, flex:1 }}>
              <button className="dt-admin-btn" onClick={()=>setShowDate(p=>!p)} style={{ width:"100%", height:36, borderRadius:14, background: isDesktop ? "#F3F4F6" : "rgba(255,255,255,.18)", border:"none", cursor:"pointer", color: isDesktop ? "#374151" : "rgba(255,255,255,.9)", fontSize:11, fontWeight:700, fontFamily:QS, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 12px", backdropFilter: isDesktop ? undefined : "blur(6px)" }}>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}><Calendar size={12} color={isDesktop ? "#9CA3AF" : "rgba(255,255,255,.8)"}/>{dateRange}</div>
                <ChevronDown size={12} color={isDesktop ? "#9CA3AF" : "rgba(255,255,255,.7)"} style={{ transition:"transform .2s ease", transform: showDate ? "rotate(180deg)" : "none" }}/>
              </button>
              {showDate && (
                <div className="dt-admin-fade-in" style={{ position:"absolute" as const, top:42, left:0, right:0, background:"white", borderRadius:14, padding:6, boxShadow:"0 8px 24px rgba(0,0,0,.2)", zIndex:50 }}>
                  {DATE_OPTS.map(o=>(
                    <button key={o} className="dt-admin-btn dt-admin-row" onClick={()=>{ setDateRange(o); setShowDate(false); }} style={{ width:"100%", padding:"9px 12px", borderRadius:9, border:"none", cursor:"pointer", background:dateRange===o?"#F5F0FF":"white", color:dateRange===o?"#9772F6":"#374151", fontSize:12, fontWeight:700, fontFamily:QS, textAlign:"left" as const }}>
                      {o}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button className="dt-admin-btn" onClick={exportReportsCsv} style={{ height:36, padding:"0 14px", borderRadius:14, backgroundImage:GRAD, border:"none", cursor:"pointer", color:"white", fontSize:11, fontWeight:800, fontFamily:QS, display:"flex", alignItems:"center", gap:5 }}>
              <Download size={12} color="white"/>Export
            </button>
          </div>
        </div>

        <div style={{ padding: isWide ? "20px 32px 40px" : "16px 16px 32px" }}>
        <div style={{ maxWidth: isWide ? 1100 : undefined, margin: isWide ? "0 auto" : undefined }}>

          {/* Top stat cards — horizontal scroll on mobile, a fixed row on desktop
              (same 5 real stats either way) */}
          <div style={ isWide
            ? { display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10, marginBottom:18 }
            : { display:"flex", gap:10, overflowX:"auto" as const, scrollbarWidth:"none" as const, marginBottom:18, paddingBottom:2 }
          }>
            {TOP_STATS.map(({ label, val, suffix, color, bg, Icon },i)=>(
              <div key={label} className="dt-admin-card dt-admin-fade-in" style={{ flexShrink:0, width: isWide ? undefined : 120, background:"white", borderRadius:18, padding:"14px 14px", boxShadow:"0 3px 12px rgba(0,0,0,.07)", borderTop:`2.5px solid ${color}`, animationDelay:`${i*40}ms` }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                  <div style={{ width:28, height:28, borderRadius:9, background:bg, display:"flex", alignItems:"center", justifyContent:"center" }}><Icon size={13} color={color}/></div>
                </div>
                <p style={{ margin:0, fontSize:18, fontWeight:800, color:"#1F2937", fontFamily:QS }}><CountUp value={val} suffix={suffix}/></p>
                <p style={{ margin:"2px 0 0", fontSize:8, color:"#9CA3AF", fontFamily:IN, lineHeight:1.3 }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Daily Activity + Monthly Registrations — stacked on mobile, side by
              side on desktop (same two real charts either way) */}
          <div style={ isWide ? { display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 } : undefined }>
          {/* Daily Activity chart */}
          <div className="dt-admin-card dt-admin-fade-in" style={{ background:"white", borderRadius:20, padding:"16px 16px", boxShadow:"0 4px 16px rgba(0,0,0,.07)", marginBottom: isWide ? 0 : 14 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
              <p style={{ margin:0, fontSize:13, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Daily Student Activity</p>
              <div style={{ display:"flex", gap:12 }}>
                <div style={{ display:"flex", alignItems:"center", gap:4 }}><div style={{ width:8, height:8, borderRadius:2, backgroundImage:GRAD }}/><span style={{ fontSize:9, color:"#6B7280", fontFamily:IN }}>Entry</span></div>
                <div style={{ display:"flex", alignItems:"center", gap:4 }}><div style={{ width:8, height:8, borderRadius:2, background:"#D97706" }}/><span style={{ fontSize:9, color:"#6B7280", fontFamily:IN }}>Exit</span></div>
              </div>
            </div>
            {daily.length === 0 ? (
              <p style={{ textAlign:"center" as const, fontSize:11, color:"#9CA3AF", fontFamily:IN, padding:"20px 0" }}>No Enter/Exit activity in this range yet.</p>
            ) : (<>
              <BarChart data={daily} maxVal={MAX_VAL}/>
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:6 }}>
                {daily.map(d=><span key={d.day} style={{ flex:1, fontSize:8, color:"#9CA3AF", fontFamily:IN, textAlign:"center" as const }}>{d.day}</span>)}
              </div>
            </>)}
          </div>

          {/* Monthly Registrations chart */}
          <div className="dt-admin-card dt-admin-fade-in" style={{ background:"white", borderRadius:20, padding:"16px 16px", boxShadow:"0 4px 16px rgba(0,0,0,.07)", marginBottom: isWide ? 0 : 14 }}>
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
          </div>

          {/* Submitted Reports */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
            <p style={{ margin:0, fontSize:13, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Submitted Reports</p>
            <span style={{ fontSize:9, fontWeight:800, padding:"3px 9px", borderRadius:20, background:"#FEF3C7", color:"#D97706", fontFamily:QS }}>{reports.filter(r=>toUiStatus(r.status)==="pending").length} pending</span>
          </div>
          {reports.length === 0 ? (
            <div style={{ background:"white", borderRadius:20, boxShadow:"0 4px 16px rgba(0,0,0,.07)", marginBottom:14 }}>
              <p style={{ textAlign:"center" as const, fontSize:11, color:"#9CA3AF", fontFamily:IN, padding:"20px 0" }}>No reports submitted yet.</p>
            </div>
          ) : isWide ? (
            // Real desktop/tablet data table — same rows/fields as the mobile
            // card list below, just columned.
            <div className="dt-admin-fade-in" style={{ background:"white", borderRadius:20, overflow:"hidden", boxShadow:"0 4px 16px rgba(0,0,0,.07)", marginBottom:14, overflowX:"auto" as const }}>
              <table style={{ width:"100%", borderCollapse:"collapse" as const }}>
                <thead>
                  <tr style={{ background:"#F9FAFB", borderBottom:"1px solid #F3F4F6" }}>
                    <th style={TH}>Category</th>
                    <th style={TH}>Reporter</th>
                    <th style={TH}>Boarding House</th>
                    <th style={TH}>Date</th>
                    <th style={TH}>Status</th>
                    <th style={{ ...TH, textAlign:"right" as const }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r,i)=>{
                    const sm = STATUS_META[toUiStatus(r.status)];
                    return (
                      <tr key={r.id} className="dt-admin-row" onClick={()=>setSelected(r)} style={{ borderBottom:i<reports.length-1?"1px solid #F9FAFB":"none", cursor:"pointer" }}>
                        <td style={TD}>
                          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                            <div style={{ width:30, height:30, borderRadius:10, background:sm.bg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                              <FileText size={13} color={sm.color}/>
                            </div>
                            <span style={{ fontSize:12, fontWeight:800, color:"#1F2937", fontFamily:QS }}>{r.category}</span>
                          </div>
                        </td>
                        <td style={TD}>{r.reporterName}</td>
                        <td style={TD}>{r.boardingHouseName}</td>
                        <td style={TD}>{r.date}</td>
                        <td style={TD}><span style={{ fontSize:9, fontWeight:800, padding:"3px 9px", borderRadius:20, background:sm.bg, color:sm.color, fontFamily:QS }}>{sm.label}</span></td>
                        <td style={{ ...TD, textAlign:"right" as const }}>
                          <button className="dt-admin-btn" onClick={e=>{e.stopPropagation();setSelected(r);}} style={{ height:30, padding:"0 12px", borderRadius:20, backgroundImage:GRAD, border:"none", cursor:"pointer", fontSize:10, fontWeight:800, color:"white", fontFamily:QS, display:"inline-flex", alignItems:"center", gap:4 }}>
                            <Eye size={11} color="white"/>View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ background:"white", borderRadius:20, overflow:"hidden", boxShadow:"0 4px 16px rgba(0,0,0,.07)", marginBottom:14 }}>
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
          )}

          {/* System Insights */}
          {insights.length > 0 && (<>
          <p style={{ margin:"0 0 10px", fontSize:13, fontWeight:800, color:"#1F2937", fontFamily:QS }}>System Insights</p>
          <div className="dt-admin-fade-in" style={{ background:"white", borderRadius:20, overflow:"hidden", boxShadow:"0 4px 16px rgba(0,0,0,.07)" }}>
            {insights.map((insight,i)=>(
              <div key={i} className="dt-admin-row" style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"11px 16px", borderBottom:i<insights.length-1?"1px solid #F9FAFB":"none" }}>
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
    </div>
  );
}
