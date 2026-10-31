import type { Metadata } from 'next';
import PtOsLanding from '@/components/landing/PtOsLanding';
import { PT_OS_STRUCTURED_DATA_JSON } from '@/lib/pt-os-structured-data';

export const metadata: Metadata = {
  title: 'PT OS: Personal Trainer Software for India',
  description:
    'PT OS helps Indian personal trainers run clients, programmes, sessions, payments and renewals in one workspace. Start free today.',
  robots: {
    index: true,
    follow: true,
    'max-snippet': -1,
    'max-image-preview': 'large',
  },
  alternates: { canonical: '/pt-os' },
  openGraph: {
    url: 'https://myptstudio.com/pt-os',
    siteName: 'MY PT STUDIO',
    title: 'PT OS: Personal Trainer Software for India',
    description:
      'Clients, programmes, sessions, payments and renewals for Indian personal trainers — in one professional workspace.',
    type: 'website',
  },
};

export default function PtOsLandingPage() {
  return (
    <>
      {/* In the page, not a component: it must be in the HTML a crawler gets. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: PT_OS_STRUCTURED_DATA_JSON }}
      />
      <PtOsLanding />
    </>
  );
}
