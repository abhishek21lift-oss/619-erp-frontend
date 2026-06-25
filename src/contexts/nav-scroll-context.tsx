'use client';

/**
 * NavScrollContext — unified scroll state machine for the top bar and bottom bar.
 *
 * Single RAF loop. Velocity-based state transitions. Scroll-stop debounce.
 * Both bars always read from here — no duplicate listeners.
 *
 * State machine:
 *   scroll down (slow)  → topBar: compact,  bottomBar: compact
 *   scroll down (fast)  → topBar: hidden,   bottomBar: compact   ← never hide both
 *   scroll up           → topBar: expanded, bottomBar: expanded
 *   at page top/bottom  → topBar: expanded, bottomBar: expanded
 *   route change        → topBar: expanded, bottomBar: expanded  (instant reset)
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { usePathname } from 'next/navigation';

export type BarState = 'expanded' | 'compact' | 'hidden';

export interface NavScrollValue {
  topBar: BarState;
  bottomBar: BarState;
  isAtTop: boolean;
  scrollY: number;
  reducedMotion: boolean;
}

const DEFAULT: NavScrollValue = {
  topBar: 'expanded',
  bottomBar: 'expanded',
  isAtTop: true,
  scrollY: 0,
  reducedMotion: false,
};

const NavScrollContext = createContext<NavScrollValue>(DEFAULT);

// Velocity threshold (px/ms) above which scroll is considered "fast"
const FAST_V = 0.6;
// ScrollY below which page is considered "at top"
const TOP_THRESHOLD = 64;
// Distance from bottom of page to be considered "at bottom"
const BOTTOM_MARGIN = 80;

interface NavState {
  topBar: BarState;
  bottomBar: BarState;
  isAtTop: boolean;
  scrollY: number;
}

export function NavScrollProvider({ children }: { children: React.ReactNode }) {
  const [nav, setNav] = useState<NavState>({
    topBar: 'expanded',
    bottomBar: 'expanded',
    isAtTop: true,
    scrollY: 0,
  });
  const [reducedMotion, setReducedMotion] = useState(false);
  const pathname = usePathname();

  // Mutable refs — updated in RAF, never cause re-renders
  const rafRef      = useRef<number | null>(null);
  const lastY       = useRef(0);
  const lastTs      = useRef(0);
  const velEMA      = useRef(0); // px/ms, signed; exponential moving average
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detect prefers-reduced-motion
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Reset both bars to expanded on every route change
  useEffect(() => {
    setNav({ topBar: 'expanded', bottomBar: 'expanded', isAtTop: true, scrollY: 0 });
    lastY.current  = 0;
    velEMA.current = 0;
  }, [pathname]);

  const processFrame = useCallback(() => {
    rafRef.current = null;

    const currentY = window.scrollY;
    const now      = Date.now();
    const dt       = Math.max(now - lastTs.current, 1);
    const dy       = currentY - lastY.current;

    // Exponential moving average for velocity — smooths out per-frame jitter
    // Weight: 40% history, 60% current sample (more responsive)
    velEMA.current = velEMA.current * 0.4 + (dy / dt) * 0.6;

    const atTop    = currentY < TOP_THRESHOLD;
    const atBottom = window.innerHeight + currentY >=
                     document.documentElement.scrollHeight - BOTTOM_MARGIN;

    lastY.current  = currentY;
    lastTs.current = now;

    setNav(prev => {
      // At page edges → always expand both
      if (atTop || atBottom) {
        return { topBar: 'expanded', bottomBar: 'expanded', isAtTop: atTop, scrollY: currentY };
      }

      // Micro-movement — update position only, no state change
      if (Math.abs(dy) < 2) {
        return { ...prev, isAtTop: atTop, scrollY: currentY };
      }

      const v    = Math.abs(velEMA.current);
      const down = dy > 0;
      const up   = dy < 0;

      let { topBar, bottomBar } = prev;

      if (down) {
        if (v > FAST_V) {
          // Fast scroll down: hide top, compact bottom (bottom is always accessible)
          topBar    = 'hidden';
          bottomBar = 'compact';
        } else {
          // Slow scroll down: compact both
          topBar    = 'compact';
          bottomBar = 'compact';
        }
      } else if (up) {
        // Any scroll up: expand both immediately
        topBar    = 'expanded';
        bottomBar = 'expanded';
      }

      // Safety invariant: NEVER hide both bars simultaneously
      if (topBar === 'hidden' && bottomBar === 'hidden') {
        bottomBar = 'compact';
      }

      return { topBar, bottomBar, isAtTop: atTop, scrollY: currentY };
    });

    // After scroll settles, reset velocity accumulator
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      velEMA.current = 0;
    }, 180);
  }, []);

  const onScroll = useCallback(() => {
    // Skip if a frame is already queued — throttle to exactly one process per animation frame
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(processFrame);
  }, [processFrame]);

  useEffect(() => {
    lastTs.current = Date.now();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (settleTimer.current) clearTimeout(settleTimer.current);
    };
  }, [onScroll]);

  return (
    <NavScrollContext.Provider value={{ ...nav, reducedMotion }}>
      {children}
    </NavScrollContext.Provider>
  );
}

export function useNavScroll(): NavScrollValue {
  return useContext(NavScrollContext);
}
