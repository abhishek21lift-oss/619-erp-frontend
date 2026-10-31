/**
 * Pages a person can open without an account.
 *
 * Keep this list exact. Authenticated sub-routes must never become public just
 * because their parent has a public marketing page.
 */

import { isMemberAppPage, isPlatformAppPage } from './portals';

/** Exact pathnames reachable with no session. */
export const SESSIONLESS_PAGES = [
  '/',
  '/login',
  '/member-login',
  '/platform-login',
  '/forgot-password',
  '/reset-password',
  '/auth/set-password',
  '/client/activate',
  // Remote PAR-Q + consent signing. The one-time token is in the query
  // string, and the page has no session by design — the client may not have
  // a login yet.
  '/sign',
  '/start-free',
  // Public PT OS marketing page. `/pt-os/clients` remains authenticated.
  '/pt-os',
] as const;

/** True when `pathname` is one of the sessionless pages. */
export function isSessionlessPage(pathname: string): boolean {
  return (SESSIONLESS_PAGES as readonly string[]).includes(pathname);
}

/**
 * Next's generated social-preview images (`opengraph-image`, `twitter-image`).
 *
 * They sit at the same origin as the page that declares them, under its path,
 * and Next serves them from a hashed filename — `/opengraph-image?a1b2` for the
 * root file and `/pt-os/opengraph-image-79vnhd?c3d4` for a nested one. The auth
 * proxy has to let them through or the `og:image` URL in every page's `<head>`
 * redirects to `/login` and every share previews a sign-in form.
 *
 * Shortcut: this is a pathname match, not a check that the file exists. A
 * request to `/anything/opengraph-image` reaches the app router and 404s.
 */
export function isMetadataImagePath(pathname: string): boolean {
  return /^\/(?:.*\/)?(?:opengraph-image|twitter-image)(?:-[a-z0-9]+)?$/.test(pathname);
}

/**
 * Root-level ownership-proof files written by search engines (`google<hex>.html`,
 * `BingSiteAuth.xml`). They must be fetchable with no session — the auth proxy
 * was redirecting them to `/login`, so the crawler that came to verify the
 * domain got a sign-in form instead.
 */
export function isVerificationFile(pathname: string): boolean {
  return /^\/(?:google[0-9a-f]+\.html|BingSiteAuth\.xml)$/i.test(pathname);
}

/**
 * Which sign-in page to send somebody back to from `pathname`.
 */
export function signInPathFor(pathname: string): '/login' | '/member-login' | '/platform-login' {
  if (pathname === '/member-login') return '/member-login';
  if (pathname === '/platform-login') return '/platform-login';
  if (isPlatformAppPage(pathname)) return '/platform-login';
  return isMemberAppPage(pathname) ? '/member-login' : '/login';
}
