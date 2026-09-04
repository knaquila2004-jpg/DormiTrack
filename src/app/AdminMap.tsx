import React, { useEffect, useRef, useState } from "react";
import {
  Search, Bell, MessageCircle, Layers, MapPin, Home, User,
  Users, Building2, ChevronDown, ChevronUp, X, ZoomIn, ZoomOut,
  LocateFixed, Compass, Filter,
} from "lucide-react";
import { BoardingHouse, MAP_CENTER } from "./shared";
import { getActiveBoardingHouses } from "./boardingHouseStore";
import { GoogleMapCanvas, GoogleMapHandle, MapInfoCard, MapMarker } from "./components/GoogleMapCanvas";
import { useUnreadCount, fmtBadgeCount } from "./notificationStore";

const GRAD   = "linear-gradient(135deg,#9772F6 0%,#7549F6 100%)";
const GRAD_H = "linear-gradient(160deg,#9772F6 0%,#7549F6 100%)";
const QS     = "'Quicksand',sans-serif";
const IN     = "'Inter',sans-serif";

// "Students" / "Reports" pins need real check-in and report location data —
// that's wired up in later phases (check_in_out_records / reports). Until
// then this map only plots real boarding houses; those two filters
// legitimately show the app's empty state rather than fabricated pins.
type DemoType = "inside" | "outside" | "report";
type FilterType = "all" | "students" | "boarding_houses" | "reports";
interface DemoMarker { id: string; type: DemoType; label: string; sub: string; lat: number; lng: number; detail: Record<string, string> }
const DEMO_MARKERS: DemoMarker[] = [];

const LEGEND: { type: "bh" | "inside" | "outside" | "report"; fill: string; label: string }[] = [
  { type: "bh",      fill: "#9772F6", label: "BH"      },
  { type: "inside",  fill: "#16A34A", label: "Inside"  },
  { type: "outside", fill: "#D97706", label: "Outside" },
  { type: "report",  fill: "#EF4444", label: "Report"  },
];

const FILTER_OPTIONS: { id: FilterType; label: string; color: string }[] = [
  { id: "all",             label: "All",             color: "#374151" },
  { id: "students",        label: "Students",        color: "#16A34A" },
  { id: "boarding_houses", label: "Boarding Houses",  color: "#9772F6" },
  { id: "reports",         label: "Reports",          color: "#EF4444" },
];

const STATUS_LABEL: Record<BoardingHouse["status"], string> = { active: "Active", pending: "Pending", suspended: "Suspended" };

