import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { buildReportOnlyCsp } from '@/lib/security-headers';
import { SESSIONLESS_PAGES, signInPathFor } from '@/lib/public-paths';

const PUBLIC_ASSET_PREFIXES: string[] = [
  '/checkin', '/_next', '/api/health', '/api/auth', '/models', '/favicon.ico',
  '/manifest.json', '/platform-manifest.json', '/theme-init.js', '/no-zoom.js',
  '/logo.png', '/619-logo.png', '/sitemap.xml', '/robots.txt', '/icons', '/images',
];

const PUBLIC_PREFIXES: string[] = [...SESSIONLESS_PAGES, ...PUBLIC_ASSET_PREFIXES];

export function isPublicProxyPath(pathname: string): boolean { return isPublicPath(pathname); }

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p + '?'));
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
  if (pathname !== '/' && pathname !== signIn) loginUrl.searchParams.set('redirect', pathname);
  const res = NextResponse.redirect(loginUrl);
  if (deleteTokenCookie) res.cookies.delete('token');
  return res;
}

const HOST_NEUTRAL_PREFIXES = [
  '/_next', '/api', '/models', '/icons', '/images', '/favicon.ico', '/manifest.json',
  '/platform-manifest.json', '/theme-init.js', '/no-zoom.js', '/logo.png',
  '/619-logo.png', '/sitemap.xml', '/robots.txt',
];

export function commandCenterHost(): string | null {
  const h = process.env.COMMAND_CENTER_HOST;
  return h ? h.trim().toLowerCase() : null;
}

export function requestHost(req: NextRequest): string {
  return (req.headers.get('host') ?? '').split(':')[0].trim().toLowerCase();
}

export function isCommandCenterPath(pathname: string): boolean {
  return pathname === '/platform' || pathname.startsWith('/platform/') || pathname === '/platform-login';
}

export function isHostNeutralPath(pathname: string): boolean {
  return HOST_NEUTRAL_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));
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
    if (onCommandCenter !== isCommandCenterPath(pathname)) return notFound(req);
  }
  if (isPublicPath(pathname)) return withReportOnlyCsp(req);

  const token = req.cookies.get('token')?.value ?? req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

  try {
    const parts = token.split('.');
    if (parts.length !== 3 || !parts.every((s) => s.length > 0)) throw new Error('malformed');
    const padded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(padded)) as { exp?: number };
    if (payload.exp && Date.now() / 1000 > payload.exp) return redirectToLogin(req, true);
  } catch {
    return redirectToLogin(req, true);
  }
  return withReportOnlyCsp(req);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon\\.ico|models|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|avif|woff2|woff|ttf|otf)).*)'],
};
