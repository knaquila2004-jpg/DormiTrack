import React, { useState, useMemo } from "react";
import {
  Search, X, ChevronRight, CheckCircle, XCircle, AlertCircle,
  Clock, Trash2, Lock, Eye, Edit3, FileText, Flag,
  ChevronLeft, Inbox, CheckSquare, Archive, Filter, ArrowUpDown,
  AlertTriangle, MessageCircle, Bell, User, Building2, Calendar,
  MapPin, Shield, Image as ImageIcon, ExternalLink, Send,
  UserX, PhoneCall,
} from "lucide-react";

const GRAD   = "linear-gradient(135deg,#9772F6 0%,#7549F6 100%)";
const GRAD_H = "linear-gradient(160deg,#9772F6 0%,#7549F6 100%)";
const QS     = "'Quicksand',sans-serif";
const IN     = "'Inter',sans-serif";

// ── Types ─────────────────────────────────────────────────────────────────────

type UserRole     = "student"|"parent"|"landlord"|"admin";
type UserStatus   = "active"|"suspended"|"pending";
type ReportStatus   = "pending"|"under-review"|"resolved"|"rejected"|"archived";
type ReportPriority = "low"|"medium"|"high"|"critical";
type ReportCategory = "maintenance"|"harassment"|"payment"|"safety"|"noise"|"rule-violation"|"cleanliness"|"other";

interface AppUser {
  id:string; name:string; role:UserRole; email:string; contact:string;
  status:UserStatus; lastLogin:string; linked?:string; bh?:string;
}

interface UserReport {
  id:string;
  targetUserId:string;
  submitterUserId:string;
  reporterName:string;
  reporterRole:string;
  category:ReportCategory;
  reportType:string;
  title:string;
  shortDesc:string;
  fullDesc:string;
  status:ReportStatus;
  priority:ReportPriority;
  dateSubmitted:string;
  timeSubmitted:string;
  lastUpdated:string;
  boardingHouse?:string;
  roomNumber?:string;
  location?:string;
  assignedReviewer?:string;
  resolutionNotes?:string;
  imageColors?:string[];
}

// ── Metadata ──────────────────────────────────────────────────────────────────

const REPORT_STATUS_META: Record<ReportStatus,{ label:string; color:string; bg:string; dot:string }> = {
  "pending":      { label:"Pending",      color:"#6B7280", bg:"#F3F4F6", dot:"#9CA3AF" },
  "under-review": { label:"Under Review", color:"#D97706", bg:"#FEF3C7", dot:"#F59E0B" },
  "resolved":     { label:"Resolved",     color:"#16A34A", bg:"#DCFCE7", dot:"#22C55E" },
  "rejected":     { label:"Rejected",     color:"#EF4444", bg:"#FEE2E2", dot:"#EF4444" },
  "archived":     { label:"Archived",     color:"#6B7280", bg:"#F9FAFB", dot:"#D1D5DB" },
};
const PRIORITY_META: Record<ReportPriority,{ label:string; color:string; bg:string }> = {
  "low":      { label:"Low",      color:"#6B7280", bg:"#F3F4F6" },
  "medium":   { label:"Medium",   color:"#D97706", bg:"#FEF3C7" },
  "high":     { label:"High",     color:"#EF4444", bg:"#FEE2E2" },
  "critical": { label:"Critical", color:"#7F1D1D", bg:"#FEE2E2" },
};
const CATEGORY_LABEL: Record<ReportCategory,string> = {
  maintenance:"Maintenance", harassment:"Harassment", payment:"Payment",
  safety:"Safety", noise:"Noise", "rule-violation":"Rule Violation",
  cleanliness:"Cleanliness", other:"Other",
};
const ROLE_META: Record<UserRole,{ label:string; color:string; bg:string }> = {
  student:  { label:"Student",          color:"#9772F6", bg:"#F5F0FF" },
  parent:   { label:"Parent",           color:"#EC4899", bg:"#FDF2F8" },
  landlord: { label:"Landlord",         color:"#3B82F6", bg:"#EFF6FF" },
  admin:    { label:"Housing Director", color:"#374151", bg:"#F3F4F6" },
};
const STATUS_META: Record<UserStatus,{ label:string; color:string; bg:string }> = {
  active:    { label:"Active",    color:"#16A34A", bg:"#DCFCE7" },
  suspended: { label:"Suspended", color:"#EF4444", bg:"#FEE2E2" },
  pending:   { label:"Pending",   color:"#D97706", bg:"#FEF3C7" },
};

const AVATAR_COLORS = ["#9772F6","#3B82F6","#16A34A","#EC4899","#D97706","#6366F1","#0891B2","#7C3AED"];
const initials  = (n:string) => n.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
const avatarCol = (id:string) => AVATAR_COLORS[parseInt(id.replace(/\D/g,""))%AVATAR_COLORS.length];

// ── Seed data ─────────────────────────────────────────────────────────────────

const ALL_USERS: AppUser[] = [
  { id:"u1",  name:"Juan Dela Cruz",      role:"student",  email:"jdelacruz@bisu.edu.ph",  contact:"+63 912 345 6789", status:"active",    lastLogin:"Today 8:02 AM",  linked:"Maria Dela Cruz", bh:"Naquila BH"   },
  { id:"u2",  name:"Maria Santos",        role:"student",  email:"msantos@bisu.edu.ph",    contact:"+63 919 555 1234", status:"active",    lastLogin:"Today 7:55 AM",  linked:"Rosa Santos",     bh:"Naquila BH"   },
  { id:"u3",  name:"Kevin Cruz",          role:"student",  email:"kcruz@bisu.edu.ph",      contact:"+63 915 777 5678", status:"pending",   lastLogin:"Never"                                       },
  { id:"u4",  name:"Lena Reyes",          role:"student",  email:"lreyes@bisu.edu.ph",     contact:"+63 908 111 9876", status:"active",    lastLogin:"Yesterday",      linked:"Pedro Reyes",     bh:"Sunrise Dorm" },
  { id:"u5",  name:"Ben Torres",          role:"student",  email:"btorres@bisu.edu.ph",    contact:"+63 933 444 2222", status:"suspended", lastLogin:"3 days ago"                                  },
  { id:"u6",  name:"Maria Dela Cruz",     role:"parent",   email:"mariadelacruz@gmail.com",contact:"+63 917 123 4567", status:"active",    lastLogin:"Today 9:00 AM",  linked:"Juan Dela Cruz"   },
  { id:"u7",  name:"Rosa Santos",         role:"parent",   email:"rosasantos@gmail.com",   contact:"+63 920 888 0000", status:"active",    lastLogin:"Yesterday",      linked:"Maria Santos"     },
  { id:"u8",  name:"Pedro Reyes",         role:"parent",   email:"preyes@gmail.com",       contact:"+63 921 777 3333", status:"pending",   lastLogin:"Never",          linked:"Lena Reyes"       },
  { id:"u9",  name:"Ma. Kyla L. Naquila", role:"landlord", email:"kylanaquila@gmail.com",  contact:"+63 912 345 6789", status:"active",    lastLogin:"Today 10:00 AM", bh:"Naquila BH"           },
  { id:"u10", name:"Carlos Sunrise",      role:"landlord", email:"carlos@sunrise.com",     contact:"+63 918 000 1111", status:"active",    lastLogin:"Yesterday",      bh:"Sunrise Dorm"         },
  { id:"u11", name:"Ana Pending",         role:"landlord", email:"ana@pending.com",        contact:"+63 999 000 1234", status:"pending",   lastLogin:"Never"                                       },
];

