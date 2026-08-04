import React, { useState } from "react";
import {
  Bell, MessageCircle, User, Home, Users, Building2, LogIn, LogOut,
  CheckCircle, AlertCircle, Clock, FileText, Megaphone, Plus,
  TrendingUp, ShieldCheck, BarChart2, Zap, RefreshCw,
  ChevronRight, UserCheck, UserPlus, CreditCard, Activity,
} from "lucide-react";

const GRAD   = "linear-gradient(135deg,#9772F6 0%,#7549F6 100%)";
const GRAD_H = "linear-gradient(160deg,#9772F6 0%,#7549F6 100%)";
const QS     = "'Quicksand',sans-serif";
const IN     = "'Inter',sans-serif";

const STATS = [
  { label:"Total Students",      val:"1,248", trend:"+12",  color:"#9772F6", bg:"#F5F0FF", Icon:Users       },
  { label:"Total Parents",       val:"986",   trend:"+8",   color:"#EC4899", bg:"#FDF2F8", Icon:Users       },
  { label:"Total Landlords",     val:"34",    trend:"+2",   color:"#3B82F6", bg:"#EFF6FF", Icon:Building2   },
  { label:"Boarding Houses",     val:"34",    trend:"+2",   color:"#6366F1", bg:"#EEF2FF", Icon:Home        },
  { label:"Active (Inside)",     val:"312",   trend:"+24",  color:"#16A34A", bg:"#DCFCE7", Icon:LogIn       },
  { label:"Outside BH",          val:"936",   trend:"-24",  color:"#D97706", bg:"#FEF3C7", Icon:LogOut      },
  { label:"Pending Verifications",val:"18",   trend:"-5",   color:"#EF4444", bg:"#FEE2E2", Icon:AlertCircle },
  { label:"Reports Today",       val:"7",     trend:"+3",   color:"#0891B2", bg:"#ECFEFF", Icon:FileText    },
];

const ACTIVITIES = [
  { Icon:UserPlus,    color:"#9772F6", bg:"#F5F0FF", msg:"Juan Dela Cruz registered as student.",          time:"2 min ago"  },
  { Icon:Building2,  color:"#3B82F6", bg:"#EFF6FF", msg:"Ma. Kyla Naquila added a new boarding house.",   time:"15 min ago" },
  { Icon:UserCheck,  color:"#EC4899", bg:"#FDF2F8", msg:"Parent Maria Reyes linked her account.",         time:"32 min ago" },
  { Icon:LogIn,      color:"#16A34A", bg:"#DCFCE7", msg:"Kevin Cruz checked IN at Naquila BH.",           time:"1 hr ago"   },
  { Icon:LogOut,     color:"#D97706", bg:"#FEF3C7", msg:"Ana Santos checked OUT of Sunrise Dorm.",        time:"1 hr ago"   },
  { Icon:FileText,   color:"#EF4444", bg:"#FEE2E2", msg:"New complaint report submitted by Ben Torres.",   time:"2 hrs ago"  },
  { Icon:CreditCard, color:"#0891B2", bg:"#ECFEFF", msg:"Payment for July verified by landlord.",         time:"3 hrs ago"  },
  { Icon:Megaphone,  color:"#7C3AED", bg:"#EDE9FE", msg:"Landlord posted curfew reminder announcement.",  time:"4 hrs ago"  },
];

const QUICK_ACTIONS = [
  { label:"Verify Users",              Icon:UserCheck,  color:"#9772F6", bg:"#F5F0FF", screen:"adminUsers"   },
  { label:"View Reports",              Icon:FileText,   color:"#EF4444", bg:"#FEE2E2", screen:"adminReports" },
  { label:"Boarding Houses",           Icon:Building2,  color:"#3B82F6", bg:"#EFF6FF", screen:"adminSystem"  },
  { label:"Broadcast",                 Icon:Megaphone,  color:"#D97706", bg:"#FEF3C7", screen:"adminSystem"  },
  { label:"Analytics",                 Icon:BarChart2,  color:"#6366F1", bg:"#EEF2FF", screen:"adminReports" },
  { label:"System",                    Icon:Activity,   color:"#0891B2", bg:"#ECFEFF", screen:"adminSystem"  },
];

