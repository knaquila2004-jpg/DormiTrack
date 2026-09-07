import React, { useState, useEffect } from "react";
import {
  Bell, MessageCircle, User, Home, Users, Building2, LogIn, LogOut,
  CheckCircle, AlertCircle, Clock, FileText, Megaphone, Plus,
  TrendingUp, ShieldCheck, BarChart2, Zap, RefreshCw,
  ChevronRight, UserCheck, UserPlus, Activity, X,
} from "lucide-react";
import { useUnreadCount, fmtBadgeCount, timeAgo } from "./notificationStore";
import { useUnreadChatCount } from "./chatStore";
import { getAdminOverviewStats, getAdminTodayWidgets, getRecentPlatformActivity, AdminOverviewStats, AdminTodayWidgets, PlatformActivity } from "./adminStore";
import { useDeviceType } from "./components/useDeviceType";
import { CountUp } from "./components/CountUp";

const GRAD   = "linear-gradient(135deg,#9772F6 0%,#7549F6 100%)";
const GRAD_H = "linear-gradient(160deg,#9772F6 0%,#7549F6 100%)";
const QS     = "'Quicksand',sans-serif";
const IN     = "'Inter',sans-serif";

const EMPTY_STATS: AdminOverviewStats = { totalStudents: 0, totalParents: 0, totalLandlords: 0, totalBoardingHouses: 0, activeInside: 0, outsideBH: 0, pendingVerifications: 0, reportsToday: 0 };
const EMPTY_WIDGETS: AdminTodayWidgets = { newUsers: 0, checkIns: 0, checkOuts: 0, pendingReports: 0, bhApprovals: 0 };

// No historical snapshot table exists to compute real period-over-period
// deltas (the old mock's "+12"/"-24" trend badges), so stat cards show the
// real current value only — an honest gap rather than a fabricated trend.
function buildStatCards(s: AdminOverviewStats) {
  return [
    { label:"Total Students",       val:s.totalStudents,       color:"#9772F6", bg:"#F5F0FF", Icon:Users       },
    { label:"Total Parents",        val:s.totalParents,        color:"#EC4899", bg:"#FDF2F8", Icon:Users       },
    { label:"Total Landlords",      val:s.totalLandlords,      color:"#3B82F6", bg:"#EFF6FF", Icon:Building2   },
    { label:"Boarding Houses",      val:s.totalBoardingHouses, color:"#6366F1", bg:"#EEF2FF", Icon:Home        },
    { label:"Active (Inside)",      val:s.activeInside,        color:"#16A34A", bg:"#DCFCE7", Icon:LogIn       },
    { label:"Outside BH",           val:s.outsideBH,           color:"#D97706", bg:"#FEF3C7", Icon:LogOut      },
    { label:"Pending Verifications",val:s.pendingVerifications,color:"#EF4444", bg:"#FEE2E2", Icon:AlertCircle },
    { label:"Reports Today",        val:s.reportsToday,        color:"#0891B2", bg:"#ECFEFF", Icon:FileText    },
  ];
}

// Icon/color treatment per PlatformActivity.type (adminStore.ts) — the real
// event feed itself only carries a plain string type + message + timestamp.
const ACTIVITY_META: Record<string, { Icon: React.ElementType; color: string; bg: string }> = {
  signup:       { Icon: UserPlus,   color: "#9772F6", bg: "#F5F0FF" },
  bh:           { Icon: Building2,  color: "#3B82F6", bg: "#EFF6FF" },
  link:         { Icon: UserCheck,  color: "#EC4899", bg: "#FDF2F8" },
  checkin:      { Icon: LogIn,      color: "#16A34A", bg: "#DCFCE7" },
  checkout:     { Icon: LogOut,     color: "#D97706", bg: "#FEF3C7" },
  report:       { Icon: FileText,   color: "#EF4444", bg: "#FEE2E2" },
  announcement: { Icon: Megaphone,  color: "#7C3AED", bg: "#EDE9FE" },
};

