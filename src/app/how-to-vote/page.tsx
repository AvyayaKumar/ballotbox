import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface Step {
  title: string;
  description: string;
}

const inPersonSteps: Step[] = [
  {
    title: 'Find your polling place',
    description:
      'Use Ballotbox or your local election office website to locate the polling place assigned to your address.',
  },
  {
    title: 'Bring valid ID',
    description:
      `ID requirements vary by state. Check your state's rules before election day — acceptable forms include driver's licenses, passports, and more.`,
  },
  {
    title: 'Check your registration',
    description:
      'Confirm your voter registration is active and your information is up to date well in advance of the election.',
  },
  {
    title: 'Go to your assigned polling location',
    description:
      'On election day, you must vote at the polling place assigned to your registered address, not just any polling location.',
  },
  {
    title: 'Cast your ballot',
    description:
      'Poll workers will verify your registration, provide a ballot, and guide you through the process. Your vote is private.',
  },
];

const earlyVotingSteps: Step[] = [
  {
    title: 'Check early voting dates in your area',
    description:
      'Early voting periods and availability vary by state and county. Look up your local dates before making plans.',
  },
  {
    title: 'Find an early voting site',
    description:
      'Early voting sites are often county clerk offices, libraries, or community centers. Use Ballotbox to find sites near you.',
  },
  {
    title: 'Bring your ID',
    description:
      'The same ID requirements that apply on election day typically apply during the early voting period.',
  },
  {
    title: 'Vote at any authorized early voting site',
    description:
      'Unlike election day, you can usually vote at any official early voting location in your county — not just the one assigned to your address.',
  },
];

const mailSteps: Step[] = [
  {
    title: 'Request your mail ballot',
    description:
      `Deadlines to request a mail ballot vary by state — some require weeks of advance notice. Check your state's deadline early.`,
  },
  {
    title: 'Complete your ballot following all instructions carefully',
    description:
      'Read every instruction. Errors such as stray marks or incomplete forms can cause a ballot to be rejected.',
  },
  {
    title: 'Sign the envelope',
    description:
      'Most states require a signature on the outer envelope. Missing or mismatched signatures are a leading cause of rejected mail ballots.',
  },
  {
    title: 'Return by mail or drop box before the deadline',
    description:
      'Mail ballots must be received (or postmarked, depending on your state) by the deadline. Drop boxes offer a secure alternative to mailing.',
  },
  {
    title: 'Track your ballot status online',
    description:
      'Most states provide an online tracker so you can confirm your ballot was received and counted.',
  },
];

function StepItem({
  step,
  index,
  dark,
}: {
  step: Step;
  index: number;
  dark: boolean;
}) {
  return (
    <div className="flex gap-6 items-start">
      <span
        className={cn(
          'text-6xl font-bold leading-none shrink-0 w-16 text-right',
          'text-brand-accent'
        )}
        aria-hidden="true"
      >
        {index + 1}
      </span>
      <div className="pt-2">
        <h3
          className={cn(
            'text-xl font-semibold mb-2',
            dark ? 'text-white' : 'text-gray-900'
          )}
        >
          {step.title}
        </h3>
        <p className={cn('text-base leading-relaxed', dark ? 'text-brand-muted' : 'text-gray-600')}>
          {step.description}
        </p>
      </div>
    </div>
  );
}

export const metadata = {
  title: 'How to Vote | Ballotbox',
  description:
    'Step-by-step guides for voting in person, early voting, and voting by mail or drop box.',
};

export default function HowToVotePage() {
  return (
    <div className="bg-brand-dark min-h-screen">
      {/* Hero */}
      <section className="bg-brand-dark py-20 md:py-32">
        <div className="max-w-5xl mx-auto px-6">
          <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight tracking-tight">
            How to Vote
          </h1>
          <p className="mt-6 text-lg md:text-xl text-brand-muted max-w-2xl leading-relaxed">
            Voting is your right. Here&apos;s a straightforward guide to every method
            available — in person, early, or by mail.
          </p>
        </div>
      </section>

      {/* Section 1 — In-Person Voting (dark) */}
      <section className="bg-brand-dark py-20 md:py-32 border-t border-white/10">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-16 leading-tight">
            Vote In Person on Election Day
          </h2>
          <div className="flex flex-col gap-12">
            {inPersonSteps.map((step, i) => (
              <StepItem key={i} step={step} index={i} dark={true} />
            ))}
          </div>
        </div>
      </section>

      {/* Section 2 — Early Voting (light) */}
      <section className="bg-brand-light py-20 md:py-32">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-16 leading-tight">
            Vote Early
          </h2>
          <div className="flex flex-col gap-12">
            {earlyVotingSteps.map((step, i) => (
              <StepItem key={i} step={step} index={i} dark={false} />
            ))}
          </div>
        </div>
      </section>

      {/* Section 3 — Vote by Mail / Drop Box (dark) */}
      <section className="bg-brand-dark py-20 md:py-32 border-t border-white/10">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-16 leading-tight">
            Vote by Mail or Drop Box
          </h2>
          <div className="flex flex-col gap-12">
            {mailSteps.map((step, i) => (
              <StepItem key={i} step={step} index={i} dark={true} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-brand-dark py-20 md:py-24 border-t border-white/10">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Know your options. Find your location.
          </h2>
          <p className="text-brand-muted text-lg mb-10 max-w-xl mx-auto">
            Enter your address on the home page to find your assigned polling
            place, nearby early voting sites, and drop box locations.
          </p>
          <Link href="/">
            <Button size="lg">Find Your Polling Place &rarr;</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
