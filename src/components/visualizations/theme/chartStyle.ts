/**
 * The chart's visual grammar — grid lines, axis chrome, tooltip chrome and
 * legend chrome — as distinct from colour (colors.ts), type (typography.ts)
 * and layout (spacing.ts, shape.ts). These are the settings that make a
 * Nivo chart look like *this* system's chart rather than a stock Nivo demo.
 */

/** Grid lines behind a bar/line/area chart. */
export const grid = {
  strokeWidth: 1,
  strokeDasharray: 'none',
} as const;

/**
 * Axis ticks. tickPadding is split X/Y because the two consistently differ
 * across every chart in the system (the bottom/category axis sits slightly
 * further from its ticks than the value axis does) — naming both keeps that
 * a deliberate pair instead of two components quietly drifting apart.
 */
export const axis = {
  tickSize: 0,
  tickPaddingX: 10,
  tickPaddingY: 8,
} as const;

/** ChartTooltipCard's chrome — everything about it that isn't colour or spacing. */
export const tooltipChrome = {
  minWidth: 140,
  blur: 16,
} as const;

/** ChartLegend's swatch. */
export const legendChrome = {
  swatchSize: 10,
} as const;
