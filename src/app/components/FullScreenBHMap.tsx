import React, { useEffect, useRef, useState } from "react";
import { X, Navigation, Clock, MapPin, Layers, ZoomIn, ZoomOut, LocateFixed } from "lucide-react";
import { GoogleMapCanvas, GoogleMapHandle, MapInfoCard, MapMarker } from "./GoogleMapCanvas";
import { computeWalkingRoute, RouteResult } from "./mapGeo";

const QS = "'Quicksand',sans-serif";
const IN = "'Inter',sans-serif";

interface FullScreenBHMapProps {
  bh: { name: string; address: string; landlord?: string; contact?: string; lat: number; lng: number };
  userPosition?: { lat: number; lng: number };
  onClose: () => void;
  // Defaults to shown (Parent's boarding-house screen and the registration flow still
  // want it) — StudentOccupants.tsx's "My Dorm" opens this without it.
  showDistanceInfo?: boolean;
}

// Used only when no real position is available — offsets a plausible walking
// distance away from the boarding house so the route/distance/ETA UI has
// something meaningful to show (there is no live GPS backend in this prototype).
const SIMULATED_OFFSET = { lat: 0.0035, lng: 0.0025 };

export function FullScreenBHMap({ bh, userPosition, onClose, showDistanceInfo = true }: FullScreenBHMapProps) {
  const mapRef = useRef<GoogleMapHandle>(null);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [zoom, setZoom] = useState(16);
  const [mapType, setMapType] = useState<"standard"|"satellite">("standard");
  const user = userPosition ?? { lat: bh.lat + SIMULATED_OFFSET.lat, lng: bh.lng + SIMULATED_OFFSET.lng };

  useEffect(() => {
    if (!showDistanceInfo) return;
    let cancelled = false;
    // Still computed for the real Distance/Est. Walk stats below — only the visual
    // route line and "your location" marker were removed, not the underlying route.
    computeWalkingRoute(user, { lat: bh.lat, lng: bh.lng }).then((r) => {
      if (cancelled) return;
      setRoute(r);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDistanceInfo, bh.lat, bh.lng, user.lat, user.lng]);

  const markers: MapMarker[] = [
    {
      id: "bh", variant: "bh", position: { lat: bh.lat, lng: bh.lng }, title: bh.name, zIndex: 10,
      infoContent: (
        <MapInfoCard
          title={bh.name}
          subtitle={bh.address}
          rows={[
            ...(bh.landlord ? ([["Landlord", bh.landlord]] as [string, string][]) : []),
            ...(bh.contact ? ([["Contact", bh.contact]] as [string, string][]) : []),
          ]}
        />
      ),
    },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 400, background: "#F7F8FC", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, position: "relative" }}>
        <GoogleMapCanvas ref={mapRef} center={{ lat: bh.lat, lng: bh.lng }} zoom={zoom} mapType={mapType} markers={markers} />

        <button onClick={onClose} style={{ position: "absolute", top: 50, right: 14, zIndex: 20, width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,.75)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 3px 12px rgba(0,0,0,.16)" }}>
          <X size={14} color="#374151" />
        </button>

        {/* Same one-stack, evenly-spaced right-side controls as the Map tab's embedded
            view (StudentMap.tsx) — satellite toggle, zoom in/out, recenter. */}
        <div style={{ position: "absolute", right: 14, bottom: 14, display: "flex", flexDirection: "column", gap: 6, zIndex: 20 }}>
          {[
            { Icon: Layers,      onClick: () => setMapType(t => t === "standard" ? "satellite" : "standard"), title: mapType === "standard" ? "Switch to satellite view" : "Switch to standard view", color: mapType === "satellite" ? "#9772F6" : "#374151" },
            { Icon: ZoomIn,      onClick: () => setZoom(z => Math.min(z + 1, 20)), color: "#374151" },
            { Icon: ZoomOut,     onClick: () => setZoom(z => Math.max(z - 1, 10)), color: "#374151" },
            { Icon: LocateFixed, onClick: () => mapRef.current?.recenter(),        color: "#3B82F6" },
          ].map(({ Icon, onClick, title, color }, i) => (
            <button key={i} onClick={onClick} title={title} style={{ width: 36, height: 36, borderRadius: 11, background: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,.12)" }}>
              <Icon size={15} color={color} />
            </button>
          ))}
        </div>
      </div>

      <div style={{ flexShrink: 0, background: "white", borderRadius: "22px 22px 0 0", boxShadow: "0 -4px 20px rgba(0,0,0,.08)", padding: "16px 18px 26px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 12 }}>
          <MapPin size={13} color="#9772F6" style={{ flexShrink: 0, marginTop: 2 }} />
          <span style={{ fontSize: 12, color: "#6B7280", fontFamily: IN, lineHeight: 1.5 }}>{bh.address}</span>
        </div>
        {showDistanceInfo && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ background: "#F9FAFB", borderRadius: 14, padding: "10px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: 10, backgroundImage: "linear-gradient(135deg,#9772F6 0%,#7549F6 100%)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Navigation size={13} color="white" />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 9, color: "#9CA3AF", fontFamily: IN }}>Distance</p>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#1F2937", fontFamily: QS }}>{route ? route.distanceText : "…"}</p>
                </div>
              </div>
              <div style={{ background: "#F9FAFB", borderRadius: 14, padding: "10px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: 10, background: "#FEF3C7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Clock size={13} color="#D97706" />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 9, color: "#9CA3AF", fontFamily: IN }}>Est. Walk</p>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#1F2937", fontFamily: QS }}>{route ? route.durationText : "…"}</p>
                </div>
              </div>
            </div>
            {route?.approx && (
              <p style={{ margin: "10px 0 0", fontSize: 10, color: "#9CA3AF", fontFamily: IN, textAlign: "center" }}>
                Approximate straight-line distance — turn-by-turn routing unavailable.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
