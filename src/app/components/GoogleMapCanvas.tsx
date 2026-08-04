import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { loadGoogleMaps } from "./googleMapsLoader";

export type MarkerVariant = "bh" | "selected" | "student" | "inside" | "outside" | "report";

export interface MapMarker {
  id: string;
  position: { lat: number; lng: number };
  variant: MarkerVariant;
  title?: string;
  infoContent?: React.ReactNode;
  onClick?: () => void;
  zIndex?: number;
}

export interface GoogleMapHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  recenter: () => void;
  panTo: (pos: { lat: number; lng: number }) => void;
  fitBounds: (positions: { lat: number; lng: number }[]) => void;
}

interface GoogleMapCanvasProps {
  center: { lat: number; lng: number };
  zoom: number;
  mapType: "standard" | "satellite";
  onZoomChange?: (zoom: number) => void;
  style?: React.CSSProperties;
  markers?: MapMarker[];
  draggableMarker?: { position: { lat: number; lng: number } };
  onMarkerDragEnd?: (result: { lat: number; lng: number; address: string }) => void;
  onMapClick?: (pos: { lat: number; lng: number }) => void;
  polyline?: { lat: number; lng: number }[];
  circle?: { center: { lat: number; lng: number }; radiusMeters: number; color?: string };
  enableClustering?: boolean;
}

// ── Custom DormiTrack pin icons (data-URI SVG, matches the app's gradient-pin look) ──

const HOME_PATH = "M12 3 L21 10 V20 A1 1 0 0 1 20 21 H15 V14 H9 V21 H4 A1 1 0 0 1 3 20 V10 Z";
const STAR_PATH = "M12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26Z";

