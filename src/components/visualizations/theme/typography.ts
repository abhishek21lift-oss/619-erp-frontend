/**
 * Chart typography — every font family, size, weight and letter-spacing a
 * Premium* component or primitive uses. A chart never sets its own font
 * stack or a bespoke `fontSize: 13.5` inline; it reads one of these instead,
 * so "make the whole system's type one size larger" is an edit here, not a
 * hunt through seven components.
 */

/** Font stacks — the app's own, never a chart-specific typeface. */
export const fontFamily = {
  sans: 'var(--font-sans, Inter, system-ui, sans-serif)',
  mono: 'var(--font-mono, "JetBrains Mono", "Fira Code", monospace)',
} as const;

/**
 * The chart type scale. Deliberately not the app's full type scale — a chart
 * only ever needs these five sizes, named by what they're for rather than by
 * pixel value, so a call site never has to guess which is which.
 */
export const fontSize = {
  /** Axis ticks, tooltip heading, legend ticks. */
  xs: 10,
  /** Nivo's own base theme text size. */
  sm: 11,
  /** Tooltip row text, legend labels. */
  base: 12,
  /** Chart title (ChartShell). */
  label: 13,
  /** Donut/pie centre value, single progress ring's percentage. */
  value: 20,
  /** Large emphasis — reserved for the one number a chart exists to show. */
  valueLg: 22,
} as const;

export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  black: 800,
} as const;

/** Named rather than by value, so "the label tracking" means the same 0.06em everywhere it's used. */
export const letterSpacing = {
  normal: 'normal',
  /** Tooltip heading. */
  wide: '0.04em',
  /** Uppercase captions: centre labels, legend eyebrows. */
  label: '0.06em',
} as const;

export const typography = { fontFamily, fontSize, fontWeight, letterSpacing } as const;
