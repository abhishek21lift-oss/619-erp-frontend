// frontend/src/components/ErrorBoundary.tsx
//
// Catches render errors so the entire app doesn't whiteout when one page
// throws. Also auto-reloads on chunk loading errors (common after redeploys).
//
// Why a class component? React only supports getDerivedStateFromError /
// componentDidCatch on classes — there is no Hooks API for this.

'use client';

import * as React from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { captureError } from '@/lib/sentry';

/* ── Global chunk-load error handler ── */
if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    const msg = e.message ?? '';
    if (
      msg.includes('Loading chunk') ||
      msg.includes('ChunkLoadError') ||
      msg.includes('Failed to fetch dynamically imported module')
    ) {
      console.warn('[ChunkError] detected — reloading', msg);
      window.location.reload();
    }
  });
  window.addEventListener('unhandledrejection', (e) => {
    const msg = e.reason?.message ?? '';
    if (
      msg.includes('Loading chunk') ||
      msg.includes('ChunkLoadError') ||
      msg.includes('Failed to fetch')
    ) {
      console.warn('[ChunkError] unhandled rejection — reloading', msg);
      window.location.reload();
    }
  });
}

interface Props {
  children: React.ReactNode;
  /** Optional UI override. Receives the error and a reset callback. */
  fallback?: (props: { error: Error; reset: () => void }) => React.ReactNode;
  /** Hook for logging — wire to your tracker (Sentry, etc.). */
  onError?: (error: Error, info: React.ErrorInfo) => void;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (typeof console !== 'undefined') {
      console.error('[ErrorBoundary]', error, info);
    }
    // Report to Sentry (no-op unless NEXT_PUBLIC_SENTRY_DSN is set).
    captureError(error, info.componentStack);
    this.props.onError?.(error, info);

    // Auto-reload on chunk errors after a brief delay
    if (
      error.message?.includes('Loading chunk') ||
      error.message?.includes('ChunkLoadError')
    ) {
      setTimeout(() => window.location.reload(), 200);
    }
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback({ error: this.state.error, reset: this.reset });
      }
      return <DefaultFallback error={this.state.error} reset={this.reset} />;
    }
    return this.props.children;
  }
}

function DefaultFallback({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div
      role="alert"
      className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 px-6 text-center"
    >
      <div className="grid h-12 w-12 place-items-center rounded-full bg-red-50 text-red-600 dark:bg-red-500/15">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
        Something went sideways
      </h2>
      <p className="text-sm text-slate-500 dark:text-white/50">
        We logged the error. You can retry, or head back to the app.
      </p>
      {process.env.NODE_ENV !== 'production' && (
        <pre className="mt-2 max-h-32 w-full overflow-auto rounded-lg bg-slate-50 p-3 text-left text-[11px] text-slate-500 dark:bg-white/5 dark:text-white/50">
          {error.message}
        </pre>
      )}
      <div className="mt-2 flex gap-2">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-rose-700"
        >
          <RotateCcw className="h-4 w-4" />
          Try again
        </button>
        <Link
          href="/pt-os"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-white/20 dark:bg-[#0F172A] dark:text-white/70 dark:hover:bg-white/10"
        >
          Back to app
        </Link>
      </div>
    </div>
  );
}
