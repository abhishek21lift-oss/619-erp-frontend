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
export type Portal = 'trainer' | 'member' | 'platform';

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
 * The trainer door keeps the bare keys so no trainer loses their remembered
 * account to this change; the member portal gets its own namespace.
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
 * Which portal an account belongs to — the only one it may use.
 *
 * The trainer runs the studio app, members are clients, and the platform
 * operator runs the Command Center. Anything else — a retired staff role, a
 * typo, nothing at all — belongs nowhere and gets null, which every caller
 * treats as "not signed in". There is deliberately no "everyone else is
 * staff" fallthrough: that default is how an unknown role used to be handed
 * the studio app.
 */
export function portalForRole(role: string | null | undefined): Portal | null {
  if (role === 'trainer') return 'trainer';
  if (role === 'member') return 'member';
  if (role === 'super_admin') return 'platform';
  return null;
}

/**
 * True for a page in the client app.
 *
 * Matched exactly and with a trailing slash, never as a bare prefix:
 * '/member-login'.startsWith('/member') is true, and so is
 * '/membership-plans' — a trainer page about pricing.
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
  return isMemberAppPage(pathname) ? 'member' : 'trainer';
}

/**
 * May an account whose home is `userPortal` open a page in `pagePortal`?
 *
 * Only its own. Every crossing is refused:
 *
 *   platform → trainer  REFUSED. The operator is platform-only. Supporting a
 *                       studio goes through impersonation, which mints a
 *                       session AS the studio's trainer and writes an audit
 *                       row — so the browser then holds a trainer account and
 *                       lands here as one. There used to be a standing
 *                       exception for the operator's own session, plus an
 *                       org-switcher that pointed it at any tenant; both are
 *                       gone with the x-org-id header they relied on.
 *
 *   trainer → platform  REFUSED. So is member → platform, and member ↔ trainer.
 *                       No studio account has any business rendering the
 *                       control plane, not even an empty frame of it.
 *
 * This is the client-side half only. The server enforces the same boundary and
 * does not trust this one: the auth middleware refuses a platform session on
 * every tenant path and requirePlatformOwner refuses a studio session on the
 * control plane, so the worst a bypass here achieves is a blank screen.
 */
export function mayEnterPortal(userPortal: Portal, pagePortal: Portal): boolean {
  return userPortal === pagePortal;
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
 * person want first", which for the trainer is the client list rather than the
 * dashboard.
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
  if (portal === 'trainer') return '/pt-os';
  // An account with no portal has nowhere to go but a door.
  return '/login';
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
 * Nothing read it. Not the trainer door, not the member door, not the Command
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

  const userPortal = portalForRole(role);
  if (!userPortal || !mayEnterPortal(userPortal, portalForPage(pathname))) return fallback;

  return `${pathname}${search}`;
}
