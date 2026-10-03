'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { ShieldCheck, RefreshCw } from 'lucide-react';
import type { ElectionsResponse, GeocodeResult } from '@/lib/types';
import AddressInput from '@/components/dashboard/AddressInput';
import { ElectionCard } from '@/components/dashboard/ElectionCard';
import { LinkList } from '@/components/dashboard/LinkList';
import InfoPanel from '@/components/dashboard/InfoPanel';
import { cn } from '@/lib/utils';

function formatFetchedAt(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default function DashboardController() {
  const [data, setData] = useState<ElectionsResponse | null>(null);
  const [geocode, setGeocode] = useState<GeocodeResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const resultsRef = useRef<HTMLElement>(null);

  // Bring the results into view once they arrive; the hero otherwise fills the first screen.
  useEffect(() => {
    if (data) resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [data]);

  const handleResults = useCallback((elections: ElectionsResponse, geo: GeocodeResult) => {
    setData(elections);
    setGeocode(geo);
  }, []);

  const handleClear = useCallback(() => {
    setData(null);
    setGeocode(null);
  }, []);

  const count = data?.elections.length ?? 0;
  const shownAddress = data?.normalizedAddress ?? geocode?.formattedAddress ?? data?.address;
  const firstWithState = data?.elections.find((e) => e.state);

  return (
    <>
      {/* Hero + search */}
      <section className={cn('bg-brand-dark flex flex-col justify-center', data ? 'py-8' : 'min-h-screen')}>
        <div className="max-w-3xl mx-auto px-6 py-24 w-full">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-muted mb-4">Nonpartisan · Official data only</p>
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Every election on your ballot. Where to vote in each.
          </h1>
          <p className="text-xl text-brand-muted mb-10 max-w-xl">
            Enter your address. Ballotbox checks with election officials, live, for every election currently scheduled
            for you, from local school board to U.S. Senate, and shows your polling places, early voting sites, drop
            boxes, and what&apos;s on your ballot.
          </p>
          <AddressInput onResults={handleResults} onClear={handleClear} isLoading={isLoading} setIsLoading={setIsLoading} />
        </div>
      </section>

      {data && geocode && (
        <section ref={resultsRef} className="bg-brand-light py-16 scroll-mt-16" aria-live="polite">
          <div className="max-w-3xl mx-auto px-6 space-y-8">
            {/* Summary */}
            <header>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Your elections</p>
              <h2 className="mt-1 text-3xl font-bold text-gray-900">
                {count === 0 ? 'No elections published yet' : `${count} election${count === 1 ? '' : 's'} on your calendar`}
              </h2>
              {shownAddress && <p className="mt-1 text-gray-600">{shownAddress}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-green-600" aria-hidden="true" />
                  {data.source.name}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  Loaded live at {formatFetchedAt(data.fetchedAt)}; nothing is stored
                </span>
              </div>
            </header>

            {count === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  Election officials have not published any upcoming election for this address through the Voting Information
                  Project yet. That usually means no election is scheduled soon, or officials haven&apos;t loaded their data; local
                  and special elections often appear only a few weeks out. The official sources below are always current.
                </p>
                <LinkList links={[...data.learnMore.filter((l) => l.official), ...data.nationalLinks]} />
              </div>
            ) : (
              <div className="space-y-6">
                {data.elections.map((e, i) => (
                  <ElectionCard
                    key={`${data.fetchedAt}-${e.id}`}
                    election={e}
                    center={{ lat: geocode.lat, lng: geocode.lng }}
                    stateLinks={data.stateLinks}
                    learnMore={data.learnMore}
                    defaultOpen={i === 0}
                  />
                ))}
              </div>
            )}

            {/* General guidance */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Before you go</h3>
              <InfoPanel state={firstWithState?.state} stateLinks={data.stateLinks} />
            </div>

            {count > 0 && (
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-widest text-gray-500 mb-3">National resources</h3>
                <LinkList links={data.nationalLinks} compact />
              </div>
            )}
          </div>
        </section>
      )}
    </>
  );
}
