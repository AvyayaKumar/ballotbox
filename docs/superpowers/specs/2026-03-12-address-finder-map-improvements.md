# Address Finder & Interactive Map Improvements
**Date:** 2026-03-12
**Status:** Approved (revised after implementation audit)

---

## Current State

After an implementation audit, the following are **already complete** and require no changes:

- **`AddressInput.tsx`** — Google Places Autocomplete fully implemented using `@googlemaps/js-api-loader`. Resolves lat/lng from Places selection (skips geocode round-trip). Falls back to `/api/geocode` when user types without selecting a suggestion. Clear button, geolocation button, and ARIA attributes all present.
- **`DashboardController.tsx`** — `fillMissingCoords` geocodes any locations missing coordinates (client-side, `Promise.allSettled`, stale-search guard via `searchGenerationRef`). `activeLocationId` and `flyToTarget` state. `handleFlyTo` wires card clicks to fly-to. Passes `flyToTarget`, `activeLocationId`, `onActiveLocationChange`, `allLocations` to `MapSection`.
- **`PollingCard.tsx`** — `onFlyTo` prop with "View on map ↓" button that calls it.

---

## Remaining Work

All remaining work is in **`MapSection.tsx`**. The component currently:
- Has a stale prop interface (`center, pollingLocations, earlyVoteSites, dropOffLocations` only) that does not match what `DashboardController` passes it — causing TypeScript errors
- Uses `dark-v11` map style instead of `outdoors-v12`
- Uses `initialViewState` (map never re-centers on new searches, never responds to `flyToTarget`)
- Has small plain dot markers with no click interaction
- Has no popup
- Has layer toggle buttons rendered above the map (not on the map)

---

## Design

### MapSection — Full Rewrite

**New prop interface:**
```typescript
export interface MapSectionProps {
  center: { lat: number; lng: number };
  pollingLocations: VotingLocation[];
  earlyVoteSites: VotingLocation[];
  dropOffLocations: VotingLocation[];
  allLocations: VotingLocation[];          // used only for popup lookup by id
  flyToTarget: { lat: number; lng: number } | null;
  activeLocationId: string | null;
  onActiveLocationChange: (id: string | null) => void;
}
```

**`allLocations` vs. three typed props:** Marker rendering uses the three typed arrays (`pollingLocations`, `earlyVoteSites`, `dropOffLocations`) rebuilt into a tagged `Array<{ loc: VotingLocation; layer: LayerKey }>` exactly as the current code does — this preserves layer/color information. `allLocations` is used only for the popup: when `activeLocationId` changes, look up the full `VotingLocation` object from `allLocations.find(l => l.id === activeLocationId)` to populate popup content without rebuilding the tagged array.

**Map style:** `mapbox://styles/mapbox/outdoors-v12` (topographic, natural earth tones, terrain shading — matches NOAA water map aesthetic).

**Controlled viewport (re-centering):**
- Replace `initialViewState` with controlled `viewState` state (`useState<ViewState>`), initialized to `center` at zoom 13.
- Add `onMove` handler: `(evt) => setViewState(evt.viewState)` — required for a controlled map or user pan/zoom freezes.
- `useEffect` watching `center` prop: when `center` changes (new search), reset `viewState` to the new center at zoom 13.
- `flyToTarget` effect: when `flyToTarget` changes to a non-null value, call `mapRef.current?.flyTo({ center: [flyToTarget.lng, flyToTarget.lat], zoom: 15, duration: 800 })`. Also set a local `isFlyingRef = useRef(false)` to `true` at the start of the fly.
  - Listen for the Mapbox `moveend` map event: when it fires, set `isFlyingRef.current = false`.
  - The `flyTo` animation and the `center` reset effect can race if a new search fires during a fly animation. Guard: in the `center` `useEffect`, skip the viewport reset if `isFlyingRef.current === true`. Do NOT use the `flyToTarget` prop value for this guard — `flyToTarget` is never cleared by `DashboardController` after a card click, so it would permanently block re-centering after the first card interaction. The local `isFlyingRef` is the correct guard because it resets itself via `moveend`.

**Marker shape:** Replace plain `<div>` circle dots with a map-pin SVG (teardrop shape — circle on top, pointed bottom). Size: 28×36px. Color from `layerConfig`. White stroke 2px, drop shadow. The SVG pin is self-contained inline (no external image dependency). Change `<Marker anchor>` from `"center"` to `"bottom"` so the pointed tip aligns exactly with the coordinate.

**Active marker:** When `location.id === activeLocationId`, render the marker 25% larger (35×45px) and add a CSS `@keyframes pulse` ring animation (expanding semi-transparent circle, 1.5s infinite).

**Popup:** Use `Popup` from `react-map-gl/mapbox`. Local state `selectedLocationId: string | null`.
- Clicking a marker: set `selectedLocationId` to that location's id AND call `onActiveLocationChange(id)`.
- When `activeLocationId` prop changes externally (card click in DashboardController): set `selectedLocationId` to match immediately (do not wait for `flyTo` to finish). Mapbox's `Popup` component handles auto-panning automatically when it opens off-screen, so immediate rendering is correct. The popup will appear and pan into view as the fly animation runs.
- Popup content:
  - Location name (bold, 14px)
  - Address (muted, 12px, single line with ellipsis overflow)
  - Hours: `openTime – closeTime` or "See official site" if missing
  - Open/closed badge (reuse the same logic as `PollingCard.tsx` `getOpenStatus`)
  - "Get Directions" button → `https://maps.google.com/?q=<encodeURIComponent(address)>` (new tab)
  - ✕ close button → sets `selectedLocationId` and calls `onActiveLocationChange` to null
- Popup offset: `[0, -40]` in `react-map-gl` offset prop (40px upward from the `"bottom"` anchor point — clears the full 36px pin height plus 4px padding). This prevents the popup from overlapping the pin body.

**Layer toggles — overlaid on map:**
- Remove the `<div>` above the map that contains the toggle buttons.
- Re-render the same three toggle buttons inside the map container, absolutely positioned top-left (`absolute top-3 left-3 z-10 flex gap-2`).
- Visual: smaller pill buttons (`px-2.5 py-1 text-xs`) with a colored dot prefix matching the layer color. Active = colored background; inactive = white/60 with border.
- The map container div should be `position: relative` (it currently has `overflow-hidden` — keep both).

**Map height:** Increase from `h-96` to `h-[500px]` for better usability with the overlay controls.

**No-token fallback:** Keep existing behaviour (render placeholder message).

---

## Environment Variable

`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is already read by `AddressInput.tsx` — no new variable needed. The existing `.env.local` placeholder `NEXT_PUBLIC_MAPBOX_TOKEN` is already present for the map.

---

## Files Changed

| File | Change |
|------|--------|
| `src/components/dashboard/MapSection.tsx` | Full rewrite — new prop interface, outdoors style, controlled viewport, pin markers, popup, flyTo, overlaid layer toggles |

No other files require changes.

---

## Out of Scope

- Custom Mapbox map style beyond switching to `outdoors-v12`
- Directions overlay drawn on the map
- Election selection UI
- Rate limiting or caching of Places API calls
