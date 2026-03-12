# Address Autocomplete + Interactive Map — Design Spec
**Date:** 2026-03-12
**Status:** Approved

---

## Overview

Improve the two weakest parts of the Ballotbox home page:

1. **Address finder** — replace the plain text input with Google Places Autocomplete so users get real address suggestions as they type.
2. **Interactive map** — switch from static colored dots to a topographic basemap with clickable marker popups and two-way linking between the list and map.

---

## Part 1: Address Autocomplete

### Problem
The current `AddressInput` is a plain `<input>` with no suggestions. Users must type a complete, correctly-formatted address from memory. Typos or partial addresses silently fail, and the geocode call runs every time even on ambiguous input.

### Solution
Load the Google Places JavaScript API client-side using `@googlemaps/js-api-loader` and attach the **legacy `google.maps.places.Autocomplete` class** to the input element. When the user selects a suggestion from the dropdown, the selected place's `geometry.location` (lat/lng) is captured immediately — eliminating the separate geocode round-trip for the initial address resolution.

(Note: the legacy `Autocomplete` class is used in preference to the newer `PlaceAutocompleteElement` Web Component because the legacy class supports binding directly to an existing `<input>` element and reading `place.geometry.location` via `getPlace()`, which matches the current component structure. The deprecation timeline from Google is long-horizon and acceptable for this scope.)

### Behavior

**Typing:**
- After 2+ characters, the Places API returns up to 5 address suggestions in a styled dropdown below the input.
- Suggestions are filtered to type `address` (not just businesses or regions).
- A loading indicator shows while suggestions are fetching.

**Selecting a suggestion:**
- The input fills with the formatted address string.
- `place.geometry.location.lat()` / `.lng()` is extracted and stored in component state as `resolvedCoords: { lat: number; lng: number } | null`.
- The user taps "Find My Polling Place" to submit (or pressing Enter on a highlighted suggestion submits directly).
- On submit: a synthetic `GeocodeResult` is constructed from the resolved coordinates and formatted address (`{ lat, lng, formattedAddress: place.formatted_address }`), then passed through `onResults` alongside the `VoterInfo` — keeping the `onResults` signature identical to the current contract.
- The geocode API call (`/api/geocode`) is skipped on the normal submit path since coordinates are already known from Places.

**Geolocation (GPS button):**
- Unchanged behavior: `navigator.geolocation` → reverse geocode via `/api/geocode` → fills input, stores resolved coords, searches.
- The resolved `GeocodeResult` from the reverse-geocode response is passed through `onResults` as before.

**Clearing:**
- An `✕` button appears when the input has a value. Clicking it clears the input text, `resolvedCoords`, and calls a `onClear` callback so `DashboardController` can reset `voterInfo` and `geocodeResult` state.

### API Setup
- Uses `@googlemaps/js-api-loader` (new dependency) to load the Places library client-side with `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is a new env var — same value as the existing server-side `GOOGLE_MAPS_API_KEY`. Add to `.env.local` and Vercel dashboard.
- The **Places API** must be enabled in Google Cloud Console (same project as the existing Geocoding API — just enable it, no new key needed).
- No server-side changes needed — `/api/geocode` stays as-is for the geolocation path.

### Component changes
- `AddressInput.tsx` — full rewrite to use Places Autocomplete. Props interface: `onResults`, `isLoading`, `setIsLoading` (unchanged) + new `onClear: () => void`.
- `DashboardController.tsx` — add `onClear` handler to reset `voterInfo` and `geocodeResult` state.
- New env var: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.

---

## Part 2: Interactive Map

### Problem
- Map uses `dark-v11` style, but the desired aesthetic is topographic/terrain (NOAA water.noaa.gov style).
- Markers are 14px static dots — not clickable, no information on tap.
- `initialViewState` means the map never re-centers when a new address is searched.
- Many locations lack coordinates from the Civic API, so they silently disappear from the map.
- No visual connection between the location list and the map.

### Solution
Replace `MapSection.tsx` with a fully interactive map component.

### Map style
Use `mapbox://styles/mapbox/outdoors-v12` — topographic basemap with natural earth tones, terrain shading, visible rivers and elevation. Close to the NOAA water map aesthetic.

