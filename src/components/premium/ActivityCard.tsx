'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/components/ui/cn';

export type ActivityCardGradient =
  | 'blue'
  | 'green'
  | 'amber'
  | 'red'
  | 'purple'
  | 'cyan'
  | 'pink';

const GRADIENT_MAP: Record<ActivityCardGradient, string> = {
  blue: 'linear-gradient(135deg, #2563EB, #60A5FA)',
  green: 'linear-gradient(135deg, #16A34A, #4ADE80)',
  amber: 'linear-gradient(135deg, #D97706, #FBBF24)',
  red: 'linear-gradient(135deg, #DC2626, #F87171)',
  purple: 'linear-gradient(135deg, #7C3AED, #A855F7)',
  cyan: 'linear-gradient(135deg, #0891B2, #22D3EE)',
  pink: 'linear-gradient(135deg, #DB2777, #F472B6)',
};

const SOFT_BG: Record<ActivityCardGradient, string> = {
  blue: 'bg-[var(--brand-soft)]',
  green: 'bg-[var(--success-bg)]',
  amber: 'bg-[var(--warning-bg)]',
  red: 'bg-[var(--danger-bg)]',
  purple: 'bg-[var(--accent-soft)]',
  cyan: 'bg-cyan-50 dark:bg-cyan-500/10',
  pink: 'bg-pink-50 dark:bg-pink-500/10',
};

const TEXT_COLOR: Record<ActivityCardGradient, string> = {
  blue: 'text-[var(--brand)]',
  green: 'text-[var(--success)]',
  amber: 'text-[var(--warning)]',
  red: 'text-[var(--danger)]',
  purple: 'text-[var(--accent)]',
  cyan: 'text-cyan-600 dark:text-cyan-400',
  pink: 'text-pink-600 dark:text-pink-400',
};

export interface ActivityCardProps {
  title: string;
  count: number;
  icon: React.ReactNode;
  gradient: ActivityCardGradient;
  trend?: number;
  onClick?: () => void;
  index?: number;
  className?: string;
}

export const ActivityCard = React.forwardRef<HTMLDivElement, ActivityCardProps>(
  function ActivityCard({ title, count, icon, gradient, trend, onClick, index = 0, className }, ref) {
    const direction = trend === undefined ? 0 : trend > 0 ? 1 : trend < 0 ? -1 : 0;
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
        whileHover={{ y: -4, scale: 1.01 }}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={
          onClick
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onClick();
                }
              }
            : undefined
        }
        className={cn(
          'group relative flex items-center gap-4 overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-5 backdrop-blur-xl',
          'shadow-[0_10px_40px_rgba(0,0,0,0.08)]',
          'transition-shadow duration-300 hover:shadow-[0_20px_60px_rgba(0,0,0,0.12)]',
          onClick && 'cursor-pointer',
          className,
        )}
      >
        <span
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl',
            SOFT_BG[gradient],
            TEXT_COLOR[gradient],
          )}
          aria-hidden
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-[var(--text-muted)] truncate">{title}</p>
          <p className="mt-0.5 text-[26px] font-extrabold leading-none tracking-[-0.02em] tabular-nums text-[var(--text-primary)]">
            {count.toLocaleString('en-IN')}
          </p>
        </div>
        {trend !== undefined && (
          <span
            className={cn(
              'inline-flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold',
              direction > 0 && 'bg-[var(--success-bg)] text-[var(--success)]',
              direction < 0 && 'bg-[var(--danger-bg)] text-[var(--danger)]',
              direction === 0 && 'bg-[var(--neutral-bg)] text-[var(--text-muted)]',
            )}
          >
            {direction > 0 && <TrendingUp size={12} strokeWidth={2.5} />}
            {direction < 0 && <TrendingDown size={12} strokeWidth={2.5} />}
            {direction === 0 && <Minus size={12} strokeWidth={2.5} />}
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
        <span
          aria-hidden
          className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-[0.08] blur-2xl transition-opacity duration-500 group-hover:opacity-[0.18]"
          style={{ background: GRADIENT_MAP[gradient] }}
        />
      </motion.div>
    );
  },
);
