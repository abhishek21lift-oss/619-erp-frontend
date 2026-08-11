'use client';

// The error boundary for the chrome route group itself.
//
// Every segment under (chrome) already had one — 22 of them — and each passes
// shell={false} because the shell above them is still standing. The GROUP had
// none, so the routes that live directly in it, `/` (the dashboard, and the
// Home tab of the bottom navigation) among them, had no nearer boundary than
// src/app/error.tsx.
//
// That boundary sits ABOVE (chrome)/layout.tsx, so catching there does not
// replace the page — it replaces the layout. Measured in a real browser: a
// throw on `/` unmounted ChromeLayout, the Guard inside it and AppShell (probe
// live counts 1 → 0), and RouteError's own shell={true} copy mounted in their
// place. The persistent bottom navigation is destroyed and rebuilt as part of
// that swap, which is indistinguishable from the flicker this file exists to
// stop — a page-level failure should cost the page, not the chrome around it.
//
// shell={false} for the same reason all 22 siblings pass it: when this renders,
// AppShell is still mounted above and drawing the nav. Passing shell here would
// paint a second one inside the first.

import RouteError from '@/components/RouteError';

export default function ChromeError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError {...props} shell={false} />;
}
