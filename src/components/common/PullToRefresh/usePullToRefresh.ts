'use client';

/**
 * usePullToRefresh — native-feel "drag down to refresh" gesture.
 *
 * Tracks a single-finger vertical drag starting from window.scrollY === 0.
 * All gesture math lives in a ref (not state) so a 60-120Hz touchmove stream
 * never re-renders the host component directly; visual updates are batched
 * through a single requestAnimationFrame per frame, keeping the drag itself
 * allocation- and re-render-free (60 FPS, no main-thread blocking).
 *
 * Axis-locking: the first ~6px of movement decides whether the gesture is
 * vertical or horizontal. Horizontal gestures release control immediately so
 * carousels / swipeable cards under the same finger are never blocked.
 *
 * Below `threshold` the indicator tracks the finger 1:1 (no lag). Beyond it,
 * additional drag is rubber-band damped toward `maxPull`. Crossing the
 * threshold fires a light haptic ("armed"); release fires a firmer one and
 * runs `onRefresh`. On success the phase holds at `success` briefly (for the
 * checkmark) before retracting; concurrent refreshes are prevented.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PullToRefreshPhase, UsePullToRefreshOptions, UsePullToRefreshResult } from './types';
import { MAX_PULL_RATIO, delay, easePull, triggerHaptic } from './utils';

const DEFAULT_THRESHOLD = 80;
const AXIS_LOCK_DEADZONE = 6;
const AXIS_LOCK_RATIO = 1.15;
const SUCCESS_HOLD_MS = 620;

/**
 * Is the finger inside something that can still be scrolled UP?
 *
 * `window.scrollY === 0` is not enough to claim a downward drag. A dropdown, a
 * command palette, a `max-h-*` list inside a form — any of these can be scrolled
 * halfway down while the PAGE is still at the top. Dragging down inside one of
 * them has an unambiguous local meaning: scroll that list back up. Taking it for
 * a page refresh instead is the bug this exists to prevent, and it is a
 * miserable one to diagnose — dragging UP works perfectly (the hook releases the
 * gesture on `dy <= 0`), so it reads as "scrolling one direction is broken".
 *
 * Reported against the client picker on Record Payment: the page is short enough
 * to never scroll, so `scrollY` is always 0 and every downward drag inside the
 * open dropdown pulled the whole page down.
 *
 * `scrollTop > 0` is checked BEFORE the computed style on purpose. It is a plain
 * property read, and it is 0 for the overwhelming majority of ancestors, so the
 * expensive part — getComputedStyle, which forces a style recalc — runs only for
 * the one or two elements that are genuinely scrolled. Once per gesture, not per
 * frame.
 */
function insideScrollerNotAtTop(start: EventTarget | null): boolean {
  let el = start instanceof Element ? start : null;
  while (el && el !== document.body && el !== document.documentElement) {
    if (el.scrollTop > 0) {
      const oy = getComputedStyle(el).overflowY;
      if (oy === 'auto' || oy === 'scroll' || oy === 'overlay') return true;
    }
    el = el.parentElement;
  }
  return false;
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

  // Live gesture state — mutated synchronously per touch event, flushed to
  // React state at most once per animation frame.
  const g = useRef({
    dragging: false,
    axis: null as 'vertical' | 'horizontal' | null,
    startX: 0,
    startY: 0,
    pull: 0,
    armed: false,
    refreshing: false,
    success: false,
    alive: true,
    rafId: 0,
  });

  const flush = useCallback(() => {
    const s = g.current;
    s.rafId = 0;
    if (!s.alive) return;
    setPullDistance(s.pull);
    setPhase(
      s.refreshing ? 'refreshing'
        : s.success ? 'success'
        : s.pull >= threshold ? 'ready'
        : s.pull > 0 ? 'pulling'
        : 'idle',
    );
  }, [threshold]);

  const schedule = useCallback(() => {
    const s = g.current;
    if (s.rafId || !s.alive) return;
    s.rafId = requestAnimationFrame(flush);
  }, [flush]);

  useEffect(() => {
    if (disabled || typeof window === 'undefined') return;
    const s = g.current;
    s.alive = true;

    function onTouchStart(e: TouchEvent) {
      if (s.refreshing || s.success || e.touches.length !== 1) return;
      if (window.scrollY > 0) return;
      // Let opted-out subtrees (modals, crop tools, drawers) keep the gesture.
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-no-pull-refresh]')) return;
      // …and let anything already scrolled keep it too, whether or not it
      // remembered to opt out. See insideScrollerNotAtTop.
      if (insideScrollerNotAtTop(target)) return;
      s.dragging = true;
      s.axis = null;
      s.armed = false;
      s.startX = e.touches[0].clientX;
      s.startY = e.touches[0].clientY;
    }

    function onTouchMove(e: TouchEvent) {
      if (!s.dragging || s.refreshing || s.success || e.touches.length !== 1) return;
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
        if (s.pull !== 0) { s.pull = 0; s.armed = false; schedule(); }
        return;
      }

      // A genuine downward pull at the top — own the gesture, kill native bounce.
      if (e.cancelable) e.preventDefault();
      s.pull = easePull(dy, threshold, cap);

      // Arm / disarm haptic as the pull crosses the threshold.
      const ready = s.pull >= threshold;
      if (ready && !s.armed) { s.armed = true; triggerHaptic(8); }
      else if (!ready && s.armed) { s.armed = false; }

      schedule();
    }

    async function onTouchEnd() {
      if (!s.dragging || s.refreshing || s.success) return;
      s.dragging = false;
      const wasVertical = s.axis === 'vertical';
      s.axis = null;
      if (!wasVertical) return;

      if (s.pull < threshold) {
        s.pull = 0;
        s.armed = false;
        schedule();
        return;
      }

      s.refreshing = true;
      s.armed = false;
      s.pull = threshold;
      schedule();
      triggerHaptic(14);

      try {
        await onRefreshRef.current?.();
        // Success stage — hold the checkmark briefly, then retract.
        s.refreshing = false;
        s.success = true;
        s.pull = threshold;
        schedule();
        triggerHaptic(8);
        await delay(SUCCESS_HOLD_MS);
        s.success = false;
        s.pull = 0;
        schedule();
      } catch (err) {
        onErrorRef.current?.(err);
        s.refreshing = false;
        s.success = false;
        s.pull = 0;
        schedule();
      }
    }

    function onTouchCancel() {
      if (s.refreshing || s.success) return;
      s.dragging = false;
      s.axis = null;
      s.armed = false;
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
      s.alive = false;
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchCancel);
      if (s.rafId) { cancelAnimationFrame(s.rafId); s.rafId = 0; }
    };
  }, [disabled, threshold, cap, schedule]);

  return {
    phase,
    pullDistance,
    progress: Math.min(pullDistance / threshold, 1),
    isRefreshing: phase === 'refreshing',
  };
}
