/**
 * Thin client for the Google Civic Information API.
 *
 * The data behind these endpoints is the Voting Information Project (VIP): election dates,
 * ballot contests, voting locations, and election-office contacts submitted by state and local
 * election officials. Every voterinfo request below passes `officialOnly=true`, so only
 * government-published data is returned. Nothing is cached beyond a short in-memory window on
 * the election list; voter-specific data is fetched live per request and never stored.
 */
import type {
  AdministrationBody,
  Candidate,
  Contest,
  ContestGroup,
  DataSource,
  ElectionOfficial,
  Jurisdiction,
  LatLng,
  LocationType,
  PostalAddress,
  VotingLocation,
} from './types';
import { parseHours } from './hours';

const CIVIC_API_BASE = 'https://www.googleapis.com/civicinfo/v2';

/** The permanent VIP test election. Never shown to voters unless explicitly requested in development. */
export const VIP_TEST_ELECTION_ID = '2000';

export class CivicApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly reason?: string) {
    super(message);
    this.name = 'CivicApiError';
  }
}

// ---------- Raw API shapes ----------

export interface RawElection {
  id: string;
  name: string;
  electionDay: string;
  ocdDivisionId: string;
}

interface RawSource { name?: string; official?: boolean }

interface RawAddress {
  locationName?: string;
  line1?: string;
  line2?: string;
  line3?: string;
  city?: string;
  state?: string;
  zip?: string;
}

interface RawLocation {
  address?: RawAddress;
  name?: string;
  pollingHours?: string;
  notes?: string;
  voterServices?: string;
  startDate?: string;
  endDate?: string;
  latitude?: number;
  longitude?: number;
  sources?: RawSource[];
}

interface RawCandidate {
  name?: string;
  party?: string;
  candidateUrl?: string;
  phone?: string;
  email?: string;
  photoUrl?: string;
  channels?: Array<{ type?: string; id?: string }>;
}

interface RawContest {
  type?: string;
  office?: string;
  ballotTitle?: string;
  level?: string[];
  roles?: string[];
  district?: { name?: string; scope?: string; id?: string };
  numberElected?: string;
  numberVotingFor?: string;
  ballotPlacement?: string;
  special?: string;
  primaryParty?: string;
  electorateSpecifications?: string;
  candidates?: RawCandidate[];
  referendumTitle?: string;
  referendumSubtitle?: string;
  referendumUrl?: string;
  referendumBrief?: string;
  referendumText?: string;
  referendumProStatement?: string;
  referendumConStatement?: string;
  referendumPassageThreshold?: string;
  referendumEffectOfAbstain?: string;
  referendumBallotResponses?: string[];
  sources?: RawSource[];
}

interface RawOfficial {
  name?: string;
  title?: string;
  officePhoneNumber?: string;
  faxNumber?: string;
  emailAddress?: string;
}

interface RawAdministrationBody {
  name?: string;
  electionInfoUrl?: string;
  electionRegistrationUrl?: string;
  electionRegistrationConfirmationUrl?: string;
  electionNoticeText?: string;
  electionNoticeUrl?: string;
  absenteeVotingInfoUrl?: string;
  votingLocationFinderUrl?: string;
  ballotInfoUrl?: string;
  electionRulesUrl?: string;
  hoursOfOperation?: string;
  voter_services?: string[];
  correspondenceAddress?: RawAddress;
  physicalAddress?: RawAddress;
  electionOfficials?: RawOfficial[];
}

interface RawJurisdiction {
  name?: string;
  electionAdministrationBody?: RawAdministrationBody;
  sources?: RawSource[];
}

interface RawState extends RawJurisdiction {
  local_jurisdiction?: RawJurisdiction;
}

interface RawVoterInfoResponse {
  election?: RawElection;
  normalizedInput?: RawAddress;
  mailOnly?: boolean;
  pollingLocations?: RawLocation[];
  earlyVoteSites?: RawLocation[];
  dropOffLocations?: RawLocation[];
  contests?: RawContest[];
  state?: RawState[];
  error?: { code?: number; message?: string; errors?: Array<{ reason?: string; message?: string }> };
}

// ---------- Mapping helpers ----------

function mapSources(raw: RawSource[] | undefined): DataSource[] {
  return (raw ?? [])
    .filter((s) => s.name)
    .map((s) => ({ name: s.name as string, official: Boolean(s.official) }));
}

