'use client';

// Error boundary for /operations (audit H-02).
//
// Without this, a throw anywhere under /operations propagated to src/app/error.tsx
// and replaced the whole application. Now it is contained to this segment.
//
// Not shelled, and that is not the same as bare: this segment lives under the
// (chrome) route group, so its layout has already rendered Guard + AppShell
// around whatever this boundary returns. The user keeps the nav either way.
// Passing shell here would mount a second copy of the whole shell inside the
// first.

import RouteError from '@/components/RouteError';

export default function OperationsError(
  props: { error: Error & { digest?: string }; reset: () => void },
) {
  return <RouteError {...props} shell={false} segment="operations" />;
}
