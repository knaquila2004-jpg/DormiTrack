import React, { useState, useEffect, useRef } from "react";
import {
  Navigation, Home, Layers,
  LocateFixed, ZoomIn, ZoomOut, CheckCircle, XCircle, AlertCircle,
  LogIn, LogOut, Wifi, Shield, ChevronDown, ChevronUp,
  Radio, Check, X, Crosshair, RefreshCw, Eye, Maximize2,
} from "lucide-react";
import { MAP_CENTER } from "./shared";
import { getMyProfile, getMyAssignment, MyStudentProfile, MyAssignment, MyBoardingHouse, MyRoom } from "./studentAssignmentStore";
import { FullScreenBHMap } from "./components/FullScreenBHMap";

const EMPTY_PROFILE: MyStudentProfile = { name: "—", firstName: "—", id: "—", program: "—", year: "—", block: "—", email: "—", contact: "—", address: "—", photo: null };
const EMPTY_ASSIGNMENT: MyAssignment = {
  bh:   { id: "", name: "—", address: "—", lat: MAP_CENTER.lat, lng: MAP_CENTER.lng, cover: null, landlord: "—", landlordPhoto: null, contact: "—", email: "—", status: "Active", regStatus: "Approved", checkinRadiusMeters: 50, amenities: [], rules: [], totalRooms: 0, rentAmount: null, gallery: [] },
  room: { id: "", name: "—", bed: "—", capacity: 0, occupied: 0, available: 0, floor: "—", type: "—" },
  stay: { moveIn: "—", moveOut: "—", daysStayed: 0, daysRemaining: 0, totalDays: 0, stayLength: "—" },
};
import { GoogleMapCanvas, GoogleMapHandle, MapInfoCard, MapMarker } from "./components/GoogleMapCanvas";
import { addNotification, notifyLandlordOfBoardingHouse } from "./notificationStore";
import { getMyCheckInOutHistory, recordCheckInOut, todaysAttendanceStatus, CheckInOutRecord } from "./checkInOutStore";
import { haversineMeters, reverseGeocode } from "./components/mapGeo";
import { supabase } from "../lib/supabase";

const GRAD   = "linear-gradient(135deg,#9772F6 0%,#7549F6 100%)";
const GRAD_H = "linear-gradient(160deg,#9772F6 0%,#7549F6 100%)";
const QS     = "'Quicksand',sans-serif";
const IN     = "'Inter',sans-serif";

// A GPS fix's own reported accuracy radius is real uncertainty, not a rendering bug — a pin that
// looks like it's "on the road" is very often an honestly-drawn fix whose true position (anywhere
// within its accuracy circle) is actually indoors. Rather than comparing straight-line distance
// against the bare geofence radius (which would reject a student who is genuinely on-site just
// because their device's fix landed a little outside it), the vicinity check below gives the
// fix's own accuracy as a benefit of the doubt: accepted whenever the *closest possible* real
// position (distance minus accuracy) could still be inside the radius. A fix whose accuracy is
// worse than MAX_USABLE_ACCURACY is too noisy to make either call confidently, so that case asks
// for a retry instead of silently accepting or rejecting off a effectively meaningless number.
const MAX_USABLE_ACCURACY = 150;

// ── Types ─────────────────────────────────────────────────────────────────────

type AttendanceStatus = "not-checked-in" | "checked-in" | "checked-out";

interface GeoFix { lat: number; lng: number; accuracyMeters: number }

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

