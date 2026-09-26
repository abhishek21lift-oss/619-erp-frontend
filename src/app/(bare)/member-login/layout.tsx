import type { Metadata } from 'next';

// A member may well add the sign-in page to their home screen before they have
// signed in at all. Give it the member app's manifest so that icon opens the
// member app — see (bare)/member/layout.tsx.
export const metadata: Metadata = {
  manifest: '/member-manifest.json',
  appleWebApp: { capable: true, title: 'My PT', statusBarStyle: 'black-translucent' },
};

export default function MemberLoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
