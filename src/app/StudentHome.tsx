import React, { useState, useEffect } from "react";
import {
  Bell, MessageCircle, Building2,
  Calendar, CreditCard, Megaphone,
  ChevronRight, X, Check, CheckCircle, AlertCircle,
  BookOpen, Eye, Home,
  LogIn, TrendingUp,
  Flag, Plus, Image as ImageIcon, ChevronLeft,
  Wrench, Zap, ShowerHead, Wifi,
} from "lucide-react";
import {
  getReports, addReport, updateReport,
  CATEGORY_META, PRIORITY_META, STATUS_META,
  StudentReport, ReportCategory,
} from "./reportStore";
import { useUnreadCount, addNotification, NotificationType, fmtBadgeCount } from "./notificationStore";
import { useUnreadChatCount } from "./chatStore";

const GRAD   = "linear-gradient(135deg,#9772F6 0%,#7549F6 100%)";
const GRAD_H = "linear-gradient(160deg,#9772F6 0%,#7549F6 100%)";
const QS     = "'Quicksand',sans-serif";
const IN     = "'Inter',sans-serif";

// ── Shared Data (simulates sync from landlord) ────────────────────────────────

export const STUDENT_DATA = {
  name: "Juan Dela Cruz",
  firstName: "Juan",
  id: "2024-0042",
  program: "BS Computer Science",
  year: "2nd Year",
  block: "Block A",
  email: "jdelacruz@bisu.edu.ph",
  contact: "+63 912 345 6789",
  address: "Purok 3, Brgy. Bool, Tagbilaran City, Bohol",
  photo: null as string | null,
};

export const BH_DATA = {
  name: "Naquila Boarding House",
  address: "Km 4 National Highway, Tagbilaran City, Bohol",
  lat: 9.6533, lng: 123.8527,
  cover: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80",
  landlord: "Ma. Kyla L. Naquila",
  contact: "+63 912 345 6789",
  email: "kylanaquila@gmail.com",
  status: "Active" as "Active" | "Pending Verification" | "Moving Out",
  regStatus: "Approved" as "Approved" | "Pending" | "Rejected",
  amenities: ["WiFi","Water","Electricity","Laundry Area","Kitchen","Study Room"],
  rules: [
    "No smoking inside the premises.",
    "Observe 10:00 PM curfew.",
    "Keep rooms clean at all times.",
    "Respect fellow tenants and shared spaces.",
    "No overnight guests without prior approval.",
    "Report any damage to the landlord immediately.",
    "Guests must leave by 9:00 PM.",
  ],
  totalRooms: 5,
};

export const ROOM_DATA = {
  name: "Room A",
  bed: "Bed 1",
  capacity: 6,
  occupied: 6,
  available: 0,
  floor: "Ground Floor",
  type: "Standard Room",
};

export const BILLING_DATA = {
  amount: 3500,
  water: 150,
  electricity: 350,
  garbage: 100,
  total: 4100,
  dueDate: "Aug 10, 2026",
  period: "August 2026",
  status: "awaiting-verification" as "paid"|"awaiting-verification"|"overdue"|"unpaid",
};

export const STAY_DATA = {
  moveIn: "August 1, 2026",
  moveOut: "May 31, 2027",
  daysStayed: 2,
  daysRemaining: 303,
  totalDays: 305,
  stayLength: "10 months",
};

export type AnnPriority = "high"|"medium"|"low";
export const ANNOUNCEMENTS: { id:string; title:string; desc:string; date:string; priority:AnnPriority }[] = [
  { id:"a1", title:"Water Service Interruption",     desc:"Water supply will be interrupted on August 5, 2026 from 2:00 PM to 4:00 PM for maintenance. Please prepare water in advance.",               date:"Aug 2, 2026",  priority:"high"   },
  { id:"a2", title:"Monthly Room Inspection",         desc:"Scheduled monthly room inspection on August 15, 2026 at 9:00 AM. Please ensure your room is clean and presentable.",                          date:"Aug 1, 2026",  priority:"medium" },
  { id:"a3", title:"10PM Curfew Strictly Enforced",   desc:"As a reminder, all tenants must be inside the boarding house by 10:00 PM. Late arrivals must inform the landlord in advance.",                 date:"Aug 1, 2026",  priority:"low"    },
];

