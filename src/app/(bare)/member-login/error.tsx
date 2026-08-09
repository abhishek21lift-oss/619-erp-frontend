'use client';

// Error boundary for /member-login.
//
// Without this, a throw anywhere under /member-login propagates to
// src/app/error.tsx and replaces the whole application. Here it is contained
// to this segment.
//
// NOT shelled, for the same reason as /login: somebody signing in has no
// session, so a shelled fallback would try to Guard the very page that exists
// to get them past the Guard.

import RouteError from '@/components/RouteError';

export default function MemberLoginError(
  props: { error: Error & { digest?: string }; reset: () => void },
) {
  return <RouteError {...props} shell={false} segment="member-login" />;
}
