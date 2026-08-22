'use client';

import * as React from 'react';
import { ResponsiveLine } from '@nivo/line';
import type { CommonCustomLayerProps } from '@nivo/line';
import { nivoThemeFor, defaultFormat, saffron } from './theme';
import { buildGradientFill } from './theme/gradients';
import { ChartTooltipCard, useChartMotion } from './primitives';
import type { Surface } from './theme/surface';

export interface PremiumSparklineDatum {
  label: string;
  value: number;
}

export interface PremiumSparklineProps {
  /** Oldest first. */
  data: PremiumSparklineDatum[];
  color?: string;
  /** Names the series for the tooltip and the accessible label. */
  metric: string;
  format?: (n: number) => string;
  height?: number;
  surface?: Surface;
  showArea?: boolean;
  className?: string;
}

type SparkSeries = { id: string; data: { x: string; y: number | null }[] };

/** Draws one filled dot on the most recent point — "the eye lands on now." */
function LastPointLayer({ points }: CommonCustomLayerProps<SparkSeries>) {
  const last = points[points.length - 1];
  if (!last) return null;
  return <circle cx={last.x} cy={last.y} r={3} fill={last.seriesColor} stroke="none" />;
}

/**
 * The system's sparkline — a compact trend with no axes, no grid, no legend.
 * Full-bleed by design: it's meant to sit as a card's own bottom edge (a KPI
 * tile's six-month trend), not inside a bordered ChartShell, so unlike the
 * other six components it renders no card frame of its own.
 */
export function PremiumSparkline({
  data,
  color = saffron[500],
  metric,
  format = defaultFormat,
  height = 32,
  surface = 'auto',
  showArea = true,
  className,
}: PremiumSparklineProps) {
  const motionProps = useChartMotion();

  if (data.length === 0) return null;

  const nivoData: SparkSeries[] = [
    { id: metric, data: data.map((d) => ({ x: d.label, y: Number.isFinite(d.value) ? d.value : null })) },
  ];
  const gradient = buildGradientFill([{ id: metric, color }], { fromOpacity: 0.28, toOpacity: 0.02 });
  const ariaLabel = `${metric}, last ${data.length} points: ${data.map((d) => Math.round(d.value)).join(', ')}`;

  return (
    <div className={className} style={{ height, width: '100%' }} role="img" aria-label={ariaLabel}>
      <ResponsiveLine
        data={nivoData}
        xScale={{ type: 'point' }}
        yScale={{ type: 'linear', min: 0, max: 'auto', nice: false }}
        curve="monotoneX"
        margin={{ top: 4, right: 3, bottom: 2, left: 3 }}
        colors={[color]}
        lineWidth={2}
        enableArea={showArea}
        areaOpacity={showArea ? 1 : 0}
        areaBaselineValue={0}
        defs={showArea ? gradient.defs : []}
        fill={showArea ? gradient.fill : []}
        enablePoints={false}
        enableGridX={false}
        enableGridY={false}
        axisTop={null}
        axisRight={null}
        axisBottom={null}
        axisLeft={null}
        isInteractive
        useMesh
        enableSlices={false}
        layers={['areas', 'lines', LastPointLayer, 'mesh']}
        role="img"
        theme={nivoThemeFor(surface)}
        {...motionProps}
        tooltip={({ point }) => (
          <ChartTooltipCard
            heading={point.data.xFormatted}
            surface={surface}
            rows={[{ label: metric, value: format(Number(point.data.y)), color: point.seriesColor }]}
          />
        )}
      />
    </div>
  );
}