const SEED_REPORTS: UserReport[] = [
  { id:"rp1", targetUserId:"u9",  submitterUserId:"u1", reporterName:"Juan Dela Cruz",  reporterRole:"Student",  category:"maintenance",    reportType:"Plumbing",        title:"Persistent Leaking Faucet Ignored for 2 Weeks",       shortDesc:"The bathroom faucet has been leaking continuously. Multiple requests to the landlord were made but no action was taken.", fullDesc:"I reported the leaking faucet in the shared bathroom on July 20 and again on July 25. The landlord acknowledged both times but no repair has been made. Water is wasting constantly and the dripping sound at night is affecting sleep quality for multiple boarders in Room A. I have also noticed water damage forming on the floor tiles.", status:"under-review", priority:"high",     dateSubmitted:"Aug 1, 2026",  timeSubmitted:"9:14 AM",  lastUpdated:"Aug 2, 2026",  boardingHouse:"Naquila BH", roomNumber:"Room A",       location:"Shared Bathroom", assignedReviewer:"Admin", imageColors:["#93C5FD","#6EE7B7","#FCA5A5"] },
  { id:"rp2", targetUserId:"u9",  submitterUserId:"u2", reporterName:"Maria Santos",    reporterRole:"Student",  category:"safety",         reportType:"Security",        title:"Main Door Lock Broken – Anyone Can Enter",            shortDesc:"The main entrance lock is broken. Any outsider can push the door open without a key, posing a major security risk.", fullDesc:"The main entrance lock has been broken since July 28. The door does not lock properly and can be opened by simply pushing it. This is a serious security concern especially at night. I informed the landlord on July 28 and July 31 but the lock has not been repaired.", status:"pending",      priority:"critical", dateSubmitted:"Aug 2, 2026",  timeSubmitted:"11:32 AM", lastUpdated:"Aug 2, 2026",  boardingHouse:"Naquila BH", roomNumber:"Room B",       location:"Main Entrance",   imageColors:["#FCA5A5","#FDBA74"] },
  { id:"rp3", targetUserId:"u9",  submitterUserId:"u6", reporterName:"Maria Dela Cruz", reporterRole:"Parent",   category:"payment",        reportType:"Extra Charge",    title:"Extra Charges Added Without Prior Agreement",          shortDesc:"My son's July billing included a ₱500 cleaning fee not stated in the original contract.", fullDesc:"Upon reviewing my son Juan's July billing statement, I noticed an additional ₱500 labeled as 'monthly cleaning fee'. This was never disclosed in the boarding agreement signed in June 2026. When I contacted the landlord to clarify, I was told it had always been part of the terms, which contradicts our signed contract. I am requesting a formal review and refund of this charge.", status:"pending",      priority:"medium",   dateSubmitted:"Jul 31, 2026", timeSubmitted:"3:45 PM",  lastUpdated:"Jul 31, 2026", boardingHouse:"Naquila BH" },
  { id:"rp4", targetUserId:"u10", submitterUserId:"u4", reporterName:"Lena Reyes",      reporterRole:"Student",  category:"noise",          reportType:"Curfew Violation",title:"Landlord Allows Late-Night Noise – Curfew Unenforced", shortDesc:"Boarders regularly return past midnight with full knowledge of the landlord. Curfew is 10 PM per house rules.", fullDesc:"Several boarders in Sunrise Dorm consistently return after midnight and make loud noise in the corridors. When I raised this with the landlord Mr. Carlos Sunrise, he said he could not always monitor everyone. However, the house rules clearly state a 10 PM curfew. This has been happening multiple times per week since July.", status:"under-review", priority:"medium",   dateSubmitted:"Jul 28, 2026", timeSubmitted:"8:20 PM",  lastUpdated:"Aug 1, 2026",  boardingHouse:"Sunrise Dorm", roomNumber:"Room 2",    assignedReviewer:"Admin",   imageColors:["#C4B5FD"] },
  { id:"rp5", targetUserId:"u5",  submitterUserId:"u2", reporterName:"Maria Santos",    reporterRole:"Student",  category:"harassment",     reportType:"Verbal",          title:"Hostile and Threatening Behavior Toward Roommates",    shortDesc:"Ben Torres has repeatedly used threatening language toward fellow boarders when confronted about shared space misuse.", fullDesc:"On three separate occasions (July 15, July 22, and July 30), Ben Torres reacted aggressively when asked to clean up the shared kitchen area. On July 30, he used explicitly threatening language which made multiple boarders feel unsafe. I documented these incidents via text messages.", status:"resolved",     priority:"high",     dateSubmitted:"Jul 30, 2026", timeSubmitted:"10:05 PM", lastUpdated:"Aug 2, 2026",  boardingHouse:"Naquila BH", roomNumber:"Room A",       assignedReviewer:"Admin",   resolutionNotes:"Account suspended pending investigation. Warning letter issued.", imageColors:["#FDE68A","#FCA5A5"] },
  { id:"rp6", targetUserId:"u5",  submitterUserId:"u1", reporterName:"Juan Dela Cruz",  reporterRole:"Student",  category:"rule-violation", reportType:"Property Damage", title:"Damaged Shared Refrigerator – Denies Responsibility",  shortDesc:"The shared refrigerator door hinge was broken. Multiple witnesses saw Ben Torres slam it repeatedly.", fullDesc:"On July 19, the shared refrigerator door hinge was broken. Three boarders witnessed Ben Torres slamming the refrigerator door multiple times in anger. When confronted, he denied responsibility. The landlord has asked all boarders to share the repair cost which is unfair.", status:"rejected",     priority:"medium",   dateSubmitted:"Jul 20, 2026", timeSubmitted:"2:30 PM",  lastUpdated:"Jul 25, 2026", boardingHouse:"Naquila BH", roomNumber:"Kitchen",      resolutionNotes:"Insufficient direct evidence. Parties advised to resolve internally." },
  { id:"rp7", targetUserId:"u10", submitterUserId:"u8", reporterName:"Pedro Reyes",     reporterRole:"Parent",   category:"payment",        reportType:"Missing Receipt",  title:"No Official Receipt Issued for August Payment",        shortDesc:"Despite paying August rent via GCash on Aug 1, no receipt has been issued after multiple follow-ups.", fullDesc:"My daughter Lena Reyes paid her August rent of ₱3,200 via GCash on August 1, 2026 at 9:45 AM. The transaction reference is GC20260801-0042. Despite this, the landlord has not issued an official receipt and has not updated the payment status in DormiTrack. I have sent 3 follow-up messages which have been read but not responded to.", status:"pending",      priority:"high",     dateSubmitted:"Aug 3, 2026",  timeSubmitted:"7:55 AM",  lastUpdated:"Aug 3, 2026",  boardingHouse:"Sunrise Dorm" },
  { id:"rp8", targetUserId:"u9",  submitterUserId:"u2", reporterName:"Maria Santos",    reporterRole:"Student",  category:"cleanliness",    reportType:"Hygiene",         title:"Shared Bathroom Not Cleaned for Over a Week",          shortDesc:"The common bathroom on the ground floor has not been cleaned since July 26. Conditions are now unsanitary.", fullDesc:"According to the house rules, the landlord is responsible for cleaning the shared bathroom twice a week. As of August 3, it has not been cleaned since July 26 — eight days. The floor is dirty, the toilet bowl needs cleaning, and there is visible mold forming near the drain.", status:"resolved",     priority:"medium",   dateSubmitted:"Aug 3, 2026",  timeSubmitted:"6:40 AM",  lastUpdated:"Aug 3, 2026",  boardingHouse:"Naquila BH", location:"Ground Floor",   assignedReviewer:"Admin",   resolutionNotes:"Landlord contacted and confirmed cleaning done Aug 3 evening.", imageColors:["#6EE7B7","#93C5FD","#FDE68A","#C4B5FD"] },
];

// ── Confirm Dialog ────────────────────────────────────────────────────────────

