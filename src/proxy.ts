/**
 * proxy.ts — Server-side auth guard + security headers (Next.js 16+)
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

// ── CSP ───────────────────────────────────────────────────────────────────────
const SUPABASE_HOST = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : '*.supabase.co';

const API_HOST = process.env.NEXT_PUBLIC_API_URL
  ? (() => { try { return new URL(process.env.NEXT_PUBLIC_API_URL!).hostname; } catch { return ''; } })()
  : '';

function buildCsp(): string {
  const apiConnect = API_HOST ? ` https://${API_HOST}` : '';
  return [
    "default-src 'self' capacitor://localhost",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com/gsi/ capacitor://localhost",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com/gsi/ capacitor://localhost",
    `img-src 'self' data: blob: https://${SUPABASE_HOST} https://lh3.googleusercontent.com capacitor://localhost`,
    `connect-src 'self' https://${SUPABASE_HOST}${apiConnect} https://cdn.jsdelivr.net https://accounts.google.com capacitor://localhost`,
    "font-src 'self' https://fonts.gstatic.com capacitor://localhost",
    "media-src 'self' blob: capacitor://localhost",
    "worker-src 'self' blob:",
    "frame-src 'self' https://accounts.google.com capacitor://localhost",
    "frame-ancestors 'self' capacitor://localhost",
    "form-action 'self'",
    "base-uri 'self'",
  ].join('; ');
}

function addSecurityHeaders(response: NextResponse): void {
  response.headers.set('Content-Security-Policy', buildCsp());
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');
}

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
    const res = NextResponse.next();
    addSecurityHeaders(res);
    return res;
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
      const res = NextResponse.next();
      addSecurityHeaders(res);
      return res;
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

  const res = NextResponse.next();
  addSecurityHeaders(res);
  return res;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon\\.ico|models|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|avif|woff2|woff|ttf|otf)).*)',
  ],
};
