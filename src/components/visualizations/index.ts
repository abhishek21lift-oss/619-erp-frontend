/**
 * MY PT STUDIO visualization system — public surface.
 *
 * Import chart components from here (`@/components/visualizations`), not by
 * reaching into individual files, so the barrel stays the one place that
 * knows the full component list.
 *
 * Layout: theme/ (colour, motion, spacing tokens + the two Nivo themes) and
 * primitives/ (ChartShell, the shared tooltip, loading/empty/error states,
 * the reduced-motion hook) are what every Premium* component below is built
 * from — an eighth chart type should be built the same way, not from scratch.
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

// Shell + tooltip + states, for a page composing something the seven
// components above don't cover yet — a custom chart still gets the same
// card frame, tooltip, loading/empty/error states and surface handling.
export { ChartShell, ChartTooltipCard, ChartLegend, ChartLoading, ChartEmpty, ChartError, useChartMotion } from './primitives';
export type { ChartShellProps, ChartTooltipRow } from './primitives';

// Theme — for a page that needs a raw colour or the formatter outside a
// chart (e.g. colouring a legend chip that lives next to, not inside, one).
export {
  saffron, navy, series, semantic, band, EASE, motion, shape, typography, defaultFormat,
  nivoThemeFor,
} from './theme';
export type { Surface } from './theme/surface';
