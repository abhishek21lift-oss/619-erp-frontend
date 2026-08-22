'use client';

import * as React from 'react';
import { ResponsivePie } from '@nivo/pie';
import type { PieCustomLayerProps } from '@nivo/pie';
import { nivoThemeFor, series as seriesPalette, defaultFormat, navy } from '../theme';
import { ChartTooltipCard } from './ChartTooltip';
import { useChartMotion } from './useChartMotion';
import type { Surface } from '../theme/surface';

export interface PieDatum {
  name: string;
  value: number;
  color?: string;
}

type NivoPieDatum = { id: string; label: string; value: number; color: string };

export interface PieBaseProps {
  data: PieDatum[];
  innerRadius: number;
  centerValue?: React.ReactNode;
  centerLabel?: string;
  formatValue?: (v: number) => string;
  surface?: Surface;
}

function CenterLabelLayer(centerValue: React.ReactNode, centerLabel: string | undefined, surface: Surface) {
  return function Layer({ centerX, centerY }: PieCustomLayerProps<NivoPieDatum>) {
    const dark = surface === 'dark';
    return (
      <g style={{ pointerEvents: 'none' }}>
        <text
          x={centerX}
          y={centerY - (centerLabel ? 8 : 0)}
          textAnchor="middle"
          dominantBaseline="central"
          style={{
            fontFamily: 'var(--font-sans, Inter, sans-serif)',
            fontSize: 22,
            fontWeight: 700,
            fill: dark ? navy.ink : 'var(--text-primary, #0f172a)',
          }}
        >
          {centerValue}
        </text>
        {centerLabel && (
          <text
            x={centerX}
            y={centerY + 16}
            textAnchor="middle"
            dominantBaseline="central"
            style={{
              fontFamily: 'var(--font-sans, Inter, sans-serif)',
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              fill: dark ? navy.muted : 'var(--text-muted, #64748b)',
            }}
          >
            {centerLabel}
          </text>
        )}
      </g>
    );
  };
}

/**
 * Shared render internals for PremiumDonutChart and PremiumPieChart — the
 * only difference between the two is `innerRadius` and whether a centre
 * label layer is added, so this is where <ResponsivePie> lives, once.
 */
export function PieBase({
  data,
  innerRadius,
  centerValue,
  centerLabel,
  formatValue = defaultFormat,
  surface = 'auto',
}: PieBaseProps) {
  const motionProps = useChartMotion();

  const nivoData: NivoPieDatum[] = React.useMemo(
    () => data.map((d, i) => ({
      id: d.name,
      label: d.name,
      value: d.value,
      color: d.color ?? seriesPalette[i % seriesPalette.length],
    })),
    [data],
  );
  const total = React.useMemo(() => data.reduce((sum, d) => sum + d.value, 0), [data]);

  const layers = React.useMemo(() => {
    const base: ('arcs' | 'arcLabels' | ((p: PieCustomLayerProps<NivoPieDatum>) => React.ReactNode))[] = ['arcs'];
    if (innerRadius > 0 && centerValue !== undefined) {
      base.push(CenterLabelLayer(centerValue, centerLabel, surface));
    }
    return base;
  }, [innerRadius, centerValue, centerLabel, surface]);

  return (
    <ResponsivePie
      data={nivoData}
      innerRadius={innerRadius}
      padAngle={data.length > 1 ? 1.6 : 0}
      cornerRadius={3}
      activeOuterRadiusOffset={4}
      colors={{ datum: 'data.color' }}
      borderWidth={2}
      borderColor={surface === 'dark' ? navy.panel : 'var(--bg-elevated, #fff)'}
      margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
      enableArcLabels={false}
      enableArcLinkLabels={false}
      isInteractive
      role="img"
      theme={nivoThemeFor(surface)}
      {...motionProps}
      layers={layers}
      tooltip={({ datum }) => (
        <ChartTooltipCard
          rows={[{
            label: String(datum.label),
            value: `${formatValue(datum.value)} (${total > 0 ? ((datum.value / total) * 100).toFixed(1) : '0'}%)`,
            color: datum.color,
          }]}
          surface={surface}
        />
      )}
    />
  );
}
