import type { Metadata } from 'next';
import PtOsLanding from '@/components/landing/PtOsLanding';

export const metadata: Metadata = {
  title: 'PT OS: Personal Trainer Software for India',
  description:
    'PT OS helps Indian personal trainers run clients, programmes, sessions, payments and renewals in one workspace. Start free today.',
  robots: { index: true, follow: true },
  alternates: { canonical: '/pt-os' },
  openGraph: {
    url: 'https://myptstudio.com/pt-os',
    title: 'PT OS: Personal Trainer Software for India',
    description:
      'Clients, programmes, sessions, payments and renewals for Indian personal trainers — in one professional workspace.',
    type: 'website',
  },
};

export default function PtOsLandingPage() {
  return <PtOsLanding />;
}
