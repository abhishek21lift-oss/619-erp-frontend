import { NextResponse } from 'next/server';

/**
 * GET /api/health
 * Lightweight health-check endpoint used by Docker HEALTHCHECK,
 * load-balancers, and uptime monitors.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      service: '619-erp-frontend',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? 'unknown',
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json',
      },
    },
  );
}
