/**
 * The two doors.
 *
 * There is one auth cookie per browser but two sign-in pages, and each refuses
 * the other's accounts: /login turns away a member, /member-login turns away a
 * trainer. Anything that has to know which door it is standing at belongs
 * here, so that knowledge is not re-derived — differently — in three places.
 *
 * The routing half of this (which door to send somebody back to) lives in
 * public-paths.ts as signInPathFor, next to the list of pages that need no
 * session.
 */

/** Which sign-in screen this is. Passed to the server, which enforces it. */
export type Portal = 'staff' | 'member';

/**
 * localStorage keys for the "continue as …" chip, namespaced per portal.
 *
 * These were three unsuffixed keys shared by both sign-in pages. A client
 * opening Member Login on a device their trainer had used was met by the
 * trainer's initial in the avatar, the trainer's email pre-filled in the form,
 * and the trainer's studio name printed under the heading. Nothing leaked —
 * it is that browser's own localStorage, and the client could already have
 * read it — but the client's login page was wearing somebody else's identity,
 * which is not a thing a client should ever be shown.
 *
 * Staff keep the bare keys so no trainer loses their remembered account to
 * this change; the member portal gets its own namespace.
 */
export function rememberKeys(portal: Portal): { email: string; org: string; remember: string } {
  const suffix = portal === 'member' ? '.member' : '';
  return {
    email: `myptstudio.lastEmail${suffix}`,
    org: `myptstudio.lastOrg${suffix}`,
    remember: `myptstudio.remember${suffix}`,
  };
}

/** Which portal an account belongs to. Members are clients; everyone else is staff. */
export function portalForRole(role: string | null | undefined): Portal {
  return role === 'member' ? 'member' : 'staff';
}

/**
 * True for a page in the client app.
 *
 * Matched exactly and with a trailing slash, never as a bare prefix:
 * '/member-login'.startsWith('/member') is true, and so is
 * '/membership-plans' — a staff page about pricing.
 */
export function isMemberAppPage(pathname: string): boolean {
  return pathname === '/member' || pathname.startsWith('/member/');
}

/** Which portal a page belongs to. */
export function portalForPage(pathname: string): Portal {
  return isMemberAppPage(pathname) ? 'member' : 'staff';
}

/** Where a signed-in account of this portal belongs when it wanders out of it. */
export function homeFor(portal: Portal): string {
  return portal === 'member' ? '/member/dashboard' : '/';
}