### Markers
Replace the plain dots with pin-shaped SVG markers (teardrop/raindrop shape, color-coded by type):
- **Polling:** blue `#3B82F6`
- **Early voting:** green `#22C55E`
- **Drop box:** orange `#F97316`

Markers are sized 32×32px for easy tapping on mobile. The active/selected marker renders at 1.3× scale.

### Popups
Clicking a marker opens a `Popup` (from `react-map-gl/mapbox`) anchored above the marker containing:
- Location name (bold)
- Address (muted)
- Open status badge + hours
- "Get Directions" button (opens `https://maps.google.com/?q=<encoded address>` in a new tab)
- Close (`✕`) button

Only one popup open at a time — opening a new one closes any existing popup. Popup state is tracked as `activeLocationId: string | null` in `MapSection`.

### Map viewport — controlled viewState
Replace `initialViewState` with **controlled `viewState`** using `react-map-gl`'s `viewState` + `onMove` pattern:

```tsx
const [viewState, setViewState] = useState({ longitude, latitude, zoom: 13 });
// In <Map>:
<Map viewState={viewState} onMove={e => setViewState(e.viewState)} ...>
```

When a new search result arrives (new `center` prop), `MapSection` updates `viewState` with `transitionDuration: 800` to animate smoothly to the new location.

**List → map linking:** Each `PollingCard` has an `onFlyTo?: (locationId: string) => void` prop. When called, `DashboardController` sets `activeLocationId` on `MapSection` (via state/props) and updates `viewState` to center on that marker — triggering both a smooth pan and opening the popup. No imperative ref calls needed; all driven by state.

### Coordinate fallback
After the Civic API response is received, any `VotingLocation` missing `lat`/`lng` is geocoded via `POST /api/geocode` using `{ address: location.address }`. These calls run with `Promise.allSettled` (not `Promise.all`) so a single failed geocode does not abort the others. The map renders immediately with whatever coordinates are available, then re-renders as geocoded coordinates arrive and are merged into the locations array in `DashboardController` state.

### Component changes
- `MapSection.tsx` — full rewrite: `outdoors-v12` style, SVG pin markers, `Popup` component, controlled `viewState`, `activeLocationId` prop.
- `PollingCard.tsx` — add optional `onFlyTo: (locationId: string) => void` prop; render a "View on map" link when provided.
- `DashboardController.tsx` — manage `activeLocationId` state, run `Promise.allSettled` geocode fallback, pass `onFlyTo` to cards and `activeLocationId` + new `center` to map.

---

## Data Flow

```
User types → google.maps.places.Autocomplete dropdown
User selects suggestion → resolvedCoords stored, formatted address fills input
User submits → POST /api/polling { address }
             → returns VoterInfo (pollingLocations[], earlyVoteSites[], dropOffLocations[])
             → synthetic GeocodeResult built from resolvedCoords
             → onResults(voterInfo, geocodeResult) called — same as current
Any locations missing lat/lng → Promise.allSettled([POST /api/geocode { address: loc.address }, ...])
             → resolved coords merged into locations in DashboardController state
All results → PollingCard list (onFlyTo callbacks)
           → MapSection (controlled viewState, markers, Popup, activeLocationId)
Card click → onFlyTo(locationId) → DashboardController sets activeLocationId
           → MapSection updates viewState to center on marker, opens Popup
```

---

## Out of Scope

- Server-side caching of API responses
- Multiple popups open simultaneously
- Street View integration
- Custom Mapbox tile styles beyond `outdoors-v12`
- Election selection (multiple elections per jurisdiction)
- Migrating from legacy `Autocomplete` to new `PlaceAutocompleteElement`

---

## Files Changed

| File | Change |
|------|--------|
| `src/components/dashboard/AddressInput.tsx` | Rewrite — Places Autocomplete, `onClear` prop |
| `src/components/dashboard/MapSection.tsx` | Rewrite — `outdoors-v12`, SVG pins, Popup, controlled viewState, `activeLocationId` |
| `src/components/dashboard/PollingCard.tsx` | Add optional `onFlyTo` prop, "View on map" link |
| `src/components/dashboard/DashboardController.tsx` | `onClear` handler, `activeLocationId` state, `Promise.allSettled` geocode fallback |
| `.env.local` | Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` |
| `package.json` | Add `@googlemaps/js-api-loader` |
