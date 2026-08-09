import React, { useEffect, useRef } from "react";
import { loadGoogleMaps } from "./googleMapsLoader";
import { MAP_CENTER } from "../shared";
import { extractAddressComponents, AddressComponents } from "./phAddress";

export interface AutocompletePlace {
  lat: number; lng: number; address: string; components: AddressComponents;
  placeId?: string; name?: string;
  phone?: string; website?: string; rating?: number; userRatingsTotal?: number; openNow?: boolean;
}

interface PlacesAutocompleteInputProps {
  value: string;
  onChangeText: (v: string) => void;
  onPlaceSelected: (place: AutocompletePlace) => void;
  placeholder?: string;
  style?: React.CSSProperties;
}

export function PlacesAutocompleteInput({ value, onChangeText, onPlaceSelected, placeholder, style }: PlacesAutocompleteInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    let autocompleteInstance: any = null;
    let pacContainer: HTMLElement | null = null;

    loadGoogleMaps().then((g) => {
      if (cancelled || !inputRef.current || !g.maps.places) return;
      const containersBefore = new Set(document.querySelectorAll(".pac-container"));
      const autocomplete = new g.maps.places.Autocomplete(inputRef.current, {
        fields: [
          "place_id", "geometry", "formatted_address", "name", "address_components",
          "formatted_phone_number", "website", "rating", "user_ratings_total", "opening_hours",
        ],
        componentRestrictions: { country: "ph" },
      });
      autocomplete.setBounds(
        new g.maps.LatLngBounds(
          { lat: MAP_CENTER.lat - 0.5, lng: MAP_CENTER.lng - 0.5 },
          { lat: MAP_CENTER.lat + 0.5, lng: MAP_CENTER.lng + 0.5 },
        ),
      );
      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        const loc = place?.geometry?.location;
        if (!loc) return;
        // Places' own formatted_address is already an official location overview —
        // used as-is, same as the reverse-geocoded pin flow (never rebuilt from parts).
        const address = place.formatted_address || place.name || "";
        const components = extractAddressComponents(place.address_components ?? []);
        onChangeText(address);
        onPlaceSelected({
          lat: loc.lat(), lng: loc.lng(), address, components,
          placeId: place.place_id || undefined,
          name: place.name || undefined,
          phone: place.formatted_phone_number || undefined,
          website: place.website || undefined,
          rating: typeof place.rating === "number" ? place.rating : undefined,
          userRatingsTotal: typeof place.user_ratings_total === "number" ? place.user_ratings_total : undefined,
          openNow: typeof place.opening_hours?.isOpen === "function" ? place.opening_hours.isOpen() : undefined,
        });
      });
      autocompleteRef.current = autocomplete;
      autocompleteInstance = autocomplete;
      // Google appends a `.pac-container` dropdown straight onto <body> for this input — completely
      // outside React's tree, so nothing ever unmounts it automatically. Left behind after this
      // component unmounts (e.g. leaving this step of the wizard, or "Change Location" swapping the
      // search bar out), it's an orphaned node that can sit at its last position and linger visibly
      // over whatever screen comes next — including any stale Google error state it was showing.
      // Track whichever container is new since we last checked so it can be torn down on unmount.
      for (const el of Array.from(document.querySelectorAll(".pac-container"))) {
        if (!containersBefore.has(el)) { pacContainer = el as HTMLElement; break; }
      }
    });
    return () => {
      cancelled = true;
      if (autocompleteInstance) {
        (window as any).google?.maps?.event?.clearInstanceListeners(autocompleteInstance);
      }
      pacContainer?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={(e) => onChangeText(e.target.value)}
      placeholder={placeholder ?? "Search for an address…"}
      style={{
        width: "100%", boxSizing: "border-box", padding: "13px 14px",
        borderRadius: 14, border: "1.5px solid #E5E7EB",
        background: "#F9FAFB", color: "#1F2937", fontSize: 14,
        fontFamily: "'Inter',sans-serif", outline: "none",
        ...style,
      }}
    />
  );
}
