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

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

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