function ConfirmDialog({ title, msg, confirmLabel="Confirm", danger=true, onConfirm, onCancel }: {
  title:string; msg:string; confirmLabel?:string; danger?:boolean; onConfirm:()=>void; onCancel:()=>void;
}) {
  return (
    <div style={{ position:"fixed" as const, inset:0, background:"rgba(0,0,0,.6)", zIndex:600, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }} onClick={onCancel}>
      <div style={{ background:"white", borderRadius:24, padding:"24px 22px 20px", width:"100%", maxWidth:320, boxShadow:"0 24px 60px rgba(0,0,0,.25)" }} onClick={e=>e.stopPropagation()}>
        <div style={{ width:48, height:48, borderRadius:16, background:danger?"#FEE2E2":"#F5F0FF", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 14px" }}>
          <AlertTriangle size={22} color={danger?"#EF4444":"#9772F6"}/>
        </div>
        <h3 style={{ margin:"0 0 8px", fontSize:16, fontWeight:800, color:"#1F2937", fontFamily:QS, textAlign:"center" as const }}>{title}</h3>
        <p style={{ margin:"0 0 22px", fontSize:12, color:"#6B7280", fontFamily:IN, lineHeight:1.6, textAlign:"center" as const }}>{msg}</p>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <button onClick={onCancel} style={{ height:46, borderRadius:18, border:"2px solid #E5E7EB", background:"white", cursor:"pointer", fontSize:13, fontWeight:800, color:"#374151", fontFamily:QS }}>Cancel</button>
          <button onClick={onConfirm} style={{ height:46, borderRadius:18, border:"none", background:danger?"#EF4444":GRAD, cursor:"pointer", fontSize:13, fontWeight:800, color:"white", fontFamily:QS }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ── Reports Center ────────────────────────────────────────────────────────────

type RCFilters = { status:ReportStatus|"all"; priority:ReportPriority|"all"; category:ReportCategory|"all"; role:UserRole|"all" };

function ReportDetailPanel({ report, users, onClose, onUpdateStatus }: {
  report:UserReport; users:AppUser[];
  onClose:()=>void;
  onUpdateStatus:(id:string,s:ReportStatus,note?:string)=>void;
}) {
  const [confirm, setConfirm] = useState<{label:string;status:ReportStatus;msg:string}|null>(null);
  const [note, setNote]     = useState(report.resolutionNotes??"");
  const [showNote, setShowNote] = useState(false);
  const [previewImg, setPreviewImg] = useState<number|null>(null);

  const reporter = users.find(u=>u.id===report.submitterUserId);
  const target   = users.find(u=>u.id===report.targetUserId);
  const rsm = REPORT_STATUS_META[report.status];
  const pm  = PRIORITY_META[report.priority];

  const ACTIONS = [
    { label:"Mark Under Review", status:"under-review" as ReportStatus, color:"#3B82F6", bg:"#EFF6FF", border:"#BFDBFE", Icon:Eye, msg:"Mark this report as Under Review?" },
    { label:"Resolve",           status:"resolved"     as ReportStatus, color:"#16A34A", bg:"#DCFCE7", border:"#BBF7D0", Icon:CheckSquare, msg:"Resolve this report? Reporter will be notified." },
    { label:"Reject",            status:"rejected"     as ReportStatus, color:"#EF4444", bg:"#FEE2E2", border:"#FECACA", Icon:XCircle, msg:"Reject this report? This cannot be undone." },
    { label:"Archive",           status:"archived"     as ReportStatus, color:"#6B7280", bg:"#F3F4F6", border:"#E5E7EB", Icon:Archive, msg:"Move this report to the archive?" },
  ].filter(a=>a.status!==report.status);

  return (
    <>
      {confirm&&<ConfirmDialog title={confirm.label} msg={confirm.msg} confirmLabel={confirm.label} danger={confirm.status==="rejected"||confirm.status==="archived"} onConfirm={()=>{onUpdateStatus(report.id,confirm.status,note||undefined);setConfirm(null);onClose();}} onCancel={()=>setConfirm(null)}/>}
      {previewImg!==null&&report.imageColors&&(
        <div style={{ position:"fixed" as const, inset:0, background:"rgba(0,0,0,.92)", zIndex:700, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column" as const }} onClick={()=>setPreviewImg(null)}>
          <div style={{ width:300, height:230, borderRadius:20, background:report.imageColors[previewImg], display:"flex", alignItems:"center", justifyContent:"center", marginBottom:20 }}>
            <ImageIcon size={52} color="rgba(255,255,255,.4)"/>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            {report.imageColors.map((_,i)=>(
              <div key={i} onClick={e=>{e.stopPropagation();setPreviewImg(i);}} style={{ width:9, height:9, borderRadius:"50%", background:previewImg===i?"white":"rgba(255,255,255,.4)", cursor:"pointer" }}/>
            ))}
          </div>
        </div>
      )}
      <div style={{ position:"fixed" as const, inset:0, background:"rgba(0,0,0,.55)", zIndex:500, display:"flex", flexDirection:"column" as const, justifyContent:"flex-end" }} onClick={onClose}>
        <div style={{ background:"#F2F4F8", borderRadius:"28px 28px 0 0", maxHeight:"92%", display:"flex", flexDirection:"column" as const }} onClick={e=>e.stopPropagation()}>
          <div style={{ flexShrink:0, display:"flex", justifyContent:"center", padding:"10px 0 4px" }}><div style={{ width:40, height:4, borderRadius:2, background:"#E5E7EB" }}/></div>
          {/* Header */}
          <div style={{ flexShrink:0, padding:"4px 18px 14px", borderBottom:"1px solid #F3F4F6", background:"white", borderRadius:"28px 28px 0 0" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
              <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", padding:4 }}><ChevronLeft size={17} color="#374151"/></button>
              <div style={{ flex:1 }}>
                <p style={{ margin:0, fontSize:9, color:"#9CA3AF", fontFamily:IN }}>#{report.id.toUpperCase()} · {report.dateSubmitted} {report.timeSubmitted}</p>
                <p style={{ margin:0, fontSize:14, fontWeight:800, color:"#1F2937", fontFamily:QS, lineHeight:1.3 }}>{report.title}</p>
              </div>
            </div>
            <div style={{ display:"flex", gap:5, flexWrap:"wrap" as const }}>
              <span style={{ display:"flex", alignItems:"center", gap:3, fontSize:9, fontWeight:800, padding:"3px 9px", borderRadius:20, background:rsm.bg, color:rsm.color, fontFamily:QS }}>
                <div style={{ width:5, height:5, borderRadius:"50%", background:rsm.dot }}/>{rsm.label}
              </span>
              <span style={{ fontSize:9, fontWeight:800, padding:"3px 9px", borderRadius:20, background:pm.bg, color:pm.color, fontFamily:QS }}>{pm.label} Priority</span>
              <span style={{ fontSize:9, fontWeight:800, padding:"3px 9px", borderRadius:20, background:"#F5F0FF", color:"#9772F6", fontFamily:QS }}>{CATEGORY_LABEL[report.category]}</span>
              <span style={{ fontSize:9, fontWeight:700, padding:"3px 9px", borderRadius:20, background:"#F9FAFB", color:"#6B7280", fontFamily:IN }}>{report.reportType}</span>
            </div>
          </div>
          {/* Body */}
          <div style={{ flex:1, overflowY:"auto" as const, scrollbarWidth:"none" as const, padding:"14px 18px 36px" }}>
            {/* Reporter & Target */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
              {[{ label:"Reporter", u:reporter }, { label:"Reported User", u:target }].map(({ label, u })=>(
                <div key={label} style={{ background:"white", borderRadius:14, padding:"11px 12px", boxShadow:"0 2px 8px rgba(0,0,0,.05)" }}>
                  <p style={{ margin:"0 0 7px", fontSize:9, fontWeight:800, color:"#9CA3AF", fontFamily:QS, textTransform:"uppercase" as const, letterSpacing:0.5 }}>{label}</p>
                  {u ? (
                    <>
                      <div style={{ width:30, height:30, borderRadius:10, background:avatarCol(u.id)+"18", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:5 }}>
                        <span style={{ fontSize:11, fontWeight:800, color:avatarCol(u.id), fontFamily:QS }}>{initials(u.name)}</span>
                      </div>
                      <p style={{ margin:"0 0 2px", fontSize:11, fontWeight:800, color:"#1F2937", fontFamily:QS, lineHeight:1.3 }}>{u.name}</p>
                      <span style={{ fontSize:8, fontWeight:800, padding:"2px 7px", borderRadius:20, background:ROLE_META[u.role].bg, color:ROLE_META[u.role].color, fontFamily:QS }}>{ROLE_META[u.role].label}</span>
                      {u.bh && <p style={{ margin:"4px 0 0", fontSize:9, color:"#9CA3AF", fontFamily:IN }}>{u.bh}</p>}
                    </>
                  ) : <p style={{ margin:0, fontSize:11, color:"#9CA3AF", fontFamily:IN }}>Unknown</p>}
                </div>
              ))}
            </div>
            {/* Location details */}
            {(report.boardingHouse||report.roomNumber||report.location)&&(
              <div style={{ background:"white", borderRadius:14, padding:"11px 14px", marginBottom:12, boxShadow:"0 2px 8px rgba(0,0,0,.05)" }}>
                <p style={{ margin:"0 0 8px", fontSize:9, fontWeight:800, color:"#9CA3AF", fontFamily:QS, textTransform:"uppercase" as const, letterSpacing:0.5 }}>Location</p>
                <div style={{ display:"flex", flexWrap:"wrap" as const, gap:8 }}>
                  {[[Building2,report.boardingHouse],[MapPin,report.roomNumber],[MapPin,report.location]].filter(([,v])=>v).map(([Icon,val]:any,i)=>(
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:5 }}>
                      <Icon size={11} color="#9772F6"/>
                      <span style={{ fontSize:11, fontWeight:700, color:"#374151", fontFamily:IN }}>{val}</span>
                    </div>
                  ))}
                  {report.assignedReviewer&&<div style={{ display:"flex", alignItems:"center", gap:5 }}><Shield size={11} color="#9772F6"/><span style={{ fontSize:11, fontWeight:700, color:"#374151", fontFamily:IN }}>Reviewer: {report.assignedReviewer}</span></div>}
                </div>
              </div>
            )}
            {/* Full description */}
            <div style={{ background:"white", borderRadius:14, padding:"11px 14px", marginBottom:12, boxShadow:"0 2px 8px rgba(0,0,0,.05)" }}>
              <p style={{ margin:"0 0 8px", fontSize:9, fontWeight:800, color:"#9CA3AF", fontFamily:QS, textTransform:"uppercase" as const, letterSpacing:0.5 }}>Full Description</p>
              <p style={{ margin:0, fontSize:12, color:"#374151", fontFamily:IN, lineHeight:1.7 }}>{report.fullDesc}</p>
            </div>
            {/* Evidence */}
            {report.imageColors&&report.imageColors.length>0&&(
              <div style={{ background:"white", borderRadius:14, padding:"11px 14px", marginBottom:12, boxShadow:"0 2px 8px rgba(0,0,0,.05)" }}>
                <p style={{ margin:"0 0 8px", fontSize:9, fontWeight:800, color:"#9CA3AF", fontFamily:QS, textTransform:"uppercase" as const, letterSpacing:0.5 }}>Evidence ({report.imageColors.length})</p>
                <div style={{ display:"flex", gap:8 }}>
                  {report.imageColors.map((c,i)=>(
                    <button key={i} onClick={()=>setPreviewImg(i)} style={{ width:76, height:68, borderRadius:13, background:c, border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, position:"relative" as const }}>
                      <ImageIcon size={18} color="rgba(255,255,255,.8)"/>
                      <div style={{ position:"absolute" as const, bottom:4, right:4, width:14, height:14, borderRadius:4, background:"rgba(255,255,255,.25)", display:"flex", alignItems:"center", justifyContent:"center" }}><ExternalLink size={8} color="white"/></div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* Resolution notes */}
            {report.resolutionNotes&&(
              <div style={{ background:"#F0FDF4", borderRadius:14, padding:"11px 14px", marginBottom:12, border:"1px solid #BBF7D0" }}>
                <p style={{ margin:"0 0 6px", fontSize:9, fontWeight:800, color:"#16A34A", fontFamily:QS, textTransform:"uppercase" as const, letterSpacing:0.5 }}>Resolution Notes</p>
                <p style={{ margin:0, fontSize:12, color:"#15803D", fontFamily:IN, lineHeight:1.6 }}>{report.resolutionNotes}</p>
              </div>
            )}
            {/* Note input */}
            {showNote&&(
              <div style={{ background:"white", borderRadius:14, padding:"11px 14px", marginBottom:12, boxShadow:"0 2px 8px rgba(0,0,0,.05)" }}>
                <p style={{ margin:"0 0 7px", fontSize:11, fontWeight:800, color:"#374151", fontFamily:QS }}>Admin / Resolution Note</p>
                <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Add a resolution note or admin comment…" rows={3} style={{ width:"100%", boxSizing:"border-box" as const, padding:"9px 12px", borderRadius:11, border:"1.5px solid #E5E7EB", background:"#F9FAFB", color:"#1F2937", fontSize:12, fontFamily:IN, outline:"none", resize:"none" as const }}/>
                <button onClick={()=>setShowNote(false)} style={{ marginTop:6, fontSize:11, color:"#9CA3AF", background:"none", border:"none", cursor:"pointer" }}>Dismiss</button>
              </div>
            )}
            {/* Actions */}
            {report.status!=="archived"&&(
              <>
                <p style={{ margin:"0 0 9px", fontSize:11, fontWeight:800, color:"#374151", fontFamily:QS }}>Admin Actions</p>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:9 }}>
                  {ACTIONS.map(({ label, status, color, bg, border, Icon, msg })=>(
                    <button key={status} onClick={()=>setConfirm({ label, status, msg })} style={{ height:44, borderRadius:15, border:`1.5px solid ${border}`, background:bg, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6, fontSize:11, fontWeight:800, color, fontFamily:QS }}>
                      <Icon size={13} color={color}/>{label}
                    </button>
                  ))}
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
                  <button onClick={()=>setShowNote(true)} style={{ height:40, borderRadius:14, border:"1.5px dashed #D1D5DB", background:"#F9FAFB", cursor:"pointer", fontSize:10, fontWeight:700, color:"#6B7280", fontFamily:QS }}>+ Note</button>
                  <button style={{ height:40, borderRadius:14, border:"1.5px solid #FEE2E2", background:"#FEF2F2", cursor:"pointer", fontSize:10, fontWeight:800, color:"#EF4444", fontFamily:QS, display:"flex", alignItems:"center", justifyContent:"center", gap:4 }}><AlertTriangle size={12} color="#EF4444"/>Warn</button>
                  <button style={{ height:40, borderRadius:14, border:"none", backgroundImage:GRAD, cursor:"pointer", fontSize:10, fontWeight:800, color:"white", fontFamily:QS, display:"flex", alignItems:"center", justifyContent:"center", gap:4 }}><MessageCircle size={12} color="white"/>Chat</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function ReportsCenterModal({ reports, users, onClose, onUpdateStatus }: {
  reports:UserReport[]; users:AppUser[];
  onClose:()=>void;
  onUpdateStatus:(id:string,s:ReportStatus,note?:string)=>void;
}) {
  const [detailReport,  setDetailReport]  = useState<UserReport|null>(null);
  const [searchStudent, setSearchStudent] = useState("");
  const [searchReporter,setSearchReporter]= useState("");
  const [filters,       setFilters]       = useState<RCFilters>({ status:"all", priority:"all", category:"all", role:"all" });
  const [sortOrder,     setSortOrder]     = useState<"newest"|"oldest">("newest");
  const [showFilters,   setShowFilters]   = useState(false);

  const totalReports    = reports.length;
  const pendingCount    = reports.filter(r=>r.status==="pending").length;
  const reviewCount     = reports.filter(r=>r.status==="under-review").length;
  const resolvedCount   = reports.filter(r=>r.status==="resolved").length;
  const criticalCount   = reports.filter(r=>r.priority==="critical").length;

  const visible = useMemo(()=>{
    let list = [...reports];
    const sq = searchStudent.toLowerCase(); const rq = searchReporter.toLowerCase();
    if (sq) list = list.filter(r=>{ const u=users.find(u=>u.id===r.targetUserId); return u?.name.toLowerCase().includes(sq); });
    if (rq) list = list.filter(r=>r.reporterName.toLowerCase().includes(rq));
    if (filters.status   !=="all") list = list.filter(r=>r.status===filters.status);
    if (filters.priority !=="all") list = list.filter(r=>r.priority===filters.priority);
    if (filters.category !=="all") list = list.filter(r=>r.category===filters.category);
    if (filters.role     !=="all") list = list.filter(r=>{ const u=users.find(u=>u.id===r.targetUserId); return u?.role===filters.role; });
    list.sort((a,b)=>sortOrder==="newest"?(a.id<b.id?1:-1):(a.id>b.id?1:-1));
    return list;
  },[reports,users,searchStudent,searchReporter,filters,sortOrder]);

  const activeFilters = [filters.status!=="all",filters.priority!=="all",filters.category!=="all",filters.role!=="all"].filter(Boolean).length;

  if (detailReport) return <ReportDetailPanel report={detailReport} users={users} onClose={()=>setDetailReport(null)} onUpdateStatus={onUpdateStatus}/>;

  const STATUS_CHIPS: (ReportStatus|"all")[] = ["all","pending","under-review","resolved","rejected"];

  return (
    <div style={{ position:"fixed" as const, inset:0, background:"rgba(0,0,0,.6)", zIndex:400, display:"flex", flexDirection:"column" as const, justifyContent:"flex-end" }} onClick={onClose}>
      <div style={{ background:"#F2F4F8", borderRadius:"28px 28px 0 0", maxHeight:"95%", display:"flex", flexDirection:"column" as const, boxShadow:"0 -8px 48px rgba(0,0,0,.25)" }} onClick={e=>e.stopPropagation()}>

        {/* Handle */}
        <div style={{ flexShrink:0, display:"flex", justifyContent:"center", padding:"10px 0 2px" }}>
          <div style={{ width:40, height:4, borderRadius:2, background:"#E5E7EB" }}/>
        </div>

        {/* Header */}
        <div style={{ flexShrink:0, background:"white", borderRadius:"28px 28px 0 0", padding:"12px 18px 0", borderBottom:"1px solid #F3F4F6" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
            <div>
              <p style={{ margin:"0 0 2px", fontSize:18, fontWeight:800, color:"#1F2937", fontFamily:QS }}>User Reports Center</p>
              <p style={{ margin:0, fontSize:11, color:"#9CA3AF", fontFamily:IN }}>{totalReports} total reports across all users</p>
            </div>
            <button onClick={onClose} style={{ width:34, height:34, borderRadius:11, background:"#F3F4F6", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <X size={15} color="#6B7280"/>
            </button>
          </div>

          {/* Summary stats */}
          <div style={{ display:"flex", gap:8, overflowX:"auto" as const, scrollbarWidth:"none" as const, marginBottom:14, paddingBottom:2 }}>
            {[
              { label:"Total",       val:totalReports,  color:"#9772F6", bg:"#F5F0FF" },
              { label:"Pending",     val:pendingCount,  color:"#D97706", bg:"#FEF3C7" },
              { label:"In Review",   val:reviewCount,   color:"#3B82F6", bg:"#EFF6FF" },
              { label:"Resolved",    val:resolvedCount, color:"#16A34A", bg:"#DCFCE7" },
              { label:"Critical",    val:criticalCount, color:"#7F1D1D", bg:"#FEE2E2" },
            ].map(({ label, val, color, bg })=>(
              <div key={label} style={{ flexShrink:0, background:bg, borderRadius:16, padding:"10px 14px", textAlign:"center" as const, minWidth:62 }}>
                <p style={{ margin:0, fontSize:20, fontWeight:800, color, fontFamily:QS }}>{val}</p>
                <p style={{ margin:"2px 0 0", fontSize:8, color, fontFamily:IN, fontWeight:700, opacity:0.8 }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Search bars */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:10 }}>
            <div style={{ background:"#F3F4F6", borderRadius:12, padding:"8px 11px", display:"flex", alignItems:"center", gap:7 }}>
              <Search size={12} color="#9CA3AF"/>
              <input value={searchStudent} onChange={e=>setSearchStudent(e.target.value)} placeholder="Student name…" style={{ flex:1, background:"none", border:"none", outline:"none", fontSize:11, fontFamily:IN, color:"#1F2937" }}/>
              {searchStudent&&<button onClick={()=>setSearchStudent("")} style={{ background:"none",border:"none",cursor:"pointer" }}><X size={10} color="#9CA3AF"/></button>}
            </div>
            <div style={{ background:"#F3F4F6", borderRadius:12, padding:"8px 11px", display:"flex", alignItems:"center", gap:7 }}>
              <Search size={12} color="#9CA3AF"/>
              <input value={searchReporter} onChange={e=>setSearchReporter(e.target.value)} placeholder="Reporter name…" style={{ flex:1, background:"none", border:"none", outline:"none", fontSize:11, fontFamily:IN, color:"#1F2937" }}/>
              {searchReporter&&<button onClick={()=>setSearchReporter("")} style={{ background:"none",border:"none",cursor:"pointer" }}><X size={10} color="#9CA3AF"/></button>}
            </div>
          </div>

          {/* Status chips + filter + sort */}
          <div style={{ display:"flex", gap:6, marginBottom:10, alignItems:"center" }}>
            <div style={{ flex:1, display:"flex", gap:5, overflowX:"auto" as const, scrollbarWidth:"none" as const }}>
              {STATUS_CHIPS.map(s=>(
                <button key={s} onClick={()=>setFilters(f=>({...f,status:s}))} style={{ flexShrink:0, padding:"5px 11px", borderRadius:20, border:"none", cursor:"pointer", background:filters.status===s?"#1F2937":"#F3F4F6", color:filters.status===s?"white":"#6B7280", fontSize:10, fontWeight:800, fontFamily:QS }}>
                  {s==="all"?"All":REPORT_STATUS_META[s].label}
                </button>
              ))}
            </div>
            <button onClick={()=>setShowFilters(v=>!v)} style={{ flexShrink:0, width:32, height:32, borderRadius:11, border:"none", cursor:"pointer", background:activeFilters>0?"#F5F0FF":"#F3F4F6", display:"flex", alignItems:"center", justifyContent:"center", position:"relative" as const }}>
              <Filter size={13} color={activeFilters>0?"#9772F6":"#6B7280"}/>
              {activeFilters>0&&<div style={{ position:"absolute" as const, top:-2, right:-2, width:12, height:12, borderRadius:"50%", background:"#9772F6", display:"flex", alignItems:"center", justifyContent:"center" }}><span style={{ fontSize:7, color:"white", fontWeight:800 }}>{activeFilters}</span></div>}
            </button>
            <button onClick={()=>setSortOrder(s=>s==="newest"?"oldest":"newest")} style={{ flexShrink:0, width:32, height:32, borderRadius:11, border:"none", cursor:"pointer", background:"#F3F4F6", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <ArrowUpDown size={13} color="#6B7280"/>
            </button>
          </div>

          {/* Filter panel */}
          {showFilters&&(
            <div style={{ background:"#F9FAFB", borderRadius:14, padding:"12px 14px", marginBottom:10, border:"1px solid #E5E7EB" }}>
              {[
                { label:"Priority", key:"priority" as keyof RCFilters, opts:["all","low","medium","high","critical"] as const, labelFn:(v:string)=>v==="all"?"All":PRIORITY_META[v as ReportPriority].label },
                { label:"Category", key:"category" as keyof RCFilters, opts:["all","maintenance","safety","harassment","payment","noise","rule-violation","cleanliness","other"] as const, labelFn:(v:string)=>v==="all"?"All":CATEGORY_LABEL[v as ReportCategory] },
                { label:"User Role",key:"role"     as keyof RCFilters, opts:["all","student","parent","landlord"] as const, labelFn:(v:string)=>v==="all"?"All":ROLE_META[v as UserRole].label },
              ].map(({ label, key, opts, labelFn })=>(
                <div key={key} style={{ marginBottom:8 }}>
                  <p style={{ margin:"0 0 5px", fontSize:10, fontWeight:800, color:"#374151", fontFamily:QS }}>{label}</p>
                  <div style={{ display:"flex", gap:5, flexWrap:"wrap" as const }}>
                    {opts.map(o=>(
                      <button key={o} onClick={()=>setFilters(f=>({...f,[key]:o}))} style={{ padding:"4px 10px", borderRadius:20, border:"none", cursor:"pointer", background:(filters as any)[key]===o?"#9772F6":"#E5E7EB", color:(filters as any)[key]===o?"white":"#374151", fontSize:10, fontWeight:800, fontFamily:QS }}>
                        {labelFn(o)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Report cards */}
        <div style={{ flex:1, overflowY:"auto" as const, scrollbarWidth:"none" as const, padding:"12px 16px 40px" }}>
          {visible.length===0 ? (
            <div style={{ textAlign:"center" as const, padding:"50px 20px" }}>
              <div style={{ width:68, height:68, borderRadius:22, background:"#F3F4F6", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
                <Inbox size={28} color="#D1D5DB"/>
              </div>
              <p style={{ margin:"0 0 8px", fontSize:15, fontWeight:800, color:"#374151", fontFamily:QS }}>No reports found</p>
              <p style={{ margin:0, fontSize:12, color:"#9CA3AF", fontFamily:IN, lineHeight:1.6 }}>No reports match your current search or filters.</p>
            </div>
          ) : visible.map(r=>{
            const rsm = REPORT_STATUS_META[r.status];
            const pm  = PRIORITY_META[r.priority];
            const target   = users.find(u=>u.id===r.targetUserId);
            const tcol     = target ? avatarCol(target.id) : "#9CA3AF";
            const trm      = target ? ROLE_META[target.role] : null;
            return (
              <div key={r.id} style={{ background:"white", borderRadius:20, marginBottom:11, boxShadow:"0 2px 12px rgba(0,0,0,.06)", overflow:"hidden", borderLeft:`3px solid ${pm.color}` }}>
                {/* Card top */}
                <div style={{ padding:"13px 15px 11px" }}>
                  {/* Reported user */}
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                    <div style={{ position:"relative" as const, flexShrink:0 }}>
                      <div style={{ width:40, height:40, borderRadius:13, background:tcol+"18", border:`1.5px solid ${tcol}30`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <span style={{ fontSize:13, fontWeight:800, color:tcol, fontFamily:QS }}>{target?initials(target.name):"?"}</span>
                      </div>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ margin:"0 0 3px", fontSize:13, fontWeight:800, color:"#1F2937", fontFamily:QS, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" as const }}>{target?.name??"Unknown User"}</p>
                      <div style={{ display:"flex", gap:5, flexWrap:"wrap" as const }}>
                        {trm&&<span style={{ fontSize:8, fontWeight:800, padding:"2px 7px", borderRadius:20, background:trm.bg, color:trm.color, fontFamily:QS }}>{trm.label}</span>}
                        {target?.bh&&<span style={{ fontSize:8, fontWeight:700, padding:"2px 7px", borderRadius:20, background:"#F3F4F6", color:"#6B7280", fontFamily:IN }}>{target.bh}</span>}
                      </div>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column" as const, alignItems:"flex-end", gap:4, flexShrink:0 }}>
                      <span style={{ display:"flex", alignItems:"center", gap:3, fontSize:9, fontWeight:800, padding:"3px 8px", borderRadius:20, background:rsm.bg, color:rsm.color, fontFamily:QS }}>
                        <div style={{ width:5, height:5, borderRadius:"50%", background:rsm.dot }}/>{rsm.label}
                      </span>
                      <span style={{ fontSize:8, fontWeight:800, padding:"2px 7px", borderRadius:20, background:pm.bg, color:pm.color, fontFamily:QS }}>{pm.label}</span>
                    </div>
                  </div>

                  {/* Category + title + desc */}
                  <div style={{ display:"flex", gap:5, marginBottom:5 }}>
                    <span style={{ fontSize:8, fontWeight:800, padding:"2px 8px", borderRadius:20, background:"#F5F0FF", color:"#9772F6", fontFamily:QS }}>{CATEGORY_LABEL[r.category]}</span>
                    <span style={{ fontSize:8, fontWeight:700, padding:"2px 8px", borderRadius:20, background:"#F9FAFB", color:"#6B7280", fontFamily:IN }}>{r.reportType}</span>
                  </div>
                  <p style={{ margin:"0 0 4px", fontSize:12, fontWeight:800, color:"#1F2937", fontFamily:QS, lineHeight:1.35 }}>{r.title}</p>
                  <p style={{ margin:"0 0 10px", fontSize:11, color:"#6B7280", fontFamily:IN, lineHeight:1.55, display:"-webkit-box" as any, WebkitLineClamp:2, WebkitBoxOrient:"vertical" as const, overflow:"hidden" }}>{r.shortDesc}</p>

                  {/* Reporter + date */}
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <div style={{ width:20, height:20, borderRadius:7, background:"#F5F0FF", display:"flex", alignItems:"center", justifyContent:"center" }}><User size={10} color="#9772F6"/></div>
                      <div><p style={{ margin:0, fontSize:10, fontWeight:700, color:"#374151", fontFamily:QS }}>{r.reporterName}</p><p style={{ margin:0, fontSize:9, color:"#9CA3AF", fontFamily:IN }}>{r.reporterRole}</p></div>
                    </div>
                    <span style={{ fontSize:9, color:"#9CA3AF", fontFamily:IN }}>{r.dateSubmitted} · {r.timeSubmitted}</span>
                  </div>
                </div>

                {/* Action bar */}
                <div style={{ display:"flex", borderTop:"1px solid #F9FAFB" }}>
                  <button onClick={()=>setDetailReport(r)} style={{ flex:1, height:38, border:"none", background:"none", cursor:"pointer", fontSize:10, fontWeight:800, color:"#9772F6", fontFamily:QS, display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                    <Eye size={12} color="#9772F6"/>View Details
                  </button>
                  {r.status==="pending"&&(
                    <button onClick={()=>onUpdateStatus(r.id,"under-review")} style={{ flex:1, height:38, border:"none", borderLeft:"1px solid #F9FAFB", background:"none", cursor:"pointer", fontSize:10, fontWeight:800, color:"#D97706", fontFamily:QS, display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                      <Clock size={12} color="#D97706"/>Review
                    </button>
                  )}
                  {(r.status==="pending"||r.status==="under-review")&&(
                    <button onClick={()=>onUpdateStatus(r.id,"resolved")} style={{ flex:1, height:38, border:"none", borderLeft:"1px solid #F9FAFB", background:"none", cursor:"pointer", fontSize:10, fontWeight:800, color:"#16A34A", fontFamily:QS, display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                      <CheckCircle size={12} color="#16A34A"/>Resolve
                    </button>
                  )}
                  {r.status!=="archived"&&r.status!=="rejected"&&(
                    <button onClick={()=>onUpdateStatus(r.id,"archived")} style={{ flex:1, height:38, border:"none", borderLeft:"1px solid #F9FAFB", background:"none", cursor:"pointer", fontSize:10, fontWeight:800, color:"#9CA3AF", fontFamily:QS, display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                      <Archive size={12} color="#9CA3AF"/>Archive
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Per-user reports modal (flag on user row) ─────────────────────────────────

function UserReportsModal({ user, reports, onClose, onUpdateStatus }: {
  user:AppUser; reports:UserReport[]; onClose:()=>void;
  onUpdateStatus:(id:string,s:ReportStatus,note?:string)=>void;
}) {
  const [detailReport, setDetailReport] = useState<UserReport|null>(null);
  const [statusFilter, setStatusFilter] = useState<ReportStatus|"all">("all");

  const userReports = reports.filter(r=>r.targetUserId===user.id||r.submitterUserId===user.id);
  const col = avatarCol(user.id);
  const rm  = ROLE_META[user.role];
  const openCount = userReports.filter(r=>r.status==="pending"||r.status==="under-review").length;

  const visible = statusFilter==="all" ? userReports : userReports.filter(r=>r.status===statusFilter);

  if (detailReport) return <ReportDetailPanel report={detailReport} users={ALL_USERS} onClose={()=>setDetailReport(null)} onUpdateStatus={onUpdateStatus}/>;

  return (
    <div style={{ position:"fixed" as const, inset:0, background:"rgba(0,0,0,.55)", zIndex:300, display:"flex", flexDirection:"column" as const, justifyContent:"flex-end" }} onClick={onClose}>
      <div style={{ background:"#F2F4F8", borderRadius:"28px 28px 0 0", maxHeight:"90%", display:"flex", flexDirection:"column" as const }} onClick={e=>e.stopPropagation()}>
        <div style={{ flexShrink:0, display:"flex", justifyContent:"center", padding:"10px 0 2px" }}><div style={{ width:40, height:4, borderRadius:2, background:"#E5E7EB" }}/></div>
        <div style={{ flexShrink:0, background:"white", borderRadius:"28px 28px 0 0", padding:"12px 18px 0", borderBottom:"1px solid #F3F4F6" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
            <div style={{ width:44, height:44, borderRadius:15, background:col+"18", border:`1.5px solid ${col}30`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <span style={{ fontSize:15, fontWeight:800, color:col, fontFamily:QS }}>{initials(user.name)}</span>
            </div>
            <div style={{ flex:1 }}>
              <p style={{ margin:"0 0 3px", fontSize:15, fontWeight:800, color:"#1F2937", fontFamily:QS }}>{user.name}</p>
              <div style={{ display:"flex", gap:5 }}>
                <span style={{ fontSize:9, fontWeight:800, padding:"2px 8px", borderRadius:20, background:rm.bg, color:rm.color, fontFamily:QS }}>{rm.label}</span>
                {openCount>0&&<span style={{ fontSize:9, fontWeight:800, padding:"2px 8px", borderRadius:20, background:"#FEE2E2", color:"#EF4444", fontFamily:QS }}>{openCount} open</span>}
              </div>
            </div>
            <button onClick={onClose} style={{ width:32, height:32, borderRadius:10, background:"#F3F4F6", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><X size={13} color="#6B7280"/></button>
          </div>
          <div style={{ display:"flex", gap:6, paddingBottom:12 }}>
            {(["all","pending","under-review","resolved","rejected"] as const).map(s=>(
              <button key={s} onClick={()=>setStatusFilter(s)} style={{ flexShrink:0, padding:"5px 11px", borderRadius:20, border:"none", cursor:"pointer", background:statusFilter===s?"#1F2937":"#F3F4F6", color:statusFilter===s?"white":"#6B7280", fontSize:10, fontWeight:800, fontFamily:QS }}>
                {s==="all"?"All":REPORT_STATUS_META[s].label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ flex:1, overflowY:"auto" as const, scrollbarWidth:"none" as const, padding:"12px 16px 36px" }}>
          {visible.length===0 ? (
            <div style={{ textAlign:"center" as const, padding:"44px 20px" }}>
              <Inbox size={28} color="#D1D5DB" style={{ display:"block", margin:"0 auto 12px" }}/>
              <p style={{ margin:0, fontSize:13, fontWeight:700, color:"#9CA3AF", fontFamily:QS }}>No reports found for this user.</p>
            </div>
          ) : visible.map(r=>{
            const rsm=REPORT_STATUS_META[r.status]; const pm=PRIORITY_META[r.priority];
            const isAgainst=r.targetUserId===user.id;
            return (
              <div key={r.id} style={{ background:"white", borderRadius:18, marginBottom:10, boxShadow:"0 2px 10px rgba(0,0,0,.05)", borderLeft:`3px solid ${pm.color}` }}>
                <div style={{ padding:"13px 15px 11px" }}>
                  <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:6 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", gap:5, marginBottom:4 }}>
                        <span style={{ fontSize:8, fontWeight:800, padding:"2px 7px", borderRadius:20, background:isAgainst?"#FEE2E2":"#EFF6FF", color:isAgainst?"#EF4444":"#3B82F6", fontFamily:QS }}>{isAgainst?"Against User":"By User"}</span>
                        <span style={{ fontSize:8, fontWeight:700, padding:"2px 7px", borderRadius:20, background:"#F5F0FF", color:"#9772F6", fontFamily:QS }}>{CATEGORY_LABEL[r.category]}</span>
                      </div>
                      <p style={{ margin:0, fontSize:12, fontWeight:800, color:"#1F2937", fontFamily:QS, lineHeight:1.35 }}>{r.title}</p>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column" as const, alignItems:"flex-end", gap:3, marginLeft:8, flexShrink:0 }}>
                      <span style={{ fontSize:8, fontWeight:800, padding:"2px 7px", borderRadius:20, background:rsm.bg, color:rsm.color, fontFamily:QS }}>{rsm.label}</span>
                      <span style={{ fontSize:8, fontWeight:800, padding:"2px 7px", borderRadius:20, background:pm.bg, color:pm.color, fontFamily:QS }}>{pm.label}</span>
                    </div>
                  </div>
                  <p style={{ margin:"0 0 8px", fontSize:11, color:"#6B7280", fontFamily:IN, lineHeight:1.55, display:"-webkit-box" as any, WebkitLineClamp:2, WebkitBoxOrient:"vertical" as const, overflow:"hidden" }}>{r.shortDesc}</p>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <span style={{ fontSize:9, color:"#9CA3AF", fontFamily:IN }}>{r.reporterName} · {r.dateSubmitted}</span>
                    <button onClick={()=>setDetailReport(r)} style={{ height:28, padding:"0 12px", borderRadius:20, backgroundImage:GRAD, border:"none", cursor:"pointer", fontSize:10, fontWeight:800, color:"white", fontFamily:QS, display:"flex", alignItems:"center", gap:4 }}>
                      <Eye size={10} color="white"/>Details
                    </button>
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

// ── User Detail Modal ─────────────────────────────────────────────────────────

function UserDetailModal({ user, reportCount, onClose, onAction, onOpenReports }: {
  user:AppUser; reportCount:number; onClose:()=>void;
  onAction:(id:string,act:string)=>void; onOpenReports:()=>void;
}) {
  const [confirm, setConfirm] = useState<string|null>(null);
  const rm=ROLE_META[user.role]; const sm=STATUS_META[user.status]; const col=avatarCol(user.id);
  return (
    <div style={{ position:"fixed" as const, inset:0, background:"rgba(0,0,0,.55)", zIndex:200, display:"flex", flexDirection:"column" as const, justifyContent:"flex-end" }} onClick={onClose}>
      {confirm&&<ConfirmDialog title={confirm==="delete"?"Delete Account":confirm==="suspend"?"Suspend Account":"Reactivate Account"} msg={confirm==="delete"?`Permanently delete ${user.name}'s account?`:confirm==="suspend"?`Suspend ${user.name}'s account?`:`Reactivate ${user.name}'s account?`} danger={confirm==="delete"||confirm==="suspend"} onConfirm={()=>{onAction(user.id,confirm!);setConfirm(null);onClose();}} onCancel={()=>setConfirm(null)}/>}
      <div style={{ background:"#F2F4F8", borderRadius:"28px 28px 0 0", maxHeight:"88%", overflow:"auto", boxShadow:"0 -8px 40px rgba(0,0,0,.2)" }} onClick={e=>e.stopPropagation()}>
        <div style={{ backgroundImage:GRAD, borderRadius:"28px 28px 0 0", padding:"22px 20px 18px", position:"relative" as const }}>
          <button onClick={onClose} style={{ position:"absolute" as const, top:16, right:16, width:32, height:32, borderRadius:10, background:"rgba(255,255,255,.2)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><X size={15} color="white"/></button>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ width:56, height:56, borderRadius:18, background:"rgba(255,255,255,.25)", border:"2px solid rgba(255,255,255,.4)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <span style={{ fontSize:18, fontWeight:800, color:"white", fontFamily:QS }}>{initials(user.name)}</span>
            </div>
            <div>
              <p style={{ margin:"0 0 5px", fontSize:16, fontWeight:800, color:"white", fontFamily:QS }}>{user.name}</p>
              <div style={{ display:"flex", gap:6 }}>
                <span style={{ fontSize:9, fontWeight:800, padding:"2px 9px", borderRadius:20, background:rm.bg, color:rm.color, fontFamily:QS }}>{rm.label}</span>
                <span style={{ fontSize:9, fontWeight:800, padding:"2px 9px", borderRadius:20, background:sm.bg, color:sm.color, fontFamily:QS }}>{sm.label}</span>
              </div>
            </div>
          </div>
        </div>
        <div style={{ padding:"14px 18px 30px" }}>
          {([["Email",user.email],["Contact",user.contact],["Last Login",user.lastLogin],user.linked?["Linked",user.linked]:null,user.bh?["Boarding House",user.bh]:null] as any[]).filter(Boolean).map(([l,v]:string[])=>(
            <div key={l} style={{ padding:"8px 0", borderBottom:"1px solid #F3F4F6" }}>
              <p style={{ margin:0, fontSize:9, color:"#9CA3AF", fontWeight:700, fontFamily:QS, textTransform:"uppercase" as const, letterSpacing:0.5 }}>{l}</p>
              <p style={{ margin:"2px 0 0", fontSize:12, fontWeight:700, color:"#1F2937", fontFamily:IN }}>{v}</p>
            </div>
          ))}
          <button onClick={onOpenReports} style={{ width:"100%", marginTop:14, marginBottom:6, background:"white", borderRadius:18, padding:"13px 16px", display:"flex", alignItems:"center", gap:12, border:reportCount>0?"1.5px solid #FCA5A5":"1.5px solid #E5E7EB", cursor:"pointer", boxShadow:"0 2px 10px rgba(0,0,0,.06)" }}>
            <div style={{ width:36, height:36, borderRadius:12, background:reportCount>0?"#FEE2E2":"#F5F0FF", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Flag size={16} color={reportCount>0?"#EF4444":"#9772F6"}/>
            </div>
            <div style={{ flex:1, textAlign:"left" as const }}>
              <p style={{ margin:0, fontSize:13, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Reports & Concerns</p>
              <p style={{ margin:"2px 0 0", fontSize:11, color:"#9CA3AF", fontFamily:IN }}>{reportCount===0?"No reports for this user":`${reportCount} report${reportCount>1?"s":""} found`}</p>
            </div>
            {reportCount>0&&<span style={{ fontSize:11, fontWeight:800, padding:"4px 10px", borderRadius:20, background:"#FEE2E2", color:"#EF4444", fontFamily:QS }}>{reportCount}</span>}
            <ChevronRight size={14} color="#9CA3AF"/>
          </button>
          <p style={{ margin:"12px 0 8px", fontSize:11, fontWeight:800, color:"#374151", fontFamily:QS }}>Admin Actions</p>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {[{label:"Edit Info",Icon:Edit3,color:"#9772F6",bg:"#F5F0FF"},{label:"Reset Password",Icon:Lock,color:"#3B82F6",bg:"#EFF6FF"},{label:"View Activity",Icon:Eye,color:"#6366F1",bg:"#EEF2FF"},{label:"Verify Docs",Icon:FileText,color:"#0891B2",bg:"#ECFEFF"}].map(({label,Icon,color,bg})=>(
              <button key={label} onClick={onClose} style={{ display:"flex", alignItems:"center", gap:8, background:"white", borderRadius:14, padding:"11px 14px", border:"none", cursor:"pointer", boxShadow:"0 2px 8px rgba(0,0,0,.06)" }}>
                <div style={{ width:28, height:28, borderRadius:9, background:bg, display:"flex", alignItems:"center", justifyContent:"center" }}><Icon size={13} color={color}/></div>
                <span style={{ fontSize:11, fontWeight:700, color:"#374151", fontFamily:QS }}>{label}</span>
              </button>
            ))}
          </div>
          <div style={{ marginTop:10, display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {user.status==="active"?<button onClick={()=>setConfirm("suspend")} style={{ height:42, borderRadius:14, border:"1.5px solid #EF4444", background:"#FEF2F2", cursor:"pointer", fontSize:11, fontWeight:800, color:"#EF4444", fontFamily:QS }}>Suspend</button>:<button onClick={()=>setConfirm("reactivate")} style={{ height:42, borderRadius:14, border:"1.5px solid #16A34A", background:"#F0FDF4", cursor:"pointer", fontSize:11, fontWeight:800, color:"#16A34A", fontFamily:QS }}>Reactivate</button>}
            <button onClick={()=>setConfirm("delete")} style={{ height:42, borderRadius:14, border:"none", background:"#EF4444", cursor:"pointer", fontSize:11, fontWeight:800, color:"white", fontFamily:QS, display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}><Trash2 size={13} color="white"/>Delete</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

type UFilter = "all"|UserRole;

export function AdminUsersScreen({ go }: { go:(s:string)=>void }) {
  const [filter,       setFilter]       = useState<UFilter>("all");
  const [query,        setQuery]        = useState("");
  const [users,        setUsers]        = useState<AppUser[]>(ALL_USERS);
  const [reports,      setReports]      = useState<UserReport[]>(SEED_REPORTS);
  const [selected,     setSelected]     = useState<AppUser|null>(null);
  const [reportsUser,  setReportsUser]  = useState<AppUser|null>(null);
  const [showCenter,   setShowCenter]   = useState(false);

  const pendingReportsBadge = reports.filter(r=>r.status==="pending"||r.status==="under-review").length;

  const FILTERS: { id:UFilter; label:string }[] = [
    {id:"all",label:"All"},{id:"student",label:"Students"},{id:"parent",label:"Parents"},{id:"landlord",label:"Landlords"},{id:"admin",label:"Admin"},
  ];

  const filtered = users.filter(u=>(filter==="all"||u.role===filter)&&(u.name.toLowerCase().includes(query.toLowerCase())||u.email.toLowerCase().includes(query.toLowerCase())));
  const pending  = filtered.filter(u=>u.status==="pending");
  const rest     = filtered.filter(u=>u.status!=="pending");

  const handleAction = (id:string, act:string) => {
    if (act==="delete")      setUsers(us=>us.filter(u=>u.id!==id));
    else if (act==="suspend")    setUsers(us=>us.map(u=>u.id===id?{...u,status:"suspended" as const}:u));
    else if (act==="reactivate") setUsers(us=>us.map(u=>u.id===id?{...u,status:"active"    as const}:u));
    else if (act==="approve")    setUsers(us=>us.map(u=>u.id===id?{...u,status:"active"    as const}:u));
    else if (act==="reject")     setUsers(us=>us.filter(u=>u.id!==id));
  };

  const handleUpdateStatus = (id:string, status:ReportStatus, note?:string) =>
    setReports(rs=>rs.map(r=>r.id===id?{...r,status,...(note?{resolutionNotes:note}:{})}:r));

  const pendingCount  = (uid:string) => reports.filter(r=>(r.targetUserId===uid||r.submitterUserId===uid)&&(r.status==="pending"||r.status==="under-review")).length;
  const totalCount    = (uid:string) => reports.filter(r=>r.targetUserId===uid||r.submitterUserId===uid).length;
  const avatarBadge   = (uid:string) => pendingCount(uid);

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column" as const, background:"#F2F4F8", position:"relative" as const }}>

      {/* Reports Center Modal */}
      {showCenter&&<ReportsCenterModal reports={reports} users={users} onClose={()=>setShowCenter(false)} onUpdateStatus={handleUpdateStatus}/>}

      {/* Per-user reports */}
      {reportsUser&&<UserReportsModal user={reportsUser} reports={reports} onClose={()=>setReportsUser(null)} onUpdateStatus={handleUpdateStatus}/>}

      {/* User Detail */}
      {selected&&!reportsUser&&!showCenter&&(
        <UserDetailModal user={selected} reportCount={totalCount(selected.id)} onClose={()=>setSelected(null)} onAction={handleAction} onOpenReports={()=>{setReportsUser(selected);setSelected(null);}}/>
      )}

      {/* ── App Bar ────────────────────────────────────────────────────────── */}
      <div style={{ flexShrink:0, backgroundImage:GRAD_H, padding:"52px 20px 16px", position:"relative" as const, overflow:"hidden" }}>
        <div style={{ position:"absolute" as const, top:-40, right:-40, width:140, height:140, borderRadius:"50%", background:"rgba(255,255,255,.05)" }}/>

        {/* Top row: title + icons */}
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:14 }}>
          <div>
            <h1 style={{ margin:"0 0 2px", fontSize:20, fontWeight:800, color:"white", fontFamily:QS }}>User Management</h1>
            <p style={{ margin:0, fontSize:11, color:"rgba(255,255,255,.65)", fontFamily:IN }}>{users.length} total accounts</p>
          </div>

          {/* Reports icon — opens Reports Center */}
          <button onClick={()=>setShowCenter(true)} style={{ position:"relative" as const, width:38, height:38, borderRadius:12, background:"rgba(255,255,255,.15)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Flag size={16} color="white"/>
            {pendingReportsBadge>0&&(
              <span style={{ position:"absolute" as const, top:-4, right:-4, minWidth:17, height:17, borderRadius:999, background:"#EF4444", color:"white", fontSize:8, fontWeight:800, fontFamily:QS, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 3px", border:"2px solid white" }}>
                {pendingReportsBadge>9?"9+":pendingReportsBadge}
              </span>
            )}
          </button>
        </div>

        {/* Search */}
        <div style={{ background:"rgba(255,255,255,.18)", borderRadius:16, padding:"10px 14px", display:"flex", alignItems:"center", gap:10, backdropFilter:"blur(8px)", marginBottom:12 }}>
          <Search size={16} color="rgba(255,255,255,.7)"/>
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search by name or email…" style={{ background:"none", border:"none", outline:"none", flex:1, color:"white", fontSize:13, fontFamily:IN, caretColor:"white" }}/>
          {query&&<button onClick={()=>setQuery("")} style={{ background:"none", border:"none", cursor:"pointer" }}><X size={14} color="rgba(255,255,255,.7)"/></button>}
        </div>

        {/* Filter chips */}
        <div style={{ display:"flex", gap:6, overflowX:"auto" as const, scrollbarWidth:"none" as const, paddingBottom:2 }}>
          {FILTERS.map(f=>(
            <button key={f.id} onClick={()=>setFilter(f.id)} style={{ flexShrink:0, padding:"6px 14px", borderRadius:20, border:"none", cursor:"pointer", background:filter===f.id?"white":"rgba(255,255,255,.18)", color:filter===f.id?"#9772F6":"rgba(255,255,255,.8)", fontSize:11, fontWeight:800, fontFamily:QS }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div style={{ flex:1, overflowY:"auto" as const, scrollbarWidth:"none" as const, padding:"14px 16px 32px" }}>

        {/* Pending section */}
        {pending.length>0&&(
          <>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:"#EF4444" }}/>
              <p style={{ margin:0, fontSize:12, fontWeight:800, color:"#EF4444", fontFamily:QS }}>Pending Verification ({pending.length})</p>
            </div>
            <div style={{ background:"white", borderRadius:20, overflow:"hidden", boxShadow:"0 4px 16px rgba(239,68,68,.12)", marginBottom:16, border:"1.5px solid #FEE2E2" }}>
              {pending.map((u,i)=>{
                const col=avatarCol(u.id); const pc=avatarBadge(u.id);
                return (
                  <div key={u.id} style={{ padding:"13px 16px", borderBottom:i<pending.length-1?"1px solid #FEF2F2":"none" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                      <div style={{ width:42, height:42, borderRadius:14, background:col+"18", border:`1.5px solid ${col}30`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <span style={{ fontSize:14, fontWeight:800, color:col, fontFamily:QS }}>{initials(u.name)}</span>
                      </div>
                      <div style={{ flex:1 }}>
                        <p style={{ margin:"0 0 1px", fontSize:13, fontWeight:800, color:"#1F2937", fontFamily:QS }}>{u.name}</p>
                        <p style={{ margin:0, fontSize:11, color:"#9CA3AF", fontFamily:IN }}>{ROLE_META[u.role].label} · {u.email}</p>
                      </div>
                      <button onClick={e=>{e.stopPropagation();setReportsUser(u);}} style={{ position:"relative" as const, width:34, height:34, borderRadius:11, background:pc>0?"#FEE2E2":"#F9FAFB", border:`1.5px solid ${pc>0?"#FECACA":"#E5E7EB"}`, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <Flag size={14} color={pc>0?"#EF4444":"#9CA3AF"}/>
                        {pc>0&&<div style={{ position:"absolute" as const, top:-4, right:-4, width:14, height:14, borderRadius:"50%", background:"#EF4444", display:"flex", alignItems:"center", justifyContent:"center", border:"2px solid white" }}><span style={{ fontSize:7, color:"white", fontWeight:800 }}>{pc}</span></div>}
                      </button>
                    </div>
                    <div style={{ display:"flex", gap:8, marginTop:10 }}>
                      <button onClick={()=>handleAction(u.id,"approve")} style={{ flex:1, height:34, borderRadius:12, backgroundImage:GRAD, border:"none", cursor:"pointer", color:"white", fontSize:11, fontWeight:800, fontFamily:QS, display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                        <CheckCircle size={12} color="white"/>Approve
                      </button>
                      <button onClick={()=>handleAction(u.id,"reject")} style={{ flex:1, height:34, borderRadius:12, border:"1.5px solid #EF4444", background:"white", cursor:"pointer", color:"#EF4444", fontSize:11, fontWeight:800, fontFamily:QS, display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                        <XCircle size={12} color="#EF4444"/>Reject
                      </button>
                      <button onClick={()=>setSelected(u)} style={{ width:34, height:34, borderRadius:12, background:"#F9FAFB", border:"1.5px solid #E5E7EB", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <Eye size={13} color="#6B7280"/>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* All users */}
        {rest.length>0&&(
          <>
            <p style={{ margin:"0 0 10px", fontSize:12, fontWeight:800, color:"#374151", fontFamily:QS }}>All Users ({rest.length})</p>
            <div style={{ background:"white", borderRadius:20, overflow:"hidden", boxShadow:"0 4px 16px rgba(0,0,0,.07)" }}>
              {rest.map((u,i)=>{
                const col=avatarCol(u.id); const rm=ROLE_META[u.role]; const sm=STATUS_META[u.status];
                const pc=avatarBadge(u.id); const tc=totalCount(u.id);
                return (
                  <div key={u.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"13px 16px", borderBottom:i<rest.length-1?"1px solid #F3F4F6":"none" }}>
                    <div onClick={()=>setSelected(u)} style={{ position:"relative" as const, flexShrink:0, cursor:"pointer" }}>
                      <div style={{ width:44, height:44, borderRadius:15, background:col+"18", border:`1.5px solid ${col}30`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <span style={{ fontSize:15, fontWeight:800, color:col, fontFamily:QS }}>{initials(u.name)}</span>
                      </div>
                      {pc>0&&<div style={{ position:"absolute" as const, top:-3, right:-3, width:16, height:16, borderRadius:"50%", background:"#EF4444", display:"flex", alignItems:"center", justifyContent:"center", border:"2px solid white" }}><span style={{ fontSize:7, color:"white", fontWeight:800 }}>{pc}</span></div>}
                    </div>
                    <div onClick={()=>setSelected(u)} style={{ flex:1, minWidth:0, cursor:"pointer" }}>
                      <p style={{ margin:"0 0 3px", fontSize:13, fontWeight:800, color:"#1F2937", fontFamily:QS, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" as const }}>{u.name}</p>
                      <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                        <span style={{ fontSize:9, fontWeight:800, padding:"2px 7px", borderRadius:20, background:rm.bg, color:rm.color, fontFamily:QS }}>{rm.label}</span>
                        <span style={{ fontSize:9, fontWeight:800, padding:"2px 7px", borderRadius:20, background:sm.bg, color:sm.color, fontFamily:QS }}>{sm.label}</span>
                        <span style={{ fontSize:9, color:"#C4C9D4", fontFamily:IN }}>{u.lastLogin}</span>
                      </div>
                    </div>
                    <button onClick={e=>{e.stopPropagation();setReportsUser(u);}} style={{ position:"relative" as const, width:36, height:36, borderRadius:12, background:pc>0?"#FEE2E2":"#F9FAFB", border:`1.5px solid ${pc>0?"#FECACA":"#E5E7EB"}`, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <Flag size={15} color={pc>0?"#EF4444":"#9CA3AF"}/>
                      {tc>0&&pc===0&&<div style={{ position:"absolute" as const, top:-3, right:-3, width:13, height:13, borderRadius:"50%", background:"#9CA3AF", display:"flex", alignItems:"center", justifyContent:"center", border:"2px solid white" }}><span style={{ fontSize:6, color:"white", fontWeight:800 }}>{tc}</span></div>}
                    </button>
                    <ChevronRight size={14} color="#D1D5DB" onClick={()=>setSelected(u)} style={{ cursor:"pointer" }}/>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {filtered.length===0&&(
          <div style={{ textAlign:"center" as const, padding:"40px 20px" }}>
            <div style={{ width:56, height:56, borderRadius:20, background:"#F3F4F6", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px" }}>
              <Search size={24} color="#D1D5DB"/>
            </div>
            <p style={{ margin:0, fontSize:14, fontWeight:700, color:"#9CA3AF", fontFamily:QS }}>No users found</p>
          </div>
        )}
      </div>
    </div>
  );
}
