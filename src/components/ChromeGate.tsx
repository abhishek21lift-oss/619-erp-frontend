'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';

/**
 * The staff shell, and the one exception to it.
 *
 * ── The bug this exists to fix ──────────────────────────────────────────────
 *
 * `/` is two different pages wearing one URL: the public landing page for a
 * visitor with no session, and the studio dashboard for one with. The page
 * component has always known that — it branches on `!user` and returns
 * <LandingPage /> — and it used to be able to act on it, because back when
 * every page mounted its own shell, `/` put the signed-out branch ABOVE its
 * <Guard>:
 *
 *     if (!user) return <LandingPage />;      // ← reached first
 *     return <Guard><AppShell>…</AppShell></Guard>;
 *
 * Hoisting <Guard><AppShell> into the (chrome) layout was right for the other
 * ninety-six pages under it and wrong for this one: a layout renders ABOVE its
 * page, so Guard now ran first, found no user, and redirected to /login before
 * the landing branch could be reached. The marketing site did not break
 * loudly — it simply stopped existing, and opening the domain went straight to
 * the sign-in form. Nothing errored, no test failed, and the code that renders
 * the landing page was still sitting there looking correct.
 *
 * ── What this does ──────────────────────────────────────────────────────────
 *
 * For `/` with a settled, empty session: render the page with no Guard and no
 * AppShell. Both would be wrong — Guard because there is nobody to admit, and
 * AppShell because a marketing page framed by the studio's sidebar and bottom
 * navigation is the studio app pretending to be a website.
 *
 * Everything else — every other route under (chrome), and `/` itself for a
 * signed-in user — gets exactly what it got before, from the same two
 * components in the same order. That is deliberate: a signed-in user's tree is
 * byte-for-byte unchanged, so the shell is still mounted once per session and
 * still survives client-side navigation.
 *
 * `loading` is deliberately part of the condition rather than ignored. During
 * the auth bootstrap the answer is not yet "no user", it is "not known" — and
 * treating unknown as signed-out would flash the landing page at somebody who
 * is signed in, on every cold load of the dashboard. Waiting keeps Guard's
 * splash exactly where it already was.
 */

/** The one route under (chrome) that has something to show a visitor. */
export const LANDING_PATH = '/';

export function isLandingRoute(pathname: string): boolean {
  return pathname === LANDING_PATH;
}

export default function ChromeGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const { user, loading } = useAuth();

  if (isLandingRoute(pathname) && !loading && !user) return <>{children}</>;

  return (
    <Guard>
      <AppShell>{children}</AppShell>
    </Guard>
  );
}