export function dedupeSources(lists: DataSource[][]): DataSource[] {
  const seen = new Map<string, DataSource>();
  for (const list of lists) for (const s of list) if (!seen.has(s.name)) seen.set(s.name, s);
  return [...seen.values()];
}

function formatAddress(addr: RawAddress | undefined, includeName = true): string {
  if (!addr) return '';
  const parts = [includeName ? addr.locationName : undefined, addr.line1, addr.line2, addr.line3, addr.city, addr.state, addr.zip]
    .map((p) => p?.trim())
    .filter(Boolean);
  return parts.join(', ');
}

function toPostal(addr: RawAddress | undefined): PostalAddress | undefined {
  if (!addr) return undefined;
  const { locationName, line1, line2, line3, city, state, zip } = addr;
  const out = { locationName, line1, line2, line3, city, state, zip };
  return Object.values(out).some(Boolean) ? out : undefined;
}

function toOfficial(o: RawOfficial): ElectionOfficial {
  return { name: o.name, title: o.title, officePhoneNumber: o.officePhoneNumber, faxNumber: o.faxNumber, emailAddress: o.emailAddress };
}

function onlyHttps(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (/^https:\/\//i.test(trimmed)) return trimmed;
  // Officials sometimes publish http:// links; upgrade them rather than drop them.
  if (/^http:\/\//i.test(trimmed)) return trimmed.replace(/^http:/i, 'https:');
  return undefined;
}

function mapBody(raw: RawAdministrationBody | undefined): AdministrationBody | undefined {
  if (!raw) return undefined;
  const body: AdministrationBody = {
    name: raw.name,
    electionInfoUrl: onlyHttps(raw.electionInfoUrl),
    electionRegistrationUrl: onlyHttps(raw.electionRegistrationUrl),
    electionRegistrationConfirmationUrl: onlyHttps(raw.electionRegistrationConfirmationUrl),
    electionNoticeText: raw.electionNoticeText,
    electionNoticeUrl: onlyHttps(raw.electionNoticeUrl),
    absenteeVotingInfoUrl: onlyHttps(raw.absenteeVotingInfoUrl),
    votingLocationFinderUrl: onlyHttps(raw.votingLocationFinderUrl),
    ballotInfoUrl: onlyHttps(raw.ballotInfoUrl),
    electionRulesUrl: onlyHttps(raw.electionRulesUrl),
    hoursOfOperation: raw.hoursOfOperation,
    voterServices: raw.voter_services,
    correspondenceAddress: toPostal(raw.correspondenceAddress),
    physicalAddress: toPostal(raw.physicalAddress),
    electionOfficials: raw.electionOfficials?.map(toOfficial),
  };
  return Object.values(body).some((v) => v !== undefined) ? body : undefined;
}

function mapJurisdiction(raw: RawJurisdiction | undefined, fallbackName: string): Jurisdiction | undefined {
  if (!raw) return undefined;
  const body = mapBody(raw.electionAdministrationBody);
  const name = raw.name?.trim() || body?.name || fallbackName;
  return { name, body, sources: mapSources(raw.sources) };
}

const EARTH_RADIUS_MILES = 3958.8;

export function haversineMiles(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function formatMiles(miles: number): string {
  if (miles < 0.1) return '<0.1 mi';
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}

function mapLocations(raw: RawLocation[] | undefined, type: LocationType, electionId: string, origin?: LatLng): VotingLocation[] {
  return (raw ?? []).map((loc, i) => {
    const hasCoords = typeof loc.latitude === 'number' && typeof loc.longitude === 'number';
    const distanceMiles =
      origin && hasCoords ? haversineMiles(origin, { lat: loc.latitude as number, lng: loc.longitude as number }) : undefined;
    const services = (loc.voterServices ?? '')
      .split(/[;,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    return {
      id: `${electionId}-${type}-${i}`,
      name: loc.address?.locationName?.trim() || loc.name?.trim() || formatAddress(loc.address, false) || `${type} site ${i + 1}`,
      address: formatAddress(loc.address, false),
      type,
      hours: parseHours(loc.pollingHours),
      services,
      lat: hasCoords ? loc.latitude : undefined,
      lng: hasCoords ? loc.longitude : undefined,
      distanceMiles,
      distance: distanceMiles !== undefined ? formatMiles(distanceMiles) : undefined,
      notes: loc.notes?.trim() || undefined,
      startDate: loc.startDate,
      endDate: loc.endDate,
      sources: mapSources(loc.sources),
    };
  });
}

// ---------- Contest classification ----------

/**
 * Buckets a contest by the level of government it belongs to. The API's structured `level`,
 * `roles`, and `district.scope` fields win; office-title keywords are a fallback because many
 * jurisdictions publish contests without those fields (Virginia's 2026 feed, for example).
 */
export function classifyContest(raw: RawContest): ContestGroup {
  const type = (raw.type ?? '').toLowerCase();
  if (type.includes('referendum') || type.includes('ballot-measure') || type.includes('ballot measure') || raw.referendumTitle) {
    return 'measure';
  }
  const text = `${raw.office ?? ''} ${raw.ballotTitle ?? ''}`;
  const scope = (raw.district?.scope ?? '').toLowerCase();
  const levels = raw.level ?? [];
  const roles = raw.roles ?? [];
  const has = (re: RegExp) => re.test(text);

  if (roles.includes('schoolBoard') || scope === 'schoolboard' || has(/\b(school board|board of education|school district|school trustee|school committee|community college)\b/i)) {
    return 'school';
  }
  if (
    levels.includes('country') ||
    scope === 'national' ||
    scope === 'congressional' ||
    roles.includes('headOfState') ||
    has(/\b(president|vice president|united states|u\.?s\.? (senate|senator|house|representative)|congress|house of representatives)\b/i)
  ) {
    return 'federal';
  }
  if (
    levels.includes('administrativeArea1') ||
    ['statewide', 'stateupper', 'statelower'].includes(scope) ||
    has(/\b(governor|lieutenant governor|attorney general|secretary of state|state (senate|senator|assembly|house|representative|delegate|treasurer|controller|comptroller|auditor|superintendent|board)|house of delegates|general assembly|supreme court|court of appeals|board of equalization|insurance commissioner|superintendent of public instruction)\b/i)
  ) {
    return 'state';
  }
  if (roles.includes('highestCourtJudge') || roles.includes('judge') || scope === 'judicial' || has(/\b(judge|justice|court|magistrate)\b/i)) {
    return 'judicial';
  }
  if (
    levels.includes('administrativeArea2') ||
    ['countywide', 'countycouncil'].includes(scope) ||
    has(/\b(county|parish|borough assembly|sheriff|district attorney|assessor|recorder|supervisor|coroner)\b/i)
  ) {
    return 'county';
  }
  if (
    levels.some((l) => ['locality', 'subLocality1', 'subLocality2'].includes(l)) ||
    ['citywide', 'citycouncil', 'ward', 'township', 'municipal'].includes(scope) ||
    has(/\b(mayor|city|town|village|borough|alderman|alderperson|council member|councilmember|municipal)\b/i)
  ) {
    return 'local';
  }
  if (levels.includes('regional') || levels.includes('special') || scope === 'special' || has(/\b(district|board of directors|trustee|water|fire|transit|hospital|utility|sanitation|library|park)\b/i)) {
    return 'special';
  }
  return 'other';
}

function toInt(s: string | undefined): number | undefined {
  if (!s) return undefined;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : undefined;
}

function mapCandidate(c: RawCandidate): Candidate {
  return {
    name: c.name?.trim() || 'Unnamed candidate',
    party: c.party?.trim() || undefined,
    candidateUrl: onlyHttps(c.candidateUrl),
    phone: c.phone,
    email: c.email,
    photoUrl: onlyHttps(c.photoUrl),
    channels: c.channels?.filter((ch) => ch.type && ch.id).map((ch) => ({ type: ch.type as string, id: ch.id as string })),
  };
}

function mapContests(raw: RawContest[] | undefined, electionId: string): Contest[] {
  const contests = (raw ?? []).map((c, i): Contest => {
    const group = classifyContest(c);
    const title = c.ballotTitle?.trim() || c.office?.trim() || c.referendumTitle?.trim() || 'Ballot item';
    return {
      id: `${electionId}-contest-${i}`,
      type: c.type ?? (group === 'measure' ? 'Referendum' : 'General'),
      title,
      office: c.office?.trim() || undefined,
      level: c.level,
      roles: c.roles,
      district: c.district,
      group,
      numberElected: toInt(c.numberElected),
      numberVotingFor: toInt(c.numberVotingFor),
      ballotPlacement: toInt(c.ballotPlacement),
      special: c.special,
      primaryParty: c.primaryParty,
      electorateSpecifications: c.electorateSpecifications,
      candidates: (c.candidates ?? []).map(mapCandidate),
      referendum: c.referendumTitle || group === 'measure'
        ? {
            title: c.referendumTitle?.trim() || title,
            subtitle: c.referendumSubtitle,
            url: onlyHttps(c.referendumUrl),
            brief: c.referendumBrief,
            text: c.referendumText,
            proStatement: c.referendumProStatement,
            conStatement: c.referendumConStatement,
            passageThreshold: c.referendumPassageThreshold,
            effectOfAbstain: c.referendumEffectOfAbstain,
            ballotResponses: c.referendumBallotResponses,
          }
        : undefined,
      sources: mapSources(c.sources),
    };
  });
  // Officials publish ballot order; keep it when present.
  return contests.sort((a, b) => (a.ballotPlacement ?? 9999) - (b.ballotPlacement ?? 9999));
}

// ---------- Public API ----------

/** All elections officials currently have data for. Cached briefly server-side; the list is tiny and changes rarely. */
export async function listElections(apiKey: string): Promise<RawElection[]> {
  const url = new URL(`${CIVIC_API_BASE}/elections`);
  url.searchParams.set('key', apiKey);
  const res = await fetch(url.toString(), { next: { revalidate: 1800 } });
  if (!res.ok) throw new CivicApiError(`Civic API elections list failed: HTTP ${res.status}`, res.status);
  const data = (await res.json()) as { elections?: RawElection[] };
  return (data.elections ?? []).filter((e) => e.id && e.name && e.electionDay);
}

export interface VoterInfoResult {
  election?: RawElection;
  normalizedAddress?: string;
  normalizedState?: string;
  mailOnly: boolean;
  pollingLocations: VotingLocation[];
  earlyVoteSites: VotingLocation[];
  dropOffLocations: VotingLocation[];
  contests: Contest[];
  state?: Jurisdiction;
  localJurisdiction?: Jurisdiction;
}

/**
 * Official voter information for one election at one address. Fetched live, never cached.
 * Throws CivicApiError(400) when the address cannot be parsed; resolves with empty lists when
 * officials have not published data for the address yet.
 */
export async function getVoterInfo(address: string, electionId: string, apiKey: string, origin?: LatLng): Promise<VoterInfoResult> {
  const url = new URL(`${CIVIC_API_BASE}/voterinfo`);
  url.searchParams.set('address', address);
  url.searchParams.set('electionId', electionId);
  url.searchParams.set('officialOnly', 'true');
  url.searchParams.set('returnAllAvailableData', 'true');
  url.searchParams.set('key', apiKey);

  const res = await fetch(url.toString(), { cache: 'no-store' });
  const data = (await res.json().catch(() => ({}))) as RawVoterInfoResponse;

  if (!res.ok) {
    const reason = data.error?.errors?.[0]?.reason;
    const message = data.error?.message ?? `HTTP ${res.status}`;
    if (res.status === 400 && reason === 'parseError') {
      throw new CivicApiError('Address could not be understood by election officials’ lookup. Try a full street address with city, state, and ZIP.', 400, reason);
    }
    if (res.status === 400 || res.status === 404) {
      // "No information for this address" and similar: the election exists but officials have nothing for this voter yet.
      return { mailOnly: false, pollingLocations: [], earlyVoteSites: [], dropOffLocations: [], contests: [] };
    }
    throw new CivicApiError(`Civic API voterinfo failed: ${message}`, res.status, reason);
  }

  const rawState = data.state?.[0];
  const state = mapJurisdiction(rawState, rawState?.name ?? 'State');
  const localJurisdiction = mapJurisdiction(rawState?.local_jurisdiction, 'Local election office');

  return {
    election: data.election,
    normalizedAddress: formatAddress(data.normalizedInput, false) || undefined,
    normalizedState: data.normalizedInput?.state?.toUpperCase(),
    mailOnly: Boolean(data.mailOnly),
    pollingLocations: mapLocations(data.pollingLocations, 'polling', electionId, origin),
    earlyVoteSites: mapLocations(data.earlyVoteSites, 'early', electionId, origin),
    dropOffLocations: mapLocations(data.dropOffLocations, 'dropbox', electionId, origin),
    contests: mapContests(data.contests, electionId),
    state,
    localJurisdiction,
  };
}
