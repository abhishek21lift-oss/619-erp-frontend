'use client';

import * as React from 'react';
import { ResponsiveRadialBar } from '@nivo/radial-bar';
import type { RadialBarCustomLayerProps, RadialBarDatum } from '@nivo/radial-bar';
import {
  ChartShell, ChartLegend, ChartLoading, ChartEmpty, ChartError, ChartTooltipCard, useChartMotion,
} from './primitives';
import { navy, series as seriesPalette } from './theme/colors';
import { fontFamily, fontSize, fontWeight, letterSpacing } from './theme/typography';
import { radius } from './theme/shape';
import { chartHeight, chartMargin, radialLayout } from './theme/spacing';
import { useIsCompactChart, scaleMargin } from './theme/responsive';
import { nivoThemeFor } from './theme/nivoTheme';
import { defaultFormat } from './theme/format';
import type { Surface } from './theme/surface';

export interface PremiumProgressDatum {
  /** Ring label — the tile it belongs to. */
  id: string;
  value: number;
  /** Ceiling the ring is measured against. Defaults to 100 (a percentage). */
  max?: number;
  color?: string;
}

export interface PremiumProgressChartProps {
  /** One entry = one concentric ring, outermost first. */
  data: PremiumProgressDatum[];
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
  formatValue?: (v: number) => string;
  showLegend?: boolean;
  ariaLabel?: string;
  className?: string;
}

function centerLabelLayer(pct: number, label: string, color: string, surface: Surface) {
  return function Layer({ center }: RadialBarCustomLayerProps) {
    const dark = surface === 'dark';
    const [cx, cy] = center;
    return (
      <g style={{ pointerEvents: 'none' }}>
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          dominantBaseline="central"
          style={{ fontFamily: fontFamily.sans, fontSize: fontSize.valueLg, fontWeight: fontWeight.black, fill: color }}
        >
          {Math.round(pct)}%
        </text>
        <text
          x={cx}
          y={cy + 16}
          textAnchor="middle"
          dominantBaseline="central"
          style={{
            fontFamily: fontFamily.sans,
            fontSize: fontSize.xs,
            fontWeight: fontWeight.bold,
            letterSpacing: letterSpacing.label,
            textTransform: 'uppercase',
            fill: dark ? navy.muted : 'var(--text-muted, #64748b)',
          }}
        >
          {label}
        </text>
      </g>
    );
  };
}

/**
 * The system's progress ring(s) — a ratio against a ceiling: monthly target,
 * assessment score, trial conversion. Replaces the three near-identical
 * hand-rolled SVG rings the chart audit found (platform/charts.tsx's Ring,
 * PtOsDashboard's HealthRing and TargetRing) with one component that also
 * supports several rings at once, concentric, for a multi-metric readout.
 * Every layout constant below is a theme token (spacing.ts), not a number
 * chosen for this component alone.
 */
export function PremiumProgressChart({
  data,
  height = chartHeight.progress,
  title,
  subtitle,
  icon,
  surface = 'auto',
  bordered = true,
  loading = false,
  error = null,
  onRetry,
  emptyTitle = 'Nothing to measure yet',
  emptyDescription,
  formatValue = defaultFormat,
  showLegend,
  ariaLabel,
  className,
}: PremiumProgressChartProps) {
  const motionProps = useChartMotion();
  const compact = useIsCompactChart();

  const rings = React.useMemo(
    () => data.map((d, i) => {
      const max = d.max ?? 100;
      const pct = max > 0 ? Math.max(0, Math.min(100, (d.value / max) * 100)) : 0;
      return { ...d, max, pct, color: d.color ?? seriesPalette[i % seriesPalette.length] };
    }),
    [data],
  );
  const hasData = rings.length > 0;
  const single = rings.length === 1 ? rings[0] : null;

  const nivoData = React.useMemo(
    () => rings.map((r) => ({ id: r.id, data: [{ x: r.id, y: r.pct } as RadialBarDatum] })),
    [rings],
  );

  const legendItems = rings.map((r) => ({ label: r.id, color: r.color }));
  const resolvedShowLegend = showLegend ?? rings.length > 1;

  const shellProps = {
    title,
    subtitle,
    icon,
    surface,
    bordered,
    height,
    className,
    ariaLabel: ariaLabel ?? rings.map((r) => `${r.id}: ${Math.round(r.pct)}%`).join(', '),
    action: resolvedShowLegend && !loading && !error && hasData
      ? <ChartLegend items={legendItems} surface={surface} />
      : undefined,
  };

  if (loading) return <ChartShell {...shellProps}><ChartLoading height={height} /></ChartShell>;
  if (error) return <ChartShell {...shellProps}><ChartError height={height} message={error} onRetry={onRetry} /></ChartShell>;
  if (!hasData) return <ChartShell {...shellProps}><ChartEmpty height={height} title={emptyTitle} description={emptyDescription} /></ChartShell>;

  return (
    <ChartShell {...shellProps}>
      <ResponsiveRadialBar
        data={nivoData}
        valueFormat=">-.0f"
        maxValue={100}
        startAngle={0}
        endAngle={360}
        innerRadius={rings.length > 1 ? radialLayout.innerRadiusMulti : radialLayout.innerRadiusSingle}
        padding={rings.length > 1 ? radialLayout.paddingMulti : radialLayout.paddingSingle}
        padAngle={radialLayout.padAngle}
        cornerRadius={radius.progressCap}
        margin={scaleMargin(chartMargin.radial, compact)}
        colors={(d) => rings.find((r) => r.id === d.id)?.color ?? seriesPalette[0]}
        enableTracks
        tracksColor={surface === 'dark' ? 'rgba(255,255,255,0.06)' : 'var(--bg-subtle, #f1f5f9)'}
        enableRadialGrid={false}
        enableCircularGrid={false}
        radialAxisStart={null}
        radialAxisEnd={null}
        circularAxisInner={null}
        circularAxisOuter={null}
        enableLabels={false}
        isInteractive
        role="img"
        theme={nivoThemeFor(surface)}
        {...motionProps}
        layers={single
          ? ['tracks', 'bars', centerLabelLayer(single.pct, single.id, single.color, surface)]
          : ['tracks', 'bars']}
        tooltip={({ bar }) => {
          const ring = rings.find((r) => r.id === bar.id);
          return (
            <ChartTooltipCard
              rows={[{
                label: bar.id,
                value: ring ? `${formatValue(ring.value)} / ${formatValue(ring.max)}` : formatValue(bar.value),
                color: bar.color,
              }]}
              surface={surface}
            />
          );
        }}
      />
    </ChartShell>
  );
}
