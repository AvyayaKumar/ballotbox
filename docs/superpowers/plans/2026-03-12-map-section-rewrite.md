# MapSection Rewrite Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite `MapSection.tsx` to add a new prop interface, topographic map style, controlled viewport with flyTo support, SVG pin markers, popup, and overlaid layer toggles.

**Architecture:** Single-file rewrite of `src/components/dashboard/MapSection.tsx`. All logic lives in this one component — no new files, no new dependencies. The component receives `flyToTarget` and `activeLocationId` from `DashboardController` (already wired) and drives the map imperatively via `mapRef`.

**Tech Stack:** `react-map-gl/mapbox` v8, Mapbox GL JS, React hooks (`useState`, `useEffect`, `useRef`), TypeScript, Tailwind CSS.

---

## Chunk 1: Prop interface + map style + controlled viewport

### Task 1: Update prop interface, map style, and controlled viewport

**Files:**
- Modify: `src/components/dashboard/MapSection.tsx`

- [ ] **Step 1: Replace the prop interface**

  Open `src/components/dashboard/MapSection.tsx`. Replace the existing `MapSectionProps` interface (lines 10–15) with:

  ```typescript
  export interface MapSectionProps {
    center: { lat: number; lng: number };
    pollingLocations: VotingLocation[];
    earlyVoteSites: VotingLocation[];
    dropOffLocations: VotingLocation[];
    allLocations: VotingLocation[];
    flyToTarget: { lat: number; lng: number } | null;
    activeLocationId: string | null;
    onActiveLocationChange: (id: string | null) => void;
  }
  ```

- [ ] **Step 2: Add imports for controlled viewport and map ref**

  At the top of the file, update the React import and add map ref support:

  ```typescript
  import * as React from 'react';
  import { useState, useEffect, useRef, useCallback } from 'react';
  import Map, { Marker, Popup } from 'react-map-gl/mapbox';
  import type { MapRef, ViewState } from 'react-map-gl/mapbox';
  import 'mapbox-gl/dist/mapbox-gl.css';
  import { cn } from '@/lib/utils';
  import type { VotingLocation } from '@/lib/types';
  ```

- [ ] **Step 3: Add `mapRef`, `isFlyingRef`, and controlled `viewState` to component body**

  Inside the component function, after the `token` declaration, add:

  ```typescript
  const mapRef = useRef<MapRef>(null);
  const isFlyingRef = useRef(false);

  const [viewState, setViewState] = useState<ViewState>({
    longitude: center.lng,
    latitude: center.lat,
    zoom: 13,
    bearing: 0,
    pitch: 0,
    padding: { top: 0, bottom: 0, left: 0, right: 0 },
  });
  ```

- [ ] **Step 4: Add `useEffect` to re-center on new search**

  Add this effect after the viewState declaration:

  ```typescript
  // Re-center when a new search fires, but not during an active flyTo animation
  useEffect(() => {
    if (isFlyingRef.current) return;
    setViewState((prev) => ({
      ...prev,
      longitude: center.lng,
      latitude: center.lat,
      zoom: 13,
    }));
  }, [center]);
  ```

- [ ] **Step 5: Add `useEffect` to handle `flyToTarget`**

  Add this effect after the center effect:

  ```typescript
  useEffect(() => {
    if (!flyToTarget || !mapRef.current) return;
    isFlyingRef.current = true;
    mapRef.current.flyTo({
      center: [flyToTarget.lng, flyToTarget.lat],
      zoom: 15,
      duration: 800,
    });
  }, [flyToTarget]);
  ```

- [ ] **Step 6: Add `moveend` listener to reset `isFlyingRef`**

  Add a callback that attaches the `moveend` event when the map loads:

  ```typescript
  const handleMapLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    map.on('moveend', () => {
      isFlyingRef.current = false;
    });
  }, []);
  ```

- [ ] **Step 7: Update the `<Map>` element**

  Replace `initialViewState` with controlled viewport, change style to `outdoors-v12`, add `ref`, and wire `onMove` and `onLoad`:

  ```tsx
  <Map
    ref={mapRef}
    mapboxAccessToken={token}
    {...viewState}
    onMove={(evt) => setViewState(evt.viewState)}
    onLoad={handleMapLoad}
    style={{ width: '100%', height: '100%' }}
    mapStyle="mapbox://styles/mapbox/outdoors-v12"
  >
  ```