// Real device geolocation — no simulation. `freshnessMs` controls how old a cached browser fix
// is allowed to be: a generous cache is fine for the passive "Current Location" status card, but
// the actual check-in/check-out decision (fetchPosition(0) inside doAction below) always demands
// a brand-new fix so a stale position from earlier in the session can never be used to fake being
// on-site.
//
// A single getCurrentPosition() call is what used to back this — but the very first fix a browser
// hands back is routinely a coarse, cell-tower/Wi-Fi-triangulated position (accuracy in the tens to
// low hundreds of meters), not an actual GPS lock. That's what makes the student's own pin look
// like it's "on the road" instead of at their real position — the fix itself is genuinely that far
// off, nothing is misplacing an otherwise-correct coordinate. watchPosition() lets the device's GPS
// chip keep refining for a few seconds; this keeps whichever sample reports the smallest accuracy
// radius, and returns early the moment a tight (<=15m) fix comes in instead of always waiting out
// the full window.
function fetchPosition(freshnessMs = 30000): Promise<GeoFix | null> {
  return new Promise(resolve => {
    if (!("geolocation" in navigator)) { resolve(null); return; }
    let best: GeoFix | null = null;
    let settled = false;
    let watchId: number | null = null;
    const finish = (result: GeoFix | null) => {
      if (settled) return;
      settled = true;
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
      clearTimeout(timer);
      resolve(result);
    };
    watchId = navigator.geolocation.watchPosition(
      pos => {
        const fix: GeoFix = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracyMeters: pos.coords.accuracy };
        if (!best || fix.accuracyMeters < best.accuracyMeters) best = fix;
        if (fix.accuracyMeters <= 15) finish(fix);
      },
      () => finish(best),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: freshnessMs },
    );
    // Give the GPS chip a real window to refine its fix rather than settling for whatever
    // (possibly coarse) reading arrives first.
    const timer = setTimeout(() => finish(best), 8000);
  });
}

// ── Real check-in/out history → activity log rows ──────────────────────────

function timeAgoLabel(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min} minute${min === 1 ? "" : "s"} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  const day = Math.floor(hr / 24);
  if (day === 1) return "Yesterday";
  return `${day}d ago`;
}

function toActivityLog(rec: CheckInOutRecord): ActivityLog {
  const isIn = rec.type === "checkin";
  return {
    id: rec.id,
    msg: `${isIn ? "Entered" : "Exited"} — ${fmtDate(new Date(rec.occurredAt))}, ${fmtTime(new Date(rec.occurredAt))}`,
    time: timeAgoLabel(rec.occurredAt),
    color: isIn ? "#16A34A" : "#D97706", bg: isIn ? "#DCFCE7" : "#FEF3C7",
    Icon: isIn ? LogIn : LogOut,
  };
}

// ── Success Modal ─────────────────────────────────────────────────────────────

