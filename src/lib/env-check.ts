/**
 * src/lib/env-check.ts
 *
 * Runtime environment variable validation.
 * Call validateEnv() in your root layout or _app to catch missing
 * configuration early rather than at the point of first API call.
 *
 * Only runs on the SERVER (Node.js) — client-side env vars
 * (NEXT_PUBLIC_*) are validated separately below.
 */

/**
 * Server-side required env vars.
 * Add backend secrets here as the app grows.
 */
const SERVER_REQUIRED: string[] = [
  // Example: 'DATABASE_URL', 'JWT_SECRET'
  // Currently none — all config is client-side via NEXT_PUBLIC_API_URL
];

/**
 * Client-side required env vars (NEXT_PUBLIC_*).
 * These must be set at BUILD TIME on Vercel / Docker ARG.
 */
const CLIENT_REQUIRED: string[] = [
  // 'NEXT_PUBLIC_API_URL' is optional with a localhost fallback,
  // but should be present in production.
];

export function validateEnv(): void {
  if (typeof window !== 'undefined') return; // skip on client

  const missing: string[] = [];

  for (const key of SERVER_REQUIRED) {
    if (!process.env[key]) missing.push(key);
  }

  if (process.env.NODE_ENV === 'production') {
    for (const key of CLIENT_REQUIRED) {
      if (!process.env[key]) missing.push(key);
    }

    // Warn (don't throw) if the API URL is still the placeholder
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? '';
    if (apiUrl.includes('your-619-api')) {
      console.warn(
        '[619 ERP] WARNING: NEXT_PUBLIC_API_URL is still the placeholder URL. ' +
        'Set it to your deployed backend on Vercel or in .env.local.',
      );
    }

    if (apiUrl) {
      // NEXT_PUBLIC_API_URL is used at BUILD TIME for next.config.js rewrites.
      // At RUNTIME the frontend uses same-origin proxy (/api/* → Render) to
      // avoid cross-origin cookie issues with the httpOnly JWT cookie.
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `[619 ERP] Missing required environment variables:\n` +
      missing.map(k => `  • ${k}`).join('\n'),
    );
  }
}
