import React, { useEffect, useRef, useState } from "react";
import { MapPin, Star, Plus, Minus, Layers, LocateFixed, Loader2, Phone, Globe, ExternalLink, Check, Maximize2, Minimize2, X } from "lucide-react";
import { GRAD, MAP_CENTER } from "../shared";
import { GoogleMapCanvas, GoogleMapHandle } from "./GoogleMapCanvas";
import { PlacesAutocompleteInput, AutocompletePlace } from "./PlacesAutocompleteInput";
import { useGeolocation } from "./useGeolocation";
import { AddressComponents } from "./mapGeo";

const QS = "'Quicksand',sans-serif";
const IN = "'Inter',sans-serif";

export type LocationType = "existing" | "custom";

export interface BoardingHouseLocationValue {
  lat: number;
  lng: number;
  address: string; // for "existing": the place provider's own formatted address. For "custom": whatever the landlord typed.
  components: AddressComponents; // only ever populated for "existing" — a custom pin has no geocoder breakdown to offer.
  locationType: LocationType;
  placeName: string | null; // the existing place's name, when applicable
  placeId: string | null; // the existing place's Google Place ID reference, when applicable
}

interface BoardingHouseLocationPickerProps {
  lat: number | null;
  lng: number | null;
  address: string;
  locationType?: LocationType | null;
  placeName?: string | null;
  placeId?: string | null;
  /** Whether the currently-shown pin has been confirmed as the official location. */
  confirmed?: boolean;
  onConfirmedChange?: (confirmed: boolean) => void;
  onLocationChange: (result: BoardingHouseLocationValue) => void;
  hasError?: boolean;
  /** The only distance from the pin within which a student's check-in/check-out is accepted.
   *  Shown as an adjustable slider (with a live preview circle on the map) once the location is
   *  confirmed — editing the pin again hides it until the new spot is confirmed too. */
  radiusMeters: number;
  onRadiusChange: (meters: number) => void;
}

const MIN_RADIUS = 5;
const MAX_RADIUS = 300;

type PlaceStatus = "idle" | "resolving" | "zero_results" | "lookup_failed";

interface Candidate {
  placeId: string;
  name: string;
  address: string;
  components: AddressComponents;
  lat: number;
  lng: number;
  phone?: string;
  website?: string;
  rating?: number;
  userRatingsTotal?: number;
  openNow?: boolean;
}

/**
 * Interactive Google Map location picker for pinning a boarding house's exact
 * location. Used during Landlord Registration → Boarding House Setup, and again
 * in the Landlord Profile's "Edit BH Info" flow.
 *
 * The map decides what happens on its own — there is no pin-type picker:
 *  - Tapping one of Google's own existing mapped places shows that place's own
 *    provider information (name, formatted address, and whatever contact/rating
 *    info Google actually returned) for review, then "Use This Location" uses
 *    that place's own data as-is. Its coordinates are NEVER reverse-geocoded to
 *    generate a different address — the place provider's address is authoritative.
 *  - Tapping anywhere else automatically drops a draggable star-marked pin at the
 *    exact tapped spot instead, and the landlord types the boarding house's
 *    actual address themselves — a custom pin's address is never guessed from
 *    its coordinates. Dragging that pin updates its coordinates only; whatever
 *    address the landlord already typed is left untouched.
 */