function ChipRow<T extends string>({ label, options, active, onSelect }: { label: string; options: { id: T; label: string }[]; active: T; onSelect: (v: T) => void }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <p style={{ margin: "0 0 5px", fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,.6)", fontFamily: QS, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>{label}</p>
      <div style={{ display: "flex", gap: 6, overflowX: "auto" as const, scrollbarWidth: "none" as const, paddingBottom: 2 }}>
        {options.map(o => (
          <button key={o.id} onClick={() => onSelect(o.id)} style={{ flexShrink: 0, padding: "5px 13px", borderRadius: 20, border: "none", cursor: "pointer", background: active === o.id ? "white" : "rgba(255,255,255,.18)", color: active === o.id ? "#7549F6" : "rgba(255,255,255,.8)", fontSize: 10, fontWeight: 800, fontFamily: QS }}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function AdminMapScreen({ go }: { go: (s: string) => void }) {
  const notifCount = useUnreadCount("admin");
  const [mapType, setMapType] = useState<"standard" | "satellite">("standard");
  const [activeFilter, setFilter] = useState<FilterType>("all");
  const [activeMunicipality, setMunicipality] = useState<string>("all");
  const [activeStatus, setStatus] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [zoom, setZoom] = useState(14);
  const mapRef = useRef<GoogleMapHandle>(null);

  const [boardingHouses, setBoardingHouses] = useState<BoardingHouse[]>([]);
  useEffect(() => {
    let active = true;
    getActiveBoardingHouses().then(bhs => { if (active) setBoardingHouses(bhs); });
    return () => { active = false; };
  }, []);

  const municipalities = Array.from(new Set(boardingHouses.map(b => b.municipality)));
  const statuses = Array.from(new Set(boardingHouses.map(b => b.status)));

  const matchesQuery = (text: string) => query.trim() === "" || text.toLowerCase().includes(query.trim().toLowerCase());

  const showBH = activeFilter === "all" || activeFilter === "boarding_houses";
  const showDemo = (t: DemoType) =>
    activeFilter === "all" ||
    (activeFilter === "students" && (t === "inside" || t === "outside")) ||
    (activeFilter === "reports" && t === "report");

  const bhMatches = boardingHouses.filter(b =>
    (activeMunicipality === "all" || b.municipality === activeMunicipality) &&
    (activeStatus === "all" || b.status === activeStatus) &&
    matchesQuery(`${b.name} ${b.address} ${b.municipality}`),
  );
  const demoMatches = DEMO_MARKERS.filter(m => showDemo(m.type) && matchesQuery(`${m.label} ${m.sub}`));

  const markers: MapMarker[] = [
    ...(showBH ? bhMatches.map((b): MapMarker => ({
      id: b.id, variant: "bh", position: { lat: b.lat, lng: b.lng }, title: b.name, zIndex: 10,
      infoContent: (
        <MapInfoCard
          title={b.name}
          subtitle={b.address}
          rows={[
            ["Landlord", b.landlord],
            ["Available Rooms", String(b.rooms.filter(r => r.cap > r.occ).length)],
            ["Contact", b.contact ?? "—"],
            ["Status", STATUS_LABEL[b.status]],
          ]}
        />
      ),
    })) : []),
    ...demoMatches.map((m): MapMarker => ({
      id: m.id, variant: m.type, position: { lat: m.lat, lng: m.lng }, title: m.label, zIndex: m.type === "report" ? 8 : 5,
      infoContent: <MapInfoCard title={m.label} subtitle={m.sub} rows={Object.entries(m.detail) as [string, string][]} />,
    })),
  ];

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" as const, background: "#E8EDF5", position: "relative" as const }}>

      {/* ── Header overlay ─────────────────────────────────────────────────── */}
      <div style={{ position: "absolute" as const, top: 0, left: 0, right: 0, zIndex: 20, backgroundImage: GRAD_H, padding: "52px 20px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ flex: 1, background: "rgba(255,255,255,.18)", borderRadius: 14, padding: "9px 12px", display: "flex", alignItems: "center", gap: 8, backdropFilter: "blur(8px)" }}>
            <Search size={14} color="rgba(255,255,255,.7)" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search boarding house, street, barangay…" style={{ background: "none", border: "none", outline: "none", flex: 1, color: "white", fontSize: 12, fontFamily: IN, caretColor: "white" }} />
            {query && <button onClick={() => setQuery("")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}><X size={13} color="rgba(255,255,255,.7)" /></button>}
          </div>
          <button onClick={() => go("notifications")} style={{ position: "relative" as const, width: 38, height: 38, borderRadius: 12, background: "rgba(255,255,255,.15)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Bell size={16} color="white" />
            {notifCount > 0 && <span style={{ position: "absolute" as const, top: -2, right: -2, width: 14, height: 14, borderRadius: "50%", background: "#EF4444", color: "white", fontSize: 7, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{fmtBadgeCount(notifCount)}</span>}
          </button>
          <button style={{ width: 38, height: 38, borderRadius: 12, background: "rgba(255,255,255,.15)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <MessageCircle size={16} color="white" />
          </button>
        </div>

        <ChipRow label="Type" options={FILTER_OPTIONS} active={activeFilter} onSelect={setFilter} />
        <ChipRow
          label="Municipality"
          options={[{ id: "all", label: "All" }, ...municipalities.map(m => ({ id: m, label: m }))]}
          active={activeMunicipality}
          onSelect={setMunicipality}
        />
        <ChipRow
          label="Status"
          options={[{ id: "all", label: "All" }, ...statuses.map(s => ({ id: s, label: STATUS_LABEL[s] }))]}
          active={activeStatus}
          onSelect={setStatus}
        />
      </div>

      {/* ── Map ─────────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, position: "relative" as const, overflow: "hidden" }}>
        <GoogleMapCanvas
          ref={mapRef}
          // Always opens on BISU Calape Campus — a fixed, predictable reference point for an
          // overview map plotting every boarding house at once, not tied to whichever one
          // happens to be first. Admin can pan/zoom/search from there same as always.
          center={MAP_CENTER}
          zoom={zoom}
          mapType={mapType}
          onZoomChange={setZoom}
          markers={markers}
          enableClustering
        />

        {/* Top-right map type — single click toggles standard/satellite directly */}
        <div style={{ position: "absolute" as const, top: 214, right: 12, zIndex: 20 }}>
          <button
            onClick={() => setMapType(t => t === "standard" ? "satellite" : "standard")}
            title={mapType === "standard" ? "Switch to satellite view" : "Switch to standard view"}
            style={{ width: 38, height: 38, borderRadius: 12, background: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 3px 12px rgba(0,0,0,.14)" }}
          >
            <Layers size={16} color={mapType === "satellite" ? "#9772F6" : "#374151"} />
          </button>
        </div>

        {/* Zoom controls */}
        <div style={{ position: "absolute" as const, right: 12, top: "60%", transform: "translateY(-50%)", display: "flex", flexDirection: "column" as const, gap: 6, zIndex: 20 }}>
          {[
            { Icon: ZoomIn,      fn: () => mapRef.current?.zoomIn() },
            { Icon: ZoomOut,     fn: () => mapRef.current?.zoomOut() },
            { Icon: LocateFixed, fn: () => mapRef.current?.recenter() },
            { Icon: Compass,     fn: () => {} },
          ].map(({ Icon, fn }, i) => (
            <button key={i} onClick={fn} style={{ width: 36, height: 36, borderRadius: 11, background: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,.12)" }}>
              <Icon size={15} color={i === 2 ? "#3B82F6" : "#374151"} />
            </button>
          ))}
        </div>

        {/* Legend */}
        <div style={{ position: "absolute" as const, bottom: 14, left: 12, zIndex: 20 }}>
          <div style={{ background: "white", borderRadius: 14, padding: "10px 12px", boxShadow: "0 4px 16px rgba(0,0,0,.14)", display: "flex", gap: 10 }}>
            {LEGEND.map(({ type, fill, label }) => (
              <div key={type} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: fill }} />
                <span style={{ fontSize: 8, fontWeight: 700, color: "#374151", fontFamily: QS }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {markers.length === 0 && (
          <div style={{ position: "absolute" as const, top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 20, background: "white", borderRadius: 16, padding: "14px 20px", boxShadow: "0 4px 16px rgba(0,0,0,.14)" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#6B7280", fontFamily: QS }}>No results match these filters.</span>
          </div>
        )}
      </div>
    </div>
  );
}
