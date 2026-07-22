'use client';

/**
 * PullToRefresh — wrap any scrollable page content to get a premium,
 * native-feel "drag down to refresh" gesture that refetches via the caller's
 * own data-loading function (no page reload).
 *
 *   <PullToRefresh onRefresh={loadData}>
 *     ...existing page JSX...
 *   </PullToRefresh>
 *
 * A single `global` instance lives in AppShell and covers every page; pages
 * that pass their own `onRefresh` register as "local" and the global one
 * steps aside on that route (see pull-refresh-context). Nested elements that
 * own their own vertical touch gestures opt out via `data-no-pull-refresh`.
 */

import { useCallback, useEffect } from 'react';
import { usePullToRefresh } from './usePullToRefresh';
import PullIndicator from './PullIndicator';
import { BOUNCE_EASE } from './animations';
import { useNavScroll } from '@/contexts/nav-scroll-context';
import { usePullRefreshRegistry } from '@/contexts/pull-refresh-context';
import { useToast } from '@/lib/toast';
import type { PullToRefreshProps } from './types';

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

  const { phase, pullDistance, progress } = usePullToRefresh({
    onRefresh,
    onError: handleError,
    threshold,
    disabled: !onRefresh || (global && localActive),
  });

  const dragging = phase === 'pulling' || phase === 'ready';
  const translate = reducedMotion ? 0 : pullDistance;

  return (
    <div className={className} style={{ position: 'relative' }}>
      <PullIndicator
        phase={phase}
        progress={progress}
        pullDistance={pullDistance}
        reducedMotion={reducedMotion}
      />

      {/* Live region — independent of the visual gesture. */}
      <span className="sr-only" role="status" aria-live="polite">
        {phase === 'refreshing'
          ? 'Refreshing content'
          : phase === 'success'
            ? 'Refresh complete'
            : phase === 'ready'
              ? 'Release to refresh'
              : ''}
      </span>

      <div
        style={{
          transform: translate ? `translateY(${translate}px)` : undefined,
          transition: dragging ? 'none' : `transform 0.5s ${BOUNCE_EASE}`,
          willChange: dragging ? 'transform' : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}
