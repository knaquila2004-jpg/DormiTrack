import React, { useState } from "react";
import {
  Users, Home, ChevronRight, X, Phone, BookOpen,
  GraduationCap, Calendar, Building2, MapPin, User, Bed,
  Info, Shield, Mail, Wifi, Droplet, Zap, Utensils, Star,
  Shirt, Car, CheckCircle, AlertCircle, Clock,
} from "lucide-react";
import { BH_DATA, ROOM_DATA, STUDENT_DATA, STAY_DATA } from "./StudentHome";
import { GoogleMapCanvas } from "./components/GoogleMapCanvas";

const GRAD = "linear-gradient(135deg,#9772F6 0%,#7549F6 100%)";
const QS   = "'Quicksand',sans-serif";
const IN   = "'Inter',sans-serif";

// ── Occupant Data ─────────────────────────────────────────────────────────────

interface Occupant {
  id: string; name: string; bed: string; program: string; year: string;
  block: string; contact: string; moveIn: string; status: "active"|"check-in-pending";
  isMe?: boolean;
}

const ROOM_OCCUPANTS: Occupant[] = [
  { id:"o1", name:"Juan Dela Cruz",  bed:"Bed 1", program:"BS Computer Science", year:"2nd Year", block:"Block A", contact:"+63 912 345 6789", moveIn:"Aug 1, 2026",  status:"active", isMe:true  },
  { id:"o2", name:"Maria Santos",    bed:"Bed 2", program:"BS Nursing",           year:"3rd Year", block:"Block B", contact:"+63 919 555 1234", moveIn:"Jun 15, 2026", status:"active"            },
  { id:"o3", name:"Kevin Cruz",      bed:"Bed 3", program:"BS Engineering",       year:"1st Year", block:"Block A", contact:"+63 915 777 5678", moveIn:"Jul 1, 2026",  status:"active"            },
  { id:"o4", name:"Lena Reyes",      bed:"Bed 4", program:"BA Education",         year:"4th Year", block:"Block C", contact:"+63 908 111 9876", moveIn:"May 20, 2026", status:"active"            },
  { id:"o5", name:"Ben Torres",      bed:"Bed 5", program:"BS Criminology",       year:"2nd Year", block:"Block A", contact:"+63 933 444 2222", moveIn:"Jul 22, 2026", status:"active"            },
  { id:"o6", name:"Clara Lim",       bed:"Bed 6", program:"BS Business Admin",    year:"1st Year", block:"Block B", contact:"+63 927 888 3333", moveIn:"Aug 1, 2026",  status:"active"            },
];

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

