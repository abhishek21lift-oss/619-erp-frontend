'use client';

// Error boundary for /engagement (audit H-02).
//
// Without this, a throw anywhere under /engagement propagated to src/app/error.tsx
// and replaced the whole application. Now it is contained to this segment.
//
// Shelled: this area mounts Guard + AppShell in its pages, so the fallback
// re-renders them and the user keeps the nav to leave the broken page.

import RouteError from '@/components/RouteError';

export default function EngagementError(
  props: { error: Error & { digest?: string }; reset: () => void },
) {
  return <RouteError {...props} shell={true} segment="engagement" />;
}
