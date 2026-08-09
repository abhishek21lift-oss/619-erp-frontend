'use client';

// Error boundary for /forgot-password (audit H-02).
//
// Without this, a throw anywhere under /forgot-password propagated to src/app/error.tsx
// and replaced the whole application. Now it is contained to this segment.
//
// NOT shelled: Guard redirects to /login when there is no session, so a
// shelled fallback here would bounce an unauthenticated visitor to a route
// that may be the one throwing.

import RouteError from '@/components/RouteError';

export default function ForgotPasswordError(
  props: { error: Error & { digest?: string }; reset: () => void },
) {
  return <RouteError {...props} shell={false} segment="forgot-password" />;
}
