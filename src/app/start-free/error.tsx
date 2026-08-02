'use client';

// Error boundary for /start-free.
//
// Unshelled on purpose: this route is public and mounts neither Guard nor
// AppShell, so rendering the shell in the fallback would ask an unauthenticated
// visitor's browser for nav that needs a session it does not have.

import RouteError from '@/components/RouteError';

export default function StartFreeError(
  props: { error: Error & { digest?: string }; reset: () => void },
) {
  return <RouteError {...props} shell={false} segment="start-free" />;
}
