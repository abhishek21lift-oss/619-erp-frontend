'use client';

import { useReducedMotion } from 'framer-motion';
import { spring } from '../theme/motion';

/**
 * One hook, not seven copies of `useReducedMotion()`. Every chart in this
 * system spreads this into its Nivo props (`{...useChartMotion()}`) instead
 * of deciding its own animation policy — the exact gap the chart audit
 * flagged: PtOsDashboard checked reduced-motion, nothing else did.
 *
 * The spring itself lives in theme/motion.ts, not here — this hook only
 * decides WHICH of the two named presets applies.
 */
export function useChartMotion(): { animate: boolean; motionConfig: typeof spring.gentle | typeof spring.none } {
  const reduce = useReducedMotion();
  return { animate: !reduce, motionConfig: reduce ? spring.none : spring.gentle };
}
