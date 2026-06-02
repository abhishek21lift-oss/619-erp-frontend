'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/components/ui/cn';

export type PremiumKpiGradient = 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'pink' | 'violet' | 'cyan';

const GRADIENT_MAP: Record<PremiumKpiGradient, string> = {
  blue: 'linear-gradient(135deg, #2563EB, #60A5FA)',
  green: 'linear-gradient(135deg, #16A34A, #4ADE80)',
  amber: 'linear-gradient(135deg, #D97706, #FBBF24)',
  red: 'linear-gradient(135deg, #DC2626, #F87171)',
  purple: 'linear-gradient(135deg, #7C3AED, #A855F7)',
  pink: 'linear-gradient(135deg, #DB2777, #F472B6)',
  violet: 'linear-gradient(135deg, #6D28D9, #A78BFA)',
  cyan: 'linear-gradient(135deg, #0891B2, #22D3EE)',
};

const GLOW_MAP: Record<PremiumKpiGradient, string> = {
  blue: '0 8px 24px -8px rgba(59,130,246,0.45)',
  green: '0 8px 24px -8px rgba(34,197,94,0.45)',
  amber: '0 8px 24px -8px rgba(245,158,11,0.45)',
  red: '0 8px 24px -8px rgba(239,68,68,0.45)',
  purple: '0 8px 24px -8px rgba(139,92,246,0.45)',
  pink: '0 8px 24px -8px rgba(219,39,119,0.45)',
  violet: '0 8px 24px -8px rgba(109,40,217,0.45)',
  cyan: '0 8px 24px -8px rgba(8,145,178,0.45)',
};

function buildSparkPath(values: number[], width: number, height: number): string {
  if (values.length === 0) return '';
  if (values.length === 1) {
    return `M0 ${height / 2} L${width} ${height / 2}`;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = width / (values.length - 1);
  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * height * 0.9 - height * 0.05;
    return [x, y] as const;
  });
  let d = `M${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    const cx = (x0 + x1) / 2;
    d += ` C${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`;
  }
  return d;
}

export interface PremiumKpiCardProps {
  label: string;
  value: string | number;
  prefix?: string;
  growth?: number;
  trend?: number[];
  icon: React.ReactNode;
  gradient: PremiumKpiGradient;
  format?: (n: number) => string;
  index?: number;
  className?: string;
}

export const PremiumKpiCard = React.forwardRef<HTMLDivElement, PremiumKpiCardProps>(
  function PremiumKpiCard(
    { label, value, prefix, growth, trend, icon, gradient, format, index = 0, className },
    ref,
  ) {
    const gradientCss = GRADIENT_MAP[gradient];
    const glow = GLOW_MAP[gradient];
    const numericValue = typeof value === 'number' ? value : Number(value);
    const isUp = (growth ?? 0) >= 0;

    const sparkWidth = 80;
    const sparkHeight = 32;
    const sparkPath = React.useMemo(
      () => (trend && trend.length > 0 ? buildSparkPath(trend, sparkWidth, sparkHeight) : ''),
      [trend],
    );

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
        whileHover={{ y: -4, scale: 1.01 }}
        className={cn(
          'group relative flex flex-col overflow-hidden rounded-3xl',
          'border border-[var(--border)] bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-card)] backdrop-blur-xl',
          'shadow-[0_10px_40px_rgba(0,0,0,0.08)]',
          'transition-shadow duration-300 hover:shadow-[0_20px_60px_rgba(0,0,0,0.12)]',
          className,
        )}
        style={{ boxShadow: '0 10px 40px rgba(0,0,0,0.08)' }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-1"
          style={{ background: gradientCss }}
        />
        <div className="flex items-start justify-between gap-3 p-5">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
              style={{ background: gradientCss, boxShadow: glow }}
              aria-hidden
            >
              {icon}
            </span>
            <p className="text-[14px] font-medium tracking-wide text-[var(--text-muted)] truncate">
              {label}
            </p>
          </div>
          {growth !== undefined && (
            <span
              className={cn(
                'inline-flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold',
                isUp
                  ? 'bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success-border)]'
                  : 'bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--danger-border)]',
              )}
            >
              {isUp ? <ArrowUpRight size={12} strokeWidth={2.5} /> : <ArrowDownRight size={12} strokeWidth={2.5} />}
              {Math.abs(growth).toFixed(1)}%
            </span>
          )}
        </div>
        <div className="flex items-end justify-between gap-3 px-5 pb-5">
          <p
            className="text-[32px] font-extrabold leading-none tracking-[-0.03em] tabular-nums text-[var(--text-primary)]"
            aria-label={format ? format(numericValue) : String(value)}
          >
            {prefix}
            {format ? format(numericValue) : typeof value === 'number' ? value.toLocaleString('en-IN') : value}
          </p>
          {sparkPath && (
            <svg
              width={sparkWidth}
              height={sparkHeight}
              viewBox={`0 0 ${sparkWidth} ${sparkHeight}`}
              aria-hidden
              className="shrink-0"
            >
              <defs>
                <linearGradient id={`spark-fill-${gradient}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={gradient === 'blue' ? '#60A5FA' : gradient === 'green' ? '#4ADE80' : gradient === 'amber' ? '#FBBF24' : gradient === 'red' ? '#F87171' : gradient === 'purple' ? '#A855F7' : gradient === 'pink' ? '#F472B6' : gradient === 'violet' ? '#A78BFA' : '#22D3EE'} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={gradient === 'blue' ? '#60A5FA' : gradient === 'green' ? '#4ADE80' : gradient === 'amber' ? '#FBBF24' : gradient === 'red' ? '#F87171' : gradient === 'purple' ? '#A855F7' : gradient === 'pink' ? '#F472B6' : gradient === 'violet' ? '#A78BFA' : '#22D3EE'} stopOpacity={0} />
                </linearGradient>
              </defs>
              <motion.path
                d={`${sparkPath} L${sparkWidth} ${sparkHeight} L0 ${sparkHeight} Z`}
                fill={`url(#spark-fill-${gradient})`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: index * 0.05 + 0.2 }}
              />
              <motion.path
                d={sparkPath}
                fill="none"
                stroke={gradient === 'blue' ? '#3B82F6' : gradient === 'green' ? '#22C55E' : gradient === 'amber' ? '#F59E0B' : gradient === 'red' ? '#EF4444' : gradient === 'purple' ? '#8B5CF6' : gradient === 'pink' ? '#EC4899' : gradient === 'violet' ? '#8B5CF6' : '#06B6D4'}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8, delay: index * 0.05 + 0.15, ease: [0.16, 1, 0.3, 1] }}
              />
            </svg>
          )}
        </div>
      </motion.div>
    );
  },
);
