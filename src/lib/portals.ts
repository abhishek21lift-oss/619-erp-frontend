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
  return '/pt-os';
}

/**
 * Where to send somebody after they sign in, honouring where they were going.
 *
 * ── The bug this exists to fix ──────────────────────────────────────────────
 *
 * `proxy.ts` has always written the destination onto the sign-in URL when it
 * bounces a missing or expired session:
 *
 *     loginUrl.searchParams.set('redirect', pathname)
 *
 * Nothing read it. Not the staff door, not the member door, not the Command
 * Center's. A trainer whose 15-minute access token lapsed while they were
 * three levels deep — /pt-os/clients/:id/payments, mid-entry — signed back in
 * and arrived at the client list, with no way back but navigation and no hint
 * they had been anywhere. The parameter has promised a return trip for as long
 * as it has existed and never once made one, which is worse than not writing
 * it: to the next person reading proxy.ts, the feature looks done.
 *
 * ── Why this is not just `router.replace(raw)` ──────────────────────────────
 *
 * That line is the textbook open redirect. The value arrives from the URL bar,
 * so it is attacker-controlled: `?redirect=https://evil.example/login` renders
 * a real sign-in form on the real domain and then hands the freshly
 * authenticated person to a copy of it. Every check below is load-bearing:
 *
 *   · must start with a single `/` — no absolute URLs, and no scheme-relative
 *     `//evil.example`, which `new URL()` resolves to a different ORIGIN
 *   · no backslashes — browsers normalise `\` to `/`, so `/\evil.example` is
 *     scheme-relative by the time it reaches the network stack while sailing
 *     past a naive startsWith('/')
 *   · no control characters or spaces, which smuggle newlines into headers and
 *     truncate comparisons
 *   · not a sign-in page itself, or signing in returns you to signing in
 *   · the portal check — the same mayEnterPortal that Guard uses, so a member
 *     handed `?redirect=/pt-os/clients` lands on their own dashboard rather
 *     than an empty frame of the trainer's app. Client-side half only; the API
 *     refuses them either way.
 *
 * Anything that fails falls back to postSignInPath — the behaviour that
 * existed before this function did, so the worst case is exactly today's.
 */
export function safeReturnTo(raw: string | null | undefined, role: string | null | undefined): string {
  const fallback = postSignInPath(role);
  if (!raw) return fallback;

  // Structural checks first. `new URL()` is deliberately not reached until the
  // value has been shown to be incapable of changing origin.
  if (!raw.startsWith('/')) return fallback;
  if (raw.startsWith('//')) return fallback;
  if (raw.includes('\\')) return fallback;
  for (let i = 0; i < raw.length; i += 1) {
    const code = raw.charCodeAt(i);
    if (code <= 0x20 || code === 0x7f) return fallback;
  }

  let pathname: string;
  let search: string;
  try {
    // The base host is unreachable on purpose: if anything in `raw` still
    // managed to make this absolute, the origin comparison catches it here
    // rather than the person being delivered to a real one.
    const url = new URL(raw, 'http://localhost');
    if (url.origin !== 'http://localhost') return fallback;
    pathname = url.pathname;
    search = url.search;
  } catch {
    return fallback;
  }

  // A door is never a destination.
  if (pathname === '/login' || pathname === '/member-login' || pathname === '/platform-login') {
    return fallback;
  }

  if (!mayEnterPortal(portalForRole(role), portalForPage(pathname))) return fallback;

  return `${pathname}${search}`;
}
