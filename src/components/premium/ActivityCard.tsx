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
  | 'pink'
  | 'violet';

const GRADIENT_MAP: Record<ActivityCardGradient, string> = {
  blue: 'linear-gradient(135deg, #2563EB, #60A5FA)',
  green: 'linear-gradient(135deg, #16A34A, #4ADE80)',
  amber: 'linear-gradient(135deg, #D97706, #FBBF24)',
  red: 'linear-gradient(135deg, #DC2626, #F87171)',
  purple: 'linear-gradient(135deg, #7C3AED, #A855F7)',
  cyan: 'linear-gradient(135deg, #0891B2, #22D3EE)',
  pink: 'linear-gradient(135deg, #DB2777, #F472B6)',
  violet: 'linear-gradient(135deg, #6D28D9, #A78BFA)',
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
    const glow = `0 6px 18px -6px ${
    gradient === 'blue' ? 'rgba(59,130,246,0.4)' :
    gradient === 'green' ? 'rgba(34,197,94,0.4)' :
    gradient === 'amber' ? 'rgba(245,158,11,0.4)' :
    gradient === 'red' ? 'rgba(239,68,68,0.4)' :
    gradient === 'purple' ? 'rgba(139,92,246,0.4)' :
    gradient === 'pink' ? 'rgba(219,39,119,0.4)' :
    gradient === 'violet' ? 'rgba(109,40,217,0.4)' :
    'rgba(8,145,178,0.4)'
  }`;

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
          'group relative flex flex-col overflow-hidden rounded-xl aspect-square',
          'border border-[var(--border)] bg-[var(--bg-card)] backdrop-blur-xl',
          'shadow-[0_4px_20px_rgba(0,0,0,0.05)]',
          'transition-all duration-300 hover:shadow-[0_12px_36px_rgba(0,0,0,0.12)] hover:-translate-y-1 hover:scale-[1.02]',
          onClick && 'cursor-pointer',
          className,
        )}
        style={{ boxShadow: `0 4px 20px ${
          gradient === 'blue' ? 'rgba(59,130,246,0.08)' :
          gradient === 'green' ? 'rgba(34,197,94,0.08)' :
          gradient === 'amber' ? 'rgba(245,158,11,0.08)' :
          gradient === 'red' ? 'rgba(239,68,68,0.08)' :
          gradient === 'purple' ? 'rgba(139,92,246,0.08)' :
          gradient === 'pink' ? 'rgba(219,39,119,0.08)' :
          gradient === 'violet' ? 'rgba(109,40,217,0.08)' :
          'rgba(8,145,178,0.08)'
        }` }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06] transition-opacity duration-500 group-hover:opacity-[0.12]"
          style={{ background: `radial-gradient(ellipse at 50% 0%, ${GRADIENT_MAP[gradient]} 0%, transparent 70%)` }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{ background: `linear-gradient(135deg, transparent 40%, ${GRADIENT_MAP[gradient]} 100%)` }}
        />
        <div className="absolute inset-x-3 top-0 h-[3px] rounded-b-full" style={{ background: GRADIENT_MAP[gradient], boxShadow: glow }} />
        <div className="flex flex-1 flex-col justify-between p-3">
          <div className="flex items-start justify-between gap-1.5">
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white"
              style={{ background: GRADIENT_MAP[gradient], boxShadow: glow }}
              aria-hidden
            >
              {icon}
            </span>
            {trend !== undefined && (
              <span
                className={cn(
                  'inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[8px] font-bold',
                  direction > 0 && 'bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success-border)]',
                  direction < 0 && 'bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--danger-border)]',
                  direction === 0 && 'bg-[var(--neutral-bg)] text-[var(--text-muted)] border border-[var(--border)]',
                )}
              >
                {direction > 0 && <TrendingUp size={8} strokeWidth={2.5} />}
                {direction < 0 && <TrendingDown size={8} strokeWidth={2.5} />}
                {direction === 0 && <Minus size={8} strokeWidth={2.5} />}
                {Math.abs(trend).toFixed(1)}%
              </span>
            )}
          </div>
          <div className="mt-auto space-y-1">
            <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)] truncate">
              {title}
            </p>
            <p className="text-[18px] font-black leading-none tracking-[-0.04em] tabular-nums text-[var(--text-primary)]">
              {count.toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      </motion.div>
    );
  },
);
