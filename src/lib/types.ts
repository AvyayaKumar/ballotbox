export interface LatLng {
  lat: number;
  lng: number;
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
  state?: string;       // e.g. "TX"
  stateName?: string;   // e.g. "Texas"
  city?: string;
}

/** One line of an official hours schedule, e.g. { day: "Tue, Nov 3", openTime: "6 am", closeTime: "7 pm" }. */
export interface PollingHours {
  day?: string;        // omitted when officials publish a single range with no date
  openTime: string;
  closeTime: string;   // empty when the line could not be split into a range
}

/** Who published a piece of data. `official` is set by the Civic API for government sources. */
export interface DataSource {
  name: string;
  official: boolean;
}

export type LocationType = 'polling' | 'early' | 'dropbox';

export interface VotingLocation {
  id: string;
  name: string;
  address: string;
  type: LocationType;
  hours: PollingHours[];
  services: string[];
  lat?: number;
  lng?: number;
  distanceMiles?: number;
  distance?: string;      // formatted, e.g. "0.3 mi"
  phone?: string;
  notes?: string;
  startDate?: string;
  endDate?: string;
  sources: DataSource[];
}

export interface Candidate {
  name: string;
  party?: string;
  candidateUrl?: string;
  phone?: string;
  email?: string;
  photoUrl?: string;
  channels?: { type: string; id: string }[];
}

export type ContestGroup =
  | 'federal'
  | 'state'
  | 'county'
  | 'local'
  | 'school'
  | 'special'
  | 'judicial'
  | 'other'
  | 'measure';

export interface Referendum {
  title: string;
  subtitle?: string;
  url?: string;
  brief?: string;
  text?: string;
  proStatement?: string;
  conStatement?: string;
  passageThreshold?: string;
  effectOfAbstain?: string;
  ballotResponses?: string[];
}

export interface Contest {
  id: string;
  type: string;                 // "General", "Primary", "Run-off", "ballot-measure", ...
  title: string;                // ballotTitle ?? office ?? referendumTitle
  office?: string;
  level?: string[];
  roles?: string[];
  district?: { name?: string; scope?: string; id?: string };
  group: ContestGroup;
  numberElected?: number;
  numberVotingFor?: number;
  ballotPlacement?: number;
  special?: string;
  primaryParty?: string;
  electorateSpecifications?: string;
  candidates: Candidate[];
  referendum?: Referendum;
  sources: DataSource[];
}

export interface PostalAddress {
  locationName?: string;
  line1?: string;
  line2?: string;
  line3?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export interface ElectionOfficial {
  name?: string;
  title?: string;
  officePhoneNumber?: string;
  faxNumber?: string;
  emailAddress?: string;
}

/** A government election administration body (state office or local registrar), as published to VIP. */
export interface AdministrationBody {
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
  voterServices?: string[];
  correspondenceAddress?: PostalAddress;
  physicalAddress?: PostalAddress;
  electionOfficials?: ElectionOfficial[];
}

export interface Jurisdiction {
  name: string;
  body?: AdministrationBody;
  sources: DataSource[];
}

export type ElectionScope = 'national' | 'state' | 'local';

/** Everything officials have published for one election at one address. */
export interface ElectionBallot {
  id: string;
  name: string;
  electionDay: string;      // YYYY-MM-DD
  ocdDivisionId: string;
  scope: ElectionScope;
  mailOnly: boolean;
  /** True when officials have published at least one voting location or contest for this address. */
  hasVotingData: boolean;
  pollingLocations: VotingLocation[];
  earlyVoteSites: VotingLocation[];
  dropOffLocations: VotingLocation[];
  /** Counts before the nearest-N truncation applied to keep responses small. */
  locationTotals: Record<LocationType, number>;
  contests: Contest[];
  state?: Jurisdiction;
  localJurisdiction?: Jurisdiction;
  sources: DataSource[];
  /** Set when the lookup for this election failed; the election is still listed. */
  error?: string;
}

export interface LinkItem {
  label: string;
  href: string;
  description?: string;
  /** True for government (.gov or state election office) sources. */
  official: boolean;
}

export type RegistrationType = 'online' | 'by-mail' | 'in-person' | 'not-needed';

/** Official state election links, sourced from vote.gov (U.S. General Services Administration). */
export interface StateLinks {
  code: string;            // "CA"
  name: string;            // "California"
  isState: boolean;        // false for DC and territories
  registrationType: RegistrationType;
  electionWebsite: string;
  register?: string;
  checkRegistration: string;
  moreInfo?: string;
}

export interface ElectionsResponse {
  address: string;
  normalizedAddress?: string;
  stateCode?: string;
  stateName?: string;
  elections: ElectionBallot[];
  stateLinks?: StateLinks;
  /** Where to research candidates and measures: official first, then labeled nonpartisan guides. */
  learnMore: LinkItem[];
  nationalLinks: LinkItem[];
  fetchedAt: string;        // ISO timestamp; data is fetched live per request, never stored
  source: { name: string; url: string; description: string };
}

export interface ApiError {
  error: string;
  code?: number;
}
