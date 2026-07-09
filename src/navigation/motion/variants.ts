'use client';

import { MOTION_TOKENS } from './tokens';

// Framer-motion Variants presets for nav animations.
// Import these in components rather than re-defining animation specs inline.

export const fadeVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: MOTION_TOKENS.dur.default, ease: MOTION_TOKENS.ease.out } },
  exit:    { opacity: 0, transition: { duration: MOTION_TOKENS.dur.fast,    ease: MOTION_TOKENS.ease.in  } },
} as const;

export const slideUpVariants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: MOTION_TOKENS.dur.default, ease: MOTION_TOKENS.ease.out } },
  exit:    { opacity: 0, y: 8,  transition: { duration: MOTION_TOKENS.dur.fast,   ease: MOTION_TOKENS.ease.in  } },
} as const;

export const slideInRightVariants = {
  hidden:  { opacity: 0, x: -16 },
  visible: { opacity: 1, x: 0,   transition: { duration: MOTION_TOKENS.dur.default, ease: MOTION_TOKENS.ease.out } },
  exit:    { opacity: 0, x: -8,  transition: { duration: MOTION_TOKENS.dur.fast,    ease: MOTION_TOKENS.ease.in  } },
} as const;

export const sidebarVariants = {
  open:   { width: 260, transition: MOTION_TOKENS.spring.default },
  closed: { width: 64,  transition: MOTION_TOKENS.spring.default },
} as const;

export const collapseVariants = {
  open:   { height: 'auto', opacity: 1 },
  closed: { height: 0,      opacity: 0 },
} as const;

export const scaleInVariants = {
  hidden:  { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1,   transition: MOTION_TOKENS.spring.snappy },
  exit:    { opacity: 0, scale: 0.94, transition: { duration: MOTION_TOKENS.dur.fast } },
} as const;

/** Stagger children — use on a parent `variants` that contains `visible`. */
export const staggerContainerVariants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.044, delayChildren: 0 } },
} as const;
