'use client';
import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from './GlassCard';
import { SectionHeading } from './SectionHeading';

interface RailRow {
  label: string;
  value: string | number;
  highlight?: boolean;
  strikethrough?: boolean;
  muted?: boolean;
}

interface SummaryRailProps {
  title?: string;
  eyebrow?: string;
  rows: RailRow[];
  total?: { label: string; value: string | number };
  children?: ReactNode;
}

export function SummaryRail({ title = 'Order Summary', eyebrow = 'OVERVIEW', rows, total, children }: SummaryRailProps) {
  return (
    <GlassCard className="p-5">
      <SectionHeading eyebrow={eyebrow} title={title} />
      <div className="space-y-2.5">
        {rows.map((row, i) => (
          <motion.div
            key={i}
            layout
            className="flex items-center justify-between text-sm"
          >
            <span className={row.muted ? 'text-slate-400' : 'text-slate-600'}>{row.label}</span>
            <span
              className={[
                'font-semibold',
                row.highlight ? 'text-indigo-600' : '',
                row.strikethrough ? 'line-through text-slate-400 font-normal' : '',
                row.muted ? 'text-slate-400' : 'text-slate-900',
              ].join(' ')}
            >
              {row.value}
            </span>
          </motion.div>
        ))}
      </div>

      {total && (
        <>
          <div className="my-4 border-t border-slate-100" />
          <motion.div layout className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">{total.label}</span>
            <motion.span
              key={String(total.value)}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-xl font-bold text-indigo-600"
            >
              {total.value}
            </motion.span>
          </motion.div>
        </>
      )}

      {children && <div className="mt-4">{children}</div>}
    </GlassCard>
  );
}
