'use client';

import * as React from 'react';
import { ResponsiveBar } from '@nivo/bar';
import type { BarDatum } from '@nivo/bar';
import { ChartShell, ChartLegend, ChartLoading, ChartEmpty, ChartError, ChartTooltipCard, useChartMotion } from './primitives';
import { series as seriesPalette } from './theme/colors';
import { radius } from './theme/shape';
import { chartHeight, chartMargin, barPadding } from './theme/spacing';
import { axis } from './theme/chartStyle';
import { useIsCompactChart, scaleMargin } from './theme/responsive';
import { nivoThemeFor } from './theme/nivoTheme';
import { defaultFormat } from './theme/format';
import { buildGradientFill } from './theme/gradients';
import type { Surface } from './theme/surface';

export interface PremiumBarSeries {
  /** Field in each data row this series reads. */
  key: string;
  /** Series name — shown in the tooltip and legend. */
  label: string;
  color?: string;
  /**
   * Field in each data row holding that row's own colour for this series —
   * e.g. a week that hit its target vs one that fell short. Overrides `color`
   * for that one bar; every row without it still falls back to `color`. The
   * legend still shows the series' single `color`, since a legend swatch
   * cannot represent a per-row condition — the chart's own bars are where
   * that signal reads.
   */
  colorKey?: string;
}

export interface PremiumBarChartProps {
  data: Record<string, unknown>[];
  /** Field used for the category axis. */
  xKey: string;
  bars: PremiumBarSeries[];
  height?: number;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  surface?: Surface;
  /** Renders ChartShell's own card frame. Set false when embedding this chart inside a card that already has one. */
  bordered?: boolean;
  layout?: 'vertical' | 'horizontal';
  /** 'grouped' (default) sits series side by side; 'stacked' sums them. */
  groupMode?: 'grouped' | 'stacked';
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  /** Formats values in the tooltip and the value axis. */
  formatValue?: (v: number) => string;
  showLegend?: boolean;
  ariaLabel?: string;
  className?: string;
}

/**
 * The system's bar chart — revenue by month, check-ins by day, sessions by
 * trainer. One or many series, grouped or stacked, zero-anchored always.
 * Every layout constant below is a theme token (shape.ts / spacing.ts /
 * chartStyle.ts), not a number chosen for this component alone.
 */
export function PremiumBarChart({
  data,
  xKey,
  bars,
  height = chartHeight.bar,
  title,
  subtitle,
  icon,
  surface = 'auto',
  bordered = true,
  layout = 'vertical',
  groupMode = 'grouped',
  loading = false,
  error = null,
  onRetry,
  emptyTitle = 'No data for this period',
  emptyDescription,
  formatValue = defaultFormat,
  showLegend,
  ariaLabel,
  className,
}: PremiumBarChartProps) {
  const motionProps = useChartMotion();
  const compact = useIsCompactChart();

  const colorByKey = React.useMemo(() => {
    const map: Record<string, string> = {};
    bars.forEach((b, i) => { map[b.key] = b.color ?? seriesPalette[i % seriesPalette.length]; });
    return map;
  }, [bars]);

  // A finite value, not a positive one — an all-zero series (zero jobs
  // waiting, zero failed) is real, measured data and must render as a
  // zero-anchored chart, not the empty state. Only the absence of any
  // numeric value at all (undefined/null/NaN everywhere) means "no data."
  const hasData = data.length > 0 && bars.some((b) => data.some((row) => Number.isFinite(Number(row[b.key]))));
  const legendItems = bars.map((b) => ({ label: b.label, color: colorByKey[b.key] }));
  const resolvedShowLegend = showLegend ?? bars.length > 1;

  // A series with a `colorKey` picks its colour per row, which a single
  // gradient-per-series cannot express — nivo's `fill` pattern matches by
  // series id, so every bar in that series would share one gradient
  // regardless of the row it belongs to. Excluded from the gradient fill
  // here so those bars fall through to the flat, per-row `colors` result
  // below instead of a gradient that would silently outrank it.
  const gradient = React.useMemo(
    () => buildGradientFill(bars.filter((b) => !b.colorKey).map((b) => ({ id: b.key, color: colorByKey[b.key] }))),
    [bars, colorByKey],
  );

  const shellProps = {
    title,
    subtitle,
    icon,
    surface,
    bordered,
    height,
    className,
    ariaLabel: ariaLabel ?? `${title ? `${title}: ` : ''}bar chart with ${bars.length} series across ${data.length} categories`,
    action: resolvedShowLegend && !loading && !error && hasData
      ? <ChartLegend items={legendItems} surface={surface} />
      : undefined,
  };

  if (loading) return <ChartShell {...shellProps}><ChartLoading height={height} /></ChartShell>;
  if (error) return <ChartShell {...shellProps}><ChartError height={height} message={error} onRetry={onRetry} /></ChartShell>;
  if (!hasData) return <ChartShell {...shellProps}><ChartEmpty height={height} title={emptyTitle} description={emptyDescription} /></ChartShell>;

  return (
    <ChartShell {...shellProps}>
      <ResponsiveBar
        data={data as unknown as BarDatum[]}
        keys={bars.map((b) => b.key)}
        indexBy={xKey}
        layout={layout}
        groupMode={groupMode}
        margin={scaleMargin(chartMargin.bar, compact)}
        padding={bars.length > 1 ? barPadding.multiSeries : barPadding.singleSeries}
        innerPadding={bars.length > 1 ? barPadding.innerPadding : 0}
        borderRadius={radius.bar}
        colors={(d) => {
          const series = bars.find((b) => b.key === String(d.id));
          const rowColor = series?.colorKey ? (d.data as Record<string, unknown>)[series.colorKey] : undefined;
          return (typeof rowColor === 'string' ? rowColor : undefined) ?? colorByKey[String(d.id)] ?? seriesPalette[0];
        }}
        defs={gradient.defs}
        fill={gradient.fill}
        enableGridX={layout === 'horizontal'}
        enableGridY={layout === 'vertical'}
        axisTop={null}
        axisRight={null}
        axisBottom={{ tickSize: axis.tickSize, tickPadding: axis.tickPaddingX }}
        axisLeft={layout === 'vertical' ? { tickSize: axis.tickSize, tickPadding: axis.tickPaddingY, format: (v) => formatValue(Number(v)) } : null}
        enableLabel={false}
        role="img"
        isFocusable
        theme={nivoThemeFor(surface)}
        {...motionProps}
        tooltip={({ label, value, color, indexValue }) => (
          <ChartTooltipCard
            heading={String(indexValue)}
            rows={[{ label, value: formatValue(value), color }]}
            surface={surface}
          />
        )}
      />
    </ChartShell>
  );
}
