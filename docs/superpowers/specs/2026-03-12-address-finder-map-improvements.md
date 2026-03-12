# Address Finder & Interactive Map Improvements
**Date:** 2026-03-12
**Status:** Approved

---

## Problem

The current address input is a plain text field with no suggestions, causing frequent geocoding failures. The map renders with the wrong style and static, unclickable markers that often don't appear at all (Google Civic API frequently omits coordinates from location records).

---

## Goals

1. Users can type a partial address and pick from a dropdown of real addresses — no manual formatting required, no geocoding failures.
2. The map uses a topographic/outdoor style matching the NOAA water map aesthetic (natural earth tones, terrain shading).
3. Clicking any map marker opens a popup with the location's name, address, hours, and a "Get Directions" button.
4. Clicking a location card in the results list flies the map to that marker and opens its popup.
5. Every polling location appears on the map, even when the Civic API omits coordinates.
6. The map re-centers on every new search.

---

## Design

### 1. Address Autocomplete

**Component:** Replace `AddressInput.tsx` with a new `AddressAutocomplete.tsx` that uses the Google Places Autocomplete API.

**Behaviour:**
- On mount, load the Google Maps JavaScript SDK (`libraries=places`) via a `<Script>` tag (Next.js `next/script`, `strategy="afterInteractive"`).
- While the user types (≥ 3 characters), call `AutocompleteService.getPlacePredictions` with `types: ['address']` and `componentRestrictions: { country: 'us' }`.
- Show up to 5 suggestions in a dropdown below the input.
- On suggestion select: call `PlacesService.getDetails` to resolve the `geometry.location` (lat/lng) and `formatted_address`. Store both.
- On form submit: use the resolved `formatted_address` for the Civic API call and the resolved `lat/lng` to skip the geocoding round-trip entirely.
- Geolocation button behaviour is unchanged (reverse-geocode coords → populate input field + trigger search).
- Clear button (✕) resets input and results.
- Keyboard navigation: arrow keys move through suggestions, Enter selects, Escape closes.

**API key:** Uses `NEXT_PUBLIC_GOOGLE_MAPS_KEY` env var (client-safe). Add this alongside the existing server-side `GOOGLE_MAPS_API_KEY`.

**Fallback:** If the Places SDK fails to load or the user pastes a complete address and submits without selecting from the dropdown, fall back to the existing geocode API route (`/api/geocode`) to resolve the address. This preserves the existing server-side flow as a safety net.

---

### 2. Geocoded Fallback for Missing Coordinates

**Where:** `src/lib/civic-api.ts` — `mapLocations` helper.

**Change:** After building the `VotingLocation[]` array, identify any entries where `lat` and `lng` are both `undefined`. For those entries, enqueue a geocode call (`geocodeAddress(location.address)`) and attach the resolved coordinates.

**Practical concern:** The Civic API can return many locations (10–20+). Geocoding all of them in parallel would fire many requests at once. Geocode only locations that lack coordinates, up to a cap of 10 parallel requests (use `Promise.allSettled`). Locations that fail geocoding remain on the map at `undefined` coordinates and are silently skipped (existing behaviour).

**Where it runs:** Server-side inside `getVoterInfo`, so the API route returns fully-enriched `VotingLocation` objects with coordinates wherever possible.

---

### 3. Interactive Map

**Component:** `MapSection.tsx` — significant additions.

**Map style:** Change `mapStyle` from `mapbox://styles/mapbox/dark-v11` to `mapbox://styles/mapbox/outdoors-v12`.

**Marker shape:** Replace the plain 14px circle dots with a proper map-pin shape (teardrop / inverted drop) built from CSS/SVG so they are easier to tap on mobile. Size: 28×36px. Color per location type (blue/green/orange). White border + drop shadow.

**Selected state:** The active marker (last clicked or triggered by a card click) renders 25% larger with a pulsing ring animation.

**Popup:** Use `Popup` from `react-map-gl/mapbox`. Clicking a marker:
1. Sets `selectedLocation` state (id + coordinates).
2. Flies the map to that location (`flyTo` via `mapRef`).
3. Opens a `<Popup>` at those coordinates containing:
   - Location name (bold)
   - Address (muted, single line)
   - Hours (first entry: open time – close time, or "See official site")
   - Open/closed badge
   - "Get Directions" button → `https://maps.google.com/?q=<encoded address>` in a new tab
   - Close button (✕)

**Card → map link:** `MapSection` receives a prop `activeLocationId?: string`. `DashboardController` tracks `activeLocationId` state. When a `PollingCard` is clicked, `DashboardController` sets `activeLocationId` to that location's id. `MapSection` watches this prop via `useEffect` and fires `flyTo` + opens the popup for that id.

**Map re-center:** Remove `initialViewState` and switch to a controlled `viewState` (`useState<ViewState>`). When `center` prop changes, reset `viewState` to the new center at zoom 13.

**Layer toggle buttons:** Move from above the map to overlaid on the map (top-left corner), styled as small pill badges with colored dots. Toggling hides/shows that set of markers (existing behaviour, new visual treatment).

---

### 4. Environment Variable Addition

Add `NEXT_PUBLIC_GOOGLE_MAPS_KEY` to `.env.local`. This is the same API key value as `GOOGLE_MAPS_API_KEY` — one is client-exposed (for the Places SDK script), one is server-side (for geocoding calls). Both keys should have the same Google Cloud API key value; the distinction is only in Next.js's bundling behaviour.

Document this clearly in `.env.local` with a comment.

---

## Files Changed

| File | Change |
|------|--------|
| `src/components/dashboard/AddressInput.tsx` | Replace with `AddressAutocomplete.tsx` (new component) |
| `src/components/dashboard/AddressAutocomplete.tsx` | New — Places Autocomplete input |
| `src/components/dashboard/MapSection.tsx` | Style, markers, popup, flyTo, re-center, overlay toggles |
| `src/components/dashboard/DashboardController.tsx` | Add `activeLocationId` state; pass to MapSection; wire card clicks |
| `src/components/dashboard/PollingCard.tsx` | Add `onSelect?: () => void` prop; call on card click |
| `src/lib/civic-api.ts` | Geocoded fallback for missing coordinates in `mapLocations` |
| `.env.local` | Add `NEXT_PUBLIC_GOOGLE_MAPS_KEY` |

---

## Out of Scope

- Election selection UI (multiple elections in one jurisdiction)
- Rate limiting or caching of Places API calls
- Custom Mapbox map style (beyond switching to `outdoors-v12`)
- Directions overlay drawn on the map
