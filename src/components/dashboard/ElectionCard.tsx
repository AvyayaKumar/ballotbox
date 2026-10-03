'use client';

import * as React from 'react';
import { useState, useCallback, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { CalendarDays, ChevronDown, Mail, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { ElectionBallot, GeocodeResult, LatLng, LinkItem, StateLinks, VotingLocation } from '@/lib/types';
import type { MapSectionProps } from './MapSection';
import { LocationGroup } from './LocationGroup';
import { ContestGroups } from './ContestGroups';
import { ElectionOffice } from './ElectionOffice';
import { LinkList } from './LinkList';
import { cn } from '@/lib/utils';

// Leaflet touches the DOM at import time; keep it out of SSR.
const MapSection = dynamic<MapSectionProps>(() => import('./MapSection').then((m) => m.MapSection), { ssr: false });

export function formatElectionDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

export function daysUntil(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

const scopeLabel: Record<ElectionBallot['scope'], string> = {
  national: 'Nationwide',
  state: 'Statewide',
  local: 'Local',
};

// Fill coordinates for the rare location officials publish without them, via our server-side geocoder.
async function fillMissingCoords(locations: VotingLocation[]): Promise<VotingLocation[]> {
  const results = await Promise.allSettled(
    locations.map(async (loc) => {
      if ((loc.lat !== undefined && loc.lng !== undefined) || !loc.address) return loc;
      const res = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: loc.address }),
      });
      if (!res.ok) return loc;
      const geo = (await res.json()) as GeocodeResult;
      return { ...loc, lat: geo.lat, lng: geo.lng };
    })
  );
  return results.map((r, i) => (r.status === 'fulfilled' ? r.value : locations[i]));
}

const Section: React.FC<{ id: string; title: string; subtitle?: string; children: React.ReactNode }> = ({ id, title, subtitle, children }) => (
  <section aria-labelledby={id} className="pt-6 border-t border-gray-100 first:border-0 first:pt-0">
    <h3 id={id} className="text-xl font-bold text-gray-900">{title}</h3>
    {subtitle && <p className="text-sm text-gray-500 mt-0.5 mb-4">{subtitle}</p>}
    {!subtitle && <div className="mb-4" />}
    {children}
  </section>
);

const Notice: React.FC<{ tone: 'info' | 'warn'; children: React.ReactNode }> = ({ tone, children }) => (
  <div
    className={cn(
      'rounded-xl border px-4 py-3 text-sm leading-relaxed',
      tone === 'info' ? 'bg-blue-50 border-blue-100 text-blue-900' : 'bg-amber-50 border-amber-200 text-amber-900'
    )}
  >
    {children}
  </div>
);

export interface ElectionCardProps {
  election: ElectionBallot;
  center: LatLng;
  stateLinks?: StateLinks;
  learnMore: LinkItem[];
  defaultOpen?: boolean;
}

