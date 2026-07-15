'use client';

/**
 * usePullToRefresh — native-feel "drag down to refresh" gesture.
 *
 * Tracks a single-finger vertical drag starting from window.scrollY === 0.
 * All gesture math lives in a ref (not state) so a 60-120Hz touchmove
 * stream never re-renders the host component directly; visual updates are
 * batched through a single requestAnimationFrame per frame. State updates
 * only leave the ref via that rAF flush, keeping the drag itself allocation-
 * and re-render-free.
 *
 * Axis-locking: the first ~6px of movement decides whether the gesture is
 * vertical or horizontal. Horizontal gestures release control immediately
 * so carousels / swipeable cards under the same finger are never blocked.
 *
 * Below `threshold` of raw drag the indicator tracks the finger 1:1 (no
 * lag). Beyond it, additional drag is damped toward `maxPull` so far pulls
 * still feel bounded and elastic rather than unbounded.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export type PullToRefreshPhase = 'idle' | 'pulling' | 'ready' | 'refreshing';

export interface UsePullToRefreshOptions {
  /** Invoked once per completed gesture that crosses `threshold`. Awaited —
   *  the indicator stays pinned at `threshold` height until it settles. */
  onRefresh: (() => Promise<unknown> | unknown) | null | undefined;
  /** Called if `onRefresh` throws/rejects. The indicator still retracts
   *  normally either way — this is purely for surfacing the error. */
  onError?: (err: unknown) => void;
  /** Raw drag distance (px) required before release triggers a refresh. */
  threshold?: number;
  /** Hard cap on visual pull distance. Defaults to threshold * 1.8. */
  maxPull?: number;
  /** Disable the gesture entirely (e.g. no handler registered yet, or a
   *  modal/drawer above this content wants exclusive touch control). */
  disabled?: boolean;
}

export interface UsePullToRefreshResult {
  phase: PullToRefreshPhase;
  /** Eased visual pull distance in px, 0..maxPull. */
  pullDistance: number;
  /** pullDistance / threshold, clamped to [0, 1]. */
  progress: number;
  isRefreshing: boolean;
}

const DEFAULT_THRESHOLD = 80;
const MAX_PULL_RATIO = 1.8;
const RESISTANCE_BEYOND_THRESHOLD = 0.35;
const AXIS_LOCK_DEADZONE = 6;
const AXIS_LOCK_RATIO = 1.15;

/** 1:1 tracking up to `threshold`, then increasingly damped up to `cap`. */
function easePull(dy: number, threshold: number, cap: number): number {
  if (dy <= 0) return 0;
  if (dy <= threshold) return dy;
  const extra = (dy - threshold) * RESISTANCE_BEYOND_THRESHOLD;
  return Math.min(threshold + extra, cap);
}

export function usePullToRefresh(options: UsePullToRefreshOptions): UsePullToRefreshResult {
  const { onRefresh, onError, threshold = DEFAULT_THRESHOLD, maxPull, disabled = false } = options;
  const cap = maxPull ?? threshold * MAX_PULL_RATIO;

  const [phase, setPhase] = useState<PullToRefreshPhase>('idle');
  const [pullDistance, setPullDistance] = useState(0);

  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  // All live gesture state lives here — mutated synchronously on every
  // touch event, flushed to React state at most once per animation frame.
  const g = useRef({
    dragging: false,
    axis: null as 'vertical' | 'horizontal' | null,
    startX: 0,
    startY: 0,
    pull: 0,
    refreshing: false,
    rafId: 0,
  });

  const flush = useCallback(() => {
    const s = g.current;
    s.rafId = 0;
    setPullDistance(s.pull);
    setPhase(s.refreshing ? 'refreshing' : s.pull >= threshold ? 'ready' : s.pull > 0 ? 'pulling' : 'idle');
  }, [threshold]);

  const schedule = useCallback(() => {
    const s = g.current;
    if (s.rafId) return;
    s.rafId = requestAnimationFrame(flush);
  }, [flush]);

  useEffect(() => {
    if (disabled || typeof window === 'undefined') return;
    const s = g.current;

    function onTouchStart(e: TouchEvent) {
      if (s.refreshing || e.touches.length !== 1) return;
      if (window.scrollY > 0) return;
      // Let opted-out subtrees (modals, crop tools, drawers) keep the gesture.
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-no-pull-refresh]')) return;
      s.dragging = true;
      s.axis = null;
      s.startX = e.touches[0].clientX;
      s.startY = e.touches[0].clientY;
    }

    function onTouchMove(e: TouchEvent) {
      if (!s.dragging || s.refreshing || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - s.startX;
      const dy = e.touches[0].clientY - s.startY;

      if (s.axis === null) {
        if (Math.abs(dx) < AXIS_LOCK_DEADZONE && Math.abs(dy) < AXIS_LOCK_DEADZONE) return;
        s.axis = Math.abs(dx) > Math.abs(dy) * AXIS_LOCK_RATIO ? 'horizontal' : 'vertical';
        if (s.axis === 'horizontal') { s.dragging = false; return; }
      }
      if (s.axis !== 'vertical') return;

      if (dy <= 0 || window.scrollY > 0) {
        s.dragging = false;
        if (s.pull !== 0) { s.pull = 0; schedule(); }
        return;
      }

      // Once we know this is a genuine downward pull at the top of the
      // page, stop the native scroll/bounce so our own motion owns it.
      if (e.cancelable) e.preventDefault();
      s.pull = easePull(dy, threshold, cap);
      schedule();
    }

    async function onTouchEnd() {
      if (!s.dragging || s.refreshing) return;
      s.dragging = false;
      const wasVertical = s.axis === 'vertical';
      s.axis = null;
      if (!wasVertical) return;

      if (s.pull < threshold) {
        s.pull = 0;
        schedule();
        return;
      }

      s.refreshing = true;
      s.pull = threshold;
      schedule();
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try { navigator.vibrate(12); } catch { /* unsupported / blocked, non-fatal */ }
      }

      try {
        await onRefreshRef.current?.();
      } catch (err) {
        onErrorRef.current?.(err);
      } finally {
        s.refreshing = false;
        s.pull = 0;
        schedule();
      }
    }

    function onTouchCancel() {
      if (s.refreshing) return;
      s.dragging = false;
      s.axis = null;
      s.pull = 0;
      schedule();
    }

    // touchmove must be non-passive so preventDefault() can suppress the
    // browser's own rubber-band/refresh once we've claimed the gesture.
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchCancel, { passive: true });

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchCancel);
      if (s.rafId) cancelAnimationFrame(s.rafId);
    };
  }, [disabled, threshold, cap, schedule]);

  return {
    phase,
    pullDistance,
    progress: Math.min(pullDistance / threshold, 1),
    isRefreshing: phase === 'refreshing',
  };
}
