// ── Philippine address components ───────────────────────────────────────────
//
// The Boarding House Address text field is always populated from the geocoding
// service's own formatted address (Google's `formatted_address`, or Nominatim's
// `display_name`) — see mapGeo.ts. That formatted string is the source of truth
// for what's displayed; it is never rebuilt from individual components here.
//
// What this module DOES do is pull the individual pieces (Purok, Sitio,
// Barangay, Municipality/City, Province, Postal Code, Country, ...) out of a
// geocoder result so they can be stored/searched separately alongside the
// formatted address. Any component that isn't available is simply omitted —
// callers should never invent a value for a missing piece.

export interface GeocoderAddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

export interface AddressComponents {
  street?: string;
  purok?: string;
  sitio?: string;
  barangay?: string;
  municipality?: string; // city/municipality
  province?: string;
  postalCode?: string;
  country?: string;
}

export function stripLeadingWord(name: string, words: string[]): string {
  let out = name.trim();
  for (const w of words) {
    const re = new RegExp(`^${w}\\.?\\s*`, "i");
    if (re.test(out)) return out.replace(re, "").trim();
  }
  return out;
}

function dropEmpty(obj: AddressComponents): AddressComponents {
  const out: AddressComponents = {};
  (Object.keys(obj) as (keyof AddressComponents)[]).forEach((k) => {
    if (obj[k]) out[k] = obj[k];
  });
  return out;
}

/**
 * Pulls individual address components (street, Purok, Sitio, Barangay,
 * Municipality/City, Province, Postal Code, Country) out of a Google Geocoder
 * result's address_components. Only fields Google actually returned are
 * included — nothing is inferred or invented.
 */
export function extractAddressComponents(components: GeocoderAddressComponent[]): AddressComponents {
  if (!components || components.length === 0) return {};

  const byNamePrefix = (...prefixes: string[]) =>
    components.find((c) => prefixes.some((p) => c.long_name.trim().toLowerCase().startsWith(p.toLowerCase())));
  const byType = (...types: string[]) => components.find((c) => types.some((t) => c.types.includes(t)));

  // Purok/Sitio have no dedicated Google component type — they show up (when Google's
  // underlying map data has them at all) folded into a generic sublocality/neighborhood
  // bucket. Matching on the name itself is the only reliable signal.
  const purokComp = byNamePrefix("purok");
  const sitioComp = byNamePrefix("sitio");

  const barangayComp =
    byNamePrefix("barangay", "brgy") ??
    components.find(
      (c) =>
        (c.types.includes("sublocality_level_1") || c.types.includes("sublocality") || c.types.includes("administrative_area_level_3")) &&
        c !== purokComp && c !== sitioComp,
    );

  const municipalityComp = byType("locality") ?? components.find((c) => c.types.includes("administrative_area_level_3") && c !== barangayComp);

  // Province is usually administrative_area_level_2 in PH results, with the region at
  // level 1 — but some results only carry it at level 1, so fall back to that.
  let provinceComp = components.find((c) => c.types.includes("administrative_area_level_2") && c !== municipalityComp);
  if (!provinceComp) provinceComp = components.find((c) => c.types.includes("administrative_area_level_1") && c !== municipalityComp);

  const streetNumber = byType("street_number");
  const route = byType("route");
  const street = [streetNumber?.long_name, route?.long_name].filter(Boolean).join(" ").trim() || undefined;

  const postalCodeComp = byType("postal_code");
  const countryComp = byType("country");

  return dropEmpty({
    street,
    purok: purokComp?.long_name.trim(),
    sitio: sitioComp && sitioComp !== purokComp ? sitioComp.long_name.trim() : undefined,
    barangay:
      barangayComp && barangayComp !== purokComp && barangayComp !== sitioComp
        ? `Barangay ${stripLeadingWord(barangayComp.long_name, ["barangay", "brgy"])}`
        : undefined,
    municipality: municipalityComp?.long_name.trim(),
    province: provinceComp ? stripLeadingWord(provinceComp.long_name, ["province of"]) : undefined,
    postalCode: postalCodeComp?.long_name.trim(),
    country: countryComp?.long_name.trim(),
  });
}

/**
 * Same component extraction, but for OpenStreetMap Nominatim's `address` object
 * shape (used as a free, no-API-key fallback when Google's Geocoding API is
 * unavailable — e.g. billing not enabled on the Google Cloud project).
 */
export function extractAddressComponentsFromNominatim(address: Record<string, string | undefined>): AddressComponents {
  const values = Object.values(address).filter((v): v is string => !!v);
  const byValuePrefix = (prefix: string) => values.find((v) => v.trim().toLowerCase().startsWith(prefix));

  const purok = byValuePrefix("purok");
  const sitio = byValuePrefix("sitio");

  const barangayRaw =
    byValuePrefix("barangay") ?? byValuePrefix("brgy") ??
    address.village ?? address.suburb ?? address.neighbourhood ?? address.city_district;
  const barangay =
    barangayRaw && barangayRaw !== purok && barangayRaw !== sitio
      ? `Barangay ${stripLeadingWord(barangayRaw, ["barangay", "brgy"])}`
      : undefined;

  const municipality = address.city ?? address.town ?? address.municipality;
  const province = address.state ?? address.province ?? address.county;
  const street = [address.house_number, address.road].filter(Boolean).join(" ").trim() || undefined;

  return dropEmpty({
    street,
    purok,
    sitio,
    barangay,
    municipality,
    province,
    postalCode: address.postcode,
    country: address.country,
  });
}
