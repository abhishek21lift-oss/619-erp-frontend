'use client';

import * as React from 'react';
import { m } from 'framer-motion';
import { cn } from './cn';

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  trend?: number;
  className?: string;
}

export function StatCard({ label, value, icon, trend, className }: StatCardProps) {
  const positive = typeof trend === 'number' && trend >= 0;
  return (
    <m.div
      whileHover={{ y: -3, scale: 1.01, transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] } }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'rounded-[18px] bg-[var(--bg-card)] border border-[var(--border)] p-4',
        'shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)]',
        'transition-shadow duration-200',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
          {label}
        </p>
        {icon && (
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[var(--bg-subtle)] text-[var(--text-muted)]">
            {icon}
          </span>
        )}
      </div>
      <p className="mt-2 text-[22px] font-bold tracking-[-0.02em] text-[var(--text-primary)]">
        {value}
      </p>
      {typeof trend === 'number' && (
        <p className={cn(
          'mt-1 text-[12px] font-semibold',
          trend === 0 ? 'text-[var(--text-muted)]' : positive ? 'text-[var(--success)]' : 'text-[var(--danger)]',
        )}>
          {positive ? '+' : ''}{trend}%
        </p>
      )}
    </m.div>
  );
}