- [ ] **Step 8: Update component destructuring to include new props**

  Change the function signature to destructure the new props:

  ```typescript
  export const MapSection: React.FC<MapSectionProps> = ({
    center,
    pollingLocations,
    earlyVoteSites,
    dropOffLocations,
    allLocations,
    flyToTarget,
    activeLocationId,
    onActiveLocationChange,
  }) => {
  ```

- [ ] **Step 9: Run TypeScript check**

  ```bash
  cd /Users/avyayakumar/Desktop/ballotbox && npx tsc --noEmit
  ```

  Expected: no errors related to MapSection or DashboardController prop mismatch.

- [ ] **Step 10: Commit**

  ```bash
  cd /Users/avyayakumar/Desktop/ballotbox
  git add src/components/dashboard/MapSection.tsx
  git commit -m "feat(map): controlled viewport, outdoors-v12 style, flyTo with race guard"
  ```

---

## Chunk 2: SVG pin markers and active marker state

### Task 2: Replace dot markers with SVG pin markers

**Files:**
- Modify: `src/components/dashboard/MapSection.tsx`

- [ ] **Step 1: Remove the `MarkerDot` component**

  Delete the entire `MarkerDotProps` interface and `MarkerDot` component (current lines 25–37).

- [ ] **Step 2: Add `MapPin` SVG marker component**

  Add this component in place of `MarkerDot`:

  ```typescript
  interface MapPinProps {
    color: string;
    label: string;
    isActive: boolean;
  }

  const MapPin: React.FC<MapPinProps> = ({ color, label, isActive }) => {
    const width = isActive ? 35 : 28;
    const height = isActive ? 45 : 36;
    return (
      <div style={{ position: 'relative', width, height }}>
        {isActive && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: width * 2,
              height: width * 2,
              borderRadius: '50%',
              backgroundColor: color,
              opacity: 0.25,
              animation: 'pulse-ring 1.5s ease-out infinite',
            }}
          />
        )}
        <svg
          role="img"
          aria-label={label}
          width={width}
          height={height}
          viewBox="0 0 28 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M14 0C6.268 0 0 6.268 0 14c0 9.941 14 22 14 22S28 23.941 28 14C28 6.268 21.732 0 14 0z"
            fill={color}
            stroke="white"
            strokeWidth="2"
          />
          <circle cx="14" cy="14" r="5" fill="white" fillOpacity="0.8" />
        </svg>
      </div>
    );
  };
  ```

- [ ] **Step 3: Add the `pulse-ring` keyframe animation**

  This can't live in a Tailwind class because it's a custom animation. Add a `<style>` block at the top of the return, just before the no-token fallback check:

  ```tsx
  return (
    <>
      <style>{`
        @keyframes pulse-ring {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0.4; }
          100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
        }
      `}</style>
      {/* rest of component */}
    </>
  );
  ```

  Wrap the existing return content in the fragment.

- [ ] **Step 4: Update Marker to use `anchor="bottom"` and pass `isActive`**

  In the marker render loop, change `<Marker anchor="center">` to `<Marker anchor="bottom">` and replace `<MarkerDot>` with `<MapPin>`:

  ```tsx
  <Marker
    key={loc.id}
    longitude={loc.lng}
    latitude={loc.lat}
    anchor="bottom"
    onClick={() => {
      onActiveLocationChange(loc.id);
      setSelectedLocationId(loc.id);
    }}
    style={{ cursor: 'pointer' }}
  >
    <MapPin
      color={layerConfig[layer].color}
      label={loc.name}
      isActive={loc.id === activeLocationId}
    />
  </Marker>
  ```

  Note: `setSelectedLocationId` is added in Task 3. For now, declare it as a placeholder or add it in the same step.

- [ ] **Step 5: Verify in browser**

  ```bash
  cd /Users/avyayakumar/Desktop/ballotbox && npm run dev
  ```

  Open `localhost:3000`, enter an address, confirm teardrop pin markers appear on the map with the correct colors.

- [ ] **Step 6: Commit**

  ```bash
  git add src/components/dashboard/MapSection.tsx
  git commit -m "feat(map): SVG pin markers with active state pulse animation"
  ```

---

## Chunk 3: Popup on marker click

### Task 3: Add Popup component

**Files:**
- Modify: `src/components/dashboard/MapSection.tsx`

- [ ] **Step 1: Add `selectedLocationId` state**

  In the component body, after `viewState`:

  ```typescript
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  ```

- [ ] **Step 2: Sync `selectedLocationId` with external `activeLocationId` prop**

  Add a `useEffect` that mirrors the external prop:

  ```typescript
  // When DashboardController changes activeLocationId (e.g. card click), mirror it to selectedLocationId
  useEffect(() => {
    setSelectedLocationId(activeLocationId);
  }, [activeLocationId]);
  ```

