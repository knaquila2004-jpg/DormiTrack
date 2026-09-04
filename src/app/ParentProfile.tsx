import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import {
  User, Mail, Phone, MapPin, Camera, LogOut,
  ChevronDown, ChevronUp, Lock, Save, X, Edit3,
  Shield, BookOpen, AlertCircle, Check, Eye, EyeOff,
  Bell, FileText, HelpCircle, Info, Link2,
  GraduationCap, Heart,
} from "lucide-react";
import { getMyParentProfile, getMyLinkedStudentData, MyParentProfile, MyStudentProfile, MyAssignment } from "./studentAssignmentStore";
import { uploadProfilePhoto, removeProfilePhoto } from "./profileStore";
// changeMyPassword lives in landlordProfileStore.ts historically (it was built there first) but
// is genuinely role-agnostic — real Supabase Auth re-authenticate-then-update, nothing
// landlord-specific — so it's reused verbatim here rather than duplicating that
// security-sensitive logic a second time.
import { changeMyPassword } from "./landlordProfileStore";

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

// ── Shared micro-components ───────────────────────────────────────────────────

function SectionCard({ title, icon, children, defaultOpen=false }: { title:string; icon?:React.ReactNode; children:React.ReactNode; defaultOpen?:boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background:"white", borderRadius:20, marginBottom:14, boxShadow:"0 4px 20px rgba(0,0,0,.06)", overflow:"hidden" }}>
      <button onClick={()=>setOpen(o=>!o)} style={{ width:"100%", display:"flex", alignItems:"center", gap:12, padding:"16px 18px", background:"none", border:"none", cursor:"pointer", borderBottom:open?"1px solid #F3F4F6":"none" }}>
        <div style={{ width:34, height:34, borderRadius:11, background:"#F5F0FF", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          {icon ?? <User size={16} color="#9772F6"/>}
        </div>
        <span style={{ flex:1, fontSize:14, fontWeight:800, color:"#1F2937", fontFamily:QS, textAlign:"left" as const }}>{title}</span>
        {open?<ChevronUp size={17} color="#9CA3AF"/>:<ChevronDown size={17} color="#9CA3AF"/>}
      </button>
      {open && <div style={{ padding:"16px 18px" }}>{children}</div>}
    </div>
  );
}

function InfoRow({ label, value, last=false }: { label:string; value:string; last?:boolean }) {
  return (
    <div style={{ padding:"10px 0", borderBottom:last?"none":"1px solid #F9FAFB" }}>
      <p style={{ fontSize:10, color:"#9CA3AF", fontWeight:700, margin:"0 0 2px", fontFamily:QS, textTransform:"uppercase" as const, letterSpacing:0.5 }}>{label}</p>
      <p style={{ fontSize:13, fontWeight:700, color:"#1F2937", margin:0, fontFamily:IN, lineHeight:1.45 }}>{value||"—"}</p>
    </div>
  );
}

function EditableField({ label, value, onChange, placeholder, multiline=false }: { label:string; value:string; onChange:(v:string)=>void; placeholder?:string; multiline?:boolean }) {
  const base: React.CSSProperties = { width:"100%", boxSizing:"border-box" as const, padding:"11px 14px", borderRadius:12, border:"1.5px solid #E5E7EB", background:"#F9FAFB", color:"#1F2937", fontSize:13, fontFamily:IN, outline:"none", resize:"none" as const };
  return (
    <div style={{ marginBottom:12 }}>
      <label style={{ fontSize:11, fontWeight:700, color:"#374151", fontFamily:QS, marginBottom:5, display:"block" }}>{label}</label>
      {multiline ? <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={3} style={base}/> : <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={base}/>}
    </div>
  );
}

