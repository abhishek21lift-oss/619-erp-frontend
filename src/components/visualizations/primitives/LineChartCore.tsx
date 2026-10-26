'use client';

import * as React from 'react';
import { ResponsiveLine } from '@nivo/line';
import type { LineCurveFactoryId } from '@nivo/core';
import { series as seriesPalette } from '../theme/colors';
import { border } from '../theme/shape';
import { chartMargin, pointLayout } from '../theme/spacing';
import { axis } from '../theme/chartStyle';
import { useIsCompactChart, scaleMargin } from '../theme/responsive';
import { nivoThemeFor } from '../theme/nivoTheme';
import { defaultFormat } from '../theme/format';
import { buildGradientFill, gradientPreset } from '../theme/gradients';
import { toNivoSeries, type PremiumSeriesSpec } from './seriesData';
import { ChartTooltipCard } from './ChartTooltip';
import { useChartMotion } from './useChartMotion';
import type { Surface } from '../theme/surface';

export interface LineChartCoreProps {
  data: readonly Record<string, unknown>[];
  xKey: string;
  series: readonly PremiumSeriesSpec[];
  colorByKey: Record<string, string>;
  labelByKey: Record<string, string>;
  enableArea: boolean;
  curve?: LineCurveFactoryId;
  formatValue?: (v: number) => string;
  surface?: Surface;
  showPoints?: boolean;
  ariaLabel?: string;
  /**
   * Bottom of the y domain. Omit for the old 0-based scale; `'auto'` pads the
   * data range so a body metric (78 → 72 kg) is not flattened against zero.
   */
  yMin?: number | 'auto';
}

/**
 * Shared render internals for PremiumLineChart and PremiumAreaChart — the
 * only difference between the two is `enableArea`, so this is where the
 * actual <ResponsiveLine> lives, once. Not part of the public API: both
 * chart components own their loading/empty/error/shell wiring, this only
 * draws the plot once there is real data to draw. Every layout constant
 * below is a theme token (shape.ts / spacing.ts / chartStyle.ts).
 */
export function LineChartCore({
  data,
  xKey,
  series,
  colorByKey,
  labelByKey,
  enableArea,
  curve = 'monotoneX',
  formatValue = defaultFormat,
  surface = 'auto',
  showPoints = true,
  ariaLabel,
  yMin,
}: LineChartCoreProps) {
  const motionProps = useChartMotion();
  const compact = useIsCompactChart();
  const nivoData = React.useMemo(() => toNivoSeries(data, xKey, series), [data, xKey, series]);

  const yDomain = React.useMemo(() => {
    if (yMin === undefined) return { min: 0, max: 'auto' as const };
    if (typeof yMin === 'number') return { min: yMin, max: 'auto' as const };
    const values = data.flatMap((row) => series
      .map((s) => Number(row[s.key]))
      .filter((v) => Number.isFinite(v)));
    if (!values.length) return { min: 0, max: 'auto' as const };
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const pad = (hi - lo || Math.abs(hi) * 0.1 || 1) * 0.15;
    return { min: lo - pad, max: hi + pad };
  }, [data, series, yMin]);

  const gradient = React.useMemo(
    () => buildGradientFill(
      series.map((s) => ({ id: s.key, color: colorByKey[s.key] })),
      enableArea ? gradientPreset.area : gradientPreset.none,
    ),
    [series, colorByKey, enableArea],
  );

  return (
    <ResponsiveLine
      data={nivoData}
      xScale={{ type: 'point' }}
      yScale={{ type: 'linear', ...yDomain, stacked: false, nice: yMin === undefined }}
      curve={curve}
      margin={scaleMargin(chartMargin.line, compact)}
      colors={(d) => colorByKey[String(d.id)] ?? seriesPalette[0]}
      lineWidth={border.lineWidth}
      enableArea={enableArea}
      areaOpacity={enableArea ? 1 : 0}
      areaBaselineValue={yDomain.min}
      defs={enableArea ? gradient.defs : []}
      fill={enableArea ? gradient.fill : []}
      enablePoints={showPoints}
      pointSize={pointLayout.size}
      pointColor={{ theme: 'background' }}
      pointBorderWidth={border.pointWidth}
      pointBorderColor={{ from: 'seriesColor' }}
      enableGridX={false}
      enableGridY
      axisTop={null}
      axisRight={null}
      axisBottom={{ tickSize: axis.tickSize, tickPadding: axis.tickPaddingX }}
      axisLeft={{ tickSize: axis.tickSize, tickPadding: axis.tickPaddingY, format: (v) => formatValue(Number(v)) }}
      enableSlices="x"
      useMesh
      role="img"
      isFocusable
      theme={nivoThemeFor(surface)}
      {...motionProps}
      sliceTooltip={({ slice }) => (
        <ChartTooltipCard
          heading={slice.points[0]?.data.xFormatted}
          surface={surface}
          rows={slice.points.map((p) => ({
            label: labelByKey[p.seriesId] ?? String(p.seriesId),
            value: formatValue(Number(p.data.y)),
            color: p.seriesColor,
          }))}
        />
      )}
      ariaLabel={ariaLabel}
    />
  );
}
