'use client';

// The fallback every route segment's error.tsx renders.
//
// Audit finding H-02. Before this, the app had exactly one Next.js error
// boundary — src/app/error.tsx — so a throw anywhere in 111 route segments
// replaced the entire application. Per-segment error.tsx files fix the blast
// radius; this component is what they all render, so the behaviour is defined
// once instead of 28 times.
//
// ── Three defects in the old root error.tsx this also fixes ─────────────────
//
//  1. It rendered `{error.message}` unconditionally. Next.js only redacts
//     messages for SERVER component errors; 108 of the 111 pages here are
//     'use client', so their real messages reached the browser in production —
//     internals, occasionally an API path or an id. components/ErrorBoundary
//     already gated this behind NODE_ENV, so the two boundaries disagreed and
//     the leaky one was the one that actually rendered (error.tsx is nested
//     inside ErrorBoundary, so it catches page throws first).
//
//  2. It hardcoded light-mode colours (bg-[#FEF2F2], text-[#6B7280]) in an app
//     that is theme-adaptive everywhere else, so the error card was a white
//     card in dark mode.
//
//  3. It never reported to Sentry. lib/sentry.ts is wired up and
//     components/ErrorBoundary calls captureError — but because error.tsx is
//     the nearer boundary, ErrorBoundary's componentDidCatch never fired for
//     page errors. The most common class of error was the one not being
//     reported. This reports from the boundary that actually catches them.
//
// ── Why `shell` is a prop rather than always-on ────────────────────────────
//
// This app mounts <Guard><AppShell> inside each page.tsx — there are no segment
// layouts at all. So a segment error.tsx replaces the page INCLUDING its
// chrome, and has to re-render the shell itself for the user to keep the nav
// and navigate away. That is why the old root error.tsx wrapped its fallback in
// Guard + AppShell: not an oversight, a consequence of the architecture.
//
// But it must NOT do that on the public routes. Guard redirects to /login when
// there is no session, so a throw on /login rendered a fallback that redirected
// to /login — which threw again. An unauthenticated user got a loop instead of
// a message. Auth and public segments therefore pass shell={false}.

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { captureError } from '@/lib/sentry';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';

export type RouteErrorProps = {
  /** Next.js passes `digest` on errors that were redacted server-side. */
  error: Error & { digest?: string };
  reset: () => void;
  /**
   * Render inside Guard + AppShell so the nav survives. True for authenticated
   * areas; false for login / password-reset / public pages, where Guard would
   * bounce the visitor to a route that may be the one throwing.
   */
  shell?: boolean;
  /** Segment name, for the Sentry tag — e.g. 'finance'. */
  segment?: string;
};

export default function RouteError({ error, reset, shell = true, segment }: RouteErrorProps) {
  // React StrictMode double-invokes effects in development, and a remount after
  // `reset()` runs this again. Without the ref one thrown error becomes two or
  // three Sentry events, which makes the issue counts lie.
  const reported = useRef<string | null>(null);
  useEffect(() => {
    const key = `${segment ?? ''}:${error.digest ?? error.message}`;
    if (reported.current === key) return;
    reported.current = key;
    captureError(error, segment ? `route segment: ${segment}` : undefined);
  }, [error, segment]);

  const body = (
    <div
      role="alert"
      className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center"
    >
      <div
        className="grid h-14 w-14 place-items-center rounded-full"
        style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}
      >
        <AlertTriangle className="h-7 w-7" />
      </div>

      <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
        Something went wrong
      </h2>

      {/*
        Deliberately generic. The specific message is developer-facing and is
        shown below in development only; in production it goes to Sentry, not to
        the customer.
      */}
      <p className="max-w-sm text-sm" style={{ color: 'var(--text-muted)' }}>
        {segment
          ? `This part of the app (${segment}) failed to load. The rest of the app is still working.`
          : 'An unexpected error occurred. The rest of the app is still working.'}
      </p>

      {/*
        The digest is an opaque hash Next.js also writes to the server log, so
        it is the one identifier worth showing: it lets support tie a screenshot
        to a stack trace without exposing anything about the failure.
      */}
      {error.digest && (
        <p className="font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>
          Reference: {error.digest}
        </p>
      )}

      {process.env.NODE_ENV !== 'production' && error.message && (
        <pre
          className="mt-1 max-h-32 w-full overflow-auto rounded-lg p-3 text-left text-[11px]"
          style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
        >
          {error.message}
        </pre>
      )}

      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-all duration-200"
          style={{ background: 'var(--danger)' }}
        >
          <RotateCcw className="h-4 w-4" strokeWidth={2} />
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-semibold transition-colors"
          style={{
            borderColor: 'var(--border)',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
          }}
        >
          Back to app
        </Link>
      </div>
    </div>
  );

  if (!shell) return body;
  return (
    <Guard>
      <AppShell>{body}</AppShell>
    </Guard>
  );
}
