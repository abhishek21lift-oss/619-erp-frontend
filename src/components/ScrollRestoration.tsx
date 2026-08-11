'use client';

import { useEffect } from 'react';
import { installScrollRestoration } from '@/lib/scroll-restoration';

/**
 * Renders nothing; it exists to own the lifetime of the scroll listeners.
 *
 * Mounted from the root layout rather than from AppShell, for the same reason
 * NavScrollProvider is: the member portal never renders AppShell, and back
 * navigation inside it needs to keep its place just as much as the staff app
 * does. The root layout is also the only place that is mounted exactly once per
 * session, which matters here — two installs would mean two `scrollTo` calls
 * racing each other on every restore.
 */
export default function ScrollRestoration() {
  useEffect(() => installScrollRestoration(), []);
  return null;
}
