export interface LatLng {
  lat: number;
  lng: number;
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
}

export interface PollingHours {
  openTime: string;   // e.g. "6:00 AM"
  closeTime: string;  // e.g. "8:00 PM"
}

export interface VotingLocation {
  id: string;
  name: string;
  address: string;
  type: 'polling' | 'early' | 'dropbox';
  hours: PollingHours[];  // one per day
  services: string[];     // e.g. ["ADA Accessible", "Drop Box"]
  lat?: number;
  lng?: number;
  distance?: string;      // e.g. "0.3 miles"
  phone?: string;
  notes?: string;
}

export interface ElectionInfo {
  id: string;
  name: string;
  electionDay: string;  // e.g. "2024-11-05"
  contests: Contest[];
}

export interface Contest {
  type: string;
  office?: string;
  referendumTitle?: string;
  referendumSubtitle?: string;
  referendumUrl?: string;
  candidates?: Candidate[];
}

export interface Candidate {
  name: string;
  party?: string;
}

export interface VoterInfo {
  election?: ElectionInfo;
  pollingLocations: VotingLocation[];
  earlyVoteSites: VotingLocation[];
  dropOffLocations: VotingLocation[];
  state?: {
    name: string;
    electionAdministrationBody?: {
      name?: string;
      electionInfoUrl?: string;
      votingLocationFinderUrl?: string;
      ballotInfoUrl?: string;
      correspondenceAddress?: { locationName?: string; line1?: string; city?: string; state?: string; zip?: string };
      physicalAddress?: { locationName?: string; line1?: string; city?: string; state?: string; zip?: string };
    };
  };
}

export interface ApiError {
  error: string;
  code?: number;
}
