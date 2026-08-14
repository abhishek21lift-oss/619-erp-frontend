/**
 * proxy.ts — Server-side auth guard (Next.js 16+)
 *
 * Security headers used to be set here too; they now live in next.config.js
 * (see src/lib/security-headers.js) so they also cover /api and static assets,
 * which this file's matcher excludes.
 *
 * Renamed from middleware.ts to proxy.ts per Next.js 16 convention.
 * https://nextjs.org/docs/messages/middleware-to-proxy
 *
 * Runs at the Next.js edge BEFORE any page component renders.
 * Unauthenticated requests to protected routes are redirected to /login
 * with the original destination preserved as ?redirect= for post-login
 * deep-link restoration.
 *
 * IMPORTANT: /api/* routes are EXCLUDED from this proxy entirely.
 * The backend (Render) handles its own authentication. Intercepting
 * /api/* here would block the rewrite proxy and cause HTTP 405 errors.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { buildReportOnlyCsp } from '@/lib/security-headers';
import { SESSIONLESS_PAGES, signInPathFor } from '@/lib/public-paths';

const PUBLIC_PREFIXES: string[] = [
  // The pages a person can open with no account — the front page, sign in,
  // signup, and the token links people arrive at from an email. Shared with
  // http.ts's 401 handler, because keeping two copies is what caused the
  // client activation link to break twice in a row: once here (307 to /login
  // before the page ran) and once there (the page rendered, then a 401 on
  // /api/auth/me redirected it away half a second later). Both dropped the
  // ?token=, which is the credential.
  //
  // Prefix-matched here, exact-matched in http.ts. That difference is safe in
  // this direction — the proxy being slightly more permissive only means a
  // page renders and its own Guard decides — but it is why /client/activate
  // is listed rather than /client: a signed-in client's data will live under
  // that segment later and must stay gated.
  ...SESSIONLESS_PAGES,

  // Below: not pages. The proxy sees asset and API requests that http.ts
  // never does, so these stay local to this file.
  '/checkin',
  '/_next',
  '/api/health',
  // The member fingerprint-enrolment prefix sat here, for the biometric
  // check-in screens. That check-in path is gone; staff passkey login lives
  // under the auth prefix below and is still covered.
  '/api/auth',
  '/models',
  '/favicon.ico',
  // The matcher below exempts image and font extensions but NOT .json, so
  // without this the PWA manifest 307s to /login for anyone not signed in —
  // and a manifest the browser can't read means no install prompt and no app
  // icon. It only describes the app's name, icons and start URL; nothing here
  // is private.
  '/manifest.json',
  // The Command Center's manifest, public for exactly the same reason and
  // discovered the same way: without it the browser's request for it 307s to
  // /login, the manifest never parses, and "Add to Home Screen" silently falls
  // back to the page's own URL and title. It describes the console's name,
  // icons and start URL — nothing here is private, and anyone who can see the
  // link tag in the HTML already knows the console exists.
  '/platform-manifest.json',
  // The matcher below exempts image and font extensions but NOT .js, so
  // without this the pre-paint theme script 307s to /login for anyone signed
  // out — meaning the login page itself flashes the wrong theme. It only reads
  // localStorage and sets a class name.
  '/theme-init.js',
  // Same reason as the line above, and the same failure: without this entry
  // /no-zoom.js 307s to /login and the pinch-gesture blocker never runs. That
  // failure is close to invisible — the viewport meta tag in layout.tsx still
  // renders and still reads like the fix, but it is the one layer iOS ignores,
  // so the gesture would come back on exactly the devices the script exists
  // for. Verified by requesting the path, not by reading the matcher.
  // It adds four event listeners and reads nothing.
  '/no-zoom.js',
  '/logo.png',
  '/619-logo.png',
  '/sitemap.xml',
  '/robots.txt',
  '/icons',
  '/images',
];

/**
 * Reachable with no session.
 *
 * Exported as `isPublicProxyPath` for tests: the list mixes pages with assets,
 * and an asset silently missing from it does not fail loudly — it 307s to
 * /login, which for a manifest or a theme script looks like the feature simply
 * not working rather than like an auth redirect.
 */
