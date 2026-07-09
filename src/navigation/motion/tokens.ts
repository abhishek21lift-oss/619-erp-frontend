'use client';

// Motion design tokens — shared physics and timing constants for all nav animations.
// Use these instead of hard-coding durations/easings in components.

export type EaseCurve = [number, number, number, number];

export const MOTION_TOKENS = {
  dur: {
    instant: 0,
    fast: 0.15,
    default: 0.28,
    slow: 0.42,
  },

  ease: {
    out: [0.22, 1, 0.36, 1] as EaseCurve,
    in: [0.55, 0, 0.78, 0] as EaseCurve,
    inOut: [0.65, 0, 0.35, 1] as EaseCurve,
    bounce: [0.34, 1.56, 0.64, 1] as EaseCurve,
  },

  spring: {
    default: { type: 'spring' as const, stiffness: 520, damping: 38, mass: 0.7 },
    snappy: { type: 'spring' as const, stiffness: 700, damping: 22, mass: 0.5 },
    gentle: { type: 'spring' as const, stiffness: 280, damping: 32, mass: 1.0 },
    item:   { type: 'spring' as const, stiffness: 520, damping: 32, mass: 0.7 },
  },
} as const;

export type MotionTokens = typeof MOTION_TOKENS;
