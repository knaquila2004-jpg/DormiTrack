import React, { useEffect, useRef, useState } from "react";
import { X, Navigation, Clock, MapPin, Home } from "lucide-react";
import { GoogleMapCanvas, GoogleMapHandle, MapInfoCard, MapMarker } from "./GoogleMapCanvas";
import { computeWalkingRoute, RouteResult } from "./mapGeo";

const QS = "'Quicksand',sans-serif";
const IN = "'Inter',sans-serif";

interface FullScreenBHMapProps {
  bh: { name: string; address: string; landlord?: string; contact?: string; lat: number; lng: number };
  userPosition?: { lat: number; lng: number };
  onClose: () => void;
}

// Used only when no real position is available — offsets a plausible walking
// distance away from the boarding house so the route/distance/ETA UI has
// something meaningful to show (there is no live GPS backend in this prototype).
const SIMULATED_OFFSET = { lat: 0.0035, lng: 0.0025 };

export function FullScreenBHMap({ bh, userPosition, onClose }: FullScreenBHMapProps) {
  const mapRef = useRef<GoogleMapHandle>(null);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const user = userPosition ?? { lat: bh.lat + SIMULATED_OFFSET.lat, lng: bh.lng + SIMULATED_OFFSET.lng };

  useEffect(() => {
    let cancelled = false;
    computeWalkingRoute(user, { lat: bh.lat, lng: bh.lng }).then((r) => {
      if (cancelled) return;
      setRoute(r);
      mapRef.current?.fitBounds([user, { lat: bh.lat, lng: bh.lng }]);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bh.lat, bh.lng, user.lat, user.lng]);

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
    {
      id: "user", variant: "student", position: user, title: "Your location", zIndex: 5,
      infoContent: <MapInfoCard title="Your Location" rows={[]} />,
    },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 400, background: "#F7F8FC", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, position: "relative" }}>
        <GoogleMapCanvas ref={mapRef} center={{ lat: bh.lat, lng: bh.lng }} zoom={16} mapType="standard" markers={markers} polyline={route?.path} />

        <button onClick={onClose} style={{ position: "absolute", top: 14, left: 14, zIndex: 20, width: 38, height: 38, borderRadius: 12, background: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 3px 12px rgba(0,0,0,.16)" }}>
          <X size={17} color="#374151" />
        </button>

        <div style={{ position: "absolute", top: 14, left: 62, right: 14, zIndex: 20 }}>
          <div style={{ background: "white", borderRadius: 14, padding: "9px 13px", boxShadow: "0 3px 12px rgba(0,0,0,.14)", display: "flex", alignItems: "center", gap: 7 }}>
            <Home size={13} color="#9772F6" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: "#1F2937", fontFamily: QS, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{bh.name}</span>
          </div>
        </div>
      </div>

      <div style={{ flexShrink: 0, background: "white", borderRadius: "22px 22px 0 0", boxShadow: "0 -4px 20px rgba(0,0,0,.08)", padding: "16px 18px 26px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 12 }}>
          <MapPin size={13} color="#9772F6" style={{ flexShrink: 0, marginTop: 2 }} />
          <span style={{ fontSize: 12, color: "#6B7280", fontFamily: IN, lineHeight: 1.5 }}>{bh.address}</span>
        </div>
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
      </div>
    </div>
  );
}
