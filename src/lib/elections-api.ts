import type { ElectionsData, UpcomingElection, Contest } from './types';
import { mergeCaliforniaElections } from './california-elections';

const CIVIC_API_BASE = 'https://www.googleapis.com/civicinfo/v2';

// Maps state abbreviations to their Secretary of State / election website
const STATE_ELECTION_URLS: Record<string, string> = {
  AL: 'https://www.sos.alabama.gov/alabama-votes',
  AK: 'https://elections.alaska.gov',
  AZ: 'https://azsos.gov/elections',
  AR: 'https://www.sos.arkansas.gov/elections',
  CA: 'https://www.sos.ca.gov/elections',
  CO: 'https://www.coloradosos.gov/voter/pages/pub/home.xhtml',
  CT: 'https://portal.ct.gov/SOTS/Election-Services/Election-Information',
  DE: 'https://elections.delaware.gov',
  FL: 'https://dos.fl.gov/elections',
  GA: 'https://sos.ga.gov/page/elections-division',
  HI: 'https://elections.hawaii.gov',
  ID: 'https://sos.idaho.gov/elections-division',
  IL: 'https://www.elections.il.gov',
  IN: 'https://www.in.gov/sos/elections',
  IA: 'https://sos.iowa.gov/elections',
  KS: 'https://sos.ks.gov/elections',
  KY: 'https://elect.ky.gov',
  LA: 'https://www.sos.la.gov/ElectionsAndVoting',
  ME: 'https://www.maine.gov/sos/cec/elec',
  MD: 'https://elections.maryland.gov',
  MA: 'https://www.sec.state.ma.us/ele',
  MI: 'https://mvic.sos.state.mi.us',
  MN: 'https://www.sos.state.mn.us/elections-voting',
  MS: 'https://www.sos.ms.gov/elections-voting',
  MO: 'https://www.sos.mo.gov/elections',
  MT: 'https://sosmt.gov/elections',
  NE: 'https://sos.nebraska.gov/elections',
  NV: 'https://www.nvsos.gov/sos/elections',
  NH: 'https://www.sos.nh.gov/elections',
  NJ: 'https://www.njelections.org',
  NM: 'https://www.sos.nm.gov/voting-and-elections',
  NY: 'https://www.elections.ny.gov',
  NC: 'https://www.ncsbe.gov',
  ND: 'https://vip.sos.nd.gov',
  OH: 'https://www.ohiosos.gov/elections',
  OK: 'https://www.ok.gov/elections',
  OR: 'https://sos.oregon.gov/voting',
  PA: 'https://www.vote.pa.gov',
  RI: 'https://vote.sos.ri.gov',
  SC: 'https://www.scvotes.gov',
  SD: 'https://sdsos.gov/elections-voting',
  TN: 'https://sos.tn.gov/elections',
  TX: 'https://www.sos.state.tx.us/elections',
  UT: 'https://elections.utah.gov',
  VT: 'https://sos.vermont.gov/elections',
  VA: 'https://www.elections.virginia.gov',
  WA: 'https://www.sos.wa.gov/elections',
  WV: 'https://sos.wv.gov/elections',
  WI: 'https://elections.wi.gov',
  WY: 'https://soswy.state.wy.us/Elections',
  DC: 'https://www.dcboe.org',
};

interface RawElection {
  id: string;
  name: string;
  electionDay: string;
  ocdDivisionId: string;
}

interface RawContest {
  type: string;
  office?: string;
  level?: string[];
  referendumTitle?: string;
  referendumSubtitle?: string;
  referendumUrl?: string;
  candidates?: Array<{ name: string; party?: string }>;
}

interface RawVoterInfo {
  contests?: RawContest[];
}

function extractStateCode(ocdDivisionId: string): string {
  const match = ocdDivisionId.match(/state:([a-z]{2})/);
  return match ? match[1].toUpperCase() : 'US';
}

async function fetchContestsForElection(
  address: string,
  electionId: string,
  apiKey: string
): Promise<Contest[]> {
  try {
    const url = new URL(`${CIVIC_API_BASE}/voterinfo`);
    url.searchParams.set('address', address);
    url.searchParams.set('electionId', electionId);
    url.searchParams.set('key', apiKey);

    const res = await fetch(url.toString());
    if (!res.ok) return [];

    const data: RawVoterInfo = await res.json();
    return (data.contests ?? []).map((c) => ({
      type: c.type,
      office: c.office,
      level: c.level?.[0],
      referendumTitle: c.referendumTitle,
      referendumSubtitle: c.referendumSubtitle,
      referendumUrl: c.referendumUrl,
      candidates: c.candidates?.map((cand) => ({ name: cand.name, party: cand.party })),
    }));
  } catch {
    return [];
  }
}

export async function getElectionsData(address: string, stateCode: string): Promise<ElectionsData> {
  const apiKey = process.env.GOOGLE_CIVIC_API_KEY;
  if (!apiKey) throw new Error('Server configuration error');

  // Fetch all known elections
  const electionsRes = await fetch(
    `${CIVIC_API_BASE}/elections?key=${apiKey}`
  );
  const electionsData = electionsRes.ok ? await electionsRes.json() : { elections: [] };
  const allElections: RawElection[] = electionsData.elections ?? [];

  // Filter to elections relevant to this state (plus national)
  const relevant = allElections.filter((e) => {
    const eState = extractStateCode(e.ocdDivisionId);
    return eState === 'US' || eState === stateCode;
  });

  // Skip the VIP test election
  const real = relevant.filter((e) => e.id !== '2000');

  // Fetch contests for each relevant election in parallel
  const upcoming: UpcomingElection[] = await Promise.all(
    real.map(async (e) => {
      const contests = await fetchContestsForElection(address, e.id, apiKey);
      return {
        id: e.id,
        name: e.name,
        date: e.electionDay,
        stateCode: extractStateCode(e.ocdDivisionId),
        contests,
      };
    })
  );

  // For California, merge with curated election calendar so there's always data
  const finalUpcoming = stateCode === 'CA'
    ? mergeCaliforniaElections(upcoming)
    : upcoming.sort((a, b) => a.date.localeCompare(b.date));

  const ballotpediaUrl = `https://ballotpedia.org/Elections_in_${stateCode},_${new Date().getFullYear()}`;

  return {
    upcoming: finalUpcoming,
    ballotpediaUrl,
    stateElectionUrl: STATE_ELECTION_URLS[stateCode],
  };
}
