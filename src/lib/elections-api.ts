/**
 * Builds the "every election at this address" response.
 *
 * Flow (all live, per request, nothing persisted):
 *   1. List every election officials currently publish through VIP.
 *   2. Keep national elections plus those for the voter's state.
 *   3. For each, fetch the voter's official polling places, early-vote sites, drop boxes,
 *      ballot contests, and election-office contacts.
 *   4. Sort locations by distance and keep the nearest N per type so responses stay small;
 *      the official location finder is linked for the full list.
 */
import type { ElectionBallot, ElectionScope, ElectionsResponse, LatLng, LocationType, VotingLocation } from './types';
import { CivicApiError, VIP_TEST_ELECTION_ID, dedupeSources, getVoterInfo, listElections, type RawElection } from './civic-api';
import { DATA_SOURCE, NATIONAL_LINKS, buildLearnMoreLinks, getStateLinks } from './official-links';

export interface ElectionsLookupOptions {
  /** Two-letter state code from geocoding; used to pre-filter elections. Confirmed against officials' normalized address. */
  stateCode?: string;
  /** Voter's coordinates, for distance sorting. */
  origin?: LatLng;
  /** Include the permanent VIP test election (development only). */
  includeTestElection?: boolean;
  /** Nearest-N cap per location type. */
  maxLocationsPerType?: number;
}

const DEFAULT_MAX_LOCATIONS = 25;

export function electionStateCode(ocdDivisionId: string): string | undefined {
  const m = ocdDivisionId.match(/state:([a-z]{2})/i);
  return m ? m[1].toUpperCase() : undefined;
}

export function electionScope(ocdDivisionId: string): ElectionScope {
  if (!/state:/i.test(ocdDivisionId)) return 'national';
  const afterState = ocdDivisionId.split(/state:[a-z]{2}/i)[1] ?? '';
  return afterState.includes('/') ? 'local' : 'state';
}

function isRelevant(e: RawElection, stateCode: string | undefined): boolean {
  const eState = electionStateCode(e.ocdDivisionId);
  if (!eState) return true; // national
  if (!stateCode) return true; // unknown state: let officials' address lookup decide
  return eState === stateCode;
}

function nearestN(list: VotingLocation[], n: number): VotingLocation[] {
  const sorted = [...list].sort((a, b) => {
    if (a.distanceMiles === undefined && b.distanceMiles === undefined) return 0;
    if (a.distanceMiles === undefined) return 1;
    if (b.distanceMiles === undefined) return -1;
    return a.distanceMiles - b.distanceMiles;
  });
  return sorted.slice(0, n);
}

export async function getElectionsForAddress(address: string, options: ElectionsLookupOptions = {}): Promise<ElectionsResponse> {
  const apiKey = process.env.GOOGLE_CIVIC_API_KEY;
  if (!apiKey) throw new Error('Server configuration error: GOOGLE_CIVIC_API_KEY is not set');

  const maxPerType = options.maxLocationsPerType ?? DEFAULT_MAX_LOCATIONS;
  const requestedState = options.stateCode?.toUpperCase();

  const all = await listElections(apiKey);
  const candidates = all
    .filter((e) => options.includeTestElection || e.id !== VIP_TEST_ELECTION_ID)
    .filter((e) => isRelevant(e, requestedState));

  const results = await Promise.allSettled(candidates.map((e) => getVoterInfo(address, e.id, apiKey, options.origin)));

  // An unparseable address fails every lookup the same way; surface it as a 400 instead of N empty elections.
  const parseFailure = results.find(
    (r): r is PromiseRejectedResult => r.status === 'rejected' && r.reason instanceof CivicApiError && r.reason.status === 400
  );
  if (parseFailure && results.every((r) => r.status === 'rejected')) throw parseFailure.reason;

  let normalizedAddress: string | undefined;
  let confirmedState: string | undefined;

  const elections: ElectionBallot[] = candidates.map((e, i) => {
    const r = results[i];
    const scope = electionScope(e.ocdDivisionId);
    if (r.status === 'rejected') {
      const message = r.reason instanceof Error ? r.reason.message : 'Lookup failed';
      return {
        id: e.id,
        name: e.name,
        electionDay: e.electionDay,
        ocdDivisionId: e.ocdDivisionId,
        scope,
        mailOnly: false,
        hasVotingData: false,
        pollingLocations: [],
        earlyVoteSites: [],
        dropOffLocations: [],
        locationTotals: { polling: 0, early: 0, dropbox: 0 },
        contests: [],
        sources: [],
        error: message,
      };
    }
    const v = r.value;
    normalizedAddress ??= v.normalizedAddress;
    confirmedState ??= v.normalizedState;

    const totals: Record<LocationType, number> = {
      polling: v.pollingLocations.length,
      early: v.earlyVoteSites.length,
      dropbox: v.dropOffLocations.length,
    };
    const hasVotingData = totals.polling + totals.early + totals.dropbox > 0 || v.contests.length > 0;

    const sources = dedupeSources([
      v.state?.sources ?? [],
      v.localJurisdiction?.sources ?? [],
      ...v.pollingLocations.map((l) => l.sources),
      ...v.earlyVoteSites.map((l) => l.sources),
      ...v.dropOffLocations.map((l) => l.sources),
      ...v.contests.map((c) => c.sources),
    ]);

    return {
      id: e.id,
      name: e.name,
      electionDay: e.electionDay,
      ocdDivisionId: e.ocdDivisionId,
      scope,
      mailOnly: v.mailOnly,
      hasVotingData,
      pollingLocations: nearestN(v.pollingLocations, maxPerType),
      earlyVoteSites: nearestN(v.earlyVoteSites, maxPerType),
      dropOffLocations: nearestN(v.dropOffLocations, maxPerType),
      locationTotals: totals,
      contests: v.contests,
      state: v.state,
      localJurisdiction: v.localJurisdiction,
      sources,
    };
  });

  // If officials normalized the address to a different state than geocoding guessed, drop other-state elections.
  const stateCode = confirmedState ?? requestedState;
  const filtered = elections
    .filter((e) => {
      const eState = electionStateCode(e.ocdDivisionId);
      return !eState || !stateCode || eState === stateCode;
    })
    .sort((a, b) => a.electionDay.localeCompare(b.electionDay));

  const stateLinks = getStateLinks(stateCode);
  const stateName = stateLinks?.name ?? filtered.find((e) => e.state?.name)?.state?.name;
  const year = filtered[0] ? Number(filtered[0].electionDay.slice(0, 4)) : new Date().getFullYear();

  return {
    address,
    normalizedAddress,
    stateCode,
    stateName,
    elections: filtered,
    stateLinks,
    learnMore: buildLearnMoreLinks(stateCode, stateName, year),
    nationalLinks: NATIONAL_LINKS,
    fetchedAt: new Date().toISOString(),
    source: DATA_SOURCE,
  };
}
