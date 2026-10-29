'use client';

import * as React from 'react';
import {
  ResponsiveContainer,
  Tooltip,
  TooltipContentProps,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { cn } from './cn';
import { indigo, emerald, amber, red, gray } from '@/lib/palette';

// ── Theme colours ──────────────────────────────────────────────────────────
// One ramp for every chart: indigo carries the primary series, then the
// semantic families. No violet/cyan/sky — those were three more names for the
// same blue and made two blue series impossible to tell apart.
export const CHART_COLORS = {
  brand:   indigo[500],
  emerald: emerald[500],
  amber:   amber[500],
  rose:    red[500],
  sky:     indigo[300],
  violet:  indigo[700],
  slate:   gray[500],
} as const;

export type ChartColor = keyof typeof CHART_COLORS;

// ── Config context ─────────────────────────────────────────────────────────
export interface ChartConfig {
  [key: string]: {
    label: string;
    color?: string;
  };
}

interface ChartContextValue {
  config: ChartConfig;
}

const ChartContext = React.createContext<ChartContextValue>({ config: {} });

export function useChartConfig() {
  return React.useContext(ChartContext).config;
}

// ── ChartContainer ─────────────────────────────────────────────────────────
interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  config: ChartConfig;
  children: React.ReactElement;
}

