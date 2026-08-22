'use client';

import { useReducedMotion } from 'framer-motion';

/**
 * One hook, not seven copies of `useReducedMotion()`. Every chart in this
 * system spreads this into its Nivo props (`{...useChartMotion()}`) instead
 * of deciding its own animation policy — the exact gap the chart audit
 * flagged: PtOsDashboard checked reduced-motion, nothing else did.
 */
export function useChartMotion(): { animate: boolean; motionConfig: 'gentle' } {
  const reduce = useReducedMotion();
  return { animate: !reduce, motionConfig: 'gentle' };
}
