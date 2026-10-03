'use client';

import * as React from 'react';
import { Accordion } from '@/components/ui/Accordion';
import type { Jurisdiction, StateLinks } from '@/lib/types';

export interface InfoPanelProps {
  state?: Jurisdiction;
  stateLinks?: StateLinks;
}

/** General voting guidance that applies regardless of election, pointed at the voter's official state resources. */
export const InfoPanel: React.FC<InfoPanelProps> = ({ state, stateLinks }) => {
  const infoUrl = state?.body?.electionInfoUrl ?? stateLinks?.electionWebsite;
  const absenteeUrl = state?.body?.absenteeVotingInfoUrl;
  const stateName = state?.name ?? stateLinks?.name ?? 'your state';

  const officialLink = (href: string | undefined, label: string) =>
    href ? (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline hover:text-blue-300">
        {label}
      </a>
    ) : null;

  return (
    <div className="space-y-3">
      <Accordion title="ID requirements: what to bring">
        <div className="space-y-2 text-sm leading-relaxed">
          <p>ID rules are set by each state. Commonly accepted documents include:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Driver&apos;s license or state-issued ID</li>
            <li>U.S. passport or military ID</li>
            <li>A utility bill, bank statement, or government document showing your name and address (some states)</li>
          </ul>
          <p className="text-yellow-400/80">
            Confirm the exact rules for {stateName} on the {officialLink(infoUrl, 'official election website') ?? 'official election website'}.
          </p>
        </div>
      </Accordion>

      <Accordion title="Key deadlines">
        <div className="space-y-2 text-sm leading-relaxed">
          <p>
            Registration, mail-ballot request, and return deadlines differ by state and election.
            {infoUrl && <> The authoritative calendar is the {officialLink(infoUrl, `${stateName} election website`)}.</>}
            {absenteeUrl && <> Mail and absentee rules: {officialLink(absenteeUrl, 'absentee voting information')}.</>}
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Voter registration deadline (often 15 to 30 days before Election Day; some states allow same-day registration)</li>
            <li>Early voting period, where offered</li>
            <li>Mail-ballot request deadline and return deadline (postmarked vs. received varies)</li>
            <li>Election Day poll hours</li>
          </ul>
        </div>
      </Accordion>

      <Accordion title="Accessibility">
        <div className="space-y-2 text-sm leading-relaxed">
          <p>Federal law requires polling places to be accessible to voters with disabilities. Options usually include:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Accessible parking, entrances, and voting booths</li>
            <li>Curbside voting if you cannot enter the building</li>
            <li>Accessible voting machines with audio and large-print options</li>
            <li>Help from a person of your choice (except your employer or union representative)</li>
            <li>Voting by mail as an alternative</li>
          </ul>
          <p>Contact your local election office in advance to arrange specific accommodations.</p>
        </div>
      </Accordion>

      <Accordion title="Getting there">
        <div className="space-y-2 text-sm leading-relaxed">
          <ul className="list-disc list-inside space-y-1">
            <li>Many transit agencies offer free or discounted rides on Election Day; check your local provider</li>
            <li>Lines are shortest mid-morning and mid-afternoon</li>
            <li>If you are in line when polls close, you have the right to vote</li>
            <li>Election Day voters must use their assigned polling place; early voting sites and drop boxes usually accept any voter in the county</li>
          </ul>
        </div>
      </Accordion>
    </div>
  );
};

export default InfoPanel;
