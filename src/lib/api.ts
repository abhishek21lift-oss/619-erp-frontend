// src/lib/api.ts
//
// NOTE: apiBase() is lazy — evaluated at call time, not module init.
// This prevents SSR crashes when NEXT_PUBLIC_API_URL is undefined at
// Docker build time or cold-start server renders.

const DEFAULT_API_BASE = 'http://localhost:5000';

function apiBase(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL ?? '').trim().replace(/\/+$/, '');
  const resolved = raw || DEFAULT_API_BASE;

  if (/your-619-api\.onrender\.com/i.test(resolved)) {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return DEFAULT_API_BASE;
    }
    throw new Error(
      'NEXT_PUBLIC_API_URL is still the placeholder URL. ' +
      'Set it to your deployed backend in Vercel / .env.local.',
    );
  }

  try {
    const url = new URL(resolved);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('bad protocol');
    return url.origin;
  } catch {
    try { return new URL('http://' + resolved).origin; } catch {
      throw new Error(`Invalid NEXT_PUBLIC_API_URL: "${raw}"`);
    }
  }
}
