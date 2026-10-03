import DashboardController from '@/components/dashboard/DashboardController';
import HowItWorksSection from '@/components/home/HowItWorksSection';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ballotbox | Every election on your ballot, and where to vote',
  description:
    'Enter your address to see every election currently scheduled for it, from school board to U.S. Senate, with the official places to vote in each and links to learn about the candidates.',
};

export default function Home() {
  return (
    <div>
      <DashboardController />
      <HowItWorksSection />
    </div>
  );
}
