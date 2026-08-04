import React, { useState, useEffect, useRef } from "react";
import {
  MapPin, Navigation, Bell, Home, Building2, Clock, Layers,
  LocateFixed, ZoomIn, ZoomOut, CheckCircle, XCircle, AlertCircle,
  LogIn, LogOut, Wifi, Compass, Shield, ChevronDown, ChevronUp,
  Activity, Radio, Check, X, Crosshair, RefreshCw, Eye,
} from "lucide-react";
import { BH_DATA, ROOM_DATA, STUDENT_DATA, STAY_DATA } from "./StudentHome";
import { MAP_CENTER } from "./shared";
import { GoogleMapCanvas, GoogleMapHandle, MapInfoCard, MapMarker } from "./components/GoogleMapCanvas";

const GRAD   = "linear-gradient(135deg,#9772F6 0%,#7549F6 100%)";
const GRAD_H = "linear-gradient(160deg,#9772F6 0%,#7549F6 100%)";
const QS     = "'Quicksand',sans-serif";
const IN     = "'Inter',sans-serif";

// ── Types ─────────────────────────────────────────────────────────────────────

type AttendanceStatus = "not-checked-in" | "checked-in" | "checked-out";
type GpsStatus        = "active" | "disabled" | "denied";
type LocationProximity = "within" | "outside";

interface VerificationRecord {
  id: string;
  type: "checkin" | "checkout";
  date: string;
  time: string;
  address: string;
  coords: string;
  result: "verified" | "failed";
}

interface ActivityLog {
  id: string;
  msg: string;
  time: string;
  color: string;
  bg: string;
  Icon: React.FC<{ size: number; color: string }>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" });
}
function fmtTime(d: Date) {
  return d.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", hour12: true });
}

const NOW = new Date();
const TODAY_STR  = fmtDate(NOW);
const NOW_TIME   = fmtTime(NOW);

// ── Seed data ─────────────────────────────────────────────────────────────────

const SEED_HISTORY: VerificationRecord[] = [
  { id:"h1", type:"checkout",  date:"August 3, 2026", time:"5:46 PM", address:"Km 4 National Highway, Tagbilaran City",  coords:"9.6533° N, 123.8527° E", result:"verified" },
  { id:"h2", type:"checkin",   date:"August 3, 2026", time:"8:02 AM", address:"Km 4 National Highway, Tagbilaran City",  coords:"9.6533° N, 123.8527° E", result:"verified" },
  { id:"h3", type:"checkout",  date:"August 2, 2026", time:"6:10 PM", address:"Km 4 National Highway, Tagbilaran City",  coords:"9.6533° N, 123.8527° E", result:"verified" },
  { id:"h4", type:"checkin",   date:"August 2, 2026", time:"7:55 AM", address:"Km 4 National Highway, Tagbilaran City",  coords:"9.6533° N, 123.8527° E", result:"verified" },
];

const SEED_LOGS: ActivityLog[] = [
  { id:"l1", msg:"Checked Out — Aug 3, 5:46 PM",         time:"Yesterday", color:"#D97706", bg:"#FEF3C7", Icon: LogOut      },
  { id:"l2", msg:"Checked In — Aug 3, 8:02 AM",          time:"Yesterday", color:"#16A34A", bg:"#DCFCE7", Icon: LogIn       },
  { id:"l3", msg:"Location Verified — within 18m",        time:"Yesterday", color:"#9772F6", bg:"#F5F0FF", Icon: CheckCircle },
  { id:"l4", msg:"GPS Enabled — location acquired",       time:"2d ago",    color:"#3B82F6", bg:"#EFF6FF", Icon: Radio       },
  { id:"l5", msg:"Verification Failed — outside radius",  time:"3d ago",    color:"#EF4444", bg:"#FEE2E2", Icon: XCircle     },
];

// ── Success Modal ─────────────────────────────────────────────────────────────

