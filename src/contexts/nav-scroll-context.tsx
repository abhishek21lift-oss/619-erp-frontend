'use client';

/**
 * NavScrollContext — scroll state machine for the top bar.
 *
 * Single RAF loop. Direction hysteresis prevents flicker. Scroll-stop debounce.
 *
 * State machine (Instagram / WhatsApp native-mobile pattern):
 *   scroll down  → topBar: hidden
 *   scroll up    → topBar: compact (visible, shrunk)
 *   at page top  → topBar: expanded
 *   at page btm  → topBar: expanded
 *   route change → topBar: expanded (instant reset)
 *
 * Direction hysteresis: DIRECTION_HYSTERESIS px must accumulate in a new direction
 * before the state transitions — prevents flicker from micro-jitter.
 *
 * ── What this deliberately does NOT publish, and why ───────────────────────
 *
 * It used to expose scrollY, isAtTop and a bottomBar state as well. Nothing
 * read any of the three — and scrollY was rewritten on EVERY animation frame
 * of every scroll, into a context value rebuilt as a fresh object each time.
 * So all three consumers re-rendered ~60 times a second whenever the page
 * moved, for a value none of them looked at:
 *
 *   · AppShell        — the whole shell: sidebar, top bar, the wrapper around
 *                       every page, the bottom nav, the AI assistant
 *   · MobileBottomNav — which carries a framer-motion `layoutId` shared-layout
 *                       animation on its active pill
 *   · PullToRefresh   — which wraps all page content
 *
 * Re-rendering a tree full of layout animations at frame rate is what the
 * bottom bar's flicker and jitter while scrolling was made of. Two of those
 * three consumers only ever wanted `reducedMotion`, which changes about once
 * a year.
 *
 * So the state is now exactly what somebody reads. The value only changes
 * when topBar actually crosses a state boundary — a handful of times per
 * scroll instead of hundreds — and it is memoised so that identity is stable
 * when the contents are.
 *
 * If a future feature genuinely needs live scrollY, it should take it from a
 * ref or its own subscription rather than being put back here: a per-frame
 * value in a context shared with the app shell is the shape of this bug.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { usePathname } from 'next/navigation';

export type BarState = 'expanded' | 'compact' | 'hidden';

export interface NavScrollValue {
  topBar: BarState;
  reducedMotion: boolean;
}

const DEFAULT: NavScrollValue = {
  topBar: 'expanded',
  reducedMotion: false,
};

const NavScrollContext = createContext<NavScrollValue>(DEFAULT);

// ScrollY below which page is considered "at top"
const TOP_THRESHOLD = 64;
// Distance from bottom to be considered "at bottom"
const BOTTOM_MARGIN = 80;
// Minimum delta to register as a scroll event (sub-pixel jitter filter)
const MICRO_THRESHOLD = 3;
// Must accumulate this many px in a new direction before committing to it
const DIRECTION_HYSTERESIS = 12;

export function NavScrollProvider({ children }: { children: React.ReactNode }) {
  const [topBar, setTopBar] = useState<BarState>('expanded');
  const [reducedMotion, setReducedMotion] = useState(false);
  const pathname = usePathname();

  // Mutable refs — updated in RAF, never cause re-renders
  const rafRef      = useRef<number | null>(null);
  const lastY       = useRef(0);
  const lastTs      = useRef(0);
  const velEMA      = useRef(0); // px/ms, signed — exponential moving average
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Direction hysteresis refs
  const committedDir  = useRef<'down' | 'up'>('down');
  const pendingDir    = useRef<'down' | 'up' | null>(null);
  const pendingAccum  = useRef(0); // accumulated px in pending (uncommitted) direction

  // Detect prefers-reduced-motion
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Reset on every route change
  useEffect(() => {
    setTopBar('expanded');
    lastY.current        = 0;
    velEMA.current       = 0;
    committedDir.current = 'down';
    pendingDir.current   = null;
    pendingAccum.current = 0;
  }, [pathname]);

  const processFrame = useCallback(() => {
    rafRef.current = null;

    const currentY = window.scrollY;
    const now      = Date.now();
    const dt       = Math.max(now - lastTs.current, 1);
    const dy       = currentY - lastY.current;

    // Exponential moving average — 40% history, 60% current (responsive but smooth)
    velEMA.current = velEMA.current * 0.4 + (dy / dt) * 0.6;

    const atTop    = currentY < TOP_THRESHOLD;
    const atBottom = window.innerHeight + currentY >=
                     document.documentElement.scrollHeight - BOTTOM_MARGIN;

    lastY.current  = currentY;
    lastTs.current = now;

    // Every branch below either returns `prev` unchanged or a single string.
    // React bails out of a re-render when a useState setter is given the value
    // it already holds, so a scroll that does not cross a state boundary now
    // costs nothing at all — where the old shape rebuilt an object containing
    // the live scrollY on every frame and re-rendered the whole shell with it.
    setTopBar(prev => {
      // Page edges — always expand, regardless of direction
      if (atTop || atBottom) {
        committedDir.current = atBottom ? committedDir.current : 'down';
        pendingDir.current   = null;
        pendingAccum.current = 0;
        return 'expanded';
      }

      // Sub-pixel jitter — no state change
      if (Math.abs(dy) < MICRO_THRESHOLD) return prev;

      // ── Direction detection with hysteresis ──────────────────────────────
      const rawDir: 'down' | 'up' = dy > 0 ? 'down' : 'up';
      let resolvedDir = committedDir.current;

      if (rawDir === committedDir.current) {
        // Continuing in the committed direction — clear any pending candidate
        pendingDir.current   = null;
        pendingAccum.current = 0;
      } else {
        // Potential direction change — accumulate until threshold reached
        if (pendingDir.current === rawDir) {
          pendingAccum.current += Math.abs(dy);
        } else {
          pendingDir.current   = rawDir;
          pendingAccum.current = Math.abs(dy);
        }

        if (pendingAccum.current >= DIRECTION_HYSTERESIS) {
          // Commit to new direction
          committedDir.current = rawDir;
          pendingDir.current   = null;
          pendingAccum.current = 0;
          resolvedDir = rawDir;
        } else {
          // Not committed yet — hold current state
          return prev;
        }
      }

      // Scroll down hides the top bar; scroll up keeps it visible but shrunk.
      return resolvedDir === 'down' ? 'hidden' : 'compact';
    });

    // After scroll settles, reset velocity accumulator
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      velEMA.current = 0;
    }, 180);
  }, []);

  const onScroll = useCallback(() => {
    // Throttle: at most one processFrame per animation frame
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(processFrame);
  }, [processFrame]);

  useEffect(() => {
    lastTs.current = Date.now();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (settleTimer.current)     clearTimeout(settleTimer.current);
    };
  }, [onScroll]);

  // Memoised so consumers re-render when the STATE changes, not merely because
  // the provider re-rendered and handed them a new object with the same
  // contents in it.
  const value = useMemo<NavScrollValue>(() => ({ topBar, reducedMotion }), [topBar, reducedMotion]);

  return (
    <NavScrollContext.Provider value={value}>
      {children}
    </NavScrollContext.Provider>
  );
}

export function useNavScroll(): NavScrollValue {
  return useContext(NavScrollContext);
}
