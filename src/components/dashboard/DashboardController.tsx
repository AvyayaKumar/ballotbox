'use client';

import { useState } from 'react';
import type { VoterInfo, GeocodeResult } from '@/lib/types';
import AddressInput from '@/components/dashboard/AddressInput';
import PollingCard from '@/components/dashboard/PollingCard';
import MapSection from '@/components/dashboard/MapSection';
import InfoPanel from '@/components/dashboard/InfoPanel';

export default function DashboardController() {
  const [voterInfo, setVoterInfo] = useState<VoterInfo | null>(null);
  const [geocodeResult, setGeocodeResult] = useState<GeocodeResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleResults = (info: VoterInfo, geo: GeocodeResult) => {
    setVoterInfo(info);
    setGeocodeResult(geo);
  };

  const hasAnyLocations = voterInfo && (
    voterInfo.pollingLocations.length > 0 ||
    voterInfo.earlyVoteSites.length > 0 ||
    voterInfo.dropOffLocations.length > 0
  );

  return (
    <>
      {/* Address Input */}
      <AddressInput
        onResults={handleResults}
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
                <p className="text-gray-500 text-sm mt-2">Try a different address or visit <a href="https://vote.gov" className="text-brand-accent underline" target="_blank" rel="noopener noreferrer">vote.gov</a> for more information.</p>
              </div>
            ) : (
              <>
                {/* Polling locations */}
                {voterInfo.pollingLocations.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                      Your Polling Place
                      {voterInfo.pollingLocations.length > 1 && (
                        <span className="text-sm font-normal text-gray-500 ml-2">({voterInfo.pollingLocations.length} locations)</span>
                      )}
                    </h2>
                    {voterInfo.pollingLocations.map(loc => (
                      <PollingCard key={loc.id} location={loc} />
                    ))}
                  </div>
                )}

                {/* Early vote sites */}
                {voterInfo.earlyVoteSites.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Early Voting Sites</h2>
                    {voterInfo.earlyVoteSites.map(loc => (
                      <PollingCard key={loc.id} location={loc} />
                    ))}
                  </div>
                )}

                {/* Drop-off locations */}
                {voterInfo.dropOffLocations.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Ballot Drop Boxes</h2>
                    {voterInfo.dropOffLocations.map(loc => (
                      <PollingCard key={loc.id} location={loc} />
                    ))}
                  </div>
                )}

                {/* Map */}
                {geocodeResult && (
                  <MapSection
                    center={{ lat: geocodeResult.lat, lng: geocodeResult.lng }}
                    pollingLocations={voterInfo.pollingLocations}
                    earlyVoteSites={voterInfo.earlyVoteSites}
                    dropOffLocations={voterInfo.dropOffLocations}
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
