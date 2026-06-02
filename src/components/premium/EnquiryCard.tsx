'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/components/ui/cn';

export type EnquiryVariant = 'total' | 'open' | 'converted' | 'lost';

const VARIANT_STYLES: Record<
  EnquiryVariant,
  { iconBg: string; iconText: string; bar: string; dot: string; ring: string }
> = {
  total: {
    iconBg: 'bg-[var(--brand-soft)]',
    iconText: 'text-[var(--brand)]',
    bar: 'linear-gradient(90deg, #3B82F6, #60A5FA)',
    dot: '#3B82F6',
    ring: '0 0 0 6px rgba(59,130,246,0.08)',
  },
  open: {
    iconBg: 'bg-[var(--warning-bg)]',
    iconText: 'text-[var(--warning)]',
    bar: 'linear-gradient(90deg, #D97706, #FBBF24)',
    dot: '#F59E0B',
    ring: '0 0 0 6px rgba(245,158,11,0.08)',
  },
  converted: {
    iconBg: 'bg-[var(--success-bg)]',
    iconText: 'text-[var(--success)]',
    bar: 'linear-gradient(90deg, #16A34A, #4ADE80)',
    dot: '#22C55E',
    ring: '0 0 0 6px rgba(34,197,94,0.08)',
  },
  lost: {
    iconBg: 'bg-[var(--danger-bg)]',
    iconText: 'text-[var(--danger)]',
    bar: 'linear-gradient(90deg, #DC2626, #F87171)',
    dot: '#EF4444',
    ring: '0 0 0 6px rgba(239,68,68,0.08)',
  },
};

export interface EnquiryCardProps {
  title: string;
  count: number;
  conversion?: number;
  trend?: number;
  variant: EnquiryVariant;
  icon: React.ReactNode;
  className?: string;
  index?: number;
}

export const EnquiryCard = React.forwardRef<HTMLDivElement, EnquiryCardProps>(
  function EnquiryCard({ title, count, conversion, trend, variant, icon, className, index = 0 }, ref) {
    const v = VARIANT_STYLES[variant];
    const direction = trend === undefined ? 0 : trend > 0 ? 1 : trend < 0 ? -1 : 0;
    const conv = conversion === undefined ? null : Math.max(0, Math.min(100, conversion));

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
        whileHover={{ y: -3, scale: 1.005 }}
        className={cn(
          'group relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-5 backdrop-blur-xl',
          'shadow-[0_10px_40px_rgba(0,0,0,0.08)]',
          'transition-shadow duration-300 hover:shadow-[0_20px_60px_rgba(0,0,0,0.12)]',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                v.iconBg,
                v.iconText,
              )}
              style={{ boxShadow: v.ring }}
              aria-hidden
            >
              {icon}
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                {title}
              </p>
              <p className="mt-0.5 text-[28px] font-extrabold leading-none tracking-[-0.02em] tabular-nums text-[var(--text-primary)]">
                {count.toLocaleString('en-IN')}
              </p>
            </div>
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
              {direction > 0 && <TrendingUp size={11} strokeWidth={2.5} />}
              {direction < 0 && <TrendingDown size={11} strokeWidth={2.5} />}
              {direction === 0 && <Minus size={11} strokeWidth={2.5} />}
              {Math.abs(trend).toFixed(1)}%
            </span>
          )}
        </div>

        {conv !== null && (
          <div className="mt-4 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--text-muted)]">
              <span>Conversion</span>
              <span className="tabular-nums text-[var(--text-secondary)]">{conv.toFixed(1)}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-hover)]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${conv}%` }}
                transition={{ duration: 0.9, delay: index * 0.05 + 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="h-full rounded-full"
                style={{ background: v.bar }}
              />
            </div>
          </div>
        )}
      </motion.div>
    );
  },
);