/** One election: when it is, where this voter can vote in it, what is on their ballot, and who runs it. */
export const ElectionCard: React.FC<ElectionCardProps> = ({ election, center, stateLinks, learnMore, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  // Officials publish coordinates for nearly every location; the rare gaps are filled asynchronously.
  const [filled, setFilled] = useState<{ polling: VotingLocation[]; early: VotingLocation[]; dropbox: VotingLocation[] } | null>(null);
  const [activeLocationId, setActiveLocationId] = useState<string | null>(null);
  const [flyToTarget, setFlyToTarget] = useState<LatLng | null>(null);

  useEffect(() => {
    const all = [...election.pollingLocations, ...election.earlyVoteSites, ...election.dropOffLocations];
    if (!all.some((l) => l.lat === undefined || l.lng === undefined)) return;
    let cancelled = false;
    Promise.all([
      fillMissingCoords(election.pollingLocations),
      fillMissingCoords(election.earlyVoteSites),
      fillMissingCoords(election.dropOffLocations),
    ]).then(([polling, early, dropbox]) => {
      if (!cancelled) setFilled({ polling, early, dropbox });
    });
    return () => {
      cancelled = true;
    };
  }, [election]);

  const polling = filled?.polling ?? election.pollingLocations;
  const early = filled?.early ?? election.earlyVoteSites;
  const dropbox = filled?.dropbox ?? election.dropOffLocations;

  const handleFlyTo = useCallback((id: string, lat: number, lng: number) => {
    setActiveLocationId(id);
    setFlyToTarget({ lat, lng });
  }, []);

  const allLocations = useMemo(() => [...polling, ...early, ...dropbox], [polling, early, dropbox]);
  const mappable = allLocations.some((l) => l.lat !== undefined && l.lng !== undefined);
  const totalLocations = election.locationTotals.polling + election.locationTotals.early + election.locationTotals.dropbox;

  const days = daysUntil(election.electionDay);
  const isToday = days === 0;
  const isPast = days < 0;
  const countdown = isToday ? 'Today' : isPast ? 'Completed' : days === 1 ? 'Tomorrow' : `In ${days} days`;
  const countdownVariant: 'success' | 'warning' | 'neutral' = isToday ? 'success' : days > 0 && days <= 14 ? 'warning' : 'neutral';

  const finderUrl =
    election.localJurisdiction?.body?.votingLocationFinderUrl ??
    election.state?.body?.votingLocationFinderUrl ??
    stateLinks?.electionWebsite;
  const ballotUrl =
    election.localJurisdiction?.body?.ballotInfoUrl ??
    election.state?.body?.ballotInfoUrl ??
    stateLinks?.checkRegistration;
  const officialSources = election.sources.filter((s) => s.official);
  const headingId = `election-${election.id}-heading`;

  return (
    <article className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden" aria-labelledby={headingId}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={`election-${election.id}-body`}
        className="w-full text-left p-6 hover:bg-gray-50/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-inset"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <Badge variant={countdownVariant} className={cn(countdownVariant === 'neutral' && 'bg-gray-100 text-gray-700 border-gray-200', countdownVariant === 'warning' && 'bg-amber-50 text-amber-700 border-amber-200', countdownVariant === 'success' && 'bg-green-50 text-green-700 border-green-200')}>
                {countdown}
              </Badge>
              <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">{scopeLabel[election.scope]}</span>
              {election.mailOnly && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700">
                  <Mail className="h-3.5 w-3.5" aria-hidden="true" /> Conducted by mail
                </span>
              )}
            </div>
            <h2 id={headingId} className="text-2xl font-bold text-gray-900 leading-tight">{election.name}</h2>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-600">
              <CalendarDays className="h-4 w-4 text-gray-400" aria-hidden="true" />
              {formatElectionDate(election.electionDay)}
            </p>
            <p className="mt-2 text-sm text-gray-500">
              {election.hasVotingData
                ? `${totalLocations} voting location${totalLocations === 1 ? '' : 's'} · ${election.contests.length} contest${election.contests.length === 1 ? '' : 's'} on your ballot`
                : election.error
                ? 'Lookup failed for this election'
                : 'Officials have not published your locations or ballot for this election yet'}
            </p>
          </div>
          <ChevronDown className={cn('h-6 w-6 text-gray-400 shrink-0 mt-1 transition-transform duration-300', open && 'rotate-180')} aria-hidden="true" />
        </div>
      </button>

      {open && (
        <div id={`election-${election.id}-body`} className="px-6 pb-6 space-y-6">
          {officialSources.length > 0 && (
            <p className="flex items-center gap-1.5 text-xs text-gray-500">
              <ShieldCheck className="h-4 w-4 text-green-600" aria-hidden="true" />
              Official data published by election officials via {officialSources.map((s) => s.name).join(', ')}.
            </p>
          )}

          {election.error && (
            <Notice tone="warn">
              <span className="inline-flex items-center gap-1.5 font-medium"><AlertTriangle className="h-4 w-4" aria-hidden="true" /> {election.error}</span>
            </Notice>
          )}

          {/* Where to vote */}
          <Section id={`election-${election.id}-where`} title="Where to vote" subtitle="Locations assigned to your address by election officials, nearest first.">
            {election.mailOnly && (
              <Notice tone="info">
                <span className="font-medium">This election is conducted by mail for your address.</span> Every registered voter is mailed a ballot. Return it by mail or at an official drop box or voting center below.
              </Notice>
            )}
            {totalLocations === 0 ? (
              <div className="space-y-3 mt-3">
                {!election.mailOnly && (
                  <Notice tone="warn">
                    Election officials have not published polling locations for this address yet. They usually appear in the weeks before Election Day. Until then, use the official finder below.
                  </Notice>
                )}
                <LinkList
                  compact
                  links={[
                    ...(finderUrl ? [{ label: `Official location finder${stateLinks ? ` · ${stateLinks.name}` : ''}`, href: finderUrl, official: true }] : []),
                    ...(stateLinks && stateLinks.electionWebsite !== finderUrl
                      ? [{ label: `${stateLinks.name} election website`, href: stateLinks.electionWebsite, official: true }]
                      : []),
                  ]}
                />
              </div>
            ) : (
              <div className="space-y-8 mt-3">
                <LocationGroup
                  title="Election Day polling place"
                  description="Vote here on Election Day."
                  locations={polling}
                  total={election.locationTotals.polling}
                  finderUrl={finderUrl}
                  onFlyTo={handleFlyTo}
                />
                <LocationGroup
                  title="Early voting"
                  description="Vote before Election Day at any of these sites."
                  locations={early}
                  total={election.locationTotals.early}
                  finderUrl={finderUrl}
                  onFlyTo={handleFlyTo}
                />
                <LocationGroup
                  title="Ballot drop boxes"
                  description="Return a mail ballot without postage."
                  locations={dropbox}
                  total={election.locationTotals.dropbox}
                  finderUrl={finderUrl}
                  onFlyTo={handleFlyTo}
                />
                {mappable && (
                  <MapSection
                    center={center}
                    flyToTarget={flyToTarget}
                    pollingLocations={polling}
                    earlyVoteSites={early}
                    dropOffLocations={dropbox}
                    activeLocationId={activeLocationId}
                    onActiveLocationChange={setActiveLocationId}
                    allLocations={allLocations}
                  />
                )}
              </div>
            )}
          </Section>

          {/* What's on the ballot */}
          <Section
            id={`election-${election.id}-ballot`}
            title="What's on your ballot"
            subtitle="Every contest officials have published for your address, from federal offices to school boards and local measures."
          >
            {election.contests.length > 0 ? (
              <ContestGroups contests={election.contests} />
            ) : (
              <div className="space-y-3">
                <Notice tone="warn">
                  Election officials have not published the contests for your address yet. Your official sample ballot will list every race, including local and school board seats.
                </Notice>
                <LinkList
                  compact
                  links={ballotUrl ? [{ label: 'Your official ballot & registration lookup', href: ballotUrl, official: true }] : []}
                />
              </div>
            )}
          </Section>

          {/* Learn more */}
          <Section
            id={`election-${election.id}-learn`}
            title="Learn about who and what you're voting on"
            subtitle="Ballotbox does not endorse anyone. Start with official sources; nonpartisan guides are labeled."
          >
            <LinkList links={learnMore} />
          </Section>

          {/* Who runs this election */}
          {(election.state || election.localJurisdiction) && (
            <Section id={`election-${election.id}-office`} title="Who runs this election" subtitle="Contact these offices to confirm anything before you vote.">
              <ElectionOffice state={election.state} local={election.localJurisdiction} />
            </Section>
          )}
        </div>
      )}
    </article>
  );
};

export default ElectionCard;
