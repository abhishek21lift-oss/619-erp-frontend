'use client';

// Error boundary for /client.
//
// Without this, a throw anywhere under /client propagates to src/app/error.tsx
// and replaces the whole application. Here it is contained to this segment.
//
// NOT shelled, for the same reason as /reset-password: everything under
// /client runs with no session — a client following an activation link has no
// account yet — so a shelled fallback would bounce the very person the route
// exists for to /login.

import RouteError from '@/components/RouteError';

export default function ClientError(
  props: { error: Error & { digest?: string }; reset: () => void },
) {
  return <RouteError {...props} shell={false} segment="client" />;
}
