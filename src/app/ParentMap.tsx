import React, { useRef, useState } from "react";
import {
  MapPin, Navigation, Bell, Home, Building2, Clock, Layers,
  LocateFixed, ZoomIn, ZoomOut, Phone, MessageCircle,
  ChevronDown, ChevronUp, Compass, Map, User,
} from "lucide-react";
import { BH_DATA, ROOM_DATA } from "./StudentHome";
import { MAP_CENTER } from "./shared";
import { GoogleMapCanvas, GoogleMapHandle, MapInfoCard, MapMarker } from "./components/GoogleMapCanvas";

const GRAD = "linear-gradient(135deg,#9772F6 0%,#7549F6 100%)";
const GRAD_H = "linear-gradient(160deg,#9772F6 0%,#7549F6 100%)";
const QS   = "'Quicksand',sans-serif";
const IN   = "'Inter',sans-serif";

export function ParentMapScreen({ go }: { go:(s:string)=>void }) {
  const [mapType,    setMapType]    = useState<"standard"|"satellite">("standard");
  const [showMenu,   setShowMenu]   = useState(false);
  const [zoom,       setZoom]       = useState(17);
  const [sheetOpen,  setSheetOpen]  = useState(true);
  const [navigating, setNavigating] = useState(false);
  const mapRef = useRef<GoogleMapHandle>(null);

  // Simulated "last verified location" (no live GPS backend in this prototype) —
  // offset a plausible walking distance from the boarding house.
  const bhPos = { lat: BH_DATA.lat, lng: BH_DATA.lng };
  const lastVerifiedPos = { lat: BH_DATA.lat + 0.0035, lng: BH_DATA.lng + 0.0025 };

  const markers: MapMarker[] = [
    {
      id: "bh", variant: "bh", position: bhPos, title: BH_DATA.name, zIndex: 10,
      infoContent: <MapInfoCard title={BH_DATA.name} subtitle={BH_DATA.address} rows={[["Landlord", BH_DATA.landlord], ["Contact", BH_DATA.contact]]} />,
    },
    {
      id: "student", variant: "student", position: lastVerifiedPos, title: "Last verified location", zIndex: 5,
      infoContent: <MapInfoCard title="Last Verified Location" rows={[["Status", "Checked in"]]} />,
    },
  ];

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column" as const, background:"#1a2035", position:"relative" as const }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ flexShrink:0, backgroundImage:GRAD_H, padding:"52px 20px 16px", position:"relative" as const, overflow:"hidden", zIndex:10 }}>
        <div style={{ position:"absolute" as const, top:-40, right:-40, width:140, height:140, borderRadius:"50%", background:"rgba(255,255,255,.05)" }}/>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
          <div>
            <h1 style={{ margin:"0 0 3px", fontSize:22, fontWeight:800, color:"white", fontFamily:QS }}>Map</h1>
            <p style={{ margin:0, fontSize:11, color:"rgba(255,255,255,.65)", fontFamily:IN }}>
              View your student's boarding house location.
            </p>
          </div>
          <button style={{ width:40, height:40, borderRadius:13, background:"rgba(255,255,255,.15)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Bell size={18} color="white"/>
          </button>
        </div>
      </div>

      {/* ── Map Area ────────────────────────────────────────────────────────── */}
      <div style={{ flex:1, position:"relative" as const, overflow:"hidden" }}>
        <GoogleMapCanvas
          ref={mapRef} center={bhPos} zoom={zoom} mapType={mapType} onZoomChange={setZoom}
          markers={markers}
          polyline={navigating ? [lastVerifiedPos, bhPos] : undefined}
        />

        {/* Distance / time badge */}
        <div style={{ position:"absolute" as const, top:14, left:14, zIndex:20 }}>
          <div style={{ background:"white", borderRadius:14, padding:"9px 13px", boxShadow:"0 3px 14px rgba(0,0,0,.18)", display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:28, height:28, borderRadius:9, backgroundImage:GRAD, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <MapPin size={13} color="white"/>
            </div>
            <div>
              <p style={{ margin:0, fontSize:8, color:"#9CA3AF", fontFamily:IN }}>Distance</p>
              <p style={{ margin:0, fontSize:12, fontWeight:800, color:"#1F2937", fontFamily:QS }}>~0.5 km</p>
            </div>
            <div style={{ width:1, height:22, background:"#F3F4F6" }}/>
            <div style={{ width:28, height:28, borderRadius:9, background:"#FEF3C7", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Clock size={13} color="#D97706"/>
            </div>
            <div>
              <p style={{ margin:0, fontSize:8, color:"#9CA3AF", fontFamily:IN }}>Walk</p>
              <p style={{ margin:0, fontSize:12, fontWeight:800, color:"#1F2937", fontFamily:QS }}>~10 min</p>
            </div>
          </div>
        </div>

        {/* Map type */}
        <div style={{ position:"absolute" as const, top:14, right:14, zIndex:20 }}>
          <button onClick={()=>setShowMenu(p=>!p)} style={{ width:40, height:40, borderRadius:13, background:"white", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 3px 12px rgba(0,0,0,.16)" }}>
            <Layers size={16} color="#374151"/>
          </button>
          {showMenu && (
            <div style={{ position:"absolute" as const, top:48, right:0, background:"white", borderRadius:14, padding:6, boxShadow:"0 8px 24px rgba(0,0,0,.18)", zIndex:50, minWidth:110 }}>
              {(["standard","satellite"] as const).map(t=>(
                <button key={t} onClick={()=>{ setMapType(t); setShowMenu(false); }} style={{ width:"100%", padding:"8px 10px", borderRadius:9, border:"none", cursor:"pointer", background:mapType===t?"#F5F0FF":"white", color:mapType===t?"#9772F6":"#374151", fontSize:11, fontWeight:700, fontFamily:QS, textAlign:"left" as const }}>
                  {t==="standard"?"Standard":"Satellite"}
                </button>
              ))}
            </div>
          )}
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

        {/* Get Directions button */}
        <div style={{ position:"absolute" as const, bottom:sheetOpen?276:120, left:"50%", transform:"translateX(-50%)", zIndex:20 }}>
          <button onClick={()=>setNavigating(p=>!p)} style={{ padding:"11px 22px", borderRadius:22, backgroundImage:navigating?"linear-gradient(135deg,#16A34A,#15803D)":GRAD, border:"none", cursor:"pointer", color:"white", fontSize:13, fontWeight:800, fontFamily:QS, display:"flex", alignItems:"center", gap:7, boxShadow:"0 6px 20px rgba(0,0,0,.25)" }}>
            <Navigation size={15} color="white"/>
            {navigating?"Stop Directions":"Get Directions"}
          </button>
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
                { Icon:MapPin,    label:"Distance",    val:"~0.5 km from BISU" },
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
