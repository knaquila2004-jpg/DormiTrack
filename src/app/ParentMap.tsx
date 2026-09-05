import React, { useRef, useState, useEffect } from "react";
import {
  MapPin, ExternalLink, Home, Building2, Clock, Layers,
  LocateFixed, ZoomIn, ZoomOut, Phone, MessageCircle,
  ChevronDown, ChevronUp, Compass, Map, User,
} from "lucide-react";
import { MAP_CENTER } from "./shared";
import { GoogleMapCanvas, GoogleMapHandle, MapInfoCard, MapMarker } from "./components/GoogleMapCanvas";
import { computeWalkingRoute, RouteResult } from "./components/mapGeo";
import { timeAgo } from "./notificationStore";
import { getMyLinkedStudentData, MyAssignment } from "./studentAssignmentStore";
import { getCheckInOutHistoryForStudent, CheckInOutRecord } from "./checkInOutStore";

const EMPTY_ASSIGNMENT: MyAssignment = {
  bh:   { id: "", name: "—", address: "—", lat: MAP_CENTER.lat, lng: MAP_CENTER.lng, cover: null, landlord: "—", landlordPhoto: null, contact: "—", email: "—", status: "Active", regStatus: "Approved", checkinRadiusMeters: 50, amenities: [], rules: [], totalRooms: 0, rentAmount: null, gallery: [] },
  room: { id: "", name: "—", bed: "—", capacity: 0, occupied: 0, available: 0, floor: "—", type: "—" },
  stay: { moveIn: "—", moveOut: "—", daysStayed: 0, daysRemaining: 0, totalDays: 0, stayLength: "—" },
};

const GRAD = "linear-gradient(135deg,#9772F6 0%,#7549F6 100%)";
const GRAD_H = "linear-gradient(160deg,#9772F6 0%,#7549F6 100%)";
const QS   = "'Quicksand',sans-serif";
const IN   = "'Inter',sans-serif";

