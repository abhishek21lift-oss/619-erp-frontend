'use client';

import * as React from 'react';
import { ResponsiveLine } from '@nivo/line';
import type { LineCurveFactoryId } from '@nivo/core';
import { nivoThemeFor, series as seriesPalette, defaultFormat } from '../theme';
import { buildGradientFill } from '../theme/gradients';
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
  areaOpacity: number;
  curve?: LineCurveFactoryId;
  formatValue?: (v: number) => string;
  surface?: Surface;
  showPoints?: boolean;
  ariaLabel?: string;
}

/**
 * Shared render internals for PremiumLineChart and PremiumAreaChart — the
 * only difference between the two is `enableArea`/`areaOpacity`, so this is
 * where the actual <ResponsiveLine> lives, once. Not part of the public API:
 * both chart components own their loading/empty/error/shell wiring, this
 * only draws the plot once there is real data to draw.
 */
export function LineChartCore({
  data,
  xKey,
  series,
  colorByKey,
  labelByKey,
  enableArea,
  areaOpacity,
  curve = 'monotoneX',
  formatValue = defaultFormat,
  surface = 'auto',
  showPoints = true,
  ariaLabel,
}: LineChartCoreProps) {
  const motionProps = useChartMotion();
  const nivoData = React.useMemo(() => toNivoSeries(data, xKey, series), [data, xKey, series]);

  const gradient = React.useMemo(
    () => buildGradientFill(
      series.map((s) => ({ id: s.key, color: colorByKey[s.key] })),
      { fromOpacity: enableArea ? 0.32 : 0, toOpacity: enableArea ? 0.02 : 0 },
    ),
    [series, colorByKey, enableArea],
  );

  return (
    <ResponsiveLine
      data={nivoData}
      xScale={{ type: 'point' }}
      yScale={{ type: 'linear', min: 0, max: 'auto', stacked: false, nice: true }}
      curve={curve}
      margin={{ top: 8, right: 10, bottom: 28, left: 44 }}
      colors={(d) => colorByKey[String(d.id)] ?? seriesPalette[0]}
      lineWidth={2.5}
      enableArea={enableArea}
      areaOpacity={enableArea ? 1 : 0}
      areaBaselineValue={0}
      defs={enableArea ? gradient.defs : []}
      fill={enableArea ? gradient.fill : []}
      enablePoints={showPoints}
      pointSize={7}
      pointColor={{ theme: 'background' }}
      pointBorderWidth={2.5}
      pointBorderColor={{ from: 'seriesColor' }}
      enableGridX={false}
      enableGridY
      axisTop={null}
      axisRight={null}
      axisBottom={{ tickSize: 0, tickPadding: 10 }}
      axisLeft={{ tickSize: 0, tickPadding: 8, format: (v) => formatValue(Number(v)) }}
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
