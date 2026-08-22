/**
 * Chart spacing — every gap, padding and plot margin a Premium* component
 * lays out with. Grouped by what it spaces, not by chart type, so a change
 * to "the gap between a legend dot and its label" is one value here, not
 * four near-identical Tailwind classes across the seven components.
 */

export const spacing = {
  /** ChartShell's own card padding. */
  cardPadding: 20,
  cardPaddingSm: 14,
  /** ChartShell's icon chip — width and height, a square. */
  iconChip: 32,
  /** Gap between ChartShell's header and its plot area. */
  gap: 14,
  /** ChartLegend's swatch-to-label gap, and item-to-item gaps. */
  legendGapX: 16,
  legendGapY: 6,
  legendItemGap: 6,
  /** ChartTooltipCard. */
  tooltipPadding: '10px 12px',
  tooltipRowGap: 4,
  tooltipItemGap: 8,
  tooltipValueGap: 16,
} as const;

/**
 * Default plot height per chart type, in px. Every Premium* component's
 * `height` prop defaults to one of these — change a chart type's default
 * size for the whole app from this one object.
 */
export const chartHeight = {
  bar: 240,
  line: 220,
  area: 220,
  donut: 240,
  pie: 240,
  progress: 200,
  sparkline: 32,
} as const;

/**
 * Plot margins, per chart type — the axis gutter, mostly. One shared shape
 * per family (bar, line/area, sparkline, pie/donut, radial) rather than each
 * component inventing its own {top,right,bottom,left}.
 */
export const chartMargin = {
  bar: { top: 8, right: 6, bottom: 28, left: 44 },
  line: { top: 8, right: 10, bottom: 28, left: 44 },
  sparkline: { top: 4, right: 3, bottom: 2, left: 3 },
  pie: { top: 8, right: 8, bottom: 8, left: 8 },
  radial: { top: 6, right: 6, bottom: 6, left: 6 },
} as const;

/** PremiumBarChart's gap between bars — wider when series sit side by side. */
export const barPadding = {
  multiSeries: 0.32,
  singleSeries: 0.42,
  innerPadding: 3,
} as const;

/** PieBase — the gap between slices, and the hover "pop" radius offset. */
export const pieLayout = {
  padAngleMulti: 1.6,
  padAngleSingle: 0,
  activeOuterRadiusOffset: 4,
} as const;

/** PremiumProgressChart — ring thickness and gap, as a fraction of the plot radius. */
export const radialLayout = {
  innerRadiusSingle: 0.72,
  innerRadiusMulti: 0.3,
  paddingMulti: 0.25,
  paddingSingle: 0,
  padAngle: 0.6,
} as const;

/** Line/area point markers, and the sparkline's emphasised last-point dot. */
export const pointLayout = {
  size: 7,
  sparklineDot: 3,
} as const;
