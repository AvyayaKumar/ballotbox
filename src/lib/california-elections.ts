/**
 * Curated upcoming California election data.
 * Source: California Secretary of State — sos.ca.gov/elections/upcoming-elections
 * Updated manually when new elections are scheduled or candidate lists change.
 */

import type { UpcomingElection } from './types';

// Bay Area county codes for hyperlocal filtering
export const BAY_AREA_COUNTIES = [
  'Alameda', 'Contra Costa', 'Marin', 'Napa', 'San Francisco',
  'San Mateo', 'Santa Clara', 'Solano', 'Sonoma',
];

export const CALIFORNIA_UPCOMING_ELECTIONS: UpcomingElection[] = [
  {
    id: 'ca-2026-primary',
    name: 'California Direct Primary Election',
    date: '2026-06-02',
    stateCode: 'CA',
    contests: [
      {
        type: 'General',
        office: 'Governor of California',
        level: 'administrativeArea1',
        candidates: [
          { name: 'Gavin Newsom', party: '' }, // term-limited; open seat
        ],
      },
      {
        type: 'General',
        office: 'United States Senator (Full Term)',
        level: 'country',
        candidates: [
          { name: 'Adam Schiff (incumbent)', party: 'Democratic' },
        ],
      },
      {
        type: 'General',
        office: 'Lieutenant Governor',
        level: 'administrativeArea1',
        candidates: [],
      },
      {
        type: 'General',
        office: 'Attorney General',
        level: 'administrativeArea1',
        candidates: [],
      },
      {
        type: 'General',
        office: 'Secretary of State',
        level: 'administrativeArea1',
        candidates: [],
      },
      {
        type: 'General',
        office: 'State Controller',
        level: 'administrativeArea1',
        candidates: [],
      },
      {
        type: 'General',
        office: 'State Treasurer',
        level: 'administrativeArea1',
        candidates: [],
      },
      {
        type: 'General',
        office: 'Insurance Commissioner',
        level: 'administrativeArea1',
        candidates: [],
      },
      {
        type: 'General',
        office: 'Superintendent of Public Instruction',
        level: 'administrativeArea1',
        candidates: [],
      },
      {
        type: 'General',
        office: 'All 80 California State Assembly Seats',
        level: 'administrativeArea1',
        candidates: [],
      },
      {
        type: 'General',
        office: 'California State Senate (20 seats — odd-numbered districts)',
        level: 'administrativeArea1',
        candidates: [],
      },
      {
        type: 'General',
        office: 'All 52 U.S. House of Representatives Seats (California)',
        level: 'country',
        candidates: [],
      },
      {
        type: 'General',
        office: 'Board of Equalization (4 seats)',
        level: 'administrativeArea1',
        candidates: [],
      },
    ],
  },
  {
    id: 'ca-2026-general',
    name: 'California General Election',
    date: '2026-11-03',
    stateCode: 'CA',
    contests: [
      {
        type: 'General',
        office: 'Governor of California (open seat)',
        level: 'administrativeArea1',
        candidates: [],
      },
      {
        type: 'General',
        office: 'United States Senator — Full 6-Year Term',
        level: 'country',
        candidates: [],
      },
      {
        type: 'General',
        office: 'Lieutenant Governor, Attorney General, Secretary of State, Controller, Treasurer, Insurance Commissioner',
        level: 'administrativeArea1',
        candidates: [],
      },
      {
        type: 'General',
        office: 'All 80 California State Assembly Seats',
        level: 'administrativeArea1',
        candidates: [],
      },
      {
        type: 'General',
        office: 'California State Senate (20 seats)',
        level: 'administrativeArea1',
        candidates: [],
      },
      {
        type: 'General',
        office: 'All 52 U.S. House of Representatives Seats (California)',
        level: 'country',
        candidates: [],
      },
    ],
  },
];

/**
 * Merges Google Civic API election data with the curated CA calendar.
 * CA-curated elections fill gaps when the Civic API returns nothing.
 */
export function mergeCaliforniaElections(
  civicUpcoming: UpcomingElection[]
): UpcomingElection[] {
  const civicIds = new Set(civicUpcoming.map((e) => e.id));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const curatedFuture = CALIFORNIA_UPCOMING_ELECTIONS.filter((e) => {
    if (civicIds.has(e.id)) return false; // don't duplicate
    const [y, m, d] = e.date.split('-').map(Number);
    return new Date(y, m - 1, d) >= today;
  });

  return [...civicUpcoming, ...curatedFuture].sort((a, b) =>
    a.date.localeCompare(b.date)
  );
}
