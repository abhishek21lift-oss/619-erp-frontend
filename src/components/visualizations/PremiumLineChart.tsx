'use client';

import * as React from 'react';
import type { LineCurveFactoryId } from '@nivo/core';
import {
  ChartShell, ChartLegend, ChartLoading, ChartEmpty, ChartError, LineChartCore,
  type PremiumSeriesSpec,
} from './primitives';
import { series as seriesPalette, defaultFormat } from './theme';
import type { Surface } from './theme/surface';

export interface PremiumLineChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  lines: PremiumSeriesSpec[];
  height?: number;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  surface?: Surface;
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
 * The system's line chart — a trend over time, one or more series. Below
 * `minPoints` real readings it renders the empty state instead of a line
 * through one or two dots, which isn't a trend.
 */
export function PremiumLineChart({
  data,
  xKey,
  lines,
  height = 220,
  title,
  subtitle,
  icon,
  surface = 'auto',
  curve = 'monotoneX',
  showPoints = true,
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
}: PremiumLineChartProps) {
  const colorByKey = React.useMemo(() => {
    const map: Record<string, string> = {};
    lines.forEach((s, i) => { map[s.key] = s.color ?? seriesPalette[i % seriesPalette.length]; });
    return map;
  }, [lines]);
  const labelByKey = React.useMemo(() => {
    const map: Record<string, string> = {};
    lines.forEach((s) => { map[s.key] = s.label; });
    return map;
  }, [lines]);

  const pointCount = data.filter((row) => lines.some((s) => Number.isFinite(Number(row[s.key])))).length;
  const hasData = pointCount >= minPoints;
  const legendItems = lines.map((s) => ({ label: s.label, color: colorByKey[s.key] }));
  const resolvedShowLegend = showLegend ?? lines.length > 1;

  const shellProps = {
    title,
    subtitle,
    icon,
    surface,
    height,
    className,
    ariaLabel: ariaLabel ?? `${title ? `${title}: ` : ''}line chart with ${lines.length} series across ${data.length} points`,
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
        series={lines}
        colorByKey={colorByKey}
        labelByKey={labelByKey}
        enableArea={false}
        areaOpacity={0}
        curve={curve}
        formatValue={formatValue}
        surface={surface}
        showPoints={showPoints}
        ariaLabel={shellProps.ariaLabel}
      />
    </ChartShell>
  );
}
