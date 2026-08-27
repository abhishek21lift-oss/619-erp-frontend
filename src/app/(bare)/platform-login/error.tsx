'use client';

// Error boundary for /platform-login.
//
// Same shape and the same reason as the other two sign-in doors: without it a
// throw here propagates to src/app/error.tsx and replaces the whole
// application.
//
// NOT shelled. Guard redirects to a sign-in page when there is no session, and
// nobody reaching the Command Center's door has one yet — a shelled fallback
// would bounce the operator to a route that may be the one throwing.

import RouteError from '@/components/RouteError';

export default function PlatformLoginError(
  props: { error: Error & { digest?: string }; reset: () => void },
) {
  return <RouteError {...props} shell={false} segment="platform-login" />;
}