export function isPublicProxyPath(pathname: string): boolean {
  return isPublicPath(pathname);
}

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p + '?')
  );
}

// The ENFORCED security headers (CSP, HSTS, COOP, CORP, …) are NOT set here.
// They live in next.config.js via src/lib/security-headers.js, because the
// matcher at the bottom of this file deliberately skips `api`,
// `_next/static`, `_next/image`, favicon and every image/font extension — so
// anything set there would miss API responses and every static asset.
// Re-adding them here would silently override that single source of truth.
//
// What DOES belong here is the Report-Only policy, because it needs a
// per-request nonce and next.config.js headers() are static. It only applies
// to documents, which is the only place a CSP does anything at all.

/** Base64 nonce. crypto.getRandomValues is available in the edge runtime. */
function makeNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Attach the candidate strict CSP as Report-Only, so violations are measured
 * against real traffic before 'unsafe-inline' is removed from the enforced
 * policy.
 *
 * Next.js reads the nonce out of the Content-Security-Policy REQUEST header
 * and stamps its own inline hydration scripts with it. That is why the request
 * header is set as well as the response header — without it every Next.js
 * bootstrap script would report a violation and the signal would be all noise.
 */
function withReportOnlyCsp(req: NextRequest): NextResponse {
  const nonce = makeNonce();
  const csp = buildReportOnlyCsp(process.env, nonce, process.env.CSP_REPORT_URI);

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set('Content-Security-Policy-Report-Only', csp);
  return res;
}

function redirectToLogin(req: NextRequest, deleteTokenCookie = false): NextResponse {
  const loginUrl = req.nextUrl.clone();
  const { pathname } = req.nextUrl;
  // Two doors, and each refuses the other's accounts: a client whose token
  // expired under /member must land on Member Login, not on the Admin page
  // that will tell them members cannot sign in there.
  const signIn = signInPathFor(pathname);
  loginUrl.pathname = signIn;
  if (pathname !== '/' && pathname !== signIn) {
    loginUrl.searchParams.set('redirect', pathname);
  }
  const res = NextResponse.redirect(loginUrl);
  if (deleteTokenCookie) res.cookies.delete('token');
  return res;
}

// ── Host isolation for the Command Center ───────────────────────────────────
//
// The strongest separation available to a single Next.js deployment: the
// control plane is SERVED only on its own hostname, and the studio app's
// hostname does not have it at all.
//
// This is what turns "a route group the operator's role can reach" into "a
// different site". A tenant admin poking at /platform on the app domain does
// not get a login redirect or an empty console — they get a 404, the same
// answer they would get for a path that was never built. Nothing about the
// console's existence, its route names or its shape is observable from the
// customer's domain.
//
// ── Opt-in, and why ─────────────────────────────────────────────────────────
//
// Unset COMMAND_CENTER_HOST means no host rule, and both surfaces answer on
// whatever host is asked — which is exactly what local development and any
// single-domain deployment need. Making it opt-in also means this change
// cannot take the console offline on deploy: the boundary tightens when an
// operator points a second hostname at the same container and sets this
// variable, which is a DNS change plus an nginx server block, not a rewrite.
//
// Read at request time rather than captured at module scope so the value can
// come from the runtime environment of the standalone server rather than
// having to be baked in at build.
export function commandCenterHost(): string | null {
  const h = process.env.COMMAND_CENTER_HOST;
  return h ? h.trim().toLowerCase() : null;
}

/** The hostname this request was made to, without the port. */
export function requestHost(req: NextRequest): string {
  const raw = req.headers.get('host') ?? '';
  return raw.split(':')[0].trim().toLowerCase();
}

/** Pages that belong to the Command Center, including its own sign-in door. */
export function isCommandCenterPath(pathname: string): boolean {
  return pathname === '/platform'
    || pathname.startsWith('/platform/')
    || pathname === '/platform-login';
}

