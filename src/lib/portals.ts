/**
 * The three doors.
 *
 * There is one auth cookie per browser but three sign-in pages, and each
 * refuses the others' accounts: /login turns away a member, /member-login
 * turns away a trainer, /platform-login turns away everyone who is not the
 * platform operator. Anything that has to know which door it is standing at
 * belongs here, so that knowledge is not re-derived — differently — in three
 * places.
 *
 * The routing half of this (which door to send somebody back to) lives in
 * public-paths.ts as signInPathFor, next to the list of pages that need no
 * session.
 *
 * ── Why 'platform' is a portal and not just a role ──────────────────────────
 *
 * The Command Center used to live at /platform inside the studio app's own
 * route group, wrapped in the studio app's own chrome, reached with the studio
 * app's own session. Its only separation was a role comparison — which meant
 * the owner's control plane and the customer's application were one program
 * that branched, and every gate between them was one forgotten `role ===` away
 * from opening.
 *
 * Making it a portal puts it on the same footing as the member app: its own
 * door, its own session audience (the server stamps `aud` from the door — see
 * the backend's middleware/platformAuth.js), its own route group, its own
 * shell, and its own host in production. The role still exists and is still
 * checked; it is no longer the only thing standing there.
 */

/** Which sign-in screen this is. Passed to the server, which enforces it. */
export type Portal = 'staff' | 'member' | 'platform';

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
  const suffix = portal === 'member' ? '.member' : portal === 'platform' ? '.platform' : '';
  return {
    email: `myptstudio.lastEmail${suffix}`,
    org: `myptstudio.lastOrg${suffix}`,
    remember: `myptstudio.remember${suffix}`,
  };
}

/**
 * Which portal an account belongs to.
 *
 * Members are clients, the platform operator runs the Command Center, and
 * everyone else is studio staff.
 *
 * Note this is the account's HOME portal, not the only place it may go — see
 * mayEnterPortal, which is the asymmetry that lets an operator walk into a
 * studio while no studio account can ever walk into the Command Center.
 */
export function portalForRole(role: string | null | undefined): Portal {
  if (role === 'member') return 'member';
  if (role === 'super_admin') return 'platform';
  return 'staff';
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

/**
 * True for a page in the Command Center.
 *
 * Matched exactly and with a trailing slash for the same reason
 * isMemberAppPage is: '/platform-login'.startsWith('/platform') is true, and
 * that page is the Command Center's PUBLIC door — folding it into the app it
 * guards would make signing in require being signed in.
 */
export function isPlatformAppPage(pathname: string): boolean {
  return pathname === '/platform' || pathname.startsWith('/platform/');
}

/** Which portal a page belongs to. */
export function portalForPage(pathname: string): Portal {
  if (isPlatformAppPage(pathname)) return 'platform';
  return isMemberAppPage(pathname) ? 'member' : 'staff';
}

/**
 * May an account whose home is `userPortal` open a page in `pagePortal`?
 *
 * Deliberately NOT symmetric, and the asymmetry is the security property:
 *
 *   platform → staff   ALLOWED. The operator supporting a studio is the whole
 *                      job. They arrive either through impersonation (which
 *                      mints a studio session and writes an audit row) or with
 *                      the org-switcher pinned to one tenant. Both are
 *                      sanctioned, both are visible, and the server scopes
 *                      them regardless of what this function says.
 *
 *   staff  → platform  REFUSED. So is member → platform, and member ↔ staff.
 *                      No studio account has any business rendering the
 *                      control plane, not even an empty frame of it.
 *
 * This is the client-side half only. The server enforces the same boundary and
 * does not trust this one: requirePlatformOwner refuses a studio session at
 * the API, so the worst a bypass here achieves is a blank console.
 */
export function mayEnterPortal(userPortal: Portal, pagePortal: Portal): boolean {
  if (userPortal === pagePortal) return true;
  return userPortal === 'platform' && pagePortal === 'staff';
}

/** Where a signed-in account of this portal belongs when it wanders out of it. */
export function homeFor(portal: Portal): string {
  if (portal === 'member') return '/member/dashboard';
  if (portal === 'platform') return '/platform';
  return '/';
}

/**
 * Where to send somebody the moment they sign in.
 *
 * NOT the same as homeFor(), and the difference is why this exists as its own
 * function. homeFor answers "where does this account belong when it wanders
 * somewhere it may not be" — a fallback. This answers "what screen does this
 * person want first", which for studio staff is the client list rather than the
 * dashboard, and for a trainer is their own schedule.
 *
 * ── Why it is a function at all ─────────────────────────────────────────────
 *
 * It was three lines inline in SignInScreen's redirect effect:
 *
 *     if (user.role === 'trainer') router.replace('/trainer/dashboard');
 *     else if (user.role === 'member') router.replace('/member/dashboard');
 *     else router.replace('/pt-os');
 *
 * A platform operator has no case there, so they fell through the `else` and
 * landed in the studio app — signing in at the Command Center's own door and
 * arriving at somebody's client list. It stayed invisible for as long as the
 * studio dashboard bounced super_admins to /platform, and the moment that
 * redirect was removed (it 404s once the console has its own hostname) there
 * was no path to the console left at all.
 *
 * Pulled out here because the version inside a component could only be tested
 * by asserting on its source text, and a source assertion cannot tell working
 * code from unreachable code — which is precisely how this shipped. As a plain
 * function it is checked by calling it.
 */
export function postSignInPath(role: string | null | undefined): string {
  const portal = portalForRole(role);
  if (portal === 'platform') return '/platform';
  if (portal === 'member') return '/member/dashboard';
  // Studio staff. A trainer gets their own schedule; everyone else gets the
  // client list. Both preserved exactly as they were — this function changed
  // where the OPERATOR lands, and nothing else.
  if (role === 'trainer') return '/trainer/dashboard';
  return '/pt-os';
}