export function BoardingHouseLocationPicker({
  lat, lng, address, locationType, placeName, placeId, confirmed, onConfirmedChange, onLocationChange, hasError,
  radiusMeters, onRadiusChange,
}: BoardingHouseLocationPickerProps) {
  const hasPin = lat != null && lng != null;
  const position = hasPin ? { lat: lat as number, lng: lng as number } : MAP_CENTER;
  const isConfirmed = !!confirmed && hasPin;
  const isCustomPin = locationType === "custom";
  const isExistingPin = locationType === "existing";
  const canConfirm = isExistingPin ? hasPin && !!address : hasPin && !!address.trim();

  const [candidate, setCandidate] = useState<Candidate | null>(null); // tapped/searched existing place, pending "Use This Location"
  const [placeStatus, setPlaceStatus] = useState<PlaceStatus>("idle");
  const [mapType, setMapType] = useState<"standard" | "satellite">("standard");
  const [zoom, setZoom] = useState(16);
  const [searchText, setSearchText] = useState("");
  // Fullscreen map modal — the same GoogleMapCanvas instance moves between the inline 230px box
  // and this larger view (only one is ever mounted at a time, sharing the same mapRef/handlers),
  // so anything tapped/dragged/searched here is exactly the same live selection either way.
  const [expanded, setExpanded] = useState(false);
  const mapRef = useRef<GoogleMapHandle>(null);
  const geo = useGeolocation();
  const addressRef = useRef(address);
  addressRef.current = address;
  const addressFieldRef = useRef<HTMLTextAreaElement | null>(null);

  // A failed place-details lookup still drops a real fallback pin (see
  // placePin below), but on a small screen the pin and the address field it
  // needs next can both be out of view — easy to mistake for "nothing
  // happened." Pull the address field into view and focus it so the next
  // step is unmissable instead of silently scrolled off-screen.
  useEffect(() => {
    if (placeStatus === "lookup_failed") {
      // The manual address field this recovery flow needs only exists in the normal (non-modal)
      // layout — collapse out of the expanded map first so it's actually reachable.
      setExpanded(false);
    }
  }, [placeStatus]);

  useEffect(() => {
    if (placeStatus === "lookup_failed" && addressFieldRef.current) {
      // preventScroll: focus()'s own default auto-scroll only brings an
      // element to the *nearest* edge of the viewport — since this field is
      // usually already barely peeking into view, that satisfies "nearest"
      // and silently wins over the explicit scrollIntoView below, leaving
      // it looking untouched. Suppress it so our own centered scroll below
      // is the one that actually runs.
      addressFieldRef.current.focus({ preventScroll: true });
      addressFieldRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [placeStatus, expanded]);

  function resetToMap() {
    setCandidate(null); setPlaceStatus("idle"); setSearchText("");
    onConfirmedChange?.(false);
  }

  // ── Tapping an empty spot: automatically drop a draggable star pin there. No address is guessed. ──
  function placePin(pos: { lat: number; lng: number }) {
    setCandidate(null); setPlaceStatus("idle");
    onLocationChange({ lat: pos.lat, lng: pos.lng, address: "", components: {}, locationType: "custom", placeName: null, placeId: null });
    mapRef.current?.panTo(pos);
    // A fresh custom pin needs a manually-typed address next — that field only exists in the
    // normal (non-modal) layout, so surface it right away instead of leaving the landlord staring
    // at a still-expanded map with no obvious next step.
    setExpanded(false);
  }

  // Dragging the same star pin only ever updates its coordinates — the landlord's typed address stays put.
  function handleMarkerDragEnd(pos: { lat: number; lng: number }) {
    onLocationChange({ lat: pos.lat, lng: pos.lng, address: addressRef.current, components: {}, locationType: "custom", placeName: null, placeId: null });
  }

  function handleAddressInput(v: string) {
    if (!hasPin) return;
    onLocationChange({ lat: lat as number, lng: lng as number, address: v, components: {}, locationType: "custom", placeName: null, placeId: null });
  }

  // ── Tapping an existing Google place: show its own info in a floating popup anchored to the pin,
  //    never reverse-geocode it. The popup is purely informational (closeable independently); the
  //    place's own data is committed as the pending selection right away, same as a custom pin tap —
  //    the single Confirm Location button below the map is what finalizes it either way. ──
  function handlePoiClickStart() {
    setPlaceStatus("resolving");
  }

  // Fires when a tap did land on an existing place but its info couldn't be retrieved at all — the
  // tap still falls back to a plain pin (via onMapClick), but this surfaces *why* visibly instead of
  // only in the console, since that pin is otherwise indistinguishable from a genuine empty-map tap.
  function handlePoiClickFailed() {
    setPlaceStatus("lookup_failed");
  }

  function selectExistingPlace(place: AutocompletePlace & { placeId: string }) {
    setPlaceStatus(place.address ? "idle" : "zero_results");
    setCandidate({ placeId: place.placeId, name: place.name || place.address || "Selected Place", address: place.address, components: place.components, lat: place.lat, lng: place.lng, phone: place.phone, website: place.website, rating: place.rating, userRatingsTotal: place.userRatingsTotal, openNow: place.openNow });
    mapRef.current?.panTo({ lat: place.lat, lng: place.lng });
    if (place.address) {
      onLocationChange({ lat: place.lat, lng: place.lng, address: place.address, components: place.components, locationType: "existing", placeName: place.name || place.address, placeId: place.placeId });
    }
  }

  function handlePoiClick(place: AutocompletePlace) {
    if (!place.placeId) return;
    selectExistingPlace(place as AutocompletePlace & { placeId: string });
  }

  function handlePlaceSelected(place: AutocompletePlace) {
    setZoom(17);
    if (place.placeId) {
      selectExistingPlace(place as AutocompletePlace & { placeId: string });
    } else {
      // A search result with no place reference behaves the same as tapping empty ground.
      placePin({ lat: place.lat, lng: place.lng });
    }
  }

  function closePopup() {
    setCandidate(null);
    setPlaceStatus("idle");
  }

  // Floating popup anchored to the tapped/searched existing place — Google Maps-style card: name,
  // address exactly as the place provider returns it, an "open in Google Maps" icon top-right, and
  // whatever extra info Google actually returned. Purely informational — closing it doesn't undo the
  // selection, which is already committed; the map badge below and the summary card handle the rest.
  const candidateCard = candidate && (
    <div style={{ minWidth: 220, maxWidth: 250, fontFamily: IN, padding: "2px 4px 4px 2px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#1F2937", fontFamily: QS, lineHeight: 1.35 }}>{candidate.name}</p>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${candidate.lat},${candidate.lng}&query_place_id=${candidate.placeId}`}
          target="_blank" rel="noreferrer" title="Open in Google Maps"
          style={{ flexShrink: 0, width: 26, height: 26, borderRadius: "50%", background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}
        >
          <ExternalLink size={13} color="#3B82F6" />
        </a>
      </div>
      <p style={{ margin: candidate.phone || candidate.website || candidate.rating != null || candidate.openNow != null ? "0 0 8px" : 0, fontSize: 12, color: "#6B7280", lineHeight: 1.5 }}>
        {candidate.address || "No address on file for this place."}
      </p>
      {/* Only ever shown when Google actually returned it — nothing here is guessed */}
      {(candidate.phone || candidate.website || candidate.rating != null || candidate.openNow != null) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {candidate.rating != null && (
            <span style={{ fontSize: 11, color: "#6B7280", fontFamily: IN, display: "flex", alignItems: "center", gap: 5 }}><Star size={11} color="#D97706" fill="#D97706" /> {candidate.rating.toFixed(1)}{candidate.userRatingsTotal ? ` (${candidate.userRatingsTotal} reviews)` : ""}</span>
          )}
          {candidate.openNow != null && (
            <span style={{ fontSize: 11, fontWeight: 700, color: candidate.openNow ? "#16A34A" : "#EF4444", fontFamily: QS }}>{candidate.openNow ? "Open now" : "Closed now"}</span>
          )}
          {candidate.phone && (
            <span style={{ fontSize: 11, color: "#6B7280", fontFamily: IN, display: "flex", alignItems: "center", gap: 5 }}><Phone size={11} /> {candidate.phone}</span>
          )}
          {candidate.website && (
            <span style={{ fontSize: 11, color: "#6B7280", fontFamily: IN, display: "flex", alignItems: "center", gap: 5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}><Globe size={11} style={{ flexShrink: 0 }} /> {candidate.website}</span>
          )}
        </div>
      )}
    </div>
  );

  const ctrlBtn = (onClick: () => void, disabled: boolean | undefined, children: React.ReactNode, title: string) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        width: 34, height: 34, borderRadius: 11, border: "1px solid rgba(255,255,255,.9)",
        background: "rgba(255,255,255,.95)", boxShadow: "0 3px 10px rgba(0,0,0,.14)",
        display: "flex", alignItems: "center", justifyContent: "center", cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.5 : 1, flexShrink: 0,
      }}
    >
      {children}
    </button>
  );

  const searchBar = !isConfirmed && (
    <PlacesAutocompleteInput
      value={searchText}
      onChangeText={setSearchText}
      onPlaceSelected={handlePlaceSelected}
      placeholder="Search for your boarding house location..."
    />
  );

  // The interactive map — tapping it decides everything; no pin-type buttons. Shared between the
  // inline 230px box and the fullscreen modal, so only ONE of these ever actually mounts at a time
  // (they share mapRef) — never render both simultaneously.
  function mapBox(height: number | string, isModal: boolean) {
    return (
      <div style={{
        position: "relative", height, borderRadius: isModal ? 0 : 18, overflow: "hidden",
        border: isModal ? "none" : `1.5px solid ${hasError ? "#EF4444" : "#E5E7EB"}`, marginBottom: isModal ? 0 : 10,
      }}>
        {/* While an existing-place candidate card is open, it fully takes over the map display —
            any earlier unconfirmed custom star pin is hidden so the two selections can't be shown
            (and confused for one another) at the same time. */}
        <GoogleMapCanvas
          ref={mapRef}
          center={position}
          zoom={zoom}
          mapType={mapType}
          onZoomChange={setZoom}
          draggableMarker={isCustomPin && hasPin && !isConfirmed && !candidate ? { position, variant: "selected" } : undefined}
          markers={
            candidate
              ? [{ id: "candidate", position: { lat: candidate.lat, lng: candidate.lng }, variant: "place", title: candidate.name }]
              : hasPin && (isConfirmed || !isCustomPin)
                ? [{ id: "bh", position, variant: isConfirmed ? "bh" : "place", title: placeName || "Boarding House Location" }]
                : undefined
          }
          onMarkerDragEnd={handleMarkerDragEnd}
          onMapClick={!isConfirmed ? placePin : undefined}
          clickablePois={!isConfirmed}
          onPoiClick={!isConfirmed ? handlePoiClick : undefined}
          onPoiClickStart={!isConfirmed ? handlePoiClickStart : undefined}
          onPoiClickFailed={!isConfirmed ? handlePoiClickFailed : undefined}
          infoWindow={candidate ? { position: { lat: candidate.lat, lng: candidate.lng }, content: candidateCard } : null}
          onInfoWindowClose={closePopup}
          // Live preview of the check-in/check-out geofence — only meaningful (and only shown)
          // once the pin itself is confirmed, same gating as the radius slider below.
          circle={isConfirmed ? { center: position, radiusMeters, color: "#9772F6" } : undefined}
        />

        {!hasPin && (
          <div style={{
            position: "absolute", left: 12, right: 12, top: 12, zIndex: 20,
            background: "rgba(255,255,255,.95)", borderRadius: 12, padding: "8px 12px",
            display: "flex", alignItems: "center", gap: 8, boxShadow: "0 3px 10px rgba(0,0,0,.12)",
          }}>
            <MapPin size={14} color="#9772F6" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: "#6B7280", fontFamily: IN }}>Tap an existing place, or tap anywhere to drop a pin</span>
          </div>
        )}

        {placeStatus === "resolving" && (
          <div style={{
            position: "absolute", left: 12, right: 12, top: 12, zIndex: 20,
            background: "rgba(255,255,255,.95)", borderRadius: 12, padding: "8px 12px",
            display: "flex", alignItems: "center", gap: 8, boxShadow: "0 3px 10px rgba(0,0,0,.12)",
          }}>
            <Loader2 size={14} color="#9772F6" className="dt-spin" />
            <span style={{ fontSize: 11, color: "#6B7280", fontFamily: IN }}>Loading place information…</span>
          </div>
        )}

        {placeStatus === "lookup_failed" && (
          <div style={{
            position: "absolute", left: 12, right: 12, top: 12, zIndex: 20,
            background: "rgba(254,252,232,.97)", border: "1px solid #FDE68A", borderRadius: 12, padding: "8px 12px",
            display: "flex", alignItems: "flex-start", gap: 8, boxShadow: "0 3px 10px rgba(0,0,0,.12)",
          }}>
            <MapPin size={14} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 11, color: "#92400E", fontFamily: IN, lineHeight: 1.5 }}>
              A pin was dropped at that spot ↓ — we just couldn't load that place's extra info. Enter the address below to continue, or try tapping again.
            </span>
          </div>
        )}

        {/* Map controls: zoom, satellite toggle, locate me, expand/collapse */}
        <div style={{ position: "absolute", top: 12, right: 12, display: "flex", flexDirection: "column", gap: 6, zIndex: 20 }}>
          {ctrlBtn(() => mapRef.current?.zoomIn(), undefined, <Plus size={15} color="#6B7280" />, "Zoom in")}
          {ctrlBtn(() => mapRef.current?.zoomOut(), undefined, <Minus size={15} color="#6B7280" />, "Zoom out")}
          {ctrlBtn(() => setMapType(t => (t === "standard" ? "satellite" : "standard")), undefined, <Layers size={15} color={mapType === "satellite" ? "#9772F6" : "#6B7280"} />, "Toggle satellite view")}
          {!isConfirmed && ctrlBtn(() => geo.requestLocation(), geo.loading, <LocateFixed size={15} color={geo.loading ? "#9CA3AF" : "#3B82F6"} />, "Use my current location")}
          {isModal
            ? ctrlBtn(() => setExpanded(false), undefined, <Minimize2 size={15} color="#6B7280" />, "Collapse map")
            : ctrlBtn(() => setExpanded(true), undefined, <Maximize2 size={15} color="#6B7280" />, "Expand map")}
        </div>

        {(candidate || hasPin) && (
          <div style={{
            position: "absolute", left: 12, bottom: 12, zIndex: 20,
            background: "rgba(255,255,255,.95)", borderRadius: 10, padding: "4px 10px",
            fontSize: 10, fontWeight: 700, color: "#9772F6", fontFamily: QS, boxShadow: "0 2px 8px rgba(0,0,0,.1)",
            display: "flex", alignItems: "center", gap: 4,
          }}>
            {candidate ? <MapPin size={11} /> : isCustomPin ? <Star size={11} /> : <MapPin size={11} />}
            {candidate ? candidate.name : (isConfirmed ? "Boarding House Location" : placeName || "Selected Location")}
          </div>
        )}

        {geo.error && (
          <div style={{ position: "absolute", left: 12, right: 12, bottom: 12, zIndex: 20, background: "rgba(239,68,68,.95)", borderRadius: 10, padding: "8px 12px" }}>
            <span style={{ fontSize: 11, color: "white", fontFamily: IN }}>{geo.error.message}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", fontFamily: QS, marginBottom: 6, display: "block" }}>
        Boarding House Location <span style={{ color: "#EF4444" }}>*</span>
      </label>
      <p style={{ fontSize: 11, color: "#9CA3AF", margin: "0 0 10px", lineHeight: 1.5 }}>
        Tap your boarding house location on the map, or use the expand button for a bigger view.
      </p>

      {!expanded && (
        <>
          {searchBar && <div style={{ marginBottom: 10 }}>{searchBar}</div>}
          {mapBox(230, false)}
        </>
      )}

      {expanded && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1000, background: "white",
          display: "flex", flexDirection: "column",
        }}>
          <div style={{
            padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between",
            borderBottom: "1px solid #F3F4F6", flexShrink: 0,
          }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#1F2937", fontFamily: QS }}>Boarding House Location</p>
            <button
              onClick={() => setExpanded(false)}
              title="Close expanded map"
              style={{
                width: 32, height: 32, borderRadius: 10, border: "none", background: "#F3F4F6",
                display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0,
              }}
            >
              <X size={16} color="#6B7280" />
            </button>
          </div>
          {searchBar && <div style={{ padding: "12px 16px 0", flexShrink: 0 }}>{searchBar}</div>}
          <div style={{ flex: 1, minHeight: 0, padding: 16 }}>
            {mapBox("100%", true)}
          </div>
        </div>
      )}
      <style>{`@keyframes dtSpin{to{transform:rotate(360deg)}} .dt-spin{animation:dtSpin .8s linear infinite}`}</style>

      {/* Custom pin: the landlord types the address themselves — never auto-filled. Hidden while
          reviewing an existing-place candidate above, so the two selections never show at once. */}
      {isCustomPin && hasPin && !isConfirmed && !candidate && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ borderRadius: 14, background: "#F5F0FF", border: "1.5px solid #DDD6FE", padding: "10px 12px", marginBottom: 10, display: "flex", gap: 8, alignItems: "flex-start" }}>
            <Star size={14} color="#9772F6" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ margin: 0, fontSize: 11.5, fontWeight: 700, color: "#374151", fontFamily: QS, lineHeight: 1.5 }}>
              This spot isn't on the map yet. Drag the starred pin to fine-tune it, then enter the boarding house address yourself.
            </p>
          </div>
          <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", fontFamily: QS, marginBottom: 6, display: "block" }}>
            Boarding House Address <span style={{ color: "#EF4444" }}>*</span>
          </label>
          <textarea
            ref={addressFieldRef}
            value={address}
            onChange={e => handleAddressInput(e.target.value)}
            placeholder="Enter the boarding house address manually."
            rows={2}
            style={{
              width: "100%", boxSizing: "border-box", padding: "13px 14px", borderRadius: 14,
              border: `1.5px solid ${hasError && !address.trim() ? "#EF4444" : "#E5E7EB"}`, background: "#F9FAFB",
              color: "#1F2937", fontSize: 14, fontFamily: IN, outline: "none", resize: "none", lineHeight: 1.5,
            }}
          />
        </div>
      )}

      {/* Final Confirm Location / locked summary — the single confirmation action, for either
          selection method. Stays visible even while the existing-place popup is open above, since
          that popup is purely informational and the selection itself is already committed. */}
      {hasPin && (
        <div style={{ borderRadius: 16, background: isConfirmed ? "#F9FAFB" : "#F5F0FF", border: isConfirmed ? "none" : "1.5px solid #DDD6FE", padding: "12px 14px" }}>
          <p style={{ fontSize: 11.5, fontWeight: 800, color: "#374151", fontFamily: QS, margin: "0 0 8px", display: "flex", alignItems: "center", gap: 5 }}>
            {isConfirmed ? <Check size={12} /> : isCustomPin ? <Star size={12} /> : <MapPin size={12} />}
            {isConfirmed ? "Boarding House Location" : isCustomPin ? "Custom Boarding House Pin" : "Existing Map Location"}
          </p>
          <p style={{ fontSize: 10.5, fontWeight: 700, color: "#9CA3AF", fontFamily: QS, margin: "0 0 2px", textTransform: "uppercase", letterSpacing: 0.4 }}>Address</p>
          <p style={{ fontSize: 12, fontWeight: 700, color: address ? "#1F2937" : "#9CA3AF", fontFamily: IN, margin: "0 0 10px", lineHeight: 1.5 }}>{address || "Not entered yet"}</p>
          <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
            <div>
              <p style={{ fontSize: 10.5, fontWeight: 700, color: "#9CA3AF", fontFamily: QS, margin: "0 0 2px", textTransform: "uppercase", letterSpacing: 0.4 }}>Latitude</p>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#1F2937", fontFamily: QS, margin: 0 }}>{(lat as number).toFixed(6)}</p>
            </div>
            <div>
              <p style={{ fontSize: 10.5, fontWeight: 700, color: "#9CA3AF", fontFamily: QS, margin: "0 0 2px", textTransform: "uppercase", letterSpacing: 0.4 }}>Longitude</p>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#1F2937", fontFamily: QS, margin: 0 }}>{(lng as number).toFixed(6)}</p>
            </div>
          </div>
          {isConfirmed && (
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 10.5, fontWeight: 700, color: "#9CA3AF", fontFamily: QS, margin: "0 0 2px", textTransform: "uppercase", letterSpacing: 0.4 }}>Location Type</p>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#1F2937", fontFamily: QS, margin: 0 }}>{isCustomPin ? "Custom Boarding House Pin" : "Existing Map Location"}</p>
            </div>
          )}
          {isConfirmed ? (
            <button onClick={resetToMap} style={{ width: "100%", padding: "10px 0", borderRadius: 14, border: "1.5px solid #DDD6FE", background: "white", color: "#9772F6", fontSize: 12, fontWeight: 800, fontFamily: QS, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <MapPin size={13} /> Change Location
            </button>
          ) : (
            <button
              onClick={() => onConfirmedChange?.(true)}
              disabled={!canConfirm}
              style={{ width: "100%", padding: "10px 0", borderRadius: 14, border: "none", background: canConfirm ? GRAD : "#E5E7EB", color: canConfirm ? "white" : "#9CA3AF", fontSize: 12.5, fontWeight: 800, fontFamily: QS, cursor: canConfirm ? "pointer" : "default", boxShadow: canConfirm ? "0 4px 16px rgba(151,114,246,.3)" : "none" }}
            >
              Confirm Location
            </button>
          )}
        </div>
      )}

      {/* Check-in/out radius — only meaningful once the pin itself is confirmed (the purple
          circle above previews it live on the map). This is the only area a student's real
          check-in/check-out attempt will be accepted from. */}
      {isConfirmed && (
        <div style={{ marginTop: 10, borderRadius: 16, background: "#F9FAFB", padding: "12px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <p style={{ fontSize: 11.5, fontWeight: 800, color: "#374151", fontFamily: QS, margin: 0, display: "flex", alignItems: "center", gap: 5 }}>
              <MapPin size={12} /> Enter/Exit Radius
            </p>
            <span style={{ fontSize: 12, fontWeight: 800, color: "#9772F6", fontFamily: QS }}>{radiusMeters}m</span>
          </div>
          <input
            type="range"
            min={MIN_RADIUS}
            max={MAX_RADIUS}
            step={5}
            value={radiusMeters}
            onChange={e => onRadiusChange(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#9772F6", cursor: "pointer" }}
          />
          <p style={{ fontSize: 10.5, color: "#9CA3AF", fontFamily: IN, margin: "6px 0 0", lineHeight: 1.5 }}>
            Students can only enter or exit while within this distance of the pin — shown
            as the circle on the map above. Keep it tight enough to confirm they're actually on-site,
            but wide enough to allow for normal GPS drift.
          </p>
        </div>
      )}
    </div>
  );
}
