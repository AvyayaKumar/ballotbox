# Address Autocomplete + Interactive Map — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the plain address input with Google Places Autocomplete and rebuild the map with a topographic style, clickable marker popups, and two-way list↔map linking.

**Architecture:** `AddressInput` loads the Google Places JS API client-side and attaches the legacy `Autocomplete` class to the `<input>` element, capturing coordinates from the selected suggestion. `DashboardController` gains `onClear`, `activeLocationId` state, and a `Promise.allSettled` geocode fallback for locations missing coordinates. `MapSection` is fully rewritten with `outdoors-v12` style, SVG pin markers, a `Popup` from `react-map-gl/mapbox`, and controlled `viewState` driven entirely by props — no imperative refs.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, `@googlemaps/js-api-loader` (new), `react-map-gl/mapbox` v8, Mapbox GL JS v3, Google Places API (legacy `Autocomplete` class), Google Maps Geocoding API.

---

## File Map

| File | Status | Responsibility |
|------|--------|---------------|
| `src/components/dashboard/AddressInput.tsx` | **Rewrite** | Places Autocomplete input, geolocation button, clear button, `onClear` prop |
| `src/components/dashboard/MapSection.tsx` | **Rewrite** | Outdoors-v12 map, SVG pin markers, Popup, controlled viewState, activeLocationId |
| `src/components/dashboard/PollingCard.tsx` | **Modify** | Add optional `onFlyTo` prop + "View on map" link |
| `src/components/dashboard/DashboardController.tsx` | **Modify** | onClear handler, activeLocationId state, Promise.allSettled geocode fallback |
| `.env.local` | **Modify** | Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` |

---

## Chunk 1: Setup + Address Autocomplete

### Task 1: Install dependency and add env var

**Files:**
- Modify: `.env.local`
- Run: `npm install` in project root

- [ ] **Step 1.1: Install `@googlemaps/js-api-loader`**

```bash
export NVM_DIR="$HOME/.nvm" && [ -s "$(brew --prefix nvm)/nvm.sh" ] && . "$(brew --prefix nvm)/nvm.sh"
cd /Users/avyayakumar/Desktop/ballotbox
npm install @googlemaps/js-api-loader
```

Expected output: `added 1 package` (or similar), no errors.

- [ ] **Step 1.2: Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to `.env.local`**

Open `/Users/avyayakumar/Desktop/ballotbox/.env.local` and add:
```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<same value as GOOGLE_MAPS_API_KEY>
```

The value is the same key already in the file as `GOOGLE_MAPS_API_KEY`. The `NEXT_PUBLIC_` prefix makes it available in the browser bundle.

- [ ] **Step 1.3: Verify build still passes**

```bash
export NVM_DIR="$HOME/.nvm" && [ -s "$(brew --prefix nvm)/nvm.sh" ] && . "$(brew --prefix nvm)/nvm.sh"
cd /Users/avyayakumar/Desktop/ballotbox && npm run build 2>&1 | tail -10
```

Expected: Build completes without errors.

- [ ] **Step 1.4: Commit**

Do NOT commit `.env.local` — it contains API keys and must stay untracked. Also remember to add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to your Vercel environment variable dashboard before deploying.

```bash
cd /Users/avyayakumar/Desktop/ballotbox
git add package.json package-lock.json
git commit -m "chore: add @googlemaps/js-api-loader dependency"
```

---

### Task 2: Rewrite AddressInput with Google Places Autocomplete

**Files:**
- Rewrite: `src/components/dashboard/AddressInput.tsx`

**What this component does after the rewrite:**
- Loads the Google Places JS API once using `@googlemaps/js-api-loader` (lazy, on mount)
- Attaches `google.maps.places.Autocomplete` to the `<input>` ref with `types: ['address']`
- On `place_changed`: reads `place.geometry.location.lat()` / `.lng()` and `place.formatted_address`, stores in `resolvedCoords` state
- On form submit: if `resolvedCoords` is set, constructs a synthetic `GeocodeResult` and calls `onResults(voterInfo, geocodeResult)` — no `/api/geocode` call needed
- If user typed manually without selecting a suggestion, falls back to calling `/api/geocode` to get coordinates (same as current behavior)
- Geolocation (GPS) button: unchanged — calls `/api/geocode` with lat,lng string, then `/api/polling`
- Clear (✕) button: appears when input has text, clears input + `resolvedCoords`, calls `onClear()`
- `onClear` is a new required prop

- [ ] **Step 2.1: Write the new `AddressInput.tsx`**

Replace the entire contents of `src/components/dashboard/AddressInput.tsx` with:

```tsx
'use client';

