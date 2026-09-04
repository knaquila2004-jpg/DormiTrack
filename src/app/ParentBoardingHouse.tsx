import React, { useState, useEffect } from "react";
import {
  Building2, MapPin, Phone, Mail, User, Home, Bed, Users,
  ChevronLeft, ChevronRight, X, Star, Wifi, Droplet, Zap,
  Utensils, BookOpen, Shirt, Car, Shield, Clock, MessageCircle,
  AlertCircle, CheckCircle, Image, Info,
} from "lucide-react";
import { getMyLinkedStudentData, MyBoardingHouse, MyRoom, MyAssignment } from "./studentAssignmentStore";
import { getRoommates, Occupant as RealOccupant } from "./registrationStore";
import { GoogleMapCanvas } from "./components/GoogleMapCanvas";
import { FullScreenBHMap } from "./components/FullScreenBHMap";
import { computeWalkingRoute, RouteResult } from "./components/mapGeo";
import { MAP_CENTER } from "./shared";

const EMPTY_ASSIGNMENT: MyAssignment = {
  bh:   { id: "", name: "—", address: "—", lat: 0, lng: 0, cover: null, landlord: "—", landlordPhoto: null, contact: "—", email: "—", status: "Active", regStatus: "Approved", checkinRadiusMeters: 50, amenities: [], rules: [], totalRooms: 0, rentAmount: null, gallery: [] },
  room: { id: "", name: "—", bed: "—", capacity: 0, occupied: 0, available: 0, floor: "—", type: "—" },
  stay: { moveIn: "—", moveOut: "—", daysStayed: 0, daysRemaining: 0, totalDays: 0, stayLength: "—" },
};

const GRAD = "linear-gradient(135deg,#9772F6 0%,#7549F6 100%)";
const QS   = "'Quicksand',sans-serif";
const IN   = "'Inter',sans-serif";

const AMENITY_ICONS: Record<string, React.ReactNode> = {
  "WiFi":         <Wifi     size={15} color="#9772F6"/>,
  "Water":        <Droplet  size={15} color="#3B82F6"/>,
  "Electricity":  <Zap      size={15} color="#D97706"/>,
  "Laundry Area": <Shirt    size={15} color="#EC4899"/>,
  "Kitchen":      <Utensils size={15} color="#16A34A"/>,
  "Study Room":   <BookOpen size={15} color="#6366F1"/>,
  "Parking":      <Car      size={15} color="#9CA3AF"/>,
};

type RoomOccupant = { id:string; name:string; program:string; year:string; isStudent:boolean; photo:string|null };

const AVATAR_COLORS = ["#9772F6","#3B82F6","#16A34A","#EC4899","#D97706","#6366F1"];
const initials = (name: string) => name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase();

type Tab = "info" | "room" | "gallery" | "landlord";

function InfoRow({ label, value, last=false }: { label:string; value:string; last?:boolean }) {
  return (
    <div style={{ padding:"9px 0", borderBottom:last?"none":"1px solid #F9FAFB" }}>
      <p style={{ margin:0, fontSize:9, color:"#9CA3AF", fontWeight:700, fontFamily:QS, textTransform:"uppercase" as const, letterSpacing:0.5 }}>{label}</p>
      <p style={{ margin:"2px 0 0", fontSize:12, fontWeight:700, color:"#1F2937", fontFamily:IN, lineHeight:1.4 }}>{value||"—"}</p>
    </div>
  );
}

