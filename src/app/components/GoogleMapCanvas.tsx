import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { loadGoogleMaps } from "./googleMapsLoader";
import { AddressComponents } from "./mapGeo";
import { extractAddressComponents } from "./phAddress";

export type MarkerVariant = "bh" | "selected" | "place" | "student" | "inside" | "outside" | "report";

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
  draggableMarker?: { position: { lat: number; lng: number }; variant?: MarkerVariant; draggable?: boolean };
  /** Fired with the marker's raw new position when dragged — no reverse geocoding happens here;
   *  the caller decides whether/how to resolve an address for the new position. */
  onMarkerDragEnd?: (pos: { lat: number; lng: number }) => void;
  onMapClick?: (pos: { lat: number; lng: number }) => void;
  /** When true, Google's own place-of-interest icons on the base map become clickable, so tapping one
   *  directly carries a placeId (the click event itself tells us a POI was hit — no separate search
   *  needed). Google's own default info window for that click is suppressed (event.stop()); its
   *  details are then fetched ourselves and handed to onPoiClick so our own UI drives the popup.
   *  Defaults to false everywhere else, where every tap goes straight to onMapClick as before. */
  clickablePois?: boolean;
  /** Fired instead of onMapClick when the landlord taps one of Google's own existing place icons
   *  (only possible when clickablePois is true) — resolved via the Places Details API. Extra fields
   *  (phone/website/rating/openNow) are included only when Google actually returned them. */
  onPoiClick?: (result: {
    placeId: string; name: string; address: string; components: AddressComponents; lat: number; lng: number;
    phone?: string; website?: string; rating?: number; userRatingsTotal?: number; openNow?: boolean;
  }) => void;
  /** Fired synchronously the instant a POI tap is recognized, before the async Places Details lookup
   *  resolves — lets the caller show a "detecting..." state immediately instead of the tap looking dead. */
  onPoiClickStart?: () => void;
  /** Fired when a POI tap was recognized but its details could not be resolved at all (Places API
   *  not enabled/authorized, quota, timeout, ...) — the tap still falls back to onMapClick so a pin
   *  gets placed regardless, but this lets the caller also surface a visible explanation. */
  onPoiClickFailed?: () => void;
  /** A floating info card anchored to a map position — e.g. the existing-place popup shown after a
   *  successful onPoiClick. Rendered as a real Google InfoWindow (so it auto-repositions to stay on
   *  screen, matches native map popup styling, and gets its own close button for free). Pass null/
   *  undefined to close it. */
  infoWindow?: { position: { lat: number; lng: number }; content: React.ReactNode } | null;
  /** Fired when the landlord dismisses infoWindow via its own close (×) button. */
  onInfoWindowClose?: () => void;
  polyline?: { lat: number; lng: number }[];
  circle?: { center: { lat: number; lng: number }; radiusMeters: number; color?: string };
  enableClustering?: boolean;
}

// ── Custom DormiTrack pin icons (data-URI SVG, matches the app's gradient-pin look) ──

const HOME_PATH = "M12 3 L21 10 V20 A1 1 0 0 1 20 21 H15 V14 H9 V21 H4 A1 1 0 0 1 3 20 V10 Z";
const STAR_PATH = "M12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26Z";

function pinIconUrl(variant: MarkerVariant): { url: string; width: number; height: number; anchorX: number; anchorY: number } {
  const isPin = variant === "bh" || variant === "selected" || variant === "place";
  const size = isPin ? 44 : variant === "student" ? 20 : 18; // circle diameter
  const height = isPin ? size + 10 : size; // pins get a tail below the circle
  const fill =
    variant === "bh" || variant === "selected" || variant === "place" ? "url(#g)"
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

// Races a promise against a plain timeout so a Google API call that never invokes its callback at all
// (a silent hang, as opposed to a thrown error) can't leave a map tap looking permanently unresponsive.
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise.then((v) => { clearTimeout(timer); resolve(v); }, () => { clearTimeout(timer); resolve(fallback); });
  });
}

interface PlaceDetails {
  name: string; address: string; components: AddressComponents; lat: number; lng: number;
  phone?: string; website?: string; rating?: number; userRatingsTotal?: number; openNow?: boolean;
}

