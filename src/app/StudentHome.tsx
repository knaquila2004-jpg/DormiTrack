import React, { useState, useEffect, useRef } from "react";
import {
  Bell, MessageCircle, Building2,
  Calendar, CreditCard, Megaphone,
  ChevronRight, X, Check, CheckCircle, AlertCircle,
  BookOpen, Eye, Home,
  Flag, Plus, ChevronLeft,
  Wrench, Zap, ShowerHead, Wifi, UserCheck, Clock, Pencil, Phone, Info,
} from "lucide-react";
import {
  getMyReports, submitReport, uploadReportImage, addReportComment,
  CATEGORY_META, STATUS_META,
  StudentReport, ReportCategory,
} from "./reportStore";
import { useUnreadCount, notifyLandlordOfBoardingHouse, notifyLinkedParents, NotificationType, fmtBadgeCount } from "./notificationStore";
import { useUnreadChatCount } from "./chatStore";
import { getMyProfile, getMyAssignment, MyStudentProfile, MyAssignment } from "./studentAssignmentStore";
import { getMyPendingParentLinkRequests, approveParentLink, rejectParentLink, ParentLinkRequest } from "./parentLinkStore";
import { getMyAnnouncements, getMyReadAnnouncementIds, markAnnouncementRead, MyAnnouncement } from "./announcementStore";
import { getMyBillingSummary, BillingSummary } from "./paymentStore";
import {
  getMyVisitorConfig, submitVisitorRecord, getMyVisitorRecords, markVisitorLeft, updateVisitorRecord, loggedLabel,
  VisitorFieldsConfig, MyVisitorRecord,
} from "./visitorStore";

const GRAD   = "linear-gradient(135deg,#9772F6 0%,#7549F6 100%)";
const GRAD_H = "linear-gradient(160deg,#9772F6 0%,#7549F6 100%)";
const QS     = "'Quicksand',sans-serif";
const IN     = "'Inter',sans-serif";

// Neutral (not fake) placeholders shown only until the real fetch resolves —
// see StudentHomeScreen's useEffect below, which populates local
// STUDENT_DATA/BH_DATA/ROOM_DATA/STAY_DATA consts from the signed-in
// student's real assignment.
const EMPTY_PROFILE: MyStudentProfile = { name: "—", firstName: "—", id: "—", program: "—", year: "—", block: "—", email: "—", contact: "—", address: "—", photo: null };
const EMPTY_ASSIGNMENT: MyAssignment = {
  bh:   { id: "", name: "—", address: "—", lat: 0, lng: 0, cover: null, landlord: "—", landlordPhoto: null, contact: "—", email: "—", status: "Active", regStatus: "Approved", checkinRadiusMeters: 50, amenities: [], rules: [], totalRooms: 0, rentAmount: null, gallery: [] },
  room: { id: "", name: "—", bed: "—", capacity: 0, occupied: 0, available: 0, floor: "—", type: "—" },
  stay: { moveIn: "—", moveOut: "—", daysStayed: 0, daysRemaining: 0, totalDays: 0, stayLength: "—" },
};
const EMPTY_BILLING: BillingSummary = { total: 0, dueDate: "—", period: "—", status: "unpaid" };
const EMPTY_VISITOR_CONFIG: { enabled: boolean; fields: VisitorFieldsConfig; bhId: string | null } = {
  enabled: false, fields: { name: true, contact: true, relationship: true, purpose: true }, bhId: null,
};

