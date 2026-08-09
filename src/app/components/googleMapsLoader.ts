let loadPromise: Promise<any> | null = null;

export function loadGoogleMaps(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if ((window as any).google?.maps) return Promise.resolve((window as any).google);
  if (loadPromise) return loadPromise;

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  if (!apiKey) return Promise.reject(new Error("Missing VITE_GOOGLE_MAPS_API_KEY"));

  loadPromise = new Promise((resolve, reject) => {
    const callbackName = "__dormitrackGoogleMapsCallback";
    let settled = false;

    // Google calls this global (if defined) instead of just throwing when the API key itself is
    // invalid, unauthorized for this domain, or the project has no billing enabled — without it,
    // Google shows its own native "This page can't load Google Maps correctly" alert and/or a
    // degraded watermarked map, entirely outside our control (we can't style or reliably clean up
    // whatever it leaves behind). Catching this here turns that into a normal rejected promise so
    // callers can show their own clear, contained error state instead.
    (window as any).gm_authFailure = () => {
      if (settled) return;
      settled = true;
      loadPromise = null;
      delete (window as any)[callbackName];
      delete (window as any).gm_authFailure;
      reject(new Error("Google Maps API key is invalid, unauthorized for this domain, or the project has no billing enabled — check the Google Cloud Console for this key."));
    };

    (window as any)[callbackName] = () => {
      if (settled) return;
      settled = true;
      delete (window as any).gm_authFailure;
      resolve((window as any).google);
      delete (window as any)[callbackName];
    };
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&callback=${callbackName}&loading=async`;
    script.async = true;
    script.onerror = () => {
      if (settled) return;
      settled = true;
      loadPromise = null;
      reject(new Error("Failed to load Google Maps JS API"));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}
