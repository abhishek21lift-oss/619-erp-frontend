'use client';

/**
 * PullToRefresh — wrap any scrollable page content with this to get a
 * native-feel "drag down to refresh" gesture that refetches via the
 * caller's own data-loading function (no page reload, no cache library
 * required).
 *
 *   <PullToRefresh onRefresh={loadData}>
 *     ...existing page JSX...
 *   </PullToRefresh>
 *
 * `onRefresh` should be whatever this page already uses to reload its
 * data — a `loadData`/`fetchX` callback, or a hook's `refetch`/`refresh`.
 * Pass `undefined`/`null` to disable the gesture (e.g. while the page's
 * own initial load hasn't resolved yet).
 *
 * Nested elements that need to own their own vertical touch gestures
 * (image croppers, custom drag UIs) can opt out by wrapping themselves in
 * `data-no-pull-refresh`.
 */

import { useCallback, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useNavScroll } from '@/contexts/nav-scroll-context';
import { usePullRefreshRegistry } from '@/contexts/pull-refresh-context';
import { useToast } from '@/lib/toast';

export interface PullToRefreshProps {
  onRefresh: (() => Promise<unknown> | unknown) | null | undefined;
  children: React.ReactNode;
  /** Raw drag distance (px) required to arm a refresh. Default 80. */
  threshold?: number;
  className?: string;
  /** Override the default "toast on failure" error handling. */
  onError?: (err: unknown) => void;
  /** The single app-wide instance mounted in AppShell. It steps aside on
   *  any route whose page mounts its own (local) PullToRefresh. */
  global?: boolean;
}

export default function PullToRefresh({
  onRefresh,
  children,
  threshold = 80,
  className,
  onError,
  global = false,
}: PullToRefreshProps) {
  const { toast } = useToast();
  const { reducedMotion } = useNavScroll();
  const { localActive, registerLocal } = usePullRefreshRegistry();

  // A page-level (non-global) instance announces itself so the global shell
  // instance disables and lets this one own the gesture on its route.
  useEffect(() => {
    if (global) return;
    return registerLocal();
  }, [global, registerLocal]);

  const handleError = useCallback((err: unknown) => {
    if (onError) { onError(err); return; }
    toast.error(err instanceof Error ? err.message : 'Refresh failed.', {
      description: 'Your existing data is unchanged.',
      action: onRefresh ? { label: 'Retry', onClick: () => { void onRefresh(); } } : undefined,
    });
  }, [onError, onRefresh, toast]);

  const { phase, pullDistance, progress, isRefreshing } = usePullToRefresh({
    onRefresh,
    onError: handleError,
    threshold,
    disabled: !onRefresh || (global && localActive),
  });

  const dragging = phase === 'pulling' || phase === 'ready';
  const translate = reducedMotion ? 0 : pullDistance;
  const indicatorY = Math.max(translate - 40, -40);
  const armed = phase === 'ready' || isRefreshing;

  return (
    <div className={className} style={{ position: 'relative' }}>
      {/* Visual indicator — purely decorative, state is announced separately below. */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: `translate(-50%, ${indicatorY}px)`,
          opacity: reducedMotion ? (isRefreshing ? 1 : 0) : Math.min(progress, 1),
          transition: dragging ? 'none' : 'opacity 0.2s ease',
          pointerEvents: 'none',
          zIndex: 30,
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.96)',
            boxShadow: '0 4px 16px rgba(15,23,42,0.16)',
            border: '1px solid rgba(15,23,42,0.06)',
            transform: `scale(${0.6 + Math.min(progress, 1) * 0.4})`,
            transition: dragging ? 'none' : 'transform 0.2s ease',
          }}
        >
          <RefreshCw
            size={16}
            style={{
              color: armed ? '#F59E0B' : '#94a3b8',
              transition: 'color 0.15s ease',
              transform: !isRefreshing ? `rotate(${progress * 360}deg)` : undefined,
              animation: isRefreshing && !reducedMotion ? 'spin 0.7s linear infinite' : undefined,
            }}
          />
        </div>
      </div>

      {/* Screen-reader status announcement — independent of the visual gesture. */}
      <span className="sr-only" role="status" aria-live="polite">
        {isRefreshing ? 'Refreshing…' : phase === 'ready' ? 'Release to refresh' : ''}
      </span>

      <div
        style={{
          transform: translate ? `translateY(${translate}px)` : undefined,
          transition: dragging ? 'none' : 'transform 0.35s cubic-bezier(0.16,1,0.3,1)',
          willChange: dragging ? 'transform' : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}
