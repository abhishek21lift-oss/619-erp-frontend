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
  '/start-free',
  // Public PT OS marketing page. `/pt-os/clients` remains authenticated.
  '/pt-os',
] as const;

/** True when `pathname` is one of the sessionless pages. */
export function isSessionlessPage(pathname: string): boolean {
  return (SESSIONLESS_PAGES as readonly string[]).includes(pathname);
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
