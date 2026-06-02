'use client';

import * as React from 'react';
import { motion, useMotionValue, useTransform, animate, useReducedMotion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/components/ui/cn';

export type ClientOverviewGradient = 'blue' | 'green' | 'purple';

const GRADIENT_MAP: Record<ClientOverviewGradient, { from: string; to: string; stroke: string; bg: string }> = {
  blue: { from: '#2563EB', to: '#60A5FA', stroke: '#3B82F6', bg: 'linear-gradient(135deg, rgba(59,130,246,0.10), rgba(96,165,250,0.02))' },
  green: { from: '#16A34A', to: '#4ADE80', stroke: '#22C55E', bg: 'linear-gradient(135deg, rgba(34,197,94,0.10), rgba(74,222,128,0.02))' },
  purple: { from: '#7C3AED', to: '#A855F7', stroke: '#8B5CF6', bg: 'linear-gradient(135deg, rgba(139,92,246,0.10), rgba(168,85,247,0.02))' },
};

const TEXT_COLOR: Record<ClientOverviewGradient, string> = {
  blue: 'text-[var(--brand)]',
  green: 'text-[var(--success)]',
  purple: 'text-[var(--accent)]',
};

const ICON_BG: Record<ClientOverviewGradient, string> = {
  blue: 'bg-[var(--brand-soft)]',
  green: 'bg-[var(--success-bg)]',
  purple: 'bg-[var(--accent-soft)]',
};

export interface ClientOverviewCardProps {
  label: string;
  total: number;
  percentage: number;
  trend: number;
  icon: React.ReactNode;
  gradient: ClientOverviewGradient;
  className?: string;
  index?: number;
}

export const ClientOverviewCard = React.forwardRef<HTMLDivElement, ClientOverviewCardProps>(
  function ClientOverviewCard({ label, total, percentage, trend, icon, gradient, className, index = 0 }, ref) {
    const prefersReducedMotion = useReducedMotion();
    const palette = GRADIENT_MAP[gradient];
    const size = 120;
    const stroke = 10;
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = Math.max(0, Math.min(100, percentage));

    const animatedProgress = useMotionValue(0);
    const dashOffset = useTransform(animatedProgress, (v) => circumference - (v / 100) * circumference);
    const [progressDisplay, setProgressDisplay] = React.useState(prefersReducedMotion ? progress : 0);

    React.useEffect(() => {
      if (prefersReducedMotion) {
        setProgressDisplay(progress);
        return;
      }
      const controls = animate(animatedProgress, progress, {
        duration: 1.2,
        ease: [0.16, 1, 0.3, 1],
      });
      const unsubscribe = animatedProgress.on('change', (v) => setProgressDisplay(v));
      return () => {
        controls.stop();
        unsubscribe();
      };
    }, [progress, animatedProgress, prefersReducedMotion]);

    const direction = trend > 0 ? 1 : trend < 0 ? -1 : 0;

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
        whileHover={{ y: -4, scale: 1.01 }}
        className={cn(
          'group relative flex flex-col items-center overflow-hidden rounded-3xl border border-[var(--border)] p-6 backdrop-blur-xl',
          'shadow-[0_10px_40px_rgba(0,0,0,0.08)] transition-shadow duration-300 hover:shadow-[0_20px_60px_rgba(0,0,0,0.12)]',
          className,
        )}
        style={{ background: palette.bg, boxShadow: '0 10px 40px rgba(0,0,0,0.08)' }}
      >
        <div className="flex w-full items-center justify-between gap-3">
          <span
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-xl',
              ICON_BG[gradient],
              TEXT_COLOR[gradient],
            )}
            aria-hidden
          >
            {icon}
          </span>
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold',
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
        </div>

        <p className="mt-4 text-[48px] font-extrabold leading-none tracking-[-0.03em] tabular-nums text-[var(--text-primary)]">
          {total.toLocaleString('en-IN')}
        </p>
        <p className="mt-1 text-[13px] font-medium text-[var(--text-muted)]">{label}</p>

        <div className="relative mt-6 flex items-center justify-center" style={{ width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
            <defs>
              <linearGradient id={`overview-grad-${gradient}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={palette.from} />
                <stop offset="100%" stopColor={palette.to} />
              </linearGradient>
            </defs>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="var(--border)"
              strokeWidth={stroke}
            />
            <motion.circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={`url(#overview-grad-${gradient})`}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              style={{ strokeDashoffset: dashOffset }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn('text-[22px] font-extrabold leading-none tracking-tight tabular-nums', TEXT_COLOR[gradient])}>
              {Math.round(progressDisplay)}%
            </span>
          </div>
        </div>
      </motion.div>
    );
  },
);
