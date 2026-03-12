'use client';

import * as React from 'react';
import { Accordion } from '@/components/ui/Accordion';
import type { VoterInfo } from '@/lib/types';

export interface InfoPanelProps {
  state?: VoterInfo['state'];
}

const safeUrl = (url: string | undefined): string | undefined =>
  url?.startsWith('https://') ? url : undefined;

export const InfoPanel: React.FC<InfoPanelProps> = ({ state }) => {
  const eab = state?.electionAdministrationBody;

  const correspondenceAddr = eab?.correspondenceAddress;
  const physicalAddr = eab?.physicalAddress;

  const formatAddress = (
    addr: { locationName?: string; line1?: string; city?: string; state?: string; zip?: string } | undefined
  ): string | null => {
    if (!addr) return null;
    const parts = [addr.locationName, addr.line1, addr.city, addr.state, addr.zip].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  };

  return (
    <div className="space-y-3">
      {/* 1. ID Requirements */}
      <Accordion title="ID Requirements — What ID do you need to vote?">
        <div className="space-y-2 text-sm leading-relaxed">
          <p>
            ID requirements vary by state. Common accepted forms include:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Driver&apos;s license or state-issued ID</li>
            <li>U.S. passport</li>
            <li>Military ID</li>
            <li>Utility bill, bank statement, or government document showing name and address</li>
          </ul>
          <p className="text-yellow-400/80">
            Note: Requirements differ by state. Check your local election authority for the most accurate information.
          </p>
        </div>
      </Accordion>

      {/* 2. Key Dates */}
      <Accordion title="Key Dates — Important deadlines">
        <div className="space-y-2 text-sm leading-relaxed">
          {safeUrl(state?.electionAdministrationBody?.electionInfoUrl) ? (
            <p>
              For upcoming election dates and deadlines, visit your state&apos;s official election information page:&nbsp;
              <a
                href={safeUrl(state?.electionAdministrationBody?.electionInfoUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 underline hover:text-blue-300"
              >
                {state?.electionAdministrationBody?.electionInfoUrl}
              </a>
            </p>
          ) : (
            <p>Contact your local election office for upcoming election dates and registration deadlines.</p>
          )}
          <ul className="list-disc list-inside space-y-1">
            <li>Voter registration deadline (varies by state — typically 15–30 days before election)</li>
            <li>Early voting period (if applicable)</li>
            <li>Mail-in ballot request deadline</li>
            <li>Election Day</li>
          </ul>
        </div>
      </Accordion>

      {/* 3. Accessibility */}
      <Accordion title="Accessibility — Accessible voting options">
        <div className="space-y-2 text-sm leading-relaxed">
          <p>All polling places are required by federal law to be physically accessible to voters with disabilities. Available options may include:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Accessible parking and ramps</li>
            <li>Curbside voting — a poll worker will bring a ballot to your car if you cannot enter the building</li>
            <li>Accessible voting machines with audio and large-print options</li>
            <li>Assistance from a person of your choice (with some exceptions)</li>
            <li>Absentee / mail-in voting as an alternative</li>
          </ul>
          <p>Contact your polling place in advance to confirm specific accommodations.</p>
        </div>
      </Accordion>

      {/* 4. Transit & Parking */}
      <Accordion title="Transit & Parking — Getting to your polling place">
        <div className="space-y-2 text-sm leading-relaxed">
          <ul className="list-disc list-inside space-y-1">
            <li>Many transit agencies offer free or discounted rides on Election Day — check with your local provider</li>
            <li>Rideshare programs (Lyft, Uber) sometimes offer Election Day discounts</li>
            <li>Street parking near polling places is often unrestricted on Election Day</li>
            <li>Plan for potential lines — allow extra travel time during peak hours (morning and evening)</li>
            <li>If you move while in line before polls close, you are entitled to vote</li>
          </ul>
        </div>
      </Accordion>

      {/* 5. Election Office Contact */}
      <Accordion title="Election Office Contact">
        {eab ? (
          <div className="space-y-3 text-sm leading-relaxed">
            {eab.name && (
              <p className="text-white font-medium">{eab.name}</p>
            )}
            {formatAddress(physicalAddr) && (
              <div>
                <p className="text-white/60 text-xs uppercase tracking-wide mb-1">Physical Address</p>
                <p>{formatAddress(physicalAddr)}</p>
              </div>
            )}
            {formatAddress(correspondenceAddr) && formatAddress(correspondenceAddr) !== formatAddress(physicalAddr) && (
              <div>
                <p className="text-white/60 text-xs uppercase tracking-wide mb-1">Mailing Address</p>
                <p>{formatAddress(correspondenceAddr)}</p>
              </div>
            )}
            {safeUrl(eab.electionInfoUrl) && (
              <a
                href={safeUrl(eab.electionInfoUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-blue-400 underline hover:text-blue-300"
              >
                Election Information
              </a>
            )}
            {safeUrl(eab.votingLocationFinderUrl) && (
              <a
                href={safeUrl(eab.votingLocationFinderUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-blue-400 underline hover:text-blue-300 ml-4"
              >
                Find Voting Locations
              </a>
            )}
            {safeUrl(eab.ballotInfoUrl) && (
              <a
                href={safeUrl(eab.ballotInfoUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-blue-400 underline hover:text-blue-300 ml-4"
              >
                Ballot Information
              </a>
            )}
          </div>
        ) : (
          <p className="text-sm">
            Contact your local election office for assistance. You can find your local office via{' '}
            <a
              href="https://www.usa.gov/election-office"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 underline hover:text-blue-300"
            >
              USA.gov
            </a>.
          </p>
        )}
      </Accordion>
    </div>
  );
};

export default InfoPanel;
