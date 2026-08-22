'use client';

import { useEffect, useState } from 'react';

/**
 * Responsive behaviour, centralised the same way everything else in this
 * system is: a breakpoint and a set of scale factors here, a hook that reads
 * them, and every Premium* component calls that hook instead of writing its
 * own media query. Tightening how much a chart shrinks on a phone — or
 * moving the breakpoint itself — is an edit to this one file.
 */

export const breakpoint = {
  /** Below this viewport width, charts switch to their compact layout. */
  compact: 480,
} as const;

export const responsiveScale = {
  /** Scales chartMargin.* (spacing.ts) — a narrow screen needs less axis gutter. */
  margin: 0.72,
  /** Scales ChartShell's card padding. */
  padding: 0.75,
} as const;

/**
 * True when the viewport is narrower than `breakpoint.compact`. SSR-safe:
 * starts `false` (the desktop layout) and corrects itself after mount, the
 * same pattern the app's own ThemeProvider uses for the light/dark class —
 * so there is one client-only re-render, never a hydration mismatch.
 */
export function useIsCompactChart(): boolean {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint.compact}px)`);
    const update = () => setCompact(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return compact;
}

/** Scales a Nivo `{top,right,bottom,left}` margin box down for the compact layout. */
export function scaleMargin<T extends { top: number; right: number; bottom: number; left: number }>(
  margin: T,
  compact: boolean,
): T {
  if (!compact) return margin;
  const s = responsiveScale.margin;
  return {
    ...margin,
    top: Math.round(margin.top * s),
    right: Math.round(margin.right * s),
    bottom: Math.round(margin.bottom * s),
    left: Math.round(margin.left * s),
  };
}
