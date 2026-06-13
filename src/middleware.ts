import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const IS_PROD = process.env.NODE_ENV === 'production';

function buildCsp(nonce: string, pathname: string): string {
  const isCheckin = pathname.startsWith('/checkin') || pathname.startsWith('/clients/');

  const scriptSrc = [
    `'nonce-${nonce}'`,
    "'self'",
    ...(IS_PROD ? [] : ["'unsafe-eval'"]),
  ];

  const styleSrc = [
    `'nonce-${nonce}'`,
    "'self'",
    "'unsafe-inline'",
    'https://fonts.googleapis.com',
    'https://api.fontshare.com',
  ];

  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': scriptSrc,
    'style-src': styleSrc,
    'font-src': ["'self'", 'https://fonts.gstatic.com', 'https://api.fontshare.com'],
    'img-src': ["'self'", 'data:', 'blob:', 'https:'],
    'connect-src': ["'self'", 'https:', 'wss:'],
    'media-src': ["'self'", 'blob:'],
    'worker-src': ['blob:'],
    'frame-ancestors': ["'none'"],
  };

  if (isCheckin) {
    directives['script-src']!.push("'unsafe-inline'");
  }

  return Object.entries(directives)
    .map(([key, values]) => `${key} ${values.join(' ')}`)
    .join('; ');
}

export function middleware(req: NextRequest) {
  const nonce = crypto.randomBytes(16).toString('base64url');

  const csp = buildCsp(nonce, req.nextUrl.pathname);

  const res = NextResponse.next();
  res.headers.set('x-nonce', nonce);
  res.headers.set('Content-Security-Policy', csp);
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-XSS-Protection', '1; mode=block');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set(
    'Permissions-Policy',
    'camera=(self), microphone=(), geolocation=()',
  );
  res.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload',
  );

  return res;
}

export const config = {
  matcher: [
    {
      source: '/((?!_next/static|_next/image|favicon.ico|models/|logo.png|619-logo.png).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
      ],
    },
  ],
};
