/**
 * MY PT STUDIO visualization system — public surface.
 *
 * Import chart components from here (`@/components/visualizations`), not by
 * reaching into individual files, so the barrel stays the one place that
 * knows the full component list.
 *
 * Layout: theme/ is the MY PT STUDIO Visualization Design System — colour,
 * gradients, typography, grid lines, axis style, tooltip style, legends,
 * radius, shadow, animation and spacing, plus the two Nivo themes and the
 * responsive hook assembled from them — and primitives/ (ChartShell, the
 * shared tooltip, loading/empty/error states) is what every Premium*
 * component below is built from. An eighth chart type is built the same
 * way: read layout/colour/motion from theme/, never write a literal.
 *
 * metrics/ is the MY PT STUDIO Premium KPI System — PremiumMetricCard and
 * its named variants (MetricWithTrend, MetricWithSparkline, …) are the one
 * KPI card implementation every page should reach for instead of building
 * its own. It composes the seven chart components above (PremiumSparkline
 * for its sparkline variant) and reads every colour/type/spacing value from
 * the same theme/ tokens, so a metric card and a chart card are always one
 * visual system, never two that happen to sit near each other.
 */

export { PremiumBarChart } from './PremiumBarChart';
export type { PremiumBarChartProps, PremiumBarSeries } from './PremiumBarChart';

export { PremiumLineChart } from './PremiumLineChart';
export type { PremiumLineChartProps } from './PremiumLineChart';

export { PremiumAreaChart } from './PremiumAreaChart';
export type { PremiumAreaChartProps } from './PremiumAreaChart';

export { PremiumDonutChart } from './PremiumDonutChart';
export type { PremiumDonutChartProps, DonutDatum } from './PremiumDonutChart';

export { PremiumPieChart } from './PremiumPieChart';
export type { PremiumPieChartProps } from './PremiumPieChart';

export { PremiumProgressChart } from './PremiumProgressChart';
export type { PremiumProgressChartProps, PremiumProgressDatum } from './PremiumProgressChart';

export { PremiumSparkline } from './PremiumSparkline';
export type { PremiumSparklineProps, PremiumSparklineDatum } from './PremiumSparkline';

export type { PremiumSeriesSpec } from './primitives';
export type { PieDatum } from './primitives';

// The Premium KPI System — the canonical metric/stat card for the whole app.
export {
  PremiumMetricCard, PremiumMetricCardStandard,
  MetricWithTrend, MetricWithSparkline, MetricWithProgress,
  MetricWithComparison, MetricWithStatus, MetricWithIcon,
  MetricGroup,
} from './metrics';
export type {
  PremiumMetricCardProps,
  MetricWithTrendProps, MetricWithSparklineProps, MetricWithProgressProps,
  MetricWithComparisonProps, MetricWithStatusProps, MetricWithIconProps,
  MetricGroupProps,
  MetricTrend, MetricComparison, MetricStatus, MetricSparklineSpec, MetricProgressSpec,
} from './metrics';

// Shell + tooltip + states, for a page composing something the seven
// components above don't cover yet — a custom chart still gets the same
// card frame, tooltip, loading/empty/error states and surface handling.
export { ChartShell, ChartTooltipCard, ChartLegend, ChartLoading, ChartEmpty, ChartError, useChartMotion } from './primitives';
export type { ChartShellProps, ChartTooltipRow } from './primitives';

// The full design system — every token group, for a page that needs a raw
// value outside a chart (e.g. colouring a legend chip that lives next to,
// not inside, one) or a future chart type built outside these seven.
export {
  // colour
  saffron, navy, series, semantic, band, rgba, iconChip, metricTone,
  // typography
  fontFamily, fontSize, fontWeight, letterSpacing, typography,
  // motion
  EASE, duration, spring, framerTransition, framerTransitionReduced, motion,
  // shape (radius / border / shadow)
  radius, border, shadow, shape,
  // spacing (padding, gaps, plot margins, per-chart-type defaults)
  spacing, chartHeight, chartMargin, barPadding, pieLayout, radialLayout, pointLayout, metricCard,
  // grid / axis / tooltip / legend chrome
  grid, axis, tooltipChrome, legendChrome,
  // gradients
  gradientPreset, buildGradientFill,
  // responsive behaviour
  breakpoint, responsiveScale, useIsCompactChart, scaleMargin,
  // the assembled Nivo themes, and the default formatter
  nivoThemeFor, defaultFormat,
} from './theme';
export type { Surface, GradientPreset, MetricTone } from './theme';
