'use client';

import * as React from 'react';
import { ResponsiveRadialBar } from '@nivo/radial-bar';
import type { RadialBarCustomLayerProps, RadialBarDatum } from '@nivo/radial-bar';
import {
  ChartShell, ChartLegend, ChartLoading, ChartEmpty, ChartError, ChartTooltipCard, useChartMotion,
} from './primitives';
import { nivoThemeFor, series as seriesPalette, defaultFormat, navy } from './theme';
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
          style={{ fontFamily: 'var(--font-sans, Inter, sans-serif)', fontSize: 22, fontWeight: 800, fill: color }}
        >
          {Math.round(pct)}%
        </text>
        <text
          x={cx}
          y={cy + 16}
          textAnchor="middle"
          dominantBaseline="central"
          style={{
            fontFamily: 'var(--font-sans, Inter, sans-serif)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.06em',
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
 */
export function PremiumProgressChart({
  data,
  height = 200,
  title,
  subtitle,
  icon,
  surface = 'auto',
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
        innerRadius={rings.length > 1 ? 0.3 : 0.72}
        padding={rings.length > 1 ? 0.25 : 0}
        padAngle={0.6}
        cornerRadius={999}
        margin={{ top: 6, right: 6, bottom: 6, left: 6 }}
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
