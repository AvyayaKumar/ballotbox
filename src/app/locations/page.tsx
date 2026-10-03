import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { VotingLocation } from '@/lib/types';

const mockLocations: VotingLocation[] = [
  {
    id: 'mock-1',
    name: 'Riverside Community Center',
    address: '450 Riverside Drive, Springfield, IL 62701',
    type: 'polling',
    hours: [{ openTime: '6:00 AM', closeTime: '7:00 PM' }],
    services: ['ADA Accessible', 'Provisional Ballot', 'Curbside Voting'],
    distance: '0.4 mi',
    sources: [{ name: 'Sample data', official: false }],
  },
  {
    id: 'mock-2',
    name: 'County Clerk — Main Office',
    address: '200 S 9th St, Suite 101, Springfield, IL 62701',
    type: 'early',
    hours: [{ openTime: '8:00 AM', closeTime: '5:00 PM' }],
    services: ['ADA Accessible', 'Same-Day Registration', 'Extended Hours'],
    distance: '1.1 mi',
    sources: [{ name: 'Sample data', official: false }],
  },
  {
    id: 'mock-3',
    name: 'Springfield Public Library — Drop Box',
    address: '326 S 7th St, Springfield, IL 62701',
    type: 'dropbox',
    hours: [{ openTime: '24 hours', closeTime: '' }],
    services: ['Outdoor Drop Box', 'Secure', 'Monitored'],
    distance: '0.8 mi',
    sources: [{ name: 'Sample data', official: false }],
  },
];

const typeLabel: Record<VotingLocation['type'], string> = {
  polling: 'Election Day',
  early: 'Early Voting',
  dropbox: 'Drop Box',
};

const typeBadgeVariant: Record<
  VotingLocation['type'],
  'default' | 'success' | 'warning' | 'neutral'
> = {
  polling: 'default',
  early: 'success',
  dropbox: 'warning',
};

export const metadata = {
  title: 'Voting Locations | Ballotbox',
  description:
    'Find polling places, early voting sites, and ballot drop boxes near you.',
};

export default function LocationsPage() {
  return (
    <div className="bg-brand-dark min-h-screen">
      {/* Hero */}
      <section className="bg-brand-dark py-20 md:py-32">
        <div className="max-w-5xl mx-auto px-6">
          <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight tracking-tight">
            Voting Locations
          </h1>
          <p className="mt-6 text-lg md:text-xl text-brand-muted max-w-2xl leading-relaxed">
            Enter your address on the home page to see every election currently
            scheduled for it, and the polling places, early voting sites, and drop
            boxes election officials have assigned to you for each one.
          </p>
          <div className="mt-10">
            <Link href="/">
              <Button size="lg">Find my elections &rarr;</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Example cards */}
      <section className="bg-brand-light py-20 md:py-32">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-muted mb-4">
            Example
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Here&apos;s What You&apos;ll See
          </h2>
          <p className="text-brand-muted text-lg mb-12 max-w-xl">
            After entering your address, your nearby locations will appear as
            cards like these. The data below is sample data only.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {mockLocations.map((loc) => (
              <Card key={loc.id} variant="dark" className="flex flex-col gap-4">
                {/* Type badge + distance */}
                <div className="flex items-center justify-between">
                  <Badge variant={typeBadgeVariant[loc.type]}>
                    {typeLabel[loc.type]}
                  </Badge>
                  {loc.distance && (
                    <span className="text-xs text-brand-muted">
                      {loc.distance}
                    </span>
                  )}
                </div>

                {/* Name & address */}
                <div>
                  <h3 className="text-white font-semibold text-base leading-snug">
                    {loc.name}
                  </h3>
                  <p className="mt-1 text-sm text-brand-muted">{loc.address}</p>
                </div>

                {/* Hours */}
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
                    Hours
                  </p>
                  {loc.hours.map((h, i) => (
                    <p key={i} className="text-sm text-white">
                      {h.closeTime
                        ? `${h.openTime} – ${h.closeTime}`
                        : h.openTime}
                    </p>
                  ))}
                </div>

                {/* Services */}
                <div className="flex flex-wrap gap-2 mt-auto pt-2 border-t border-white/10">
                  {loc.services.map((svc) => (
                    <Badge key={svc} variant="neutral" className="text-xs">
                      {svc}
                    </Badge>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-brand-dark py-20 md:py-32">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to find your locations?
          </h2>
          <p className="text-brand-muted text-lg mb-10 max-w-xl mx-auto">
            Enter your registered address on the home page. Locations are read
            live from election officials at the moment you search.
          </p>
          <Link href="/">
            <Button size="lg">Find my elections &rarr;</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