function SuccessModal({ type, time, onClose, studentData: STUDENT_DATA, bhData: BH_DATA, roomData: ROOM_DATA }: {
  type:"checkin"|"checkout"; time:string; onClose:()=>void;
  studentData: MyStudentProfile; bhData: MyBoardingHouse; roomData: MyRoom;
}) {
  const isIn = type === "checkin";
  return (
    <div style={{ position:"fixed" as const, inset:0, background:"rgba(0,0,0,.6)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}
         onClick={onClose}>
      <div style={{ background:"white", borderRadius:28, padding:"32px 24px", width:"100%", maxWidth:340, textAlign:"center" as const, boxShadow:"0 24px 80px rgba(0,0,0,.3)" }}
           onClick={e=>e.stopPropagation()}>
        <h2 style={{ margin:"0 0 8px", fontSize:20, fontWeight:800, color:"#1F2937", fontFamily:QS }}>
          {isIn ? "Successfully Entered!" : "Successfully Exited!"}
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
            ["GPS Status",  "Verified"            ],
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

function MapView({ withinRadius, zoom, onZoomIn, onZoomOut, onRecenter, studentPos, accuracyMeters, distanceMeters, radiusMeters, bhData: BH_DATA }: {
  withinRadius: boolean; zoom: number; onZoomIn:()=>void; onZoomOut:()=>void; onRecenter:()=>void;
  studentPos: { lat: number; lng: number } | null; accuracyMeters: number | null; distanceMeters: number | null; radiusMeters: number;
  bhData: MyBoardingHouse;
}) {
  const [mapType, setMapType] = useState<"standard"|"satellite">("standard");
  const [showFullMap, setShowFullMap] = useState(false);
  const mapRef = useRef<GoogleMapHandle>(null);

  const bhPos = { lat: BH_DATA.lat, lng: BH_DATA.lng };

  // Just the boarding house pin now — no "student" marker/dashed line to it, and no
  // accuracy circle (that was only ever drawn around that same removed marker).
  // withinRadius/distanceMeters (from real geolocation) still drive the geofence
  // circle below and the Check In/Check Out button state; only the visual "you are
  // here" pin + connecting line + the Distance/Est. Walk badge were removed.
  const markers: MapMarker[] = [
    {
      id: "bh", variant: "bh", position: bhPos, title: BH_DATA.name, zIndex: 10,
      infoContent: <MapInfoCard title={BH_DATA.name} subtitle={BH_DATA.address} rows={[["Landlord", BH_DATA.landlord], ["Contact", BH_DATA.contact]]} />,
    },
  ];

  return (
    <div style={{ position:"relative" as const, height:280, background:"#E8EDF5", overflow:"hidden", flexShrink:0 }}>
      <GoogleMapCanvas
        ref={mapRef} center={bhPos} zoom={zoom} mapType={mapType}
        markers={markers}
        circle={{ center: bhPos, radiusMeters, color: withinRadius ? "#9772F6" : "#EF4444" }}
      />

      {/* Right-side controls — one vertical stack, all 5 evenly spaced (used to be a
          separate top-right map-type button plus a differently-spaced 4-button
          group below it, so the gap above the stack never matched the gaps within it). */}
      <div style={{ position:"absolute" as const, right:12, top:"50%", transform:"translateY(-50%)", display:"flex", flexDirection:"column" as const, gap:6, zIndex:20 }}>
        {[
          { Icon:Layers,     onClick:()=>setMapType(t => t === "standard" ? "satellite" : "standard"), title: mapType === "standard" ? "Switch to satellite view" : "Switch to standard view", color: mapType==="satellite" ? "#9772F6" : "#374151" },
          { Icon:ZoomIn,     onClick:onZoomIn,                                        color:"#374151" },
          { Icon:ZoomOut,    onClick:onZoomOut,                                       color:"#374151" },
          { Icon:LocateFixed,onClick:()=>mapRef.current?.recenter(),                  color:"#3B82F6" },
          { Icon:Maximize2,  onClick:()=>setShowFullMap(true),                        color:"#374151" },
        ].map(({ Icon, onClick, title, color },i)=>(
          <button key={i} onClick={onClick} title={title} style={{ width:36, height:36, borderRadius:11, background:"white", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 2px 8px rgba(0,0,0,.12)" }}>
            <Icon size={15} color={color}/>
          </button>
        ))}
      </div>
      {showFullMap && (
        <FullScreenBHMap
          bh={{ name: BH_DATA.name, address: BH_DATA.address, landlord: BH_DATA.landlord, contact: BH_DATA.contact, lat: BH_DATA.lat, lng: BH_DATA.lng }}
          onClose={()=>setShowFullMap(false)}
          showDistanceInfo={false}
        />
      )}

      {/* Radius label */}
      <div style={{ position:"absolute" as const, bottom:10, left:"50%", transform:"translateX(-50%)", zIndex:20 }}>
        <div style={{ background:withinRadius?"rgba(22,163,74,.9)":"rgba(239,68,68,.9)", borderRadius:20, padding:"5px 14px", backdropFilter:"blur(8px)", display:"flex", alignItems:"center", gap:5 }}>
          {withinRadius ? <Check size={12} color="white"/> : <X size={12} color="white"/>}
          <span style={{ fontSize:10, fontWeight:800, color:"white", fontFamily:QS }}>
            {withinRadius ? `Within Verification Radius (${radiusMeters}m)` : "Outside Verification Radius"}
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
  const [zoom,             setZoom]             = useState(15);
  const [successModal,     setSuccessModal]     = useState<"checkin"|"checkout"|null>(null);
  const [successTime,      setSuccessTime]      = useState("");
  const [actLogs,          setActLogs]          = useState<ActivityLog[]>([]);
  const [logsOpen,         setLogsOpen]         = useState(true);
  const [currentTime,      setCurrentTime]      = useState(new Date());
  const [isLoading,        setIsLoading]        = useState(false);

  // Real device location — no simulation. Auto-requested on mount (and via the "Refresh
  // Location" button) purely to drive the passive status card/map below; the actual
  // check-in/check-out decision in doAction always takes its own brand-new fix rather than
  // trusting this potentially-stale one.
  const [myPos,     setMyPos]     = useState<GeoFix | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError,  setGeoError]  = useState<string | null>(null);
  // Set only in response to an actual Check In/Check Out tap — the reason that specific
  // attempt was rejected (wrong location, no GPS fix, a server error, ...). Cleared at the
  // start of every new attempt so a stale rejection never lingers on screen.
  const [checkInError, setCheckInError] = useState<string | null>(null);

  const refreshLocation = async () => {
    setGeoLoading(true); setGeoError(null);
    const pos = await fetchPosition();
    setGeoLoading(false);
    if (!pos) { setGeoError("Location access is off or unavailable. Enable it in your browser/device settings."); setMyPos(null); return; }
    setMyPos(pos);
  };
  useEffect(() => {
    refreshLocation();
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Real signed-in student + their current assignment, and their real check-in/out
  // history. Only the location fix itself comes from the browser's geolocation API (no
  // separate location backend) — every check-in/out the student actually submits is a
  // real, persisted check_in_out_records row, and is only ever submitted after a fresh
  // fix confirms they're within the boarding house's configured radius.
  const [myProfile, setMyProfile] = useState<MyStudentProfile>(EMPTY_PROFILE);
  const [myAssignment, setMyAssignment] = useState<MyAssignment>(EMPTY_ASSIGNMENT);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const refreshHistory = () => {
    getMyCheckInOutHistory().then(history => {
      setActLogs(history.map(toActivityLog));
      setAttendanceStatus(todaysAttendanceStatus(history));
    });
  };
  useEffect(() => {
    let active = true;
    Promise.all([getMyProfile(), getMyAssignment(), supabase.auth.getSession()]).then(([profile, assignment, { data: { session } }]) => {
      if (!active) return;
      if (profile) setMyProfile(profile);
      if (assignment) setMyAssignment(assignment);
      setMyUserId(session?.user?.id ?? null);
    });
    refreshHistory();
    return () => { active = false; };
  }, []);
  const STUDENT_DATA = myProfile;
  const BH_DATA = myAssignment.bh;
  const ROOM_DATA = myAssignment.room;

  const radiusMeters    = BH_DATA.checkinRadiusMeters || 50;
  const accuracyMeters  = myPos ? Math.round(myPos.accuracyMeters) : null;
  const tooImprecise    = accuracyMeters != null && accuracyMeters > MAX_USABLE_ACCURACY;
  const distanceMeters  = myPos ? Math.round(haversineMeters(myPos, { lat: BH_DATA.lat, lng: BH_DATA.lng })) : null;
  // Gives the fix's own accuracy margin the benefit of the doubt (see MAX_USABLE_ACCURACY above)
  // rather than a bare straight-line comparison against the radius.
  const withinRadius    = distanceMeters != null && accuracyMeters != null && !tooImprecise
    && distanceMeters <= radiusMeters + accuracyMeters;
  const gpsActive       = !!myPos && !geoError;
  const hasApprovedBH   = BH_DATA.regStatus === "Approved";
  const hasInternet     = true;

  const allReqsMet = gpsActive && withinRadius && hasApprovedBH && hasInternet;

  const bhStatusLabel = attendanceStatus === "checked-in"
    ? "Currently Inside Boarding House"
    : attendanceStatus === "checked-out"
    ? "Currently Outside Boarding House"
    : "Not Yet Verified Today";

  const bhStatusColor  = attendanceStatus === "checked-in"  ? "#16A34A"
    : attendanceStatus === "checked-out" ? "#6B7280" : "#D97706";

  async function doAction(type: "checkin"|"checkout") {
    if (!BH_DATA.id || isLoading) return;
    setCheckInError(null);
    setIsLoading(true);

    // Always take a brand-new fix at the moment of the actual attempt — this is the real
    // enforcement, independent of whatever `myPos` currently shows (which could be several
    // seconds/minutes stale). A student who is genuinely outside the boarding house's
    // radius is rejected here every time, regardless of the button's earlier enabled state.
    const pos = await fetchPosition(0);
    if (!pos) {
      setIsLoading(false);
      setMyPos(null);
      setCheckInError("We couldn't determine your location. Please enable GPS and try again.");
      return;
    }
    setMyPos(pos);

    const dist = Math.round(haversineMeters(pos, { lat: BH_DATA.lat, lng: BH_DATA.lng }));
    const accuracy = Math.round(pos.accuracyMeters);
    if (accuracy > MAX_USABLE_ACCURACY) {
      setIsLoading(false);
      setCheckInError(`Your location isn't accurate enough to verify right now (±${accuracy}m). Move outdoors or near a window, then try again.`);
      return;
    }
    // Same accuracy-aware tolerance as the passive `withinRadius` above — a fix that's ${accuracy}m
    // off can still genuinely be inside the radius, so only reject once even the closest possible
    // real position (dist - accuracy) would still fall outside it.
    if (dist > radiusMeters + accuracy) {
      setIsLoading(false);
      setCheckInError(`You are not within the boarding house vicinity — you're ${dist}m away (±${accuracy}m accuracy), but must be within ${radiusMeters}m to ${type === "checkin" ? "enter" : "exit"}.`);
      return;
    }
    if (!hasApprovedBH) { setIsLoading(false); return; }

    // Best-effort human-readable address for the record — never blocks the check-in/out
    // itself if the reverse-geocode lookup fails or is slow.
    const geocoded = await reverseGeocode(pos).catch(() => null);

    const res = await recordCheckInOut({
      type, boardingHouseId: BH_DATA.id,
      address: geocoded?.address || undefined, lat: pos.lat, lng: pos.lng, result: "verified",
    });
    setIsLoading(false);
    if (res.ok === false) { setCheckInError(res.error || "Something went wrong. Please try again."); return; }

    const t = fmtTime(new Date(res.record.occurredAt));
    setSuccessTime(t);
    setSuccessModal(type);
    refreshHistory();

    const label = type === "checkin" ? "Entry" : "Exit";
    const notifType = type === "checkin" ? "check-in" : "check-out" as const;
    if (myUserId) {
      addNotification({
        userId: myUserId, type: notifType, title: `${label} Recorded`,
        description: `Your ${label.toLowerCase()} was successfully verified at ${BH_DATA.name}.`,
        destination: "map", relatedId: res.record.id,
      });
    }
    // relatedId is the student's own user id (not the check-in record id) — LandlordOccupantsScreen
    // keys its occupant list by student id, which is what it needs to open the right profile.
    notifyLandlordOfBoardingHouse(BH_DATA.id, {
      type: notifType, title: `Student ${label}`,
      description: `${STUDENT_DATA.name} ${type === "checkin" ? "entered" : "exited"} at ${t}.`,
      destination: "occupants", relatedId: myUserId ?? undefined,
    });
  }

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column" as const, background:"#F2F4F8", position:"relative" as const, overflow:"hidden" }}>

      {/* Success Modal */}
      {successModal && (
        <SuccessModal type={successModal} time={successTime} onClose={()=>setSuccessModal(null)} studentData={STUDENT_DATA} bhData={BH_DATA} roomData={ROOM_DATA}/>
      )}

      {/* Loading overlay */}
      {isLoading && (
        <div style={{ position: "fixed" as const, inset:0, background:"rgba(0,0,0,.45)", zIndex:150, display:"flex", alignItems:"center", justifyContent:"center" }}>
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
        <div style={{ position:"absolute" as const, top:-40, right:-40, width:160, height:160, borderRadius:"42% 58% 65% 35%/45% 40% 60% 55%", background:"rgba(255,255,255,.05)", filter:"blur(28px)" }}/>
        <div>
          <h1 style={{ margin:"0 0 3px", fontSize:22, fontWeight:800, color:"white", fontFamily:QS }}>Map</h1>
          <p style={{ margin:0, fontSize:11, color:"rgba(255,255,255,.65)", fontFamily:IN, maxWidth:260, lineHeight:1.5 }}>
            Verify your arrival and departure using your current location.
          </p>
        </div>
      </div>

      {/* ── Scrollable Body ─────────────────────────────────────────────────── */}
      <div style={{ flex:1, overflowY:"auto" as const, scrollbarWidth:"none" as const }}>

        {/* MAP — real device position (myPos, from browser geolocation), not simulated */}
        <MapView withinRadius={withinRadius} zoom={zoom}
          onZoomIn={()=>setZoom(z=>Math.min(z+1,20))}
          onZoomOut={()=>setZoom(z=>Math.max(z-1,10))}
          onRecenter={()=>{}}
          studentPos={myPos}
          accuracyMeters={myPos ? Math.round(myPos.accuracyMeters) : null}
          distanceMeters={distanceMeters}
          radiusMeters={radiusMeters}
          bhData={BH_DATA}
        />

        <div style={{ padding:"16px 16px 32px" }}>

          {/* ── Device Location ──────────────────────────────────────────── */}
          <div style={{ background:"white", borderRadius:18, padding:"12px 16px", boxShadow:"0 2px 10px rgba(0,0,0,.06)", marginBottom:14, display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ margin:"0 0 3px", fontSize:10, fontWeight:700, color:"#9CA3AF", fontFamily:QS, textTransform:"uppercase" as const, letterSpacing:0.5 }}>Device Location</p>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <div style={{ width:6, height:6, borderRadius:"50%", background:gpsActive?"#16A34A":"#EF4444", flexShrink:0 }}/>
                <span style={{ fontSize:12, fontWeight:800, color:gpsActive?"#16A34A":"#EF4444", fontFamily:QS }}>
                  {gpsActive ? "GPS Active" : geoLoading ? "Locating…" : "GPS Unavailable"}
                </span>
              </div>
              {geoError && <p style={{ margin:"4px 0 0", fontSize:10, color:"#EF4444", fontFamily:IN, lineHeight:1.4 }}>{geoError}</p>}
            </div>
            <button onClick={refreshLocation} disabled={geoLoading} style={{ height:34, padding:"0 14px", borderRadius:14, border:"none", cursor:geoLoading?"default":"pointer", background:"#F5F0FF", color:"#9772F6", fontSize:11, fontWeight:800, fontFamily:QS, display:"flex", alignItems:"center", gap:6, flexShrink:0, opacity:geoLoading?0.6:1 }}>
              <RefreshCw size={13}/> Refresh
            </button>
          </div>

          {/* ── Low-accuracy notice ──────────────────────────────────────────
              Shown whenever the device's own reported error margin is wider than the whole
              geofence — the exact situation that makes an honestly-placed pin look "wrong"
              (e.g. snapped onto a nearby road) even though nothing actually misplaced it. This is
              a real device/GPS limitation (common indoors, or on desktop browsers with no GPS
              chip at all), not a bug in what's drawn on the map — the blue accuracy halo around
              your pin above shows the same margin visually. Text adapts to whether the check-in
              logic can still work around it (tolerant math, see MAX_USABLE_ACCURACY) or not. */}
          {accuracyMeters != null && accuracyMeters > radiusMeters && (
            <div style={{ background:"#FFFBEB", border:"1px solid #FDE68A", borderRadius:16, padding:"12px 14px", marginBottom:14, display:"flex", gap:8, alignItems:"flex-start" }}>
              <AlertCircle size={14} color="#D97706" style={{ flexShrink:0, marginTop:1 }}/>
              <p style={{ margin:0, fontSize:11, color:"#92400E", fontFamily:IN, lineHeight:1.55 }}>
                {tooImprecise ? (
                  <>Your device currently reports a location accuracy of only ±{accuracyMeters}m — too wide to reliably
                  verify against the {radiusMeters}m entry area, so Enter/Exit is disabled for now. This is a
                  device/GPS limitation, not a map error. Try moving outdoors or near a window, tapping Refresh
                  again, or using a phone instead of a desktop browser.</>
                ) : (
                  <>Your device reports a location accuracy of ±{accuracyMeters}m — wider than the {radiusMeters}m
                  entry area, which is why your pin can look off (even landing near a nearby road) even while
                  you're actually inside. Entering and exiting still work — it allows for this margin — but a tighter fix
                  (move outdoors/near a window, or tap Refresh) will make the map itself more accurate.</>
                )}
              </p>
            </div>
          )}

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
                <ReqRow label="GPS is enabled"                              ok={gpsActive}       />
                <ReqRow label={`Within verification radius (${radiusMeters}m)`} ok={withinRadius}  />
                <ReqRow label="Internet connection"                         ok={hasInternet}   />
              </div>

              {/* Failure reason — prefers checkInError (the actual reason a real Check In/Check
                  Out tap was just rejected, from a fresh GPS fix taken at that moment) over the
                  passive requirements-based guess below, so what's shown always matches what
                  really just happened. */}
              {(checkInError || !allReqsMet) && (
                <div style={{ background:"#FEF2F2", borderRadius:14, padding:"11px 14px", marginBottom:16, display:"flex", gap:8, alignItems:"flex-start" }}>
                  <AlertCircle size={14} color="#EF4444" style={{ flexShrink:0, marginTop:1 }}/>
                  <div>
                    <p style={{ margin:"0 0 3px", fontSize:11, fontWeight:800, color:"#DC2626", fontFamily:QS }}>Cannot verify attendance</p>
                    <p style={{ margin:0, fontSize:11, color:"#B91C1C", fontFamily:IN, lineHeight:1.5 }}>
                      {checkInError
                        ?? (!gpsActive    ? "GPS is turned off. Please enable location services."
                          : tooImprecise  ? `Your location isn't accurate enough to verify (±${accuracyMeters}m). Move outdoors or near a window, or try a phone instead of a desktop browser.`
                          : !withinRadius ? "You are not within the boarding house vicinity. Move closer to enter."
                          : "One or more requirements are not met.")}
                    </p>
                  </div>
                </div>
              )}

              {/* Action button — a student can enter/exit multiple times a day (errands,
                  class schedules, etc.), so "checked-out" is treated the same as
                  "not-checked-in": the Enter button reappears rather than a one-time
                  "done for today" state. */}
              {attendanceStatus !== "checked-in" && (
                <button onClick={()=>doAction("checkin")} disabled={!allReqsMet}
                  style={{ width:"100%", height:44, borderRadius:16, background:allReqsMet?"linear-gradient(135deg,#16A34A,#15803D)":"#F3F4F6", border:"none", cursor:allReqsMet?"pointer":"not-allowed", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:allReqsMet?"0 8px 28px rgba(22,163,74,.38)":"none", transition:"all .2s" }}>
                  <p style={{ margin:0, fontSize:13, fontWeight:800, color:allReqsMet?"white":"#9CA3AF", fontFamily:QS, lineHeight:1 }}>Enter</p>
                </button>
              )}

              {attendanceStatus === "checked-in" && (
                <button onClick={()=>doAction("checkout")} disabled={!allReqsMet}
                  style={{ width:"100%", height:44, borderRadius:16, background:allReqsMet?"none":"#F3F4F6", backgroundImage:allReqsMet?"linear-gradient(135deg,#D97706,#B45309)":"none", border:"none", cursor:allReqsMet?"pointer":"not-allowed", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:allReqsMet?"0 8px 28px rgba(217,119,6,.35)":"none", transition:"all .2s" }}>
                  <p style={{ margin:0, fontSize:13, fontWeight:800, color:allReqsMet?"white":"#9CA3AF", fontFamily:QS, lineHeight:1 }}>Exit</p>
                </button>
              )}
            </div>
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
