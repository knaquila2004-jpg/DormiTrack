import React, { useState } from "react";
import {
  Bell, Home, Building2, MapPin, Phone, MessageCircle,
  ChevronRight, User, GraduationCap, Bed, CheckCircle,
  AlertCircle, Calendar, CreditCard, Navigation, Megaphone,
  Clock, LogIn, LogOut, RefreshCw, Star,
} from "lucide-react";
import { BH_DATA, ROOM_DATA, STUDENT_DATA, BILLING_DATA, ANNOUNCEMENTS } from "./StudentHome";
import { getReports, CATEGORY_META, PRIORITY_META, STATUS_META } from "./reportStore";
import { useUnreadCount, fmtBadgeCount } from "./notificationStore";
import { useUnreadChatCount } from "./chatStore";

const GRAD   = "linear-gradient(135deg,#9772F6 0%,#7549F6 100%)";
const GRAD_H = "linear-gradient(160deg,#9772F6 0%,#7549F6 100%)";
const QS     = "'Quicksand',sans-serif";
const IN     = "'Inter',sans-serif";

export const PARENT_DATA = {
  name:         "Maria Dela Cruz",
  firstName:    "Maria",
  relationship: "Mother",
  contact:      "+63 917 123 4567",
  email:        "mariadelacruz@gmail.com",
  address:      "Purok 5, Brgy. Dao, Tagbilaran City, Bohol",
  photo:        null as string | null,
};

const ACTIVITIES = [
  { Icon:LogIn,      color:"#16A34A", bg:"#DCFCE7", msg:"Student checked into the boarding house.", time:"Today, 8:02 AM"        },
  { Icon:CreditCard, color:"#9772F6", bg:"#F5F0FF", msg:"Payment for August 2026 submitted.",       time:"Yesterday, 3:15 PM"    },
  { Icon:Megaphone,  color:"#D97706", bg:"#FEF3C7", msg:"Landlord posted a new announcement.",      time:"Aug 2, 10:00 AM"       },
  { Icon:RefreshCw,  color:"#3B82F6", bg:"#EFF6FF", msg:"Dormitory information was updated.",       time:"Aug 1, 9:00 AM"        },
  { Icon:LogOut,     color:"#6B7280", bg:"#F3F4F6", msg:"Student checked out of the boarding house.", time:"Aug 1, 5:46 PM"      },
];

const ANN_COLOR: Record<string,{ bg:string; color:string }> = {
  high:   { bg:"#FEE2E2", color:"#DC2626" },
  medium: { bg:"#FEF3C7", color:"#D97706" },
  low:    { bg:"#F0FDF4", color:"#16A34A" },
};

function getGreeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good Morning" : h < 18 ? "Good Afternoon" : "Good Evening";
}

