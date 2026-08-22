/**
 * Chart motion — one easing curve, one small set of named durations, and the
 * two react-spring configs Nivo's `motionConfig` prop accepts. Every
 * animated thing in this system (a Nivo chart's own transitions, a hand-
 * drawn SVG layer, a framer-motion wrapper) reads its timing from here.
 *
 * useChartMotion (primitives/useChartMotion.ts) is the only place these get
 * turned into actual `{animate, motionConfig}` props — a chart component
 * never picks its own duration or decides for itself whether reduced-motion
 * applies.
 */

/** House easing — identical to EASE in PtOsDashboard.tsx and the landing page. */
export const EASE = [0.16, 1, 0.3, 1] as const;

/** Named durations, in ms. */
export const duration = {
  fast: 180,
  base: 450,
  slow: 650,
} as const;

/**
 * react-spring configs, the shape Nivo's `motionConfig` prop takes. `gentle`
 * is the one feel this system uses — premium charts settle, they don't
 * bounce — tunable in this one object rather than as a string sprinkled
 * across seven components.
 */
export const spring = {
  gentle: { mass: 1, tension: 170, friction: 26 },
  /** What reduced-motion collapses to: instant, no animation. */
  none: { duration: 0 },
} as const;

/** For anything hand-animated with framer-motion inside a chart (a custom SVG layer, a shell transition). */
export const framerTransition = { duration: duration.slow / 1000, ease: EASE } as const;
export const framerTransitionReduced = { duration: 0 } as const;

export const motion = { EASE, duration, spring, framerTransition, framerTransitionReduced } as const;
