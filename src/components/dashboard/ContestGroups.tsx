'use client';

import * as React from 'react';
import { useState } from 'react';
import { ChevronDown, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { Contest, ContestGroup } from '@/lib/types';
import { cn } from '@/lib/utils';

export const CONTEST_GROUP_META: Record<ContestGroup, { label: string; order: number }> = {
  federal: { label: 'Federal', order: 0 },
  state: { label: 'State', order: 1 },
  county: { label: 'County', order: 2 },
  local: { label: 'City & town', order: 3 },
  school: { label: 'School board', order: 4 },
  special: { label: 'Special districts', order: 5 },
  judicial: { label: 'Judicial', order: 6 },
  other: { label: 'Other offices', order: 7 },
  measure: { label: 'Ballot measures', order: 8 },
};

export function groupContests(contests: Contest[]): Array<{ group: ContestGroup; label: string; contests: Contest[] }> {
  const buckets = new Map<ContestGroup, Contest[]>();
  for (const c of contests) {
    const list = buckets.get(c.group) ?? [];
    list.push(c);
    buckets.set(c.group, list);
  }
  return [...buckets.entries()]
    .sort((a, b) => CONTEST_GROUP_META[a[0]].order - CONTEST_GROUP_META[b[0]].order)
    .map(([group, list]) => ({ group, label: CONTEST_GROUP_META[group].label, contests: list }));
}

function contestTypeLabel(type: string): string | null {
  const t = type.toLowerCase();
  if (t === 'general') return null; // the default; no badge needed
  if (t.includes('primary')) return 'Primary';
  if (t.includes('run')) return 'Runoff';
  if (t.includes('special')) return 'Special';
  if (t.includes('retention')) return 'Retention';
  if (t.includes('referendum') || t.includes('ballot')) return null;
  return type;
}

function formatDistrict(c: Contest): string | null {
  const name = c.district?.name?.trim();
  if (!name) return null;
  // Officials often repeat the district in the title ("House of Representatives (4th District)"); avoid echoing it.
  if (c.title.toLowerCase().includes(name.toLowerCase())) return null;
  if (/^\d+$/.test(name)) return `District ${parseInt(name, 10)}`;
  return name;
}

const Candidates: React.FC<{ contest: Contest }> = ({ contest }) => {
  if (contest.candidates.length === 0) {
    return <p className="mt-1 text-sm text-gray-500 italic">Candidate list not yet published by election officials.</p>;
  }
  return (
    <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
      {contest.candidates.map((cand, i) => (
        <li key={`${cand.name}-${i}`} className="flex items-start gap-2 text-sm">
          <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" aria-hidden="true" />
          <span className="min-w-0">
            <span className="text-gray-900">{cand.name}</span>
            {cand.party && <span className="text-gray-500"> · {cand.party}</span>}
            {cand.candidateUrl && (
              <a
                href={cand.candidateUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 inline-flex items-center gap-1 text-xs font-medium text-brand-accent hover:underline"
              >
                Candidate site <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
};

const Measure: React.FC<{ contest: Contest }> = ({ contest }) => {
  const [open, setOpen] = useState(false);
  const r = contest.referendum;
  if (!r) return null;
  const longText = r.text ?? r.brief;
  return (
    <div className="mt-1 text-sm">
      {r.subtitle && <p className="text-gray-600">{r.subtitle}</p>}
      {longText && (
        <>
          <p className={cn('text-gray-700 mt-1 leading-relaxed', !open && 'line-clamp-3')}>{longText}</p>
          {longText.length > 220 && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand-accent hover:underline"
            >
              {open ? 'Show less' : 'Read the full text'}
              <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} aria-hidden="true" />
            </button>
          )}
        </>
      )}
      {open && r.proStatement && (
        <p className="mt-2 text-gray-700"><span className="font-medium">Argument for:</span> {r.proStatement}</p>
      )}
      {open && r.conStatement && (
        <p className="mt-1 text-gray-700"><span className="font-medium">Argument against:</span> {r.conStatement}</p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {r.ballotResponses && r.ballotResponses.length > 0 && (
          <span className="text-xs text-gray-500">Options: {r.ballotResponses.join(' / ')}</span>
        )}
        {r.passageThreshold && <span className="text-xs text-gray-500">Passes with {r.passageThreshold}</span>}
        {r.url && (
          <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-brand-accent hover:underline">
            Official measure text <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        )}
      </div>
    </div>
  );
};

const ContestRow: React.FC<{ contest: Contest }> = ({ contest }) => {
  const typeLabel = contestTypeLabel(contest.type);
  const district = formatDistrict(contest);
  const seats = contest.numberElected && contest.numberElected > 1 ? `Vote for up to ${contest.numberVotingFor ?? contest.numberElected}` : null;
  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="font-semibold text-gray-900">{contest.title}</h4>
        {typeLabel && <Badge variant="warning" className="bg-amber-50 text-amber-700 border-amber-200">{typeLabel}</Badge>}
        {contest.special && <Badge variant="neutral" className="bg-gray-100 text-gray-600 border-gray-200">Special election</Badge>}
        {contest.primaryParty && <Badge variant="neutral" className="bg-gray-100 text-gray-600 border-gray-200">{contest.primaryParty} primary</Badge>}
      </div>
      {(district || seats || contest.electorateSpecifications) && (
        <p className="text-xs text-gray-500 mt-0.5">
          {[district, seats, contest.electorateSpecifications].filter(Boolean).join(' · ')}
        </p>
      )}
      {contest.group === 'measure' ? <Measure contest={contest} /> : <Candidates contest={contest} />}
    </li>
  );
};

export interface ContestGroupsProps {
  contests: Contest[];
}

/** Every contest on the ballot, grouped from federal offices down to school boards and measures. */
export const ContestGroups: React.FC<ContestGroupsProps> = ({ contests }) => {
  const groups = groupContests(contests);
  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g.group} aria-labelledby={`group-${g.group}-${contests[0]?.id ?? ''}`}>
          <div className="flex items-center gap-2 mb-2">
            <h3 id={`group-${g.group}-${contests[0]?.id ?? ''}`} className="text-xs font-semibold uppercase tracking-widest text-gray-500">
              {g.label}
            </h3>
            <span className="text-xs text-gray-400">{g.contests.length}</span>
          </div>
          <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100 bg-white px-4 py-1">
            {g.contests.map((c) => (
              <ContestRow key={c.id} contest={c} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
};

export default ContestGroups;
