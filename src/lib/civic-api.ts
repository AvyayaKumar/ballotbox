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

export async function getVoterInfo(address: string): Promise<VoterInfo> {
  const apiKey = process.env.GOOGLE_CIVIC_API_KEY;
  if (!apiKey) throw new Error('Server configuration error: voter info unavailable');

  const url = new URL(`${CIVIC_API_BASE}/voterinfo`);
  url.searchParams.set('address', address);
  url.searchParams.set('key', apiKey);

  const res = await fetch(url.toString());

  if (res.status === 400) {
    // Address not found or no election data
    return { pollingLocations: [], earlyVoteSites: [], dropOffLocations: [] };
  }
  if (!res.ok) throw new Error(`Civic API HTTP error: ${res.status}`);

  const data: RawCivicApiResponse = await res.json();

  const pollingLocations = mapLocations(data.pollingLocations, 'polling');
  const earlyVoteSites = mapLocations(data.earlyVoteSites, 'early');
  const dropOffLocations = mapLocations(data.dropOffLocations, 'dropbox');

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
