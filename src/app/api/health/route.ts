import { NextResponse } from 'next/server';

/**
 * GET /api/health
 * Lightweight liveness probe — used by:
 *   - Docker HEALTHCHECK
 *   - Railway / Render / load-balancer health checks
 *   - Uptime monitors (Better Uptime, UptimeRobot)
 *
 * Never throws — returns 200 as long as Node is running.
 */
export async function GET() {
  // Read version from package.json at runtime (works in Docker standalone mode)
  let version = 'unknown';
  try {
    // Dynamic require is fine here — this is a Node.js server route, not browser code.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkg = require('../../../package.json') as { version?: string };
    version = pkg.version ?? 'unknown';
  } catch {
    // package.json not found (e.g. deeply nested standalone copy) — non-fatal
  }

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
      },
    },
  );
}
