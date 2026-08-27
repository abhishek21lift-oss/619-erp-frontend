'use client';

import * as React from 'react';
import { cn } from '@/components/ui/cn';
import { spacing } from '../theme/spacing';

const COLS: Record<2 | 3 | 4 | 5 | 6, string> = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
  5: 'sm:grid-cols-2 lg:grid-cols-5',
  6: 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
};

export interface MetricGroupProps {
  children: React.ReactNode;
  /** Columns at the widest breakpoint this group reaches. Always 2 columns
   *  on a phone regardless — a KPI card needs real width for its value, and
   *  a single column of cards on mobile reads as a very long scroll for
   *  what is usually 4-8 numbers. */
  columns?: 2 | 3 | 4 | 5 | 6;
  className?: string;
}

/**
 * The grid every page arranges PremiumMetricCard (or its named variants)
 * into — one responsive rule, so a KPI row looks the same shape on every
 * page that adopts this system rather than each page hand-rolling its own
 * `grid-cols-2 lg:grid-cols-4`.
 */
export function MetricGroup({ children, columns = 4, className }: MetricGroupProps) {
  return (
    <div
      className={cn('grid grid-cols-2', COLS[columns], className)}
      style={{ gap: spacing.gap }}
    >
      {children}
    </div>
  );
}
