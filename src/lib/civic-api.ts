import type { VoterInfo, VotingLocation } from './types';

const CIVIC_API_BASE = 'https://www.googleapis.com/civicinfo/v2';

interface RawAddress {
  locationName?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  zip?: string;
}

interface RawLocation {
  address?: RawAddress;
  name?: string;
  pollingHours?: string;
  sources?: Array<{ name?: string }>;
  latitude?: number;
  longitude?: number;
  phone?: string;
  notes?: string;
}

interface RawCandidate {
  name: string;
  party?: string;
}

interface RawContest {
  type: string;
  office?: string;
  referendumTitle?: string;
  referendumSubtitle?: string;
  referendumUrl?: string;
  candidates?: RawCandidate[];
}

interface RawElection {
  id: string;
  name: string;
  electionDay: string;
}

interface RawAdministrationBody {
  name?: string;
  electionInfoUrl?: string;
  votingLocationFinderUrl?: string;
  ballotInfoUrl?: string;
  correspondenceAddress?: RawAddress;
  physicalAddress?: RawAddress;
}

interface RawState {
  name: string;
  electionAdministrationBody?: RawAdministrationBody;
}

interface RawCivicApiResponse {
  election?: RawElection;
  pollingLocations?: RawLocation[];
  earlyVoteSites?: RawLocation[];
  dropOffLocations?: RawLocation[];
  contests?: RawContest[];
  state?: RawState[];
}

function parseAddress(addr: RawAddress | undefined): string {
  if (!addr) return '';
  const parts = [addr.locationName, addr.line1, addr.line2, addr.city, addr.state, addr.zip].filter(Boolean);
  return parts.join(', ');
}

function parseHours(hoursStr: string | undefined): { openTime: string; closeTime: string }[] {
  if (!hoursStr) return [{ openTime: 'See official site', closeTime: '' }];

  // Try to split "OPEN_TIME - CLOSE_TIME" format
  const dashMatch = hoursStr.match(/^(.+?)\s*[-–]\s*(.+)$/);
  if (dashMatch) {
    return [{ openTime: dashMatch[1].trim(), closeTime: dashMatch[2].trim() }];
  }

  return [{ openTime: hoursStr, closeTime: '' }];
}

function mapLocations(rawLocations: RawLocation[] = [], type: VotingLocation['type']): VotingLocation[] {
  return rawLocations.map((loc: RawLocation, i: number) => ({
    id: `${type}-${i}`,
    name: loc.address?.locationName || loc.name || `${type} site ${i + 1}`,
    address: parseAddress(loc.address),
    type,
    hours: parseHours(loc.pollingHours),
    services: (loc.sources?.map((s) => s.name).filter(Boolean) ?? []) as string[],
    lat: loc.latitude,
    lng: loc.longitude,
    phone: loc.phone,
    notes: loc.notes,
  }));
}

// Fallback: when the Civic API has no data, find nearby voting-related locations
// using the Google Places Text Search API.
async function findNearbyVotingPlaces(address: string, apiKey: string): Promise<VotingLocation[]> {
  const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
  url.searchParams.set('query', `polling place election office voting location near ${address}`);
  url.searchParams.set('key', apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) return [];

  const data = await res.json() as {
    status: string;
    results: Array<{
      place_id: string;
      name: string;
      formatted_address: string;
      geometry: { location: { lat: number; lng: number } };
    }>;
  };

  if (data.status !== 'OK' || !data.results.length) return [];

  return data.results.slice(0, 5).map((place, i) => ({
    id: `nearby-${i}`,
    name: place.name,
    address: place.formatted_address,
    type: 'polling' as const,
    hours: [{ openTime: 'See official site', closeTime: '' }],
    services: ['Nearby Location'],
    lat: place.geometry.location.lat,
    lng: place.geometry.location.lng,
  }));
}

export async function getVoterInfo(address: string): Promise<VoterInfo> {
  const apiKey = process.env.GOOGLE_CIVIC_API_KEY;
  if (!apiKey) throw new Error('Server configuration error: voter info unavailable');

  const url = new URL(`${CIVIC_API_BASE}/voterinfo`);
  url.searchParams.set('address', address);
  url.searchParams.set('key', apiKey);

  const res = await fetch(url.toString());

  if (res.status === 400) {
    // No active election data — fall back to nearby voting places
    const nearby = await findNearbyVotingPlaces(address, apiKey);
    return { pollingLocations: nearby, earlyVoteSites: [], dropOffLocations: [] };
  }
  if (!res.ok) throw new Error(`Civic API HTTP error: ${res.status}`);

  const data: RawCivicApiResponse = await res.json();

  let pollingLocations = mapLocations(data.pollingLocations, 'polling');
  let earlyVoteSites = mapLocations(data.earlyVoteSites, 'early');
  let dropOffLocations = mapLocations(data.dropOffLocations, 'dropbox');

  // Civic API returned a response but no locations — fall back to nearby places
  if (!pollingLocations.length && !earlyVoteSites.length && !dropOffLocations.length) {
    const nearby = await findNearbyVotingPlaces(address, apiKey);
    pollingLocations = nearby;
  }

  const stateInfo = data.state?.[0];

  return {
    election: data.election ? {
      id: data.election.id,
      name: data.election.name,
      electionDay: data.election.electionDay,
      contests: (data.contests ?? []).map((c: RawContest) => ({
        type: c.type,
        office: c.office,
        referendumTitle: c.referendumTitle,
        referendumSubtitle: c.referendumSubtitle,
        referendumUrl: c.referendumUrl,
        candidates: c.candidates?.map((cand: RawCandidate) => ({
          name: cand.name,
          party: cand.party,
        })),
      })),
    } : undefined,
    pollingLocations,
    earlyVoteSites,
    dropOffLocations,
    state: stateInfo ? {
      name: stateInfo.name,
      electionAdministrationBody: stateInfo.electionAdministrationBody ? {
        name: stateInfo.electionAdministrationBody.name,
        electionInfoUrl: stateInfo.electionAdministrationBody.electionInfoUrl,
        votingLocationFinderUrl: stateInfo.electionAdministrationBody.votingLocationFinderUrl,
        ballotInfoUrl: stateInfo.electionAdministrationBody.ballotInfoUrl,
        correspondenceAddress: stateInfo.electionAdministrationBody.correspondenceAddress,
        physicalAddress: stateInfo.electionAdministrationBody.physicalAddress,
      } : undefined,
    } : undefined,
  };
}