import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { MapPin, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { VoterInfo, GeocodeResult } from '@/lib/types';

export interface AddressInputProps {
  onResults: (voterInfo: VoterInfo, geocode: GeocodeResult) => void;
  onClear: () => void;
  isLoading: boolean;
  setIsLoading: (v: boolean) => void;
}

export const AddressInput: React.FC<AddressInputProps> = ({
  onResults,
  onClear,
  isLoading,
  setIsLoading,
}) => {
  const [address, setAddress] = useState('');
  const [resolvedCoords, setResolvedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  // Load Places API and attach Autocomplete once on mount
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey || !inputRef.current) return;

    const loader = new Loader({
      apiKey,
      version: 'weekly',
      libraries: ['places'],
    });

    let active = true;
    loader.importLibrary('places').then(() => {
      if (!active || !inputRef.current) return;
      const ac = new google.maps.places.Autocomplete(inputRef.current, {
        types: ['address'],
        fields: ['formatted_address', 'geometry'],
      });
      ac.addListener('place_changed', () => {
        const place = ac.getPlace();
        if (place.geometry?.location && place.formatted_address) {
          setAddress(place.formatted_address);
          setResolvedCoords({
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          });
          setError(null);
        }
      });
      autocompleteRef.current = ac;
    }).catch(() => {
      // Places failed to load — input still works, just no autocomplete
    });

    return () => { active = false; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = address.trim();
    if (!trimmed) {
      setError('Please enter your address.');
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      let geocode: GeocodeResult;

      if (resolvedCoords) {
        // Coordinates already known from Places selection — skip geocode API call
        geocode = {
          lat: resolvedCoords.lat,
          lng: resolvedCoords.lng,
          formattedAddress: trimmed,
        };
      } else {
        // User typed manually without selecting a suggestion — geocode to get coords
        const geocodeRes = await fetch('/api/geocode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: trimmed }),
        });
        if (!geocodeRes.ok) {
          const data = (await geocodeRes.json()) as { error?: string };
          throw new Error(data.error ?? 'Failed to geocode address.');
        }
        geocode = (await geocodeRes.json()) as GeocodeResult;
      }

      const pollingRes = await fetch('/api/polling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: trimmed }),
      });
      if (!pollingRes.ok) {
        const data = (await pollingRes.json()) as { error?: string };
        throw new Error(data.error ?? 'Failed to fetch polling info.');
      }
      const voterInfo = (await pollingRes.json()) as VoterInfo;
      onResults(voterInfo, geocode);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeolocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setIsLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const coordString = `${latitude},${longitude}`;
          const geocodeRes = await fetch('/api/geocode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address: coordString }),
          });
          if (!geocodeRes.ok) {
            const data = (await geocodeRes.json()) as { error?: string };
            throw new Error(data.error ?? 'Failed to reverse geocode location.');
          }
          const geocode = (await geocodeRes.json()) as GeocodeResult;
          setAddress(geocode.formattedAddress);
          setResolvedCoords({ lat: geocode.lat, lng: geocode.lng });

          const pollingRes = await fetch('/api/polling', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address: geocode.formattedAddress }),
          });
          if (!pollingRes.ok) {
            const data = (await pollingRes.json()) as { error?: string };
            throw new Error(data.error ?? 'Failed to fetch polling info.');
          }
          const voterInfo = (await pollingRes.json()) as VoterInfo;
          onResults(voterInfo, geocode);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to get location.');
        } finally {
          setIsLoading(false);
        }
      },
      (err) => {
        setError(`Location access denied: ${err.message}`);
        setIsLoading(false);
      }
    );
  };

  const handleClear = () => {
    setAddress('');
    setResolvedCoords(null);
    setError(null);
    onClear();
    inputRef.current?.focus();
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4" noValidate>
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={address}
          onChange={(e) => {
            setAddress(e.target.value);
            // Clear resolved coords if user edits manually after a Places selection
            if (resolvedCoords) setResolvedCoords(null);
          }}
          placeholder="Enter your home address…"
          aria-label="Street address"
          aria-describedby="address-error"
          aria-invalid={!!error}
          className="w-full rounded-xl bg-brand-card border border-white/10 text-white placeholder-brand-muted py-4 px-5 pr-24 text-lg focus:outline-none focus:ring-2 focus:ring-brand-accent min-h-[48px]"
          disabled={isLoading}
          autoComplete="off"
        />
        <div className="absolute right-3 flex items-center gap-1">
          {address && (
            <button
              type="button"
              onClick={handleClear}
              disabled={isLoading}
              aria-label="Clear address"
              className="flex items-center justify-center w-8 h-8 text-brand-muted hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent rounded-lg disabled:opacity-50"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            onClick={handleGeolocation}
            disabled={isLoading}
            aria-label="Use my current location"
            className="flex items-center justify-center w-10 h-10 min-h-[48px] min-w-[48px] text-brand-muted hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent rounded-lg disabled:opacity-50"
          >
            <MapPin className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        disabled={isLoading}
        aria-busy={isLoading}
      >
        {isLoading ? 'Searching…' : 'Find My Polling Place'}
      </Button>

      {error && (
        <p id="address-error" role="alert" className="text-red-400 text-sm mt-1">
          {error}
        </p>
      )}
    </form>
  );
};

export default AddressInput;
```

- [ ] **Step 2.2: Verify TypeScript — check for `@types/google.maps`**

The `google.maps.places.Autocomplete` type comes from `@types/google.maps`. Check if it's installed:

```bash
export NVM_DIR="$HOME/.nvm" && [ -s "$(brew --prefix nvm)/nvm.sh" ] && . "$(brew --prefix nvm)/nvm.sh"
cd /Users/avyayakumar/Desktop/ballotbox
cat package.json | grep "@types/google.maps"
```

If not present, install it:
```bash
npm install --save-dev @types/google.maps
```

- [ ] **Step 2.3: Run TypeScript check**

```bash
export NVM_DIR="$HOME/.nvm" && [ -s "$(brew --prefix nvm)/nvm.sh" ] && . "$(brew --prefix nvm)/nvm.sh"
cd /Users/avyayakumar/Desktop/ballotbox && npx tsc --noEmit 2>&1 | head -30
```

Expected: No errors in `AddressInput.tsx`. Fix any type errors before proceeding.

- [ ] **Step 2.4: Run build**

```bash
export NVM_DIR="$HOME/.nvm" && [ -s "$(brew --prefix nvm)/nvm.sh" ] && . "$(brew --prefix nvm)/nvm.sh"
cd /Users/avyayakumar/Desktop/ballotbox && npm run build 2>&1 | tail -15
```

Expected: Build passes. If it fails with `onClear` prop missing, that's expected — will be fixed in Task 3.

- [ ] **Step 2.5: Commit**

```bash
cd /Users/avyayakumar/Desktop/ballotbox
git add src/components/dashboard/AddressInput.tsx package.json package-lock.json
git commit -m "feat: replace plain address input with Google Places Autocomplete"
```

---

### Task 3: Update DashboardController

**Files:**
- Modify: `src/components/dashboard/DashboardController.tsx`

**What changes:**
1. Add `onClear` handler → resets `voterInfo`, `geocodeResult`, `activeLocationId`
2. Add `activeLocationId: string | null` state
3. After `handleResults` sets `voterInfo`, run geocode fallback: find all locations missing `lat`/`lng`, call `POST /api/geocode` for each with `Promise.allSettled`, merge resolved coords back into the locations arrays
4. Pass `onClear` to `AddressInput`
5. Pass `activeLocationId` and `onActiveLocationChange` to `MapSection`
6. Pass `onFlyTo` callback to each `PollingCard`

- [ ] **Step 3.1: Rewrite `DashboardController.tsx`**

Replace the entire file with:

```tsx
'use client';

import { useState, useCallback } from 'react';
import type { VoterInfo, GeocodeResult, VotingLocation } from '@/lib/types';
import AddressInput from '@/components/dashboard/AddressInput';
import PollingCard from '@/components/dashboard/PollingCard';
import MapSection from '@/components/dashboard/MapSection';
import InfoPanel from '@/components/dashboard/InfoPanel';

// Geocode locations that are missing lat/lng using the server-side /api/geocode route.
// Uses Promise.allSettled so one failure does not abort the others.
async function fillMissingCoords(locations: VotingLocation[]): Promise<VotingLocation[]> {
  const results = await Promise.allSettled(
    locations.map(async (loc) => {
      if (loc.lat !== undefined && loc.lng !== undefined) return loc;
      try {
        const res = await fetch('/api/geocode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: loc.address }),
        });
        if (!res.ok) return loc;
        const geo = (await res.json()) as GeocodeResult;
        return { ...loc, lat: geo.lat, lng: geo.lng };
      } catch {
        return loc;
      }
    })
  );
  return results.map((r, i) => (r.status === 'fulfilled' ? r.value : locations[i]));
}

