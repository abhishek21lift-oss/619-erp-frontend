import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/health
 * Lightweight liveness probe — Docker HEALTHCHECK, load-balancer, uptime monitors.
 *
 * Issue #8 FIX — Rate limiting:
 *   No external infra (Redis, Upstash) required. Uses an in-memory
 *   sliding-window counter per IP. Resets on deployment (acceptable for a
 *   health endpoint that only Kubernetes / uptime bots should poll).
 *
 *   Limit: 60 requests / 60-second window per IP.
 *   Exceeding returns 429 with Retry-After header.
 *
 * PRODUCTION-SAFETY:
 *   - In-memory state is per-process; with multiple replicas each replica
 *     independently rate-limits. This is intentional — the health endpoint
 *     is stateless by design and replica isolation is fine.
 *   - The Map is bounded by MAX_ENTRIES to prevent memory growth if an
 *     attacker spoofs many distinct IPs.
 */

// ─── Rate limiter ────────────────────────────────────────────────────
const WINDOW_MS   = 60_000;  // 60 seconds
const MAX_RPS     = 60;      // requests per window per IP
const MAX_ENTRIES = 10_000;  // cap Map size against IP spoofing

type WindowEntry = { count: number; windowStart: number };
const ipWindows = new Map<string, WindowEntry>();

function isRateLimited(ip: string): { limited: boolean; retryAfter: number } {
  const now = Date.now();

  // Purge expired entries to bound memory use
  if (ipWindows.size > MAX_ENTRIES) {
    for (const [k, v] of ipWindows) {
      if (now - v.windowStart > WINDOW_MS) ipWindows.delete(k);
    }
  }

  const entry = ipWindows.get(ip);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    ipWindows.set(ip, { count: 1, windowStart: now });
    return { limited: false, retryAfter: 0 };
  }

  if (entry.count >= MAX_RPS) {
    const retryAfter = Math.ceil((WINDOW_MS - (now - entry.windowStart)) / 1000);
    return { limited: true, retryAfter };
  }

  entry.count++;
  return { limited: false, retryAfter: 0 };
}

// ─── Handler ─────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  // Resolve client IP — Vercel/Cloudflare sets x-forwarded-for
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = (forwarded ? forwarded.split(',')[0] : 'unknown').trim();

  const { limited, retryAfter } = isRateLimited(ip);
  if (limited) {
    return NextResponse.json(
      { error: 'Too Many Requests' },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(MAX_RPS),
          'Cache-Control': 'no-store',
        },
      },
    );
  }

  let version = 'unknown';
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkg = require('../../../package.json') as { version?: string };
    version = pkg.version ?? 'unknown';
  } catch { /* standalone copy may not have package.json */ }

  return NextResponse.json(
    {
      status: 'ok',
      service: '619-erp-frontend',
      timestamp: new Date().toISOString(),
      version,
      env: process.env.NODE_ENV,
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache',
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': String(MAX_RPS),
      },
    },
  );
}
