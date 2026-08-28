'use client';

import * as React from 'react';
import { ResponsivePie } from '@nivo/pie';
import type { PieCustomLayerProps } from '@nivo/pie';
import { navy, series as seriesPalette } from '../theme/colors';
import { fontFamily, fontSize, fontWeight, letterSpacing } from '../theme/typography';
import { radius, border } from '../theme/shape';
import { pieLayout, chartMargin } from '../theme/spacing';
import { useIsCompactChart, scaleMargin } from '../theme/responsive';
import { nivoThemeFor } from '../theme/nivoTheme';
import { defaultFormat } from '../theme/format';
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
            fontFamily: fontFamily.sans,
            fontSize: fontSize.valueLg,
            fontWeight: fontWeight.bold,
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
              fontFamily: fontFamily.sans,
              fontSize: fontSize.xs,
              fontWeight: fontWeight.bold,
              letterSpacing: letterSpacing.label,
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
 * label layer is added, so this is where <ResponsivePie> lives, once. Every
 * layout constant below is a theme token (shape.ts / spacing.ts), not a
 * number chosen for this component alone.
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
  const compact = useIsCompactChart();

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
      padAngle={data.length > 1 ? pieLayout.padAngleMulti : pieLayout.padAngleSingle}
      cornerRadius={radius.pieCorner}
      activeOuterRadiusOffset={pieLayout.activeOuterRadiusOffset}
      colors={{ datum: 'data.color' }}
      borderWidth={border.pieSliceWidth}
      borderColor={surface === 'dark' ? navy.panel : 'var(--bg-elevated, #fff)'}
      margin={scaleMargin(chartMargin.pie, compact)}
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
