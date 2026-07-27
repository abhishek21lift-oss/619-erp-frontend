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

const PUBLIC_PREFIXES: string[] = [
  '/',
  '/login',
  '/reset-password',
  '/forgot-password',
  '/checkin',
  '/_next',
  '/api/health',
  '/api/auth',
  '/api/webauthn',
  '/models',
  '/favicon.ico',
  // The matcher below exempts image and font extensions but NOT .json, so
  // without this the PWA manifest 307s to /login for anyone not signed in —
  // and a manifest the browser can't read means no install prompt and no app
  // icon. It only describes the app's name, icons and start URL; nothing here
  // is private.
  '/manifest.json',
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

// Security headers (CSP, HSTS, COOP, CORP, …) are NOT set here. They live in
// next.config.js via src/lib/security-headers.js, because the matcher at the
// bottom of this file deliberately skips `api`, `_next/static`, `_next/image`,
// favicon and every image/font extension — so anything set here would miss API
// responses and every static asset. next.config.js headers() covers all of it.
// Re-adding them here would silently override that single source of truth.

function redirectToLogin(req: NextRequest, deleteTokenCookie = false): NextResponse {
  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = '/login';
  const { pathname } = req.nextUrl;
  if (pathname !== '/' && !pathname.startsWith('/login')) {
    loginUrl.searchParams.set('redirect', pathname);
  }
  const res = NextResponse.redirect(loginUrl);
  if (deleteTokenCookie) res.cookies.delete('token');
  return res;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
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
      return NextResponse.next();
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

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon\\.ico|models|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|avif|woff2|woff|ttf|otf)).*)',
  ],
};