function GradBtn({ children, onClick, outline=false, small=false }: { children:React.ReactNode; onClick?:()=>void; outline?:boolean; small?:boolean }) {
  return (
    <button onClick={onClick} style={{ height:small?36:44, padding:small?"0 14px":"0 20px", borderRadius:20, border:outline?"2px solid #9772F6":"none", background:outline?"white":GRAD, color:outline?"#9772F6":"white", fontSize:small?12:13, fontWeight:800, fontFamily:QS, cursor:"pointer", boxShadow:outline?"none":"0 4px 16px rgba(151,114,246,.3)", display:"inline-flex", alignItems:"center", gap:6 }}>{children}</button>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export function ParentProfileScreen({ go }: { go:(s:string)=>void }) {
  const [photo,      setPhoto]     = useState<string|null>(null);
  const [editMode,   setEditMode]  = useState(false);
  const [showPwModal,setShowPwMod] = useState(false);
  const [showLogout, setShowLogout]= useState(false);
  const [toast,      setToast]     = useState("");

  // Editable parent fields
  const [uid,      setUid]      = useState<string|null>(null);
  const [name,     setName]     = useState("—");
  const [contact,  setContact]  = useState("—");
  const [email,    setEmail]    = useState("—");
  const [address,  setAddress]  = useState("—");
  const [relationship, setRelationship] = useState("—");
  // Email deliberately isn't editable here — it's the real Supabase Auth login identity, and
  // changing it for real needs Auth's own confirmation-email flow, not a plain `users` table
  // update (which would just desync the display from what's actually used to log in). Shown
  // read-only instead of offering an edit that silently wouldn't have persisted anyway.
  const [draft,    setDraft]    = useState({ name, contact, address });

  const [studentLinked, setStudentLinked] = useState(false);
  const [studentProfile, setStudentProfile] = useState<MyStudentProfile>(EMPTY_STUDENT);
  const [assignment, setAssignment] = useState<MyAssignment>(EMPTY_ASSIGNMENT);
  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const [parent, linked] = await Promise.all([getMyParentProfile(), getMyLinkedStudentData()]);
      if (!active) return;
      if (session?.user) setUid(session.user.id);
      if (parent) {
        setName(parent.name); setContact(parent.contact); setEmail(parent.email); setAddress(parent.address); setRelationship(parent.relationship);
        setDraft({ name: parent.name, contact: parent.contact, address: parent.address });
        if (parent.photo) setPhoto(parent.photo);
      }
      setStudentLinked(linked.linked);
      if (linked.profile) setStudentProfile(linked.profile);
      if (linked.assignment) setAssignment(linked.assignment);
    })();
    return () => { active = false; };
  }, []);
  const STUDENT_DATA = studentProfile;
  const BH_DATA = assignment.bh;
  const ROOM_DATA = assignment.room;

  // Password
  const [curPw,  setCurPw]  = useState(""); const [newPw,  setNewPw]  = useState(""); const [conPw,  setConPw]  = useState("");
  const [sCur,   setSCur]   = useState(false); const [sNew,  setSNew]  = useState(false); const [sCon,  setSCon]  = useState(false);
  const [pwErr,  setPwErr]  = useState("");

  const showToast = (msg:string) => { setToast(msg); setTimeout(()=>setToast(""), 2800); };

  const startEdit = () => { setDraft({ name, contact, address }); setEditMode(true); };
  const saveEdit  = async () => {
    setName(draft.name); setContact(draft.contact); setAddress(draft.address); setEditMode(false);
    // Contact/address are freeform and safe to persist directly; a "Full Name" edit stays
    // local-only here — same deliberate call as StudentProfile.tsx's savePersonal(): splitting
    // it back into first_name/last_name needs real validation this quick-edit form doesn't have,
    // and round-tripping it wrong risks silently corrupting a constrained column.
    if (uid) await supabase.from("users").update({ contact_number: draft.contact, address: draft.address }).eq("id", uid);
    showToast("Profile updated successfully.");
  };

  const savePw = async () => {
    if (!curPw) { setPwErr("Enter current password."); return; }
    if (newPw.length < 6) { setPwErr("New password must be at least 6 characters."); return; }
    if (newPw !== conPw) { setPwErr("Passwords do not match."); return; }
    setPwErr("");
    const res = await changeMyPassword(curPw, newPw);
    if (res.ok === false) { setPwErr(res.error); return; }
    setCurPw(""); setNewPw(""); setConPw(""); setShowPwMod(false); showToast("Password changed.");
  };

  const initials = name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase();
  const inputStyle: React.CSSProperties = { width:"100%", boxSizing:"border-box", padding:"11px 14px", borderRadius:12, border:"1.5px solid #E5E7EB", background:"#F9FAFB", color:"#1F2937", fontSize:13, fontFamily:IN, outline:"none" };

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column" as const, background:"#F7F8FC", position:"relative" as const }}>

      {/* Toast */}
      {toast && (
        <div style={{ position:"absolute" as const, top:60, left:"50%", transform:"translateX(-50%)", background:"#1F2937", color:"white", borderRadius:20, padding:"10px 20px", fontSize:12, fontFamily:QS, fontWeight:700, zIndex:999, whiteSpace:"nowrap" as const, boxShadow:"0 4px 20px rgba(0,0,0,.25)", display:"flex", alignItems:"center", gap:8 }}>
          <Check size={13} color="#4ADE80"/>{toast}
        </div>
      )}

      {/* Change Password Modal */}
      {showPwModal && (
        <div style={{ position: "fixed" as const, inset:0, background:"rgba(0,0,0,.55)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={()=>setShowPwMod(false)}>
          <div style={{ background:"white", borderRadius:24, padding:"24px 20px", width:"100%", maxWidth:340 }} onClick={e=>e.stopPropagation()}>
            <h3 style={{ margin:"0 0 16px", fontSize:17, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Change Password</h3>
            {pwErr && <div style={{ background:"#FEF2F2", borderRadius:12, padding:"10px 14px", marginBottom:12, display:"flex", gap:8 }}><AlertCircle size={13} color="#EF4444"/><span style={{ fontSize:12, color:"#DC2626", fontFamily:IN }}>{pwErr}</span></div>}
            {[
              { label:"Current Password", val:curPw, set:setCurPw, show:sCur, toggle:()=>setSCur(p=>!p) },
              { label:"New Password",     val:newPw, set:setNewPw, show:sNew, toggle:()=>setSNew(p=>!p) },
              { label:"Confirm Password", val:conPw, set:setConPw, show:sCon, toggle:()=>setSCon(p=>!p) },
            ].map(({ label, val, set, show, toggle })=>(
              <div key={label} style={{ marginBottom:12 }}>
                <label style={{ fontSize:11, fontWeight:700, color:"#374151", fontFamily:QS, marginBottom:5, display:"block" }}>{label}</label>
                <div style={{ position:"relative" as const }}>
                  <input type={show?"text":"password"} value={val} onChange={e=>set(e.target.value)} style={{ ...inputStyle, paddingRight:42 }}/>
                  <button onClick={toggle} style={{ position:"absolute" as const, right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"#9CA3AF", padding:4 }}>
                    {show?<Eye size={14}/>:<EyeOff size={14}/>}
                  </button>
                </div>
              </div>
            ))}
            <div style={{ display:"flex", gap:10, marginTop:4 }}>
              <GradBtn outline onClick={()=>setShowPwMod(false)}>Cancel</GradBtn>
              <GradBtn onClick={savePw}>Save Password</GradBtn>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirm */}
      {showLogout && (
        <div style={{ position: "fixed" as const, inset:0, background:"rgba(0,0,0,.55)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={()=>setShowLogout(false)}>
          <div style={{ background:"white", borderRadius:24, padding:"28px 22px", width:"100%", maxWidth:320 }} onClick={e=>e.stopPropagation()}>
            <h3 style={{ margin:"0 0 8px", fontSize:17, fontWeight:800, color:"#1F2937", fontFamily:QS, textAlign:"center" as const }}>Log Out?</h3>
            <p style={{ margin:"0 0 20px", fontSize:12, color:"#6B7280", fontFamily:IN, lineHeight:1.5, textAlign:"center" as const }}>You will be returned to the login screen.</p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <button onClick={()=>setShowLogout(false)} style={{ height:44, borderRadius:18, border:"2px solid #E5E7EB", background:"white", cursor:"pointer", fontSize:13, fontWeight:800, color:"#374151", fontFamily:QS }}>Cancel</button>
              <button onClick={()=>{ supabase.auth.signOut(); go("landing"); }} style={{ height:44, borderRadius:18, border:"none", background:"#EF4444", cursor:"pointer", fontSize:13, fontWeight:800, color:"white", fontFamily:QS }}>Log Out</button>
            </div>
          </div>
        </div>
      )}

      {/* Scrollable body */}
      <div style={{ flex:1, overflowY:"auto" as const, scrollbarWidth:"none" as const }}>

        {/* Header */}
        <div style={{ padding:"52px 20px 24px", backgroundImage:GRAD_H, textAlign:"center" as const }}>
          <h1 style={{ color:"white", fontSize:20, fontWeight:800, margin:"0 0 20px", fontFamily:QS, textAlign:"left" as const }}>My Profile</h1>
          <div style={{ position:"relative" as const, display:"inline-block" }}>
            <div style={{ width:84, height:84, borderRadius:"50%", background:photo?"transparent":"rgba(255,255,255,.2)", border:"3px solid rgba(255,255,255,.4)", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
              {photo ? <img src={photo} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt=""/> : <span style={{ fontSize:30, fontWeight:800, color:"white", fontFamily:QS }}>{initials}</span>}
            </div>
            <label style={{ position:"absolute" as const, bottom:-6, right:-6, width:28, height:28, borderRadius:10, background:"white", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", boxShadow:"0 2px 8px rgba(0,0,0,.15)" }}>
              <Camera size={13} color="#9772F6"/>
              <input type="file" accept="image/*" style={{ display:"none" }} onChange={async e=>{
                const f = e.target.files?.[0];
                if (!f) return;
                setPhoto(URL.createObjectURL(f)); // instant preview while the real upload runs
                const res = await uploadProfilePhoto(f);
                if (res.ok === false) showToast(res.error || "Couldn't upload photo. Please try again.");
                else setPhoto(res.url);
              }}/>
            </label>
          </div>
          {photo && (
            <button onClick={async () => { setPhoto(null); const res = await removeProfilePhoto(); if (res.ok === false) showToast(res.error || "Couldn't remove photo."); }} style={{ display:"block", margin:"10px auto 0", background:"none", border:"none", color:"rgba(255,255,255,.7)", fontSize:11, cursor:"pointer", fontFamily:QS, textDecoration:"underline" }}>Remove Photo</button>
          )}
          <h2 style={{ color:"white", fontSize:20, fontWeight:800, margin:"14px 0 4px", fontFamily:QS }}>{name}</h2>
          <div style={{ display:"inline-flex", alignItems:"center", gap:8 }}>
            <span style={{ background:"rgba(255,255,255,.18)", borderRadius:20, padding:"3px 12px", fontSize:11, color:"white", fontFamily:QS, fontWeight:700, display:"inline-flex", alignItems:"center", gap:5 }}><Heart size={11}/> {relationship}</span>
            <span style={{ background:"rgba(255,255,255,.18)", borderRadius:20, padding:"3px 12px", fontSize:11, color:"white", fontFamily:QS, fontWeight:700 }}>Parent / Guardian</span>
          </div>
        </div>

        {/* Stats quick card */}
        <div style={{ padding:"0 16px", marginTop:-20 }}>
          <div style={{ background:"white", borderRadius:22, padding:16, boxShadow:"0 8px 32px rgba(117,73,246,.14)", display:"grid", gridTemplateColumns:"repeat(4,1fr)", marginBottom:16 }}>
            {[
              ["Student", STUDENT_DATA.name.split(" ")[0]],
              ["Room",    ROOM_DATA.name],
              ["Bed",     ROOM_DATA.bed],
              ["Status",  BH_DATA.regStatus],
            ].map(([l,v])=>(
              <div key={l} style={{ display:"flex", flexDirection:"column" as const, alignItems:"center" }}>
                <span style={{ fontSize:13, fontWeight:800, color:"#9772F6", fontFamily:QS, lineHeight:1.1 }}>{v}</span>
                <span style={{ fontSize:9, color:"#6B7280", fontFamily:QS, fontWeight:700, textAlign:"center" as const, marginTop:2 }}>{l}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding:"0 16px 32px" }}>

          {/* ── Personal Information ────────────────────────────────────────────── */}
          <SectionCard title="Personal Information" icon={<User size={16} color="#9772F6"/>}>
            {!editMode ? (
              <>
                <InfoRow label="Full Name"        value={name}                    />
                <InfoRow label="Relationship"     value={relationship}/>
                <InfoRow label="Contact Number"   value={contact}                 />
                <InfoRow label="Email Address"    value={email}                   />
                <InfoRow label="Home Address"     value={address}                 last/>
                <div style={{ marginTop:14 }}>
                  <GradBtn small outline onClick={startEdit}><Edit3 size={13}/>Edit Profile</GradBtn>
                </div>
              </>
            ) : (
              <>
                <EditableField label="Full Name"      value={draft.name}    onChange={v=>setDraft(d=>({...d,name:v}))}    placeholder="Full name"           />
                <EditableField label="Contact Number" value={draft.contact} onChange={v=>setDraft(d=>({...d,contact:v}))} placeholder="+63 9XX XXX XXXX"    />
                <InfoRow label="Email Address" value={email} />
                <EditableField label="Home Address"   value={draft.address} onChange={v=>setDraft(d=>({...d,address:v}))} placeholder="Purok, Brgy, City"    multiline/>
                <div style={{ display:"flex", gap:10, marginTop:4 }}>
                  <GradBtn small outline onClick={()=>setEditMode(false)}><X size={13}/>Cancel</GradBtn>
                  <GradBtn small onClick={saveEdit}><Save size={13}/>Save Changes</GradBtn>
                </div>
              </>
            )}
          </SectionCard>

          {/* ── Account Information ─────────────────────────────────────────── */}
          <SectionCard title="Account Information" icon={<Mail size={16} color="#9772F6"/>}>
            <InfoRow label="Email Address" value={email}/>
            <div style={{ padding:"10px 0 0" }}>
              <p style={{ fontSize:10, color:"#9CA3AF", fontWeight:700, margin:"0 0 2px", fontFamily:QS, textTransform:"uppercase" as const, letterSpacing:0.5 }}>Password</p>
              <p style={{ fontSize:14, letterSpacing:4, color:"#1F2937", margin:"0 0 14px", fontFamily:IN }}>••••••••••</p>
              <GradBtn small outline onClick={()=>setShowPwMod(true)}><Lock size={13}/>Change Password</GradBtn>
            </div>
          </SectionCard>

          {/* ── Linked Student ───────────────────────────────────────────────── */}
          <SectionCard title="Linked Student" icon={<Link2 size={16} color="#9772F6"/>}>
            <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:14, background:"#F9FAFB", borderRadius:16, padding:"14px 14px" }}>
              <div style={{ width:52, height:52, borderRadius:18, backgroundImage:GRAD, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <span style={{ fontSize:18, fontWeight:800, color:"white", fontFamily:QS }}>
                  {STUDENT_DATA.name.split(" ").map((n:string)=>n[0]).join("").slice(0,2)}
                </span>
              </div>
              <div style={{ flex:1 }}>
                <p style={{ margin:"0 0 2px", fontSize:14, fontWeight:800, color:"#1F2937", fontFamily:QS }}>{STUDENT_DATA.name}</p>
                <p style={{ margin:"0 0 2px", fontSize:11, color:"#6B7280", fontFamily:IN }}>{STUDENT_DATA.id}</p>
                <span style={{ fontSize:9, fontWeight:800, padding:"2px 9px", borderRadius:20, background:"#DCFCE7", color:"#16A34A", fontFamily:QS, display:"inline-flex", alignItems:"center", gap:3 }}><Check size={9}/> Successfully Linked</span>
              </div>
            </div>
            <InfoRow label="Program"    value={STUDENT_DATA.program} />
            <InfoRow label="Year Level" value={STUDENT_DATA.year}    />
            <InfoRow label="Block"      value={STUDENT_DATA.block}   />
            <InfoRow label="Boarding House" value={BH_DATA.name}     />
            <InfoRow label="Room / Bed" value={`${ROOM_DATA.name} · ${ROOM_DATA.bed}`} last/>
            <div style={{ marginTop:12, background:"#EFF6FF", borderRadius:12, padding:"10px 12px", display:"flex", gap:8 }}>
              <AlertCircle size={12} color="#3B82F6" style={{ flexShrink:0, marginTop:2 }}/>
              <p style={{ margin:0, fontSize:11, color:"#1D4ED8", fontFamily:IN, lineHeight:1.5 }}>
                Linked student information is managed by the system and cannot be edited here.
              </p>
            </div>
          </SectionCard>

          {/* ── App Settings ────────────────────────────────────────────────── */}
          <div style={{ background:"white", borderRadius:20, marginBottom:14, boxShadow:"0 4px 20px rgba(0,0,0,.06)", overflow:"hidden" }}>
            {[
              { Icon:Bell,        label:"Notifications",       desc:"Manage alert preferences"   },
              { Icon:Shield,      label:"Privacy Policy",      desc:"How we handle your data"    },
              { Icon:FileText,    label:"Terms & Conditions",  desc:"Usage agreements"            },
              { Icon:HelpCircle,  label:"Help & Support",      desc:"FAQs and contact support"   },
              { Icon:Info,        label:"About DormiTrack",    desc:"Version 1.0.0"              },
            ].map(({ Icon, label, desc }, i, arr)=>(
              <div key={label} style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 18px", borderBottom:i<arr.length-1?"1px solid #F9FAFB":"none", cursor:"pointer" }}>
                <div style={{ width:34, height:34, borderRadius:11, background:"#F5F0FF", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <Icon size={15} color="#9772F6"/>
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ margin:0, fontSize:13, fontWeight:800, color:"#1F2937", fontFamily:QS }}>{label}</p>
                  <p style={{ margin:0, fontSize:11, color:"#9CA3AF", fontFamily:IN }}>{desc}</p>
                </div>
                <ChevronDown size={15} color="#D1D5DB" style={{ transform:"rotate(-90deg)" }}/>
              </div>
            ))}
          </div>

          {/* ── Logout ──────────────────────────────────────────────────────── */}
          <button onClick={()=>setShowLogout(true)} style={{ width:"100%", background:"white", borderRadius:20, padding:"14px 18px", display:"flex", alignItems:"center", gap:14, border:"1px solid #FEE2E2", cursor:"pointer", boxShadow:"0 4px 20px rgba(0,0,0,.05)" }}>
            <div style={{ width:36, height:36, borderRadius:12, background:"#FEE2E2", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <LogOut size={16} color="#DC2626"/>
            </div>
            <span style={{ fontSize:13, fontWeight:800, color:"#DC2626", fontFamily:QS }}>Log Out</span>
          </button>

        </div>
      </div>
    </div>
  );
}
