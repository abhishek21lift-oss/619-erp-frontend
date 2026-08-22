'use client';

import * as React from 'react';
import { ChartShell, ChartLegend, ChartLoading, ChartEmpty, ChartError, PieBase, type PieDatum } from './primitives';
import { series as seriesPalette } from './theme/colors';
import { chartHeight } from './theme/spacing';
import { defaultFormat } from './theme/format';
import type { Surface } from './theme/surface';

export type { PieDatum as DonutDatum };

export interface PremiumDonutChartProps {
  data: PieDatum[];
  /** Total shown in the middle. Defaults to the sum of `data`. */
  centerValue?: React.ReactNode;
  centerLabel?: string;
  formatValue?: (v: number) => string;
  height?: number;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  surface?: Surface;
  /** Renders ChartShell's own card frame. Set false when embedding this chart inside a card that already has one. */
  bordered?: boolean;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  showLegend?: boolean;
  ariaLabel?: string;
  className?: string;
}

/**
 * The system's donut — a "share of total" read with one number in the
 * middle: membership mix, revenue split, macro composition. Zero-sum or
 * empty data renders the shared empty state instead of an unreadable ring.
 */
export function PremiumDonutChart({
  data,
  centerValue,
  centerLabel,
  formatValue = defaultFormat,
  height = chartHeight.donut,
  title,
  subtitle,
  icon,
  surface = 'auto',
  bordered = true,
  loading = false,
  error = null,
  onRetry,
  emptyTitle = 'No data yet',
  emptyDescription,
  showLegend = true,
  ariaLabel,
  className,
}: PremiumDonutChartProps) {
  const cleaned = React.useMemo(
    () => data
      .map((d) => ({ ...d, value: Number.isFinite(d.value) && d.value > 0 ? d.value : 0 }))
      .filter((d) => d.value > 0),
    [data],
  );
  const total = React.useMemo(() => cleaned.reduce((sum, d) => sum + d.value, 0), [cleaned]);
  const hasData = cleaned.length > 0 && total > 0;

  const legendItems = cleaned.map((d, i) => ({ label: d.name, color: d.color ?? seriesPalette[i % seriesPalette.length] }));

  const shellProps = {
    title,
    subtitle,
    icon,
    surface,
    bordered,
    height,
    className,
    ariaLabel: ariaLabel ?? `${title ? `${title}: ` : ''}donut chart, ${cleaned.length} segments, total ${formatValue(total)}`,
  };

  if (loading) return <ChartShell {...shellProps}><ChartLoading height={height} /></ChartShell>;
  if (error) return <ChartShell {...shellProps}><ChartError height={height} message={error} onRetry={onRetry} /></ChartShell>;
  if (!hasData) return <ChartShell {...shellProps}><ChartEmpty height={height} title={emptyTitle} description={emptyDescription} /></ChartShell>;

  return (
    <ChartShell
      {...shellProps}
      footer={showLegend ? <ChartLegend items={legendItems} surface={surface} /> : undefined}
    >
      <PieBase
        data={cleaned}
        innerRadius={0.68}
        centerValue={centerValue ?? formatValue(total)}
        centerLabel={centerLabel}
        formatValue={formatValue}
        surface={surface}
      />
    </ChartShell>
  );
}