// No seeded/fake rows — the Activity Timeline is built for real (see StudentHomeScreen below)
// from each report's real statusHistory (submission + every real landlord response/status
// change), the one genuinely event-sourced, timestamped record this screen already has for a
// student. It's honestly empty for a student who hasn't submitted a concern yet.

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function AnnouncementModal({ ann, isRead, onMarkRead, onClose, landlordName }: {
  ann:MyAnnouncement; isRead:boolean; onMarkRead:()=>void; onClose:()=>void; landlordName:string;
}) {
  // No "Mark as Read" button anymore — opening the announcement to view it is
  // itself what marks it read now, same as most notification-center UIs.
  useEffect(() => { if (!isRead) onMarkRead(); }, []);
  return (
    <div style={{ position: "fixed" as const, inset:0, background:"rgba(0,0,0,.5)", zIndex:90, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 16px" }}>
      <div style={{ background:"white", borderRadius:24, padding:22, width:"100%", maxHeight:"82%", display:"flex", flexDirection:"column" as const }}>
        <div style={{ display:"flex", alignItems:"flex-start", gap:10, marginBottom:14 }}>
          {/* Priority is no longer a real, landlord-set concept — no priority-driven
              color or badge here anymore, just a fixed brand-purple treatment. */}
          <div style={{ width:42, height:42, borderRadius:14, background:"#F5F0FF", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <Megaphone size={18} color="#9772F6"/>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ margin:0, fontSize:16, fontWeight:800, color:"#1F2937", fontFamily:QS, lineHeight:1.3 }}>{ann.title}</p>
            <p style={{ margin:"4px 0 0", fontSize:10, color:"#9CA3AF", fontFamily:IN }}>{ann.date}</p>
          </div>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:9, background:"#F3F4F6", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <X size={14} color="#6B7280"/>
          </button>
        </div>
        <div style={{ overflowY:"auto" as const, scrollbarWidth:"none" as const, flex:1, marginBottom:16 }}>
          {/* pre-line: a landlord's announcement with a date/time attached carries a
              blank-line-separated "Scheduled for…" note — without this it collapses
              into one run-on sentence instead of its own line. */}
          <p style={{ fontSize:13, color:"#374151", fontFamily:IN, lineHeight:1.7, margin:0, whiteSpace:"pre-line" }}>{ann.desc}</p>
          <div style={{ marginTop:14, padding:"10px 14px", background:"#F9FAFB", borderRadius:12, display:"flex", alignItems:"center", gap:8 }}>
            <Building2 size={13} color="#9CA3AF"/>
            <p style={{ margin:0, fontSize:11, color:"#9CA3AF", fontFamily:IN }}>Posted by {landlordName}</p>
          </div>
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

function SubmitReportModal({ onClose, onSubmitted, bhName, roomName, bedName }: {
  onClose:()=>void; onSubmitted:()=>void; bhName:string; roomName:string; bedName:string;
}) {
  const [category,    setCategory]    = useState<ReportCategory|null>(null);
  const [otherDetail, setOtherDetail] = useState("");
  const [desc,        setDesc]        = useState("");
  const [photos,        setPhotos]        = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [success,  setSuccess]  = useState(false);
  const [err,      setErr]      = useState("");

  const MAX_PHOTOS = 4;
  const MAX_BYTES  = 5 * 1024 * 1024;

  const addPhoto = (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) { setErr("Only image files are accepted."); return; }
    if (f.size > MAX_BYTES) { setErr("Photo is larger than 5MB."); return; }
    setErr("");
    setPhotos(prev => [...prev, f]);
    setPhotoPreviews(prev => [...prev, URL.createObjectURL(f)]);
  };
  const removePhoto = (i: number) => {
    setPhotos(prev => prev.filter((_,j)=>j!==i));
    setPhotoPreviews(prev => prev.filter((_,j)=>j!==i));
  };

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!category) { setErr("Please select a concern category."); return; }
    if (category === "other" && !otherDetail.trim()) { setErr("Please specify what your concern is about."); return; }
    if (!desc.trim())  { setErr("Please describe your concern."); return; }
    // No free-text title field — the title is derived from the category itself,
    // or from the "specify" text when the category is "Other".
    const title = category === "other" ? otherDetail.trim() : CATEGORY_META[category].label;
    setSubmitting(true);

    // Upload whatever photos were attached first — a failed upload shouldn't block the
    // report itself, so a bad file is just dropped (with a warning) rather than aborting.
    const imageUrls: string[] = [];
    let uploadWarning = "";
    for (const file of photos) {
      const up = await uploadReportImage(file);
      if (up.ok === false) uploadWarning = `Report submitted, but ${photos.length>1?"a photo":"the photo"} couldn't be uploaded: ${up.error}`;
      else imageUrls.push(up.url);
    }

    const res = await submitReport({ category, priority: "medium", title, description: desc.trim(), imageUrls });
    setSubmitting(false);
    if (res.ok === false) { setErr(res.error); return; }
    setErr(uploadWarning);
    notifyLandlordOfBoardingHouse(res.boardingHouseId, {
      type: "report", title: "New Student Concern",
      description: `A student submitted a concern: "${title}".`,
      destination: "dashboard", relatedId: res.id,
    });
    // Any parent linked to this student should see the concern too, not just the landlord.
    notifyLinkedParents(res.submitterId, {
      type: "report", title: "Concern Submitted",
      description: `Your student submitted a concern: "${title}".`,
      destination: "dashboard", relatedId: res.id,
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
        {err && <p style={{ margin:"-12px 0 20px", fontSize:11, color:"#D97706", fontFamily:IN, lineHeight:1.5 }}>{err}</p>}
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

          {/* "Other" category — ask what the specific concern actually is */}
          {category === "other" && (
            <>
              <p style={{ margin:"0 0 6px", fontSize:12, fontWeight:800, color:"#374151", fontFamily:QS }}>Please specify <span style={{ color:"#EF4444" }}>*</span></p>
              <div style={{ background:"white", borderRadius:14, padding:"11px 14px", border:"1.5px solid #E5E7EB", marginBottom:14 }}>
                <input value={otherDetail} onChange={e=>{ setOtherDetail(e.target.value); setErr(""); }} placeholder="What is your concern about?" style={{ width:"100%", background:"none", border:"none", outline:"none", fontSize:13, fontFamily:IN, color:"#1F2937", boxSizing:"border-box" as const }}/>
              </div>
            </>
          )}

          {/* Description */}
          <p style={{ margin:"0 0 6px", fontSize:12, fontWeight:800, color:"#374151", fontFamily:QS }}>Description <span style={{ color:"#EF4444" }}>*</span></p>
          <div style={{ background:"white", borderRadius:14, padding:"11px 14px", border:"1.5px solid #E5E7EB", marginBottom:14 }}>
            <textarea value={desc} onChange={e=>{ setDesc(e.target.value); setErr(""); }} placeholder="Describe your concern in detail..." rows={4} style={{ width:"100%", background:"none", border:"none", outline:"none", fontSize:13, fontFamily:IN, color:"#1F2937", resize:"none" as const, boxSizing:"border-box" as const }}/>
          </div>

          {/* Photo Attachment — real uploads (image, max 5MB each, up to 4) */}
          <p style={{ margin:"0 0 6px", fontSize:12, fontWeight:800, color:"#374151", fontFamily:QS }}>Photo Attachment <span style={{ fontSize:10, color:"#9CA3AF", fontWeight:600 }}>(Optional)</span></p>
          <div style={{ display:"flex", gap:9, marginBottom:14, flexWrap:"wrap" as const }}>
            {photoPreviews.map((src,i)=>(
              <div key={i} style={{ width:72, height:66, borderRadius:14, overflow:"hidden", position:"relative" as const }}>
                <img src={src} alt={`Attachment ${i+1}`} style={{ width:"100%", height:"100%", objectFit:"cover" as const, display:"block" }}/>
                <div onClick={()=>removePhoto(i)} style={{ position:"absolute" as const, top:-5, right:-5, width:18, height:18, borderRadius:"50%", background:"#EF4444", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", border:"2px solid white" }}>
                  <X size={9} color="white"/>
                </div>
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <label style={{ width:72, height:66, borderRadius:14, border:"2px dashed #D1D5DB", background:"#F9FAFB", display:"flex", flexDirection:"column" as const, alignItems:"center", justifyContent:"center", gap:4, cursor:"pointer" }}>
                <input type="file" accept="image/*" style={{ display:"none" }} onChange={e=>{ addPhoto(e.target.files?.[0]); e.target.value=""; }}/>
                <Plus size={16} color="#9CA3AF"/>
                <span style={{ fontSize:9, color:"#9CA3AF", fontFamily:IN }}>Add Photo</span>
              </label>
            )}
          </div>
          <p style={{ margin:"-10px 0 14px", fontSize:10, color:"#9CA3AF", fontFamily:IN }}>Image files only · Max 5MB each · Up to {MAX_PHOTOS} photos</p>

          {/* Auto-filled location */}
          <p style={{ margin:"0 0 6px", fontSize:12, fontWeight:800, color:"#374151", fontFamily:QS }}>Location <span style={{ fontSize:10, color:"#9CA3AF", fontWeight:600 }}>(Auto-filled)</span></p>
          <div style={{ background:"#F9FAFB", borderRadius:14, padding:"12px 14px", border:"1.5px solid #E5E7EB", marginBottom:18, display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
            {[["Boarding House",bhName],["Room",roomName],["Bed",bedName]].map(([l,v])=>(
              <div key={l}>
                <p style={{ margin:"0 0 2px", fontSize:9, color:"#9CA3AF", fontFamily:QS, fontWeight:700, textTransform:"uppercase" as const }}>{l}</p>
                <p style={{ margin:0, fontSize:11, fontWeight:700, color:"#9CA3AF", fontFamily:QS }}>{v}</p>
              </div>
            ))}
          </div>

          {err && <p style={{ margin:"0 0 10px", fontSize:11, color:"#EF4444", fontFamily:IN }}>{err}</p>}

          <button onClick={handleSubmit} disabled={submitting} style={{ width:"100%", height:52, borderRadius:20, backgroundImage:GRAD, border:"none", cursor:submitting?"default":"pointer", opacity:submitting?0.7:1, fontSize:15, fontWeight:800, color:"white", fontFamily:QS, boxShadow:"0 4px 16px rgba(151,114,246,.35)" }}>
            {submitting ? "Submitting…" : "Submit Report"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Log a Visitor Modal ─────────────────────────────────────────────────────
// Only rendered when the landlord has visitor_log_enabled on for the
// student's boarding house (see visitorConfig in StudentHomeScreen below);
// `fields` is the landlord's own per-field toggle config (visitor_fields),
// same shape the landlord's own logbook modal in App.tsx already respects.

function VisitorFormModal({ onClose, onSubmitted, bhId, fields, bhName, roomName, editRecord }: {
  onClose: () => void; onSubmitted: () => void; bhId: string; fields: VisitorFieldsConfig; bhName: string; roomName: string;
  // When set, the modal edits this already-logged record instead of creating a new
  // one — for a student who forgot to fill something in the first time (or just
  // wants to correct it), rather than only ever being able to log a fresh visitor.
  editRecord?: MyVisitorRecord;
}) {
  const isEdit = !!editRecord;
  const [visitorName, setVisitorName]   = useState(editRecord?.visitorName ?? "");
  const [contact, setContact]           = useState(editRecord?.contact ?? "");
  const [relationship, setRelationship] = useState(editRecord?.relationship ?? "");
  const [purpose, setPurpose]           = useState(editRecord?.purpose ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr]               = useState("");
  const [success, setSuccess]       = useState(false);

  const handleSubmit = async () => {
    if (fields.name && !visitorName.trim()) { setErr("Please enter your visitor's name."); return; }
    setSubmitting(true); setErr("");
    const input = {
      visitorName:   fields.name ? visitorName.trim() : undefined,
      contact:       fields.contact ? contact.trim() : undefined,
      relationship:  fields.relationship ? relationship.trim() : undefined,
      purpose:       fields.purpose ? purpose.trim() : undefined,
    };
    if (isEdit) {
      const res = await updateVisitorRecord(editRecord!.id, input);
      setSubmitting(false);
      if (res.ok === false) { setErr(res.error); return; }
      setSuccess(true);
      return;
    }
    const res = await submitVisitorRecord(bhId, input);
    setSubmitting(false);
    if (res.ok === false) { setErr(res.error); return; }
    notifyLandlordOfBoardingHouse(bhId, {
      type: "visitor", title: "New Visitor Logged",
      description: `${fields.name && visitorName.trim() ? visitorName.trim() : "A visitor"} was logged at ${roomName}.`,
      destination: "dashboard", relatedId: res.id,
    });
    setSuccess(true);
  };

  if (success) return (
    <div style={{ position:"fixed" as const, inset:0, background:"rgba(0,0,0,.6)", zIndex:400, display:"flex", alignItems:"center", justifyContent:"center", padding:28 }}>
      <div style={{ background:"white", borderRadius:28, padding:"30px 24px 24px", width:"100%", maxWidth:330, textAlign:"center" as const, boxShadow:"0 24px 60px rgba(0,0,0,.25)" }}>
        <div style={{ width:64, height:64, borderRadius:22, backgroundImage:GRAD, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
          <Check size={28} color="white"/>
        </div>
        <h3 style={{ margin:"0 0 10px", fontSize:18, fontWeight:800, color:"#1F2937", fontFamily:QS }}>{isEdit ? "Visitor Updated!" : "Visitor Logged!"}</h3>
        <p style={{ margin:"0 0 22px", fontSize:12, color:"#6B7280", fontFamily:IN, lineHeight:1.65 }}>
          {isEdit ? "The details for this visitor have been saved." : "Your landlord has been notified. Remember to mark your visitor as left once they head out."}
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
            <p style={{ margin:0, fontSize:17, fontWeight:800, color:"#1F2937", fontFamily:QS }}>{isEdit ? "Edit Visitor" : "Log a Visitor"}</p>
            <p style={{ margin:0, fontSize:11, color:"#9CA3AF", fontFamily:IN }}>{isEdit ? "Fix or fill in anything you missed" : "Let your landlord know someone is visiting"}</p>
          </div>
        </div>
        {/* Body */}
        <div style={{ flex:1, overflowY:"auto" as const, scrollbarWidth:"none" as const, padding:"14px 18px 40px" }}>

          {fields.name && (
            <>
              <p style={{ margin:"0 0 6px", fontSize:12, fontWeight:800, color:"#374151", fontFamily:QS }}>Visitor's Name <span style={{ color:"#EF4444" }}>*</span></p>
              <div style={{ background:"white", borderRadius:14, padding:"11px 14px", border:"1.5px solid #E5E7EB", marginBottom:14 }}>
                <input value={visitorName} onChange={e=>{ setVisitorName(e.target.value); setErr(""); }} placeholder="e.g. Maria Santos" style={{ width:"100%", background:"none", border:"none", outline:"none", fontSize:13, fontFamily:IN, color:"#1F2937", boxSizing:"border-box" as const }}/>
              </div>
            </>
          )}

          {fields.contact && (
            <>
              <p style={{ margin:"0 0 6px", fontSize:12, fontWeight:800, color:"#374151", fontFamily:QS }}>Contact Number <span style={{ fontSize:10, color:"#9CA3AF", fontWeight:600 }}>(Optional)</span></p>
              <div style={{ background:"white", borderRadius:14, padding:"11px 14px", border:"1.5px solid #E5E7EB", marginBottom:14 }}>
                <input value={contact} onChange={e=>setContact(e.target.value)} placeholder="09XX XXX XXXX" style={{ width:"100%", background:"none", border:"none", outline:"none", fontSize:13, fontFamily:IN, color:"#1F2937", boxSizing:"border-box" as const }}/>
              </div>
            </>
          )}

          {fields.relationship && (
            <>
              <p style={{ margin:"0 0 6px", fontSize:12, fontWeight:800, color:"#374151", fontFamily:QS }}>Relationship to You <span style={{ fontSize:10, color:"#9CA3AF", fontWeight:600 }}>(Optional)</span></p>
              <div style={{ background:"white", borderRadius:14, padding:"11px 14px", border:"1.5px solid #E5E7EB", marginBottom:14 }}>
                <input value={relationship} onChange={e=>setRelationship(e.target.value)} placeholder="e.g. Mother, Friend, Sibling" style={{ width:"100%", background:"none", border:"none", outline:"none", fontSize:13, fontFamily:IN, color:"#1F2937", boxSizing:"border-box" as const }}/>
              </div>
            </>
          )}

          {fields.purpose && (
            <>
              <p style={{ margin:"0 0 6px", fontSize:12, fontWeight:800, color:"#374151", fontFamily:QS }}>Purpose of Visit <span style={{ fontSize:10, color:"#9CA3AF", fontWeight:600 }}>(Optional)</span></p>
              <div style={{ background:"white", borderRadius:14, padding:"11px 14px", border:"1.5px solid #E5E7EB", marginBottom:14 }}>
                <textarea value={purpose} onChange={e=>setPurpose(e.target.value)} placeholder="e.g. Dropping off groceries" rows={3} style={{ width:"100%", background:"none", border:"none", outline:"none", fontSize:13, fontFamily:IN, color:"#1F2937", resize:"none" as const, boxSizing:"border-box" as const }}/>
              </div>
            </>
          )}

          {/* No "Visit Date" input — a visitor is only ever logged in the moment, so the
              date shown on the record is always the real log timestamp (see
              renderVisitorRow's loggedLabel usage), never something typed in here. */}

          {/* Auto-filled location — same convention as the concern-report form. */}
          <p style={{ margin:"0 0 6px", fontSize:12, fontWeight:800, color:"#374151", fontFamily:QS }}>Location <span style={{ fontSize:10, color:"#9CA3AF", fontWeight:600 }}>(Auto-filled)</span></p>
          <div style={{ background:"#F9FAFB", borderRadius:14, padding:"12px 14px", border:"1.5px solid #E5E7EB", marginBottom:18, display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            {[["Boarding House",bhName],["Room",roomName]].map(([l,v])=>(
              <div key={l}>
                <p style={{ margin:"0 0 2px", fontSize:9, color:"#9CA3AF", fontFamily:QS, fontWeight:700, textTransform:"uppercase" as const }}>{l}</p>
                <p style={{ margin:0, fontSize:11, fontWeight:700, color:"#9CA3AF", fontFamily:QS }}>{v}</p>
              </div>
            ))}
          </div>

          {err && <p style={{ margin:"0 0 10px", fontSize:11, color:"#EF4444", fontFamily:IN }}>{err}</p>}

          <button onClick={handleSubmit} disabled={submitting} style={{ width:"100%", height:52, borderRadius:20, backgroundImage:GRAD, border:"none", cursor:submitting?"default":"pointer", opacity:submitting?0.7:1, fontSize:15, fontWeight:800, color:"white", fontFamily:QS, boxShadow:"0 4px 16px rgba(151,114,246,.35)" }}>
            {submitting ? (isEdit ? "Saving…" : "Logging…") : (isEdit ? "Save Changes" : "Log Visitor")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Mark Visitor as Left Modal ────────────────────────────────────────────────
// A plain "Mark Left" tap used to always stamp time_out as "right now" — but a
// student who only remembers to tap it well after their visitor actually left
// would log a wrong (late) departure time. This lets them pick the real time
// instead, defaulting to now for the common case where they didn't forget.

function MarkVisitorLeftModal({ record, onClose, onConfirm }: {
  record: MyVisitorRecord; onClose: () => void;
  onConfirm: (timeOut: Date) => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const nowHM = () => { const d = new Date(); return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; };
  const [time, setTime] = useState(nowHM());
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  const handleConfirm = async () => {
    if (!time) { setErr("Please choose a time."); return; }
    const [h, m] = time.split(":").map(Number);
    const chosen = new Date();
    chosen.setHours(h, m, 0, 0);
    if (chosen.getTime() < record.ts) { setErr(`${record.visitorName || "Your visitor"} was logged in at ${record.timeIn} — time left can't be before that.`); return; }
    if (chosen.getTime() > Date.now() + 60000) { setErr("Time left can't be in the future."); return; }
    setSubmitting(true); setErr("");
    const res = await onConfirm(chosen);
    setSubmitting(false);
    if (res.ok === false) setErr(res.error);
  };

  return (
    <div style={{ position:"fixed" as const, inset:0, background:"rgba(0,0,0,.55)", zIndex:410, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }} onClick={onClose}>
      <div style={{ background:"white", borderRadius:24, padding:"24px 22px", width:"100%", maxWidth:340, boxShadow:"0 24px 60px rgba(0,0,0,.25)" }} onClick={e=>e.stopPropagation()}>
        <div style={{ width:52, height:52, borderRadius:18, background:"#F3F4F6", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 14px" }}>
          <Clock size={22} color="#6B7280"/>
        </div>
        <h3 style={{ margin:"0 0 4px", fontSize:16, fontWeight:800, color:"#1F2937", fontFamily:QS, textAlign:"center" as const }}>Mark {record.visitorName || "Visitor"} as Left</h3>
        <p style={{ margin:"0 0 18px", fontSize:11, color:"#9CA3AF", fontFamily:IN, textAlign:"center" as const, lineHeight:1.5 }}>
          Forgot to tap this earlier? Set the actual time your visitor left.
        </p>
        <p style={{ margin:"0 0 6px", fontSize:12, fontWeight:800, color:"#374151", fontFamily:QS }}>Time Left</p>
        <div style={{ background:"#F9FAFB", borderRadius:14, padding:"11px 14px", border:"1.5px solid #E5E7EB", marginBottom:8 }}>
          <input type="time" value={time} onChange={e=>{ setTime(e.target.value); setErr(""); }} style={{ width:"100%", background:"none", border:"none", outline:"none", fontSize:14, fontFamily:IN, color:"#1F2937", boxSizing:"border-box" as const }}/>
        </div>
        <button onClick={()=>{ setTime(nowHM()); setErr(""); }} style={{ background:"none", border:"none", padding:0, cursor:"pointer", fontSize:11, fontWeight:700, color:"#9772F6", fontFamily:QS, marginBottom:16, display:"block" }}>Use Current Time</button>
        {err && <p style={{ margin:"0 0 12px", fontSize:11, color:"#EF4444", fontFamily:IN, lineHeight:1.5 }}>{err}</p>}
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onClose} style={{ flex:1, height:46, borderRadius:16, background:"#F3F4F6", border:"none", cursor:"pointer", fontSize:13, fontWeight:800, color:"#374151", fontFamily:QS }}>Cancel</button>
          <button onClick={handleConfirm} disabled={submitting} style={{ flex:1, height:46, borderRadius:16, backgroundImage:GRAD, border:"none", cursor:submitting?"default":"pointer", opacity:submitting?0.7:1, fontSize:13, fontWeight:800, color:"white", fontFamily:QS }}>
            {submitting ? "Saving…" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Visitor Detail Modal (read-only) ────────────────────────────────────────
// A visitor that's already left is history, not something to keep editing — this
// is what tapping that row opens instead of the edit form.

function VisitorDetailModal({ record, fields, onClose }: {
  record: MyVisitorRecord; fields: VisitorFieldsConfig; onClose: () => void;
}) {
  const row = (Icon: typeof Clock, label: string, value: string) => (
    <div style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"12px 0", borderBottom:"1px solid #F3F4F6" }}>
      <Icon size={14} color="#9CA3AF" style={{ marginTop:1, flexShrink:0 }}/>
      <div>
        <p style={{ margin:"0 0 2px", fontSize:10, color:"#9CA3AF", fontFamily:IN }}>{label}</p>
        <p style={{ margin:0, fontSize:13, fontWeight:700, color:"#1F2937", fontFamily:QS }}>{value}</p>
      </div>
    </div>
  );
  return (
    <div style={{ position:"fixed" as const, inset:0, background:"rgba(0,0,0,.55)", zIndex:400, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }} onClick={onClose}>
      <div style={{ background:"#F7F8FC", borderRadius:24, width:"100%", maxWidth:360, maxHeight:"80%", display:"flex", flexDirection:"column" as const, boxShadow:"0 24px 60px rgba(0,0,0,.25)" }} onClick={e=>e.stopPropagation()}>
        <div style={{ background:"white", borderRadius:"24px 24px 0 0", padding:"16px 18px 14px", borderBottom:"1px solid #F3F4F6", display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ flex:1 }}>
            <p style={{ margin:0, fontSize:17, fontWeight:800, color:"#1F2937", fontFamily:QS }}>{record.visitorName || "Visitor"}</p>
            <p style={{ margin:0, fontSize:11, color:"#9CA3AF", fontFamily:IN }}>Visitor Details</p>
          </div>
          <span style={{ fontSize:9, fontWeight:800, padding:"3px 9px", borderRadius:20, background:"#F3F4F6", color:"#6B7280", fontFamily:QS, flexShrink:0 }}>Left</span>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:10, background:"#F3F4F6", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <X size={14} color="#374151"/>
          </button>
        </div>
        <div style={{ flex:1, overflowY:"auto" as const, scrollbarWidth:"none" as const, padding:"4px 18px 20px" }}>
          {fields.contact && record.contact && row(Phone, "Contact", record.contact)}
          {fields.relationship && record.relationship && row(UserCheck, "Relationship", record.relationship)}
          {fields.purpose && record.purpose && row(Info, "Purpose of Visit", record.purpose)}
          {row(Clock, "Time In", `${loggedLabel(record.ts)} · ${record.timeIn}`)}
          {record.timeOut && row(Clock, "Time Left", record.timeOut)}
        </div>
      </div>
    </div>
  );
}

// ── Report Detail Modal ───────────────────────────────────────────────────────

function ReportDetailModal({ report, onClose, onAddComment }: { report: StudentReport; onClose:()=>void; onAddComment:(reportId:string, note:string)=>Promise<{ok:true}|{ok:false;error:string}> }) {
  const [comment, setComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [commentError, setCommentError] = useState("");
  const [showAllStatusHistory, setShowAllStatusHistory] = useState(false);
  const cm = CATEGORY_META[report.category];
  const sm = STATUS_META[report.status];
  // Most-recent-first, like a log — statusHistory itself is stored oldest-first
  // (submission, then each real response/status change in the order they happened).
  const historyDesc = [...report.statusHistory].reverse();
  const recentHistory = historyDesc.slice(0,5);
  const renderHistoryItem = (h: StudentReport["statusHistory"][number], i: number, arr: typeof historyDesc) => {
    const hsm = STATUS_META[h.status];
    return (
      <div key={i} style={{ display:"flex", gap:10, marginBottom:i<arr.length-1?10:0, position:"relative" as const }}>
        {i<arr.length-1 && <div style={{ position:"absolute" as const, left:10, top:22, bottom:-10, width:1.5, background:"#F3F4F6" }}/>}
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
  };

  const handleSendComment = async () => {
    if (!comment.trim() || sendingComment) return;
    setSendingComment(true); setCommentError("");
    const res = await onAddComment(report.id, comment.trim());
    setSendingComment(false);
    if (res.ok === false) { setCommentError(res.error || "Couldn't send your comment. Please try again."); return; }
    setComment("");
  };

  return (
    <div style={{ position:"fixed" as const, inset:0, background:"rgba(0,0,0,.55)", zIndex:400, display:"flex", flexDirection:"column" as const, justifyContent:"flex-end" }} onClick={onClose}>
      <div style={{ background:"#F7F8FC", borderRadius:"28px 28px 0 0", maxHeight:"92%", display:"flex", flexDirection:"column" as const }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"center", padding:"10px 0 2px" }}><div style={{ width:40, height:4, borderRadius:2, background:"#E5E7EB" }}/></div>
        {/* Header */}
        <div style={{ padding:"12px 56px 14px", position:"relative" as const, display:"flex", flexDirection:"column" as const, alignItems:"center" }}>
          <div onClick={onClose} style={{ position:"absolute" as const, left:18, top:12, width:34, height:34, borderRadius:11, background:"#F3F4F6", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><ChevronLeft size={17} color="#374151"/></div>
          <p style={{ margin:0, fontSize:14, fontWeight:800, color:"#1F2937", fontFamily:QS, lineHeight:1.3, textAlign:"center" as const }}>{report.title}</p>
          <div style={{ display:"flex", gap:5, flexWrap:"wrap" as const, justifyContent:"center", marginTop:6 }}>
            <span style={{ fontSize:9, fontWeight:800, padding:"2px 8px", borderRadius:20, background:sm.bg, color:sm.color, fontFamily:QS, display:"flex", alignItems:"center", gap:3 }}>
              <div style={{ width:5, height:5, borderRadius:"50%", background:sm.dot }}/>{sm.label}
            </span>
            <span style={{ fontSize:9, fontWeight:800, padding:"2px 8px", borderRadius:20, background:cm.bg, color:cm.color, fontFamily:QS }}>{cm.label}</span>
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
          {report.imageUrls.length>0 && (
            <div style={{ background:"white", borderRadius:16, padding:"12px 14px", marginBottom:12, boxShadow:"0 2px 8px rgba(0,0,0,.05)" }}>
              <p style={{ margin:"0 0 8px", fontSize:10, fontWeight:800, color:"#9CA3AF", fontFamily:QS, textTransform:"uppercase" as const, letterSpacing:0.5 }}>Photos ({report.imageUrls.length})</p>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" as const }}>
                {report.imageUrls.map((url,i)=>(
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" style={{ width:80, height:70, borderRadius:13, overflow:"hidden", display:"block" }}>
                    <img src={url} alt={`Attachment ${i+1}`} style={{ width:"100%", height:"100%", objectFit:"cover" as const, display:"block" }}/>
                  </a>
                ))}
              </div>
            </div>
          )}
          {/* Status timeline — most-recent-first, only the 5 latest; "View All" opens
              every entry (in the same order) in its own modal. */}
          <div style={{ background:"white", borderRadius:16, padding:"12px 14px", marginBottom:12, boxShadow:"0 2px 8px rgba(0,0,0,.05)" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
              <p style={{ margin:0, fontSize:10, fontWeight:800, color:"#9CA3AF", fontFamily:QS, textTransform:"uppercase" as const, letterSpacing:0.5 }}>Status Timeline</p>
              {historyDesc.length>5 && (
                <button onClick={()=>setShowAllStatusHistory(true)} style={{ fontSize:10, fontWeight:700, color:"#9772F6", background:"none", border:"none", cursor:"pointer", fontFamily:QS, padding:0 }}>View All</button>
              )}
            </div>
            {recentHistory.map((h,i)=>renderHistoryItem(h, i, recentHistory))}
          </div>
          {showAllStatusHistory && (
            <div style={{ position:"fixed" as const, inset:0, background:"rgba(0,0,0,.5)", zIndex:410, display:"flex", flexDirection:"column" as const, justifyContent:"flex-end" }} onClick={()=>setShowAllStatusHistory(false)}>
              <div style={{ background:"#F7F8FC", borderRadius:"24px 24px 0 0", height:"85%", display:"flex", flexDirection:"column" as const }} onClick={e=>e.stopPropagation()}>
                <div style={{ padding:"18px 20px 14px", background:"white", borderRadius:"24px 24px 0 0", borderBottom:"1px solid #F3F4F6", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div>
                    <p style={{ margin:0, fontSize:15, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Status Timeline</p>
                    <p style={{ margin:"2px 0 0", fontSize:11, color:"#9CA3AF", fontFamily:IN }}>{historyDesc.length} total</p>
                  </div>
                  <button onClick={()=>setShowAllStatusHistory(false)} style={{ width:32, height:32, borderRadius:10, background:"#F3F4F6", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <X size={15} color="#6B7280"/>
                  </button>
                </div>
                <div style={{ overflowY:"auto" as const, scrollbarWidth:"none" as const, padding:"14px 20px 24px" }}>
                  {historyDesc.map((h,i)=>renderHistoryItem(h, i, historyDesc))}
                </div>
              </div>
            </div>
          )}
          {/* Landlord response */}
          {report.landlordResponse && (
            <div style={{ background:"#F0FDF4", borderRadius:16, padding:"12px 14px", marginBottom:12, border:"1px solid #BBF7D0" }}>
              <p style={{ margin:"0 0 6px", fontSize:10, fontWeight:800, color:"#16A34A", fontFamily:QS, textTransform:"uppercase" as const, letterSpacing:0.5 }}>Landlord Response</p>
              <p style={{ margin:"0 0 4px", fontSize:12, color:"#15803D", fontFamily:IN, lineHeight:1.6 }}>{report.landlordResponse}</p>
              <p style={{ margin:0, fontSize:9, color:"#86EFAC", fontFamily:IN }}>{report.landlordResponseDate}</p>
            </div>
          )}
          {/* Your own latest follow-up comment, if any */}
          {report.studentComment && (
            <div style={{ background:"#F5F0FF", borderRadius:16, padding:"12px 14px", marginBottom:12, border:"1px solid #DDD6FE" }}>
              <p style={{ margin:"0 0 6px", fontSize:10, fontWeight:800, color:"#7C3AED", fontFamily:QS, textTransform:"uppercase" as const, letterSpacing:0.5 }}>Your Comment</p>
              <p style={{ margin:"0 0 4px", fontSize:12, color:"#5B21B6", fontFamily:IN, lineHeight:1.6 }}>{report.studentComment}</p>
              <p style={{ margin:0, fontSize:9, color:"#C4B5FD", fontFamily:IN }}>{report.studentCommentDate}</p>
            </div>
          )}
          {/* Additional comment */}
          {(report.status==="in-progress"||report.status==="pending") && (
            <div style={{ background:"white", borderRadius:16, padding:"12px 14px", boxShadow:"0 2px 8px rgba(0,0,0,.05)" }}>
              <p style={{ margin:"0 0 7px", fontSize:11, fontWeight:800, color:"#374151", fontFamily:QS }}>Add Comment</p>
              <div style={{ background:"#F9FAFB", borderRadius:11, padding:"9px 12px", border:"1.5px solid #E5E7EB", marginBottom:9 }}>
                <textarea value={comment} onChange={e=>{ setComment(e.target.value); if (commentError) setCommentError(""); }} placeholder="Add more information if needed..." rows={3} style={{ width:"100%", background:"none", border:"none", outline:"none", fontSize:12, fontFamily:IN, color:"#1F2937", resize:"none" as const, boxSizing:"border-box" as const }}/>
              </div>
              {commentError && <p style={{ margin:"-2px 0 9px", fontSize:11, color:"#EF4444", fontFamily:IN }}>{commentError}</p>}
              {/* Only appears once there's actually something typed, same as the landlord's
                  Confirm Update button — no button sitting there inviting an empty-comment tap. */}
              {(comment.trim() !== "" || sendingComment) && (
                <button onClick={handleSendComment} disabled={!comment.trim() || sendingComment} style={{ width:"100%", height:40, borderRadius:14, backgroundImage:GRAD, border:"none", cursor:(!comment.trim()||sendingComment)?"default":"pointer", opacity:(!comment.trim()||sendingComment)?0.6:1, fontSize:12, fontWeight:800, color:"white", fontFamily:QS }}>{sendingComment ? "Sending…" : "Send Comment"}</button>
              )}
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
  const [selAnn, setSelAnn]     = useState<MyAnnouncement|null>(null);
  // Real per-user read state (0043_announcement_reads.sql) — was in-memory-only before,
  // so a refresh made every already-read announcement look unread again.
  const [readIds, setReadIds]   = useState<string[]>([]);
  useEffect(() => { getMyReadAnnouncementIds().then(setReadIds); }, []);
  const [announcements, setAnnouncements] = useState<MyAnnouncement[]>([]);
  useEffect(() => { getMyAnnouncements("students").then(setAnnouncements); }, []);
  const [showSubmitReport, setShowSubmitReport] = useState(false);
  const [selectedReport, setSelectedReport]     = useState<StudentReport|null>(null);
  const [showAllActivity, setShowAllActivity]   = useState(false);
  const [showAllReports, setShowAllReports]     = useState(false);
  const [showAllAnnouncements, setShowAllAnnouncements] = useState(false);
  const [reports, setReports]                   = useState<StudentReport[]>([]);
  const refreshReports = () => { getMyReports().then(setReports); };
  useEffect(() => { refreshReports(); }, []);

  // Sends the student's follow-up comment, refreshes the report list, and re-points
  // `selectedReport` at the fresh copy so the open modal shows it immediately instead of
  // needing a re-open. Also nudges the landlord (and any linked parents) — same
  // notify-on-dashboard pattern as a status update — so the comment doesn't disappear
  // into a report the landlord has no reason to reopen.
  const handleAddComment = async (reportId: string, note: string) => {
    const res = await addReportComment(reportId, note);
    if (res.ok === false) return res;
    const fresh = await getMyReports();
    setReports(fresh);
    const updated = fresh.find(r => r.id === reportId);
    if (updated) setSelectedReport(updated);
    if (BH_DATA.id) {
      notifyLandlordOfBoardingHouse(BH_DATA.id, {
        type: "report", title: "New Comment on Concern",
        description: `${updated?.studentName ?? "A student"} added a comment on "${updated?.title ?? "a concern"}."`,
        destination: "dashboard", relatedId: reportId,
      });
    }
    if (updated?.submitterId) {
      notifyLinkedParents(updated.submitterId, {
        type: "report", title: "New Comment on Concern",
        description: `${updated.studentName} added a comment on "${updated.title}."`,
        destination: "dashboard", relatedId: reportId,
      });
    }
    return { ok: true as const };
  };

  // Real Activity Timeline — every real event across every report the student has submitted
  // (their own submission, plus each real landlord response/status change), flattened across
  // reports and sorted by actual timestamp (not the pre-formatted display string, which drops
  // the year and can't sort correctly on its own).
  const activityFeed = reports
    .flatMap(r => r.statusHistory.map(h => ({
      at: h.at,
      time: h.date,
      msg: h.status === "pending"
        ? `Submitted a concern: "${r.title}"`
        : h.note
        ? `Landlord responded to "${r.title}" — now ${STATUS_META[h.status].label}`
        : `"${r.title}" is now ${STATUS_META[h.status].label}`,
      Icon: h.status === "pending" ? Flag : h.status === "resolved" ? CheckCircle : h.status === "closed" ? Check : Eye,
      color: STATUS_META[h.status].color,
    })))
    .sort((a, b) => b.at - a.at);
  const notifCount = useUnreadCount("student");
  const chatCount = useUnreadChatCount("student");

  // Real signed-in student + their current boarding-house assignment.
  const [myProfile, setMyProfile] = useState<MyStudentProfile>(EMPTY_PROFILE);
  const [myAssignment, setMyAssignment] = useState<MyAssignment>(EMPTY_ASSIGNMENT);
  useEffect(() => {
    let active = true;
    Promise.all([getMyProfile(), getMyAssignment()]).then(([profile, assignment]) => {
      if (!active) return;
      if (profile) setMyProfile(profile);
      if (assignment) setMyAssignment(assignment);
    });
    return () => { active = false; };
  }, []);
  const STUDENT_DATA = myProfile;
  const BH_DATA = myAssignment.bh;
  const ROOM_DATA = myAssignment.room;
  const STAY_DATA = myAssignment.stay;

  const [billing, setBilling] = useState<BillingSummary>(EMPTY_BILLING);
  useEffect(() => { getMyBillingSummary().then(b => { if (b) setBilling(b); }); }, []);
  const BILLING_DATA = billing;

  // ── Visitor Records — only a real feature once the landlord has turned it on
  // for this boarding house (visitor_log_enabled + visitor_fields, read via
  // getMyVisitorConfig). The landlord's own logbook (App.tsx) was fed by a
  // permanently-empty mock with nowhere for either role to actually create a
  // record — this is that missing submission flow.
  const [visitorConfig, setVisitorConfig] = useState(EMPTY_VISITOR_CONFIG);
  useEffect(() => { getMyVisitorConfig().then(setVisitorConfig); }, []);
  const [myVisitors, setMyVisitors] = useState<MyVisitorRecord[]>([]);
  const refreshMyVisitors = () => { getMyVisitorRecords().then(setMyVisitors); };
  useEffect(() => { if (visitorConfig.enabled) refreshMyVisitors(); }, [visitorConfig.enabled]);
  const [showVisitorForm, setShowVisitorForm] = useState(false);
  const [showAllVisitors, setShowAllVisitors] = useState(false);
  const [highlightedVisitorId, setHighlightedVisitorId] = useState<string | null>(null);
  // Set to open the "mark as left" time picker for that record; cleared on cancel or
  // once it succeeds. Separate from editingVisitor below — one edits the visit's own
  // details, the other only ever changes status + time_out.
  const [markingLeftVisitor, setMarkingLeftVisitor] = useState<MyVisitorRecord | null>(null);
  // A student who forgot to fill something in when they first logged a visitor (or
  // just wants to fix it) can reopen the same form pre-filled — but only while the
  // visitor is still "inside"; once marked left the record is history, not
  // something to keep editing, so a tap opens a read-only detail view instead.
  const [editingVisitor, setEditingVisitor] = useState<MyVisitorRecord | null>(null);
  const [viewingVisitor, setViewingVisitor] = useState<MyVisitorRecord | null>(null);
  const handleMarkVisitorLeft = async (record: MyVisitorRecord, timeOut: Date): Promise<{ ok: true } | { ok: false; error: string }> => {
    const res = await markVisitorLeft(record.id, timeOut);
    refreshMyVisitors();
    // A separate notification from "New Visitor Logged" — this direction goes
    // student → landlord, fired only once the mark-as-left actually succeeds.
    if (res.ok !== false && visitorConfig.bhId) {
      const who = record.visitorName || "A visitor";
      notifyLandlordOfBoardingHouse(visitorConfig.bhId, {
        type: "visitor", title: "Visitor Has Left",
        description: ROOM_DATA.name ? `${who} has left (${ROOM_DATA.name}).` : `${who} has left.`,
        destination: "dashboard", relatedId: record.id,
      });
    }
    return res;
  };
  // Shared between the homepage list (inside-only) and the "View Visitors" modal
  // (every record) so the card markup isn't duplicated between the two. Also used
  // to scroll-to-and-highlight the specific record a "visitor" notification (logged
  // or left) deep-links to — see the pendingDeepLink effect below.
  const visitorRowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const renderVisitorRow = (v: MyVisitorRecord, i: number, arr: MyVisitorRecord[]) => {
    const highlighted = highlightedVisitorId === v.id;
    const isLeft = v.status === "left";
    return (
    <div key={v.id} ref={el=>{ visitorRowRefs.current[v.id] = el; }}
      onClick={isLeft ? () => setViewingVisitor(v) : undefined}
      style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 16px", borderBottom: i<arr.length-1 ? "1px solid #F3F4F6" : "none", background: highlighted ? "#F5F0FF" : "transparent", boxShadow: highlighted ? "inset 0 0 0 2px #9772F6" : "none", transition:"background .3s, box-shadow .3s", cursor: isLeft ? "pointer" : "default" }}>
      <div style={{ width:34, height:34, borderRadius:12, background:"#FCE7F3", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        <UserCheck size={15} color="#EC4899"/>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ margin:0, fontSize:12, fontWeight:800, color:"#1F2937", fontFamily:QS }}>{v.visitorName || "Visitor"}</p>
        <p style={{ margin:0, fontSize:10, color:"#9CA3AF", fontFamily:IN }}>{loggedLabel(v.ts)} · In: {v.timeIn}{v.timeOut ? ` · Out: ${v.timeOut}` : ""}</p>
      </div>
      {/* Editing (and "Mark Left") only makes sense while the visitor is still here —
          once they've left, the record is history: tap the row to view it instead
          (onClick above), not edit it. */}
      {isLeft ? (
        <>
          <span style={{ fontSize:9, fontWeight:800, padding:"3px 9px", borderRadius:20, background:"#F3F4F6", color:"#6B7280", fontFamily:QS, flexShrink:0 }}>Left</span>
          <ChevronRight size={14} color="#D1D5DB" style={{ flexShrink:0 }}/>
        </>
      ) : (
        <>
          <button onClick={()=>setEditingVisitor(v)} title="Edit" style={{ width:26, height:26, borderRadius:9, background:"#F3F4F6", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <Pencil size={12} color="#6B7280"/>
          </button>
          <button onClick={()=>setMarkingLeftVisitor(v)} style={{ padding:"6px 12px", borderRadius:10, background:"#F3F4F6", color:"#6B7280", fontSize:10, fontWeight:800, border:"none", cursor:"pointer", fontFamily:QS, flexShrink:0 }}>
            Mark Left
          </button>
        </>
      )}
    </div>
    );
  };

  // Pending parent-link requests awaiting this student's approval (Phase 9 —
  // a parent's sign-up only creates a `pending` row; it only becomes a real
  // link once approved here).
  const [linkRequests, setLinkRequests] = useState<ParentLinkRequest[]>([]);
  const [linkBusy, setLinkBusy] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    getMyPendingParentLinkRequests().then(rs => { if (active) setLinkRequests(rs); });
    return () => { active = false; };
  }, []);
  const handleApproveLink = async (id: string) => {
    setLinkBusy(id);
    const res = await approveParentLink(id);
    if (res.ok === false) console.error("approveParentLink failed:", res.error);
    else setLinkRequests(rs => rs.filter(r => r.id !== id));
    setLinkBusy(null);
  };
  const handleRejectLink = async (id: string) => {
    setLinkBusy(id);
    const res = await rejectParentLink(id);
    if (res.ok === false) console.error("rejectParentLink failed:", res.error);
    else setLinkRequests(rs => rs.filter(r => r.id !== id));
    setLinkBusy(null);
  };

  // Opened from a "Report" notification — jump straight to that report. Re-checks as
  // `reports` loads in since that's async — only consumed once actually found, so a fast
  // tap right after navigating here doesn't miss the match and silently strand on the
  // home screen.
  useEffect(() => {
    if (pendingDeepLink?.type !== "report" || !pendingDeepLink.relatedId) return;
    const match = reports.find(r => r.id === pendingDeepLink.relatedId);
    if (match) { setSelectedReport(match); onDeepLinkConsumed?.(); }
  }, [pendingDeepLink, reports, onDeepLinkConsumed]);

  // Opened from an "Announcement" notification (e.g. a landlord posting one from their
  // Announcements & Schedule planner) — jump straight to that announcement's detail modal.
  useEffect(() => {
    if (pendingDeepLink?.type !== "announcement" || !pendingDeepLink.relatedId) return;
    const match = announcements.find(a => a.id === pendingDeepLink.relatedId);
    if (match) { setSelAnn(match); onDeepLinkConsumed?.(); }
  }, [pendingDeepLink, announcements, onDeepLinkConsumed]);

  // Opened from a "New Visitor Logged" or "Visitor Has Left" notification — both share
  // type "visitor", so this handles either the same way: open "View Visitors" (the one
  // place every record, inside or already left, is always listed) and briefly highlight
  // the specific one. myVisitors loads asynchronously, so this re-checks as it arrives.
  useEffect(() => {
    if (pendingDeepLink?.type !== "visitor" || !pendingDeepLink.relatedId) return;
    const match = myVisitors.find(v => v.id === pendingDeepLink.relatedId);
    if (!match) return;
    setShowAllVisitors(true);
    setHighlightedVisitorId(match.id);
    requestAnimationFrame(() => visitorRowRefs.current[match.id]?.scrollIntoView({ behavior: "smooth", block: "center" }));
    onDeepLinkConsumed?.();
  }, [pendingDeepLink, myVisitors, onDeepLinkConsumed]);
  useEffect(() => {
    if (!highlightedVisitorId) return;
    const t = setTimeout(() => setHighlightedVisitorId(null), 4000);
    return () => clearTimeout(t);
  }, [highlightedVisitorId]);

  const hour = new Date().getHours();
  const greeting = hour<12 ? "Good morning" : hour<18 ? "Good afternoon" : "Good evening";
  const todayStr = new Date().toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" });
  const psm = payStatusMeta(BILLING_DATA.status);
  const bsm = bhStatusMeta(BH_DATA.status);
  const occupancyPct = ROOM_DATA.capacity > 0 ? Math.round((ROOM_DATA.occupied/ROOM_DATA.capacity)*100) : 0;
  const stayPct = STAY_DATA.totalDays ? Math.round((STAY_DATA.daysStayed/STAY_DATA.totalDays)*100) : 0;
  const unreadCount = announcements.filter(a=>!readIds.includes(a.id)).length;

  // Any announcement whose event (not post) date is today — e.g. a landlord's
  // scheduled highlight — gets its own card in Today's Overview below, sorted by
  // time so multiple same-day ones read in chronological order (untimed ones,
  // if any, sort after timed ones rather than breaking the order).
  // `.toISOString()` would report the date in UTC, not the student's local calendar
  // day — for a timezone ahead of UTC (e.g. Philippines, UTC+8, where this app is
  // actually used) that's silently *yesterday's* date for the first several hours
  // of every local day, which would make a same-day announcement fail to show up
  // for exactly that window.
  const now = new Date();
  const todayISO = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
  const todaysAnnouncements = announcements
    .filter(a => a.eventDate === todayISO)
    .sort((a,b) => (a.eventTime ?? "99:99").localeCompare(b.eventTime ?? "99:99"));
  const fmtEventTime = (t: string) => {
    const [h,m] = t.split(":").map(Number);
    const ap = h>=12 ? "PM" : "AM";
    const h12 = h===0 ? 12 : h>12 ? h-12 : h;
    return `${h12}:${String(m).padStart(2,"0")} ${ap}`;
  };

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

        {/* ── Parent Link Requests ─────────────────────────────────────────── */}
        {linkRequests.length > 0 && (
          <div style={{ padding:"16px 16px 0" }}>
            <p style={{ fontSize:15, fontWeight:800, color:"#1F2937", margin:"0 0 10px", fontFamily:QS }}>Parent Link Requests</p>
            <div style={{ background:"white", borderRadius:20, overflow:"hidden", boxShadow:"0 2px 10px rgba(0,0,0,.05)", marginBottom:16 }}>
              {linkRequests.map((r,i)=>{
                const busy = linkBusy === r.id;
                return (
                  <div key={r.id} style={{ padding:"14px 16px", borderBottom:i<linkRequests.length-1?"1px solid #F3F4F6":"none" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                      <div style={{ width:38, height:38, borderRadius:13, backgroundImage:GRAD, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <UserCheck size={17} color="white"/>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:13, fontWeight:800, color:"#1F2937", margin:0, fontFamily:QS }}>{r.parentName}</p>
                        <p style={{ fontSize:10, color:"#9CA3AF", margin:0, fontFamily:IN }}>Wants to link as your {r.relation.toLowerCase()} · {r.contact}</p>
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:8 }}>
                      <button onClick={()=>handleApproveLink(r.id)} disabled={busy} style={{ flex:1, padding:"9px 0", borderRadius:12, background:"#DCFCE7", color:"#16A34A", fontSize:12, fontWeight:800, border:"none", cursor:busy?"default":"pointer", opacity:busy?0.6:1, fontFamily:QS, display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}><Check size={13}/> {busy?"Working…":"Approve"}</button>
                      <button onClick={()=>handleRejectLink(r.id)} disabled={busy} style={{ flex:1, padding:"9px 0", borderRadius:12, background:"#FEE2E2", color:"#EF4444", fontSize:12, fontWeight:800, border:"none", cursor:busy?"default":"pointer", opacity:busy?0.6:1, fontFamily:QS, display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}><X size={13}/> Decline</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Today's Overview ─────────────────────────────────────────────── */}
        <div style={{ padding:"16px 16px 0" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
            <p style={{ fontSize:15, fontWeight:800, color:"#1F2937", margin:0, fontFamily:QS }}>Today's Overview</p>
            <span style={{ fontSize:11, color:"#9CA3AF", fontFamily:IN }}>{todayStr}</span>
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
              {/* Today's announcements — anything the landlord scheduled for today (a
                  posted date, not just when it was published), sorted by time above. */}
              {todaysAnnouncements.map(ann => {
                const isRead = readIds.includes(ann.id);
                return (
                  <div key={ann.id} onClick={()=>setSelAnn(ann)} style={{ flexShrink:0, width:162, background:"#F9FAFB", borderRadius:18, padding:"14px 13px 13px", borderTop:"3px solid #9772F6", display:"flex", flexDirection:"column" as const, cursor:"pointer", position:"relative" as const }}>
                    <div style={{ width:34, height:34, borderRadius:11, background:"#9772F6", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:10 }}>
                      <Megaphone size={16} color="white"/>
                    </div>
                    <p style={{ margin:"0 0 2px", fontSize:11, fontWeight:800, color:"#6B7280", fontFamily:QS, textTransform:"uppercase" as const, letterSpacing:.5 }}>Announcement</p>
                    <p style={{ margin:"0 0 8px", fontSize:13, fontWeight:800, color:"#1F2937", fontFamily:QS, lineHeight:1.35, overflow:"hidden", textOverflow:"ellipsis", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" as const }}>{ann.title}</p>
                    {ann.eventTime ? (
                      <span style={{ fontSize:9, fontWeight:800, color:"#9772F6", fontFamily:QS }}>{fmtEventTime(ann.eventTime)}</span>
                    ) : (
                      <span style={{ fontSize:9, fontWeight:800, color:"#9772F6", fontFamily:QS }}>Today</span>
                    )}
                    {!isRead && <div style={{ position:"absolute" as const, top:10, right:10, width:7, height:7, borderRadius:"50%", background:"#EF4444" }}/>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Recent Announcements — only the 3 most recent; "View All" opens every
             one in a modal instead of this list growing without end. ──────────── */}
        {(() => {
          const recentAnnouncements = announcements.slice(0,3);
          const renderAnnCard = (ann: MyAnnouncement, i: number, arr: MyAnnouncement[], onClick: () => void) => {
            const isRead = readIds.includes(ann.id);
            return (
              <div key={ann.id} onClick={onClick} style={{ padding:"14px 16px", borderBottom:i<arr.length-1?"1px solid #F3F4F6":"none", cursor:"pointer" }}>
                <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                  {/* Priority is no longer a real, landlord-set concept — no priority-driven
                      color or badge here anymore, just a fixed brand-purple treatment. */}
                  <div style={{ width:38, height:38, borderRadius:12, background:"#F5F0FF", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, opacity:isRead?.7:1 }}>
                    <Megaphone size={16} color="#9772F6"/>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3 }}>
                      <p style={{ margin:0, fontSize:13, fontWeight:800, color:isRead?"#9CA3AF":"#1F2937", fontFamily:QS }}>{ann.title}</p>
                      {!isRead && <div style={{ width:7, height:7, borderRadius:"50%", background:"#9772F6", flexShrink:0 }}/>}
                    </div>
                    <p style={{ margin:"0 0 6px", fontSize:11, color:"#6B7280", fontFamily:IN, lineHeight:1.4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" as const }}>{ann.desc}</p>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:10, color:"#9CA3AF", fontFamily:IN }}>{ann.date}</span>
                      {isRead && <span style={{ fontSize:9, color:"#9CA3AF", fontFamily:IN, display:"inline-flex", alignItems:"center", gap:3 }}><Check size={9}/> Read</span>}
                    </div>
                  </div>
                  <ChevronRight size={14} color="#D1D5DB" style={{ flexShrink:0, marginTop:2 }}/>
                </div>
              </div>
            );
          };
          return (
            <div id="ann-sec" style={{ padding:"0 16px 0" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <p style={{ fontSize:15, fontWeight:800, color:"#1F2937", margin:0, fontFamily:QS }}>Announcements</p>
                  {unreadCount>0 && <span style={{ fontSize:10, fontWeight:800, padding:"2px 8px", borderRadius:20, backgroundImage:GRAD, color:"white", fontFamily:QS }}>{unreadCount} new</span>}
                </div>
                {announcements.length>3 ? (
                  <button onClick={()=>setShowAllAnnouncements(true)} style={{ fontSize:11, fontWeight:700, color:"#9772F6", background:"none", border:"none", cursor:"pointer", fontFamily:QS, padding:0 }}>View All</button>
                ) : (
                  <span style={{ fontSize:11, color:"#9CA3AF", fontFamily:IN }}>View only</span>
                )}
              </div>
              <p style={{ fontSize:11, color:"#9CA3AF", margin:"2px 0 12px", fontFamily:IN }}>Posted by {BH_DATA.landlord}</p>
              <div style={{ background:"white", borderRadius:20, overflow:"hidden", boxShadow:"0 2px 10px rgba(0,0,0,.05)", marginBottom:16 }}>
                {recentAnnouncements.length === 0 && (
                  <div style={{ padding:"22px 16px", textAlign:"center" as const }}>
                    <p style={{ margin:0, fontSize:12, color:"#9CA3AF", fontFamily:IN }}>No announcements yet.</p>
                  </div>
                )}
                {recentAnnouncements.map((ann,i)=>renderAnnCard(ann, i, recentAnnouncements, ()=>setSelAnn(ann)))}
              </div>
              {showAllAnnouncements && (
                <div style={{ position:"fixed" as const, inset:0, background:"rgba(0,0,0,.5)", zIndex:90, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }} onClick={()=>setShowAllAnnouncements(false)}>
                  <div style={{ background:"#F7F8FC", borderRadius:24, width:"100%", maxWidth:400, maxHeight:"80%", display:"flex", flexDirection:"column" as const, boxShadow:"0 24px 60px rgba(0,0,0,.25)" }} onClick={e=>e.stopPropagation()}>
                    <div style={{ padding:"18px 20px 14px", background:"white", borderRadius:"24px 24px 0 0", borderBottom:"1px solid #F3F4F6", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                      <div>
                        <p style={{ margin:0, fontSize:15, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Announcements</p>
                        <p style={{ margin:"2px 0 0", fontSize:11, color:"#9CA3AF", fontFamily:IN }}>{announcements.length} total</p>
                      </div>
                      <button onClick={()=>setShowAllAnnouncements(false)} style={{ width:32, height:32, borderRadius:10, background:"#F3F4F6", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <X size={15} color="#6B7280"/>
                      </button>
                    </div>
                    <div style={{ overflowY:"auto" as const, scrollbarWidth:"none" as const }}>
                      {announcements.map((ann,i)=>renderAnnCard(ann, i, announcements, ()=>{ setShowAllAnnouncements(false); setSelAnn(ann); }))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ── Report a Concern — "My Reports" no longer sits on the home page as its
             own section; it's reachable from here via "View Reports" instead, opening
             the same list in a modal. */}
        <div style={{ padding:"0 16px 0" }}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:4 }}>
            <div>
              <p style={{ fontSize:15, fontWeight:800, color:"#1F2937", margin:0, fontFamily:QS }}>Report a Concern</p>
              <p style={{ fontSize:11, color:"#9CA3AF", margin:"2px 0 12px", fontFamily:IN }}>Report issues directly to your landlord.</p>
            </div>
            {reports.length>0 && (
              <button onClick={()=>setShowAllReports(true)} style={{ fontSize:11, fontWeight:700, color:"#9772F6", background:"none", border:"none", cursor:"pointer", fontFamily:QS, padding:0, marginTop:2, flexShrink:0 }}>View Reports</button>
            )}
          </div>
          <div style={{ background:"white", borderRadius:20, overflow:"hidden", boxShadow:"0 2px 10px rgba(0,0,0,.05)", marginBottom:16 }}>
            <div style={{ padding:"14px 16px 4px", display:"flex", gap:10 }}>
              {[
                { Icon:Wrench,     label:"Maintenance" },
                { Icon:Zap,        label:"Electrical" },
                { Icon:ShowerHead, label:"Bathroom" },
                { Icon:Wifi,       label:"Internet" },
              ].map(({ Icon, label })=>(
                <button key={label} onClick={()=>setShowSubmitReport(true)} style={{ flex:1, background:"#F9FAFB", border:"1px solid #F3F4F6", borderRadius:14, padding:"10px 4px", cursor:"pointer", display:"flex", flexDirection:"column" as const, alignItems:"center", gap:4 }}>
                  <Icon size={17} color="#9772F6"/>
                  <span style={{ fontSize:9, fontWeight:800, color:"#374151", fontFamily:QS }}>{label}</span>
                </button>
              ))}
            </div>
            <div style={{ padding:"14px 16px 16px" }}>
              <button onClick={()=>setShowSubmitReport(true)} style={{ width:"100%", height:44, borderRadius:16, backgroundImage:GRAD, border:"none", cursor:"pointer", fontSize:13, fontWeight:800, color:"white", fontFamily:QS, boxShadow:"0 4px 14px rgba(151,114,246,.3)", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                Submit New Concern
              </button>
            </div>
          </div>
        </div>

        {/* ── Visitor Records — only shown once the landlord has enabled it for this
             boarding house. The homepage only ever shows visitors still marked
             "inside" (uncapped — a student with several visitors at once should see
             all of them, not just 3); anyone already marked "left" drops off this
             list entirely and only lives on in "View Visitors", which lists every
             record regardless of status. */}
        {visitorConfig.enabled && visitorConfig.bhId && (() => {
          const insideVisitors = myVisitors.filter(v => v.status === "inside");
          return (
            <div style={{ padding:"0 16px 0" }}>
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:4 }}>
                <div>
                  <p style={{ fontSize:15, fontWeight:800, color:"#1F2937", margin:0, fontFamily:QS }}>Visitor Records</p>
                  <p style={{ fontSize:11, color:"#9CA3AF", margin:"2px 0 12px", fontFamily:IN }}>Log a visitor so your landlord knows who's coming.</p>
                </div>
                {myVisitors.length>0 && (
                  <button onClick={()=>setShowAllVisitors(true)} style={{ fontSize:11, fontWeight:700, color:"#9772F6", background:"none", border:"none", cursor:"pointer", fontFamily:QS, padding:0, marginTop:2, flexShrink:0 }}>View Visitors</button>
                )}
              </div>
              <div style={{ background:"white", borderRadius:20, overflow:"hidden", boxShadow:"0 2px 10px rgba(0,0,0,.05)", marginBottom:16 }}>
                {insideVisitors.length === 0 ? (
                  <div style={{ padding:"18px 16px", textAlign:"center" as const }}>
                    <span style={{ fontSize:12, color:"#9CA3AF", fontFamily:IN }}>No visitor currently inside.</span>
                  </div>
                ) : insideVisitors.map(renderVisitorRow)}
                <div style={{ padding:"14px 16px 16px" }}>
                  <button onClick={()=>setShowVisitorForm(true)} style={{ width:"100%", height:44, borderRadius:16, backgroundImage:GRAD, border:"none", cursor:"pointer", fontSize:13, fontWeight:800, color:"white", fontFamily:QS, boxShadow:"0 4px 14px rgba(151,114,246,.3)", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                    Log a Visitor
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── Recent Activity — only the 5 most recent here; "View All" opens every
             entry in a modal instead of this list growing without end. ──────── */}
        {(() => {
          const recentActivity = activityFeed.slice(0,5);
          return (
            <div style={{ padding:"0 16px 28px" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                <p style={{ fontSize:15, fontWeight:800, color:"#1F2937", margin:0, fontFamily:QS }}>Recent Activity</p>
                {activityFeed.length>5 && (
                  <button onClick={()=>setShowAllActivity(true)} style={{ fontSize:11, fontWeight:700, color:"#9772F6", background:"none", border:"none", cursor:"pointer", fontFamily:QS, padding:0 }}>View All</button>
                )}
              </div>
              <div style={{ background:"white", borderRadius:20, overflow:"hidden", boxShadow:"0 2px 10px rgba(0,0,0,.05)" }}>
                {recentActivity.length === 0 && (
                  <div style={{ padding:"22px 16px", textAlign:"center" as const }}>
                    <span style={{ fontSize:12, color:"#9CA3AF", fontFamily:IN }}>No activity yet.</span>
                  </div>
                )}
                {recentActivity.map((a,i)=>(
                  <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"14px 16px", borderBottom:i<recentActivity.length-1?"1px solid #F3F4F6":"none", position:"relative" as const }}>
                    {i<recentActivity.length-1 && <div style={{ position:"absolute" as const, left:28, top:46, bottom:0, width:1.5, background:"#F3F4F6", zIndex:0 }}/>}
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
          );
        })()}
      </div>

      {selAnn   && <AnnouncementModal ann={selAnn} isRead={readIds.includes(selAnn.id)} onMarkRead={()=>{ setReadIds(p=>[...p,selAnn.id]); markAnnouncementRead(selAnn.id); }} onClose={()=>setSelAnn(null)} landlordName={BH_DATA.landlord}/>}
      {showSubmitReport && <SubmitReportModal onClose={()=>setShowSubmitReport(false)} onSubmitted={refreshReports} bhName={BH_DATA.name} roomName={ROOM_DATA.name} bedName={ROOM_DATA.bed}/>}
      {showVisitorForm && visitorConfig.bhId && <VisitorFormModal onClose={()=>setShowVisitorForm(false)} onSubmitted={refreshMyVisitors} bhId={visitorConfig.bhId} fields={visitorConfig.fields} bhName={BH_DATA.name} roomName={ROOM_DATA.name}/>}
      {editingVisitor && visitorConfig.bhId && <VisitorFormModal onClose={()=>setEditingVisitor(null)} onSubmitted={refreshMyVisitors} bhId={visitorConfig.bhId} fields={visitorConfig.fields} bhName={BH_DATA.name} roomName={ROOM_DATA.name} editRecord={editingVisitor}/>}
      {markingLeftVisitor && (
        <MarkVisitorLeftModal
          record={markingLeftVisitor}
          onClose={()=>setMarkingLeftVisitor(null)}
          onConfirm={async (timeOut) => {
            const res = await handleMarkVisitorLeft(markingLeftVisitor, timeOut);
            if (res.ok !== false) setMarkingLeftVisitor(null);
            return res;
          }}
        />
      )}
      {viewingVisitor && <VisitorDetailModal record={viewingVisitor} fields={visitorConfig.fields} onClose={()=>setViewingVisitor(null)}/>}
      {selectedReport   && <ReportDetailModal report={selectedReport} onClose={()=>setSelectedReport(null)} onAddComment={handleAddComment}/>}
      {showAllReports && (
        <div style={{ position:"fixed" as const, inset:0, background:"rgba(0,0,0,.5)", zIndex:90, display:"flex", flexDirection:"column" as const, justifyContent:"flex-end" }} onClick={()=>setShowAllReports(false)}>
          <div style={{ background:"#F7F8FC", borderRadius:"24px 24px 0 0", height:"92%", display:"flex", flexDirection:"column" as const }} onClick={e=>e.stopPropagation()}>
            <div style={{ padding:"18px 20px 14px", background:"white", borderRadius:"24px 24px 0 0", borderBottom:"1px solid #F3F4F6", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <p style={{ margin:0, fontSize:15, fontWeight:800, color:"#1F2937", fontFamily:QS }}>My Reports</p>
                <p style={{ margin:"2px 0 0", fontSize:11, color:"#9CA3AF", fontFamily:IN }}>{reports.length} total</p>
              </div>
              <button onClick={()=>setShowAllReports(false)} style={{ width:32, height:32, borderRadius:10, background:"#F3F4F6", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <X size={15} color="#6B7280"/>
              </button>
            </div>
            <div style={{ overflowY:"auto" as const, scrollbarWidth:"none" as const, padding:"12px 20px 24px" }}>
              {reports.map(r => {
                const cm = CATEGORY_META[r.category];
                const sm = STATUS_META[r.status];
                return (
                  <div key={r.id} onClick={()=>{ setShowAllReports(false); setSelectedReport(r); }} style={{ background:"white", borderRadius:18, padding:"14px 16px", boxShadow:"0 2px 10px rgba(0,0,0,.06)", cursor:"pointer", borderLeft:`4px solid ${cm.color}`, marginBottom:10 }}>
                    <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", gap:5, marginBottom:5, flexWrap:"wrap" as const }}>
                          <span style={{ fontSize:9, fontWeight:800, padding:"2px 8px", borderRadius:20, background:sm.bg, color:sm.color, fontFamily:QS, display:"flex", alignItems:"center", gap:3 }}>
                            <div style={{ width:4, height:4, borderRadius:"50%", background:sm.dot }}/>{sm.label}
                          </span>
                          <span style={{ fontSize:9, fontWeight:800, padding:"2px 8px", borderRadius:20, background:cm.bg, color:cm.color, fontFamily:QS }}>{cm.label}</span>
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
        </div>
      )}
      {showAllVisitors && (
        <div style={{ position:"fixed" as const, inset:0, background:"rgba(0,0,0,.5)", zIndex:90, display:"flex", flexDirection:"column" as const, justifyContent:"flex-end" }} onClick={()=>setShowAllVisitors(false)}>
          <div style={{ background:"#F7F8FC", borderRadius:"24px 24px 0 0", height:"92%", display:"flex", flexDirection:"column" as const }} onClick={e=>e.stopPropagation()}>
            <div style={{ padding:"18px 20px 14px", background:"white", borderRadius:"24px 24px 0 0", borderBottom:"1px solid #F3F4F6", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <p style={{ margin:0, fontSize:15, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Visitor Records</p>
                <p style={{ margin:"2px 0 0", fontSize:11, color:"#9CA3AF", fontFamily:IN }}>{myVisitors.length} total</p>
              </div>
              <button onClick={()=>setShowAllVisitors(false)} style={{ width:32, height:32, borderRadius:10, background:"#F3F4F6", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <X size={15} color="#6B7280"/>
              </button>
            </div>
            <div style={{ flex:1, overflowY:"auto" as const, scrollbarWidth:"none" as const, padding:"14px 20px 24px" }}>
              {myVisitors.length === 0 ? (
                <div style={{ textAlign:"center" as const, paddingTop:40 }}>
                  <UserCheck size={36} color="#D1D5DB"/>
                  <p style={{ fontSize:13, color:"#9CA3AF", marginTop:10, fontFamily:IN }}>No visitor records yet.</p>
                </div>
              ) : (
                <div style={{ background:"white", borderRadius:20, overflow:"hidden", boxShadow:"0 2px 10px rgba(0,0,0,.05)" }}>
                  {myVisitors.map(renderVisitorRow)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {showAllActivity && (
        <div style={{ position:"fixed" as const, inset:0, background:"rgba(0,0,0,.5)", zIndex:90, display:"flex", flexDirection:"column" as const, justifyContent:"flex-end" }} onClick={()=>setShowAllActivity(false)}>
          <div style={{ background:"#F7F8FC", borderRadius:"24px 24px 0 0", maxHeight:"85%", display:"flex", flexDirection:"column" as const }} onClick={e=>e.stopPropagation()}>
            <div style={{ padding:"18px 20px 14px", background:"white", borderRadius:"24px 24px 0 0", borderBottom:"1px solid #F3F4F6", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <p style={{ margin:0, fontSize:15, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Recent Activity</p>
                <p style={{ margin:"2px 0 0", fontSize:11, color:"#9CA3AF", fontFamily:IN }}>{activityFeed.length} total</p>
              </div>
              <button onClick={()=>setShowAllActivity(false)} style={{ width:32, height:32, borderRadius:10, background:"#F3F4F6", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <X size={15} color="#6B7280"/>
              </button>
            </div>
            <div style={{ overflowY:"auto" as const, scrollbarWidth:"none" as const, padding:"12px 20px 24px" }}>
              {activityFeed.map((a,i)=>(
                <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"12px 0", borderBottom:i<activityFeed.length-1?"1px solid #F3F4F6":"none", position:"relative" as const }}>
                  <div style={{ width:28, height:28, borderRadius:10, background:a.color+"18", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
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
      )}
    </div>
  );
}
