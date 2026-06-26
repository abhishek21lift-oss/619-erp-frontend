'use client';

/**
 * NavScrollContext — unified scroll state machine for the top bar and bottom bar.
 *
 * Single RAF loop. Direction hysteresis prevents flicker. Scroll-stop debounce.
 *
 * State machine (Instagram / WhatsApp native-mobile pattern):
 *   scroll down  → topBar: hidden  (off screen)         bottomBar: expanded
 *   scroll up    → topBar: compact (visible, shrunk)   bottomBar: hidden
 *   at page top  → topBar: expanded                     bottomBar: expanded
 *   at page btm  → topBar: expanded                     bottomBar: expanded
 *   route change → topBar: expanded                     bottomBar: expanded (instant reset)
 *
 * Direction hysteresis: DIRECTION_HYSTERESIS px must accumulate in a new direction
 * before the state transitions — prevents flicker from micro-jitter.
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

// ScrollY below which page is considered "at top"
const TOP_THRESHOLD = 64;
// Distance from bottom to be considered "at bottom"
const BOTTOM_MARGIN = 80;
// Minimum delta to register as a scroll event (sub-pixel jitter filter)
const MICRO_THRESHOLD = 3;
// Must accumulate this many px in a new direction before committing to it
const DIRECTION_HYSTERESIS = 12;

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

  // Reset both bars on every route change
  useEffect(() => {
    setNav({ topBar: 'expanded', bottomBar: 'expanded', isAtTop: true, scrollY: 0 });
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

    setNav(prev => {
      // Page edges — always expand both bars regardless of direction
      if (atTop || atBottom) {
        committedDir.current = atBottom ? committedDir.current : 'down';
        pendingDir.current   = null;
        pendingAccum.current = 0;
        return { topBar: 'expanded', bottomBar: 'expanded', isAtTop: atTop, scrollY: currentY };
      }

      // Sub-pixel jitter — update position only, no state change
      if (Math.abs(dy) < MICRO_THRESHOLD) {
        return { ...prev, isAtTop: atTop, scrollY: currentY };
      }

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
          return { ...prev, isAtTop: atTop, scrollY: currentY };
        }
      }

      let { topBar, bottomBar } = prev;

      if (resolvedDir === 'down') {
        // Scroll down: top bar hides; bottom bar reappears
        topBar    = 'hidden';
        bottomBar = 'expanded';
      } else {
        // Scroll up: top bar stays visible (compact); bottom bar hides
        topBar    = 'compact';
        bottomBar = 'hidden';
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

  return (
    <NavScrollContext.Provider value={{ ...nav, reducedMotion }}>
      {children}
    </NavScrollContext.Provider>
  );
}

export function useNavScroll(): NavScrollValue {
  return useContext(NavScrollContext);
}
