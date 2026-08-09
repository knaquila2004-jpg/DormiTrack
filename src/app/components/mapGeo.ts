import { loadGoogleMaps } from "./googleMapsLoader";
import { extractAddressComponents, extractAddressComponentsFromNominatim, AddressComponents } from "./phAddress";

export type { AddressComponents } from "./phAddress";

export interface ReverseGeocodeResult {
  address: string;              // the geocoding service's own formatted address ("" when nothing was
                                 // found or the call failed) — this is the source of truth for display,
                                 // never a reconstruction from individual components.
  components: AddressComponents; // structured pieces (street/Purok/Sitio/Barangay/municipality/province/
                                  // postal code/country), for separate storage — only fields the service
                                  // actually returned; nothing here is invented.
  status: string;  // "OK", "ZERO_RESULTS", "REQUEST_DENIED", "OVER_QUERY_LIMIT", etc.
}

async function googleReverseGeocode(pos: { lat: number; lng: number }): Promise<ReverseGeocodeResult> {
  try {
    const g = await loadGoogleMaps();
    return await new Promise<ReverseGeocodeResult>((resolve) => {
      new g.maps.Geocoder().geocode({ location: pos }, (results: any[], status: string) => {
        if (status !== "OK") {
          // Surface the real reason in the console — a silent "" here is why address
          // detection can look broken with no clue why (e.g. Geocoding API not enabled
          // for the key, billing not set up, referrer restrictions, quota, etc.)
          console.warn(`[reverseGeocode] Google Geocoder status "${status}" for`, pos);
          resolve({ address: "", components: {}, status });
          return;
        }
        if (!results || results.length === 0) {
          resolve({ address: "", components: {}, status: "ZERO_RESULTS" });
          return;
        }
        // Google orders results from most specific (rooftop/street address) to least
        // (broad region) — the first result's formatted_address is the closest thing
        // to "what Google Maps itself would show" for this exact point, so it's used
        // as-is rather than rebuilt from parts.
        const address = results[0].formatted_address || "";
        // Merge every result's address_components — in order, so the most specific
        // result's components win ties — to maximize the chance of finding
        // Purok/Sitio/Barangay wherever Google's data has them, for separate storage.
        const seen = new Set<string>();
        const merged = results.flatMap((r) => r.address_components ?? []).filter((c: any) => {
          const key = `${c.long_name}|${c.types.join(",")}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        const components = extractAddressComponents(merged);
        if (!address) {
          console.warn("[reverseGeocode] Google returned results but no formatted_address for", pos, results);
          resolve({ address: "", components, status: "ZERO_RESULTS" });
          return;
        }
        resolve({ address, components, status: "OK" });
      });
    });
  } catch (err) {
    console.warn("[reverseGeocode] failed to load Google Maps:", err);
    return { address: "", components: {}, status: "LOAD_FAILED" };
  }
}

// Free, no-API-key reverse geocoder used as a fallback when Google's Geocoding API is
// blocked (billing not enabled on the project, quota exceeded, etc.) — so address
// auto-fill keeps working even before that Google Cloud config gets sorted out.
// Nominatim's usage policy asks for light traffic (~1 req/sec) and an identifying
// Referer, which the browser already sends; fine for this app's usage, but a
// production deployment at real scale should proxy this through a backend instead.
async function nominatimReverseGeocode(pos: { lat: number; lng: number }): Promise<ReverseGeocodeResult> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${pos.lat}&lon=${pos.lng}&zoom=18&addressdetails=1&accept-language=en`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) {
      console.warn(`[reverseGeocode] Nominatim HTTP ${res.status}`);
      return { address: "", components: {}, status: "SERVICE_ERROR" };
    }
    const data = await res.json();
    if (data?.error || !data?.address) {
      return { address: "", components: {}, status: "ZERO_RESULTS" };
    }
    // Nominatim's own `display_name` is its equivalent of Google's formatted_address —
    // the full, natural location overview for this exact point. Used as-is.
    const address: string = data.display_name || "";
    const components = extractAddressComponentsFromNominatim(data.address);
    if (!address) {
      console.warn("[reverseGeocode] Nominatim returned a result but no display_name for", pos, data);
      return { address: "", components, status: "ZERO_RESULTS" };
    }
    return { address, components, status: "OK" };
  } catch (err) {
    console.warn("[reverseGeocode] Nominatim request failed:", err);
    return { address: "", components: {}, status: "SERVICE_ERROR" };
  }
}

/**
 * Reverse-geocodes a lat/lng into the geocoding service's own formatted address —
 * the same "location overview" Google Maps itself would show for that exact
 * point — plus the individual address components (Purok/Sitio/Barangay/
 * municipality/province/postal code/...) for separate storage. Tries Google's
 * Geocoding API first; if that's blocked for any reason (billing not enabled,
 * quota, load failure, ...) it automatically retries with OpenStreetMap's free
 * Nominatim service so address auto-fill still works. Never rejects — callers
 * get `status` back so they can tell "no usable address exists here" (both
 * sources agreed: ZERO_RESULTS — moving the pin can fix that) apart from "the
 * lookup itself is unavailable" (moving the pin won't fix that).
 */
export async function reverseGeocode(pos: { lat: number; lng: number }): Promise<ReverseGeocodeResult> {
  const primary = await googleReverseGeocode(pos);
  if (primary.status === "OK") return primary;

  console.warn(`[reverseGeocode] Falling back to Nominatim after Google status "${primary.status}"`);
  const fallback = await nominatimReverseGeocode(pos);
  if (fallback.status === "OK") return fallback;

  // Both sources came back empty. If they agree there's genuinely nothing here, say so;
  // otherwise at least one failure was a service/config problem, not a "no data" one.
  if (primary.status === "ZERO_RESULTS" && fallback.status === "ZERO_RESULTS") {
    return { address: "", components: {}, status: "ZERO_RESULTS" };
  }
  return { address: "", components: {}, status: "SERVICE_UNAVAILABLE" };
}

export interface RouteResult {
  path: { lat: number; lng: number }[];
  distanceMeters: number;
  distanceText: string;
  durationText: string;
  approx: boolean; // true when this is a straight-line fallback, not a real routed path
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} km`;
}

const WALK_METERS_PER_MIN = 80; // matches the pace already assumed elsewhere in the app

function straightLineFallback(origin: { lat: number; lng: number }, destination: { lat: number; lng: number }): RouteResult {
  const g = (window as any).google;
  const distanceMeters = g?.maps?.geometry?.spherical
    ? g.maps.geometry.spherical.computeDistanceBetween(
        new g.maps.LatLng(origin.lat, origin.lng),
        new g.maps.LatLng(destination.lat, destination.lng),
      )
    : haversineMeters(origin, destination);
  const mins = Math.max(1, Math.round(distanceMeters / WALK_METERS_PER_MIN));
  return {
    path: [origin, destination],
    distanceMeters,
    distanceText: `~${formatDistance(distanceMeters)}`,
    durationText: `~${mins} min`,
    approx: true,
  };
}

function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/**
 * Real walking route + distance + ETA via DirectionsService, with a graceful
 * straight-line fallback (flagged via `approx: true`) if the Directions API
 * isn't enabled for the configured key.
 */
export function computeWalkingRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
): Promise<RouteResult> {
  const g = (window as any).google;
  if (!g?.maps) return Promise.resolve(straightLineFallback(origin, destination));

  return new Promise((resolve) => {
    const service = new g.maps.DirectionsService();
    service.route(
      {
        origin,
        destination,
        travelMode: g.maps.TravelMode.WALKING,
      },
      (result: any, status: string) => {
        if (status !== "OK" || !result?.routes?.[0]?.legs?.[0]) {
          resolve(straightLineFallback(origin, destination));
          return;
        }
        const leg = result.routes[0].legs[0];
        const path = result.routes[0].overview_path.map((p: any) => ({ lat: p.lat(), lng: p.lng() }));
        resolve({
          path,
          distanceMeters: leg.distance?.value ?? haversineMeters(origin, destination),
          distanceText: leg.distance?.text ?? formatDistance(haversineMeters(origin, destination)),
          durationText: leg.duration?.text ?? "—",
          approx: false,
        });
      },
    );
  });
}