export function ParentMapScreen({ go }: { go:(s:string)=>void }) {
  const [mapType,    setMapType]    = useState<"standard"|"satellite">("standard");
  const [zoom,       setZoom]       = useState(17);
  const [sheetOpen,  setSheetOpen]  = useState(true);
  const mapRef = useRef<GoogleMapHandle>(null);

  const [assignment, setAssignment] = useState<MyAssignment>(EMPTY_ASSIGNMENT);
  const [checkins,   setCheckins]   = useState<CheckInOutRecord[]>([]);
  useEffect(() => {
    let active = true;
    getMyLinkedStudentData().then(linked => {
      if (!active) return;
      if (linked.assignment) setAssignment(linked.assignment);
      if (linked.studentId) getCheckInOutHistoryForStudent(linked.studentId).then(cs => { if (active) setCheckins(cs); });
    });
    return () => { active = false; };
  }, []);
  const BH_DATA = assignment.bh;
  const ROOM_DATA = assignment.room;
  const bhPos = { lat: BH_DATA.lat, lng: BH_DATA.lng };

  // Real distance/walk-time from BISU Calape to the boarding house — see
  // ParentBoardingHouse.tsx's InfoTab for the same computation.
  const [distRoute, setDistRoute] = useState<RouteResult | null>(null);
  useEffect(() => {
    let active = true;
    computeWalkingRoute(MAP_CENTER, bhPos).then(r => { if (active) setDistRoute(r); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [BH_DATA.lat, BH_DATA.lng]);

  // There is no live GPS backend in this app (see checkInOutStore.ts) — rather than fabricating
  // a "current location" for the student, this shows only what's actually real and persisted:
  // their most recent check-in/out record, at whatever position that record was actually logged
  // at (if any was captured). No fake marker when nothing has ever been recorded.
  const latest = checkins[0] ?? null;
  const latestHasPos = latest && latest.lat != null && latest.lng != null;

  const markers: MapMarker[] = [
    {
      id: "bh", variant: "bh", position: bhPos, title: BH_DATA.name, zIndex: 10,
      infoContent: <MapInfoCard title={BH_DATA.name} subtitle={BH_DATA.address} rows={[["Landlord", BH_DATA.landlord], ["Contact", BH_DATA.contact]]} />,
    },
    ...(latest && latestHasPos ? [{
      id: "student", variant: "student" as const, position: { lat: latest.lat as number, lng: latest.lng as number },
      title: latest.type === "checkin" ? "Last entered" : "Last exited", zIndex: 5,
      infoContent: <MapInfoCard title={latest.type === "checkin" ? "Last Entered" : "Last Exited"} rows={[["When", timeAgo(new Date(latest.occurredAt).getTime())]]} />,
    }] : []),
  ];

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column" as const, background:"#1a2035", position:"relative" as const }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ flexShrink:0, backgroundImage:GRAD_H, padding:"52px 20px 16px", position:"relative" as const, overflow:"hidden", zIndex:10 }}>
        <div style={{ position:"absolute" as const, top:-40, right:-40, width:140, height:140, borderRadius:"42% 58% 65% 35%/45% 40% 60% 55%", background:"rgba(255,255,255,.05)", filter:"blur(24px)" }}/>
        <div>
          <h1 style={{ margin:"0 0 3px", fontSize:22, fontWeight:800, color:"white", fontFamily:QS }}>Map</h1>
          <p style={{ margin:0, fontSize:11, color:"rgba(255,255,255,.65)", fontFamily:IN }}>
            View your student's boarding house location.
          </p>
        </div>
      </div>

      {/* ── Map Area ────────────────────────────────────────────────────────── */}
      <div style={{ flex:1, position:"relative" as const, overflow:"hidden" }}>
        <GoogleMapCanvas
          ref={mapRef} center={bhPos} zoom={zoom} mapType={mapType} onZoomChange={setZoom}
          markers={markers}
        />

        {/* Distance / time badge — real, computed from BISU Calape to the boarding house */}
        <div style={{ position:"absolute" as const, top:14, left:14, zIndex:20 }}>
          <div style={{ background:"white", borderRadius:14, padding:"9px 13px", boxShadow:"0 3px 14px rgba(0,0,0,.18)", display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:28, height:28, borderRadius:9, backgroundImage:GRAD, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <MapPin size={13} color="white"/>
            </div>
            <div>
              <p style={{ margin:0, fontSize:8, color:"#9CA3AF", fontFamily:IN }}>Distance</p>
              <p style={{ margin:0, fontSize:12, fontWeight:800, color:"#1F2937", fontFamily:QS }}>{distRoute ? distRoute.distanceText : "…"}</p>
            </div>
            <div style={{ width:1, height:22, background:"#F3F4F6" }}/>
            <div style={{ width:28, height:28, borderRadius:9, background:"#FEF3C7", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Clock size={13} color="#D97706"/>
            </div>
            <div>
              <p style={{ margin:0, fontSize:8, color:"#9CA3AF", fontFamily:IN }}>Walk</p>
              <p style={{ margin:0, fontSize:12, fontWeight:800, color:"#1F2937", fontFamily:QS }}>{distRoute ? distRoute.durationText : "…"}</p>
            </div>
          </div>
        </div>

        {/* Map type — single click toggles standard/satellite directly */}
        <div style={{ position:"absolute" as const, top:14, right:14, zIndex:20 }}>
          <button
            onClick={()=>setMapType(t => t === "standard" ? "satellite" : "standard")}
            title={mapType === "standard" ? "Switch to satellite view" : "Switch to standard view"}
            style={{ width:40, height:40, borderRadius:13, background:"white", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 3px 12px rgba(0,0,0,.16)" }}
          >
            <Layers size={16} color={mapType === "satellite" ? "#9772F6" : "#374151"}/>
          </button>
        </div>

        {/* Right controls */}
        <div style={{ position:"absolute" as const, right:14, top:"45%", transform:"translateY(-50%)", display:"flex", flexDirection:"column" as const, gap:7, zIndex:20 }}>
          {[
            { Icon:ZoomIn,     fn:()=>mapRef.current?.zoomIn(),  blue:false },
            { Icon:ZoomOut,    fn:()=>mapRef.current?.zoomOut(), blue:false },
            { Icon:LocateFixed,fn:()=>mapRef.current?.recenter(),blue:true  },
            { Icon:Compass,    fn:()=>{},                        blue:false },
          ].map(({ Icon, fn, blue },i)=>(
            <button key={i} onClick={fn} style={{ width:38, height:38, borderRadius:12, background:"white", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 2px 8px rgba(0,0,0,.14)" }}>
              <Icon size={15} color={blue?"#3B82F6":"#374151"}/>
            </button>
          ))}
        </div>

        {/* Get Directions — opens real Google Maps directions using the viewer's own device
            location, instead of the app fabricating a "current position" it doesn't have. */}
        <div style={{ position:"absolute" as const, bottom:sheetOpen?276:120, left:"50%", transform:"translateX(-50%)", zIndex:20 }}>
          <a href={`https://www.google.com/maps/dir/?api=1&destination=${bhPos.lat},${bhPos.lng}`} target="_blank" rel="noopener noreferrer"
            style={{ padding:"11px 22px", borderRadius:22, backgroundImage:GRAD, border:"none", cursor:"pointer", color:"white", fontSize:13, fontWeight:800, fontFamily:QS, display:"flex", alignItems:"center", gap:7, boxShadow:"0 6px 20px rgba(0,0,0,.25)", textDecoration:"none" }}>
            <ExternalLink size={15} color="white"/>
            Get Directions
          </a>
        </div>
      </div>

      {/* ── Bottom Sheet ────────────────────────────────────────────────────── */}
      <div style={{ background:"white", borderRadius:"24px 24px 0 0", boxShadow:"0 -4px 24px rgba(0,0,0,.14)", zIndex:30, flexShrink:0 }}>
        <button onClick={()=>setSheetOpen(p=>!p)} style={{ width:"100%", padding:"12px 20px 0", background:"none", border:"none", cursor:"pointer", display:"flex", flexDirection:"column" as const, alignItems:"center", gap:6 }}>
          <div style={{ width:36, height:4, borderRadius:2, background:"#E5E7EB" }}/>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", width:"100%", paddingBottom:sheetOpen?0:12 }}>
            <p style={{ margin:0, fontSize:14, fontWeight:800, color:"#1F2937", fontFamily:QS }}>{BH_DATA.name}</p>
            {sheetOpen?<ChevronDown size={16} color="#9CA3AF"/>:<ChevronUp size={16} color="#9CA3AF"/>}
          </div>
        </button>

        {sheetOpen && (
          <div style={{ padding:"4px 20px 32px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:14 }}>
              <MapPin size={12} color="#9772F6"/>
              <span style={{ fontSize:12, color:"#6B7280", fontFamily:IN }}>{BH_DATA.address}</span>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
              {[
                { Icon:User,      label:"Landlord",    val:BH_DATA.landlord    },
                { Icon:Phone,     label:"Contact",     val:BH_DATA.contact     },
                { Icon:Home,      label:"Room",        val:ROOM_DATA.name      },
                { Icon:MapPin,    label:"Distance",    val:distRoute ? `${distRoute.distanceText} from BISU` : "…" },
              ].map(({ Icon, label, val })=>(
                <div key={label} style={{ background:"#F9FAFB", borderRadius:13, padding:"10px 12px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:3 }}>
                    <Icon size={11} color="#9772F6"/>
                    <span style={{ fontSize:9, color:"#9CA3AF", fontFamily:IN }}>{label}</span>
                  </div>
                  <p style={{ fontSize:11, fontWeight:700, color:"#1F2937", margin:0, fontFamily:QS, lineHeight:1.3 }}>{val}</p>
                </div>
              ))}
            </div>

            {/* Contact buttons */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <a href={`tel:${BH_DATA.contact}`} style={{ height:48, borderRadius:18, backgroundImage:GRAD, display:"flex", alignItems:"center", justifyContent:"center", gap:8, textDecoration:"none", boxShadow:"0 4px 14px rgba(151,114,246,.3)" }}>
                <Phone size={15} color="white"/>
                <span style={{ fontSize:13, fontWeight:800, color:"white", fontFamily:QS }}>Call Landlord</span>
              </a>
              <a href={`sms:${BH_DATA.contact}`} style={{ height:48, borderRadius:18, border:"2px solid #9772F6", display:"flex", alignItems:"center", justifyContent:"center", gap:8, textDecoration:"none", background:"white" }}>
                <MessageCircle size={15} color="#9772F6"/>
                <span style={{ fontSize:13, fontWeight:800, color:"#9772F6", fontFamily:QS }}>Message</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
