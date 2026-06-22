import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes accessible without authentication
const PUBLIC_PREFIXES = [
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
  '/icons',
  '/images',
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p + '?')
  );
}

const SUPABASE_HOST = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : '*.supabase.co';

const API_HOST = process.env.NEXT_PUBLIC_API_URL
  ? new URL(process.env.NEXT_PUBLIC_API_URL).hostname
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
    // blob: for camera MediaStream → canvas, worker-src for potential TF.js workers
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
  response.headers.set(
    'Permissions-Policy',
    'camera=(self), microphone=(), geolocation=()'
  );
}

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    const response = NextResponse.next();
    addSecurityHeaders(response);
    return response;
  }

  const token =
    request.cookies.get('token')?.value ??
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    // API routes return 401 JSON; page routes redirect to /login
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next();
  addSecurityHeaders(response);
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|models/|icons/|images/).*)',
  ],
};
