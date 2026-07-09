'use client';

import { useEffect, useState } from 'react';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

const DESKTOP_MIN = 1024;
const TABLET_MIN  = 768;

function getBreakpoint(width: number): Breakpoint {
  if (width >= DESKTOP_MIN) return 'desktop';
  if (width >= TABLET_MIN)  return 'tablet';
  return 'mobile';
}

/**
 * Returns the current responsive breakpoint.
 * SSR-safe: defaults to 'desktop' on the server to avoid layout shift.
 */
export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>('desktop');

  useEffect(() => {
    const update = () => setBp(getBreakpoint(window.innerWidth));
    update();

    const mql = window.matchMedia(`(min-width: ${DESKTOP_MIN}px)`);
    const mqlTablet = window.matchMedia(`(min-width: ${TABLET_MIN}px)`);

    mql.addEventListener('change', update);
    mqlTablet.addEventListener('change', update);

    return () => {
      mql.removeEventListener('change', update);
      mqlTablet.removeEventListener('change', update);
    };
  }, []);

  return bp;
}

export function useIsDesktop() { return useBreakpoint() === 'desktop'; }
export function useIsTablet()  { return useBreakpoint() === 'tablet';  }
export function useIsMobile()  { return useBreakpoint() === 'mobile';  }
