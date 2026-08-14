/**
 * Pages a person can open without an account.
 *
 * ── Why this file exists ──
 *
 * There were three independent copies of this idea and they did not agree:
 *
 *   src/proxy.ts     PUBLIC_PREFIXES   — the edge redirect to /login
 *   src/lib/http.ts  PUBLIC_CLIENT_PATHS — the 401 → session-expired redirect
 *   Guard            role props        — the in-page redirect
 *
 * Adding /client/activate to the first one was not enough, because the second
 * one then bounced the page half a second after it rendered: AuthProvider
 * calls /api/auth/me on mount, a visitor with no session gets a 401, and
 * http's handler dispatches `session-expired` for any path it does not
 * recognise. Two separate bug reports, one missing entry each, same root
 * cause — a list that has to be updated in more than one place eventually
 * is not.
 *
 * So the page list lives here and both consumers import it. The proxy keeps
 * its own extra entries for assets (/theme-init.js, /manifest.json, /_next…)
 * because those are not pages and http never sees them.
 *
 * ── What belongs here ──
 *
 * A page that a person with NO SESSION is expected to reach and use. In
 * practice that is two kinds:
 *
 *   • Entry points — the front page, sign in, the signup flow.
 *   • Token links — where somebody arrives from an email holding a
 *     credential that IS the token in the URL. These are the dangerous ones:
 *     a redirect drops the query string, so the token is destroyed and the
 *     link cannot be retried.
 *
 * What does NOT belong here: anything a signed-in user reads. A kiosk whose
 * session expired SHOULD be sent to sign in again.
 */

import { isMemberAppPage, isPlatformAppPage } from './portals';

/** Exact pathnames reachable with no session. */
export const SESSIONLESS_PAGES = [
  '/',
  '/login',
  // The client-facing sign-in. Same screen as /login with a different portal,
  // and just as public — a member arriving here has no session by definition.
  '/member-login',
  // The Command Center's door. Public in the sense that matters here — the
  // operator arriving at it has no session by definition — but it is the only
  // page on the platform host that is, and on the studio host the edge proxy
  // refuses it outright (see proxy.ts).
  '/platform-login',
  '/forgot-password',
  // Token links. A redirect away from any of these takes the ?token= with it
  // — redirectToLogin preserves only the pathname — so the credential is gone
  // and the user needs a fresh email.
  '/reset-password',
  '/auth/set-password',
  '/client/activate',
  '/start-free',
] as const;

/** True when `pathname` is one of the sessionless pages. */
export function isSessionlessPage(pathname: string): boolean {
  return (SESSIONLESS_PAGES as readonly string[]).includes(pathname);
}

/**
 * Which sign-in page to send somebody back to from `pathname`.
 *
 * There are two doors now and they are not interchangeable: /login refuses a
 * member account and /member-login refuses a staff one. So every "you need to
 * sign in" path — the edge redirect, the 401 handler, logout, the idle
 * timeout — has to pick the right one, or a client whose session lapsed is
 * shown Admin Login and told, correctly but uselessly, that members cannot
 * sign in there.
 *
 * The member app is the /member segment. Matched exactly and with a trailing
 * slash rather than as a prefix, because '/member-login'.startsWith('/member')
 * is true and would otherwise fold the sign-in page into the app it guards.
 */
export function signInPathFor(pathname: string): '/login' | '/member-login' | '/platform-login' {
  if (pathname === '/member-login') return '/member-login';
  if (pathname === '/platform-login') return '/platform-login';
  // The Command Center before the member app: both are exact-matched against
  // their own app segment, so the order is not load-bearing, but a session
  // that lapsed inside the console must come back to the console's own door —
  // sending the operator to /login would hand them a studio session, which the
  // control plane now refuses.
  if (isPlatformAppPage(pathname)) return '/platform-login';
  return isMemberAppPage(pathname) ? '/member-login' : '/login';
}
