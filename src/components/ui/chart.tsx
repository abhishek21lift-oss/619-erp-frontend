'use client';

import * as React from 'react';
import {
  ResponsiveContainer,
  Tooltip,
  TooltipContentProps,
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
