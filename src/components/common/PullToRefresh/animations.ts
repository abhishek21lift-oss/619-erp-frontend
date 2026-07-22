// Reusable animation primitives for the pull-to-refresh indicator.
// Framer Motion spring transitions + a couple of interpolation helpers so
// the physics live in one place and stay consistent across stages.

import type { Transition } from 'framer-motion';
import { clamp } from './utils';

/** Snappy pop used when the centre icon swaps between stages. */
export const POP_SPRING: Transition = { type: 'spring', stiffness: 520, damping: 20, mass: 0.7 };

/** Arrow flip when the pull arms past the threshold. */
export const ARROW_SPRING: Transition = { type: 'spring', stiffness: 300, damping: 20 };

/** Elastic rubber-band curve for content/indicator settle on release —
 *  slight overshoot gives the native "bounce back" feel. */
export const BOUNCE_EASE = 'cubic-bezier(0.34, 1.35, 0.5, 1)';

/** Indicator scale grows 0.5 → 1.0 across the pull. */
export const indicatorScale = (progress: number): number => 0.5 + clamp(progress, 0, 1) * 0.5;

/** Arrow rotation tracks the pull 0 → 180deg. */
export const arrowRotation = (progress: number): number => clamp(progress, 0, 1) * 180;

/** Fade the indicator in slightly ahead of the pull for a responsive feel. */
export const indicatorOpacity = (progress: number): number => clamp(progress * 1.25, 0, 1);