function OccupantModal({ occ, idx, onClose }: { occ:Occupant; idx:number; onClose:()=>void }) {
  return (
    <div style={{ position:"absolute" as const, inset:0, background:"rgba(0,0,0,.5)", zIndex:80, display:"flex", flexDirection:"column" as const, justifyContent:"flex-end" }}>
      <div style={{ background:"#F7F8FC", borderRadius:"24px 24px 0 0", maxHeight:"88%", display:"flex", flexDirection:"column" as const }}>
        <div style={{ backgroundImage:GRAD, borderRadius:"24px 24px 0 0", padding:"24px 20px 20px", display:"flex", flexDirection:"column" as const, alignItems:"center", position:"relative" as const }}>
          <button onClick={onClose} style={{ position:"absolute" as const, top:16, right:16, width:32, height:32, borderRadius:10, background:"rgba(255,255,255,.2)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <X size={15} color="white"/>
          </button>
          <div style={{ width:72, height:72, borderRadius:24, background:"rgba(255,255,255,.2)", border:"3px solid rgba(255,255,255,.5)", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:12 }}>
            <span style={{ fontSize:24, fontWeight:800, color:"white", fontFamily:QS }}>{initials(occ.name)}</span>
          </div>
          <p style={{ margin:"0 0 6px", fontSize:17, fontWeight:800, color:"white", fontFamily:QS }}>{occ.name}</p>
          <div style={{ display:"flex", gap:6 }}>
            {occ.isMe && <span style={{ fontSize:9, fontWeight:800, padding:"3px 10px", borderRadius:20, background:"rgba(255,255,255,.25)", color:"white", fontFamily:QS }}>You</span>}
            <span style={{ fontSize:9, fontWeight:800, padding:"3px 10px", borderRadius:20, background:occ.status==="active"?"#DCFCE7":"#FEF3C7", color:occ.status==="active"?"#16A34A":"#D97706", fontFamily:QS }}>
              {occ.status==="active" ? "Currently Staying" : "Check-in Pending"}
            </span>
          </div>
        </div>
        <div style={{ flex:1, overflowY:"auto" as const, scrollbarWidth:"none" as const, padding:"16px 16px 32px" }}>
          {[
            { Icon:Bed,           label:"Assigned Bed",   val:occ.bed        },
            { Icon:GraduationCap, label:"Program",        val:occ.program    },
            { Icon:BookOpen,      label:"Year Level",     val:occ.year       },
            { Icon:Shield,        label:"Block",          val:occ.block      },
            { Icon:Calendar,      label:"Move-in Date",   val:occ.moveIn     },
            { Icon:Home,          label:"Room",           val:ROOM_DATA.name },
            { Icon:Building2,     label:"Boarding House", val:BH_DATA.name   },
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
              Contact information is only shown for your assigned roommates in {ROOM_DATA.name}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tab content ───────────────────────────────────────────────────────────────

function OverviewTab({ go }: { go:(s:string)=>void }) {
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
        </div>
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
            { label:"Room Type",    val:"Standard",      color:"#D97706", bg:"#FEF3C7" },
          ].map(({ label, val, color, bg })=>(
            <div key={label} style={{ background:bg, borderRadius:14, padding:"12px 14px" }}>
              <p style={{ margin:0, fontSize:15, fontWeight:800, color, fontFamily:QS, lineHeight:1.1 }}>{val}</p>
              <p style={{ margin:"3px 0 0", fontSize:10, color:"#9CA3AF", fontFamily:IN }}>{label}</p>
            </div>
          ))}
        </div>
        {/* Occupancy bar */}
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
            <span style={{ fontSize:11, color:"#6B7280", fontFamily:IN }}>Room Occupancy</span>
            <span style={{ fontSize:11, fontWeight:700, color:"#9772F6", fontFamily:QS }}>{ROOM_DATA.occupied}/{ROOM_DATA.capacity}</span>
          </div>
          <div style={{ height:8, background:"#F3F4F6", borderRadius:6, overflow:"hidden" }}>
            <div style={{ height:"100%", borderRadius:6, backgroundImage:GRAD, width:`${Math.round(ROOM_DATA.occupied/ROOM_DATA.capacity*100)}%` }}/>
          </div>
        </div>
        {/* Stay period */}
        <div style={{ marginTop:14, paddingTop:14, borderTop:"1px solid #F3F4F6" }}>
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
      </div>

      {/* Status badges */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
        <div style={{ background:"white", borderRadius:18, padding:"14px", boxShadow:"0 2px 10px rgba(0,0,0,.05)", display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:12, background:"#DCFCE7", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <CheckCircle size={17} color="#16A34A"/>
          </div>
          <div>
            <p style={{ margin:0, fontSize:11, fontWeight:800, color:"#1F2937", fontFamily:QS }}>BH Status</p>
            <p style={{ margin:"1px 0 0", fontSize:10, color:"#16A34A", fontFamily:IN, fontWeight:700 }}>{BH_DATA.status}</p>
          </div>
        </div>
        <div style={{ background:"white", borderRadius:18, padding:"14px", boxShadow:"0 2px 10px rgba(0,0,0,.05)", display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:12, background:"#DCFCE7", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Shield size={17} color="#16A34A"/>
          </div>
          <div>
            <p style={{ margin:0, fontSize:11, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Registration</p>
            <p style={{ margin:"1px 0 0", fontSize:10, color:"#16A34A", fontFamily:IN, fontWeight:700 }}>{BH_DATA.regStatus}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function OccupantsTab({ setSelOcc }: { setSelOcc:(v:{occ:Occupant;idx:number}|null)=>void }) {
  const occupancyPct = Math.round((ROOM_DATA.occupied/ROOM_DATA.capacity)*100);
  return (
    <div style={{ padding:"16px 16px 28px" }}>

      {/* Room stats */}
      <div style={{ background:"white", borderRadius:20, padding:"18px", boxShadow:"0 4px 16px rgba(0,0,0,.07)", marginBottom:14 }}>
        <p style={{ margin:"0 0 14px", fontSize:13, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Room Summary — {ROOM_DATA.name}</p>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:14 }}>
          {[
            { label:"Capacity",  val:ROOM_DATA.capacity,  color:"#9772F6", bg:"#F5F0FF" },
            { label:"Occupied",  val:ROOM_DATA.occupied,  color:"#EF4444", bg:"#FEE2E2" },
            { label:"Available", val:ROOM_DATA.available, color:"#16A34A", bg:"#DCFCE7" },
          ].map(({ label, val, color, bg })=>(
            <div key={label} style={{ textAlign:"center" as const, background:bg, borderRadius:14, padding:"12px 8px" }}>
              <p style={{ margin:0, fontSize:22, fontWeight:800, color, fontFamily:QS }}>{val}</p>
              <p style={{ margin:"2px 0 0", fontSize:10, color:"#9CA3AF", fontFamily:IN }}>{label}</p>
            </div>
          ))}
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
          <span style={{ fontSize:11, color:"#6B7280", fontFamily:IN }}>Occupancy Rate</span>
          <span style={{ fontSize:11, fontWeight:700, color:"#9772F6", fontFamily:QS }}>{occupancyPct}%</span>
        </div>
        <div style={{ height:8, background:"#F3F4F6", borderRadius:6, overflow:"hidden" }}>
          <div style={{ height:"100%", borderRadius:6, backgroundImage:GRAD, width:`${occupancyPct}%`, transition:"width .4s ease" }}/>
        </div>
      </div>

      {/* Occupants list */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <p style={{ fontSize:15, fontWeight:800, color:"#1F2937", margin:0, fontFamily:QS }}>Your Roommates</p>
        <span style={{ fontSize:11, color:"#9CA3AF", fontFamily:IN }}>Tap to view</span>
      </div>
      <div style={{ background:"white", borderRadius:20, overflow:"hidden", boxShadow:"0 2px 10px rgba(0,0,0,.05)", marginBottom:14 }}>
        {ROOM_OCCUPANTS.map((occ,i)=>{
          const color = occ.isMe ? "#9772F6" : AVATAR_COLORS[i % AVATAR_COLORS.length];
          return (
            <div key={occ.id} onClick={()=>setSelOcc({occ,idx:i})} style={{ padding:"14px 16px", borderBottom:i<ROOM_OCCUPANTS.length-1?"1px solid #F3F4F6":"none", cursor:"pointer", display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:46, height:46, borderRadius:15, backgroundImage:occ.isMe?GRAD:undefined, background:occ.isMe?undefined:color+"18", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, border:occ.isMe?undefined:`1.5px solid ${color}30` }}>
                <span style={{ fontSize:16, fontWeight:800, color:occ.isMe?"white":color, fontFamily:QS }}>{initials(occ.name)}</span>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
                  <p style={{ margin:0, fontSize:14, fontWeight:800, color:"#1F2937", fontFamily:QS }}>{occ.name}</p>
                  {occ.isMe && <span style={{ fontSize:8, fontWeight:800, padding:"2px 7px", borderRadius:20, backgroundImage:GRAD, color:"white", fontFamily:QS }}>You</span>}
                </div>
                <p style={{ margin:"0 0 3px", fontSize:11, color:"#6B7280", fontFamily:IN }}>{occ.bed} · {occ.program}</p>
                <span style={{ fontSize:9, fontWeight:800, padding:"2px 8px", borderRadius:20, background:occ.status==="active"?"#DCFCE7":"#FEF3C7", color:occ.status==="active"?"#16A34A":"#D97706", fontFamily:QS }}>
                  {occ.status==="active"?"Currently Staying":"Check-in Pending"}
                </span>
              </div>
              <ChevronRight size={14} color="#D1D5DB"/>
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

function AmenitiesTab() {
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

function RulesTab() {
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

export function StudentRoomOccupantsScreen({ go }: { go:(s:string)=>void }) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [selOcc, setSelOcc] = useState<{occ:Occupant;idx:number}|null>(null);

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
        <div style={{ position:"absolute" as const, top:-50, right:-50, width:180, height:180, borderRadius:"50%", background:"rgba(255,255,255,.06)" }}/>
        <div style={{ position:"absolute" as const, bottom:-30, left:-30, width:120, height:120, borderRadius:"50%", background:"rgba(255,255,255,.04)" }}/>
        <div style={{ padding:"52px 20px 20px", position:"relative" as const }}>
          <p style={{ margin:"0 0 3px", fontSize:11, color:"rgba(255,255,255,.6)", fontFamily:IN, textTransform:"uppercase" as const, letterSpacing:1, fontWeight:700 }}>My Boarding House</p>
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
        {activeTab === "overview"  && <OverviewTab go={go} />}
        {activeTab === "occupants" && <OccupantsTab setSelOcc={setSelOcc} />}
        {activeTab === "amenities" && <AmenitiesTab />}
        {activeTab === "rules"     && <RulesTab />}
      </div>

      {selOcc && <OccupantModal occ={selOcc.occ} idx={selOcc.idx} onClose={()=>setSelOcc(null)}/>}
    </div>
  );
}