/**
 * Paths the host rule must not touch: the same files, served identically to
 * both sites.
 *
 * The matcher at the bottom of this file exempts image and font EXTENSIONS but
 * not `.js` or `.json`, so /theme-init.js, /no-zoom.js and /manifest.json all
 * reach this function. Without this list the host rule would 404 them on the
 * Command Center host — and the first symptom would be the console flashing
 * the wrong theme on every load, which is a long way from anything that would
 * make somebody suspect a hostname check.
 *
 * Kept as its own list rather than reusing PUBLIC_PREFIXES because that one
 * mixes pages with assets, and pages are precisely what the host rule exists
 * to separate: folding them together would exempt /login and /start-free too,
 * and the studio's sign-in page would answer on the operator's domain.
 */
const HOST_NEUTRAL_PREFIXES = [
  '/_next',
  '/api',
  '/models',
  '/icons',
  '/images',
  '/favicon.ico',
  '/manifest.json',
  // Host-neutral rather than Command-Center-only, which is the counter-intuitive
  // half. isCommandCenterPath matches /platform, /platform/… and
  // /platform-login — it does NOT match this file, so without an exemption the
  // host rule would 404 the console's own manifest ON the console's host. The
  // symptom would be an installable app that installs as the wrong app, which
  // is precisely the bug this manifest exists to fix.
  '/platform-manifest.json',
  '/theme-init.js',
  '/no-zoom.js',
  '/logo.png',
  '/619-logo.png',
  '/sitemap.xml',
  '/robots.txt',
];

export function isHostNeutralPath(pathname: string): boolean {
  return HOST_NEUTRAL_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );
}

/**
 * A 404 that looks like every other 404.
 *
 * `rewrite` to a path that does not exist rather than a redirect or a JSON
 * body, so the response is Next's own not-found page — indistinguishable from
 * a genuine typo. A distinctive error would answer the one question the host
 * split is meant to leave unanswerable: whether there is anything here.
 */
function notFound(req: NextRequest): NextResponse {
  const url = req.nextUrl.clone();
  url.pathname = '/_not-found';
  return NextResponse.rewrite(url);
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Host isolation runs FIRST — before the public-path allowance, before the
  // token check. /platform-login is a public page, so a check placed after
  // isPublicPath would serve the Command Center's door on the studio domain to
  // anyone who guessed the URL.
  const ccHost = commandCenterHost();
  if (ccHost && !isHostNeutralPath(pathname)) {
    const onCommandCenter = requestHost(req) === ccHost;
    if (onCommandCenter !== isCommandCenterPath(pathname)) {
      // Two cases, one rule, both 404:
      //   · a studio path asked for on the Command Center host
      //   · a Command Center path asked for on the studio host
      // The second is the security-relevant direction; the first keeps the
      // operator's domain from quietly becoming a second front door to the
      // customer app, which would put the studio login on a hostname none of
      // its cookie, CORS or CSP configuration expects.
      //
      // Assets and framework routes never reach here — the matcher at the
      // bottom of this file excludes /_next, /api and every image and font
      // extension — so this only ever decides page requests.
      return notFound(req);
    }
  }

  if (isPublicPath(pathname)) {
    return withReportOnlyCsp(req);
  }

  // Accept token from cookie or Authorization: Bearer header
  const token =
    req.cookies.get('token')?.value ??
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return redirectToLogin(req);
  }

  const secret = process.env.JWT_SECRET;
  if (secret) {
    // Full cryptographic verification — requires JWT_SECRET in frontend env
    try {
      await jwtVerify(token, new TextEncoder().encode(secret));
      return withReportOnlyCsp(req);
    } catch {
      return redirectToLogin(req, true);
    }
  }

  // Fallback: decode without verify, check expiry only.
  // Signature is still verified by the backend on every API call.
  try {
    const parts = token.split('.');
    if (parts.length !== 3 || !parts.every(s => s.length > 0)) throw new Error('malformed');
    const padded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(padded)) as { exp?: number };
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      return redirectToLogin(req, true);
    }
  } catch {
    return redirectToLogin(req, true);
  }

  return withReportOnlyCsp(req);
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon\\.ico|models|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|avif|woff2|woff|ttf|otf)).*)',
  ],
};