function pinIconUrl(variant: MarkerVariant): { url: string; width: number; height: number; anchorX: number; anchorY: number } {
  const isPin = variant === "bh" || variant === "selected";
  const size = isPin ? 44 : variant === "student" ? 20 : 18; // circle diameter
  const height = isPin ? size + 10 : size; // pins get a tail below the circle
  const fill =
    variant === "bh" || variant === "selected" ? "url(#g)"
    : variant === "inside" ? "#16A34A"
    : variant === "outside" ? "#D97706"
    : variant === "report" ? "#EF4444"
    : "#3B82F6"; // student
  const glyphPath = variant === "bh" ? HOME_PATH : variant === "selected" ? STAR_PATH : null;
  const glyph = glyphPath
    ? `<g transform="translate(${size / 2 - size * 0.29} ${size / 2 - size * 0.29}) scale(${size * 0.024})"><path d="${glyphPath}" fill="white"/></g>`
    : "";
  const tail = isPin ? `<path d="M${size / 2 - 6} ${size - 3} L${size / 2 + 6} ${size - 3} L${size / 2} ${height} Z" fill="#7549F6"/>` : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${height}" viewBox="0 0 ${size} ${height}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#9772F6"/><stop offset="100%" stop-color="#7549F6"/></linearGradient></defs>
    ${tail}
    <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2.5}" fill="${fill}" stroke="white" stroke-width="2.5"/>
    ${glyph}
  </svg>`;
  // Pins anchor at the tail tip (bottom); flat dots anchor at their center.
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    width: size, height,
    anchorX: size / 2, anchorY: isPin ? height : size / 2,
  };
}

function offlineNow() {
  return typeof navigator !== "undefined" && "onLine" in navigator && !navigator.onLine;
}

export const GoogleMapCanvas = forwardRef<GoogleMapHandle, GoogleMapCanvasProps>(
  (
    { center, zoom, mapType, onZoomChange, style, markers, draggableMarker, onMarkerDragEnd, onMapClick, polyline, circle, enableClustering },
    ref,
  ) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<any>(null);
    const centerRef = useRef(center);
    centerRef.current = center;
    const [error, setError] = useState<string | null>(offlineNow() ? "offline" : null);
    const [tilesLoaded, setTilesLoaded] = useState(false);
    const [mapReady, setMapReady] = useState(false);

    const markerObjsRef = useRef<Map<string, any>>(new Map());
    const clustererRef = useRef<any>(null);
    const dragMarkerObjRef = useRef<any>(null);
    const polylineObjRef = useRef<any>(null);
    const circleObjRef = useRef<any>(null);
    const infoWindowRef = useRef<any>(null);
    const infoWindowDivRef = useRef<HTMLDivElement | null>(null);
    if (!infoWindowDivRef.current) infoWindowDivRef.current = document.createElement("div");
    const [activeMarker, setActiveMarker] = useState<MapMarker | null>(null);

    // ── Online/offline awareness ──────────────────────────────────────────────
    useEffect(() => {
      const goOffline = () => setError("offline");
      const goOnline = () => setError((e) => (e === "offline" ? null : e));
      window.addEventListener("offline", goOffline);
      window.addEventListener("online", goOnline);
      return () => {
        window.removeEventListener("offline", goOffline);
        window.removeEventListener("online", goOnline);
      };
    }, []);

    // ── Mount: load API + create map ──────────────────────────────────────────
    useEffect(() => {
      if (offlineNow()) return;
      let cancelled = false;
      loadGoogleMaps()
        .then((g) => {
          if (cancelled || !containerRef.current) return;
          const map = new g.maps.Map(containerRef.current, {
            center,
            zoom,
            mapTypeId: mapType === "satellite" ? "satellite" : "roadmap",
            disableDefaultUI: true,
            gestureHandling: "greedy",
            clickableIcons: false,
            rotateControl: true,
          });
          mapRef.current = map;
          infoWindowRef.current = new g.maps.InfoWindow({ content: infoWindowDivRef.current });
          infoWindowRef.current.addListener("closeclick", () => setActiveMarker(null));
          g.maps.event.addListenerOnce(map, "tilesloaded", () => setTilesLoaded(true));
          if (onZoomChange) map.addListener("zoom_changed", () => onZoomChange(map.getZoom()));
          setMapReady(true);
        })
        .catch((err) => {
          console.error(err);
          if (!cancelled) setError(err.message || "Failed to load map");
        });
      return () => {
        cancelled = true;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
      if (mapRef.current) mapRef.current.setMapTypeId(mapType === "satellite" ? "satellite" : "roadmap");
    }, [mapType]);

    useEffect(() => {
      if (mapRef.current && mapRef.current.getZoom() !== zoom) mapRef.current.setZoom(zoom);
    }, [zoom]);

    // ── Map click ────────────────────────────────────────────────────────────
    useEffect(() => {
      if (!mapReady || !mapRef.current || !onMapClick) return;
      const g = (window as any).google;
      const listener = mapRef.current.addListener("click", (e: any) => {
        onMapClick({ lat: e.latLng.lat(), lng: e.latLng.lng() });
      });
      return () => g?.maps.event.removeListener(listener);
    }, [mapReady, onMapClick]);

    // ── Markers (+ optional clustering) ─────────────────────────────────────────
    const markersKey = useMemo(
      () => (markers ?? []).map((m) => `${m.id}:${m.position.lat}:${m.position.lng}:${m.variant}`).join("|"),
      [markers],
    );
    useEffect(() => {
      if (!mapReady) return;
      let cancelled = false;
      const g = (window as any).google;
      const map = mapRef.current;

      markerObjsRef.current.forEach((m) => m.setMap(null));
      markerObjsRef.current.clear();
      if (clustererRef.current) {
        clustererRef.current.clearMarkers();
        clustererRef.current = null;
      }

      const bhMarkerObjs: any[] = [];
      (markers ?? []).forEach((m) => {
        const icon = pinIconUrl(m.variant);
        const marker = new g.maps.Marker({
          position: m.position,
          map: enableClustering && m.variant === "bh" ? null : map,
          title: m.title,
          zIndex: m.zIndex,
          icon: {
            url: icon.url,
            scaledSize: new g.maps.Size(icon.width, icon.height),
            anchor: new g.maps.Point(icon.anchorX, icon.anchorY),
          },
        });
        marker.addListener("click", () => {
          m.onClick?.();
          if (m.infoContent) {
            setActiveMarker(m);
            infoWindowRef.current.setPosition(m.position);
            infoWindowRef.current.open(map);
          }
        });
        markerObjsRef.current.set(m.id, marker);
        if (m.variant === "bh") bhMarkerObjs.push(marker);
      });

      if (enableClustering && bhMarkerObjs.length > 0) {
        import("@googlemaps/markerclusterer").then(({ MarkerClusterer }) => {
          if (cancelled) return; // a newer markers update superseded this one
          clustererRef.current = new MarkerClusterer({ map, markers: bhMarkerObjs });
        });
      }
      return () => {
        cancelled = true;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mapReady, markersKey, enableClustering]);

    // ── Draggable picker marker ──────────────────────────────────────────────
    useEffect(() => {
      if (!mapReady) return;
      const g = (window as any).google;
      const map = mapRef.current;
      if (!draggableMarker) {
        dragMarkerObjRef.current?.setMap(null);
        dragMarkerObjRef.current = null;
        return;
      }
      if (!dragMarkerObjRef.current) {
        const icon = pinIconUrl("selected");
        dragMarkerObjRef.current = new g.maps.Marker({
          position: draggableMarker.position,
          map,
          draggable: true,
          icon: { url: icon.url, scaledSize: new g.maps.Size(icon.width, icon.height), anchor: new g.maps.Point(icon.anchorX, icon.anchorY) },
        });
        dragMarkerObjRef.current.addListener("dragend", () => {
          const pos = dragMarkerObjRef.current.getPosition();
          const lat = pos.lat(), lng = pos.lng();
          new g.maps.Geocoder().geocode({ location: { lat, lng } }, (results: any[], status: string) => {
            const address = status === "OK" && results?.[0] ? results[0].formatted_address : "";
            onMarkerDragEnd?.({ lat, lng, address });
          });
        });
      } else {
        dragMarkerObjRef.current.setPosition(draggableMarker.position);
      }
    }, [mapReady, draggableMarker, onMarkerDragEnd]);

    // ── Polyline ─────────────────────────────────────────────────────────────
    useEffect(() => {
      if (!mapReady) return;
      const g = (window as any).google;
      polylineObjRef.current?.setMap(null);
      polylineObjRef.current = null;
      if (polyline && polyline.length > 1) {
        polylineObjRef.current = new g.maps.Polyline({
          path: polyline,
          map: mapRef.current,
          strokeColor: "#9772F6",
          strokeOpacity: 0,
          icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 3 }, offset: "0", repeat: "14px" }],
        });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mapReady, JSON.stringify(polyline)]);

    // ── Circle (radius / accuracy ring) ─────────────────────────────────────
    useEffect(() => {
      if (!mapReady) return;
      const g = (window as any).google;
      circleObjRef.current?.setMap(null);
      circleObjRef.current = null;
      if (circle) {
        const color = circle.color ?? "#9772F6";
        circleObjRef.current = new g.maps.Circle({
          map: mapRef.current,
          center: circle.center,
          radius: circle.radiusMeters,
          strokeColor: color,
          strokeOpacity: 0.8,
          strokeWeight: 1.5,
          fillColor: color,
          fillOpacity: 0.08,
        });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mapReady, circle?.center.lat, circle?.center.lng, circle?.radiusMeters, circle?.color]);

    useImperativeHandle(ref, () => ({
      zoomIn: () => mapRef.current?.setZoom((mapRef.current.getZoom() ?? zoom) + 1),
      zoomOut: () => mapRef.current?.setZoom((mapRef.current.getZoom() ?? zoom) - 1),
      recenter: () => mapRef.current?.panTo(centerRef.current),
      panTo: (pos) => mapRef.current?.panTo(pos),
      fitBounds: (positions) => {
        const g = (window as any).google;
        if (!g || !mapRef.current || positions.length === 0) return;
        const bounds = new g.maps.LatLngBounds();
        positions.forEach((p) => bounds.extend(p));
        mapRef.current.fitBounds(bounds, 48);
      },
    }));

    const isOffline = error === "offline";

    return (
      <div style={{ position: "absolute", inset: 0, ...style }}>
        <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />
        {activeMarker && createPortal(activeMarker.infoContent, infoWindowDivRef.current)}

        {!isOffline && error && (
          <div style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
            background: "#F3F4F6", color: "#6B7280", fontSize: 12, fontFamily: "'Inter',sans-serif", textAlign: "center", padding: 24,
          }}>
            Map failed to load: {error}
          </div>
        )}

        {isOffline && (
          <div style={{
            position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: 8, background: "#F3F4F6", color: "#6B7280", fontSize: 12, fontFamily: "'Inter',sans-serif", textAlign: "center", padding: 24,
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "'Quicksand',sans-serif", color: "#374151" }}>You're offline</div>
            <div>Map tiles require an internet connection. Reconnect to continue.</div>
          </div>
        )}

        {!error && !tilesLoaded && (
          <div style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
            background: "#F3F4F6", zIndex: 5,
          }}>
            <style>{`@keyframes dtSpin{to{transform:rotate(360deg)}}`}</style>
            <div style={{
              width: 34, height: 34, borderRadius: "50%",
              border: "3px solid rgba(151,114,246,.25)", borderTopColor: "#9772F6",
              animation: "dtSpin .8s linear infinite",
            }} />
          </div>
        )}
      </div>
    );
  },
);
GoogleMapCanvas.displayName = "GoogleMapCanvas";

// ── Reusable info-window content card (rendered via React portal) ──────────

export function MapInfoCard({ title, subtitle, rows }: { title: string; subtitle?: string; rows: [string, string][] }) {
  return (
    <div style={{ minWidth: 200, maxWidth: 240, fontFamily: "'Inter',sans-serif", padding: 2 }}>
      <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 800, color: "#1F2937", fontFamily: "'Quicksand',sans-serif" }}>{title}</p>
      {subtitle && <p style={{ margin: "0 0 8px", fontSize: 11, color: "#9CA3AF" }}>{subtitle}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: subtitle ? 0 : 8 }}>
        {rows.map(([k, v]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <span style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700 }}>{k}</span>
            <span style={{ fontSize: 11, color: "#1F2937", fontWeight: 700, textAlign: "right" }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