export default function DashboardController() {
  const [voterInfo, setVoterInfo] = useState<VoterInfo | null>(null);
  const [geocodeResult, setGeocodeResult] = useState<GeocodeResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeLocationId, setActiveLocationId] = useState<string | null>(null);

  const handleResults = useCallback(async (info: VoterInfo, geo: GeocodeResult) => {
    // Set results immediately so cards appear
    setVoterInfo(info);
    setGeocodeResult(geo);
    setActiveLocationId(null);

    // In the background, fill in any missing coordinates
    const allLocations = [
      ...info.pollingLocations,
      ...info.earlyVoteSites,
      ...info.dropOffLocations,
    ];
    const needsGeocoding = allLocations.some(
      (loc) => loc.lat === undefined || loc.lng === undefined
    );
    if (!needsGeocoding) return;

    const [filledPolling, filledEarly, filledDropbox] = await Promise.all([
      fillMissingCoords(info.pollingLocations),
      fillMissingCoords(info.earlyVoteSites),
      fillMissingCoords(info.dropOffLocations),
    ]);

    setVoterInfo({
      ...info,
      pollingLocations: filledPolling,
      earlyVoteSites: filledEarly,
      dropOffLocations: filledDropbox,
    });
  }, []);

  // flyToTarget MUST be declared before handleFlyTo to avoid temporal dead zone ReferenceError.
  const [flyToTarget, setFlyToTarget] = useState<{ lat: number; lng: number } | null>(null);

  const handleClear = useCallback(() => {
    setVoterInfo(null);
    setGeocodeResult(null);
    setActiveLocationId(null);
  }, []);

  const handleFlyTo = useCallback((locationId: string, lat: number, lng: number) => {
    setActiveLocationId(locationId);
    setFlyToTarget({ lat, lng });
  }, []);

  const hasAnyLocations = voterInfo && (
    voterInfo.pollingLocations.length > 0 ||
    voterInfo.earlyVoteSites.length > 0 ||
    voterInfo.dropOffLocations.length > 0
  );

  const allLocations = voterInfo
    ? [...voterInfo.pollingLocations, ...voterInfo.earlyVoteSites, ...voterInfo.dropOffLocations]
    : [];

  return (
    <>
      {/* Address Input */}
      <AddressInput
        onResults={handleResults}
        onClear={handleClear}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
      />

      {/* Results Section */}
      {voterInfo !== null && (
        <section className="bg-brand-light py-16">
          <div className="max-w-3xl mx-auto px-6 space-y-8">
            {!hasAnyLocations ? (
              <div className="text-center py-12">
                <p className="text-gray-600 text-lg">No polling locations found for this address.</p>
                <p className="text-gray-500 text-sm mt-2">
                  Try a different address or visit{' '}
                  <a href="https://vote.gov" className="text-brand-accent underline" target="_blank" rel="noopener noreferrer">
                    vote.gov
                  </a>{' '}
                  for more information.
                </p>
              </div>
            ) : (
              <>
                {/* Polling locations */}
                {voterInfo.pollingLocations.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                      Your Polling Place
                      {voterInfo.pollingLocations.length > 1 && (
                        <span className="text-sm font-normal text-gray-500 ml-2">
                          ({voterInfo.pollingLocations.length} locations)
                        </span>
                      )}
                    </h2>
                    {voterInfo.pollingLocations.map((loc) => (
                      <PollingCard
                        key={loc.id}
                        location={loc}
                        onFlyTo={
                          loc.lat !== undefined && loc.lng !== undefined
                            ? () => handleFlyTo(loc.id, loc.lat!, loc.lng!)
                            : undefined
                        }
                      />
                    ))}
                  </div>
                )}

                {/* Early vote sites */}
                {voterInfo.earlyVoteSites.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Early Voting Sites</h2>
                    {voterInfo.earlyVoteSites.map((loc) => (
                      <PollingCard
                        key={loc.id}
                        location={loc}
                        onFlyTo={
                          loc.lat !== undefined && loc.lng !== undefined
                            ? () => handleFlyTo(loc.id, loc.lat!, loc.lng!)
                            : undefined
                        }
                      />
                    ))}
                  </div>
                )}

                {/* Drop-off locations */}
                {voterInfo.dropOffLocations.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Ballot Drop Boxes</h2>
                    {voterInfo.dropOffLocations.map((loc) => (
                      <PollingCard
                        key={loc.id}
                        location={loc}
                        onFlyTo={
                          loc.lat !== undefined && loc.lng !== undefined
                            ? () => handleFlyTo(loc.id, loc.lat!, loc.lng!)
                            : undefined
                        }
                      />
                    ))}
                  </div>
                )}

                {/* Map */}
                {geocodeResult && (
                  <MapSection
                    center={{ lat: geocodeResult.lat, lng: geocodeResult.lng }}
                    flyToTarget={flyToTarget}
                    pollingLocations={voterInfo.pollingLocations}
                    earlyVoteSites={voterInfo.earlyVoteSites}
                    dropOffLocations={voterInfo.dropOffLocations}
                    activeLocationId={activeLocationId}
                    onActiveLocationChange={setActiveLocationId}
                    allLocations={allLocations}
                  />
                )}
              </>
            )}

            {/* Info Panel */}
            <InfoPanel state={voterInfo.state} />
          </div>
        </section>
      )}
    </>
  );
}
```

- [ ] **Step 3.2: Run TypeScript check**

```bash
export NVM_DIR="$HOME/.nvm" && [ -s "$(brew --prefix nvm)/nvm.sh" ] && . "$(brew --prefix nvm)/nvm.sh"
cd /Users/avyayakumar/Desktop/ballotbox && npx tsc --noEmit 2>&1 | head -30
```

Expected: Errors about unknown `flyToTarget`, `allLocations`, `activeLocationId`, `onActiveLocationChange` props on `MapSection` — these will be fixed in Task 5. Errors about unknown `onFlyTo` on `PollingCard` — fixed in Task 4. No other errors.

- [ ] **Step 3.3: Commit**

```bash
cd /Users/avyayakumar/Desktop/ballotbox
git add src/components/dashboard/DashboardController.tsx
git commit -m "feat: add onClear, activeLocationId, and geocode fallback to DashboardController"
```

---

## Chunk 2: PollingCard + MapSection

### Task 4: Add onFlyTo prop to PollingCard

**Files:**
- Modify: `src/components/dashboard/PollingCard.tsx`

**What changes:** Add optional `onFlyTo?: () => void` prop. When provided, render a "View on map ↓" link at the bottom of the card.

- [ ] **Step 4.1: Update `PollingCard.tsx`**

First read the current file to find exact line numbers:
```bash
cat -n /Users/avyayakumar/Desktop/ballotbox/src/components/dashboard/PollingCard.tsx
```

Then make two targeted edits:

**Edit 1** — update the `PollingCardProps` interface (around line 9):
```tsx
export interface PollingCardProps {
  location: VotingLocation;
  onFlyTo?: () => void;
}
```

**Edit 2** — update the component signature and add the "View on map" link at the bottom of the card, just before the closing `</Card>` tag:

```tsx
export const PollingCard: React.FC<PollingCardProps> = ({ location, onFlyTo }) => {
```

Add at the bottom of the card, after the phone section and before `</Card>`:
```tsx
      {/* View on map link */}
      {onFlyTo && (
        <button
          type="button"
          onClick={onFlyTo}
          className="text-brand-accent text-sm font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent rounded"
        >
          View on map ↓
        </button>
      )}
```

- [ ] **Step 4.2: Run TypeScript check**

```bash
export NVM_DIR="$HOME/.nvm" && [ -s "$(brew --prefix nvm)/nvm.sh" ] && . "$(brew --prefix nvm)/nvm.sh"
cd /Users/avyayakumar/Desktop/ballotbox && npx tsc --noEmit 2>&1 | grep "PollingCard" | head -10
```

Expected: No errors from `PollingCard.tsx`.

- [ ] **Step 4.3: Commit**

```bash
cd /Users/avyayakumar/Desktop/ballotbox
git add src/components/dashboard/PollingCard.tsx
git commit -m "feat: add onFlyTo prop and 'View on map' link to PollingCard"
```

---

### Task 5: Rewrite MapSection with topographic style, SVG pins, popups, controlled viewport

**Files:**
- Rewrite: `src/components/dashboard/MapSection.tsx`

**What this component does after the rewrite:**
- Uses `mapbox://styles/mapbox/outdoors-v12` (topographic terrain style)
- Controlled `viewState` + `onMove` — re-centers on every new `center` prop change with `transitionDuration: 800`
- When `flyToTarget` prop changes (from card click), smoothly pans to that location
- SVG teardrop pin markers (32×32px), color-coded by type
- Active marker (matching `activeLocationId`) renders at 1.3× scale
- Clicking a marker sets `activeLocationId` and opens a `Popup` for that location
- Only one popup at a time
- Popup contains: name, address, open status, hours, "Get Directions" button
- Layer toggle buttons (Polling / Early / Drop Boxes) remain
- Graceful fallback when `NEXT_PUBLIC_MAPBOX_TOKEN` is undefined

- [ ] **Step 5.1: Write the new `MapSection.tsx`**

Replace the entire contents of `src/components/dashboard/MapSection.tsx` with:

```tsx
'use client';

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import Map, { Marker, Popup, type ViewState } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { cn } from '@/lib/utils';
import type { VotingLocation } from '@/lib/types';

export interface MapSectionProps {
  center: { lat: number; lng: number };
  flyToTarget: { lat: number; lng: number } | null;
  pollingLocations: VotingLocation[];
  earlyVoteSites: VotingLocation[];
  dropOffLocations: VotingLocation[];
  allLocations: VotingLocation[];
  activeLocationId: string | null;
  onActiveLocationChange: (id: string | null) => void;
}

type LayerKey = 'polling' | 'early' | 'dropbox';

const layerConfig: Record<LayerKey, { label: string; color: string; activeClass: string }> = {
  polling: { label: 'Polling Places', color: '#3B82F6', activeClass: 'bg-blue-600 text-white' },
  early:   { label: 'Early Voting',   color: '#22C55E', activeClass: 'bg-green-600 text-white' },
  dropbox: { label: 'Drop Boxes',     color: '#F97316', activeClass: 'bg-orange-500 text-white' },
};

// SVG teardrop pin marker — fill color passed as prop
function PinMarker({ color, scale = 1 }: { color: string; scale?: number }) {
  const size = 32 * scale;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}
      aria-hidden="true"
    >
      <path
        d="M16 2C10.477 2 6 6.477 6 12c0 7.5 10 24 10 24s10-16.5 10-24c0-5.523-4.477-10-10-10z"
        fill={color}
        stroke="white"
        strokeWidth="2"
      />
      <circle cx="16" cy="12" r="4" fill="white" />
    </svg>
  );
}

function getOpenStatus(openTime: string, closeTime: string): string {
  const now = new Date();
  const parseT = (t: string) => {
    const m = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!m) return null;
    let h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    if (m[3].toUpperCase() === 'PM' && h !== 12) h += 12;
    if (m[3].toUpperCase() === 'AM' && h === 12) h = 0;
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, min);
  };
  const open = parseT(openTime);
  const close = parseT(closeTime);
  if (!open || !close) return closeTime || openTime;
  if (now >= open && now < close) return 'Open Now';
  return `Opens ${openTime}`;
}

export const MapSection: React.FC<MapSectionProps> = ({
  center,
  flyToTarget,
  pollingLocations,
  earlyVoteSites,
  dropOffLocations,
  allLocations,
  activeLocationId,
  onActiveLocationChange,
}) => {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const [viewState, setViewState] = useState<Partial<ViewState>>({
    longitude: center.lng,
    latitude: center.lat,
    zoom: 13,
  });

  const [visibleLayers, setVisibleLayers] = useState<Record<LayerKey, boolean>>({
    polling: true,
    early: true,
    dropbox: true,
  });

  // Re-center when a new search result arrives
  useEffect(() => {
    setViewState({
      longitude: center.lng,
      latitude: center.lat,
      zoom: 13,
      // @ts-expect-error transitionDuration is valid at runtime
      transitionDuration: 800,
    });
    onActiveLocationChange(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.lat, center.lng]);

  // Fly to a specific location when triggered by card click
  useEffect(() => {
    if (!flyToTarget) return;
    setViewState((prev) => ({
      ...prev,
      longitude: flyToTarget.lng,
      latitude: flyToTarget.lat,
      zoom: 15,
      // @ts-expect-error transitionDuration is valid at runtime
      transitionDuration: 700,
    }));
  }, [flyToTarget]);

  const toggleLayer = (key: LayerKey) => {
    setVisibleLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleMarkerClick = useCallback((locId: string) => {
    onActiveLocationChange(locId === activeLocationId ? null : locId);
  }, [activeLocationId, onActiveLocationChange]);

  const activeLocation = activeLocationId
    ? allLocations.find((l) => l.id === activeLocationId) ?? null
    : null;

  if (!token) {
    return (
      <div className="h-96 rounded-xl bg-brand-card border border-white/10 flex items-center justify-center">
        <p className="text-brand-muted text-sm text-center px-6">
          Map unavailable — <code className="font-mono">NEXT_PUBLIC_MAPBOX_TOKEN</code> is not configured.
        </p>
      </div>
    );
  }

  const locationsByType: Array<{ loc: VotingLocation; layer: LayerKey }> = [
    ...pollingLocations.map((loc) => ({ loc, layer: 'polling' as LayerKey })),
    ...earlyVoteSites.map((loc) => ({ loc, layer: 'early' as LayerKey })),
    ...dropOffLocations.map((loc) => ({ loc, layer: 'dropbox' as LayerKey })),
  ];

  return (
    <div className="space-y-3">
      {/* Layer toggle buttons */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Toggle map layers">
        {(Object.entries(layerConfig) as [LayerKey, typeof layerConfig[LayerKey]][]).map(([key, cfg]) => (
          <button
            key={key}
            type="button"
            onClick={() => toggleLayer(key)}
            aria-pressed={visibleLayers[key]}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium transition-colors min-h-[48px] border',
              visibleLayers[key]
                ? cfg.activeClass + ' border-transparent'
                : 'bg-brand-card text-brand-muted border-white/10 hover:border-white/30'
            )}
          >
            {cfg.label}
          </button>
        ))}
      </div>

      {/* Map */}
      <div className="h-96 rounded-xl overflow-hidden border border-white/10">
        <Map
          {...viewState}
          onMove={(e) => setViewState(e.viewState)}
          mapboxAccessToken={token}
          style={{ width: '100%', height: '100%' }}
          mapStyle="mapbox://styles/mapbox/outdoors-v12"
        >
          {/* Markers */}
          {locationsByType.map(({ loc, layer }) => {
            if (!visibleLayers[layer] || loc.lat === undefined || loc.lng === undefined) return null;
            const isActive = loc.id === activeLocationId;
            return (
              <Marker
                key={loc.id}
                longitude={loc.lng}
                latitude={loc.lat}
                anchor="bottom"
                onClick={(e) => {
                  e.originalEvent.stopPropagation();
                  handleMarkerClick(loc.id);
                }}
                style={{ cursor: 'pointer' }}
              >
                <PinMarker color={layerConfig[layer].color} scale={isActive ? 1.3 : 1} />
              </Marker>
            );
          })}

          {/* Popup for active location */}
          {activeLocation && activeLocation.lat !== undefined && activeLocation.lng !== undefined && (
            <Popup
              longitude={activeLocation.lng}
              latitude={activeLocation.lat}
              anchor="bottom"
              offset={[0, -36]}
              closeButton={false}
              closeOnClick={false}
              onClose={() => onActiveLocationChange(null)}
              className="ballotbox-popup"
            >
              <div className="bg-[#1c1c1e] rounded-xl p-4 min-w-[200px] max-w-[260px] shadow-xl">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-white font-bold text-sm leading-tight">{activeLocation.name}</h3>
                  <button
                    type="button"
                    onClick={() => onActiveLocationChange(null)}
                    aria-label="Close popup"
                    className="text-gray-400 hover:text-white shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white rounded"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-gray-400 text-xs mb-3">{activeLocation.address}</p>
                {activeLocation.hours[0] && (
                  <p className="text-green-400 text-xs mb-3 font-medium">
                    {getOpenStatus(activeLocation.hours[0].openTime, activeLocation.hours[0].closeTime)}
                    {activeLocation.hours[0].closeTime
                      ? ` · ${activeLocation.hours[0].openTime}–${activeLocation.hours[0].closeTime}`
                      : ` · ${activeLocation.hours[0].openTime}`}
                  </p>
                )}
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(activeLocation.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors min-h-[36px] leading-5"
                >
                  Get Directions ↗
                </a>
              </div>
            </Popup>
          )}
        </Map>
      </div>
    </div>
  );
};

export default MapSection;
```

- [ ] **Step 5.2: Add popup CSS reset to `globals.css`**

First read the current file to confirm where to append:
```bash
cat -n /Users/avyayakumar/Desktop/ballotbox/src/app/globals.css
```

The Mapbox `Popup` component injects its own styles that include a white background and padding. Override them so our custom dark popup shows correctly. Append to the bottom of `src/app/globals.css`:

```css
/* Override Mapbox popup chrome — we render our own styled content */
.mapboxgl-popup-content {
  background: transparent !important;
  padding: 0 !important;
  box-shadow: none !important;
  border-radius: 0 !important;
}
.mapboxgl-popup-tip {
  display: none !important;
}
```

- [ ] **Step 5.3: Run TypeScript check**

```bash
export NVM_DIR="$HOME/.nvm" && [ -s "$(brew --prefix nvm)/nvm.sh" ] && . "$(brew --prefix nvm)/nvm.sh"
cd /Users/avyayakumar/Desktop/ballotbox && npx tsc --noEmit 2>&1 | head -40
```

Expected: Clean (0 errors). If `Popup` import fails, verify `react-map-gl/mapbox` exports it:
```bash
node -e "const m = require('/Users/avyayakumar/Desktop/ballotbox/node_modules/react-map-gl/dist/mapbox.cjs'); console.log(Object.keys(m).includes('Popup'))"
```

- [ ] **Step 5.4: Run build**

```bash
export NVM_DIR="$HOME/.nvm" && [ -s "$(brew --prefix nvm)/nvm.sh" ] && . "$(brew --prefix nvm)/nvm.sh"
cd /Users/avyayakumar/Desktop/ballotbox && npm run build 2>&1 | tail -15
```

Expected: All routes compile successfully. Zero errors.

- [ ] **Step 5.5: Run lint**

```bash
export NVM_DIR="$HOME/.nvm" && [ -s "$(brew --prefix nvm)/nvm.sh" ] && . "$(brew --prefix nvm)/nvm.sh"
cd /Users/avyayakumar/Desktop/ballotbox && npm run lint 2>&1
```

Expected: No errors.

- [ ] **Step 5.6: Commit**

```bash
cd /Users/avyayakumar/Desktop/ballotbox
git add src/components/dashboard/MapSection.tsx src/app/globals.css
git commit -m "feat: rewrite MapSection with outdoors-v12 style, SVG pins, popups, and controlled viewport"
```

---

---

### Task 6: Final smoke test and cleanup

- [ ] **Step 6.1: Start dev server**

```bash
pkill -f "next dev" 2>/dev/null; sleep 1
export NVM_DIR="$HOME/.nvm" && [ -s "$(brew --prefix nvm)/nvm.sh" ] && . "$(brew --prefix nvm)/nvm.sh"
cd /Users/avyayakumar/Desktop/ballotbox && nohup npm run dev > /tmp/ballotbox-dev.log 2>&1 &
sleep 4 && tail -5 /tmp/ballotbox-dev.log
```

Expected: `✓ Ready in XXXms`

- [ ] **Step 6.2: Open and manually verify**

```bash
open http://localhost:3000
```

Check:
- [ ] Address input shows no broken UI on load
- [ ] Typing an address shows Places Autocomplete dropdown (requires real API key in `.env.local`)
- [ ] ✕ button appears after typing, clears correctly
- [ ] GPS button still works
- [ ] After a search: map shows `outdoors-v12` topographic tiles (terrain visible)
- [ ] Markers appear as teardrop pins (if location has coordinates)
- [ ] Clicking a marker opens a popup with name, address, hours, Get Directions link
- [ ] Clicking ✕ on popup closes it
- [ ] Clicking "View on map ↓" on a card pans the map to that marker
- [ ] Layer toggle buttons show/hide marker types

- [ ] **Step 6.3: Run final build check**

```bash
export NVM_DIR="$HOME/.nvm" && [ -s "$(brew --prefix nvm)/nvm.sh" ] && . "$(brew --prefix nvm)/nvm.sh"
cd /Users/avyayakumar/Desktop/ballotbox && npm run build 2>&1 | tail -10
```

Expected: Successful build, no errors.

- [ ] **Step 6.4: Final commit**

```bash
cd /Users/avyayakumar/Desktop/ballotbox
git status --short  # verify only expected files are modified
git add src/components/dashboard/PollingCard.tsx src/components/dashboard/MapSection.tsx src/components/dashboard/DashboardController.tsx src/components/dashboard/AddressInput.tsx src/app/globals.css package.json package-lock.json
git commit -m "feat: address autocomplete + interactive topographic map with popups"
```
