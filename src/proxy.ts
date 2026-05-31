/**
 * proxy.ts — Server-side auth guard (Next.js 16+)
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
 *
 * Public paths (no auth required):
 *   /login, /reset-password
 *
 * Excluded entirely (Next.js internals + static files + API):
 *   /_next/*, /api/*, /models/*, favicon, images, fonts
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS: string[] = [
  '/login',
  '/reset-password',
];

function isPublicPath(pathname: string): boolean {
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/models/') ||
    pathname === '/favicon.ico' ||
    pathname === '/logo.png' ||
    pathname === '/619-logo.png' ||
    pathname === '/sitemap.xml' ||
    pathname === '/robots.txt'
  ) {
    return true;
  }

  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token =
    req.cookies.get('auth-token')?.value ||
    req.cookies.get('token')?.value ||
    req.cookies.get('session')?.value;

  if (!token) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/login';
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon\.ico|models|.*\.(?:png|jpg|jpeg|gif|svg|ico|webp|avif|woff2|woff|ttf|otf)).*)',
  ],
};
