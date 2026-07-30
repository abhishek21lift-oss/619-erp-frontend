'use client';

// Root error boundary — the last Next.js boundary before global-error.tsx.
//
// With per-segment error.tsx files in place (audit H-02) this now only catches
// throws from routes that have no nearer boundary: the root page and the
// catch-all. It stays shelled because those are authenticated surfaces.
//
// The fallback itself lives in components/RouteError so this and all 27 segment
// boundaries behave identically. That move fixed three defects this file used
// to have: it printed `error.message` in production, it hardcoded light-mode
// colours in a theme-adaptive app, and it never reported to Sentry — which
// mattered most, because being the nearest boundary meant it caught page errors
// before components/ErrorBoundary could report them.

import RouteError from '@/components/RouteError';

export default function RootError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError {...props} shell />;
}
