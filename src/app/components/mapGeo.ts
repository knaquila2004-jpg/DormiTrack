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