export function ParentHomeScreen({ go }: { go:(s:string)=>void }) {
  const notifCount = useUnreadCount("parent");
  const chatCount = useUnreadChatCount("parent");

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column" as const, background:"#F2F4F8", overflowY:"auto", scrollbarWidth:"none" as const }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ flexShrink:0, backgroundImage:GRAD_H, padding:"52px 20px 24px", position:"relative" as const, overflow:"hidden" }}>
        <div style={{ position:"absolute" as const, top:-50, right:-50, width:180, height:180, borderRadius:"50%", background:"rgba(255,255,255,.05)" }}/>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
          <div>
            <p style={{ margin:"0 0 2px", fontSize:12, color:"rgba(255,255,255,.65)", fontFamily:IN }}>{getGreeting()},</p>
            <h1 style={{ margin:"0 0 4px", fontSize:22, fontWeight:800, color:"white", fontFamily:QS }}>{PARENT_DATA.firstName}!</h1>
            <p style={{ margin:0, fontSize:12, color:"rgba(255,255,255,.7)", fontFamily:IN, maxWidth:260, lineHeight:1.5 }}>
              Here's the latest update about your student's boarding house.
            </p>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <button onClick={()=>go("notifications")} style={{ position:"relative" as const, width:40, height:40, borderRadius:13, background:"rgba(255,255,255,.15)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Bell size={18} color="white"/>
              {notifCount > 0 && (
                <span style={{ position:"absolute" as const, top:-2, right:-2, width:16, height:16, borderRadius:"50%", background:"#EF4444", color:"white", fontSize:8, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center" }}>{fmtBadgeCount(notifCount)}</span>
              )}
            </button>
            <button onClick={()=>go("messages")} style={{ position:"relative" as const, width:40, height:40, borderRadius:13, background:"rgba(255,255,255,.15)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <MessageCircle size={18} color="white"/>
              {chatCount > 0 && (
                <span style={{ position:"absolute" as const, top:-2, right:-2, width:16, height:16, borderRadius:"50%", background:"#22C55E", color:"white", fontSize:8, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center" }}>{fmtBadgeCount(chatCount)}</span>
              )}
            </button>
          </div>
        </div>

        {/* Student card in header */}
        <div style={{ marginTop:18, background:"rgba(255,255,255,.15)", borderRadius:18, padding:"14px 16px", backdropFilter:"blur(8px)", display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ width:52, height:52, borderRadius:18, background:"rgba(255,255,255,.25)", border:"2px solid rgba(255,255,255,.4)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <span style={{ fontSize:18, fontWeight:800, color:"white", fontFamily:QS }}>
              {STUDENT_DATA.name.split(" ").map((n:string)=>n[0]).join("").slice(0,2)}
            </span>
          </div>
          <div style={{ flex:1 }}>
            <p style={{ margin:"0 0 1px", fontSize:15, fontWeight:800, color:"white", fontFamily:QS }}>{STUDENT_DATA.name}</p>
            <p style={{ margin:"0 0 1px", fontSize:11, color:"rgba(255,255,255,.75)", fontFamily:IN }}>{STUDENT_DATA.id} · {STUDENT_DATA.program}</p>
            <p style={{ margin:0, fontSize:10, color:"rgba(255,255,255,.6)", fontFamily:IN }}>{STUDENT_DATA.year} · {STUDENT_DATA.block}</p>
          </div>
          <span style={{ fontSize:9, fontWeight:800, padding:"4px 10px", borderRadius:20, background:"rgba(255,255,255,.2)", color:"white", fontFamily:QS }}>
            {PARENT_DATA.relationship}
          </span>
        </div>
      </div>

      <div style={{ flex:1, padding:"16px 16px 8px" }}>

        {/* ── Student Overview Card ────────────────────────────────────────── */}
        <div style={{ background:"white", borderRadius:22, padding:"18px", boxShadow:"0 6px 24px rgba(0,0,0,.08)", marginBottom:14 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
            <p style={{ margin:0, fontSize:14, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Student Overview</p>
            <span style={{ fontSize:10, fontWeight:800, padding:"3px 10px", borderRadius:20, background:"#DCFCE7", color:"#16A34A", fontFamily:QS }}>{BH_DATA.status}</span>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            {[
              { Icon:Building2, label:"Boarding House", val:BH_DATA.name,     color:"#9772F6", bg:"#F5F0FF" },
              { Icon:Home,      label:"Room",           val:ROOM_DATA.name,   color:"#3B82F6", bg:"#EFF6FF" },
              { Icon:Bed,       label:"Bed Space",      val:ROOM_DATA.bed,    color:"#16A34A", bg:"#DCFCE7" },
              { Icon:User,      label:"Landlord",       val:BH_DATA.landlord, color:"#D97706", bg:"#FEF3C7" },
            ].map(({ Icon, label, val, color, bg })=>(
              <div key={label} style={{ background:bg, borderRadius:16, padding:"12px 12px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                  <Icon size={13} color={color}/>
                  <span style={{ fontSize:9, fontWeight:700, color, fontFamily:QS, textTransform:"uppercase" as const, letterSpacing:0.4 }}>{label}</span>
                </div>
                <p style={{ margin:0, fontSize:12, fontWeight:800, color:"#1F2937", fontFamily:QS, lineHeight:1.3 }}>{val}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Quick Access ─────────────────────────────────────────────────── */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:14 }}>
          {[
            { Icon:Building2, label:"Boarding House", screen:"occupants", color:"#9772F6", bg:"#F5F0FF" },
            { Icon:MapPin,    label:"Live Map",        screen:"map",       color:"#3B82F6", bg:"#EFF6FF" },
            { Icon:CreditCard,label:"Payments",        screen:"payments",  color:"#16A34A", bg:"#DCFCE7" },
          ].map(({ Icon, label, screen, color, bg })=>(
            <button key={label} onClick={()=>go(screen)} style={{ background:"white", borderRadius:18, padding:"14px 10px", border:"none", cursor:"pointer", display:"flex", flexDirection:"column" as const, alignItems:"center", gap:8, boxShadow:"0 3px 12px rgba(0,0,0,.07)" }}>
              <div style={{ width:40, height:40, borderRadius:13, background:bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Icon size={18} color={color}/>
              </div>
              <span style={{ fontSize:10, fontWeight:800, color:"#374151", fontFamily:QS, textAlign:"center" as const }}>{label}</span>
            </button>
          ))}
        </div>

        {/* ── Today's Highlights / Announcements ───────────────────────────── */}
        <div style={{ background:"white", borderRadius:22, padding:"18px", boxShadow:"0 4px 16px rgba(0,0,0,.07)", marginBottom:14 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:30, height:30, borderRadius:10, background:"#FEF3C7", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Megaphone size={14} color="#D97706"/>
              </div>
              <p style={{ margin:0, fontSize:14, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Today's Highlights</p>
            </div>
            <span style={{ fontSize:10, fontWeight:700, color:"#9CA3AF", fontFamily:IN }}>View only</span>
          </div>
          {ANNOUNCEMENTS.map((ann: any, i: number)=>{
            const { bg, color } = ANN_COLOR[ann.priority] ?? ANN_COLOR.low;
            return (
              <div key={ann.id} style={{ padding:"11px 0", borderBottom:i<ANNOUNCEMENTS.length-1?"1px solid #F9FAFB":"none" }}>
                <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                  <span style={{ fontSize:9, fontWeight:800, padding:"3px 8px", borderRadius:20, background:bg, color, fontFamily:QS, flexShrink:0, marginTop:2 }}>{ann.priority.toUpperCase()}</span>
                  <div style={{ flex:1 }}>
                    <p style={{ margin:"0 0 2px", fontSize:12, fontWeight:800, color:"#1F2937", fontFamily:QS }}>{ann.title}</p>
                    <p style={{ margin:"0 0 2px", fontSize:11, color:"#6B7280", fontFamily:IN, lineHeight:1.45 }}>{ann.desc}</p>
                    <p style={{ margin:0, fontSize:10, color:"#9CA3AF", fontFamily:IN }}>{ann.date}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Recent Activity Timeline ─────────────────────────────────────── */}
        <div style={{ background:"white", borderRadius:22, padding:"18px", boxShadow:"0 4px 16px rgba(0,0,0,.07)", marginBottom:14 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
            <div style={{ width:30, height:30, borderRadius:10, background:"#F5F0FF", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Clock size={14} color="#9772F6"/>
            </div>
            <p style={{ margin:0, fontSize:14, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Recent Activity</p>
          </div>
          {ACTIVITIES.map(({ Icon, color, bg, msg, time }, i)=>(
            <div key={i} style={{ display:"flex", gap:12, paddingBottom:i<ACTIVITIES.length-1?12:0 }}>
              <div style={{ display:"flex", flexDirection:"column" as const, alignItems:"center", width:32 }}>
                <div style={{ width:32, height:32, borderRadius:11, background:bg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <Icon size={14} color={color}/>
                </div>
                {i<ACTIVITIES.length-1 && <div style={{ width:2, flex:1, minHeight:10, background:"#F3F4F6", marginTop:4 }}/>}
              </div>
              <div style={{ flex:1, paddingTop:5 }}>
                <p style={{ margin:"0 0 1px", fontSize:12, fontWeight:700, color:"#1F2937", fontFamily:IN, lineHeight:1.45 }}>{msg}</p>
                <p style={{ margin:0, fontSize:10, color:"#9CA3AF", fontFamily:IN }}>{time}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Student Reports ─────────────────────────────────────────────── */}
        {(()=>{
          const myReports = getReports().filter(r=>r.studentId===STUDENT_DATA.id);
          if (myReports.length===0) return null;
          return (
            <div style={{ background:"white", borderRadius:22, padding:"18px", boxShadow:"0 4px 16px rgba(0,0,0,.07)", marginBottom:14 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:30, height:30, borderRadius:10, background:"#F5F0FF", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <AlertCircle size={14} color="#9772F6"/>
                  </div>
                  <p style={{ margin:0, fontSize:14, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Student Reports</p>
                </div>
                <span style={{ fontSize:10, fontWeight:700, color:"#9CA3AF", fontFamily:IN }}>View only</span>
              </div>
              {myReports.map((r, i)=>{
                const cm = CATEGORY_META[r.category];
                const pm = PRIORITY_META[r.priority];
                const sm = STATUS_META[r.status];
                return (
                  <div key={r.id} style={{ padding:"12px 0", borderBottom:i<myReports.length-1?"1px solid #F9FAFB":"none" }}>
                    <div style={{ display:"flex", gap:5, marginBottom:5, flexWrap:"wrap" as const }}>
                      <span style={{ fontSize:9, fontWeight:800, padding:"2px 8px", borderRadius:20, background:sm.bg, color:sm.color, fontFamily:QS }}>{sm.label}</span>
                      <span style={{ fontSize:9, fontWeight:800, padding:"2px 8px", borderRadius:20, background:cm.bg, color:cm.color, fontFamily:QS }}>{cm.label}</span>
                      <span style={{ fontSize:9, fontWeight:800, padding:"2px 8px", borderRadius:20, background:pm.bg, color:pm.color, fontFamily:QS, display:"flex", alignItems:"center", gap:3 }}>
                        <div style={{ width:4, height:4, borderRadius:"50%", background:pm.dot }}/>{pm.label}
                      </span>
                    </div>
                    <p style={{ margin:"0 0 2px", fontSize:12, fontWeight:800, color:"#1F2937", fontFamily:QS }}>{r.title}</p>
                    <p style={{ margin:"0 0 4px", fontSize:11, color:"#6B7280", fontFamily:IN, lineHeight:1.45 }}>{r.description.length>100?r.description.slice(0,100)+"...":r.description}</p>
                    <p style={{ margin:"0 0 4px", fontSize:10, color:"#9CA3AF", fontFamily:IN }}>{r.dateSubmitted}</p>
                    {r.landlordResponse && (
                      <div style={{ padding:"8px 10px", borderRadius:10, background:"#F0FDF4", border:"1px solid #BBF7D0", display:"flex", alignItems:"flex-start", gap:6 }}>
                        <MessageCircle size={11} color="#16A34A" style={{ flexShrink:0, marginTop:2 }}/>
                        <p style={{ margin:0, fontSize:10, color:"#16A34A", fontFamily:IN, lineHeight:1.5 }}>Landlord: {r.landlordResponse}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* ── Emergency Contact ────────────────────────────────────────────── */}
        <div style={{ background:"white", borderRadius:22, padding:"18px", boxShadow:"0 4px 16px rgba(0,0,0,.07)", marginBottom:24 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
            <div style={{ width:30, height:30, borderRadius:10, background:"#FEE2E2", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Phone size={14} color="#DC2626"/>
            </div>
            <p style={{ margin:0, fontSize:14, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Emergency Contacts</p>
          </div>
          {[
            { label:"Boarding House", number:BH_DATA.contact  },
            { label:"Landlord",       number:BH_DATA.contact  },
          ].map(({ label, number })=>(
            <div key={label} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:"1px solid #F9FAFB" }}>
              <div style={{ flex:1 }}>
                <p style={{ margin:"0 0 1px", fontSize:12, fontWeight:800, color:"#1F2937", fontFamily:QS }}>{label}</p>
                <p style={{ margin:0, fontSize:11, color:"#6B7280", fontFamily:IN }}>{number}</p>
              </div>
              <a href={`tel:${number}`} style={{ width:34, height:34, borderRadius:12, background:"#DCFCE7", display:"flex", alignItems:"center", justifyContent:"center", textDecoration:"none", marginRight:6 }}>
                <Phone size={14} color="#16A34A"/>
              </a>
              <a href={`sms:${number}`} style={{ width:34, height:34, borderRadius:12, background:"#EFF6FF", display:"flex", alignItems:"center", justifyContent:"center", textDecoration:"none" }}>
                <MessageCircle size={14} color="#3B82F6"/>
              </a>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
