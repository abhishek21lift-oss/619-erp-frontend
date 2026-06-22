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

const PUBLIC_PREFIXES: string[] = [
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
// Build env vars are inlined at edge compile time; runtime env vars are not
// available in the Edge Runtime, so we fall back to wildcards when absent.
const SUPABASE_HOST = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : '*.supabase.co';

const API_HOST = process.env.NEXT_PUBLIC_API_URL
  ? (() => { try { return new URL(process.env.NEXT_PUBLIC_API_URL!).hostname; } catch { return ''; } })()
  : '';

function buildCsp(): string {
  const apiConnect = API_HOST ? ` https://${API_HOST}` : '';
  return [
    "default-src 'self'",
    // Next.js requires 'unsafe-inline' for its runtime chunk and React streaming
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    `img-src 'self' data: blob: https://${SUPABASE_HOST}`,
    `connect-src 'self' https://${SUPABASE_HOST}${apiConnect} https://cdn.jsdelivr.net`,
    "font-src 'self' https://fonts.gstatic.com",
    // blob: for camera MediaStream → canvas; worker-src for TF.js workers
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
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

export function proxy(req: NextRequest) {
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
    // API routes return 401 JSON; page routes redirect to /login
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/login';
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // Basic JWT format validation: 3 non-empty base64 segments separated by dots
  const segments = token.split('.');
  if (segments.length !== 3 || !segments.every(s => s.length > 0)) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
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