- [ ] **Step 3: Extract `getOpenStatus` from `PollingCard.tsx` into the component**

  `MapSection.tsx` needs the same open/closed badge logic as `PollingCard.tsx`. Copy the `parseTime` and `getOpenStatus` functions verbatim from `src/components/dashboard/PollingCard.tsx`:

  ```typescript
  function parseTime(timeStr: string): Date | null {
    const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return null;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3].toUpperCase();
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
  }

  function getOpenStatus(openTime: string, closeTime: string): { label: string; variant: 'success' | 'warning' | 'neutral' } {
    const now = new Date();
    const open = parseTime(openTime);
    const close = parseTime(closeTime);
    if (!open || !close) return { label: closeTime, variant: 'neutral' };
    if (now >= open && now < close) {
      const diffMs = close.getTime() - now.getTime();
      const diffMins = Math.round(diffMs / 60000);
      if (diffMins <= 60) return { label: `Closes in ${diffMins}m`, variant: 'warning' };
      return { label: 'Open Now', variant: 'success' };
    }
    return { label: `Opens ${openTime}`, variant: 'neutral' };
  }
  ```

  Place these above the component function.

- [ ] **Step 4: Derive `selectedLocation` from `allLocations`**

  Inside the component body, derive the selected location object:

  ```typescript
  const selectedLocation = selectedLocationId
    ? allLocations.find((l) => l.id === selectedLocationId) ?? null
    : null;
  ```

- [ ] **Step 5: Add badge variant color helper**

  ```typescript
  const badgeColors: Record<'success' | 'warning' | 'neutral', string> = {
    success: '#22C55E',
    warning: '#F59E0B',
    neutral: '#6B7280',
  };
  ```

- [ ] **Step 6: Render the `<Popup>` inside `<Map>`**

  After the marker rendering loop, add the popup:

  ```tsx
  {selectedLocation && selectedLocation.lat !== undefined && selectedLocation.lng !== undefined && (
    <Popup
      longitude={selectedLocation.lng}
      latitude={selectedLocation.lat}
      anchor="bottom"
      offset={[0, -40] as [number, number]}
      closeOnClick={false}
      onClose={() => {
        setSelectedLocationId(null);
        onActiveLocationChange(null);
      }}
    >
      <div style={{ minWidth: 220, maxWidth: 280, fontFamily: 'inherit' }}>
        {/* Close button */}
        <button
          type="button"
          onClick={() => {
            setSelectedLocationId(null);
            onActiveLocationChange(null);
          }}
          aria-label="Close popup"
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 16,
            lineHeight: 1,
            color: '#6B7280',
          }}
        >
          ✕
        </button>

        {/* Name */}
        <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, paddingRight: 20 }}>
          {selectedLocation.name}
        </p>

        {/* Address */}
        <p style={{
          fontSize: 12,
          color: '#6B7280',
          marginBottom: 6,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {selectedLocation.address}
        </p>

        {/* Hours + open/closed badge */}
        {selectedLocation.hours[0] ? (() => {
          const h = selectedLocation.hours[0];
          const status = getOpenStatus(h.openTime, h.closeTime);
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <span style={{ fontSize: 12 }}>{h.openTime} – {h.closeTime}</span>
              <span style={{
                fontSize: 11,
                color: 'white',
                backgroundColor: badgeColors[status.variant],
                borderRadius: 4,
                padding: '1px 6px',
              }}>
                {status.label}
              </span>
            </div>
          );
        })() : (
          <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>See official site</p>
        )}

        {/* Get Directions */}
        <a
          href={`https://maps.google.com/?q=${encodeURIComponent(selectedLocation.address)}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            fontSize: 12,
            color: '#1D4ED8',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Get Directions →
        </a>
      </div>
    </Popup>
  )}
  ```

- [ ] **Step 7: Run TypeScript check**

  ```bash
  cd /Users/avyayakumar/Desktop/ballotbox && npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 8: Manual test — popup via marker click**

  Open `localhost:3000`, enter an address, click a map pin. Confirm popup appears with name, address, hours, badge, and "Get Directions" link. Click ✕ to close. Confirm popup dismisses.

- [ ] **Step 9: Manual test — popup via card click**

  Click "View on map ↓" on a polling card. Confirm the map flies to the location AND the popup opens on that marker.

- [ ] **Step 10: Commit**

  ```bash
  git add src/components/dashboard/MapSection.tsx
  git commit -m "feat(map): popup on marker click with hours, badge, and directions link"
  ```

