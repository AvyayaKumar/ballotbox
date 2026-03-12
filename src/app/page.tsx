import DashboardController from '@/components/dashboard/DashboardController';
import HowItWorksSection from '@/components/home/HowItWorksSection';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ballotbox | Find Your Polling Place',
  description: 'Hyper-local voter access dashboard — find your polling place, hours, and voting options in seconds.',
};

export default function Home() {
  return (
    <div>
      {/* Hero Section */}
      <section className="bg-brand-dark min-h-screen flex flex-col justify-center">
        <div className="max-w-3xl mx-auto px-6 py-24 w-full">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Find Your Polling Place
          </h1>
          <p className="text-xl text-brand-muted mb-10 max-w-xl">
            Enter your address to find polling locations, hours, and voting options in your area.
          </p>
          <DashboardController />
        </div>
      </section>

      {/* How It Works Section - always visible */}
      <HowItWorksSection />
    </div>
  );
}
