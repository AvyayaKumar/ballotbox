'use client';

import { useState, useCallback, useRef } from 'react';
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

  // flyToTarget MUST be declared before handleFlyTo to avoid temporal dead zone ReferenceError.
  const [flyToTarget, setFlyToTarget] = useState<{ lat: number; lng: number } | null>(null);

  const searchGenerationRef = useRef(0);

  const handleResults = useCallback(async (info: VoterInfo, geo: GeocodeResult) => {
    // Increment generation so any in-flight async tail from a previous search can detect staleness
    const generation = ++searchGenerationRef.current;

    setVoterInfo(info);
    setGeocodeResult(geo);
    setActiveLocationId(null);
    setFlyToTarget(null);

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

    // Bail out if a newer search has superseded this one
    if (searchGenerationRef.current !== generation) return;

    setVoterInfo({
      ...info,
      pollingLocations: filledPolling,
      earlyVoteSites: filledEarly,
      dropOffLocations: filledDropbox,
    });
  }, []);

  const handleClear = useCallback(() => {
    setVoterInfo(null);
    setGeocodeResult(null);
    setActiveLocationId(null);
    setFlyToTarget(null);
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
