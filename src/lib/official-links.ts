import type { LinkItem, StateLinks } from './types';
import { STATE_LINKS } from './state-links.generated';

export { STATE_LINKS, STATE_LINKS_SNAPSHOT_DATE } from './state-links.generated';

/** Official U.S. government voting resources (apply in every state). */
export const NATIONAL_LINKS: LinkItem[] = [
  {
    label: 'Vote.gov',
    href: 'https://vote.gov',
    description: 'Official U.S. government voting portal: register, check your registration, and find your state election office.',
    official: true,
  },
  {
    label: 'Find your state and local election office',
    href: 'https://www.usa.gov/election-office',
    description: 'USA.gov directory of the election offices that run elections where you live.',
    official: true,
  },
  {
    label: 'U.S. Election Assistance Commission',
    href: 'https://www.eac.gov/voters',
    description: 'Federal agency resources on registering, voting methods, and voter rights.',
    official: true,
  },
];

export const DATA_SOURCE = {
  name: 'Voting Information Project via Google Civic Information API',
  url: 'https://www.votinginfoproject.org/',
  description:
    'Election dates, ballot contests, and voting locations are published by state and local election officials to the Voting Information Project and read live, with official-sources-only filtering, at the moment you search. Ballotbox stores none of it.',
};

export function getStateLinks(code: string | undefined): StateLinks | undefined {
  if (!code) return undefined;
  return STATE_LINKS[code.toUpperCase()];
}

function ballotpediaStateSlug(stateName: string): string {
  return stateName.trim().replace(/\s+/g, '_');
}

/**
 * Where a voter can research who and what is on their ballot.
 * Government sources come first and are marked official; nonpartisan nonprofit guides follow, labeled as such.
 */
export function buildLearnMoreLinks(stateCode: string | undefined, stateName: string | undefined, electionYear: number): LinkItem[] {
  const links: LinkItem[] = [];
  const state = getStateLinks(stateCode);
  const name = state?.name ?? stateName;

  if (state) {
    links.push({
      label: `${state.name} official election website`,
      href: state.electionWebsite,
      description: 'Your state election office: candidate lists, voter guides, sample ballots, and deadlines.',
      official: true,
    });
    links.push({
      label: 'Check your registration and ballot',
      href: state.checkRegistration,
      description:
        state.registrationType === 'not-needed'
          ? 'Official lookup. North Dakota has no voter registration; use this to find where you vote.'
          : 'Official lookup for your registration status. Many states show your sample ballot here too.',
      official: true,
    });
  }

  links.push({
    label: 'Ballotpedia: Sample Ballot Lookup',
    href: 'https://ballotpedia.org/Sample_Ballot_Lookup',
    description: 'Nonpartisan encyclopedia of candidates and measures for every race on your ballot, by address.',
    official: false,
  });
  if (name) {
    links.push({
      label: `Ballotpedia: ${name} elections, ${electionYear}`,
      href: `https://ballotpedia.org/${ballotpediaStateSlug(name)}_elections,_${electionYear}`,
      description: 'Overview of every election in your state this year, from statewide offices to school boards.',
      official: false,
    });
  }
  links.push({
    label: 'Vote411 (League of Women Voters)',
    href: 'https://www.vote411.org/ballot',
    description: 'Nonpartisan voter guide with candidate questionnaires and measure explainers for your address.',
    official: false,
  });

  return links;
}
