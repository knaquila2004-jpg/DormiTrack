import React, { useEffect, useRef } from "react";
import { loadGoogleMaps } from "./googleMapsLoader";
import { MAP_CENTER } from "../shared";

interface PlacesAutocompleteInputProps {
  value: string;
  onChangeText: (v: string) => void;
  onPlaceSelected: (place: { lat: number; lng: number; address: string }) => void;
  placeholder?: string;
  style?: React.CSSProperties;
}

export function PlacesAutocompleteInput({ value, onChangeText, onPlaceSelected, placeholder, style }: PlacesAutocompleteInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps().then((g) => {
      if (cancelled || !inputRef.current || !g.maps.places) return;
      const autocomplete = new g.maps.places.Autocomplete(inputRef.current, {
        fields: ["geometry", "formatted_address", "name"],
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
        const address = place.formatted_address || place.name || "";
        onChangeText(address);
        onPlaceSelected({ lat: loc.lat(), lng: loc.lng(), address });
      });
      autocompleteRef.current = autocomplete;
    });
    return () => {
      cancelled = true;
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
