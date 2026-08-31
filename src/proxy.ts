import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { buildReportOnlyCsp } from '@/lib/security-headers';
import { SESSIONLESS_PAGES, signInPathFor } from '@/lib/public-paths';

const PUBLIC_ASSET_PREFIXES: string[] = [
  '/checkin',
  '/_next',
  '/api/health',
  '/api/auth',
  '/models',
  '/favicon.ico',
  '/manifest.json',
  '/platform-manifest.json',
  '/theme-init.js',
  '/no-zoom.js',
  '/logo.png',
  '/619-logo.png',
  '/sitemap.xml',
  '/robots.txt',
  '/icons',
  '/images',
];

export function isPublicProxyPath(pathname: string): boolean {
  return isPublicPath(pathname);
}

function isPublicPath(pathname: string): boolean {
  // Sessionless pages are exact routes. This is important because `/pt-os` is
  // a public marketing page while `/pt-os/clients` and its other app routes
  // remain authenticated.
  if ((SESSIONLESS_PAGES as readonly string[]).includes(pathname)) return true;

  return PUBLIC_ASSET_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p + '?')
  );
}

function makeNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

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
  const signIn = signInPathFor(pathname);
  loginUrl.pathname = signIn;
  if (pathname !== '/' && pathname !== signIn) {
    loginUrl.searchParams.set('redirect', pathname);
  }
  const res = NextResponse.redirect(loginUrl);
  if (deleteTokenCookie) res.cookies.delete('token');
  return res;
}

const HOST_NEUTRAL_PREFIXES = [
  '/_next', '/api', '/models', '/icons', '/images', '/favicon.ico',
  '/manifest.json', '/platform-manifest.json', '/theme-init.js', '/no-zoom.js',
  '/logo.png', '/619-logo.png', '/sitemap.xml', '/robots.txt',
];

export function commandCenterHost(): string | null {
  const h = process.env.COMMAND_CENTER_HOST;
  return h ? h.trim().toLowerCase() : null;
}

export function requestHost(req: NextRequest): string {
  const raw = req.headers.get('host') ?? '';
  return raw.split(':')[0].trim().toLowerCase();
}

export function isCommandCenterPath(pathname: string): boolean {
  return pathname === '/platform'
    || pathname.startsWith('/platform/')
    || pathname === '/platform-login';
}

export function isHostNeutralPath(pathname: string): boolean {
  return HOST_NEUTRAL_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );
}

function notFound(req: NextRequest): NextResponse {
  const url = req.nextUrl.clone();
  url.pathname = '/_not-found';
  return NextResponse.rewrite(url);
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const ccHost = commandCenterHost();
  if (ccHost && !isHostNeutralPath(pathname)) {
    const onCommandCenter = requestHost(req) === ccHost;
    if (onCommandCenter !== isCommandCenterPath(pathname)) {
      return notFound(req);
    }
  }

  if (isPublicPath(pathname)) {
    return withReportOnlyCsp(req);
  }

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
    try {
      await jwtVerify(token, new TextEncoder().encode(secret));
      return withReportOnlyCsp(req);
    } catch {
      return redirectToLogin(req, true);
    }
  }

  // JWT_SECRET is not set — refuse authentication rather than falling back to
  // expiry-only validation. The fallback decoded the payload without verifying
  // the signature, so a tampered token with a future expiry would pass.
  // The real auth is the backend cookie anyway; this proxy runs before the
  // Next.js rewrite, so nothing is lost by requiring a valid JWT_SECRET.
  return redirectToLogin(req, true);
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon\\.ico|models|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|avif|woff2|woff|ttf|otf)).*)',
  ],
};
