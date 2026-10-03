interface DataSource {
  name: string;
  description: string;
}

const dataSources: DataSource[] = [
  {
    name: 'Voting Information Project (via the Google Civic Information API)',
    description:
      'Election dates, every contest on your ballot, polling places, early voting sites, ballot drop boxes, and election-office contacts, as published by state and local election officials. Ballotbox requests official sources only and reads the data live at the moment you search; it keeps no copy.',
  },
  {
    name: 'Vote.gov (U.S. General Services Administration)',
    description:
      'The official link to each state and territory election website and registration lookup, used when officials have not yet published data for an address.',
  },
  {
    name: 'Google Maps Geocoding API',
    description:
      'Converts the address you enter into geographic coordinates (latitude and longitude), enabling us to find voting locations near you.',
  },
  {
    name: 'Leaflet and OpenStreetMap',
    description:
      'Power the interactive map that displays your nearby voting locations, letting you visualize distances and get directions.',
  },
];

export const metadata = {
  title: 'About | Ballotbox',
  description:
    'Learn about Ballotbox — a nonpartisan voter access tool that helps every eligible voter find their polling place.',
};

export default function AboutPage() {
  return (
    <div className="bg-brand-dark min-h-screen">
      {/* Hero — dark */}
      <section className="bg-brand-dark py-20 md:py-32">
        <div className="max-w-5xl mx-auto px-6">
          <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight tracking-tight">
            About Ballotbox
          </h1>
          <p className="mt-6 text-lg md:text-xl text-brand-muted max-w-2xl leading-relaxed">
            A nonpartisan tool built to make voting more accessible for everyone.
          </p>
        </div>
      </section>

      {/* Mission — light */}
      <section className="bg-brand-light py-20 md:py-32">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-muted mb-4">
            Our Mission
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">
            Access. Clarity. Democracy.
          </h2>
          <p className="text-xl text-gray-700 leading-relaxed max-w-3xl font-medium">
            Ballotbox is a nonpartisan voter access tool that shows every
            election currently scheduled for your address, from school board to
            U.S. Senate, where to vote in each one, and where to learn about who
            is running.
          </p>
          <p className="mt-6 text-lg text-gray-600 leading-relaxed max-w-3xl">
            We don&apos;t endorse any candidates, parties, or political positions. Our
            only goal is to lower the information barrier between voters and the
            ballot box.
          </p>
        </div>
      </section>

      {/* Data Sources — dark */}
      <section className="bg-brand-dark py-20 md:py-32 border-t border-white/10">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-12">
            Our Data Sources
          </h2>
          <div className="flex flex-col gap-10">
            {dataSources.map((source) => (
              <div
                key={source.name}
                className="border-b border-white/10 pb-10 last:border-0 last:pb-0"
              >
                <h3 className="text-xl font-semibold text-white mb-3">
                  {source.name}
                </h3>
                <p className="text-brand-muted leading-relaxed max-w-2xl text-base">
                  {source.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Data Accuracy — light */}
      <section className="bg-brand-light py-20 md:py-32">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">
            Data Accuracy
          </h2>
          <div className="flex flex-col gap-6 text-lg text-gray-600 leading-relaxed max-w-3xl">
            <p>
              Election information changes. Polling places can be relocated,
              hours can be adjusted, and deadlines can shift. While we strive to
              display the most current information available from official
              sources, we strongly encourage you to verify your voting details
              with your local election office before heading to the polls.
            </p>
            <p>
              For official, authoritative election information in your state,
              visit{' '}
              <a
                href="https://www.vote.gov"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-accent underline underline-offset-2 hover:text-blue-400 transition-colors font-medium"
              >
                vote.gov
              </a>
              .
            </p>
          </div>
        </div>
      </section>

      {/* Feedback & Contact — dark */}
      <section className="bg-brand-dark py-20 md:py-32 border-t border-white/10">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-8">
            Feedback &amp; Contact
          </h2>
          <div className="flex flex-col gap-6 text-base text-brand-muted leading-relaxed max-w-2xl">
            <p>
              If you believe the data shown for your location is incorrect, the
              best course of action is to contact your{' '}
              <a
                href="https://www.vote.gov"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white underline underline-offset-2 hover:text-blue-400 transition-colors"
              >
                local election office
              </a>{' '}
              directly. They are the authoritative source and can confirm your
              correct polling place and voter registration status.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