// Looks up a tapped POI's details via the classic PlacesService first (works on projects with the
// legacy "Places API" enabled), and — only if that fails — retries via the newer google.maps.places.Place
// class (works on projects that instead only have "Places API (New)" enabled). Cloud projects commonly
// have just one of the two enabled, so trying both here is what makes an existing-place tap reliably
// resolve to that place's own info instead of silently failing (and looking like a dead click, or worse,
// getting misread as "no existing place here" and downgraded to a custom pin).
function fetchPlaceDetails(g: any, map: any, placeId: string): Promise<PlaceDetails | null> {
  return new Promise((resolve) => {
    const fallbackToNewApi = () => {
      fetchPlaceDetailsViaNewApi(g, placeId)
        .then(resolve)
        .catch((err) => {
          console.warn("[GoogleMapCanvas] New Places API lookup also failed for placeId", placeId, err);
          resolve(null);
        });
    };
    try {
      new g.maps.places.PlacesService(map).getDetails(
        {
          placeId,
          fields: [
            "name", "formatted_address", "geometry", "address_components",
            "formatted_phone_number", "website", "rating", "user_ratings_total", "opening_hours",
          ],
        },
        (place: any, status: string) => {
          const loc = place?.geometry?.location;
          if (status === "OK" && loc) {
            resolve({
              name: place.name || place.formatted_address || "Selected Place",
              address: place.formatted_address || "",
              components: extractAddressComponents(place.address_components ?? []),
              lat: loc.lat(),
              lng: loc.lng(),
              phone: place.formatted_phone_number || undefined,
              website: place.website || undefined,
              rating: typeof place.rating === "number" ? place.rating : undefined,
              userRatingsTotal: typeof place.user_ratings_total === "number" ? place.user_ratings_total : undefined,
              openNow: typeof place.opening_hours?.isOpen === "function" ? place.opening_hours.isOpen() : undefined,
            });
            return;
          }
          console.warn(`[GoogleMapCanvas] Legacy PlacesService.getDetails failed with status "${status}" for placeId`, placeId, "— trying the new Places API...");
          fallbackToNewApi();
        },
      );
    } catch (err) {
      console.warn("[GoogleMapCanvas] Legacy PlacesService.getDetails call threw synchronously for placeId", placeId, err, "— trying the new Places API...");
      fallbackToNewApi();
    }
  });
}

async function fetchPlaceDetailsViaNewApi(g: any, placeId: string): Promise<PlaceDetails | null> {
  if (typeof g.maps.importLibrary !== "function") return null;
  const { Place } = await g.maps.importLibrary("places");
  const place = new Place({ id: placeId });
  await place.fetchFields({
    fields: ["displayName", "formattedAddress", "location", "addressComponents", "internationalPhoneNumber", "websiteURI", "rating", "userRatingCount"],
  });
  if (!place.location) return null;
  const components = (place.addressComponents ?? []).map((c: any) => ({ long_name: c.longText, short_name: c.shortText, types: c.types ?? [] }));
  let openNow: boolean | undefined;
  try {
    openNow = typeof place.isOpen === "function" ? await place.isOpen() : undefined;
  } catch {
    openNow = undefined; // isOpen() throws when a place has no opening-hours data — that's fine, just omit it
  }
  return {
    name: place.displayName || place.formattedAddress || "Selected Place",
    address: place.formattedAddress || "",
    components: extractAddressComponents(components),
    lat: place.location.lat(),
    lng: place.location.lng(),
    phone: place.internationalPhoneNumber || undefined,
    website: place.websiteURI || undefined,
    rating: typeof place.rating === "number" ? place.rating : undefined,
    userRatingsTotal: typeof place.userRatingCount === "number" ? place.userRatingCount : undefined,
    openNow,
  };
}