const QUICK_ACTIONS = [
  { label:"Verify Users",              Icon:UserCheck,  color:"#9772F6", bg:"#F5F0FF", screen:"adminUsers"   },
  { label:"View Reports",              Icon:FileText,   color:"#EF4444", bg:"#FEE2E2", screen:"adminReports" },
  { label:"Boarding Houses",           Icon:Building2,  color:"#3B82F6", bg:"#EFF6FF", screen:"adminSystem"  },
  { label:"Broadcast",                 Icon:Megaphone,  color:"#D97706", bg:"#FEF3C7", screen:"adminSystem"  },
  { label:"Analytics",                 Icon:BarChart2,  color:"#6366F1", bg:"#EEF2FF", screen:"adminReports" },
  { label:"System",                    Icon:Activity,   color:"#0891B2", bg:"#ECFEFF", screen:"adminSystem"  },
];

function buildTodayWidgets(w: AdminTodayWidgets) {
  return [
    { label:"New Users",       val:w.newUsers,       color:"#9772F6" },
    { label:"Entries",         val:w.checkIns,       color:"#16A34A" },
    { label:"Exits",           val:w.checkOuts,      color:"#D97706" },
    { label:"Pending Reports", val:w.pendingReports, color:"#EF4444" },
    { label:"BH Approvals",    val:w.bhApprovals,    color:"#3B82F6" },
  ];
}

function fmtDate() {
  return new Date().toLocaleDateString("en-PH", { weekday:"long", month:"long", day:"numeric", year:"numeric" });
}

