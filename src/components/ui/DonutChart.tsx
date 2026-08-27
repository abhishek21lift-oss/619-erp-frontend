// frontend/src/components/ui/DonutChart.tsx
//
// Reusable, responsive donut chart powered by Recharts. Used everywhere we
// want a quick "share of total" read — membership mix, revenue split,
// conversion funnel, payment methods, etc.
//
// Design choices:
//   - One clear total in the middle (because that's what the eye looks for).
//   - Soft, distinct accents — no full saturation.
//   - Legend wraps under the chart on mobile, sits to the right on desktop.
//   - Tooltips show absolute value AND percent.
//   - Empty state baked in: zero-sum data renders a friendly placeholder
//     instead of an unreadable empty ring.

'use client';

import * as React from 'react';
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { series } from '@/lib/palette';
import { cn } from './cn';

export interface DonutDatum {
  /** Display label, also serves as the legend entry. */
  name: string;
  /** Absolute value. Negative values are clamped to 0. */
  value: number;
  /** Optional override color. Falls back to the palette below. */
  color?: string;
}

export interface DonutChartProps {
  data: DonutDatum[];
  /** Total shown in the middle. If omitted, it sums `data`. */
  centerValue?: React.ReactNode;
  /** Caption under the center number, e.g. "Active members". */
  centerLabel?: string;
  /** A user-friendly formatter for tooltip values, e.g. (n) => `₹${n}`. */
  valueFormatter?: (value: number) => string;
  /** When true, renders a slim ring; when false, a thicker donut. */
  thin?: boolean;
  /** Force a specific height. Defaults to 240px and grows on desktop. */
  height?: number;
  /** Extra classes for the wrapping div. */
  className?: string;
  /** Hide the legend entirely. */
  hideLegend?: boolean;
}

/**
 * Slice colours, in order.
 *
 * This used to be a local list of eight entries whose comments named eight
 * hues — "cyan", "purple", "teal", "indigo" — while five of them held the
 * identical brand blue. A donut with five or more slices drew four slices the
 * eye could not tell apart, and the legend then named four things that looked
 * the same. The comments were the only place those hues ever existed.
 *
 * It now reads the app's own categorical ramp, which exists for exactly this
 * ("where a chart is genuinely categorical rather than semantic") and is held
 * distinct by a test. Six colours instead of eight, all of them different,
 * which is six more usable slices than before.
 */
const PALETTE = series;

export function DonutChart({
  data,
  centerValue,
  centerLabel,
  valueFormatter,
  thin = false,
  height = 240,
  className,
  hideLegend = false,
}: DonutChartProps) {
  // Clamp negative / non-finite to 0; Recharts handles 0-rows but they look weird.
  const cleaned = React.useMemo(
    () =>
      data
        .map((d) => ({ ...d, value: Number.isFinite(d.value) && d.value > 0 ? d.value : 0 }))
        .filter((d) => d.value > 0),
    [data],
  );

  const total = React.useMemo(
    () => cleaned.reduce((sum, d) => sum + d.value, 0),
    [cleaned],
  );

  const fmt = valueFormatter ?? ((v: number) => v.toLocaleString());

  // Empty state — keep the layout stable for the parent.
  if (cleaned.length === 0 || total === 0) {
    return (
      <div
        role="img"
        aria-label="No data to display"
        className={cn(
          'grid place-items-center rounded-xl bg-slate-50 text-xs text-slate-400 dark:bg-white/5 dark:text-white/40',
          className,
        )}
        style={{ minHeight: height }}
      >
        No data yet
      </div>
    );
  }

  return (
    <div className={cn('relative w-full', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={cleaned}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={thin ? '70%' : '60%'}
            outerRadius="90%"
            paddingAngle={cleaned.length > 1 ? 2 : 0}
            // The separator ring must be the SURFACE colour, not literal white:
            // hardcoded #fff is invisible on a light card but draws a glaring
            // white outline around every segment in dark mode. --bg-elevated is
            // the solid surface token (#FFFFFF light / #1E293B dark).
            stroke="var(--bg-elevated)"
            strokeWidth={2}
            isAnimationActive={false}
          >
            {cleaned.map((d, idx) => (
              <Cell
                key={d.name}
                fill={d.color ?? PALETTE[idx % PALETTE.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
              fontSize: 12,
            }}
            formatter={(value: number, name: string) => [
              `${fmt(value)} (${((value / total) * 100).toFixed(1)}%)`,
              name,
            ]}
          />
          {!hideLegend && (
            <Legend
              verticalAlign="bottom"
              align="center"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              // Recharts tints legend text with the series colour by default.
              // Identity is already carried by the coloured icon beside it, and
              // series-coloured text fails contrast at small sizes, so the label
              // wears a text token instead.
              formatter={(value: string) => (
                <span style={{ color: 'var(--text-secondary)' }}>{value}</span>
              )}
            />
          )}
        </PieChart>
      </ResponsiveContainer>

      {/* Center label — overlay so it survives ResponsiveContainer reflows. */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
           style={{ paddingBottom: hideLegend ? 0 : 28 }}>
        <span className="text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">
          {centerValue ?? fmt(total)}
        </span>
        {centerLabel && (
          <span className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-white/50">
            {centerLabel}
          </span>
        )}
      </div>
    </div>
  );
}
