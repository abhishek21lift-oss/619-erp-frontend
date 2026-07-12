// src/lib/sentry.ts
// Client-side error monitoring. Completely inert unless NEXT_PUBLIC_SENTRY_DSN
// is set, so it is safe to ship before the DSN env var exists. Uses the browser
// SDK directly (not @sentry/nextjs) to avoid touching the webpack build config.
import * as Sentry from '@sentry/browser';

let initialised = false;

export function initSentry(): void {
  if (initialised || typeof window === 'undefined') return;
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    // Off by default; set NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE (e.g. 0.1) to enable.
    tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || 0),
    sendDefaultPii: false,
  });
  initialised = true;
}

export function captureError(error: unknown, info?: unknown): void {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  Sentry.captureException(error, info ? { extra: { componentStack: info } } : undefined);
}