export function AdminDashboardScreen({ go }: { go:(s:string)=>void }) {
  const [refreshing, setRefreshing] = useState(false);
  const notifCount = useUnreadCount("admin");
  const chatCount = useUnreadChatCount("admin");
  // Desktop-only layout adjustments (AdminShellFrame in App.tsx already
  // provides the sidebar/header chrome at this width) — same data, same
  // components, just more columns and no mobile-status-bar clearance.
  // isDesktop additionally drops the purple app-bar rectangle in favor of a
  // flat header, now that the sidebar itself carries the purple identity —
  // mobile/tablet (no sidebar) keep the original purple app bar unchanged.
  const deviceType = useDeviceType();
  const isWide = deviceType !== "mobile";
  const isDesktop = deviceType === "desktop";

  const [stats, setStats] = useState<AdminOverviewStats>(EMPTY_STATS);
  const [widgets, setWidgets] = useState<AdminTodayWidgets>(EMPTY_WIDGETS);
  // Fetched at a generous limit so "View All" has something real to show beyond the
  // 5-item dashboard preview, without a second round-trip when it's opened.
  const [activity, setActivity] = useState<PlatformActivity[]>([]);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const loadStats = () => {
    Promise.all([getAdminOverviewStats(), getAdminTodayWidgets(), getRecentPlatformActivity(50)]).then(([s, w, a]) => { setStats(s); setWidgets(w); setActivity(a); });
  };
  useEffect(() => { loadStats(); }, []);

  const STATS = buildStatCards(stats);
  const TODAY_WIDGETS = buildTodayWidgets(widgets);

  const refresh = () => { setRefreshing(true); loadStats(); setTimeout(()=>setRefreshing(false), 1200); };

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column" as const, background:"#F2F4F8" }}>

      {/* ── App Bar — flat on desktop (the sidebar already carries the purple
          identity there); unchanged purple rectangle on mobile/tablet ──── */}
      <div style={{ flexShrink:0, backgroundImage: isDesktop ? undefined : GRAD_H, background: isDesktop ? "white" : undefined, borderBottom: isDesktop ? "1px solid #EFEFF5" : undefined, padding: isWide ? "26px 32px 20px" : "52px 20px 20px", position:"relative" as const, overflow:"hidden" }}>
        {!isDesktop && <div style={{ position:"absolute" as const, top:-40, right:-40, width:160, height:160, borderRadius:"42% 58% 65% 35%/45% 40% 60% 55%", background:"rgba(255,255,255,.05)", filter:"blur(28px)", pointerEvents:"none" }}/>}
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
          <div>
            <p style={{ margin:0, fontSize:11, color: isDesktop ? "#9772F6" : "rgba(255,255,255,.65)", fontFamily:IN, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:1 }}>Welcome,</p>
            <h1 style={{ margin:"2px 0 2px", fontSize:22, fontWeight:800, color: isDesktop ? "#1F2937" : "white", fontFamily:QS }}>Admin</h1>
            <p style={{ margin:0, fontSize:11, color: isDesktop ? "#9CA3AF" : "rgba(255,255,255,.6)", fontFamily:IN }}>{fmtDate()}</p>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={refresh} className="dt-admin-btn" style={{ width:40, height:40, borderRadius:13, background: isDesktop ? "#F5F0FF" : "rgba(255,255,255,.15)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <RefreshCw size={16} color={isDesktop ? "#7549F6" : "white"} style={{ transform:refreshing?"rotate(360deg)":"none", transition:"transform .6s" }}/>
            </button>
            <button onClick={()=>go("notifications")} className="dt-admin-btn" style={{ position:"relative" as const, width:40, height:40, borderRadius:13, background: isDesktop ? "#F5F0FF" : "rgba(255,255,255,.15)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Bell size={17} color={isDesktop ? "#7549F6" : "white"}/>
              {notifCount > 0 && <span style={{ position:"absolute" as const, top:-2, right:-2, width:16, height:16, borderRadius:"50%", background:"#EF4444", color:"white", fontSize:8, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center" }}>{fmtBadgeCount(notifCount)}</span>}
            </button>
            <button onClick={()=>go("messages")} className="dt-admin-btn" style={{ position:"relative" as const, width:40, height:40, borderRadius:13, background: isDesktop ? "#F5F0FF" : "rgba(255,255,255,.15)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <MessageCircle size={17} color={isDesktop ? "#7549F6" : "white"}/>
              {chatCount > 0 && <span style={{ position:"absolute" as const, top:-2, right:-2, width:16, height:16, borderRadius:"50%", background:"#22C55E", color:"white", fontSize:8, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center" }}>{fmtBadgeCount(chatCount)}</span>}
            </button>
            <button onClick={()=>go("adminProfile")} aria-label="My Profile" className="dt-admin-btn" style={{ position:"relative" as const, width:40, height:40, borderRadius:13, background: isDesktop ? "#F5F0FF" : "rgba(255,255,255,.15)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <User size={17} color={isDesktop ? "#7549F6" : "white"}/>
            </button>
          </div>
        </div>

        {/* Today widget strip */}
        <div style={{ display:"flex", gap:8, marginTop:16, overflowX:"auto" as const, scrollbarWidth:"none" as const, paddingBottom:2 }}>
          {TODAY_WIDGETS.map(({ label, val, color })=>(
            <div key={label} style={{ flexShrink:0, background: isDesktop ? `${color}14` : "rgba(255,255,255,.15)", borderRadius:14, padding:"9px 13px", backdropFilter: isDesktop ? undefined : "blur(8px)", textAlign:"center" as const, minWidth:70 }}>
              <p style={{ margin:0, fontSize:16, fontWeight:800, color: isDesktop ? color : "white", fontFamily:QS }}><CountUp value={val}/></p>
              <p style={{ margin:"2px 0 0", fontSize:8, color: isDesktop ? "#6B7280" : "rgba(255,255,255,.65)", fontFamily:IN, whiteSpace:"nowrap" as const }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Scrollable Body ──────────────────────────────────────────────────── */}
      <div style={{ flex:1, overflowY:"auto" as const, scrollbarWidth:"none" as const, padding: isWide ? "24px 32px 40px" : "16px 16px 32px" }}>
      <div style={{ maxWidth: isWide ? 1100 : undefined, margin: isWide ? "0 auto" : undefined }}>

        {/* Stat cards — 2 columns on mobile, 4 on desktop (same real data either way) */}
        <p style={{ margin:"0 0 10px", fontSize:13, fontWeight:800, color:"#1F2937", fontFamily:QS }}>System Overview</p>
        <div style={{ display:"grid", gridTemplateColumns: isWide ? "repeat(4,1fr)" : "1fr 1fr", gap:10, marginBottom:18 }}>
          {STATS.map(({ label, val, color, bg, Icon }, i)=>(
            <div key={label} className="dt-admin-card dt-admin-fade-in" style={{ background:"white", borderRadius:18, padding:"14px 14px", boxShadow:"0 3px 12px rgba(0,0,0,.06)", borderTop:`2.5px solid ${color}`, animationDelay:`${i*40}ms` }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                <div style={{ width:32, height:32, borderRadius:10, background:bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Icon size={15} color={color}/>
                </div>
              </div>
              <p style={{ margin:0, fontSize:20, fontWeight:800, color:"#1F2937", fontFamily:QS }}><CountUp value={val}/></p>
              <p style={{ margin:"2px 0 0", fontSize:9, color:"#9CA3AF", fontFamily:IN, lineHeight:1.3 }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <p style={{ margin:"0 0 10px", fontSize:13, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Quick Actions</p>
        <div style={{ display:"grid", gridTemplateColumns: isWide ? "repeat(6,1fr)" : "repeat(3,1fr)", gap:10, marginBottom:18 }}>
          {QUICK_ACTIONS.map(({ label, Icon, color, bg, screen }, i)=>(
            <button key={label} onClick={()=>go(screen)} className="dt-admin-card dt-admin-btn dt-admin-fade-in" style={{ background:"white", borderRadius:18, padding:"14px 8px", border:"none", cursor:"pointer", display:"flex", flexDirection:"column" as const, alignItems:"center", gap:8, boxShadow:"0 3px 12px rgba(0,0,0,.06)", animationDelay:`${i*40}ms` }}>
              <div style={{ width:40, height:40, borderRadius:13, background:bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Icon size={18} color={color}/>
              </div>
              <span style={{ fontSize:10, fontWeight:800, color:"#374151", fontFamily:QS, textAlign:"center" as const, lineHeight:1.3 }}>{label}</span>
            </button>
          ))}
        </div>

        {/* Recent Activity — only the 5 most recent; "View All" opens the rest (up to
            the 50 fetched above) in a modal instead of this card growing without end. */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
          <p style={{ margin:0, fontSize:13, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Recent Activity</p>
          {activity.length>5 && (
            <span onClick={()=>setShowAllActivity(true)} style={{ fontSize:11, color:"#9772F6", fontWeight:700, fontFamily:QS, cursor:"pointer" }}>View All</span>
          )}
        </div>
        <div style={{ background:"white", borderRadius:20, overflow:"hidden", boxShadow:"0 4px 16px rgba(0,0,0,.07)", marginBottom:18 }}>
          {activity.length === 0 && (
            <p style={{ margin:0, padding:"18px 16px", fontSize:12, color:"#9CA3AF", fontFamily:IN, textAlign:"center" as const }}>Nothing to show yet — activity will appear here as it happens.</p>
          )}
          {activity.slice(0,5).map(({ id, type, msg, ts }, i, arr)=>{
            const meta = ACTIVITY_META[type] ?? { Icon: Activity, color:"#6B7280", bg:"#F3F4F6" };
            return (
              <div key={id} className="dt-admin-row" style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"12px 16px", borderBottom:i<arr.length-1?"1px solid #F9FAFB":"none" }}>
                <div style={{ width:34, height:34, borderRadius:11, background:meta.bg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:2 }}>
                  <meta.Icon size={14} color={meta.color}/>
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ margin:"0 0 2px", fontSize:12, fontWeight:700, color:"#1F2937", fontFamily:IN, lineHeight:1.45 }}>{msg}</p>
                  <p style={{ margin:0, fontSize:10, color:"#9CA3AF", fontFamily:IN }}>{timeAgo(ts)}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pending banner */}
        <div className="dt-admin-card" style={{ background:"white", borderRadius:18, padding:"14px 16px", boxShadow:"0 3px 12px rgba(0,0,0,.06)", display:"flex", alignItems:"center", gap:12, border: stats.pendingVerifications > 0 ? "1px solid #FECACA" : "1px solid transparent" }}>
          <div style={{ width:42, height:42, borderRadius:14, background:"#FEE2E2", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <AlertCircle size={20} color="#EF4444"/>
          </div>
          <div style={{ flex:1 }}>
            <p style={{ margin:"0 0 1px", fontSize:13, fontWeight:800, color:"#1F2937", fontFamily:QS }}>{stats.pendingVerifications} Pending Verification{stats.pendingVerifications===1?"":"s"}</p>
            <p style={{ margin:0, fontSize:11, color:"#6B7280", fontFamily:IN }}>Accounts waiting for admin approval</p>
          </div>
          <button onClick={()=>go("adminUsers")} className="dt-admin-btn" style={{ height:34, padding:"0 14px", borderRadius:20, backgroundImage:GRAD, border:"none", cursor:"pointer", color:"white", fontSize:11, fontWeight:800, fontFamily:QS, boxShadow:"0 4px 12px rgba(151,114,246,.3)" }}>Review</button>
        </div>

      </div>
      </div>

      {showAllActivity && (
        <div style={{ position:"fixed" as const, inset:0, background:"rgba(0,0,0,.5)", zIndex:90, display:"flex", flexDirection:"column" as const, justifyContent:"flex-end" }} onClick={()=>setShowAllActivity(false)}>
          <div style={{ background:"#F7F8FC", borderRadius:"24px 24px 0 0", maxHeight:"85%", display:"flex", flexDirection:"column" as const, maxWidth: isWide ? 480 : undefined, width: isWide ? "100%" : undefined, margin: isWide ? "0 auto" : undefined }} onClick={e=>e.stopPropagation()}>
            <div style={{ padding:"18px 20px 14px", background:"white", borderRadius:"24px 24px 0 0", borderBottom:"1px solid #F3F4F6", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <p style={{ margin:0, fontSize:15, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Recent Activity</p>
                <p style={{ margin:"2px 0 0", fontSize:11, color:"#9CA3AF", fontFamily:IN }}>{activity.length} total</p>
              </div>
              <button onClick={()=>setShowAllActivity(false)} style={{ width:32, height:32, borderRadius:10, background:"#F3F4F6", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <X size={15} color="#6B7280"/>
              </button>
            </div>
            <div style={{ overflowY:"auto" as const, scrollbarWidth:"none" as const, padding:"8px 20px 24px" }}>
              {activity.map(({ id, type, msg, ts }, i)=>{
                const meta = ACTIVITY_META[type] ?? { Icon: Activity, color:"#6B7280", bg:"#F3F4F6" };
                return (
                  <div key={id} className="dt-admin-row" style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"12px 0", borderBottom:i<activity.length-1?"1px solid #F3F4F6":"none" }}>
                    <div style={{ width:34, height:34, borderRadius:11, background:meta.bg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:2 }}>
                      <meta.Icon size={14} color={meta.color}/>
                    </div>
                    <div style={{ flex:1 }}>
                      <p style={{ margin:"0 0 2px", fontSize:12, fontWeight:700, color:"#1F2937", fontFamily:IN, lineHeight:1.45 }}>{msg}</p>
                      <p style={{ margin:0, fontSize:10, color:"#9CA3AF", fontFamily:IN }}>{timeAgo(ts)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
