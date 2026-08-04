import React, { useState } from "react";
import { X, LocateFixed, MapPin, Check } from "lucide-react";
import { GRAD, GRAD_H, MAP_CENTER } from "../shared";
import { GoogleMapCanvas } from "./GoogleMapCanvas";
import { PlacesAutocompleteInput } from "./PlacesAutocompleteInput";
import { useGeolocation } from "./useGeolocation";
import { loadGoogleMaps } from "./googleMapsLoader";

const QS = "'Quicksand',sans-serif";
const IN = "'Inter',sans-serif";

interface LocationPickerModalProps {
  initialPosition?: { lat: number; lng: number };
  initialAddress?: string;
  onClose: () => void;
  onConfirm: (result: { lat: number; lng: number; address: string }) => void;
}

async function reverseGeocode(pos: { lat: number; lng: number }): Promise<string> {
  const g = await loadGoogleMaps();
  return new Promise((resolve) => {
    new g.maps.Geocoder().geocode({ location: pos }, (results: any[], status: string) => {
      resolve(status === "OK" && results?.[0] ? results[0].formatted_address : "");
    });
  });
}

export function LocationPickerModal({ initialPosition, initialAddress, onClose, onConfirm }: LocationPickerModalProps) {
  const [position, setPosition] = useState(initialPosition ?? MAP_CENTER);
  const [address, setAddress] = useState(initialAddress ?? "");
  const [resolving, setResolving] = useState(false);
  const geo = useGeolocation();

  async function movePin(pos: { lat: number; lng: number }) {
    setPosition(pos);
    setResolving(true);
    const resolved = await reverseGeocode(pos);
    if (resolved) setAddress(resolved);
    setResolving(false);
  }

  function useMyLocation() {
    geo.requestLocation();
  }

  React.useEffect(() => {
    if (geo.position) movePin({ lat: geo.position.lat, lng: geo.position.lng });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.position]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "#F7F8FC", display: "flex", flexDirection: "column" }}>
      <div style={{ flexShrink: 0, padding: "48px 20px 16px", backgroundImage: GRAD_H, position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 48, right: 16, width: 34, height: 34, borderRadius: 11, background: "rgba(255,255,255,.18)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <X size={16} color="white" />
        </button>
        <h1 style={{ color: "white", fontSize: 19, fontWeight: 800, margin: "0 0 3px", fontFamily: QS }}>Pin Exact Location</h1>
        <p style={{ color: "rgba(255,255,255,.75)", fontSize: 12, margin: 0 }}>Search, drag the pin, or use your current location.</p>
      </div>

      <div style={{ padding: "14px 16px 0" }}>
        <PlacesAutocompleteInput
          value={address}
          onChangeText={setAddress}
          onPlaceSelected={(place) => { setPosition({ lat: place.lat, lng: place.lng }); setAddress(place.address); }}
          placeholder="Search boarding house address…"
        />
      </div>

      <div style={{ flex: 1, position: "relative", margin: "14px 16px", borderRadius: 20, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,.08)" }}>
        <GoogleMapCanvas
          center={position}
          zoom={17}
          mapType="standard"
          draggableMarker={{ position }}
          onMarkerDragEnd={(r) => { setPosition({ lat: r.lat, lng: r.lng }); if (r.address) setAddress(r.address); }}
          onMapClick={movePin}
        />
        <button onClick={useMyLocation} style={{ position: "absolute", top: 12, right: 12, width: 40, height: 40, borderRadius: 13, background: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 3px 12px rgba(0,0,0,.16)" }}>
          <LocateFixed size={17} color={geo.loading ? "#9CA3AF" : "#3B82F6"} />
        </button>
        {geo.error && (
          <div style={{ position: "absolute", bottom: 12, left: 12, right: 12, background: "rgba(239,68,68,.95)", borderRadius: 12, padding: "8px 12px" }}>
            <span style={{ fontSize: 11, color: "white", fontFamily: IN }}>{geo.error.message}</span>
          </div>
        )}
      </div>

      <div style={{ flexShrink: 0, background: "white", borderRadius: "24px 24px 0 0", boxShadow: "0 -4px 20px rgba(0,0,0,.08)", padding: "18px 20px 28px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 14 }}>
          <MapPin size={15} color="#9772F6" style={{ flexShrink: 0, marginTop: 2 }} />
          <span style={{ fontSize: 12, color: "#374151", fontFamily: IN, lineHeight: 1.5 }}>
            {resolving ? "Resolving address…" : address || "No address resolved — you can still confirm these coordinates."}
          </span>
        </div>
        <div style={{ fontSize: 10, color: "#9CA3AF", fontFamily: IN, marginBottom: 14 }}>
          {position.lat.toFixed(6)}°, {position.lng.toFixed(6)}°
        </div>
        <button
          onClick={() => onConfirm({ lat: position.lat, lng: position.lng, address })}
          style={{ width: "100%", height: 50, borderRadius: 18, border: "none", backgroundImage: GRAD, color: "white", fontSize: 14, fontWeight: 800, fontFamily: QS, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 6px 18px rgba(151,114,246,.35)" }}
        >
          <Check size={16} /> Confirm Location
        </button>
      </div>
    </div>
  );
}
