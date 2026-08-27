// `/` — the one indexable route on this origin.
//
// ── Why this file is a server component doing almost nothing ────────────────
//
// The root layout sets `robots: { index: false, follow: false }` as the
// DEFAULT for the whole origin, because 122 of this app's 124 routes are
// authenticated and hold client health data, payment records and revenue.
// Default-deny is the safe posture: a page added tomorrow is invisible to
// search until somebody deliberately says otherwise.
//
// A page opts back IN by exporting its own `metadata`, and Next can only read
// that from a SERVER component. The whole of `/` used to be one `'use client'`
// file, so it had no way to override the default and the marketing site could
// not be indexed at all — while `sitemap.ts` was simultaneously advertising it
// to crawlers at priority 1.0. The two halves contradicted each other and the
// meta tag won.
//
// So the client half moved to components/StudioHome.tsx verbatim, and this
// file exists to carry the metadata above it. Nothing about the behaviour
// changed: `/` is still the landing page for a visitor and the studio
// dashboard for a signed-in user, still resolved by ChromeGate, and a
// signed-in user's tree is identical to what it was.
//
// ── Why `/` is not moved out of (chrome) ────────────────────────────────────
//
// It looks like it belongs in a public marketing group. It cannot go there.
// `/` is two pages wearing one URL, and ChromeGate exists specifically to
// carry that exception — see the comment in src/components/ChromeGate.tsx,
// which was written after hoisting Guard above this route made the marketing
// site "stop existing" without erroring. Moving the route would take the
// signed-in dashboard at `/` away from Guard and AppShell, which is a
// behaviour change, not a metadata one. The route structure was never what
// made this page un-indexable; the missing metadata export was.

import type { Metadata } from 'next';
import StudioHome from '@/components/StudioHome';

export const metadata: Metadata = {
  // The opt-in. Explicit on both keys rather than relying on a partial merge
  // over the root's `{ index: false, follow: false }`.
  robots: { index: true, follow: true },
  // Set here rather than globally. The root layout used to declare
  // `alternates: { canonical: '/' }`, which every page inherited — so all 124
  // URLs told a crawler they were really the homepage. Inert while everything
  // was noindex; actively harmful the moment anything is not.
  alternates: { canonical: '/' },
};

export default function Page() {
  return <StudioHome />;
}
