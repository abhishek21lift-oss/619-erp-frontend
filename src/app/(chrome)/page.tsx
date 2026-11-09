// `/` — the studio dashboard, and no longer a public marketing page.
//
// The domain opens on the unified sign-in form now, so this route is behind
// Guard like every other page under (chrome). It keeps an explicit noindex
// rather than relying on the root layout's default, because the whole origin's
// default is the thing this page used to opt out of.
//
// `StudioHome` still renders its signed-out branch when it sees no user, but
// ChromeGate never lets that happen: an anonymous request is redirected first.

import type { Metadata } from 'next';
import StudioHome from '@/components/StudioHome';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function Page() {
  return <StudioHome />;
}
