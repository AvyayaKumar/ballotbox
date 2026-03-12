interface Resource {
  label: string;
  href: string;
  description: string;
}

const importantLinks: Resource[] = [
  {
    label: 'Find Your State\'s Election Website',
    href: 'https://www.vote.gov',
    description:
      `Vote.gov provides a directory of every state's official election office, so you can find authoritative local information.`,
  },
  {
    label: 'Check Your Voter Registration',
    href: 'https://www.vote.gov/register/verify/',
    description:
      'Verify that your voter registration is active and that your name, address, and party affiliation (where applicable) are correct.',
  },
  {
    label: 'HAVA — Help America Vote Act Rights',
    href: 'https://www.eac.gov/voters/help-america-vote-act',
    description:
      'The Help America Vote Act establishes federal standards to protect voters, including the right to cast a provisional ballot if your eligibility is questioned at the polls.',
  },
];

export const metadata = {
  title: 'Election Information | Ballotbox',
  description:
    'Nonpartisan factual information about elections, voter registration, sample ballots, and official resources.',
};

export default function ElectionInfoPage() {
  return (
    <div className="bg-brand-dark min-h-screen">
      {/* Hero — dark */}
      <section className="bg-brand-dark py-20 md:py-32">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-muted mb-4">
            Nonpartisan &amp; Factual
          </p>
          <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight tracking-tight">
            Election Information
          </h1>
          <p className="mt-6 text-lg md:text-xl text-brand-muted max-w-2xl leading-relaxed">
            Everything on this page is strictly nonpartisan, factual
            information drawn from official government sources. Ballotbox does
            not endorse any candidate, party, or position.
          </p>
        </div>
      </section>

      {/* How to Find Your Sample Ballot — light */}
      <section className="bg-brand-light py-20 md:py-32">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            How to Find Your Sample Ballot
          </h2>
          <p className="text-gray-600 text-lg mb-12 max-w-2xl">
            A sample ballot shows every race and measure you&apos;ll be asked to vote
            on. Reviewing it in advance helps you make informed decisions before
            you arrive at the polls.
          </p>

          <ol className="flex flex-col gap-8">
            {[
              {
                title: 'Go to your state or county election office website',
                detail:
                  `Your official sample ballot is published by your local or state election authority — not a third-party site. Find your state's official site at `,
                link: { label: 'vote.gov', href: 'https://www.vote.gov' },
              },
              {
                title: 'Search for "sample ballot"',
                detail:
                  `Most election office websites have a sample ballot lookup tool. If you can't find it, look for a "Voters" or "Elections" section in the navigation.`,
                link: null,
              },
              {
                title: 'Enter your address',
                detail:
                  'Your sample ballot is unique to your registered address. Enter your address exactly as it appears on your voter registration.',
                link: null,
              },
            ].map((item, i) => (
              <li key={i} className="flex gap-6 items-start">
                <span
                  className="text-5xl font-bold text-brand-accent leading-none shrink-0 w-12 text-right"
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                <div className="pt-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-1">
                    {item.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {item.detail}
                    {item.link && (
                      <a
                        href={item.link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-accent underline underline-offset-2 hover:text-blue-400 transition-colors"
                      >
                        {item.link.label}
                      </a>
                    )}
                    {item.link && '.'}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Important Links — dark */}
      <section className="bg-brand-dark py-20 md:py-32 border-t border-white/10">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-12">
            Important Links
          </h2>
          <div className="flex flex-col gap-8">
            {importantLinks.map((resource) => (
              <div
                key={resource.label}
                className="border-b border-white/10 pb-8 last:border-0 last:pb-0"
              >
                <a
                  href={resource.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xl font-semibold text-white hover:text-blue-400 transition-colors group mb-2"
                >
                  {resource.label}
                  <span
                    className="text-brand-muted group-hover:text-blue-400 transition-colors text-base"
                    aria-hidden="true"
                  >
                    ↗
                  </span>
                </a>
                <p className="text-brand-muted leading-relaxed max-w-2xl">
                  {resource.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About This Data — light */}
      <section className="bg-brand-light py-20 md:py-32">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            About This Data
          </h2>
          <div className="flex flex-col gap-6 text-gray-600 text-lg leading-relaxed max-w-3xl">
            <p>
              Ballotbox retrieves voting location data from the{' '}
              <strong className="text-gray-900 font-semibold">
                Google Civic Information API
              </strong>
              , which aggregates official election data submitted by state and
              local election administrators across the United States.
            </p>
            <p>
              This data is updated by election officials and reflects the most
              recently submitted information. However, polling places, hours,
              and procedures can change — especially close to an election.
            </p>
            <p className="font-medium text-gray-800">
              Always verify your voting location, hours, and requirements with
              your local election office before election day. Official
              information is available at{' '}
              <a
                href="https://www.vote.gov"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-accent underline underline-offset-2 hover:text-blue-400 transition-colors"
              >
                vote.gov
              </a>
              .
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