const TODAY_WIDGETS = [
  { label:"New Users",          val:"8",   color:"#9772F6" },
  { label:"Check-ins",          val:"47",  color:"#16A34A" },
  { label:"Check-outs",         val:"31",  color:"#D97706" },
  { label:"Pending Reports",    val:"4",   color:"#EF4444" },
  { label:"BH Approvals",       val:"2",   color:"#3B82F6" },
];

function fmtDate() {
  return new Date().toLocaleDateString("en-PH", { weekday:"long", month:"long", day:"numeric", year:"numeric" });
}

export function AdminDashboardScreen({ go }: { go:(s:string)=>void }) {
  const [refreshing, setRefreshing] = useState(false);

  const refresh = () => { setRefreshing(true); setTimeout(()=>setRefreshing(false), 1200); };

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column" as const, background:"#F2F4F8" }}>

      {/* ── App Bar ─────────────────────────────────────────────────────────── */}
      <div style={{ flexShrink:0, backgroundImage:GRAD_H, padding:"52px 20px 20px", position:"relative" as const, overflow:"hidden" }}>
        <div style={{ position:"absolute" as const, top:-40, right:-40, width:160, height:160, borderRadius:"50%", background:"rgba(255,255,255,.05)", pointerEvents:"none" }}/>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
          <div>
            <p style={{ margin:0, fontSize:11, color:"rgba(255,255,255,.65)", fontFamily:IN, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:1 }}>Welcome,</p>
            <h1 style={{ margin:"2px 0 2px", fontSize:22, fontWeight:800, color:"white", fontFamily:QS }}>Admin 👋</h1>
            <p style={{ margin:0, fontSize:11, color:"rgba(255,255,255,.6)", fontFamily:IN }}>{fmtDate()}</p>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={refresh} style={{ width:40, height:40, borderRadius:13, background:"rgba(255,255,255,.15)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <RefreshCw size={16} color="white" style={{ transform:refreshing?"rotate(360deg)":"none", transition:"transform .6s" }}/>
            </button>
            <button style={{ position:"relative" as const, width:40, height:40, borderRadius:13, background:"rgba(255,255,255,.15)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Bell size={17} color="white"/>
              <span style={{ position:"absolute" as const, top:-2, right:-2, width:16, height:16, borderRadius:"50%", background:"#EF4444", color:"white", fontSize:8, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center" }}>5</span>
            </button>
            <button style={{ position:"relative" as const, width:40, height:40, borderRadius:13, background:"rgba(255,255,255,.15)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <MessageCircle size={17} color="white"/>
              <span style={{ position:"absolute" as const, top:-2, right:-2, width:16, height:16, borderRadius:"50%", background:"#22C55E", color:"white", fontSize:8, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center" }}>3</span>
            </button>
            <button onClick={()=>go("adminProfile")} style={{ position:"relative" as const, width:40, height:40, borderRadius:13, background:"rgba(255,255,255,.15)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <User size={17} color="white"/>
            </button>
          </div>
        </div>

        {/* Today widget strip */}
        <div style={{ display:"flex", gap:8, marginTop:16, overflowX:"auto" as const, scrollbarWidth:"none" as const, paddingBottom:2 }}>
          {TODAY_WIDGETS.map(({ label, val, color })=>(
            <div key={label} style={{ flexShrink:0, background:"rgba(255,255,255,.15)", borderRadius:14, padding:"9px 13px", backdropFilter:"blur(8px)", textAlign:"center" as const, minWidth:70 }}>
              <p style={{ margin:0, fontSize:16, fontWeight:800, color:"white", fontFamily:QS }}>{val}</p>
              <p style={{ margin:"2px 0 0", fontSize:8, color:"rgba(255,255,255,.65)", fontFamily:IN, whiteSpace:"nowrap" as const }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Scrollable Body ──────────────────────────────────────────────────── */}
      <div style={{ flex:1, overflowY:"auto" as const, scrollbarWidth:"none" as const, padding:"16px 16px 32px" }}>

        {/* Stat cards 2-col grid */}
        <p style={{ margin:"0 0 10px", fontSize:13, fontWeight:800, color:"#1F2937", fontFamily:QS }}>System Overview</p>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:18 }}>
          {STATS.map(({ label, val, trend, color, bg, Icon })=>(
            <div key={label} style={{ background:"white", borderRadius:18, padding:"14px 14px", boxShadow:"0 3px 12px rgba(0,0,0,.06)" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                <div style={{ width:32, height:32, borderRadius:10, background:bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Icon size={15} color={color}/>
                </div>
                <span style={{ fontSize:9, fontWeight:800, color:trend.startsWith("+")?color:"#9CA3AF", fontFamily:QS, background:trend.startsWith("+")?bg:"#F3F4F6", borderRadius:20, padding:"2px 7px" }}>{trend}</span>
              </div>
              <p style={{ margin:0, fontSize:20, fontWeight:800, color:"#1F2937", fontFamily:QS }}>{val}</p>
              <p style={{ margin:"2px 0 0", fontSize:9, color:"#9CA3AF", fontFamily:IN, lineHeight:1.3 }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <p style={{ margin:"0 0 10px", fontSize:13, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Quick Actions</p>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:18 }}>
          {QUICK_ACTIONS.map(({ label, Icon, color, bg, screen })=>(
            <button key={label} onClick={()=>go(screen)} style={{ background:"white", borderRadius:18, padding:"14px 8px", border:"none", cursor:"pointer", display:"flex", flexDirection:"column" as const, alignItems:"center", gap:8, boxShadow:"0 3px 12px rgba(0,0,0,.06)" }}>
              <div style={{ width:40, height:40, borderRadius:13, background:bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Icon size={18} color={color}/>
              </div>
              <span style={{ fontSize:10, fontWeight:800, color:"#374151", fontFamily:QS, textAlign:"center" as const, lineHeight:1.3 }}>{label}</span>
            </button>
          ))}
        </div>

        {/* Recent Activities */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
          <p style={{ margin:0, fontSize:13, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Recent Activities</p>
          <span style={{ fontSize:11, color:"#9772F6", fontWeight:700, fontFamily:QS, cursor:"pointer" }}>View All</span>
        </div>
        <div style={{ background:"white", borderRadius:20, overflow:"hidden", boxShadow:"0 4px 16px rgba(0,0,0,.07)", marginBottom:18 }}>
          {ACTIVITIES.map(({ Icon, color, bg, msg, time }, i)=>(
            <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"12px 16px", borderBottom:i<ACTIVITIES.length-1?"1px solid #F9FAFB":"none" }}>
              <div style={{ width:34, height:34, borderRadius:11, background:bg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:2 }}>
                <Icon size={14} color={color}/>
              </div>
              <div style={{ flex:1 }}>
                <p style={{ margin:"0 0 2px", fontSize:12, fontWeight:700, color:"#1F2937", fontFamily:IN, lineHeight:1.45 }}>{msg}</p>
                <p style={{ margin:0, fontSize:10, color:"#9CA3AF", fontFamily:IN }}>{time}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Pending banner */}
        <div style={{ background:"white", borderRadius:18, padding:"14px 16px", boxShadow:"0 3px 12px rgba(0,0,0,.06)", display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:42, height:42, borderRadius:14, background:"#FEE2E2", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <AlertCircle size={20} color="#EF4444"/>
          </div>
          <div style={{ flex:1 }}>
            <p style={{ margin:"0 0 1px", fontSize:13, fontWeight:800, color:"#1F2937", fontFamily:QS }}>18 Pending Verifications</p>
            <p style={{ margin:0, fontSize:11, color:"#6B7280", fontFamily:IN }}>Accounts waiting for admin approval</p>
          </div>
          <button onClick={()=>go("adminUsers")} style={{ height:34, padding:"0 14px", borderRadius:20, backgroundImage:GRAD, border:"none", cursor:"pointer", color:"white", fontSize:11, fontWeight:800, fontFamily:QS }}>Review</button>
        </div>

      </div>
    </div>
  );
}
