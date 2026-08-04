import { useCallback, useState } from "react";

export interface GeoPosition {
  lat: number;
  lng: number;
  accuracyMeters: number;
}

export interface GeoErrorState {
  code: number; // matches GeolocationPositionError.code (1=denied, 2=unavailable, 3=timeout)
  message: string;
}

export function useGeolocation() {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [error, setError] = useState<GeoErrorState | null>(null);
  const [loading, setLoading] = useState(false);

  const requestLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setError({ code: 2, message: "Geolocation is not supported on this device." });
      return;
    }
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracyMeters: pos.coords.accuracy });
        setLoading(false);
      },
      (err) => {
        const messages: Record<number, string> = {
          1: "Location access is turned off. Enable it in your browser/device settings to use this feature.",
          2: "Your location couldn't be determined right now.",
          3: "Locating you took too long. Please try again.",
        };
        setError({ code: err.code, message: messages[err.code] ?? "Unable to get your location." });
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  }, []);

  return { position, error, loading, requestLocation };
}