function InfoTab({ bhData: BH_DATA }: { bhData: MyBoardingHouse }) {
  const [showFullMap, setShowFullMap] = useState(false);
  // Real distance/walk-time from BISU Calape (MAP_CENTER) to the boarding house's actual
  // coordinates — same computeWalkingRoute helper FullScreenBHMap already uses for real routing,
  // reused here instead of the fixed "~0.5 km" every boarding house used to show.
  const [distRoute, setDistRoute] = useState<RouteResult | null>(null);
  useEffect(() => {
    let active = true;
    computeWalkingRoute(MAP_CENTER, { lat: BH_DATA.lat, lng: BH_DATA.lng }).then(r => { if (active) setDistRoute(r); });
    return () => { active = false; };
  }, [BH_DATA.lat, BH_DATA.lng]);
  return (
    <div style={{ padding:"16px 16px 28px" }}>
      {/* BH Info */}
      <div style={{ background:"white", borderRadius:20, padding:"18px", boxShadow:"0 4px 16px rgba(0,0,0,.07)", marginBottom:14 }}>
        <p style={{ margin:"0 0 12px", fontSize:13, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Boarding House Details</p>
        <div style={{ borderRadius:14, overflow:"hidden", height:120, position:"relative" as const, marginBottom:12 }}>
          <GoogleMapCanvas
            center={{ lat: BH_DATA.lat, lng: BH_DATA.lng }}
            zoom={15}
            mapType="standard"
            markers={[{ id:"bh", variant:"bh", position:{ lat: BH_DATA.lat, lng: BH_DATA.lng }, title: BH_DATA.name }]}
          />
          <button onClick={()=>setShowFullMap(true)} style={{ position:"absolute" as const, bottom:8, right:8, zIndex:20, padding:"6px 12px", borderRadius:12, border:"none", backgroundImage:GRAD, color:"white", fontSize:10, fontWeight:800, fontFamily:QS, cursor:"pointer", boxShadow:"0 3px 10px rgba(0,0,0,.2)" }}>
            Show Full Map
          </button>
        </div>
        {showFullMap && (
          <FullScreenBHMap
            bh={{ name: BH_DATA.name, address: BH_DATA.address, landlord: BH_DATA.landlord, contact: BH_DATA.contact, lat: BH_DATA.lat, lng: BH_DATA.lng }}
            onClose={()=>setShowFullMap(false)}
          />
        )}
        <InfoRow label="Name"            value={BH_DATA.name}    />
        <InfoRow label="Complete Address" value={BH_DATA.address} />
        <InfoRow label="Distance from BISU Calape" value={distRoute ? `${distRoute.distanceText} (${distRoute.durationText} walk)` : "Calculating…"} />
        <InfoRow label="Monthly Rental"  value={BH_DATA.rentAmount != null ? `₱${BH_DATA.rentAmount.toLocaleString()} / month` : "Not set by landlord"} last/>
      </div>

      {/* Amenities */}
      <div style={{ background:"white", borderRadius:20, padding:"18px", boxShadow:"0 4px 16px rgba(0,0,0,.07)", marginBottom:14 }}>
        <p style={{ margin:"0 0 14px", fontSize:13, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Amenities</p>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {BH_DATA.amenities.map((am:string)=>(
            <div key={am} style={{ display:"flex", alignItems:"center", gap:10, background:"#F9FAFB", borderRadius:13, padding:"11px 13px" }}>
              <div style={{ width:30, height:30, borderRadius:10, background:"white", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 2px 8px rgba(0,0,0,.06)" }}>
                {AMENITY_ICONS[am] ?? <Star size={14} color="#9772F6"/>}
              </div>
              <p style={{ margin:0, fontSize:11, fontWeight:700, color:"#1F2937", fontFamily:QS }}>{am}</p>
            </div>
          ))}
        </div>
      </div>

      {/* House Rules */}
      <div style={{ background:"white", borderRadius:20, padding:"18px", boxShadow:"0 4px 16px rgba(0,0,0,.07)" }}>
        <p style={{ margin:"0 0 12px", fontSize:13, fontWeight:800, color:"#1F2937", fontFamily:QS }}>House Rules</p>
        {BH_DATA.rules.map((rule:string, i:number)=>(
          <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"9px 0", borderBottom:i<BH_DATA.rules.length-1?"1px solid #F9FAFB":"none" }}>
            <div style={{ width:22, height:22, borderRadius:8, backgroundImage:GRAD, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1 }}>
              <span style={{ fontSize:9, fontWeight:800, color:"white", fontFamily:QS }}>{i+1}</span>
            </div>
            <p style={{ margin:0, fontSize:11, color:"#374151", fontFamily:IN, lineHeight:1.5, flex:1 }}>{rule}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RoomTab({ roomData: ROOM_DATA, occupants: ROOM_OCCUPANTS }: { roomData: MyRoom; occupants: RoomOccupant[] }) {
  const occupancyPct = ROOM_DATA.capacity > 0 ? Math.round(ROOM_DATA.occupied / ROOM_DATA.capacity * 100) : 0;
  return (
    <div style={{ padding:"16px 16px 28px" }}>
      {/* Room stats */}
      <div style={{ background:"white", borderRadius:20, padding:"18px", boxShadow:"0 4px 16px rgba(0,0,0,.07)", marginBottom:14 }}>
        <p style={{ margin:"0 0 14px", fontSize:13, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Room Information</p>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:14 }}>
          {[
            { label:"Capacity",  val:ROOM_DATA.capacity,  color:"#9772F6", bg:"#F5F0FF" },
            { label:"Occupied",  val:ROOM_DATA.occupied,  color:"#EF4444", bg:"#FEE2E2" },
            { label:"Available", val:ROOM_DATA.available, color:"#16A34A", bg:"#DCFCE7" },
          ].map(({ label, val, color, bg })=>(
            <div key={label} style={{ background:bg, borderRadius:13, padding:"12px 8px", textAlign:"center" as const }}>
              <p style={{ margin:0, fontSize:20, fontWeight:800, color, fontFamily:QS }}>{val}</p>
              <p style={{ margin:"2px 0 0", fontSize:9, color:"#9CA3AF", fontFamily:IN }}>{label}</p>
            </div>
          ))}
        </div>
        <div style={{ marginBottom:4 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
            <span style={{ fontSize:11, color:"#6B7280", fontFamily:IN }}>Occupancy Rate</span>
            <span style={{ fontSize:11, fontWeight:700, color:"#9772F6", fontFamily:QS }}>{occupancyPct}%</span>
          </div>
          <div style={{ height:8, background:"#F3F4F6", borderRadius:6, overflow:"hidden" }}>
            <div style={{ height:"100%", borderRadius:6, backgroundImage:GRAD, width:`${occupancyPct}%` }}/>
          </div>
        </div>
        <div style={{ marginTop:12 }}>
          <InfoRow label="Room Number"  value={ROOM_DATA.name}                         />
          <InfoRow label="Bed Space"    value={ROOM_DATA.bed}                          />
          <InfoRow label="Floor"        value={ROOM_DATA.floor}                        />
          <InfoRow label="Room Type"    value={ROOM_DATA.type}                         last />
        </div>
      </div>

      {/* Occupants */}
      <p style={{ margin:"0 0 10px", fontSize:14, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Room Occupants</p>
      <div style={{ background:"white", borderRadius:20, overflow:"hidden", boxShadow:"0 4px 16px rgba(0,0,0,.07)", marginBottom:14 }}>
        {ROOM_OCCUPANTS.map((occ,i)=>{
          const color = occ.isStudent ? "#9772F6" : AVATAR_COLORS[i % AVATAR_COLORS.length];
          return (
            <div key={occ.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"13px 16px", borderBottom:i<ROOM_OCCUPANTS.length-1?"1px solid #F3F4F6":"none" }}>
              <div style={{ width:42, height:42, borderRadius:"50%", backgroundImage:occ.isStudent?GRAD:undefined, background:occ.isStudent?undefined:color+"18", border:occ.isStudent?undefined:`1.5px solid ${color}30`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, overflow:"hidden" }}>
                {occ.photo ? <img src={occ.photo} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : <span style={{ fontSize:14, fontWeight:800, color:occ.isStudent?"white":color, fontFamily:QS }}>{initials(occ.name)}</span>}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:1 }}>
                  <p style={{ margin:0, fontSize:13, fontWeight:800, color:"#1F2937", fontFamily:QS }}>{occ.name}</p>
                  {occ.isStudent && <span style={{ fontSize:8, fontWeight:800, padding:"2px 7px", borderRadius:20, backgroundImage:GRAD, color:"white", fontFamily:QS }}>Your Student</span>}
                </div>
                <p style={{ margin:0, fontSize:11, color:"#6B7280", fontFamily:IN }}>{occ.program} · {occ.year}</p>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ background:"#EFF6FF", borderRadius:14, padding:"11px 14px", display:"flex", gap:8, alignItems:"flex-start" }}>
        <Info size={13} color="#3B82F6" style={{ flexShrink:0, marginTop:1 }}/>
        <p style={{ margin:0, fontSize:11, color:"#1D4ED8", fontFamily:IN, lineHeight:1.5 }}>
          Contact details, payment records, and personal addresses of other occupants are not displayed to protect their privacy.
        </p>
      </div>
    </div>
  );
}

function GalleryTab({ gallery: PHOTOS }: { gallery: { id:string; url:string; label:string }[] }) {
  const [selected, setSelected] = useState<number|null>(null);
  return (
    <div style={{ padding:"16px 16px 28px" }}>
      <p style={{ margin:"0 0 12px", fontSize:13, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Boarding House Photos</p>
      {PHOTOS.length === 0 ? (
        <div style={{ background:"white", borderRadius:16, padding:"32px 20px", textAlign:"center" as const, marginBottom:14, boxShadow:"0 4px 16px rgba(0,0,0,.07)" }}>
          <Image size={28} color="#D1D5DB" style={{ margin:"0 auto 10px" }}/>
          <p style={{ margin:0, fontSize:12, color:"#9CA3AF", fontFamily:IN }}>The landlord hasn't uploaded any photos yet.</p>
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
          {PHOTOS.map((p,i)=>(
            <button key={p.id} onClick={()=>setSelected(i)} style={{ height:120, borderRadius:16, background:"none", border:"none", cursor:"pointer", overflow:"hidden", position:"relative" as const }}>
              <img src={p.url} alt={p.label || "Boarding house photo"} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}/>
              {p.label && <span style={{ position:"absolute" as const, bottom:8, left:8, fontSize:9, color:"white", fontFamily:QS, fontWeight:700, textShadow:"0 1px 4px rgba(0,0,0,.6)" }}>{p.label}</span>}
            </button>
          ))}
        </div>
      )}
      <div style={{ background:"#FEF3C7", borderRadius:14, padding:"11px 14px", display:"flex", gap:8, alignItems:"flex-start" }}>
        <AlertCircle size={13} color="#D97706" style={{ flexShrink:0, marginTop:1 }}/>
        <p style={{ margin:0, fontSize:11, color:"#92400E", fontFamily:IN, lineHeight:1.5 }}>
          Photos are uploaded by the landlord. Parents can view only.
        </p>
      </div>

      {/* Lightbox */}
      {selected !== null && (
        <div style={{ position:"fixed" as const, inset:0, background:"rgba(0,0,0,.9)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={()=>setSelected(null)}>
          <button onClick={()=>setSelected(null)} style={{ position:"absolute" as const, top:16, right:16, width:36, height:36, borderRadius:12, background:"rgba(255,255,255,.15)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <X size={16} color="white"/>
          </button>
          <img src={PHOTOS[selected].url} alt={PHOTOS[selected].label || "Boarding house photo"} style={{ maxWidth:"88%", maxHeight:"72%", borderRadius:20, objectFit:"contain" }}/>
          <div style={{ position:"absolute" as const, bottom:40, left:"50%", transform:"translateX(-50%)", display:"flex", gap:8 }}>
            {PHOTOS.map((_,i)=>(
              <div key={i} onClick={e=>{e.stopPropagation();setSelected(i);}} style={{ width:i===selected?24:8, height:8, borderRadius:4, background:i===selected?"white":"rgba(255,255,255,.35)", cursor:"pointer", transition:"width .2s" }}/>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LandlordTab({ bhData: BH_DATA }: { bhData: MyBoardingHouse }) {
  return (
    <div style={{ padding:"16px 16px 28px" }}>
      <div style={{ background:"white", borderRadius:20, padding:"20px", boxShadow:"0 4px 16px rgba(0,0,0,.07)" }}>
        {/* Landlord avatar */}
        <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:18 }}>
          <div style={{ width:60, height:60, borderRadius:"50%", backgroundImage:GRAD, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
            {BH_DATA.landlordPhoto ? <img src={BH_DATA.landlordPhoto} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : (
              <span style={{ fontSize:22, fontWeight:800, color:"white", fontFamily:QS }}>
                {BH_DATA.landlord.split(" ").map((n:string)=>n[0]).join("").slice(0,2)}
              </span>
            )}
          </div>
          <div>
            <p style={{ margin:"0 0 2px", fontSize:16, fontWeight:800, color:"#1F2937", fontFamily:QS }}>{BH_DATA.landlord}</p>
            <span style={{ fontSize:10, fontWeight:800, padding:"3px 10px", borderRadius:20, backgroundImage:GRAD, color:"white", fontFamily:QS }}>Landlord</span>
          </div>
        </div>

        <InfoRow label="Contact Number" value={BH_DATA.contact} />
        <InfoRow label="Email Address"  value={BH_DATA.email}   last/>

        {/* Contact buttons */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:16 }}>
          <a href={`tel:${BH_DATA.contact}`} style={{ height:48, borderRadius:18, backgroundImage:GRAD, display:"flex", alignItems:"center", justifyContent:"center", gap:8, textDecoration:"none", boxShadow:"0 4px 16px rgba(151,114,246,.3)" }}>
            <Phone size={16} color="white"/>
            <span style={{ fontSize:13, fontWeight:800, color:"white", fontFamily:QS }}>Call</span>
          </a>
          <a href={`sms:${BH_DATA.contact}`} style={{ height:48, borderRadius:18, border:"2px solid #9772F6", display:"flex", alignItems:"center", justifyContent:"center", gap:8, textDecoration:"none", background:"white" }}>
            <MessageCircle size={16} color="#9772F6"/>
            <span style={{ fontSize:13, fontWeight:800, color:"#9772F6", fontFamily:QS }}>Message</span>
          </a>
        </div>
      </div>
    </div>
  );
}

export function ParentBoardingHouseScreen({ go }: { go:(s:string)=>void }) {
  const [activeTab, setActiveTab] = useState<Tab>("info");
  const [assignment, setAssignment] = useState<MyAssignment>(EMPTY_ASSIGNMENT);
  const [roommates, setRoommates] = useState<RoomOccupant[]>([]);
  useEffect(() => {
    let active = true;
    getMyLinkedStudentData().then(async linked => {
      if (!active) return;
      if (linked.assignment) setAssignment(linked.assignment);
      if (linked.studentId) {
        const mates = await getRoommates(linked.studentId);
        if (!active) return;
        const myStudentName = linked.profile?.name;
        const mapped: RoomOccupant[] = mates.map((r: RealOccupant) => ({
          id: r.studentId, name: r.studentName, program: r.program ?? "—",
          year: r.yearLevel ? `${r.yearLevel}${r.yearLevel === 1 ? "st" : r.yearLevel === 2 ? "nd" : r.yearLevel === 3 ? "rd" : "th"} Year` : "—",
          isStudent: false, photo: r.photo,
        }));
        const me: RoomOccupant[] = myStudentName ? [{ id: linked.studentId, name: myStudentName, program: linked.profile?.program ?? "—", year: linked.profile?.year ?? "—", isStudent: true, photo: linked.profile?.photo ?? null }] : [];
        setRoommates([...me, ...mapped]);
      }
    });
    return () => { active = false; };
  }, []);
  const BH_DATA = assignment.bh;
  const ROOM_DATA = assignment.room;

  const TABS: { id:Tab; label:string }[] = [
    { id:"info",     label:"Info"     },
    { id:"room",     label:"Room"     },
    { id:"gallery",  label:"Gallery"  },
    { id:"landlord", label:"Landlord" },
  ];

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column" as const, background:"#F2F4F8", position:"relative" as const }}>

      {/* Header */}
      <div style={{ flexShrink:0, backgroundImage:GRAD, overflow:"hidden", position:"relative" as const }}>
        <div style={{ position:"absolute" as const, top:-40, right:-40, width:160, height:160, borderRadius:"50%", background:"rgba(255,255,255,.05)" }}/>
        <div style={{ padding:"52px 20px 0", position:"relative" as const }}>
          <p style={{ margin:"0 0 3px", fontSize:11, color:"rgba(255,255,255,.6)", fontFamily:IN, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:1 }}>Boarding House</p>
          <h1 style={{ margin:"0 0 4px", fontSize:21, fontWeight:800, color:"white", fontFamily:QS, lineHeight:1.2 }}>{BH_DATA.name}</h1>
          <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:18 }}>
            <MapPin size={11} color="rgba(255,255,255,.7)"/>
            <p style={{ margin:0, fontSize:11, color:"rgba(255,255,255,.7)", fontFamily:IN }}>{BH_DATA.address}</p>
          </div>
          <div style={{ display:"flex", gap:4 }}>
            {[
              { label:ROOM_DATA.name,         sub:"Room"       },
              { label:ROOM_DATA.bed,          sub:"Bed"        },
              { label:`${ROOM_DATA.occupied}/${ROOM_DATA.capacity}`, sub:"Occupancy" },
              { label:BH_DATA.regStatus,      sub:"Status"     },
            ].map(({ label, sub })=>(
              <div key={sub} style={{ flex:1, background:"rgba(255,255,255,.15)", borderRadius:12, padding:"7px 4px", textAlign:"center" as const }}>
                <p style={{ margin:0, fontSize:11, fontWeight:800, color:"white", fontFamily:QS, lineHeight:1.1 }}>{label}</p>
                <p style={{ margin:"1px 0 0", fontSize:7, color:"rgba(255,255,255,.6)", fontFamily:IN }}>{sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", padding:"0 16px" }}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{ flex:1, padding:"11px 4px 12px", border:"none", cursor:"pointer", background:"none", color:activeTab===t.id?"white":"rgba(255,255,255,.5)", fontSize:11, fontWeight:800, fontFamily:QS, borderBottom:activeTab===t.id?"3px solid white":"3px solid transparent" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab body */}
      <div style={{ flex:1, overflowY:"auto" as const, scrollbarWidth:"none" as const }}>
        {activeTab === "info"     && <InfoTab bhData={BH_DATA} />}
        {activeTab === "room"     && <RoomTab roomData={ROOM_DATA} occupants={roommates} />}
        {activeTab === "gallery"  && <GalleryTab gallery={BH_DATA.gallery} />}
        {activeTab === "landlord" && <LandlordTab bhData={BH_DATA} />}
      </div>
    </div>
  );
}
