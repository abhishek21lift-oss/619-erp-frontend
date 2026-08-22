'use client';

// Six months of one KPI, as a chart.
//
// ── Why this is its own file ──────────────────────────────────────────────
//
// recharts is the charting library this app already uses, and it is roughly a
// hundred kilobytes. The dashboard is the home screen — the single most
// loaded authenticated route in the product — and it did not import recharts
// at all. Pulling it into that bundle so four 32px sparklines can render
// would make every trainer wait on a chart library before seeing their day.
//
// So it lives here and the dashboard loads it with next/dynamic: first paint
// costs nothing, the bars arrive a moment later into a box that is already
// the right size, so nothing on the screen moves when they do.
//
// ── The marks ─────────────────────────────────────────────────────────────
//
// Bars, not a line. Six points is too few for a line to describe a shape, and
// a bar anchored to the baseline reads as a magnitude — which is what a month
// of revenue is.
//
// No axes, no grid, no legend: at 32px tall there is no room for a scale, and
// a single series is named by the tile it sits in. The last month is solid
// and the earlier ones are a tint of the same hue, so the eye lands on now.

import {
  Bar, BarChart, Cell, ResponsiveContainer, Tooltip, YAxis,
} from 'recharts';

export interface KpiSparklineProps {
  /** Oldest first. */
  data: { label: string; value: number }[];
  /** The tile's hue. The last bar wears it; earlier months take a tint. */
  color: string;
  /** Names the series for screen readers and for the tooltip. */
  metric: string;
  /** Rendered into the tooltip, e.g. ₹90,000. */
  format?: (n: number) => string;
  height?: number;
}

export default function KpiSparkline({
  data, color, metric, format = (n) => String(Math.round(n)), height = 32,
}: KpiSparklineProps) {
  if (data.length === 0) return null;

  return (
    <div
      style={{ height }}
      // The chart is one image as far as assistive tech is concerned, and the
      // label carries the numbers — a bar chart nobody can read is a decoration.
      role="img"
      aria-label={`${metric}, last ${data.length} months: ${data.map((d) => Math.round(d.value)).join(', ')}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }} barCategoryGap={3}>
          {/* Hidden, but present: without a domain floor at zero a flat six
              months of the same number renders as six full-height bars, which
              reads as growth. */}
          <YAxis hide domain={[0, 'dataMax']} />
          <Tooltip
            cursor={false}
            // No inline `outline: 'none'` on the wrapper, which is the usual
            // recharts recipe: the app's focus-visible guard rejects it, and
            // it is right to — an inline outline:none beats the :focus-visible
            // rule for good, and this wrapper is not focusable anyway.
            contentStyle={{
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--bg-elevated)',
              padding: '6px 9px',
              fontSize: 11,
              fontWeight: 650,
              boxShadow: '0 8px 24px rgba(15,23,42,0.14)',
            }}
            labelStyle={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 700 }}
            itemStyle={{ color: 'var(--text-primary)' }}
            formatter={(v: number) => [format(v), metric]}
            labelFormatter={(l: string) => l}
          />
          <Bar dataKey="value" radius={[3, 3, 0, 0]} isAnimationActive={false} minPointSize={3}>
            {data.map((d, i) => (
              <Cell key={d.label} fill={i === data.length - 1 ? color : `${color}2e`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
