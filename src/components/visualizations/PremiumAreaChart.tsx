'use client';

import * as React from 'react';
import type { LineCurveFactoryId } from '@nivo/core';
import {
  ChartShell, ChartLegend, ChartLoading, ChartEmpty, ChartError, LineChartCore,
  type PremiumSeriesSpec,
} from './primitives';
import { series as seriesPalette } from './theme/colors';
import { chartHeight } from './theme/spacing';
import { defaultFormat } from './theme/format';
import type { Surface } from './theme/surface';

export interface PremiumAreaChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  areas: PremiumSeriesSpec[];
  height?: number;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  surface?: Surface;
  /** Renders ChartShell's own card frame. Set false when embedding this chart inside a card that already has one. */
  bordered?: boolean;
  curve?: LineCurveFactoryId;
  showPoints?: boolean;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  formatValue?: (v: number) => string;
  showLegend?: boolean;
  minPoints?: number;
  ariaLabel?: string;
  className?: string;
}

/**
 * The system's area chart — a filled trend, e.g. weight over time or
 * cumulative revenue. Same shared line core as PremiumLineChart, with the
 * fill turned on and gradiented down to transparent at the baseline.
 */
export function PremiumAreaChart({
  data,
  xKey,
  areas,
  height = chartHeight.area,
  title,
  subtitle,
  icon,
  surface = 'auto',
  bordered = true,
  curve = 'monotoneX',
  showPoints = false,
  loading = false,
  error = null,
  onRetry,
  emptyTitle = 'Not enough data yet',
  emptyDescription = 'A trend needs at least two readings.',
  formatValue = defaultFormat,
  showLegend,
  minPoints = 2,
  ariaLabel,
  className,
}: PremiumAreaChartProps) {
  const colorByKey = React.useMemo(() => {
    const map: Record<string, string> = {};
    areas.forEach((s, i) => { map[s.key] = s.color ?? seriesPalette[i % seriesPalette.length]; });
    return map;
  }, [areas]);
  const labelByKey = React.useMemo(() => {
    const map: Record<string, string> = {};
    areas.forEach((s) => { map[s.key] = s.label; });
    return map;
  }, [areas]);

  const pointCount = data.filter((row) => areas.some((s) => Number.isFinite(Number(row[s.key])))).length;
  const hasData = pointCount >= minPoints;
  const legendItems = areas.map((s) => ({ label: s.label, color: colorByKey[s.key] }));
  const resolvedShowLegend = showLegend ?? areas.length > 1;

  const shellProps = {
    title,
    subtitle,
    icon,
    surface,
    bordered,
    height,
    className,
    ariaLabel: ariaLabel ?? `${title ? `${title}: ` : ''}area chart with ${areas.length} series across ${data.length} points`,
    action: resolvedShowLegend && !loading && !error && hasData
      ? <ChartLegend items={legendItems} surface={surface} />
      : undefined,
  };

  if (loading) return <ChartShell {...shellProps}><ChartLoading height={height} /></ChartShell>;
  if (error) return <ChartShell {...shellProps}><ChartError height={height} message={error} onRetry={onRetry} /></ChartShell>;
  if (!hasData) return <ChartShell {...shellProps}><ChartEmpty height={height} title={emptyTitle} description={emptyDescription} /></ChartShell>;

  return (
    <ChartShell {...shellProps}>
      <LineChartCore
        data={data}
        xKey={xKey}
        series={areas}
        colorByKey={colorByKey}
        labelByKey={labelByKey}
        enableArea
        curve={curve}
        formatValue={formatValue}
        surface={surface}
        showPoints={showPoints}
        ariaLabel={shellProps.ariaLabel}
      />
    </ChartShell>
  );
}
