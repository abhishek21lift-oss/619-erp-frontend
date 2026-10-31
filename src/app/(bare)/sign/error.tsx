'use client';

// Error boundary for /sign.
//
// Without this, a throw anywhere under /sign propagates to src/app/error.tsx
// and replaces the whole application. Here it is contained to this segment.
//
// NOT shelled: the page exists for a client with no session, arriving from a
// one-time link. A shelled fallback would Guard them out of the only screen
// their link opens.

import RouteError from '@/components/RouteError';

export default function SignError(
  props: { error: Error & { digest?: string }; reset: () => void },
) {
  return <RouteError {...props} shell={false} segment="sign" />;
}