---

## Chunk 4: Overlaid layer toggles and map height

### Task 4: Move layer toggles onto the map

**Files:**
- Modify: `src/components/dashboard/MapSection.tsx`

- [ ] **Step 1: Remove the `<div className="space-y-3">` wrapper and the external toggle `<div>`**

  Currently the component returns a `<div className="space-y-3">` containing:
  1. A `<div className="flex flex-wrap gap-2">` with toggle buttons
  2. A `<div className="h-96 ...">` with the map

  Remove the toggle `<div>` entirely. Remove the `space-y-3` wrapper. Keep only the map container `<div>`.

- [ ] **Step 2: Make the map container `position: relative` and increase height**

  Change the map container div:

  ```tsx
  <div className="h-[500px] rounded-xl overflow-hidden border border-white/10 relative">
  ```

- [ ] **Step 3: Add overlay toggle buttons inside the map container, before `<Map>`**

  ```tsx
  {/* Overlaid layer toggle buttons */}
  <div
    className="absolute top-3 left-3 z-10 flex gap-2"
    role="group"
    aria-label="Toggle map layers"
  >
    {(Object.entries(layerConfig) as [LayerKey, typeof layerConfig[LayerKey]][]).map(
      ([key, cfg]) => (
        <button
          key={key}
          type="button"
          onClick={() => toggleLayer(key)}
          aria-pressed={visibleLayers[key]}
          className={cn(
            'px-2.5 py-1 text-xs font-medium rounded-full border transition-colors flex items-center gap-1.5',
            visibleLayers[key]
              ? cfg.activeClass + ' border-transparent'
              : 'bg-white/60 text-gray-700 border-gray-300 hover:bg-white/80'
          )}
        >
          <span
            aria-hidden="true"
            style={{ backgroundColor: cfg.color }}
            className="w-2 h-2 rounded-full shrink-0"
          />
          {cfg.label}
        </button>
      )
    )}
  </div>
  ```

- [ ] **Step 4: Verify the return structure**

  The final return (after the `<style>` block and no-token guard) should look like:

  ```tsx
  return (
    <>
      <style>{`@keyframes pulse-ring { ... }`}</style>
      <div className="h-[500px] rounded-xl overflow-hidden border border-white/10 relative">
        {/* Overlaid layer toggles */}
        <div className="absolute top-3 left-3 z-10 flex gap-2" ...>
          {/* buttons */}
        </div>
        <Map ...>
          {/* markers */}
          {/* popup */}
        </Map>
      </div>
    </>
  );
  ```

- [ ] **Step 5: Run TypeScript check**

  ```bash
  cd /Users/avyayakumar/Desktop/ballotbox && npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 6: Run build check**

  ```bash
  cd /Users/avyayakumar/Desktop/ballotbox && npm run build
  ```

  Expected: successful build with no errors.

- [ ] **Step 7: Full manual test**

  With `npm run dev` running at `localhost:3000`:

  1. Enter a US address → confirm map loads at zoom 13, centered on address, with `outdoors-v12` topographic style
  2. Confirm layer toggle pills appear top-left on the map (not above it)
  3. Toggle each layer off/on — confirm markers appear/disappear
  4. Click a map pin → popup opens with name, address, hours, badge, "Get Directions"
  5. Click ✕ on popup → popup closes
  6. Click "View on map ↓" on a polling card → map flies to that pin and popup opens
  7. Enter a second address → map re-centers on new address (not blocked by previous flyTo)
  8. Confirm active pin is 25% larger with pulse animation ring

- [ ] **Step 8: Commit**

  ```bash
  git add src/components/dashboard/MapSection.tsx
  git commit -m "feat(map): overlaid layer toggles, h-[500px] map height"
  ```

---

## Verification Checklist

- [ ] `npx tsc --noEmit` — zero errors
- [ ] `npm run build` — successful production build
- [ ] Map style is topographic (`outdoors-v12`), not dark
- [ ] Map re-centers on new search
- [ ] `flyTo` flies to card location at zoom 15
- [ ] New search during active fly animation re-centers correctly (not blocked)
- [ ] Pin markers are teardrop SVG shape, 28×36px
- [ ] Active pin is 35×45px with pulse ring
- [ ] Popup opens on marker click with correct content
- [ ] Popup opens on card click via `activeLocationId` prop
- [ ] Popup ✕ closes popup and clears active state
- [ ] Layer toggles are overlaid on map (top-left, not above)
- [ ] Map height is 500px