function SuccessModal({ type, time, onClose }: { type:"checkin"|"checkout"; time:string; onClose:()=>void }) {
  const isIn = type === "checkin";
  return (
    <div style={{ position:"fixed" as const, inset:0, background:"rgba(0,0,0,.6)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}
         onClick={onClose}>
      <div style={{ background:"white", borderRadius:28, padding:"32px 24px", width:"100%", maxWidth:340, textAlign:"center" as const, boxShadow:"0 24px 80px rgba(0,0,0,.3)" }}
           onClick={e=>e.stopPropagation()}>
        {/* Animated check circle */}
        <div style={{ width:80, height:80, borderRadius:"50%", backgroundImage:GRAD, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px", boxShadow:"0 8px 32px rgba(151,114,246,.4)" }}>
          {isIn ? <LogIn size={36} color="white"/> : <LogOut size={36} color="white"/>}
        </div>
        <h2 style={{ margin:"0 0 8px", fontSize:20, fontWeight:800, color:"#1F2937", fontFamily:QS }}>
          {isIn ? "Successfully Checked In!" : "Successfully Checked Out!"}
        </h2>
        <p style={{ margin:"0 0 20px", fontSize:13, color:"#6B7280", fontFamily:IN, lineHeight:1.6 }}>
          {isIn
            ? "Your arrival at the boarding house has been recorded and verified."
            : "Your departure from the boarding house has been recorded and verified."}
        </p>
        {/* Details */}
        <div style={{ background:"#F9FAFB", borderRadius:16, padding:"14px 16px", marginBottom:20, textAlign:"left" as const }}>
          {[
            ["Student",     STUDENT_DATA.name    ],
            ["Student ID",  STUDENT_DATA.id      ],
            ["Boarding House", BH_DATA.name      ],
            ["Room / Bed",  `${ROOM_DATA.name} · ${ROOM_DATA.bed}`],
            ["Date",        TODAY_STR             ],
            ["Time",        time                  ],
            ["GPS Status",  "Verified ✓"          ],
          ].map(([l,v])=>(
            <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:"1px solid #F3F4F6" }}>
              <span style={{ fontSize:11, color:"#9CA3AF", fontFamily:QS, fontWeight:700 }}>{l}</span>
              <span style={{ fontSize:11, color:"#1F2937", fontFamily:IN, fontWeight:700, maxWidth:"55%", textAlign:"right" as const }}>{v}</span>
            </div>
          ))}
        </div>
        {/* Sync note */}
        <div style={{ background:"#F0FDF4", borderRadius:12, padding:"10px 12px", marginBottom:20, display:"flex", gap:8, alignItems:"flex-start" }}>
          <CheckCircle size={13} color="#16A34A" style={{ flexShrink:0, marginTop:2 }}/>
          <p style={{ margin:0, fontSize:11, color:"#166534", fontFamily:IN, lineHeight:1.5 }}>
            Record synced to landlord dashboard and Housing Director admin panel.
          </p>
        </div>
        <button onClick={onClose} style={{ width:"100%", height:52, borderRadius:20, backgroundImage:GRAD, border:"none", cursor:"pointer", color:"white", fontSize:14, fontWeight:800, fontFamily:QS, boxShadow:"0 6px 20px rgba(151,114,246,.35)" }}>
          Done
        </button>
      </div>
    </div>
  );
}

// ── Map SVG Component ─────────────────────────────────────────────────────────

function MapView({ withinRadius, zoom, onZoomIn, onZoomOut, onRecenter, simDistance }: {
  withinRadius: boolean; zoom: number; onZoomIn:()=>void; onZoomOut:()=>void; onRecenter:()=>void; simDistance: number;
}) {
  const [mapType, setMapType] = useState<"standard"|"satellite">("standard");
  const [showMenu, setShowMenu] = useState(false);
  const mapRef = useRef<GoogleMapHandle>(null);

  const travelMin  = Math.round(simDistance / 80);

  // Simulated GPS position (no live location backend in this prototype) — offset
  // due north of the boarding house by `simDistance` meters.
  const bhPos = { lat: BH_DATA.lat, lng: BH_DATA.lng };
  const studentPos = { lat: BH_DATA.lat + simDistance / 111320, lng: BH_DATA.lng };

  const markers: MapMarker[] = [
    {
      id: "bh", variant: "bh", position: bhPos, title: BH_DATA.name, zIndex: 10,
      infoContent: <MapInfoCard title={BH_DATA.name} subtitle={BH_DATA.address} rows={[["Landlord", BH_DATA.landlord], ["Contact", BH_DATA.contact]]} />,
    },
    {
      id: "student", variant: "student", position: studentPos, title: "You", zIndex: 5,
      infoContent: <MapInfoCard title="Your Location" rows={[["Status", withinRadius ? "Within radius" : "Outside radius"], ["Distance", `${simDistance} m`]]} />,
    },
  ];

  return (
    <div style={{ position:"relative" as const, height:280, background:"#E8EDF5", overflow:"hidden", flexShrink:0 }}>
      {/* Base map */}
      <GoogleMapCanvas
        ref={mapRef} center={bhPos} zoom={zoom} mapType={mapType}
        markers={markers}
        polyline={[studentPos, bhPos]}
        circle={{ center: bhPos, radiusMeters: 50, color: withinRadius ? "#9772F6" : "#EF4444" }}
      />

      {/* Top-left distance badge */}
      <div style={{ position:"absolute" as const, top:10, left:12, zIndex:20 }}>
        <div style={{ background:"white", borderRadius:13, padding:"8px 12px", boxShadow:"0 3px 12px rgba(0,0,0,.14)", display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:28, height:28, borderRadius:9, backgroundImage:GRAD, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <MapPin size={13} color="white"/>
          </div>
          <div>
            <p style={{ margin:0, fontSize:8, color:"#9CA3AF", fontFamily:IN }}>Distance</p>
            <p style={{ margin:0, fontSize:12, fontWeight:800, color:"#1F2937", fontFamily:QS }}>{simDistance}m away</p>
          </div>
          <div style={{ width:1, height:22, background:"#F3F4F6" }}/>
          <div style={{ width:28, height:28, borderRadius:9, background:"#FEF3C7", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Clock size={13} color="#D97706"/>
          </div>
          <div>
            <p style={{ margin:0, fontSize:8, color:"#9CA3AF", fontFamily:IN }}>Est. Walk</p>
            <p style={{ margin:0, fontSize:12, fontWeight:800, color:"#1F2937", fontFamily:QS }}>{travelMin < 1 ? "<1 min" : `${travelMin} min`}</p>
          </div>
        </div>
      </div>

      {/* Top-right map type */}
      <div style={{ position:"absolute" as const, top:10, right:12, zIndex:20 }}>
        <button onClick={()=>setShowMenu(p=>!p)} style={{ width:38, height:38, borderRadius:12, background:"white", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 3px 12px rgba(0,0,0,.14)" }}>
          <Layers size={16} color="#374151"/>
        </button>
        {showMenu && (
          <div style={{ position:"absolute" as const, top:44, right:0, background:"white", borderRadius:14, padding:6, boxShadow:"0 8px 24px rgba(0,0,0,.18)", zIndex:50, minWidth:110 }}>
            {(["standard","satellite"] as const).map(t=>(
              <button key={t} onClick={()=>{ setMapType(t); setShowMenu(false); }} style={{ width:"100%", padding:"8px 10px", borderRadius:9, border:"none", cursor:"pointer", background:mapType===t?"#F5F0FF":"white", color:mapType===t?"#9772F6":"#374151", fontSize:11, fontWeight:700, fontFamily:QS, textAlign:"left" as const }}>
                {t === "standard" ? "Standard" : "Satellite"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right zoom controls */}
      <div style={{ position:"absolute" as const, right:12, top:"50%", transform:"translateY(-50%)", display:"flex", flexDirection:"column" as const, gap:6, zIndex:20 }}>
        {[
          { Icon:ZoomIn,     onClick:onZoomIn  },
          { Icon:ZoomOut,    onClick:onZoomOut  },
          { Icon:LocateFixed,onClick:()=>mapRef.current?.recenter() },
          { Icon:Compass,    onClick:()=>{}     },
        ].map(({ Icon, onClick },i)=>(
          <button key={i} onClick={onClick} style={{ width:36, height:36, borderRadius:11, background:"white", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 2px 8px rgba(0,0,0,.12)" }}>
            <Icon size={15} color={i===2?"#3B82F6":"#374151"}/>
          </button>
        ))}
      </div>

      {/* Radius label */}
      <div style={{ position:"absolute" as const, bottom:10, left:"50%", transform:"translateX(-50%)", zIndex:20 }}>
        <div style={{ background:withinRadius?"rgba(22,163,74,.9)":"rgba(239,68,68,.9)", borderRadius:20, padding:"5px 14px", backdropFilter:"blur(8px)" }}>
          <span style={{ fontSize:10, fontWeight:800, color:"white", fontFamily:QS }}>
            {withinRadius ? "✓ Within Verification Radius (50m)" : "✗ Outside Verification Radius"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Requirement Row ───────────────────────────────────────────────────────────

function ReqRow({ label, ok }: { label:string; ok:boolean }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:"1px solid #F9FAFB" }}>
      <div style={{ width:22, height:22, borderRadius:8, background:ok?"#DCFCE7":"#FEE2E2", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        {ok ? <Check size={12} color="#16A34A"/> : <X size={12} color="#EF4444"/>}
      </div>
      <span style={{ fontSize:12, fontWeight:700, color:ok?"#1F2937":"#EF4444", fontFamily:IN, flex:1 }}>{label}</span>
      <span style={{ fontSize:10, fontWeight:700, fontFamily:QS, color:ok?"#16A34A":"#EF4444" }}>{ok?"Met":"Not Met"}</span>
    </div>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export function StudentMapScreen({ go }: { go:(s:string)=>void }) {
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus>("not-checked-in");
  const [gpsStatus,        setGpsStatus]        = useState<GpsStatus>("active");
  const [proximity,        setProximity]        = useState<LocationProximity>("within");
  const [simDistance,      setSimDistance]      = useState(18);
  const [zoom,             setZoom]             = useState(15);
  const [successModal,     setSuccessModal]     = useState<"checkin"|"checkout"|null>(null);
  const [successTime,      setSuccessTime]      = useState("");
  const [verHistory,       setVerHistory]       = useState<VerificationRecord[]>(SEED_HISTORY);
  const [actLogs,          setActLogs]          = useState<ActivityLog[]>(SEED_LOGS);
  const [histOpen,         setHistOpen]         = useState(true);
  const [logsOpen,         setLogsOpen]         = useState(true);
  const [currentTime,      setCurrentTime]      = useState(new Date());
  const [isLoading,        setIsLoading]        = useState(false);

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const withinRadius  = proximity === "within";
  const gpsActive     = gpsStatus === "active";
  const canVerify     = gpsActive && withinRadius;
  const hasApprovedBH = BH_DATA.regStatus === "Approved";
  const hasInternet   = true;

  const allReqsMet = gpsActive && withinRadius && hasApprovedBH && hasInternet;

  const bhStatusLabel = attendanceStatus === "checked-in"
    ? "Currently Inside Boarding House"
    : attendanceStatus === "checked-out"
    ? "Currently Outside Boarding House"
    : "Not Yet Verified Today";

  const bhStatusColor  = attendanceStatus === "checked-in"  ? "#16A34A"
    : attendanceStatus === "checked-out" ? "#6B7280" : "#D97706";
  const bhStatusBg     = attendanceStatus === "checked-in"  ? "#DCFCE7"
    : attendanceStatus === "checked-out" ? "#F3F4F6" : "#FEF3C7";

  function doAction(type: "checkin"|"checkout") {
    if (!allReqsMet) return;
    setIsLoading(true);
    setTimeout(() => {
      const t = fmtTime(new Date());
      setSuccessTime(t);
      setSuccessModal(type);
      setAttendanceStatus(type === "checkin" ? "checked-in" : "checked-out");
      const newRec: VerificationRecord = {
        id: `h${Date.now()}`, type,
        date: TODAY_STR, time: t,
        address: "Km 4 National Highway, Tagbilaran City",
        coords: "9.6533° N, 123.8527° E",
        result: "verified",
      };
      setVerHistory(h => [newRec, ...h]);
      const newLog: ActivityLog = {
        id: `l${Date.now()}`,
        msg: type === "checkin" ? `Checked In — ${t}` : `Checked Out — ${t}`,
        time: "Just now",
        color: type === "checkin" ? "#16A34A" : "#D97706",
        bg:    type === "checkin" ? "#DCFCE7" : "#FEF3C7",
        Icon:  type === "checkin" ? LogIn : LogOut,
      };
      setActLogs(l => [newLog, ...l]);
      setIsLoading(false);
    }, 1400);
  }

  // Simulate toggling GPS / proximity for demo
  function toggleGps() { setGpsStatus(g => g === "active" ? "disabled" : "active"); }
  function toggleProximity() {
    setProximity(p => {
      const next = p === "within" ? "outside" : "within";
      setSimDistance(next === "within" ? 18 : 380);
      return next;
    });
  }

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column" as const, background:"#F2F4F8", position:"relative" as const, overflow:"hidden" }}>

      {/* Success Modal */}
      {successModal && (
        <SuccessModal type={successModal} time={successTime} onClose={()=>setSuccessModal(null)}/>
      )}

      {/* Loading overlay */}
      {isLoading && (
        <div style={{ position:"absolute" as const, inset:0, background:"rgba(0,0,0,.45)", zIndex:150, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:"white", borderRadius:20, padding:"24px 28px", display:"flex", flexDirection:"column" as const, alignItems:"center", gap:14 }}>
            <div style={{ width:48, height:48, borderRadius:"50%", backgroundImage:GRAD, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 16px rgba(151,114,246,.4)" }}>
              <Crosshair size={22} color="white"/>
            </div>
            <p style={{ margin:0, fontSize:13, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Verifying GPS Location…</p>
            <p style={{ margin:0, fontSize:11, color:"#9CA3AF", fontFamily:IN }}>Please wait a moment</p>
          </div>
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ flexShrink:0, backgroundImage:GRAD_H, padding:"52px 20px 18px", position:"relative" as const, overflow:"hidden" }}>
        <div style={{ position:"absolute" as const, top:-40, right:-40, width:160, height:160, borderRadius:"50%", background:"rgba(255,255,255,.05)" }}/>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
          <div>
            <h1 style={{ margin:"0 0 3px", fontSize:22, fontWeight:800, color:"white", fontFamily:QS }}>Map</h1>
            <p style={{ margin:0, fontSize:11, color:"rgba(255,255,255,.65)", fontFamily:IN, maxWidth:260, lineHeight:1.5 }}>
              Verify your arrival and departure using your current location.
            </p>
          </div>
          <button style={{ width:40, height:40, borderRadius:13, background:"rgba(255,255,255,.15)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(8px)" }}>
            <Bell size={18} color="white"/>
          </button>
        </div>
      </div>

      {/* ── Scrollable Body ─────────────────────────────────────────────────── */}
      <div style={{ flex:1, overflowY:"auto" as const, scrollbarWidth:"none" as const }}>

        {/* MAP */}
        <MapView withinRadius={withinRadius} zoom={zoom}
          onZoomIn={()=>setZoom(z=>Math.min(z+1,20))}
          onZoomOut={()=>setZoom(z=>Math.max(z-1,10))}
          onRecenter={()=>{}}
          simDistance={simDistance}
        />

        <div style={{ padding:"16px 16px 32px" }}>

          {/* ── Demo toggles (simulation controls) ────────────────────────── */}
          <div style={{ background:"white", borderRadius:18, padding:"12px 16px", boxShadow:"0 2px 10px rgba(0,0,0,.06)", marginBottom:14, display:"flex", gap:10 }}>
            <div style={{ flex:1 }}>
              <p style={{ margin:"0 0 3px", fontSize:10, fontWeight:700, color:"#9CA3AF", fontFamily:QS, textTransform:"uppercase" as const, letterSpacing:0.5 }}>Simulate GPS</p>
              <button onClick={toggleGps} style={{ height:30, padding:"0 14px", borderRadius:20, border:"none", cursor:"pointer", background:gpsActive?"#DCFCE7":"#FEE2E2", color:gpsActive?"#16A34A":"#EF4444", fontSize:11, fontWeight:800, fontFamily:QS }}>
                {gpsActive ? "🟢 GPS Active" : "🔴 GPS Off"}
              </button>
            </div>
            <div style={{ width:1, background:"#F3F4F6" }}/>
            <div style={{ flex:1 }}>
              <p style={{ margin:"0 0 3px", fontSize:10, fontWeight:700, color:"#9CA3AF", fontFamily:QS, textTransform:"uppercase" as const, letterSpacing:0.5 }}>Simulate Location</p>
              <button onClick={toggleProximity} style={{ height:30, padding:"0 14px", borderRadius:20, border:"none", cursor:"pointer", background:withinRadius?"#DCFCE7":"#FEE2E2", color:withinRadius?"#16A34A":"#EF4444", fontSize:11, fontWeight:800, fontFamily:QS }}>
                {withinRadius ? "✓ Within Range" : "✗ Outside Range"}
              </button>
            </div>
          </div>

          {/* ── Current Location Status ────────────────────────────────────── */}
          <div style={{ background:"white", borderRadius:22, padding:"18px", boxShadow:"0 4px 20px rgba(0,0,0,.07)", marginBottom:14 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
              <div style={{ width:36, height:36, borderRadius:12, backgroundImage:GRAD, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Crosshair size={17} color="white"/>
              </div>
              <div>
                <p style={{ margin:0, fontSize:14, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Current Location</p>
                <p style={{ margin:0, fontSize:11, color:"#9CA3AF", fontFamily:IN }}>Real-time GPS tracking</p>
              </div>
              <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:5, background:gpsActive?"#DCFCE7":"#FEE2E2", borderRadius:20, padding:"4px 10px" }}>
                <div style={{ width:6, height:6, borderRadius:"50%", background:gpsActive?"#16A34A":"#EF4444" }}/>
                <span style={{ fontSize:10, fontWeight:800, color:gpsActive?"#16A34A":"#EF4444", fontFamily:QS }}>{gpsActive?"GPS Active":"GPS Off"}</span>
              </div>
            </div>
            {[
              { label:"Current Address",       val:"Km 4 National Highway, Tagbilaran City, Bohol"  },
              { label:"GPS Accuracy",          val: gpsActive ? "±5 meters (High)"  : "—"           },
              { label:"Distance to BH",        val:`${simDistance} meters`                           },
              { label:"Verification Radius",   val: withinRadius ? "✓ Within Allowed Area (50m)" : "✗ Outside Area (50m)" },
            ].map(({ label, val }, i, arr)=>(
              <div key={label} style={{ padding:"9px 0", borderBottom:i<arr.length-1?"1px solid #F9FAFB":"none" }}>
                <p style={{ margin:0, fontSize:9, color:"#9CA3AF", fontWeight:700, fontFamily:QS, textTransform:"uppercase" as const, letterSpacing:0.5 }}>{label}</p>
                <p style={{ margin:"2px 0 0", fontSize:12, fontWeight:700, fontFamily:IN, color:
                  label==="Verification Radius" ? (withinRadius?"#16A34A":"#EF4444")
                  : label==="GPS Accuracy" && !gpsActive ? "#9CA3AF"
                  : "#1F2937"
                }}>{val}</p>
              </div>
            ))}
          </div>

          {/* ── Boarding House Status ──────────────────────────────────────── */}
          <div style={{ background:"white", borderRadius:22, padding:"18px", boxShadow:"0 4px 20px rgba(0,0,0,.07)", marginBottom:14 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
              <div style={{ width:36, height:36, borderRadius:12, background:"#F5F0FF", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Building2 size={17} color="#9772F6"/>
              </div>
              <div style={{ flex:1 }}>
                <p style={{ margin:0, fontSize:14, fontWeight:800, color:"#1F2937", fontFamily:QS }}>Boarding House Status</p>
                <p style={{ margin:0, fontSize:11, color:"#9CA3AF", fontFamily:IN }}>{BH_DATA.name}</p>
              </div>
              <span style={{ fontSize:10, fontWeight:800, padding:"4px 12px", borderRadius:20, background:bhStatusBg, color:bhStatusColor, fontFamily:QS }}>{
                attendanceStatus === "checked-in" ? "Inside" : attendanceStatus === "checked-out" ? "Outside" : "Pending"
              }</span>
            </div>
            {[
              { label:"Boarding House", val:BH_DATA.name           },
              { label:"Assigned Room",  val:ROOM_DATA.name         },
              { label:"Assigned Bed",   val:ROOM_DATA.bed          },
              { label:"Current Status", val:bhStatusLabel          },
            ].map(({ label, val }, i, arr)=>(
              <div key={label} style={{ padding:"9px 0", borderBottom:i<arr.length-1?"1px solid #F9FAFB":"none" }}>
                <p style={{ margin:0, fontSize:9, color:"#9CA3AF", fontWeight:700, fontFamily:QS, textTransform:"uppercase" as const, letterSpacing:0.5 }}>{label}</p>
                <p style={{ margin:"2px 0 0", fontSize:12, fontWeight:700, fontFamily:IN, color:label==="Current Status"?bhStatusColor:"#1F2937" }}>{val}</p>
              </div>
            ))}
          </div>

          {/* ── CHECK-IN / CHECK-OUT CARD (PRIMARY FEATURE) ───────────────── */}
          <div style={{ background:"white", borderRadius:24, boxShadow:"0 8px 36px rgba(151,114,246,.18)", marginBottom:14, overflow:"hidden", border:"1.5px solid rgba(151,114,246,.1)" }}>
            {/* Card header gradient strip */}
            <div style={{ backgroundImage:GRAD, padding:"18px 20px 16px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:38, height:38, borderRadius:12, background:"rgba(255,255,255,.2)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Shield size={18} color="white"/>
                </div>
                <div>
                  <p style={{ margin:0, fontSize:16, fontWeight:800, color:"white", fontFamily:QS }}>Boarding House Attendance</p>
                  <p style={{ margin:0, fontSize:11, color:"rgba(255,255,255,.7)", fontFamily:IN }}>GPS-verified location check</p>
                </div>
              </div>
            </div>

            <div style={{ padding:"18px 20px 20px" }}>
              {/* Status + time */}
              <div style={{ background:"#F9FAFB", borderRadius:18, padding:"14px 16px", marginBottom:16, display:"flex", gap:10 }}>
                <div style={{ flex:1 }}>
                  <p style={{ margin:"0 0 2px", fontSize:10, fontWeight:700, color:"#9CA3AF", fontFamily:QS, textTransform:"uppercase" as const, letterSpacing:0.5 }}>Attendance Status</p>
                  <p style={{ margin:0, fontSize:13, fontWeight:800, fontFamily:QS, color:bhStatusColor }}>{bhStatusLabel}</p>
                </div>
                <div style={{ width:1, background:"#F3F4F6" }}/>
                <div style={{ flex:1 }}>
                  <p style={{ margin:"0 0 2px", fontSize:10, fontWeight:700, color:"#9CA3AF", fontFamily:QS, textTransform:"uppercase" as const, letterSpacing:0.5 }}>Current Time</p>
                  <p style={{ margin:0, fontSize:13, fontWeight:800, fontFamily:QS, color:"#1F2937" }}>{fmtTime(currentTime)}</p>
                  <p style={{ margin:"1px 0 0", fontSize:9, color:"#9CA3AF", fontFamily:IN }}>{fmtDate(currentTime)}</p>
                </div>
              </div>

              {/* Verification requirements */}
              <p style={{ margin:"0 0 6px", fontSize:11, fontWeight:800, color:"#374151", fontFamily:QS }}>Verification Requirements</p>
              <div style={{ marginBottom:16 }}>
                <ReqRow label="GPS is enabled"                    ok={gpsActive}     />
                <ReqRow label="Within verification radius (50m)"  ok={withinRadius}  />
                <ReqRow label="Approved boarding house"           ok={hasApprovedBH} />
                <ReqRow label="Internet connection"               ok={hasInternet}   />
              </div>

              {/* Failure reason */}
              {!allReqsMet && (
                <div style={{ background:"#FEF2F2", borderRadius:14, padding:"11px 14px", marginBottom:16, display:"flex", gap:8, alignItems:"flex-start" }}>
                  <AlertCircle size={14} color="#EF4444" style={{ flexShrink:0, marginTop:1 }}/>
                  <div>
                    <p style={{ margin:"0 0 3px", fontSize:11, fontWeight:800, color:"#DC2626", fontFamily:QS }}>Cannot verify attendance</p>
                    <p style={{ margin:0, fontSize:11, color:"#B91C1C", fontFamily:IN, lineHeight:1.5 }}>
                      {!gpsActive    ? "GPS is turned off. Please enable location services."
                      : !withinRadius ? "You are outside your assigned boarding house. Move closer to verify."
                      : "One or more requirements are not met."}
                    </p>
                  </div>
                </div>
              )}

              {/* Action button */}
              {attendanceStatus === "not-checked-in" && (
                <button onClick={()=>doAction("checkin")} disabled={!allReqsMet}
                  style={{ width:"100%", height:56, borderRadius:24, backgroundImage:allReqsMet?GRAD:"none", background:allReqsMet?"none":"#F3F4F6", border:"none", cursor:allReqsMet?"pointer":"not-allowed", display:"flex", alignItems:"center", justifyContent:"center", gap:10, boxShadow:allReqsMet?"0 8px 28px rgba(151,114,246,.38)":"none", transition:"all .2s" }}>
                  <div style={{ width:28, height:28, borderRadius:10, background:allReqsMet?"rgba(255,255,255,.2)":"rgba(0,0,0,.08)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <LogIn size={15} color={allReqsMet?"white":"#9CA3AF"}/>
                  </div>
                  <div style={{ textAlign:"left" as const }}>
                    <p style={{ margin:0, fontSize:15, fontWeight:800, color:allReqsMet?"white":"#9CA3AF", fontFamily:QS, lineHeight:1 }}>Check In</p>
                    <p style={{ margin:"2px 0 0", fontSize:10, color:allReqsMet?"rgba(255,255,255,.75)":"#9CA3AF", fontFamily:IN }}>I have arrived at my boarding house.</p>
                  </div>
                </button>
              )}

              {attendanceStatus === "checked-in" && (
                <button onClick={()=>doAction("checkout")} disabled={!allReqsMet}
                  style={{ width:"100%", height:56, borderRadius:24, background:allReqsMet?"none":"#F3F4F6", backgroundImage:allReqsMet?"linear-gradient(135deg,#D97706,#B45309)":"none", border:"none", cursor:allReqsMet?"pointer":"not-allowed", display:"flex", alignItems:"center", justifyContent:"center", gap:10, boxShadow:allReqsMet?"0 8px 28px rgba(217,119,6,.35)":"none", transition:"all .2s" }}>
                  <div style={{ width:28, height:28, borderRadius:10, background:allReqsMet?"rgba(255,255,255,.2)":"rgba(0,0,0,.08)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <LogOut size={15} color={allReqsMet?"white":"#9CA3AF"}/>
                  </div>
                  <div style={{ textAlign:"left" as const }}>
                    <p style={{ margin:0, fontSize:15, fontWeight:800, color:allReqsMet?"white":"#9CA3AF", fontFamily:QS, lineHeight:1 }}>Check Out</p>
                    <p style={{ margin:"2px 0 0", fontSize:10, color:allReqsMet?"rgba(255,255,255,.75)":"#9CA3AF", fontFamily:IN }}>I am leaving the boarding house.</p>
                  </div>
                </button>
              )}

              {attendanceStatus === "checked-out" && (
                <div style={{ width:"100%", height:56, borderRadius:24, background:"#F9FAFB", border:"2px dashed #E5E7EB", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                  <CheckCircle size={18} color="#16A34A"/>
                  <p style={{ margin:0, fontSize:13, fontWeight:800, color:"#16A34A", fontFamily:QS }}>Attendance Complete for Today</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Verification History ───────────────────────────────────────── */}
          <div style={{ background:"white", borderRadius:22, boxShadow:"0 4px 20px rgba(0,0,0,.07)", overflow:"hidden", marginBottom:14 }}>
            <button onClick={()=>setHistOpen(p=>!p)} style={{ width:"100%", display:"flex", alignItems:"center", gap:12, padding:"16px 18px", background:"none", border:"none", cursor:"pointer", borderBottom:histOpen?"1px solid #F3F4F6":"none" }}>
              <div style={{ width:34, height:34, borderRadius:11, background:"#F5F0FF", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <Activity size={16} color="#9772F6"/>
              </div>
              <span style={{ flex:1, fontSize:14, fontWeight:800, color:"#1F2937", fontFamily:QS, textAlign:"left" as const }}>Verification History</span>
              <span style={{ fontSize:10, color:"#9CA3AF", fontFamily:IN, marginRight:6 }}>{verHistory.length} records</span>
              {histOpen ? <ChevronUp size={16} color="#9CA3AF"/> : <ChevronDown size={16} color="#9CA3AF"/>}
            </button>

            {histOpen && (
              <div style={{ padding:"4px 18px 18px" }}>
                {verHistory.slice(0, 6).map((rec, i) => {
                  const isCI = rec.type === "checkin";
                  return (
                    <div key={rec.id} style={{ display:"flex", gap:12, paddingTop:14 }}>
                      {/* Timeline line + dot */}
                      <div style={{ display:"flex", flexDirection:"column" as const, alignItems:"center", width:28 }}>
                        <div style={{ width:28, height:28, borderRadius:10, backgroundImage:isCI?GRAD:"linear-gradient(135deg,#D97706,#B45309)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                          {isCI ? <LogIn size={13} color="white"/> : <LogOut size={13} color="white"/>}
                        </div>
                        {i < Math.min(verHistory.length, 6)-1 && <div style={{ width:2, flex:1, minHeight:16, background:"#F3F4F6", marginTop:4 }}/>}
                      </div>
                      {/* Content */}
                      <div style={{ flex:1, paddingBottom:i < Math.min(verHistory.length,6)-1 ? 0 : 0 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:2 }}>
                          <span style={{ fontSize:13, fontWeight:800, color:"#1F2937", fontFamily:QS }}>{isCI?"Check In":"Check Out"}</span>
                          <span style={{ fontSize:9, fontWeight:800, padding:"2px 8px", borderRadius:20, background:rec.result==="verified"?"#DCFCE7":"#FEE2E2", color:rec.result==="verified"?"#16A34A":"#EF4444", fontFamily:QS }}>
                            {rec.result==="verified"?"Verified ✓":"Failed ✗"}
                          </span>
                        </div>
                        <p style={{ margin:"0 0 2px", fontSize:11, color:"#6B7280", fontFamily:IN }}>{rec.date} · {rec.time}</p>
                        <p style={{ margin:"0 0 2px", fontSize:10, color:"#9CA3AF", fontFamily:IN }}>{rec.address}</p>
                        <p style={{ margin:0, fontSize:9, color:"#C4B5FD", fontFamily:IN }}>GPS: {rec.coords}</p>
                      </div>
                    </div>
                  );
                })}
                {verHistory.length > 6 && (
                  <p style={{ margin:"14px 0 0", fontSize:12, fontWeight:700, color:"#9772F6", fontFamily:QS, textAlign:"center" as const, cursor:"pointer" }}>View All {verHistory.length} Records →</p>
                )}
              </div>
            )}
          </div>

          {/* ── Recent Activity Logs ────────────────────────────────────────── */}
          <div style={{ background:"white", borderRadius:22, boxShadow:"0 4px 20px rgba(0,0,0,.07)", overflow:"hidden" }}>
            <button onClick={()=>setLogsOpen(p=>!p)} style={{ width:"100%", display:"flex", alignItems:"center", gap:12, padding:"16px 18px", background:"none", border:"none", cursor:"pointer", borderBottom:logsOpen?"1px solid #F3F4F6":"none" }}>
              <div style={{ width:34, height:34, borderRadius:11, background:"#F5F0FF", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <Eye size={16} color="#9772F6"/>
              </div>
              <span style={{ flex:1, fontSize:14, fontWeight:800, color:"#1F2937", fontFamily:QS, textAlign:"left" as const }}>Recent Logs</span>
              {logsOpen ? <ChevronUp size={16} color="#9CA3AF"/> : <ChevronDown size={16} color="#9CA3AF"/>}
            </button>

            {logsOpen && (
              <div style={{ padding:"4px 18px 18px" }}>
                {actLogs.slice(0, 7).map((log, i, arr) => (
                  <div key={log.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 0", borderBottom:i<arr.length-1?"1px solid #F9FAFB":"none" }}>
                    <div style={{ width:34, height:34, borderRadius:11, background:log.bg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <log.Icon size={15} color={log.color}/>
                    </div>
                    <div style={{ flex:1 }}>
                      <p style={{ margin:0, fontSize:12, fontWeight:700, color:"#1F2937", fontFamily:QS }}>{log.msg}</p>
                      <p style={{ margin:"1px 0 0", fontSize:10, color:"#9CA3AF", fontFamily:IN }}>{log.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
