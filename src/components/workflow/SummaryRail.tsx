'use client';
import { ReactNode } from 'react';
import { m } from 'framer-motion';
import { GlassCard } from './GlassCard';
import { SectionHeading } from './SectionHeading';

interface RailRow {
  label: string;
  value: string | number;
  highlight?: boolean;
  strikethrough?: boolean;
  muted?: boolean;
  color?: string;
}

export interface SummaryRailProps {
  title?: string;
  eyebrow?: string;
  rows?: RailRow[];
  total?: { label: string; value: string | number } | number;
  hideTotal?: boolean;
  items?: Array<{ label: string; value: string | number; highlight?: boolean; strikethrough?: boolean; muted?: boolean; color?: string }>;
  client?: any;
  children?: ReactNode;
}

export function SummaryRail({
  title = 'Order Summary',
  eyebrow = 'OVERVIEW',
  rows,
  items,
  total,
  hideTotal = false,
  children,
}: SummaryRailProps) {
  const resolvedRows: RailRow[] = rows ?? items ?? [];

  const resolvedTotal: { label: string; value: string | number } | undefined =
    hideTotal ? undefined
    : typeof total === 'number'
      ? { label: 'Total', value: `\u20b9 ${total.toLocaleString('en-IN')}` }
      : total;

  return (
    <GlassCard className="p-5">
      <SectionHeading eyebrow={eyebrow} title={title} />
      <div className="space-y-2.5">
        {resolvedRows.map((row, i) => (
          <m.div key={i} layout className="flex items-center justify-between text-sm">
            <span className={row.muted ? 'text-slate-400 dark:text-white/40' : 'text-slate-600 dark:text-white/60'}>{row.label}</span>
            <span className={[
              'font-semibold',
              row.highlight && !row.color ? 'text-red-600' : '',
              row.strikethrough ? 'line-through text-slate-400 font-normal' : '',
              row.muted ? 'text-slate-400' : 'text-slate-900 dark:text-white',
            ].join(' ')} style={row.color ? { color: row.color } : undefined}>
              {row.value}
            </span>
          </m.div>
        ))}
      </div>

      {resolvedTotal && (
        <>
          <div className="my-4 border-t border-slate-100 dark:border-white/10" />
          <m.div layout className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700 dark:text-white/70">{resolvedTotal.label}</span>
            <m.span
              key={String(resolvedTotal.value)}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-xl font-bold text-red-600"
            >
              {resolvedTotal.value}
            </m.span>
          </m.div>
        </>
      )}

      {children && <div className="mt-4">{children}</div>}
    </GlassCard>
  );
}
