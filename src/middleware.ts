import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// Paths that never require authentication
const PUBLIC_EXACT = new Set(['/login', '/reset-password']);

// Prefixes that are always public (static assets, Next.js internals, API proxy)
const PUBLIC_PREFIXES = [
  '/api/',
  '/_next/',
  '/static/',
  '/favicon',
  '/logo',
  '/619-logo',
  '/models/',
];

const loginUrl = (req: NextRequest) => new URL('/login', req.url);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_EXACT.has(pathname)) return NextResponse.next();
  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) return NextResponse.next();

  const token = request.cookies.get('token')?.value;

  if (!token) {
    return NextResponse.redirect(loginUrl(request));
  }

  const secret = process.env.JWT_SECRET;
  if (secret) {
    // Full JWT verification — requires JWT_SECRET in the frontend env
    try {
      await jwtVerify(token, new TextEncoder().encode(secret));
      return NextResponse.next();
    } catch {
      const r = NextResponse.redirect(loginUrl(request));
      r.cookies.delete('token');
      return r;
    }
  }

  // Fallback when JWT_SECRET is not set in the frontend env:
  // decode (without verify) and check expiry — blocks expired tokens
  // and malformed values; signature is still verified by the backend on
  // every API call.
  try {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('malformed');
    const padded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(padded)) as { exp?: number };
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      const r = NextResponse.redirect(loginUrl(request));
      r.cookies.delete('token');
      return r;
    }
  } catch {
    const r = NextResponse.redirect(loginUrl(request));
    r.cookies.delete('token');
    return r;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except Next.js internals and static files
    '/((?!_next/static|_next/image|favicon.ico|logo\\.png|619-logo\\.png).*)',
  ],
};
