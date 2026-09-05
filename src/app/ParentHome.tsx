import React, { useState, useEffect, useRef } from "react";
import {
  Bell, Home, Building2, MapPin, Phone, MessageCircle,
  ChevronRight, User, GraduationCap, Bed, CheckCircle,
  AlertCircle, Calendar, CreditCard, Navigation, Megaphone,
  LogIn, LogOut, Star, X,
} from "lucide-react";
import { getMyAnnouncements, MyAnnouncement } from "./announcementStore";
import { getReportsForLinkedStudent, CATEGORY_META, STATUS_META, StudentReport } from "./reportStore";
import { useUnreadCount, fmtBadgeCount, timeAgo, NotificationType } from "./notificationStore";
import { useUnreadChatCount } from "./chatStore";
import { getMyParentProfile, getMyLinkedStudentData, MyParentProfile, MyStudentProfile, MyAssignment } from "./studentAssignmentStore";
import { getCheckInOutHistoryForStudent, CheckInOutRecord } from "./checkInOutStore";
import { getLinkedStudentBills, StudentBilling } from "./paymentStore";
import { getInactivityNotice, InactivityNotice } from "./inactivityStore";

const EMPTY_PARENT: MyParentProfile = { name: "—", firstName: "—", relationship: "—", contact: "—", email: "—", address: "—", photo: null };
const EMPTY_STUDENT: MyStudentProfile = { name: "—", firstName: "—", id: "—", program: "—", year: "—", block: "—", email: "—", contact: "—", address: "—", photo: null };
const EMPTY_ASSIGNMENT: MyAssignment = {
  bh:   { id: "", name: "—", address: "—", lat: 0, lng: 0, cover: null, landlord: "—", landlordPhoto: null, contact: "—", email: "—", status: "Active", regStatus: "Approved", checkinRadiusMeters: 50, amenities: [], rules: [], totalRooms: 0, rentAmount: null, gallery: [] },
  room: { id: "", name: "—", bed: "—", capacity: 0, occupied: 0, available: 0, floor: "—", type: "—" },
  stay: { moveIn: "—", moveOut: "—", daysStayed: 0, daysRemaining: 0, totalDays: 0, stayLength: "—" },
};

const GRAD   = "linear-gradient(135deg,#9772F6 0%,#7549F6 100%)";
const GRAD_H = "linear-gradient(160deg,#9772F6 0%,#7549F6 100%)";
const QS     = "'Quicksand',sans-serif";
const IN     = "'Inter',sans-serif";

type ActivityItem = { id:string; Icon:React.ElementType; color:string; bg:string; msg:string; ts:number };

// Real activity feed — merges check-in/out, payment, and announcement events for the linked
// student into one chronological timeline. Replaces what used to be a fixed 5-entry mock array
// shown identically to every parent regardless of what actually happened on their student's
// account (even one created seconds ago).
function buildRecentActivity(checkins: CheckInOutRecord[], periods: StudentBilling[], anns: MyAnnouncement[], limit = 6): ActivityItem[] {
  const items: ActivityItem[] = [];
  for (const c of checkins) {
    items.push(c.type === "checkin"
      ? { id:`ci-${c.id}`, Icon:LogIn,  color:"#16A34A", bg:"#DCFCE7", msg:"Student entered the boarding house.",  ts:new Date(c.occurredAt).getTime() }
      : { id:`co-${c.id}`, Icon:LogOut, color:"#6B7280", bg:"#F3F4F6", msg:"Student exited the boarding house.", ts:new Date(c.occurredAt).getTime() });
  }
  for (const p of periods) for (const tx of p.transactions) {
    const who = tx.submittedByRole === "parent" ? "You" : "Student";
    const msg = tx.status === "verified" ? `${who} paid ${p.periodLabel} — verified by landlord.`
      : tx.status === "rejected" ? `${who}'s payment for ${p.periodLabel} was rejected.`
      : `${who} submitted a payment for ${p.periodLabel}.`;
    items.push({ id:`tx-${tx.id}`, Icon:CreditCard, color:"#9772F6", bg:"#F5F0FF", msg, ts:new Date(tx.submittedAt).getTime() });
  }
  for (const a of anns) {
    items.push({ id:`ann-${a.id}`, Icon:Megaphone, color:"#D97706", bg:"#FEF3C7", msg:`Landlord posted: "${a.title}"`, ts:new Date(a.createdAt).getTime() });
  }
  return items.sort((x,y)=>y.ts-x.ts).slice(0,limit);
}

function getGreeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good Morning" : h < 18 ? "Good Afternoon" : "Good Evening";
}

export function ParentHomeScreen({ go, pendingDeepLink, onDeepLinkConsumed }: {
  go:(s:string)=>void; pendingDeepLink?: { type: NotificationType; relatedId?: string } | null; onDeepLinkConsumed?: () => void;
}) {
  const notifCount = useUnreadCount("parent");
  const chatCount = useUnreadChatCount("parent");

  const [parentProfile, setParentProfile] = useState<MyParentProfile>(EMPTY_PARENT);
  const [studentLinked, setStudentLinked] = useState(false);
  const [studentProfile, setStudentProfile] = useState<MyStudentProfile>(EMPTY_STUDENT);
  const [assignment, setAssignment] = useState<MyAssignment>(EMPTY_ASSIGNMENT);
  const [studentReports, setStudentReports] = useState<StudentReport[]>([]);
  const [announcements, setAnnouncements] = useState<MyAnnouncement[]>([]);
  const [checkins, setCheckins] = useState<CheckInOutRecord[]>([]);
  const [billingPeriods, setBillingPeriods] = useState<StudentBilling[]>([]);
  useEffect(() => { getMyAnnouncements("parents").then(setAnnouncements); }, []);
  useEffect(() => {
    let active = true;
    Promise.all([getMyParentProfile(), getMyLinkedStudentData()]).then(([parent, linked]) => {
      if (!active) return;
      if (parent) setParentProfile(parent);
      setStudentLinked(linked.linked);
      if (linked.profile) setStudentProfile(linked.profile);
      if (linked.assignment) setAssignment(linked.assignment);
      if (linked.studentId) {
        getReportsForLinkedStudent(linked.studentId).then(rs => { if (active) setStudentReports(rs); });
        getCheckInOutHistoryForStudent(linked.studentId).then(cs => { if (active) setCheckins(cs); });
        getLinkedStudentBills(linked.studentId).then(ps => { if (active) setBillingPeriods(ps); });
      }
    });
    return () => { active = false; };
  }, []);

  // Opened from a "Concern Submitted" / report-status notification — scroll straight to that
  // report in the Student Reports card below and briefly highlight it, so tapping the
  // notification actually shows the parent the concern rather than just landing on the home
  // screen. Gated on studentReports being loaded (it fetches async) so a fast tap right after
  // navigating here doesn't miss the match; the effect just re-runs once that data arrives.
  const reportRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [highlightedReportId, setHighlightedReportId] = useState<string | null>(null);
  useEffect(() => {
    if (pendingDeepLink?.type !== "report" || !pendingDeepLink.relatedId) return;
    const match = studentReports.find(r => r.id === pendingDeepLink.relatedId);
    if (!match) return;
    setHighlightedReportId(match.id);
    requestAnimationFrame(() => reportRefs.current[match.id]?.scrollIntoView({ behavior: "smooth", block: "center" }));
    onDeepLinkConsumed?.();
  }, [pendingDeepLink, studentReports, onDeepLinkConsumed]);
  // Fade the highlight back out a few seconds after it's shown, so it reads as a momentary
  // "here it is" pointer rather than a permanent marker on the report.
  useEffect(() => {
    if (!highlightedReportId) return;
    const t = setTimeout(() => setHighlightedReportId(null), 4000);
    return () => clearTimeout(t);
  }, [highlightedReportId]);

  // Same pattern, for an "Announcement" notification (highlightsStore.ts notifies linked
  // parents on both create and update) — scroll to and briefly highlight that specific
  // announcement in "Today's Highlights" below, instead of landing on a page where it's
  // just one more item in an unmarked list.
  const announcementRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [highlightedAnnouncementId, setHighlightedAnnouncementId] = useState<string | null>(null);
  useEffect(() => {
    if (pendingDeepLink?.type !== "announcement" || !pendingDeepLink.relatedId) return;
    const match = announcements.find(a => a.id === pendingDeepLink.relatedId);
    if (!match) return;
    setHighlightedAnnouncementId(match.id);
    requestAnimationFrame(() => announcementRefs.current[match.id]?.scrollIntoView({ behavior: "smooth", block: "center" }));
    onDeepLinkConsumed?.();
  }, [pendingDeepLink, announcements, onDeepLinkConsumed]);
  useEffect(() => {
    if (!highlightedAnnouncementId) return;
    const t = setTimeout(() => setHighlightedAnnouncementId(null), 4000);
    return () => clearTimeout(t);
  }, [highlightedAnnouncementId]);

  // Opened from an "inactivity" notification tap — the landlord's Occupants page
  // detected no real check-in/out from the linked student for 24+ hours and logged
  // a real inactivity_notices row (0052); fetch that specific one and show it.
  const [viewingInactivityNotice, setViewingInactivityNotice] = useState<InactivityNotice | null>(null);
  useEffect(() => {
    if (pendingDeepLink?.type !== "inactivity" || !pendingDeepLink.relatedId) return;
    const id = pendingDeepLink.relatedId;
    getInactivityNotice(id).then(row => {
      if (row) setViewingInactivityNotice(row);
      onDeepLinkConsumed?.();
    });
  }, [pendingDeepLink, onDeepLinkConsumed]);

  const PARENT_DATA = parentProfile;
  const STUDENT_DATA = studentProfile;
  const BH_DATA = assignment.bh;
  // Only the 5 most recent show inline; "View All" opens the rest (up to 50) in a modal.
  const allActivity = buildRecentActivity(checkins, billingPeriods, announcements, 50);
  const activity = allActivity.slice(0,5);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const ROOM_DATA = assignment.room;

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column" as const, background:"#F2F4F8", overflowY:"auto", scrollbarWidth:"none" as const }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ flexShrink:0, backgroundImage:GRAD_H, padding:"52px 20px 24px", position:"relative" as const, overflow:"hidden" }}>
        <div style={{ position:"absolute" as const, top:-50, right:-50, width:180, height:180, borderRadius:"42% 58% 65% 35%/45% 40% 60% 55%", background:"rgba(255,255,255,.05)", filter:"blur(32px)" }}/>
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
          <div style={{ width:52, height:52, borderRadius:"50%", background:"rgba(255,255,255,.25)", border:"2px solid rgba(255,255,255,.4)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, overflow:"hidden" }}>
            {STUDENT_DATA.photo ? <img src={STUDENT_DATA.photo} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : (
              <span style={{ fontSize:18, fontWeight:800, color:"white", fontFamily:QS }}>
                {STUDENT_DATA.name.split(" ").map((n:string)=>n[0]).join("").slice(0,2)}
              </span>
            )}
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

        {!studentLinked && (
          <div style={{ background:"#FEF3C7", borderRadius:16, padding:"12px 14px", marginBottom:14, display:"flex", alignItems:"flex-start", gap:10 }}>
            <AlertCircle size={14} color="#D97706" style={{ flexShrink:0, marginTop:1 }}/>
            <p style={{ margin:0, fontSize:11, color:"#92400E", fontFamily:IN, lineHeight:1.55 }}>
              Your account isn't linked to a student yet. Once your student approves the link you submitted during sign-up, their boarding house information will appear here.
            </p>
          </div>
        )}

        {/* ── Student Overview Card — title sits above the card, same convention as
             every other section here now (see Recent Activity at the bottom). ────── */}
        <div style={{ marginBottom:14 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
            <p style={{ margin:0, fontSize:14, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Student Overview</p>
            <span style={{ fontSize:10, fontWeight:800, padding:"3px 10px", borderRadius:20, background:"#DCFCE7", color:"#16A34A", fontFamily:QS }}>{BH_DATA.status}</span>
          </div>
          <div style={{ background:"white", borderRadius:22, padding:"18px", boxShadow:"0 6px 24px rgba(0,0,0,.08)" }}>
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
        <div style={{ marginBottom:14 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
            <p style={{ margin:0, fontSize:14, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Today's Highlights</p>
            <span style={{ fontSize:10, fontWeight:700, color:"#9CA3AF", fontFamily:IN }}>View only</span>
          </div>
          <div style={{ background:"white", borderRadius:22, padding:"18px", boxShadow:"0 4px 16px rgba(0,0,0,.07)" }}>
          {announcements.length === 0 && (
            <p style={{ margin:"6px 0", fontSize:11, color:"#9CA3AF", fontFamily:IN, textAlign:"center" as const }}>No announcements yet.</p>
          )}
          {/* Priority is no longer a real, landlord-set concept — no priority badge here anymore. */}
          {announcements.map((ann, i)=>{
            const highlighted = highlightedAnnouncementId === ann.id;
            return (
              <div key={ann.id} ref={el=>{ announcementRefs.current[ann.id] = el; }} style={{ padding:"11px 10px", margin:"0 -10px", borderRadius:14, borderBottom:i<announcements.length-1?"1px solid #F9FAFB":"none", background:highlighted?"#F5F0FF":"transparent", boxShadow:highlighted?"0 0 0 2px #9772F6":"none", transition:"background .3s, box-shadow .3s" }}>
                <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                  <div style={{ width:34, height:34, borderRadius:11, background:"#F5F0FF", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <Megaphone size={14} color="#9772F6"/>
                  </div>
                  <div style={{ flex:1 }}>
                    <p style={{ margin:"0 0 2px", fontSize:12, fontWeight:800, color:"#1F2937", fontFamily:QS }}>{ann.title}</p>
                    {/* pre-line: a landlord's announcement with a date/time attached carries a
                        blank-line-separated "Scheduled for…" note — without this it collapses
                        into one run-on sentence instead of its own line. */}
                    <p style={{ margin:"0 0 2px", fontSize:11, color:"#6B7280", fontFamily:IN, lineHeight:1.45, whiteSpace:"pre-line" }}>{ann.desc}</p>
                    <p style={{ margin:0, fontSize:10, color:"#9CA3AF", fontFamily:IN }}>{ann.date}</p>
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        </div>

        {/* ── Student Reports ─────────────────────────────────────────────── */}
        {(()=>{
          const myReports = studentReports; // getReportsForLinkedStudent() already scopes to the linked student
          if (myReports.length===0) return null;
          return (
            <div style={{ marginBottom:14 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                <p style={{ margin:0, fontSize:14, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Student Reports</p>
                <span style={{ fontSize:10, fontWeight:700, color:"#9CA3AF", fontFamily:IN }}>View only</span>
              </div>
              <div style={{ background:"white", borderRadius:22, padding:"18px", boxShadow:"0 4px 16px rgba(0,0,0,.07)" }}>
              {myReports.map((r, i)=>{
                const cm = CATEGORY_META[r.category];
                const sm = STATUS_META[r.status];
                const highlighted = highlightedReportId === r.id;
                return (
                  <div key={r.id} ref={el=>{ reportRefs.current[r.id] = el; }} style={{ padding:"12px 10px", margin:"0 -10px", borderRadius:14, borderBottom:i<myReports.length-1?"1px solid #F9FAFB":"none", background:highlighted?"#F5F0FF":"transparent", boxShadow:highlighted?"0 0 0 2px #9772F6":"none", transition:"background .3s, box-shadow .3s" }}>
                    <div style={{ display:"flex", gap:5, marginBottom:5, flexWrap:"wrap" as const }}>
                      <span style={{ fontSize:9, fontWeight:800, padding:"2px 8px", borderRadius:20, background:sm.bg, color:sm.color, fontFamily:QS }}>{sm.label}</span>
                      <span style={{ fontSize:9, fontWeight:800, padding:"2px 8px", borderRadius:20, background:cm.bg, color:cm.color, fontFamily:QS }}>{cm.label}</span>
                    </div>
                    <p style={{ margin:"0 0 2px", fontSize:12, fontWeight:800, color:"#1F2937", fontFamily:QS }}>{r.title}</p>
                    <p style={{ margin:"0 0 4px", fontSize:11, color:"#6B7280", fontFamily:IN, lineHeight:1.45 }}>{r.description.length>100?r.description.slice(0,100)+"...":r.description}</p>
                    <p style={{ margin:"0 0 4px", fontSize:10, color:"#9CA3AF", fontFamily:IN }}>{r.dateSubmitted}</p>
                    {r.imageUrls.length>0 && (
                      <div style={{ display:"flex", gap:6, marginBottom:6, flexWrap:"wrap" as const }}>
                        {r.imageUrls.map((url,j)=>(
                          <a key={j} href={url} target="_blank" rel="noopener noreferrer" style={{ width:52, height:46, borderRadius:9, overflow:"hidden", display:"block" }}>
                            <img src={url} alt={`Attachment ${j+1}`} style={{ width:"100%", height:"100%", objectFit:"cover" as const, display:"block" }}/>
                          </a>
                        ))}
                      </div>
                    )}
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
            </div>
          );
        })()}

        {/* ── Emergency Contact ────────────────────────────────────────────── */}
        <div style={{ marginBottom:14 }}>
          <p style={{ margin:"0 0 10px", fontSize:14, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Emergency Contacts</p>
          <div style={{ background:"white", borderRadius:22, padding:"18px", boxShadow:"0 4px 16px rgba(0,0,0,.07)" }}>
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

        {/* ── Recent Activity — moved to the bottom of the page and styled with the
             title outside the card, matching every other role's home screen (Student,
             Landlord, Admin). Only the 5 most recent show here; "View All" opens the
             rest in a modal. ──────────────────────────────────────────────────────── */}
        <div style={{ marginBottom:20 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
            <p style={{ margin:0, fontSize:14, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Recent Activity</p>
            {allActivity.length>5 && (
              <button onClick={()=>setShowAllActivity(true)} style={{ fontSize:11, fontWeight:700, color:"#9772F6", background:"none", border:"none", cursor:"pointer", fontFamily:QS, padding:0 }}>View All</button>
            )}
          </div>
          <div style={{ background:"white", borderRadius:22, padding:"16px 18px", boxShadow:"0 4px 16px rgba(0,0,0,.07)" }}>
            {activity.length === 0 && (
              <p style={{ margin:0, fontSize:11, color:"#9CA3AF", fontFamily:IN, textAlign:"center" as const }}>Nothing to show yet — activity will appear here as it happens.</p>
            )}
            {activity.map(({ id, Icon, color, bg, msg, ts }, i)=>(
              <div key={id} style={{ display:"flex", gap:12, paddingBottom:i<activity.length-1?12:0 }}>
                <div style={{ display:"flex", flexDirection:"column" as const, alignItems:"center", width:32 }}>
                  <div style={{ width:32, height:32, borderRadius:11, background:bg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <Icon size={14} color={color}/>
                  </div>
                  {i<activity.length-1 && <div style={{ width:2, flex:1, minHeight:10, background:"#F3F4F6", marginTop:4 }}/>}
                </div>
                <div style={{ flex:1, paddingTop:5 }}>
                  <p style={{ margin:"0 0 1px", fontSize:12, fontWeight:700, color:"#1F2937", fontFamily:IN, lineHeight:1.45 }}>{msg}</p>
                  <p style={{ margin:0, fontSize:10, color:"#9CA3AF", fontFamily:IN }}>{timeAgo(ts)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {showAllActivity && (
        <div style={{ position:"fixed" as const, inset:0, background:"rgba(0,0,0,.5)", zIndex:90, display:"flex", flexDirection:"column" as const, justifyContent:"flex-end" }} onClick={()=>setShowAllActivity(false)}>
          <div style={{ background:"#F7F8FC", borderRadius:"24px 24px 0 0", maxHeight:"85%", display:"flex", flexDirection:"column" as const }} onClick={e=>e.stopPropagation()}>
            <div style={{ padding:"18px 20px 14px", background:"white", borderRadius:"24px 24px 0 0", borderBottom:"1px solid #F3F4F6", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <p style={{ margin:0, fontSize:15, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Recent Activity</p>
                <p style={{ margin:"2px 0 0", fontSize:11, color:"#9CA3AF", fontFamily:IN }}>{allActivity.length} total</p>
              </div>
              <button onClick={()=>setShowAllActivity(false)} style={{ width:32, height:32, borderRadius:10, background:"#F3F4F6", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <X size={15} color="#6B7280"/>
              </button>
            </div>
            <div style={{ overflowY:"auto" as const, scrollbarWidth:"none" as const, padding:"12px 20px 24px" }}>
              {allActivity.map(({ id, Icon, color, bg, msg, ts }, i)=>(
                <div key={id} style={{ display:"flex", gap:12, padding:"10px 0", borderBottom:i<allActivity.length-1?"1px solid #F3F4F6":"none" }}>
                  <div style={{ width:32, height:32, borderRadius:11, background:bg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <Icon size={14} color={color}/>
                  </div>
                  <div style={{ flex:1, paddingTop:5 }}>
                    <p style={{ margin:"0 0 1px", fontSize:12, fontWeight:700, color:"#1F2937", fontFamily:IN, lineHeight:1.45 }}>{msg}</p>
                    <p style={{ margin:0, fontSize:10, color:"#9CA3AF", fontFamily:IN }}>{timeAgo(ts)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {viewingInactivityNotice && <InactivityDetailModal notice={viewingInactivityNotice} studentName={studentProfile.firstName} onClose={()=>setViewingInactivityNotice(null)}/>}
    </div>
  );
}

// ── Inactivity Notice Detail Modal ───────────────────────────────────────────
// What an "inactivity" notification tap opens for a linked parent — the actual
// real inactivity_notices row (LandlordOccupants.tsx detects this from real
// check-in/out history, 0052), not just a generic landing on the dashboard.

function InactivityDetailModal({ notice, studentName, onClose }: { notice: InactivityNotice; studentName: string; onClose: () => void }) {
  const lastActivityLabel = new Date(notice.lastActivityAt).toLocaleDateString("en-US", { month:"long", day:"numeric", year:"numeric" });
  const dayWord = `${notice.daysInactive} day${notice.daysInactive === 1 ? "" : "s"}`;
  return (
    <div style={{ position:"fixed" as const, inset:0, background:"rgba(0,0,0,.55)", zIndex:400, display:"flex", alignItems:"center", justifyContent:"center", padding:28 }} onClick={onClose}>
      <div style={{ background:"white", borderRadius:28, padding:"28px 24px 24px", width:"100%", maxWidth:340, boxShadow:"0 24px 60px rgba(0,0,0,.25)" }} onClick={e=>e.stopPropagation()}>
        <div style={{ width:56, height:56, borderRadius:20, background:"#FEF2F2", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
          <AlertCircle size={24} color="#F87171"/>
        </div>
        <h3 style={{ margin:"0 0 4px", fontSize:17, fontWeight:800, color:"#1F2937", fontFamily:QS, textAlign:"center" as const }}>{studentName} Has Gone Quiet</h3>
        <p style={{ margin:"0 0 18px", fontSize:11, color:"#9CA3AF", fontFamily:IN, textAlign:"center" as const }}>Their landlord was notified too</p>

        <div style={{ background:"#FEF2F2", borderRadius:14, padding:"12px 14px", marginBottom:18, textAlign:"center" as const }}>
          <p style={{ margin:0, fontSize:12, color:"#7F1D1D", fontFamily:IN, lineHeight:1.6 }}>
            No Enter/Exit activity in <strong>{dayWord}</strong> — since {lastActivityLabel}.
          </p>
        </div>

        {notice.response ? (
          <div style={{ background:"#F0FDF4", borderRadius:14, padding:"12px 14px", marginBottom:18 }}>
            <p style={{ margin:"0 0 4px", fontSize:10, fontWeight:800, color:"#15803D", fontFamily:QS, textTransform:"uppercase" as const }}>{studentName}'s Response</p>
            <p style={{ margin:0, fontSize:12, color:"#166534", fontFamily:IN, lineHeight:1.6 }}>"{notice.response}"</p>
          </div>
        ) : (
          <p style={{ margin:"0 0 18px", fontSize:12, color:"#6B7280", fontFamily:IN, lineHeight:1.6, textAlign:"center" as const }}>
            Waiting for {studentName} to respond. You may want to check in with them directly.
          </p>
        )}

        <button onClick={onClose} style={{ width:"100%", height:48, borderRadius:20, backgroundImage:GRAD, border:"none", cursor:"pointer", fontSize:14, fontWeight:800, color:"white", fontFamily:QS, boxShadow:"0 4px 16px rgba(151,114,246,.3)" }}>
          Got It
        </button>
      </div>
    </div>
  );
}
