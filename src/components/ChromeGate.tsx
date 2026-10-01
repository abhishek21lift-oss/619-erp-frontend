'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Guard, { GuardPending } from '@/components/Guard';
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

/**
 * ── `anonymousHint`, and the server-rendered landing page ──────────────────
 *
 * The rule above meant the HTML the server sends for `/` was always Guard's
 * splash — `loading` is true until the browser has asked /api/auth/me — so a
 * crawler that does not run JavaScript never saw the landing page at all.
 *
 * When the request carried no session cookie (lib/session-hint.ts), `/` now
 * renders the landing page during the bootstrap too, with Guard's own splash
 * laid over it until the check answers. What a person sees is unchanged: the
 * same splash, then the landing page (no session) or the dashboard (session).
 * The splash is an overlay rather than a replacement so the landing page is in
 * the HTML underneath it, and `{loading && …}` keeps the tree's shape stable so
 * the page is not remounted when the overlay goes.
 *
 * A cached user (`user` set while still loading) takes the shell path, as
 * before. Every other route is untouched.
 */
export default function ChromeGate({
  children,
  anonymousHint = false,
}: { children: React.ReactNode; anonymousHint?: boolean }) {
  const pathname = usePathname() ?? '';
  const { user, loading } = useAuth();

  if (isLandingRoute(pathname) && !user && (!loading || anonymousHint)) {
    return (
      <>
        {children}
        {loading && (
          <div className="fixed inset-0 z-[2147483000]" data-no-pull-refresh>
            <GuardPending />
          </div>
        )}
      </>
    );
  }

  return (
    <Guard>
      <AppShell>{children}</AppShell>
    </Guard>
  );
}