export const ACTIVITIES = [
  { msg:"Registration approved by landlord",         time:"Aug 1, 2026 · 10:02 AM", Icon:CheckCircle, color:"#16A34A" },
  { msg:"Checked into Room A, Bed 1",                time:"Aug 1, 2026 · 10:05 AM", Icon:LogIn,       color:"#9772F6" },
  { msg:"Payment submitted for Monthly Rent",        time:"Aug 1, 2026 · 11:30 AM", Icon:CreditCard,  color:"#3B82F6" },
  { msg:"Viewed water interruption announcement",    time:"Aug 2, 2026 · 8:14 AM",  Icon:Megaphone,   color:"#D97706" },
  { msg:"Room inspection announcement viewed",       time:"Aug 2, 2026 · 8:15 AM",  Icon:Eye,         color:"#6B7280" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const prioMeta = (p: AnnPriority) => ({
  high:   { color:"#EF4444", bg:"#FEE2E2", label:"High Priority",   border:"#FECACA" },
  medium: { color:"#D97706", bg:"#FEF3C7", label:"Medium Priority", border:"#FDE68A" },
  low:    { color:"#22C55E", bg:"#DCFCE7", label:"Low Priority",    border:"#BBF7D0" },
}[p]);

const payStatusMeta = (s: string) => ({
  "paid":                  { label:"Paid",                  color:"#16A34A", bg:"#DCFCE7" },
  "awaiting-verification": { label:"Awaiting Verification", color:"#D97706", bg:"#FEF3C7" },
  "overdue":               { label:"Overdue",               color:"#EF4444", bg:"#FEE2E2" },
  "unpaid":                { label:"Unpaid",                color:"#6B7280", bg:"#F3F4F6" },
}[s] ?? { label:s, color:"#6B7280", bg:"#F3F4F6" });

const bhStatusMeta = (s: string) => ({
  "Active":               { color:"#16A34A", bg:"#DCFCE7", dot:"#16A34A" },
  "Pending Verification": { color:"#D97706", bg:"#FEF3C7", dot:"#D97706" },
  "Moving Out":           { color:"#EF4444", bg:"#FEE2E2", dot:"#EF4444" },
}[s] ?? { color:"#6B7280", bg:"#F3F4F6", dot:"#6B7280" });

// ── Announcement Detail Modal ─────────────────────────────────────────────────

function AnnouncementModal({ ann, isRead, onMarkRead, onClose }: {
  ann:typeof ANNOUNCEMENTS[0]; isRead:boolean; onMarkRead:()=>void; onClose:()=>void;
}) {
  const pm = prioMeta(ann.priority);
  return (
    <div style={{ position:"absolute" as const, inset:0, background:"rgba(0,0,0,.5)", zIndex:90, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 16px" }}>
      <div style={{ background:"white", borderRadius:24, padding:22, width:"100%", maxHeight:"82%", display:"flex", flexDirection:"column" as const }}>
        <div style={{ display:"flex", alignItems:"flex-start", gap:10, marginBottom:14 }}>
          <div style={{ width:42, height:42, borderRadius:14, background:pm.bg, border:`1.5px solid ${pm.border}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <Megaphone size={18} color={pm.color}/>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ margin:0, fontSize:14, fontWeight:800, color:"#1F2937", fontFamily:QS, lineHeight:1.3 }}>{ann.title}</p>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:4 }}>
              <span style={{ fontSize:9, fontWeight:800, padding:"2px 8px", borderRadius:20, background:pm.bg, color:pm.color, fontFamily:QS }}>{pm.label}</span>
              <span style={{ fontSize:10, color:"#9CA3AF", fontFamily:IN }}>{ann.date}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:9, background:"#F3F4F6", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <X size={14} color="#6B7280"/>
          </button>
        </div>
        <div style={{ overflowY:"auto" as const, scrollbarWidth:"none" as const, flex:1, marginBottom:16 }}>
          <p style={{ fontSize:13, color:"#374151", fontFamily:IN, lineHeight:1.7, margin:0 }}>{ann.desc}</p>
          <div style={{ marginTop:14, padding:"10px 14px", background:"#F9FAFB", borderRadius:12, display:"flex", alignItems:"center", gap:8 }}>
            <Building2 size={13} color="#9CA3AF"/>
            <p style={{ margin:0, fontSize:11, color:"#9CA3AF", fontFamily:IN }}>Posted by {BH_DATA.landlord}</p>
          </div>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:"12px 0", borderRadius:14, border:"1.5px solid #E5E7EB", background:"white", color:"#6B7280", fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:QS }}>Close</button>
          {!isRead && (
            <button onClick={()=>{ onMarkRead(); onClose(); }} style={{ flex:2, padding:"12px 0", borderRadius:14, border:"none", backgroundImage:GRAD, color:"white", fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:QS, display:"flex", alignItems:"center", justifyContent:"center", gap:6, boxShadow:"0 4px 14px rgba(151,114,246,.3)" }}>
              <Check size={14}/> Mark as Read
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Submit Report Modal ───────────────────────────────────────────────────────

const CATEGORIES: ReportCategory[] = [
  "room-issue","bathroom","electrical","water","internet",
  "noise","maintenance","safety","cleanliness","roommate","lost-item","other",
];

function SubmitReportModal({ onClose, onSubmitted }: { onClose:()=>void; onSubmitted:()=>void }) {
  const [category, setCategory] = useState<ReportCategory|null>(null);
  const [title,    setTitle]    = useState("");
  const [desc,     setDesc]     = useState("");
  const [imgColors,setImgColors]= useState<string[]>([]);
  const [success,  setSuccess]  = useState(false);
  const [err,      setErr]      = useState("");

  const IMG_COLORS = ["#FCA5A5","#FCD34D","#6EE7B7","#93C5FD","#C4B5FD","#FDE68A"];

  const handleSubmit = () => {
    if (!category) { setErr("Please select a concern category."); return; }
    if (!title.trim()) { setErr("Please enter a concern title."); return; }
    if (!desc.trim())  { setErr("Please describe your concern."); return; }
    const now = new Date();
    const report: StudentReport = {
      id: `sr${Date.now()}`,
      studentName: STUDENT_DATA.name, studentId: STUDENT_DATA.id,
      boardingHouse: BH_DATA.name, roomNumber: ROOM_DATA.name, bedNumber: ROOM_DATA.bed,
      category, priority: "medium", title: title.trim(), description: desc.trim(),
      imageColors: imgColors.length > 0 ? imgColors : undefined,
      dateSubmitted: now.toLocaleDateString("en-PH",{month:"short",day:"numeric",year:"numeric"}),
      timeSubmitted: now.toLocaleTimeString("en-PH",{hour:"2-digit",minute:"2-digit"}),
      status: "pending",
      statusHistory: [{ status: "pending", date: now.toLocaleString("en-PH",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}) }],
    };
    addReport(report);
    addNotification({
      role: "landlord", type: "report", title: "New Student Concern",
      description: `${report.studentName} submitted a concern: "${report.title}".`,
      destination: "dashboard", relatedId: report.id,
    });
    setSuccess(true);
  };

  if (success) return (
    <div style={{ position:"fixed" as const, inset:0, background:"rgba(0,0,0,.6)", zIndex:400, display:"flex", alignItems:"center", justifyContent:"center", padding:28 }}>
      <div style={{ background:"white", borderRadius:28, padding:"30px 24px 24px", width:"100%", maxWidth:330, textAlign:"center" as const, boxShadow:"0 24px 60px rgba(0,0,0,.25)" }}>
        <div style={{ width:64, height:64, borderRadius:22, backgroundImage:GRAD, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
          <Check size={28} color="white"/>
        </div>
        <h3 style={{ margin:"0 0 10px", fontSize:18, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Report Submitted!</h3>
        <p style={{ margin:"0 0 22px", fontSize:12, color:"#6B7280", fontFamily:IN, lineHeight:1.65 }}>
          Your concern has been sent to your landlord. You will be notified when the report has been reviewed or updated.
        </p>
        <button onClick={()=>{ onSubmitted(); onClose(); }} style={{ width:"100%", height:48, borderRadius:20, backgroundImage:GRAD, border:"none", cursor:"pointer", fontSize:14, fontWeight:800, color:"white", fontFamily:QS, boxShadow:"0 4px 16px rgba(151,114,246,.3)" }}>
          Done
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ position:"fixed" as const, inset:0, background:"rgba(0,0,0,.55)", zIndex:400, display:"flex", flexDirection:"column" as const, justifyContent:"flex-end" }} onClick={onClose}>
      <div style={{ background:"#F7F8FC", borderRadius:"28px 28px 0 0", maxHeight:"93%", display:"flex", flexDirection:"column" as const }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"center", padding:"10px 0 2px" }}><div style={{ width:40, height:4, borderRadius:2, background:"#E5E7EB" }}/></div>
        {/* Header */}
        <div style={{ background:"white", borderRadius:"28px 28px 0 0", padding:"12px 18px 14px", borderBottom:"1px solid #F3F4F6", display:"flex", alignItems:"center", gap:12 }}>
          <div onClick={onClose} style={{ cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", padding:4 }}><ChevronLeft size={17} color="#374151"/></div>
          <div style={{ flex:1 }}>
            <p style={{ margin:0, fontSize:17, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Submit a Concern</p>
            <p style={{ margin:0, fontSize:11, color:"#9CA3AF", fontFamily:IN }}>Your report will be sent to your landlord</p>
          </div>
        </div>
        {/* Body */}
        <div style={{ flex:1, overflowY:"auto" as const, scrollbarWidth:"none" as const, padding:"14px 18px 40px" }}>

          {/* Category */}
          <p style={{ margin:"0 0 8px", fontSize:12, fontWeight:800, color:"#374151", fontFamily:QS }}>Concern Category <span style={{ color:"#EF4444" }}>*</span></p>
          <div style={{ display:"flex", flexWrap:"wrap" as const, gap:7, marginBottom:18 }}>
            {CATEGORIES.map(c=>{
              const m = CATEGORY_META[c]; const active = category===c;
              return (
                <div key={c} onClick={()=>{ setCategory(c); setErr(""); }} style={{ padding:"6px 13px", borderRadius:20, cursor:"pointer", background:active?m.color:"#F3F4F6", color:active?"white":m.color, fontSize:11, fontWeight:800, fontFamily:QS, border:`1.5px solid ${active?m.color:m.bg}` }}>
                  {m.label}
                </div>
              );
            })}
          </div>

          {/* Title */}
          <p style={{ margin:"0 0 6px", fontSize:12, fontWeight:800, color:"#374151", fontFamily:QS }}>Concern Title <span style={{ color:"#EF4444" }}>*</span></p>
          <div style={{ background:"white", borderRadius:14, padding:"11px 14px", border:"1.5px solid #E5E7EB", marginBottom:14 }}>
            <input value={title} onChange={e=>{ setTitle(e.target.value); setErr(""); }} placeholder="e.g. Broken Electric Fan" style={{ width:"100%", background:"none", border:"none", outline:"none", fontSize:13, fontFamily:IN, color:"#1F2937", boxSizing:"border-box" as const }}/>
          </div>

          {/* Description */}
          <p style={{ margin:"0 0 6px", fontSize:12, fontWeight:800, color:"#374151", fontFamily:QS }}>Description <span style={{ color:"#EF4444" }}>*</span></p>
          <div style={{ background:"white", borderRadius:14, padding:"11px 14px", border:"1.5px solid #E5E7EB", marginBottom:14 }}>
            <textarea value={desc} onChange={e=>{ setDesc(e.target.value); setErr(""); }} placeholder="Describe your concern in detail..." rows={4} style={{ width:"100%", background:"none", border:"none", outline:"none", fontSize:13, fontFamily:IN, color:"#1F2937", resize:"none" as const, boxSizing:"border-box" as const }}/>
          </div>

          {/* Photo Attachment */}
          <p style={{ margin:"0 0 6px", fontSize:12, fontWeight:800, color:"#374151", fontFamily:QS }}>Photo Attachment <span style={{ fontSize:10, color:"#9CA3AF", fontWeight:600 }}>(Optional)</span></p>
          <div style={{ display:"flex", gap:9, marginBottom:14, flexWrap:"wrap" as const }}>
            {imgColors.map((c,i)=>(
              <div key={i} style={{ width:72, height:66, borderRadius:14, background:c, display:"flex", alignItems:"center", justifyContent:"center", position:"relative" as const }}>
                <ImageIcon size={18} color="rgba(255,255,255,.7)"/>
                <div onClick={()=>setImgColors(prev=>prev.filter((_,j)=>j!==i))} style={{ position:"absolute" as const, top:-5, right:-5, width:18, height:18, borderRadius:"50%", background:"#EF4444", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", border:"2px solid white" }}>
                  <X size={9} color="white"/>
                </div>
              </div>
            ))}
            {imgColors.length < 4 && (
              <div onClick={()=>setImgColors(prev=>[...prev, IMG_COLORS[prev.length % IMG_COLORS.length]])} style={{ width:72, height:66, borderRadius:14, border:"2px dashed #D1D5DB", background:"#F9FAFB", display:"flex", flexDirection:"column" as const, alignItems:"center", justifyContent:"center", gap:4, cursor:"pointer" }}>
                <Plus size={16} color="#9CA3AF"/>
                <span style={{ fontSize:9, color:"#9CA3AF", fontFamily:IN }}>Add Photo</span>
              </div>
            )}
          </div>

          {/* Auto-filled location */}
          <p style={{ margin:"0 0 6px", fontSize:12, fontWeight:800, color:"#374151", fontFamily:QS }}>Location <span style={{ fontSize:10, color:"#9CA3AF", fontWeight:600 }}>(Auto-filled)</span></p>
          <div style={{ background:"#F9FAFB", borderRadius:14, padding:"12px 14px", border:"1.5px solid #E5E7EB", marginBottom:18, display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
            {[["Boarding House",BH_DATA.name],["Room",ROOM_DATA.name],["Bed",ROOM_DATA.bed]].map(([l,v])=>(
              <div key={l}>
                <p style={{ margin:"0 0 2px", fontSize:9, color:"#9CA3AF", fontFamily:QS, fontWeight:700, textTransform:"uppercase" as const }}>{l}</p>
                <p style={{ margin:0, fontSize:11, fontWeight:700, color:"#9CA3AF", fontFamily:QS }}>{v}</p>
              </div>
            ))}
          </div>

          {err && <p style={{ margin:"0 0 10px", fontSize:11, color:"#EF4444", fontFamily:IN }}>{err}</p>}

          <button onClick={handleSubmit} style={{ width:"100%", height:52, borderRadius:20, backgroundImage:GRAD, border:"none", cursor:"pointer", fontSize:15, fontWeight:800, color:"white", fontFamily:QS, boxShadow:"0 4px 16px rgba(151,114,246,.35)" }}>
            Submit Report
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Report Detail Modal ───────────────────────────────────────────────────────

function ReportDetailModal({ report, onClose }: { report: StudentReport; onClose:()=>void }) {
  const [comment, setComment] = useState("");
  const cm = CATEGORY_META[report.category];
  const pm = PRIORITY_META[report.priority];
  const sm = STATUS_META[report.status];

  return (
    <div style={{ position:"fixed" as const, inset:0, background:"rgba(0,0,0,.55)", zIndex:400, display:"flex", flexDirection:"column" as const, justifyContent:"flex-end" }} onClick={onClose}>
      <div style={{ background:"#F7F8FC", borderRadius:"28px 28px 0 0", maxHeight:"92%", display:"flex", flexDirection:"column" as const }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"center", padding:"10px 0 2px" }}><div style={{ width:40, height:4, borderRadius:2, background:"#E5E7EB" }}/></div>
        {/* Header */}
        <div style={{ background:"white", borderRadius:"28px 28px 0 0", padding:"12px 18px 14px", borderBottom:"1px solid #F3F4F6", display:"flex", alignItems:"center", gap:10 }}>
          <div onClick={onClose} style={{ cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", padding:4 }}><ChevronLeft size={17} color="#374151"/></div>
          <div style={{ flex:1 }}>
            <div style={{ display:"flex", gap:5, marginBottom:3, flexWrap:"wrap" as const }}>
              <span style={{ fontSize:9, fontWeight:800, padding:"2px 8px", borderRadius:20, background:sm.bg, color:sm.color, fontFamily:QS, display:"flex", alignItems:"center", gap:3 }}>
                <div style={{ width:5, height:5, borderRadius:"50%", background:sm.dot }}/>{sm.label}
              </span>
              <span style={{ fontSize:9, fontWeight:800, padding:"2px 8px", borderRadius:20, background:pm.bg, color:pm.color, fontFamily:QS, display:"flex", alignItems:"center", gap:3 }}>
                <div style={{ width:4, height:4, borderRadius:"50%", background:pm.dot }}/>{pm.label}
              </span>
              <span style={{ fontSize:9, fontWeight:800, padding:"2px 8px", borderRadius:20, background:cm.bg, color:cm.color, fontFamily:QS }}>{cm.label}</span>
            </div>
            <p style={{ margin:0, fontSize:14, fontWeight:800, color:"#1F2937", fontFamily:QS, lineHeight:1.3 }}>{report.title}</p>
          </div>
        </div>
        <div style={{ flex:1, overflowY:"auto" as const, scrollbarWidth:"none" as const, padding:"14px 18px 36px" }}>
          {/* Meta */}
          <div style={{ background:"white", borderRadius:16, padding:"12px 14px", marginBottom:12, boxShadow:"0 2px 8px rgba(0,0,0,.05)", display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            {[["Boarding House",report.boardingHouse],["Room",report.roomNumber],["Bed",report.bedNumber],["Date Submitted",report.dateSubmitted]].map(([l,v])=>(
              <div key={l}>
                <p style={{ margin:"0 0 1px", fontSize:9, color:"#9CA3AF", fontFamily:QS, fontWeight:700, textTransform:"uppercase" as const }}>{l}</p>
                <p style={{ margin:0, fontSize:11, fontWeight:700, color:"#1F2937", fontFamily:QS }}>{v}</p>
              </div>
            ))}
          </div>
          {/* Description */}
          <div style={{ background:"white", borderRadius:16, padding:"12px 14px", marginBottom:12, boxShadow:"0 2px 8px rgba(0,0,0,.05)" }}>
            <p style={{ margin:"0 0 6px", fontSize:10, fontWeight:800, color:"#9CA3AF", fontFamily:QS, textTransform:"uppercase" as const, letterSpacing:0.5 }}>Description</p>
            <p style={{ margin:0, fontSize:12, color:"#374151", fontFamily:IN, lineHeight:1.7 }}>{report.description}</p>
          </div>
          {/* Photos */}
          {report.imageColors && report.imageColors.length>0 && (
            <div style={{ background:"white", borderRadius:16, padding:"12px 14px", marginBottom:12, boxShadow:"0 2px 8px rgba(0,0,0,.05)" }}>
              <p style={{ margin:"0 0 8px", fontSize:10, fontWeight:800, color:"#9CA3AF", fontFamily:QS, textTransform:"uppercase" as const, letterSpacing:0.5 }}>Photos ({report.imageColors.length})</p>
              <div style={{ display:"flex", gap:8 }}>
                {report.imageColors.map((c,i)=>(
                  <div key={i} style={{ width:80, height:70, borderRadius:13, background:c, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <ImageIcon size={20} color="rgba(255,255,255,.7)"/>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Status timeline */}
          <div style={{ background:"white", borderRadius:16, padding:"12px 14px", marginBottom:12, boxShadow:"0 2px 8px rgba(0,0,0,.05)" }}>
            <p style={{ margin:"0 0 10px", fontSize:10, fontWeight:800, color:"#9CA3AF", fontFamily:QS, textTransform:"uppercase" as const, letterSpacing:0.5 }}>Status Timeline</p>
            {report.statusHistory.map((h,i)=>{
              const hsm = STATUS_META[h.status];
              return (
                <div key={i} style={{ display:"flex", gap:10, marginBottom:i<report.statusHistory.length-1?10:0, position:"relative" as const }}>
                  {i<report.statusHistory.length-1 && <div style={{ position:"absolute" as const, left:10, top:22, bottom:-10, width:1.5, background:"#F3F4F6" }}/>}
                  <div style={{ width:22, height:22, borderRadius:7, background:hsm.bg, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <div style={{ width:7, height:7, borderRadius:"50%", background:hsm.dot }}/>
                  </div>
                  <div>
                    <p style={{ margin:0, fontSize:11, fontWeight:800, color:hsm.color, fontFamily:QS }}>{hsm.label}</p>
                    {h.note && <p style={{ margin:"1px 0 0", fontSize:10, color:"#6B7280", fontFamily:IN }}>{h.note}</p>}
                    <p style={{ margin:"2px 0 0", fontSize:9, color:"#C4C9D4", fontFamily:IN }}>{h.date}</p>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Landlord response */}
          {report.landlordResponse && (
            <div style={{ background:"#F0FDF4", borderRadius:16, padding:"12px 14px", marginBottom:12, border:"1px solid #BBF7D0" }}>
              <p style={{ margin:"0 0 6px", fontSize:10, fontWeight:800, color:"#16A34A", fontFamily:QS, textTransform:"uppercase" as const, letterSpacing:0.5 }}>Landlord Response</p>
              <p style={{ margin:"0 0 4px", fontSize:12, color:"#15803D", fontFamily:IN, lineHeight:1.6 }}>{report.landlordResponse}</p>
              <p style={{ margin:0, fontSize:9, color:"#86EFAC", fontFamily:IN }}>{report.landlordResponseDate}</p>
            </div>
          )}
          {/* Additional comment */}
          {(report.status==="in-progress"||report.status==="pending") && (
            <div style={{ background:"white", borderRadius:16, padding:"12px 14px", boxShadow:"0 2px 8px rgba(0,0,0,.05)" }}>
              <p style={{ margin:"0 0 7px", fontSize:11, fontWeight:800, color:"#374151", fontFamily:QS }}>Add Comment</p>
              <div style={{ background:"#F9FAFB", borderRadius:11, padding:"9px 12px", border:"1.5px solid #E5E7EB", marginBottom:9 }}>
                <textarea value={comment} onChange={e=>setComment(e.target.value)} placeholder="Add more information if needed..." rows={3} style={{ width:"100%", background:"none", border:"none", outline:"none", fontSize:12, fontFamily:IN, color:"#1F2937", resize:"none" as const, boxSizing:"border-box" as const }}/>
              </div>
              <button style={{ width:"100%", height:40, borderRadius:14, backgroundImage:GRAD, border:"none", cursor:"pointer", fontSize:12, fontWeight:800, color:"white", fontFamily:QS }}>Send Comment</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export function StudentHomeScreen({ go, pendingDeepLink, onDeepLinkConsumed }: {
  go:(s:string)=>void;
  pendingDeepLink?: { type: NotificationType; relatedId?: string } | null;
  onDeepLinkConsumed?: () => void;
}) {
  const [selAnn, setSelAnn]     = useState<typeof ANNOUNCEMENTS[0]|null>(null);
  const [readIds, setReadIds]   = useState<string[]>([]);
  const [showSubmitReport, setShowSubmitReport] = useState(false);
  const [selectedReport, setSelectedReport]     = useState<StudentReport|null>(null);
  const [reports, setReports]                   = useState<StudentReport[]>(()=>getReports());
  const notifCount = useUnreadCount("student");
  const chatCount = useUnreadChatCount("student");

  // Opened from a "Report" notification — jump straight to that report.
  useEffect(() => {
    if (pendingDeepLink?.type === "report" && pendingDeepLink.relatedId) {
      const match = reports.find(r => r.id === pendingDeepLink.relatedId);
      if (match) setSelectedReport(match);
      onDeepLinkConsumed?.();
    }
  }, [pendingDeepLink, reports, onDeepLinkConsumed]);

  const hour = new Date().getHours();
  const greeting = hour<12 ? "Good morning" : hour<18 ? "Good afternoon" : "Good evening";
  const psm = payStatusMeta(BILLING_DATA.status);
  const bsm = bhStatusMeta(BH_DATA.status);
  const occupancyPct = Math.round((ROOM_DATA.occupied/ROOM_DATA.capacity)*100);
  const stayPct = Math.round((STAY_DATA.daysStayed/STAY_DATA.totalDays)*100);
  const unreadCount = ANNOUNCEMENTS.filter(a=>!readIds.includes(a.id)).length;

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column" as const, background:"#F7F8FC", position:"relative" as const, overflow:"hidden" }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ flexShrink:0, padding:"52px 20px 22px", backgroundImage:GRAD_H, position:"relative" as const, overflow:"hidden" }}>
        <div style={{ position:"absolute" as const, top:-60, right:-60, width:220, height:220, borderRadius:"50%", background:"rgba(255,255,255,.06)" }}/>
        <div style={{ position:"absolute" as const, bottom:-40, left:-30, width:150, height:150, borderRadius:"50%", background:"rgba(255,255,255,.04)" }}/>
        <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginBottom:18, position:"relative" as const, zIndex:2 }}>
          <button onClick={()=>go("notifications")} style={{ width:40, height:40, borderRadius:13, background:"rgba(255,255,255,.18)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", position:"relative" as const }}>
            <Bell size={19} color="white"/>
            {notifCount>0 && <span style={{ position:"absolute" as const, top:-2, right:-2, width:16, height:16, borderRadius:"50%", background:"#EF4444", color:"white", fontSize:8, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center" }}>{fmtBadgeCount(notifCount)}</span>}
          </button>
          <button onClick={()=>go("messages")} style={{ width:40, height:40, borderRadius:13, background:"rgba(255,255,255,.18)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", position:"relative" as const }}>
            <MessageCircle size={19} color="white"/>
            {chatCount>0 && <span style={{ position:"absolute" as const, top:-2, right:-2, width:16, height:16, borderRadius:"50%", background:"#22C55E", color:"white", fontSize:8, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center" }}>{fmtBadgeCount(chatCount)}</span>}
          </button>
        </div>
        <div style={{ position:"relative" as const, zIndex:2 }}>
          <p style={{ margin:"0 0 2px", fontSize:13, color:"rgba(255,255,255,.75)", fontFamily:IN }}>{greeting},</p>
          <h1 style={{ margin:"0 0 6px", fontSize:22, fontWeight:800, color:"white", fontFamily:QS, lineHeight:1.2 }}>{STUDENT_DATA.name}</h1>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" as const }}>
            <div style={{ display:"flex", alignItems:"center", gap:5 }}>
              <Home size={12} color="rgba(255,255,255,.7)"/>
              <span style={{ fontSize:12, color:"rgba(255,255,255,.8)", fontFamily:IN }}>{ROOM_DATA.name} · {ROOM_DATA.bed}</span>
            </div>
            <span style={{ fontSize:10, padding:"3px 9px", borderRadius:20, background:bsm.bg+"33", border:"1px solid rgba(255,255,255,.25)", color:"white", fontFamily:QS, fontWeight:700 }}>
              ● {BH_DATA.status}
            </span>
          </div>
        </div>
      </div>

      {/* ── Scrollable Content ───────────────────────────────────────────────── */}
      <div style={{ flex:1, overflowY:"auto" as const, scrollbarWidth:"none" as const }}>

        {/* ── Today's Overview ─────────────────────────────────────────────── */}
        <div style={{ padding:"16px 16px 0" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
            <p style={{ fontSize:15, fontWeight:800, color:"#1F2937", margin:0, fontFamily:QS }}>Today's Overview</p>
            <span style={{ fontSize:11, color:"#9CA3AF", fontFamily:IN }}>Aug 3, 2026</span>
          </div>
          <div style={{ background:"white", borderRadius:20, overflow:"hidden", boxShadow:"0 2px 10px rgba(0,0,0,.05)", marginBottom:16 }}>
            <div style={{ display:"flex", gap:10, overflowX:"auto" as const, scrollbarWidth:"none" as const, padding:"14px 14px", WebkitOverflowScrolling:"touch" as const }}>
              {/* Current Room */}
              <div style={{ flexShrink:0, width:162, background:"#F9FAFB", borderRadius:18, padding:"14px 13px 13px", borderTop:"3px solid #3B82F6", display:"flex", flexDirection:"column" as const }}>
                <div style={{ width:34, height:34, borderRadius:11, background:"#EFF6FF", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:10 }}>
                  <Home size={16} color="#3B82F6"/>
                </div>
                <p style={{ margin:"0 0 2px", fontSize:11, fontWeight:800, color:"#6B7280", fontFamily:QS, textTransform:"uppercase" as const, letterSpacing:.5 }}>Current Room</p>
                <p style={{ margin:"0 0 2px", fontSize:15, fontWeight:800, color:"#1F2937", fontFamily:QS }}>{ROOM_DATA.name}</p>
                <p style={{ margin:"0 0 8px", fontSize:11, color:"#9CA3AF", fontFamily:IN }}>{ROOM_DATA.bed} · {ROOM_DATA.type}</p>
                <div style={{ height:5, background:"#E5E7EB", borderRadius:4, overflow:"hidden", marginBottom:6 }}>
                  <div style={{ height:"100%", borderRadius:4, background:"#3B82F6", width:`${occupancyPct}%` }}/>
                </div>
                <span style={{ fontSize:9, fontWeight:800, color:"#3B82F6", fontFamily:QS }}>{ROOM_DATA.occupied}/{ROOM_DATA.capacity} Occupied</span>
              </div>
              {/* Monthly Payment */}
              <div style={{ flexShrink:0, width:162, background:"#F9FAFB", borderRadius:18, padding:"14px 13px 13px", borderTop:`3px solid ${psm.color}`, display:"flex", flexDirection:"column" as const }}>
                <div style={{ width:34, height:34, borderRadius:11, background:"#F5F0FF", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:10 }}>
                  <CreditCard size={16} color="#9772F6"/>
                </div>
                <p style={{ margin:"0 0 2px", fontSize:11, fontWeight:800, color:"#6B7280", fontFamily:QS, textTransform:"uppercase" as const, letterSpacing:.5 }}>Monthly Payment</p>
                <p style={{ margin:"0 0 2px", fontSize:15, fontWeight:800, color:"#9772F6", fontFamily:QS }}>₱{BILLING_DATA.total.toLocaleString()}</p>
                <p style={{ margin:"0 0 8px", fontSize:11, color:"#9CA3AF", fontFamily:IN }}>Due: {BILLING_DATA.dueDate}</p>
                <span style={{ alignSelf:"flex-start" as const, fontSize:9, fontWeight:800, padding:"2px 8px", borderRadius:20, background:psm.bg, color:psm.color, fontFamily:QS }}>{psm.label}</span>
              </div>
              {/* Current Stay */}
              <div style={{ flexShrink:0, width:162, background:"#F9FAFB", borderRadius:18, padding:"14px 13px 13px", borderTop:"3px solid #16A34A", display:"flex", flexDirection:"column" as const }}>
                <div style={{ width:34, height:34, borderRadius:11, background:"#DCFCE7", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:10 }}>
                  <Calendar size={16} color="#16A34A"/>
                </div>
                <p style={{ margin:"0 0 2px", fontSize:11, fontWeight:800, color:"#6B7280", fontFamily:QS, textTransform:"uppercase" as const, letterSpacing:.5 }}>Current Stay</p>
                <p style={{ margin:"0 0 0", fontSize:13, fontWeight:800, color:"#1F2937", fontFamily:QS }}>{STAY_DATA.moveIn}</p>
                <p style={{ margin:"2px 0 4px", fontSize:11, color:"#9CA3AF", fontFamily:IN }}>to {STAY_DATA.moveOut}</p>
                <div style={{ height:5, background:"#E5E7EB", borderRadius:4, overflow:"hidden", marginBottom:6 }}>
                  <div style={{ height:"100%", borderRadius:4, background:"#16A34A", width:`${stayPct}%` }}/>
                </div>
                <span style={{ fontSize:9, fontWeight:800, color:"#16A34A", fontFamily:QS }}>{STAY_DATA.daysStayed} days · {STAY_DATA.stayLength}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Report a Concern ─────────────────────────────────────────────── */}
        <div style={{ padding:"0 16px 0" }}>
          <div style={{ background:"white", borderRadius:20, overflow:"hidden", boxShadow:"0 4px 18px rgba(151,114,246,.12)", marginBottom:16 }}>
            <div style={{ backgroundImage:GRAD, padding:"16px 18px 14px", display:"flex", alignItems:"center", gap:14 }}>
              <div style={{ width:46, height:46, borderRadius:16, background:"rgba(255,255,255,.2)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <Flag size={21} color="white"/>
              </div>
              <div style={{ flex:1 }}>
                <p style={{ margin:0, fontSize:16, fontWeight:800, color:"white", fontFamily:QS }}>Report a Concern</p>
                <p style={{ margin:"2px 0 0", fontSize:11, color:"rgba(255,255,255,.75)", fontFamily:IN }}>Report issues directly to your landlord</p>
              </div>
            </div>
            <div style={{ padding:"14px 16px 16px", display:"flex", gap:10 }}>
              {[
                { Icon:Wrench,     label:"Maintenance", cat:"maintenance" as ReportCategory },
                { Icon:Zap,        label:"Electrical", cat:"electrical" as ReportCategory },
                { Icon:ShowerHead, label:"Bathroom", cat:"bathroom" as ReportCategory },
                { Icon:Wifi,       label:"Internet", cat:"internet" as ReportCategory },
              ].map(({ Icon, label })=>(
                <button key={label} onClick={()=>setShowSubmitReport(true)} style={{ flex:1, background:"#F7F8FC", border:"1px solid #F3F4F6", borderRadius:14, padding:"10px 4px", cursor:"pointer", display:"flex", flexDirection:"column" as const, alignItems:"center", gap:4 }}>
                  <Icon size={17} color="#9772F6"/>
                  <span style={{ fontSize:9, fontWeight:800, color:"#374151", fontFamily:QS }}>{label}</span>
                </button>
              ))}
            </div>
            <div style={{ padding:"0 16px 16px" }}>
              <button onClick={()=>setShowSubmitReport(true)} style={{ width:"100%", height:44, borderRadius:16, backgroundImage:GRAD, border:"none", cursor:"pointer", fontSize:13, fontWeight:800, color:"white", fontFamily:QS, boxShadow:"0 4px 14px rgba(151,114,246,.3)", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                <Plus size={16} color="white"/> Submit New Concern
              </button>
            </div>
          </div>
        </div>

        {/* ── My Reports ───────────────────────────────────────────────────── */}
        {(() => {
          const myReports = reports.filter(r => r.studentId === STUDENT_DATA.id);
          if (myReports.length === 0) return null;
          return (
            <div style={{ padding:"0 16px 0" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                <p style={{ fontSize:15, fontWeight:800, color:"#1F2937", margin:0, fontFamily:QS }}>My Reports</p>
                <span style={{ fontSize:10, fontWeight:800, padding:"3px 10px", borderRadius:20, background:"#F5F0FF", color:"#9772F6", fontFamily:QS }}>{myReports.length} total</span>
              </div>
              <div style={{ display:"flex", flexDirection:"column" as const, gap:10, marginBottom:16 }}>
                {myReports.map(r => {
                  const cm = CATEGORY_META[r.category];
                  const pm = PRIORITY_META[r.priority];
                  const sm = STATUS_META[r.status];
                  return (
                    <div key={r.id} onClick={()=>setSelectedReport(r)} style={{ background:"white", borderRadius:18, padding:"14px 16px", boxShadow:"0 2px 10px rgba(0,0,0,.06)", cursor:"pointer", borderLeft:`4px solid ${cm.color}` }}>
                      <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                        <div style={{ flex:1 }}>
                          <div style={{ display:"flex", gap:5, marginBottom:5, flexWrap:"wrap" as const }}>
                            <span style={{ fontSize:9, fontWeight:800, padding:"2px 8px", borderRadius:20, background:sm.bg, color:sm.color, fontFamily:QS, display:"flex", alignItems:"center", gap:3 }}>
                              <div style={{ width:4, height:4, borderRadius:"50%", background:sm.dot }}/>{sm.label}
                            </span>
                            <span style={{ fontSize:9, fontWeight:800, padding:"2px 8px", borderRadius:20, background:cm.bg, color:cm.color, fontFamily:QS }}>{cm.label}</span>
                            <span style={{ fontSize:9, fontWeight:800, padding:"2px 8px", borderRadius:20, background:pm.bg, color:pm.color, fontFamily:QS, display:"flex", alignItems:"center", gap:3 }}>
                <div style={{ width:4, height:4, borderRadius:"50%", background:pm.dot }}/>{pm.label}
              </span>
                          </div>
                          <p style={{ margin:"0 0 3px", fontSize:13, fontWeight:800, color:"#1F2937", fontFamily:QS, lineHeight:1.3 }}>{r.title}</p>
                          <p style={{ margin:0, fontSize:11, color:"#6B7280", fontFamily:IN }}>{r.dateSubmitted} · {r.timeSubmitted}</p>
                          {r.landlordResponse && (
                            <div style={{ marginTop:8, padding:"8px 10px", borderRadius:10, background:"#F0FDF4", border:"1px solid #BBF7D0", display:"flex", alignItems:"flex-start", gap:6 }}>
                              <MessageCircle size={11} color="#16A34A" style={{ flexShrink:0, marginTop:2 }}/>
                              <p style={{ margin:0, fontSize:10, color:"#16A34A", fontFamily:IN, lineHeight:1.5, fontWeight:600 }}>
                                Landlord: {r.landlordResponse.length>80?r.landlordResponse.slice(0,80)+"...":r.landlordResponse}
                              </p>
                            </div>
                          )}
                        </div>
                        <ChevronRight size={14} color="#D1D5DB" style={{ flexShrink:0, marginTop:2 }}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* ── Recent Announcements ──────────────────────────────────────────── */}
        <div id="ann-sec" style={{ padding:"0 16px 0" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <p style={{ fontSize:15, fontWeight:800, color:"#1F2937", margin:0, fontFamily:QS }}>Announcements</p>
              {unreadCount>0 && <span style={{ fontSize:10, fontWeight:800, padding:"2px 8px", borderRadius:20, backgroundImage:GRAD, color:"white", fontFamily:QS }}>{unreadCount} new</span>}
            </div>
            <span style={{ fontSize:11, color:"#9CA3AF", fontFamily:IN }}>View only</span>
          </div>
          <p style={{ fontSize:11, color:"#9CA3AF", margin:"2px 0 12px", fontFamily:IN }}>Posted by {BH_DATA.landlord}</p>
          <div style={{ background:"white", borderRadius:20, overflow:"hidden", boxShadow:"0 2px 10px rgba(0,0,0,.05)", marginBottom:16 }}>
            {ANNOUNCEMENTS.map((ann,i)=>{
              const pm = prioMeta(ann.priority);
              const isRead = readIds.includes(ann.id);
              return (
                <div key={ann.id} onClick={()=>setSelAnn(ann)} style={{ padding:"14px 16px", borderBottom:i<ANNOUNCEMENTS.length-1?"1px solid #F3F4F6":"none", cursor:"pointer" }}>
                  <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                    <div style={{ width:38, height:38, borderRadius:12, background:pm.bg, border:`1.5px solid ${pm.border}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, opacity:isRead?.7:1 }}>
                      <Megaphone size={16} color={pm.color}/>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3 }}>
                        <p style={{ margin:0, fontSize:13, fontWeight:800, color:isRead?"#9CA3AF":"#1F2937", fontFamily:QS }}>{ann.title}</p>
                        {!isRead && <div style={{ width:7, height:7, borderRadius:"50%", background:"#9772F6", flexShrink:0 }}/>}
                      </div>
                      <p style={{ margin:"0 0 6px", fontSize:11, color:"#6B7280", fontFamily:IN, lineHeight:1.4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" as const }}>{ann.desc}</p>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <span style={{ fontSize:9, fontWeight:800, padding:"2px 8px", borderRadius:20, background:pm.bg, color:pm.color, fontFamily:QS }}>{pm.label}</span>
                        <span style={{ fontSize:10, color:"#9CA3AF", fontFamily:IN }}>{ann.date}</span>
                        {isRead && <span style={{ fontSize:9, color:"#9CA3AF", fontFamily:IN, display:"inline-flex", alignItems:"center", gap:3 }}><Check size={9}/> Read</span>}
                      </div>
                    </div>
                    <ChevronRight size={14} color="#D1D5DB" style={{ flexShrink:0, marginTop:2 }}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Activity Timeline ─────────────────────────────────────────────── */}
        <div style={{ padding:"0 16px 28px" }}>
          <p style={{ fontSize:15, fontWeight:800, color:"#1F2937", margin:"0 0 12px", fontFamily:QS }}>Activity Timeline</p>
          <div style={{ background:"white", borderRadius:20, overflow:"hidden", boxShadow:"0 2px 10px rgba(0,0,0,.05)" }}>
            {ACTIVITIES.map((a,i)=>(
              <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"14px 16px", borderBottom:i<ACTIVITIES.length-1?"1px solid #F3F4F6":"none", position:"relative" as const }}>
                {i<ACTIVITIES.length-1 && <div style={{ position:"absolute" as const, left:28, top:46, bottom:0, width:1.5, background:"#F3F4F6", zIndex:0 }}/>}
                <div style={{ width:28, height:28, borderRadius:10, background:a.color+"18", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, zIndex:1 }}>
                  <a.Icon size={13} color={a.color}/>
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ margin:0, fontSize:12, fontWeight:700, color:"#1F2937", fontFamily:QS }}>{a.msg}</p>
                  <p style={{ margin:"2px 0 0", fontSize:10, color:"#9CA3AF", fontFamily:IN }}>{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selAnn   && <AnnouncementModal ann={selAnn} isRead={readIds.includes(selAnn.id)} onMarkRead={()=>setReadIds(p=>[...p,selAnn.id])} onClose={()=>setSelAnn(null)}/>}
      {showSubmitReport && <SubmitReportModal onClose={()=>setShowSubmitReport(false)} onSubmitted={()=>setReports(getReports())}/>}
      {selectedReport   && <ReportDetailModal report={selectedReport} onClose={()=>setSelectedReport(null)}/>}
    </div>
  );
}
