import type { PremiumSparklineDatum } from '../PremiumSparkline';
import type { MetricTone } from '../theme/colors';

/**
 * The shapes every KPI variant in this system composes from. None of these
 * fields are ever fabricated by a component — every one is optional, and a
 * card simply omits the corresponding line when the caller has no real data
 * for it. See PremiumMetricCard's own doc comment for the render rule.
 */

export interface MetricTrend {
  /** Percent change vs. the comparison period — a real number the caller
   *  already has (from an API field, or computed from two real totals). */
  value: number;
  /** What a rising `value` means for THIS metric. Most metrics are better
   *  when they go up; "overdue clients" or "churn" are better going down.
   *  Defaults to 'up'. */
  goodDirection?: 'up' | 'down';
  /** e.g. "vs previous period", "vs last month". */
  label?: string;
}

export interface MetricComparison {
  /** The raw number behind the card's displayed `value` — needed to compute
   *  a real delta, since `value` itself may be a pre-formatted ReactNode. */
  currentValue: number;
  previousValue: number;
  /** e.g. "last month", "same day last week". */
  previousLabel?: string;
  /** Formats both figures in the comparison line. Defaults to defaultFormat. */
  format?: (n: number) => string;
  goodDirection?: 'up' | 'down';
}

export interface MetricStatus {
  label: string;
  tone: MetricTone;
}

export interface MetricSparklineSpec {
  data: PremiumSparklineDatum[];
  color?: string;
}

export interface MetricProgressSpec {
  value: number;
  /** Defaults to 100 — most progress metrics are already a percentage. */
  max?: number;
  format?: (n: number) => string;
}