export function ChartContainer({ config, children, className, ...props }: ChartContainerProps) {
  const cssVars = Object.fromEntries(
    Object.entries(config).map(([k, v]) => [`--color-${k}`, v.color ?? CHART_COLORS.brand]),
  );

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        className={cn('flex aspect-video justify-center text-xs', className)}
        style={cssVars as React.CSSProperties}
        {...props}
      >
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

// ── ChartTooltipContent ────────────────────────────────────────────────────
interface ChartTooltipContentProps extends TooltipContentProps<number, string> {
  hideLabel?: boolean;
  hideIndicator?: boolean;
  indicator?: 'line' | 'dot' | 'dashed';
  nameKey?: string;
  labelKey?: string;
}

export const ChartTooltipContent = React.forwardRef<HTMLDivElement, ChartTooltipContentProps>(
  function ChartTooltipContent(
    { active, payload, label, hideLabel, hideIndicator, indicator = 'dot', nameKey, labelKey },
    ref,
  ) {
    const config = useChartConfig();

    if (!active || !payload?.length) return null;

    return (
      <div
        ref={ref}
        className="rounded-xl border border-[var(--border,rgba(0,0,0,0.08))] bg-[var(--bg-card,white)]/95 px-3 py-2 shadow-xl backdrop-blur-xl text-xs"
      >
        {!hideLabel && label && (
          <p className="mb-1.5 font-medium text-[var(--text-muted,#94a3b8)]">
            {labelKey ? (payload[0]?.payload?.[labelKey] ?? label) : label}
          </p>
        )}
        <div className="flex flex-col gap-1">
          {payload.map((entry) => {
            const key = nameKey ?? entry.name ?? entry.dataKey ?? '';
            const cfg = config[String(key)];
            const color = entry.color ?? cfg?.color ?? CHART_COLORS.brand;
            const name = cfg?.label ?? entry.name ?? key;

            return (
              <div key={String(key)} className="flex items-center gap-2">
                {!hideIndicator && (
                  indicator === 'dot' ? (
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
                  ) : indicator === 'line' ? (
                    <span className="h-0.5 w-4 shrink-0 rounded-full" style={{ background: color }} />
                  ) : (
                    <span className="h-2.5 w-0.5 shrink-0 rounded-full" style={{ background: color }} />
                  )
                )}
                <span className="text-[var(--text-muted,#94a3b8)]">{name}</span>
                <span className="ml-auto pl-4 font-semibold tabular-nums text-[var(--text-primary,#0F172A)]">
                  {typeof entry.value === 'number'
                    ? entry.value.toLocaleString()
                    : entry.value}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  },
);

// ── ChartLegendContent ─────────────────────────────────────────────────────
interface ChartLegendContentProps extends React.HTMLAttributes<HTMLDivElement> {
  payload?: Array<{ value: string; color?: string }>;
  nameKey?: string;
}

export function ChartLegendContent({ payload, nameKey, className }: ChartLegendContentProps) {
  const config = useChartConfig();
  if (!payload?.length) return null;

  return (
    <div className={cn('flex flex-wrap items-center justify-center gap-4 pt-2', className)}>
      {payload.map((entry) => {
        const key = nameKey ?? entry.value;
        const cfg = config[key];
        const color = entry.color ?? cfg?.color ?? CHART_COLORS.brand;
        const label = cfg?.label ?? entry.value;

        return (
          <div key={key} className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted,#94a3b8)]">
            <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: color }} />
            {label}
          </div>
        );
      })}
    </div>
  );
}

// ── Re-export Tooltip + Legend for convenience ─────────────────────────────
export { Tooltip as ChartTooltip } from 'recharts';
export { Legend as ChartLegend } from 'recharts';

// ══════════════════════════════════════════════════════════════════════════
// PREMIUM CHART COMPONENTS
// Self-contained Recharts wrappers with consistent design-system styling.
// ══════════════════════════════════════════════════════════════════════════

const TICK_STYLE = {
  fontSize: 10,
  fontWeight: 600 as const,
  fill: 'var(--text-muted)',
};

function PremiumTooltipBox({ active, payload, label, formatValue }: {
  active?: boolean;
  payload?: ReadonlyArray<{ name?: string; value?: number; color?: string }>;
  label?: string | number;
  formatValue?: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-[var(--border,rgba(0,0,0,0.08))] bg-[var(--bg-card,#fff)]/95 px-3 py-2.5 shadow-xl backdrop-blur-xl text-xs">
      {label && (
        <p className="mb-1.5 font-semibold text-[var(--text-muted,#94a3b8)]">{label}</p>
      )}
      <div className="space-y-1">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: entry.color ?? CHART_COLORS.brand }} />
            {entry.name && <span className="text-[var(--text-muted,#94a3b8)]">{entry.name}</span>}
            <span className="ml-auto pl-4 font-bold tabular-nums text-[var(--text-primary,#0F172A)]">
              {typeof entry.value === 'number'
                ? (formatValue ? formatValue(entry.value) : entry.value.toLocaleString())
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── PremiumBarChart ────────────────────────────────────────────────────────

export interface PremiumBarEntry {
  /** Data field key */
  key: string;
  /** Series name shown in tooltip */
  label: string;
  /** CSS color, e.g. "var(--action)" */
  color?: string;
}

export interface PremiumBarChartProps {
  data: Record<string, unknown>[];
  /** Field used for X-axis labels */
  xKey: string;
  bars: PremiumBarEntry[];
  height?: number;
  className?: string;
  /** Format numbers shown in tooltips and Y-axis ticks */
  formatValue?: (v: number) => string;
}

export function PremiumBarChart({
  data,
  xKey,
  bars,
  height = 200,
  className,
  formatValue,
}: PremiumBarChartProps) {
  const uid = React.useId().replace(/:/g, 'x');

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barGap={3}>
          <defs>
            {bars.map((b, i) => {
              const c = b.color ?? CHART_COLORS.brand;
              return (
                <linearGradient key={i} id={`${uid}b${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={c} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={c} stopOpacity={0.45} />
                </linearGradient>
              );
            })}
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey={xKey}
            tickLine={false}
            axisLine={false}
            tick={TICK_STYLE}
            dy={6}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={TICK_STYLE}
            tickFormatter={(v: number) =>
              formatValue ? formatValue(v) : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)
            }
            width={44}
          />
          <Tooltip
            cursor={{ fill: 'var(--bg-subtle)' }}
            content={(props: TooltipContentProps) => (
              <PremiumTooltipBox
                active={props.active}
                payload={props.payload as ReadonlyArray<{ name?: string; value?: number; color?: string }>}
                label={props.label}
                formatValue={formatValue}
              />
            )}
          />
          {bars.map((b, i) => (
            <Bar
              key={b.key}
              dataKey={b.key}
              name={b.label}
              fill={`url(#${uid}b${i})`}
              radius={[5, 5, 0, 0]}
              maxBarSize={36}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── PremiumAreaChart ───────────────────────────────────────────────────────

export interface PremiumAreaEntry {
  key: string;
  label: string;
  color?: string;
}

export interface PremiumAreaChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  areas: PremiumAreaEntry[];
  height?: number;
  className?: string;
  formatValue?: (v: number) => string;
  /** Bottom of the y axis. `'auto'` pads the range instead of anchoring at 0. */
  yMin?: number | 'auto';
}

/** Y domain for the area chart. Exported so the padding can be tested. */
export function areaYDomain(
  data: Record<string, unknown>[],
  areas: PremiumAreaEntry[],
  yMin?: number | 'auto',
): [number | 'auto', number | 'auto'] {
  if (yMin === undefined) return [0, 'auto'];
  if (typeof yMin === 'number') return [yMin, 'auto'];
  const values = data.flatMap((row) => areas
    .map((a) => Number(row[a.key]))
    .filter((v) => Number.isFinite(v)));
  if (!values.length) return [0, 'auto'];
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = (hi - lo || Math.abs(hi) * 0.1 || 1) * 0.15;
  return [lo - pad, hi + pad];
}

export function PremiumAreaChart({
  data,
  xKey,
  areas,
  height = 200,
  className,
  formatValue,
  yMin,
}: PremiumAreaChartProps) {
  const uid = React.useId().replace(/:/g, 'x');

  const yDomain = React.useMemo(() => areaYDomain(data, areas, yMin), [data, areas, yMin]);

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
          <defs>
            {areas.map((a, i) => {
              const c = a.color ?? CHART_COLORS.brand;
              return (
                <linearGradient key={i} id={`${uid}a${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={c} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={c} stopOpacity={0.02} />
                </linearGradient>
              );
            })}
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey={xKey}
            tickLine={false}
            axisLine={false}
            tick={TICK_STYLE}
            dy={6}
          />
          <YAxis
            domain={yDomain}
            tickLine={false}
            axisLine={false}
            tick={TICK_STYLE}
            tickFormatter={(v: number) =>
              formatValue ? formatValue(v) : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)
            }
            width={44}
          />
          <Tooltip
            cursor={{ stroke: 'var(--border)', strokeWidth: 1 }}
            content={(props: TooltipContentProps) => (
              <PremiumTooltipBox
                active={props.active}
                payload={props.payload as ReadonlyArray<{ name?: string; value?: number; color?: string }>}
                label={props.label}
                formatValue={formatValue}
              />
            )}
          />
          {areas.map((a, i) => {
            const c = a.color ?? CHART_COLORS.brand;
            return (
              <Area
                key={a.key}
                type="monotone"
                dataKey={a.key}
                name={a.label}
                stroke={c}
                strokeWidth={2.5}
                fill={`url(#${uid}a${i})`}
                dot={false}
                activeDot={{ r: 4, fill: c, strokeWidth: 0 }}
              />
            );
          })}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
