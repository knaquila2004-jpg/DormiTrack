import React, { useState, useEffect, useRef } from "react";
import {
  Users, Home, ChevronRight, X, Phone, BookOpen,
  GraduationCap, Calendar, Building2, MapPin, User, Bed,
  Info, Shield, Mail, Wifi, Droplet, Zap, Utensils, Star,
  Shirt, Car, CheckCircle, AlertCircle, Clock, Maximize2, Pencil, ChevronLeft,
  ArrowRightLeft,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { getMyProfile, getMyAssignment, MyStudentProfile, MyAssignment, MyBoardingHouse, MyRoom, MyStay } from "./studentAssignmentStore";
import { getRoommates, getOccupantStatusUpdate, OccupantStatusUpdate, getAvailableBedsForTransfer, AvailableBed } from "./registrationStore";
import { GoogleMapCanvas } from "./components/GoogleMapCanvas";
import { FullScreenBHMap } from "./components/FullScreenBHMap";
import { notifyLandlordOfBoardingHouse, NotificationType } from "./notificationStore";
import {
  getMyCurrentStayRaw, getMyPendingStayChangeRequest, submitStayChangeRequest,
  MyCurrentStay, StayChangeRequest, StayUnit,
} from "./stayChangeStore";
import {
  getMyCurrentRoomBed, getMyPendingRoomTransferRequest, submitRoomTransferRequest,
  RoomTransferRequest,
} from "./roomTransferStore";
import { getInactivityNotice, submitInactivityResponse, InactivityNotice } from "./inactivityStore";

const EMPTY_PROFILE: MyStudentProfile = { name: "—", firstName: "—", id: "—", program: "—", year: "—", block: "—", email: "—", contact: "—", address: "—", photo: null };
const EMPTY_ASSIGNMENT: MyAssignment = {
  bh:   { id: "", name: "—", address: "—", lat: 0, lng: 0, cover: null, landlord: "—", landlordPhoto: null, contact: "—", email: "—", status: "Active", regStatus: "Approved", checkinRadiusMeters: 50, amenities: [], rules: [], totalRooms: 0, rentAmount: null, gallery: [] },
  room: { id: "", name: "—", bed: "—", capacity: 0, occupied: 0, available: 0, floor: "—", type: "—" },
  stay: { moveIn: "—", moveOut: "—", daysStayed: 0, daysRemaining: 0, totalDays: 0, stayLength: "—" },
};

const GRAD = "linear-gradient(135deg,#9772F6 0%,#7549F6 100%)";
const QS   = "'Quicksand',sans-serif";
const IN   = "'Inter',sans-serif";

// ── Occupant Data ─────────────────────────────────────────────────────────────

interface Occupant {
  id: string; name: string; bed: string; program: string; year: string;
  block: string; contact: string; moveIn: string; status: "active"|"check-in-pending";
  isMe?: boolean; photo: string | null;
}

const AVATAR_COLORS = ["#9772F6","#3B82F6","#16A34A","#EC4899","#D97706","#6366F1"];

const initials = (name: string) =>
  name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase();

const AMENITY_ICONS: Record<string, React.ReactNode> = {
  "WiFi":         <Wifi     size={15} color="#9772F6"/>,
  "Water":        <Droplet  size={15} color="#3B82F6"/>,
  "Electricity":  <Zap      size={15} color="#D97706"/>,
  "Laundry Area": <Shirt    size={15} color="#EC4899"/>,
  "Kitchen":      <Utensils size={15} color="#16A34A"/>,
  "Study Room":   <BookOpen size={15} color="#6366F1"/>,
  "Parking":      <Car      size={15} color="#9CA3AF"/>,
};

// ── Occupant Modal ────────────────────────────────────────────────────────────

function OccupantModal({ occ, idx, onClose, roomName, bhName }: { occ:Occupant; idx:number; onClose:()=>void; roomName:string; bhName:string }) {
  return (
    <div style={{ position: "fixed" as const, inset:0, background:"rgba(0,0,0,.5)", zIndex:80, display:"flex", flexDirection:"column" as const, justifyContent:"flex-end" }}>
      <div style={{ background:"#F7F8FC", borderRadius:"24px 24px 0 0", maxHeight:"88%", display:"flex", flexDirection:"column" as const }}>
        <div style={{ backgroundImage:GRAD, borderRadius:"24px 24px 0 0", padding:"24px 20px 20px", display:"flex", flexDirection:"column" as const, alignItems:"center", position:"relative" as const }}>
          <button onClick={onClose} style={{ position:"absolute" as const, top:16, right:16, width:32, height:32, borderRadius:10, background:"rgba(255,255,255,.2)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <X size={15} color="white"/>
          </button>
          <div style={{ width:72, height:72, borderRadius:"50%", background:"rgba(255,255,255,.2)", border:"3px solid rgba(255,255,255,.5)", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:12, overflow:"hidden" }}>
            {occ.photo ? <img src={occ.photo} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : <span style={{ fontSize:24, fontWeight:800, color:"white", fontFamily:QS }}>{initials(occ.name)}</span>}
          </div>
          <p style={{ margin:"0 0 6px", fontSize:17, fontWeight:800, color:"white", fontFamily:QS }}>{occ.name}</p>
          <div style={{ display:"flex", gap:6 }}>
            {occ.isMe && <span style={{ fontSize:9, fontWeight:800, padding:"3px 10px", borderRadius:20, background:"rgba(255,255,255,.25)", color:"white", fontFamily:QS }}>You</span>}
            <span style={{ fontSize:9, fontWeight:800, padding:"3px 10px", borderRadius:20, background:occ.status==="active"?"#DCFCE7":"#FEF3C7", color:occ.status==="active"?"#16A34A":"#D97706", fontFamily:QS }}>
              {occ.status==="active" ? "Currently Staying" : "Entry Pending"}
            </span>
          </div>
        </div>
        <div style={{ flex:1, overflowY:"auto" as const, scrollbarWidth:"none" as const, padding:"16px 16px 32px" }}>
          {[
            { Icon:Bed,           label:"Assigned Bed",   val:occ.bed        },
            { Icon:GraduationCap, label:"Program",        val:occ.program    },
            { Icon:BookOpen,      label:"Year Level",     val:occ.year       },
            { Icon:Shield,        label:"Block",          val:occ.block      },
            { Icon:Home,          label:"Room",           val:roomName },
            { Icon:Building2,     label:"Boarding House", val:bhName   },
          ].map(({ Icon, label, val })=>(
            <div key={label} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 0", borderBottom:"1px solid #F3F4F6" }}>
              <div style={{ width:36, height:36, borderRadius:12, background:"#F5F0FF", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <Icon size={15} color="#9772F6"/>
              </div>
              <div>
                <p style={{ margin:0, fontSize:10, color:"#9CA3AF", fontFamily:IN }}>{label}</p>
                <p style={{ margin:"2px 0 0", fontSize:13, fontWeight:700, color:"#1F2937", fontFamily:QS }}>{val}</p>
              </div>
            </div>
          ))}
          <div style={{ background:"#EFF6FF", borderRadius:16, padding:"12px 14px", display:"flex", alignItems:"flex-start", gap:10, marginTop:14 }}>
            <Info size={14} color="#3B82F6" style={{ flexShrink:0, marginTop:1 }}/>
            <p style={{ margin:0, fontSize:11, color:"#1D4ED8", fontFamily:IN, lineHeight:1.5 }}>
              Contact information is only shown for your assigned roommates in {roomName}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Request a Stay Change ────────────────────────────────────────────────────
// Move-in/Move-out/Stay Duration used to be 100% read-only here — these are
// official assignment records the landlord controls, so this doesn't overwrite
// them directly. It submits a real request; the landlord gets notified and has
// to confirm it (in that occupant's profile in LandlordOccupants.tsx) before
// the real student_assignments/student_boarding_registrations rows change.

function StayChangeFormModal({ onClose, onSubmitted, bhId, studentName }: { onClose: () => void; onSubmitted: () => void; bhId: string; studentName: string }) {
  const [loading, setLoading] = useState(true);
  const [moveIn, setMoveIn] = useState("");
  const [hasMoveOut, setHasMoveOut] = useState(false);
  const [moveOut, setMoveOut] = useState("");
  const [stayCount, setStayCount] = useState("");
  const [stayUnit, setStayUnit] = useState<StayUnit>("Months");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let active = true;
    getMyCurrentStayRaw().then(c => {
      if (!active) return;
      if (!c) { setErr("Could not load your current stay info."); setLoading(false); return; }
      setMoveIn(c.moveIn);
      if (c.moveOut) { setHasMoveOut(true); setMoveOut(c.moveOut); }
      if (c.stayCount) setStayCount(String(c.stayCount));
      if (c.stayUnit) setStayUnit(c.stayUnit);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const handleSubmit = async () => {
    if (!moveIn) { setErr("Please choose a move-in date."); return; }
    if (hasMoveOut && !moveOut) { setErr("Please choose a move-out date, or turn that off."); return; }
    if (hasMoveOut && moveOut < moveIn) { setErr("Move-out date can't be before move-in."); return; }
    setSubmitting(true); setErr("");
    const res = await submitStayChangeRequest({
      moveIn, moveOut: hasMoveOut ? moveOut : null,
      stayUnit: stayCount.trim() ? stayUnit : null,
      stayCount: stayCount.trim() ? Number(stayCount) : null,
      note,
    });
    setSubmitting(false);
    if (res.ok === false) { setErr(res.error); return; }
    const { data: { session } } = await supabase.auth.getSession();
    notifyLandlordOfBoardingHouse(bhId, {
      type: "stay-change", title: "Stay Change Requested",
      description: `${studentName} requested a change to their move-in/move-out/duration details.`,
      destination: "occupants", relatedId: session?.user?.id,
    });
    setSuccess(true);
  };

  if (success) return (
    <div style={{ position:"fixed" as const, inset:0, background:"rgba(0,0,0,.6)", zIndex:400, display:"flex", alignItems:"center", justifyContent:"center", padding:28 }}>
      <div style={{ background:"white", borderRadius:28, padding:"30px 24px 24px", width:"100%", maxWidth:330, textAlign:"center" as const, boxShadow:"0 24px 60px rgba(0,0,0,.25)" }}>
        <div style={{ width:64, height:64, borderRadius:22, backgroundImage:GRAD, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
          <CheckCircle size={28} color="white"/>
        </div>
        <h3 style={{ margin:"0 0 10px", fontSize:18, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Change Requested!</h3>
        <p style={{ margin:"0 0 22px", fontSize:12, color:"#6B7280", fontFamily:IN, lineHeight:1.65 }}>
          Your landlord has been notified and will need to confirm this before it takes effect.
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
        <div style={{ background:"white", borderRadius:"28px 28px 0 0", padding:"12px 18px 14px", borderBottom:"1px solid #F3F4F6", display:"flex", alignItems:"center", gap:12 }}>
          <div onClick={onClose} style={{ cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", padding:4 }}><ChevronLeft size={17} color="#374151"/></div>
          <div style={{ flex:1 }}>
            <p style={{ margin:0, fontSize:17, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Request a Stay Change</p>
            <p style={{ margin:0, fontSize:11, color:"#9CA3AF", fontFamily:IN }}>Your landlord will need to confirm this</p>
          </div>
        </div>
        <div style={{ flex:1, overflowY:"auto" as const, scrollbarWidth:"none" as const, padding:"14px 18px 40px" }}>
          {loading ? (
            <p style={{ textAlign:"center" as const, fontSize:12, color:"#9CA3AF", fontFamily:IN, padding:"20px 0" }}>Loading…</p>
          ) : (
            <>
              <p style={{ margin:"0 0 6px", fontSize:12, fontWeight:800, color:"#374151", fontFamily:QS }}>Move-In Date <span style={{ color:"#EF4444" }}>*</span></p>
              <div style={{ background:"white", borderRadius:14, padding:"11px 14px", border:"1.5px solid #E5E7EB", marginBottom:14 }}>
                <input type="date" value={moveIn} onChange={e=>{ setMoveIn(e.target.value); setErr(""); }} style={{ width:"100%", background:"none", border:"none", outline:"none", fontSize:13, fontFamily:IN, color:"#1F2937", boxSizing:"border-box" as const }}/>
              </div>

              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
                <p style={{ margin:0, fontSize:12, fontWeight:800, color:"#374151", fontFamily:QS }}>Move-Out Date</p>
                <label style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer" }}>
                  <input type="checkbox" checked={hasMoveOut} onChange={e=>{ setHasMoveOut(e.target.checked); setErr(""); }}/>
                  <span style={{ fontSize:11, color:"#9CA3AF", fontFamily:IN }}>Set a date</span>
                </label>
              </div>
              {hasMoveOut && (
                <div style={{ background:"white", borderRadius:14, padding:"11px 14px", border:"1.5px solid #E5E7EB", marginBottom:14 }}>
                  <input type="date" value={moveOut} onChange={e=>{ setMoveOut(e.target.value); setErr(""); }} style={{ width:"100%", background:"none", border:"none", outline:"none", fontSize:13, fontFamily:IN, color:"#1F2937", boxSizing:"border-box" as const }}/>
                </div>
              )}

              <p style={{ margin:"0 0 6px", fontSize:12, fontWeight:800, color:"#374151", fontFamily:QS }}>Stay Duration <span style={{ fontSize:10, color:"#9CA3AF", fontWeight:600 }}>(Optional)</span></p>
              <div style={{ display:"flex", gap:10, marginBottom:14 }}>
                <div style={{ flex:1, background:"white", borderRadius:14, padding:"11px 14px", border:"1.5px solid #E5E7EB" }}>
                  <input type="number" min={1} value={stayCount} onChange={e=>{ setStayCount(e.target.value); setErr(""); }} placeholder="e.g. 6" style={{ width:"100%", background:"none", border:"none", outline:"none", fontSize:13, fontFamily:IN, color:"#1F2937", boxSizing:"border-box" as const }}/>
                </div>
                <select value={stayUnit} onChange={e=>setStayUnit(e.target.value as StayUnit)} style={{ padding:"0 14px", borderRadius:14, border:"1.5px solid #E5E7EB", fontSize:13, fontFamily:IN, color:"#1F2937", background:"white", outline:"none" }}>
                  <option value="Weeks">Weeks</option>
                  <option value="Months">Months</option>
                </select>
              </div>

              <p style={{ margin:"0 0 6px", fontSize:12, fontWeight:800, color:"#374151", fontFamily:QS }}>Note to Landlord <span style={{ fontSize:10, color:"#9CA3AF", fontWeight:600 }}>(Optional)</span></p>
              <div style={{ background:"white", borderRadius:14, padding:"11px 14px", border:"1.5px solid #E5E7EB", marginBottom:18 }}>
                <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Why you're requesting this change…" rows={3} style={{ width:"100%", background:"none", border:"none", outline:"none", fontSize:13, fontFamily:IN, color:"#1F2937", resize:"none" as const, boxSizing:"border-box" as const }}/>
              </div>

              {err && <p style={{ margin:"0 0 10px", fontSize:11, color:"#EF4444", fontFamily:IN }}>{err}</p>}

              <button onClick={handleSubmit} disabled={submitting} style={{ width:"100%", height:52, borderRadius:20, backgroundImage:GRAD, border:"none", cursor:submitting?"default":"pointer", opacity:submitting?0.7:1, fontSize:15, fontWeight:800, color:"white", fontFamily:QS, boxShadow:"0 4px 16px rgba(151,114,246,.35)" }}>
                {submitting ? "Submitting…" : "Submit Request"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Request a Room / Bed Transfer ────────────────────────────────────────────
// Same shape as StayChangeFormModal just above: a student can't just move
// themselves to another bed (that's the landlord's own real assignment/beds
// data) — this submits a real request against a real available bed (the same
// list the landlord's own "Transfer Room" quick action offers), the landlord
// gets notified and reviews it in that occupant's profile, and only on
// approval does the real transfer happen (transfer_student_room, 0049).

function RoomTransferFormModal({ onClose, onSubmitted, bhId, studentName }: { onClose: () => void; onSubmitted: () => void; bhId: string; studentName: string }) {
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState<{ roomName: string; bedLabel: string } | null>(null);
  const [beds, setBeds] = useState<AvailableBed[]>([]);
  const [selected, setSelected] = useState<AvailableBed | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const [mine, avail] = await Promise.all([getMyCurrentRoomBed(), getAvailableBedsForTransfer(bhId)]);
      if (!active) return;
      if (!mine) { setErr("Could not load your current room/bed."); setLoading(false); return; }
      setCurrent({ roomName: mine.roomName, bedLabel: mine.bedLabel });
      setBeds(avail);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [bhId]);

  const handleSubmit = async () => {
    if (!selected) { setErr("Please choose a destination bed."); return; }
    setSubmitting(true); setErr("");
    const res = await submitRoomTransferRequest(selected.roomId, selected.bedId, note);
    setSubmitting(false);
    if (res.ok === false) { setErr(res.error); return; }
    notifyLandlordOfBoardingHouse(bhId, {
      type: "room", title: "Room Transfer Requested",
      description: `${studentName} requested to move to ${selected.roomName} — ${selected.bedLabel}.`,
      destination: "occupants", relatedId: (await supabase.auth.getSession()).data.session?.user?.id,
    });
    setSuccess(true);
  };

  if (success) return (
    <div style={{ position:"fixed" as const, inset:0, background:"rgba(0,0,0,.6)", zIndex:400, display:"flex", alignItems:"center", justifyContent:"center", padding:28 }}>
      <div style={{ background:"white", borderRadius:28, padding:"30px 24px 24px", width:"100%", maxWidth:330, textAlign:"center" as const, boxShadow:"0 24px 60px rgba(0,0,0,.25)" }}>
        <div style={{ width:64, height:64, borderRadius:22, backgroundImage:GRAD, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
          <CheckCircle size={28} color="white"/>
        </div>
        <h3 style={{ margin:"0 0 10px", fontSize:18, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Transfer Requested!</h3>
        <p style={{ margin:"0 0 22px", fontSize:12, color:"#6B7280", fontFamily:IN, lineHeight:1.65 }}>
          Your landlord has been notified and will need to confirm this before you're moved.
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
        <div style={{ background:"white", borderRadius:"28px 28px 0 0", padding:"12px 18px 14px", borderBottom:"1px solid #F3F4F6", display:"flex", alignItems:"center", gap:12 }}>
          <div onClick={onClose} style={{ cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", padding:4 }}><ChevronLeft size={17} color="#374151"/></div>
          <div style={{ flex:1 }}>
            <p style={{ margin:0, fontSize:17, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Request a Room / Bed Transfer</p>
            <p style={{ margin:0, fontSize:11, color:"#9CA3AF", fontFamily:IN }}>Your landlord will need to confirm this</p>
          </div>
        </div>
        <div style={{ flex:1, overflowY:"auto" as const, scrollbarWidth:"none" as const, padding:"14px 18px 40px" }}>
          {loading ? (
            <p style={{ textAlign:"center" as const, fontSize:12, color:"#9CA3AF", fontFamily:IN, padding:"20px 0" }}>Loading…</p>
          ) : (
            <>
              {current && (
                <div style={{ background:"white", borderRadius:14, padding:"11px 14px", border:"1.5px solid #E5E7EB", marginBottom:14 }}>
                  <p style={{ margin:0, fontSize:9, color:"#9CA3AF", fontFamily:QS, textTransform:"uppercase" as const, fontWeight:700, letterSpacing:0.5 }}>Current Room / Bed</p>
                  <p style={{ margin:"3px 0 0", fontSize:13, fontWeight:700, color:"#1F2937", fontFamily:QS }}>{current.roomName} — {current.bedLabel}</p>
                </div>
              )}

              <p style={{ margin:"0 0 6px", fontSize:12, fontWeight:800, color:"#374151", fontFamily:QS }}>Destination Bed <span style={{ color:"#EF4444" }}>*</span></p>
              {beds.length === 0 ? (
                <div style={{ background:"white", borderRadius:14, padding:"20px 14px", border:"1.5px solid #E5E7EB", marginBottom:14, textAlign:"center" as const }}>
                  <p style={{ margin:0, fontSize:12, color:"#9CA3AF", fontFamily:IN }}>No other beds are available right now.</p>
                </div>
              ) : (
                <div style={{ marginBottom:14 }}>
                  {beds.map(b => (
                    <button key={b.bedId} onClick={()=>{ setSelected(b); setErr(""); }}
                      style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 14px", borderRadius:14, marginBottom:8,
                        background: selected?.bedId===b.bedId ? "#F5F0FF" : "white", border: selected?.bedId===b.bedId ? "1.5px solid #9772F6" : "1.5px solid #E5E7EB", cursor:"pointer" }}>
                      <span style={{ fontSize:13, fontWeight:700, color:"#1F2937", fontFamily:QS }}>{b.roomName} — {b.bedLabel}</span>
                      {selected?.bedId===b.bedId && <CheckCircle size={16} color="#9772F6"/>}
                    </button>
                  ))}
                </div>
              )}

              <p style={{ margin:"0 0 6px", fontSize:12, fontWeight:800, color:"#374151", fontFamily:QS }}>Note to Landlord <span style={{ fontSize:10, color:"#9CA3AF", fontWeight:600 }}>(Optional)</span></p>
              <div style={{ background:"white", borderRadius:14, padding:"11px 14px", border:"1.5px solid #E5E7EB", marginBottom:18 }}>
                <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Why you're requesting this move…" rows={3} style={{ width:"100%", background:"none", border:"none", outline:"none", fontSize:13, fontFamily:IN, color:"#1F2937", resize:"none" as const, boxSizing:"border-box" as const }}/>
              </div>

              {err && <p style={{ margin:"0 0 10px", fontSize:11, color:"#EF4444", fontFamily:IN }}>{err}</p>}

              <button onClick={handleSubmit} disabled={submitting || beds.length===0} style={{ width:"100%", height:52, borderRadius:20, backgroundImage:GRAD, border:"none", cursor:(submitting||beds.length===0)?"default":"pointer", opacity:(submitting||beds.length===0)?0.7:1, fontSize:15, fontWeight:800, color:"white", fontFamily:QS, boxShadow:"0 4px 16px rgba(151,114,246,.35)" }}>
                {submitting ? "Submitting…" : "Submit Request"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Status Update Detail Modal ───────────────────────────────────────────────
// What a "status-update" notification tap opens — the actual real occupant_status_updates
// row it points to (LandlordOccupants.tsx's "Update Status" quick action), not just a
// generic screen. `moveOut` null means the landlord cleared a previously scheduled date.

function fmtStatusDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function StatusUpdateDetailModal({ update, onClose }: { update: OccupantStatusUpdate; onClose: () => void }) {
  const cleared = update.moveOut === null;
  return (
    <div style={{ position:"fixed" as const, inset:0, background:"rgba(0,0,0,.55)", zIndex:400, display:"flex", alignItems:"center", justifyContent:"center", padding:28 }} onClick={onClose}>
      <div style={{ background:"white", borderRadius:28, padding:"28px 24px 24px", width:"100%", maxWidth:340, boxShadow:"0 24px 60px rgba(0,0,0,.25)" }} onClick={e=>e.stopPropagation()}>
        <div style={{ width:56, height:56, borderRadius:20, background: cleared ? "#DCFCE7" : "#FEF3C7", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
          <Calendar size={24} color={cleared ? "#16A34A" : "#D97706"}/>
        </div>
        <h3 style={{ margin:"0 0 4px", fontSize:17, fontWeight:800, color:"#1F2937", fontFamily:QS, textAlign:"center" as const }}>
          {cleared ? "Move-Out Cleared" : "Move-Out Scheduled"}
        </h3>
        <p style={{ margin:"0 0 18px", fontSize:11, color:"#9CA3AF", fontFamily:IN, textAlign:"center" as const }}>
          Updated by your landlord on {fmtStatusDate(update.createdAt.slice(0,10))}
        </p>

        {!cleared && (
          <div style={{ background:"#FEF3C7", borderRadius:14, padding:"12px 14px", marginBottom: update.note ? 12 : 18, textAlign:"center" as const }}>
            <p style={{ margin:0, fontSize:10, color:"#92400E", fontFamily:QS, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:0.5 }}>Expected Move-Out</p>
            <p style={{ margin:"3px 0 0", fontSize:15, fontWeight:800, color:"#92400E", fontFamily:QS }}>{fmtStatusDate(update.moveOut!)}</p>
          </div>
        )}
        {cleared && (
          <div style={{ background:"#DCFCE7", borderRadius:14, padding:"12px 14px", marginBottom: update.note ? 12 : 18, textAlign:"center" as const }}>
            <p style={{ margin:0, fontSize:12, color:"#166534", fontFamily:IN, lineHeight:1.5 }}>Your scheduled move-out was cleared — you're active again.</p>
          </div>
        )}

        {update.note && (
          <div style={{ background:"#F9FAFB", borderRadius:14, padding:"12px 14px", marginBottom:18 }}>
            <p style={{ margin:"0 0 4px", fontSize:10, color:"#9CA3AF", fontFamily:QS, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:0.5 }}>Note from your landlord</p>
            <p style={{ margin:0, fontSize:12, color:"#374151", fontFamily:IN, lineHeight:1.6 }}>"{update.note}"</p>
          </div>
        )}

        <button onClick={onClose} style={{ width:"100%", height:48, borderRadius:20, backgroundImage:GRAD, border:"none", cursor:"pointer", fontSize:14, fontWeight:800, color:"white", fontFamily:QS, boxShadow:"0 4px 16px rgba(151,114,246,.3)" }}>
          Got It
        </button>
      </div>
    </div>
  );
}

// ── Inactivity Notice Detail Modal ───────────────────────────────────────────
// What an "inactivity" notification tap opens for the student themselves — the
// actual real inactivity_notices row (LandlordOccupants.tsx detects this from
// real check-in/out history, 0052), with a direct way to fix it.

function InactivityDetailModal({ notice, studentName, onClose, onCheckInOut }: { notice: InactivityNotice; studentName: string; onClose: () => void; onCheckInOut: () => void }) {
  const lastActivityLabel = new Date(notice.lastActivityAt).toLocaleDateString("en-US", { month:"long", day:"numeric", year:"numeric" });
  const dayWord = `${notice.daysInactive} day${notice.daysInactive === 1 ? "" : "s"}`;
  const [responseText, setResponseText] = useState(notice.response ?? "");
  const [sentResponse, setSentResponse] = useState(notice.response);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSend() {
    const trimmed = responseText.trim();
    if (!trimmed) { setErrorMsg("Please enter a response."); return; }
    setSubmitting(true); setErrorMsg(null);
    const res = await submitInactivityResponse({
      id: notice.id, studentId: notice.studentId, boardingHouseId: notice.boardingHouseId,
      studentName, response: trimmed,
    });
    setSubmitting(false);
    if (res.ok === false) { setErrorMsg(res.error); return; }
    setSentResponse(trimmed);
  }

  return (
    <div style={{ position:"fixed" as const, inset:0, background:"rgba(0,0,0,.55)", zIndex:400, display:"flex", alignItems:"center", justifyContent:"center", padding:28 }} onClick={onClose}>
      <div style={{ background:"white", borderRadius:28, padding:"28px 24px 24px", width:"100%", maxWidth:340, boxShadow:"0 24px 60px rgba(0,0,0,.25)" }} onClick={e=>e.stopPropagation()}>
        <div style={{ width:56, height:56, borderRadius:20, background:"#FEF2F2", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
          <AlertCircle size={24} color="#F87171"/>
        </div>
        <h3 style={{ margin:"0 0 4px", fontSize:17, fontWeight:800, color:"#1F2937", fontFamily:QS, textAlign:"center" as const }}>You've Gone Quiet</h3>
        <p style={{ margin:"0 0 18px", fontSize:11, color:"#9CA3AF", fontFamily:IN, textAlign:"center" as const }}>Your landlord and parent were notified too</p>

        <div style={{ background:"#FEF2F2", borderRadius:14, padding:"12px 14px", marginBottom:18, textAlign:"center" as const }}>
          <p style={{ margin:0, fontSize:12, color:"#7F1D1D", fontFamily:IN, lineHeight:1.6 }}>
            No Enter/Exit activity in <strong>{dayWord}</strong> — since {lastActivityLabel}.
          </p>
        </div>

        {sentResponse ? (
          <div style={{ background:"#F0FDF4", borderRadius:14, padding:"12px 14px", marginBottom:18 }}>
            <p style={{ margin:"0 0 4px", fontSize:10, fontWeight:800, color:"#15803D", fontFamily:QS, textTransform:"uppercase" as const }}>Your Response (Sent)</p>
            <p style={{ margin:0, fontSize:12, color:"#166534", fontFamily:IN, lineHeight:1.6 }}>"{sentResponse}"</p>
            <p style={{ margin:"6px 0 0", fontSize:10, color:"#4D7C0F", fontFamily:IN }}>Your landlord and parent can see this.</p>
          </div>
        ) : (
          <div style={{ marginBottom:18 }}>
            <p style={{ margin:"0 0 8px", fontSize:12, color:"#6B7280", fontFamily:IN, lineHeight:1.6, textAlign:"center" as const }}>
              Please respond so your landlord and parent know you're okay.
            </p>
            <textarea
              value={responseText}
              onChange={e => setResponseText(e.target.value)}
              placeholder="e.g. I'm home for the weekend, forgot to tap Enter…"
              rows={3}
              style={{ width:"100%", boxSizing:"border-box" as const, borderRadius:14, border:"1.5px solid #E5E7EB", padding:"10px 12px", fontSize:12, fontFamily:IN, color:"#1F2937", resize:"none" as const, outline:"none" }}
            />
            {errorMsg && <p style={{ margin:"6px 0 0", fontSize:11, color:"#EF4444", fontFamily:IN }}>{errorMsg}</p>}
            <button onClick={handleSend} disabled={submitting} style={{ width:"100%", marginTop:10, padding:"11px 0", borderRadius:16, border:"none", backgroundImage:GRAD, color:"white", fontSize:13, fontWeight:800, cursor:submitting?"default":"pointer", fontFamily:QS, opacity:submitting?0.7:1, boxShadow:"0 4px 16px rgba(151,114,246,.3)" }}>
              {submitting ? "Sending…" : "Send Response"}
            </button>
          </div>
        )}

        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:"12px 0", borderRadius:16, border:"1.5px solid #E5E7EB", background:"white", color:"#6B7280", fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:QS }}>Close</button>
          <button onClick={onCheckInOut} style={{ flex:1, padding:"12px 0", borderRadius:16, border:"none", backgroundImage:GRAD, color:"white", fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:QS, boxShadow:"0 4px 16px rgba(151,114,246,.3)" }}>Enter/Exit</button>
        </div>
      </div>
    </div>
  );
}

// ── Tab content ───────────────────────────────────────────────────────────────

function OverviewTab({ go, bhData: BH_DATA, roomData: ROOM_DATA, stayData: STAY_DATA, studentName, stayPeriodRef }: {
  go:(s:string)=>void; bhData: MyBoardingHouse; roomData: MyRoom; stayData: MyStay; studentName: string;
  stayPeriodRef?: React.RefObject<HTMLDivElement>;
}) {
  const [showFullMap, setShowFullMap] = useState(false);
  const [showStayChangeForm, setShowStayChangeForm] = useState(false);
  const [pendingStayChange, setPendingStayChange] = useState<StayChangeRequest | null>(null);
  const refreshPendingStayChange = () => { getMyPendingStayChangeRequest().then(setPendingStayChange); };
  useEffect(() => { refreshPendingStayChange(); }, []);

  const [showRoomTransferForm, setShowRoomTransferForm] = useState(false);
  const [pendingRoomTransfer, setPendingRoomTransfer] = useState<RoomTransferRequest | null>(null);
  const refreshPendingRoomTransfer = () => { getMyPendingRoomTransferRequest().then(setPendingRoomTransfer); };
  useEffect(() => { refreshPendingRoomTransfer(); }, []);
  return (
    <div style={{ padding:"16px 16px 28px" }}>

      {/* BH Info card */}
      <div style={{ background:"white", borderRadius:20, padding:"18px", boxShadow:"0 4px 16px rgba(0,0,0,.07)", marginBottom:14 }}>
        <p style={{ margin:"0 0 14px", fontSize:13, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Boarding House Details</p>
        <div style={{ borderRadius:14, overflow:"hidden", height:110, position:"relative" as const, marginBottom:14 }}>
          <GoogleMapCanvas
            center={{ lat: BH_DATA.lat, lng: BH_DATA.lng }}
            zoom={15}
            mapType="standard"
            markers={[{ id:"bh", variant:"bh", position:{ lat: BH_DATA.lat, lng: BH_DATA.lng }, title: BH_DATA.name }]}
          />
          <button onClick={()=>setShowFullMap(true)} title="Show Full Map" style={{ position:"absolute" as const, bottom:8, right:8, zIndex:20, width:30, height:30, borderRadius:10, border:"none", background:"white", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", boxShadow:"0 3px 10px rgba(0,0,0,.2)" }}>
            <Maximize2 size={14} color="#374151"/>
          </button>
        </div>
        {showFullMap && (
          <FullScreenBHMap
            bh={{ name: BH_DATA.name, address: BH_DATA.address, landlord: BH_DATA.landlord, contact: BH_DATA.contact, lat: BH_DATA.lat, lng: BH_DATA.lng }}
            onClose={()=>setShowFullMap(false)}
            showDistanceInfo={false}
          />
        )}
        {[
          { Icon:Building2, label:"Name",            val:BH_DATA.name     },
          { Icon:MapPin,    label:"Address",         val:BH_DATA.address  },
          { Icon:User,      label:"Landlord",        val:BH_DATA.landlord },
          { Icon:Phone,     label:"Contact",         val:BH_DATA.contact  },
          { Icon:Mail,      label:"Email",           val:BH_DATA.email    },
        ].map(({ Icon, label, val }, i, arr)=>(
          <div key={label} style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"10px 0", borderBottom:i<arr.length-1?"1px solid #F9FAFB":"none" }}>
            <div style={{ width:32, height:32, borderRadius:10, background:"#F5F0FF", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:2 }}>
              <Icon size={13} color="#9772F6"/>
            </div>
            <div style={{ flex:1 }}>
              <p style={{ margin:0, fontSize:9, color:"#9CA3AF", fontFamily:QS, textTransform:"uppercase" as const, fontWeight:700, letterSpacing:0.5 }}>{label}</p>
              <p style={{ margin:"2px 0 0", fontSize:12, fontWeight:700, color:"#1F2937", fontFamily:IN, lineHeight:1.4 }}>{val}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Your assignment */}
      <div style={{ background:"white", borderRadius:20, padding:"18px", boxShadow:"0 4px 16px rgba(0,0,0,.07)", marginBottom:14 }}>
        <p style={{ margin:"0 0 14px", fontSize:13, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Your Assignment</p>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
          {[
            { label:"Room",         val:ROOM_DATA.name,  color:"#9772F6", bg:"#F5F0FF" },
            { label:"Bed",          val:ROOM_DATA.bed,   color:"#3B82F6", bg:"#EFF6FF" },
            { label:"Floor",        val:ROOM_DATA.floor.replace(" Floor",""),  color:"#16A34A", bg:"#DCFCE7" },
            { label:"Room Type",    val:ROOM_DATA.type,  color:"#D97706", bg:"#FEF3C7" },
          ].map(({ label, val, color, bg })=>(
            <div key={label} style={{ background:bg, borderRadius:14, padding:"12px 14px" }}>
              <p style={{ margin:0, fontSize:15, fontWeight:800, color, fontFamily:QS, lineHeight:1.1 }}>{val}</p>
              <p style={{ margin:"3px 0 0", fontSize:10, color:"#9CA3AF", fontFamily:IN }}>{label}</p>
            </div>
          ))}
        </div>
        {/* Stay period */}
        <div ref={stayPeriodRef} style={{ marginTop:14, paddingTop:14, borderTop:"1px solid #F3F4F6" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:2 }}>
            <span style={{ fontSize:10, fontWeight:800, color:"#9CA3AF", fontFamily:QS, textTransform:"uppercase" as const, letterSpacing:0.5 }}>Stay Period</span>
            {!pendingStayChange && (
              <button onClick={()=>setShowStayChangeForm(true)} title="Request a Change" style={{ width:26, height:26, borderRadius:9, background:"#F3F4F6", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Pencil size={12} color="#6B7280"/>
              </button>
            )}
          </div>
          {pendingStayChange && (
            <div style={{ margin:"8px 0", padding:"10px 12px", borderRadius:12, background:"#FEF3C7", display:"flex", alignItems:"center", gap:8 }}>
              <Clock size={13} color="#D97706" style={{ flexShrink:0 }}/>
              <span style={{ fontSize:11, color:"#92400E", fontFamily:IN, lineHeight:1.5 }}>Stay change requested — awaiting your landlord's confirmation.</span>
            </div>
          )}
          {[
            { Icon:Calendar, label:"Move-in Date",  val:STAY_DATA.moveIn     },
            { Icon:Calendar, label:"Move-out Date", val:STAY_DATA.moveOut    },
            { Icon:Clock,    label:"Stay Duration", val:STAY_DATA.stayLength },
          ].map(({ Icon, label, val }, i, arr)=>(
            <div key={label} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:i<arr.length-1?"1px solid #F9FAFB":"none" }}>
              <div style={{ width:32, height:32, borderRadius:10, background:"#F5F0FF", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <Icon size={13} color="#9772F6"/>
              </div>
              <div style={{ flex:1 }}>
                <p style={{ margin:0, fontSize:9, color:"#9CA3AF", fontFamily:QS, textTransform:"uppercase" as const, fontWeight:700, letterSpacing:0.5 }}>{label}</p>
                <p style={{ margin:"2px 0 0", fontSize:12, fontWeight:700, color:"#1F2937", fontFamily:IN }}>{val}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Room / Bed transfer */}
        <div style={{ marginTop:14, paddingTop:14, borderTop:"1px solid #F3F4F6" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:2 }}>
            <span style={{ fontSize:10, fontWeight:800, color:"#9CA3AF", fontFamily:QS, textTransform:"uppercase" as const, letterSpacing:0.5 }}>Room / Bed</span>
            {!pendingRoomTransfer && (
              <button onClick={()=>setShowRoomTransferForm(true)} title="Request a Transfer" style={{ width:26, height:26, borderRadius:9, background:"#F3F4F6", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Pencil size={12} color="#6B7280"/>
              </button>
            )}
          </div>
          {pendingRoomTransfer ? (
            <div style={{ margin:"8px 0 0", padding:"10px 12px", borderRadius:12, background:"#FEF3C7", display:"flex", alignItems:"center", gap:8 }}>
              <ArrowRightLeft size={13} color="#D97706" style={{ flexShrink:0 }}/>
              <span style={{ fontSize:11, color:"#92400E", fontFamily:IN, lineHeight:1.5 }}>
                Requested move to {pendingRoomTransfer.requestedRoomName} — {pendingRoomTransfer.requestedBedLabel}, awaiting your landlord's confirmation.
              </span>
            </div>
          ) : (
            <p style={{ margin:"8px 0 0", fontSize:11, color:"#6B7280", fontFamily:IN, lineHeight:1.5 }}>
              Want to move to a different room or bed? Request a transfer and your landlord will review it.
            </p>
          )}
        </div>
      </div>
      {showStayChangeForm && (
        <StayChangeFormModal
          onClose={()=>setShowStayChangeForm(false)}
          onSubmitted={refreshPendingStayChange}
          bhId={BH_DATA.id}
          studentName={studentName}
        />
      )}
      {showRoomTransferForm && (
        <RoomTransferFormModal
          onClose={()=>setShowRoomTransferForm(false)}
          onSubmitted={refreshPendingRoomTransfer}
          bhId={BH_DATA.id}
          studentName={studentName}
        />
      )}

    </div>
  );
}

function OccupantsTab({ setSelOcc, roomData: ROOM_DATA, occupants: ROOM_OCCUPANTS }: { setSelOcc:(v:{occ:Occupant;idx:number}|null)=>void; roomData: MyRoom; occupants: Occupant[] }) {
  return (
    <div style={{ padding:"16px 16px 28px" }}>

      {/* Occupants list */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <p style={{ fontSize:15, fontWeight:800, color:"#1F2937", margin:0, fontFamily:QS }}>Your Roommates</p>
        <span style={{ fontSize:11, color:"#9CA3AF", fontFamily:IN }}>Tap to view</span>
      </div>
      <div style={{ background:"white", borderRadius:20, overflow:"hidden", boxShadow:"0 2px 10px rgba(0,0,0,.05)", marginBottom:14 }}>
        {ROOM_OCCUPANTS.map((occ,i)=>{
          const color = occ.isMe ? "#9772F6" : AVATAR_COLORS[i % AVATAR_COLORS.length];
          return (
            <div key={occ.id} onClick={()=>setSelOcc({occ,idx:i})} style={{ padding:"14px 16px", borderBottom:i<ROOM_OCCUPANTS.length-1?"1px solid #F3F4F6":"none", cursor:"pointer", display:"flex", alignItems:"center", gap:12, backgroundImage:occ.isMe?GRAD:undefined }}>
              <div style={{ width:46, height:46, borderRadius:"50%", background:occ.isMe?"rgba(255,255,255,.22)":color+"18", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, border:occ.isMe?"1.5px solid rgba(255,255,255,.5)":`1.5px solid ${color}30`, overflow:"hidden" }}>
                {occ.photo ? <img src={occ.photo} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : <span style={{ fontSize:16, fontWeight:800, color:occ.isMe?"white":color, fontFamily:QS }}>{initials(occ.name)}</span>}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
                  <p style={{ margin:0, fontSize:14, fontWeight:800, color:occ.isMe?"white":"#1F2937", fontFamily:QS }}>{occ.name}</p>
                  {occ.isMe && <span style={{ fontSize:8, fontWeight:800, padding:"2px 7px", borderRadius:20, background:"rgba(255,255,255,.25)", color:"white", fontFamily:QS }}>You</span>}
                </div>
                <p style={{ margin:"0 0 3px", fontSize:11, color:occ.isMe?"rgba(255,255,255,.85)":"#6B7280", fontFamily:IN }}>{occ.bed} · {occ.program}</p>
                <span style={{ fontSize:9, fontWeight:800, padding:"2px 8px", borderRadius:20, background:occ.status==="active"?"#DCFCE7":"#FEF3C7", color:occ.status==="active"?"#16A34A":"#D97706", fontFamily:QS }}>
                  {occ.status==="active"?"Currently Staying":"Entry Pending"}
                </span>
              </div>
              <ChevronRight size={14} color={occ.isMe?"rgba(255,255,255,.7)":"#D1D5DB"}/>
            </div>
          );
        })}
      </div>

      <div style={{ background:"#EFF6FF", borderRadius:16, padding:"12px 14px", display:"flex", alignItems:"flex-start", gap:10 }}>
        <div style={{ width:28, height:28, borderRadius:9, background:"#BFDBFE", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <Users size={13} color="#3B82F6"/>
        </div>
        <p style={{ margin:0, fontSize:11, color:"#1D4ED8", fontFamily:IN, lineHeight:1.55 }}>
          Showing occupants of <strong>{ROOM_DATA.name}</strong> only. Contact your landlord for inquiries about other rooms.
        </p>
      </div>
    </div>
  );
}

function AmenitiesTab({ bhData: BH_DATA }: { bhData: MyBoardingHouse }) {
  return (
    <div style={{ padding:"16px 16px 28px" }}>
      <div style={{ background:"white", borderRadius:20, padding:"18px", boxShadow:"0 4px 16px rgba(0,0,0,.07)", marginBottom:14 }}>
        <p style={{ margin:"0 0 14px", fontSize:13, fontWeight:800, color:"#1F2937", fontFamily:QS }}>What's Included</p>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {BH_DATA.amenities.map(am=>(
            <div key={am} style={{ display:"flex", alignItems:"center", gap:10, background:"#F9FAFB", borderRadius:14, padding:"12px 14px" }}>
              <div style={{ width:34, height:34, borderRadius:11, background:"white", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 2px 8px rgba(0,0,0,.06)", flexShrink:0 }}>
                {AMENITY_ICONS[am] ?? <Star size={15} color="#9772F6"/>}
              </div>
              <p style={{ margin:0, fontSize:12, fontWeight:700, color:"#1F2937", fontFamily:QS }}>{am}</p>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background:"#FEF3C7", borderRadius:16, padding:"13px 14px", display:"flex", alignItems:"flex-start", gap:10 }}>
        <AlertCircle size={14} color="#D97706" style={{ flexShrink:0, marginTop:1 }}/>
        <p style={{ margin:0, fontSize:11, color:"#92400E", fontFamily:IN, lineHeight:1.55 }}>
          Amenities are managed by your landlord. Contact <strong>{BH_DATA.landlord}</strong> for any concerns at {BH_DATA.contact}.
        </p>
      </div>
    </div>
  );
}

function RulesTab({ bhData: BH_DATA }: { bhData: MyBoardingHouse }) {
  return (
    <div style={{ padding:"16px 16px 28px" }}>
      <div style={{ background:"white", borderRadius:20, padding:"18px", boxShadow:"0 4px 16px rgba(0,0,0,.07)", marginBottom:14 }}>
        <p style={{ margin:"0 0 14px", fontSize:13, fontWeight:800, color:"#1F2937", fontFamily:QS }}>House Rules</p>
        {BH_DATA.rules.map((rule, i)=>(
          <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"11px 0", borderBottom:i<BH_DATA.rules.length-1?"1px solid #F9FAFB":"none" }}>
            <div style={{ width:24, height:24, borderRadius:8, backgroundImage:GRAD, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1 }}>
              <span style={{ fontSize:10, fontWeight:800, color:"white", fontFamily:QS }}>{i+1}</span>
            </div>
            <p style={{ margin:0, fontSize:12, color:"#374151", fontFamily:IN, lineHeight:1.55, flex:1 }}>{rule}</p>
          </div>
        ))}
      </div>
      <div style={{ background:"#FEE2E2", borderRadius:16, padding:"13px 14px", display:"flex", alignItems:"flex-start", gap:10 }}>
        <Shield size={14} color="#DC2626" style={{ flexShrink:0, marginTop:1 }}/>
        <p style={{ margin:0, fontSize:11, color:"#991B1B", fontFamily:IN, lineHeight:1.55 }}>
          Violation of house rules may result in warnings or termination of stay. Please comply at all times.
        </p>
      </div>
    </div>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

type Tab = "overview"|"occupants"|"amenities"|"rules";

export function StudentRoomOccupantsScreen({ go, pendingDeepLink, onDeepLinkConsumed }: {
  go:(s:string)=>void;
  pendingDeepLink?: { type: NotificationType; relatedId?: string } | null;
  onDeepLinkConsumed?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [selOcc, setSelOcc] = useState<{occ:Occupant;idx:number}|null>(null);

  // Opened from a "status-update" notification tap — the landlord's own
  // "Update Status" quick action (LandlordOccupants.tsx) logs a real
  // occupant_status_updates row (0050); fetch that specific one by id and show
  // its actual move-out date/note in a modal, rather than just landing here.
  const [viewingStatusUpdate, setViewingStatusUpdate] = useState<OccupantStatusUpdate | null>(null);
  useEffect(() => {
    if (pendingDeepLink?.type !== "status-update" || !pendingDeepLink.relatedId) return;
    const id = pendingDeepLink.relatedId;
    getOccupantStatusUpdate(id).then(row => {
      if (row) setViewingStatusUpdate(row);
      onDeepLinkConsumed?.();
    });
  }, [pendingDeepLink, onDeepLinkConsumed]);

  // Opened from an "inactivity" notification tap — the landlord's Occupants page
  // detected no real check-in/out for 24+ hours and logged a real
  // inactivity_notices row (0052); fetch that specific one and show it here.
  const [viewingInactivityNotice, setViewingInactivityNotice] = useState<InactivityNotice | null>(null);
  useEffect(() => {
    if (pendingDeepLink?.type !== "inactivity" || !pendingDeepLink.relatedId) return;
    const id = pendingDeepLink.relatedId;
    getInactivityNotice(id).then(row => {
      if (row) setViewingInactivityNotice(row);
      onDeepLinkConsumed?.();
    });
  }, [pendingDeepLink, onDeepLinkConsumed]);

  // Opened from a "Stay Change Approved"/"Stay Change Declined" notification tap —
  // the landlord's decision on a request the student themselves submitted. Lands on
  // the Overview tab (Stay Period only lives there) and scrolls to that section,
  // rather than just landing on whichever tab happened to be open.
  const stayPeriodRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (pendingDeepLink?.type !== "stay-change") return;
    setActiveTab("overview");
    requestAnimationFrame(() => stayPeriodRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
    onDeepLinkConsumed?.();
  }, [pendingDeepLink, onDeepLinkConsumed]);

  const [profile, setProfile] = useState<MyStudentProfile>(EMPTY_PROFILE);
  const [assignment, setAssignment] = useState<MyAssignment>(EMPTY_ASSIGNMENT);
  const [roommates, setRoommates] = useState<Occupant[]>([]);
  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      const [myProfile, myAssignment, myRoommates] = await Promise.all([
        getMyProfile(), getMyAssignment(), uid ? getRoommates(uid) : Promise.resolve([]),
      ]);
      if (!active) return;
      if (myProfile) setProfile(myProfile);
      if (myAssignment) setAssignment(myAssignment);
      const mapped: Occupant[] = myRoommates.map(r => ({
        id: r.studentId, name: r.studentName, bed: r.bedLabel,
        program: r.program ?? "—", year: r.yearLevel ? `${r.yearLevel}${r.yearLevel === 1 ? "st" : r.yearLevel === 2 ? "nd" : r.yearLevel === 3 ? "rd" : "th"} Year` : "—",
        block: r.block ?? "—", contact: r.contact ?? "—", moveIn: r.movedInAt, status: "active", photo: r.photo,
      }));
      const me: Occupant | null = myProfile && myAssignment ? {
        id: uid ?? myProfile.id, name: myProfile.name, bed: myAssignment.room.bed,
        program: myProfile.program, year: myProfile.year, block: myProfile.block,
        contact: myProfile.contact, moveIn: myAssignment.stay.moveIn, status: "active", isMe: true, photo: myProfile.photo,
      } : null;
      setRoommates(me ? [me, ...mapped] : mapped);
    })();
    return () => { active = false; };
  }, []);
  const BH_DATA = assignment.bh;
  const ROOM_DATA = assignment.room;

  const TABS: { id:Tab; label:string }[] = [
    { id:"overview",   label:"Overview"   },
    { id:"occupants",  label:"Occupants"  },
    { id:"amenities",  label:"Amenities"  },
    { id:"rules",      label:"Rules"      },
  ];

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column" as const, background:"#F7F8FC", position:"relative" as const }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ flexShrink:0, backgroundImage:GRAD, position:"relative" as const, overflow:"hidden" }}>
        <div style={{ position:"absolute" as const, top:-50, right:-50, width:180, height:180, borderRadius:"42% 58% 65% 35%/45% 40% 60% 55%", background:"rgba(255,255,255,.06)", filter:"blur(32px)", pointerEvents:"none" as const }}/>
        <div style={{ position:"absolute" as const, bottom:-30, left:-30, width:120, height:120, borderRadius:"60% 40% 35% 65%/55% 65% 35% 45%", background:"rgba(255,255,255,.04)", filter:"blur(24px)", pointerEvents:"none" as const }}/>
        <div style={{ padding:"52px 20px 20px", position:"relative" as const }}>
          <h1 style={{ margin:"0 0 4px", fontSize:21, fontWeight:800, color:"white", fontFamily:QS, lineHeight:1.2 }}>{BH_DATA.name}</h1>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:16 }}>
            <MapPin size={11} color="rgba(255,255,255,.7)"/>
            <p style={{ margin:0, fontSize:11, color:"rgba(255,255,255,.7)", fontFamily:IN }}>{BH_DATA.address}</p>
          </div>
          {/* Quick stats row */}
          <div style={{ display:"flex", gap:10 }}>
            {[
              { label:ROOM_DATA.name,           sub:"Your Room"    },
              { label:ROOM_DATA.bed,            sub:"Your Bed"     },
              { label:`${ROOM_DATA.occupied}/${ROOM_DATA.capacity}`, sub:"Occupied"    },
              { label:BH_DATA.regStatus,        sub:"Status"       },
            ].map(({ label, sub })=>(
              <div key={sub} style={{ flex:1, background:"rgba(255,255,255,.15)", borderRadius:14, padding:"8px 6px", textAlign:"center" as const, backdropFilter:"blur(4px)" }}>
                <p style={{ margin:0, fontSize:12, fontWeight:800, color:"white", fontFamily:QS, lineHeight:1.1 }}>{label}</p>
                <p style={{ margin:"2px 0 0", fontSize:8, color:"rgba(255,255,255,.65)", fontFamily:IN }}>{sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", padding:"0 16px", gap:4, paddingBottom:0 }}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{
              flex:1, padding:"10px 4px 12px", border:"none", cursor:"pointer",
              background:"none", color: activeTab===t.id ? "white" : "rgba(255,255,255,.55)",
              fontSize:11, fontWeight:800, fontFamily:QS,
              borderBottom: activeTab===t.id ? "3px solid white" : "3px solid transparent",
              transition:"all .2s",
            }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ─────────────────────────────────────────────────────── */}
      <div style={{ flex:1, overflowY:"auto" as const, scrollbarWidth:"none" as const }}>
        {activeTab === "overview"  && <OverviewTab go={go} bhData={BH_DATA} roomData={ROOM_DATA} stayData={assignment.stay} studentName={profile.name} stayPeriodRef={stayPeriodRef} />}
        {activeTab === "occupants" && <OccupantsTab setSelOcc={setSelOcc} roomData={ROOM_DATA} occupants={roommates} />}
        {activeTab === "amenities" && <AmenitiesTab bhData={BH_DATA} />}
        {activeTab === "rules"     && <RulesTab bhData={BH_DATA} />}
      </div>

      {selOcc && <OccupantModal occ={selOcc.occ} idx={selOcc.idx} onClose={()=>setSelOcc(null)} roomName={ROOM_DATA.name} bhName={BH_DATA.name}/>}
      {viewingStatusUpdate && <StatusUpdateDetailModal update={viewingStatusUpdate} onClose={()=>setViewingStatusUpdate(null)}/>}
      {viewingInactivityNotice && <InactivityDetailModal notice={viewingInactivityNotice} studentName={profile.name} onClose={()=>setViewingInactivityNotice(null)} onCheckInOut={()=>{ setViewingInactivityNotice(null); go("map"); }}/>}
    </div>
  );
}
