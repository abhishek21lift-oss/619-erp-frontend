'use client';

import * as React from 'react';
import { ChartShell, ChartLegend, ChartLoading, ChartEmpty, ChartError, PieBase, type PieDatum } from './primitives';
import { series as seriesPalette } from './theme/colors';
import { chartHeight } from './theme/spacing';
import { defaultFormat } from './theme/format';
import type { Surface } from './theme/surface';

export interface PremiumPieChartProps {
  data: PieDatum[];
  formatValue?: (v: number) => string;
  height?: number;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  surface?: Surface;
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
 * The system's solid pie — for the rare case a share-of-total genuinely has
 * no meaningful "total" to anchor a centre label on (e.g. a status mix with
 * no single headline number). Prefer PremiumDonutChart when there is one.
 */
export function PremiumPieChart({
  data,
  formatValue = defaultFormat,
  height = chartHeight.pie,
  title,
  subtitle,
  icon,
  surface = 'auto',
  loading = false,
  error = null,
  onRetry,
  emptyTitle = 'No data yet',
  emptyDescription,
  showLegend = true,
  ariaLabel,
  className,
}: PremiumPieChartProps) {
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
    height,
    className,
    ariaLabel: ariaLabel ?? `${title ? `${title}: ` : ''}pie chart, ${cleaned.length} segments, total ${formatValue(total)}`,
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
        innerRadius={0}
        formatValue={formatValue}
        surface={surface}
      />
    </ChartShell>
  );
}
