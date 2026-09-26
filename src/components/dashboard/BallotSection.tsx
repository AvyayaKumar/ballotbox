'use client';

import * as React from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { ElectionsData, UpcomingElection, Contest } from '@/lib/types';

interface BallotSectionProps {
  electionsData: ElectionsData;
  stateName?: string;
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}

function daysUntil(dateStr: string): number {
  const [year, month, day] = dateStr.split('-').map(Number);
  const target = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

function ContestList({ contests }: { contests: Contest[] }) {
  if (contests.length === 0) return null;
  return (
    <ul className="mt-2 space-y-1 pl-1">
      {contests.map((c, i) => {
        const title = c.office ?? c.referendumTitle ?? 'Ballot Measure';
        const isReferendum = c.type === 'Referendum' || c.type === 'Ballot Measure';
        const levelLabel = c.level
          ? c.level.replace('administrativeArea1', 'Statewide').replace('country', 'Federal').replace('regional', 'Regional').replace('administrativeArea', 'Local')
          : null;
        const namedCandidates = (c.candidates ?? []).filter((cand) => cand.name && !cand.name.includes('term-limited'));
        return (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand-accent shrink-0" />
            <span>
              <span className="font-medium">{title}</span>
              {levelLabel && (
                <span className="ml-1.5 text-xs text-gray-400">· {isReferendum ? 'Ballot Measure' : levelLabel}</span>
              )}
              {namedCandidates.length > 0 && (
                <span className="ml-1 text-gray-500">
                  — {namedCandidates.map((cand) => cand.name + (cand.party ? ` (${cand.party})` : '')).join(', ')}
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function ElectionRow({ election }: { election: UpcomingElection }) {
  const days = daysUntil(election.date);
  const isToday = days === 0;
  const isSoon = days > 0 && days <= 7;

  return (
    <div className="py-4 border-b border-gray-100 last:border-0">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-gray-900">{election.name}</h3>
            {isToday && <Badge variant="success">Today</Badge>}
            {isSoon && !isToday && <Badge variant="warning">In {days} day{days !== 1 ? 's' : ''}</Badge>}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{formatDate(election.date)}</p>
          {election.contests.length > 0 && (
            <ContestList contests={election.contests} />
          )}
          {election.contests.length === 0 && (
            <p className="mt-1 text-xs text-gray-400 italic">
              Ballot details not yet available — check your state election site for races on this ballot.
            </p>
          )}
        </div>
        <span className="text-sm text-gray-400 shrink-0 pt-0.5">
          {isToday ? 'Today' : `${days} day${days !== 1 ? 's' : ''} away`}
        </span>
      </div>
    </div>
  );
}

export const BallotSection: React.FC<BallotSectionProps> = ({ electionsData, stateName }) => {
  const { upcoming, ballotpediaUrl, stateElectionUrl } = electionsData;

  const futureElections = upcoming.filter((e) => daysUntil(e.date) >= 0);
  const withinMonth = futureElections.filter((e) => daysUntil(e.date) <= 30);

  // Show elections within 30 days; if none, fall back to the single next upcoming election
  const electionsToShow: UpcomingElection[] =
    withinMonth.length > 0
      ? withinMonth
      : futureElections.length > 0
      ? [futureElections[0]]
      : [];

  const hasActiveToday = futureElections.some((e) => daysUntil(e.date) === 0);

  const headingText =
    withinMonth.length > 0
      ? 'Elections in the next month:'
      : futureElections.length > 0
      ? 'Next upcoming election:'
      : null;

  return (
    <div className="space-y-4">
      {/* Election day banner */}
      {hasActiveToday && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-2xl">🗳️</span>
          <div>
            <p className="font-bold text-green-800">Election Day is today!</p>
            <p className="text-sm text-green-700">Polls are open — find your location above and go vote.</p>
          </div>
        </div>
      )}

      <Card variant="light">
        <h2 className="text-xl font-bold text-gray-900 mb-1">
          Upcoming Elections
          {stateName && <span className="text-base font-normal text-gray-500 ml-2">· {stateName}</span>}
        </h2>

        {headingText && (
          <p className="text-sm text-gray-500 mb-3">{headingText}</p>
        )}

        {electionsToShow.length > 0 ? (
          <div>
            {electionsToShow.map((e) => (
              <ElectionRow key={e.id} election={e} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic py-2">
            No upcoming elections found in our database for your area. Check your state&apos;s official election site below.
          </p>
        )}

        {/* External links */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
          <a
            href={ballotpediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            📋 Ballotpedia
          </a>
          {stateElectionUrl && (
            <a
              href={stateElectionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              🏛️ {stateName ?? 'State'} Election Site
            </a>
          )}
          <a
            href="https://vote.gov"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            🇺🇸 Vote.gov
          </a>
        </div>
      </Card>
    </div>
  );
};

export default BallotSection;