export const GoogleMapCanvas = forwardRef<GoogleMapHandle, GoogleMapCanvasProps>(
  (
    { center, zoom, mapType, onZoomChange, style, markers, draggableMarker, onMarkerDragEnd, onMapClick, clickablePois, onPoiClick, onPoiClickStart, onPoiClickFailed, infoWindow, onInfoWindowClose, polyline, circle, enableClustering },
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

    // A second, independent InfoWindow just for the `infoWindow` prop (e.g. the existing-place popup) —
    // kept separate from the marker-click InfoWindow above so the two never fight over the same window.
    const pinnedInfoWindowRef = useRef<any>(null);
    const pinnedInfoDivRef = useRef<HTMLDivElement | null>(null);
    if (!pinnedInfoDivRef.current) pinnedInfoDivRef.current = document.createElement("div");
    const onInfoWindowCloseRef = useRef(onInfoWindowClose);
    onInfoWindowCloseRef.current = onInfoWindowClose;

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
            clickableIcons: !!clickablePois,
            rotateControl: true,
          });
          mapRef.current = map;
          infoWindowRef.current = new g.maps.InfoWindow({ content: infoWindowDivRef.current });
          infoWindowRef.current.addListener("closeclick", () => setActiveMarker(null));
          pinnedInfoWindowRef.current = new g.maps.InfoWindow({ content: pinnedInfoDivRef.current });
          pinnedInfoWindowRef.current.addListener("closeclick", () => onInfoWindowCloseRef.current?.());
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
      if (mapRef.current) mapRef.current.setOptions({ clickableIcons: !!clickablePois });
    }, [clickablePois]);

    useEffect(() => {
      if (mapRef.current && mapRef.current.getZoom() !== zoom) mapRef.current.setZoom(zoom);
    }, [zoom]);

    // ── Floating info popup anchored to a map position (e.g. the existing-place popup) ─────
    useEffect(() => {
      if (!mapReady || !pinnedInfoWindowRef.current) return;
      if (infoWindow) {
        pinnedInfoWindowRef.current.setPosition(infoWindow.position);
        pinnedInfoWindowRef.current.open(mapRef.current);
      } else {
        pinnedInfoWindowRef.current.close();
      }
    }, [mapReady, infoWindow?.position.lat, infoWindow?.position.lng, !!infoWindow]);

    // ── Map click: an existing-marker tap carries a placeId directly (clickablePois on) — that always
    //    takes priority over treating the tap as an empty-map click. ──────────────────────────────
    useEffect(() => {
      if (!mapReady || !mapRef.current || (!onMapClick && !onPoiClick)) return;
      const g = (window as any).google;
      const map = mapRef.current;
      const listener = map.addListener("click", (e: any) => {
        const clickPos = e.latLng ? { lat: e.latLng.lat(), lng: e.latLng.lng() } : null;
        if (!clickPos) return;

        // Google marks a click on one of its own POI icons with a placeId — that's the single
        // signal that decides existing-place vs. empty-map-click. Only reachable when clickablePois
        // is on, since that's what makes those icons register clicks at all.
        if (e.placeId && onPoiClick) {
          e.stop?.(); // suppress Google's own default info window — our own UI drives the popup instead
          onPoiClickStart?.();
          withTimeout(fetchPlaceDetails(g, map, e.placeId), 6000, null).then((details) => {
            if (details) {
              onPoiClick({ placeId: e.placeId, ...details });
              return;
            }
            // The tap hit a real existing place, but its details couldn't be resolved (Places API
            // not enabled/authorized, quota, timed out, ...). Don't leave the tap looking dead —
            // fall back to a plain tap, and let the caller surface that this specific lookup failed.
            console.warn("[GoogleMapCanvas] Found an existing place but could not resolve its details, placeId", e.placeId, "— falling back to a plain map tap.");
            // Fire onMapClick first, then onPoiClickFailed — both land in the same React state-update
            // batch, so whichever fires last "wins" if a caller's handlers both touch the same status
            // state. onPoiClickFailed should win here so the failure explanation isn't silently
            // overwritten by the plain-tap handler's own "reset status" side effect.
            onMapClick?.(clickPos);
            onPoiClickFailed?.();
          });
          return;
        }

        onMapClick?.(clickPos);
      });
      return () => g?.maps.event.removeListener(listener);
    }, [mapReady, onMapClick, onPoiClick, onPoiClickStart, onPoiClickFailed]);

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
      const icon = pinIconUrl(draggableMarker.variant ?? "selected");
      const draggable = draggableMarker.draggable !== false;
      if (!dragMarkerObjRef.current) {
        dragMarkerObjRef.current = new g.maps.Marker({
          position: draggableMarker.position,
          map,
          draggable,
          icon: { url: icon.url, scaledSize: new g.maps.Size(icon.width, icon.height), anchor: new g.maps.Point(icon.anchorX, icon.anchorY) },
        });
        dragMarkerObjRef.current.addListener("dragend", () => {
          const pos = dragMarkerObjRef.current.getPosition();
          onMarkerDragEnd?.({ lat: pos.lat(), lng: pos.lng() });
        });
      } else {
        dragMarkerObjRef.current.setPosition(draggableMarker.position);
        dragMarkerObjRef.current.setDraggable(draggable);
        dragMarkerObjRef.current.setIcon({ url: icon.url, scaledSize: new g.maps.Size(icon.width, icon.height), anchor: new g.maps.Point(icon.anchorX, icon.anchorY) });
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
        {infoWindow && createPortal(infoWindow.content, pinnedInfoDivRef.current)}

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
