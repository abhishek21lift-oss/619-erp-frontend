import * as React from 'react';
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
    <div className={cn(
      'rounded-[18px] bg-[var(--bg-card)] border border-[var(--border)] p-4 transition hover:shadow-md',
      className,
    )}>
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
          trend === 0 ? 'text-[var(--text-muted)]' : positive ? 'text-emerald-600' : 'text-red-600',
        )}>
          {positive ? '+' : ''}{trend}%
        </p>
      )}
    </div>
  );
}
