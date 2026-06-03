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
  onClick?: () => void;
}

export const PremiumKpiCard = React.forwardRef<HTMLDivElement, PremiumKpiCardProps>(
  function PremiumKpiCard(
    { label, value, prefix, growth, trend, icon, gradient, format, index = 0, className, onClick },
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
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
        className={cn(
          'group relative flex flex-col overflow-hidden rounded-xl aspect-square',
          'border border-[var(--border)] bg-[var(--bg-card)] backdrop-blur-xl',
          'shadow-[0_4px_20px_rgba(0,0,0,0.05)]',
          'transition-all duration-300 hover:shadow-[0_12px_36px_rgba(0,0,0,0.12)] hover:-translate-y-1 hover:scale-[1.02]',
          onClick && 'cursor-pointer',
          className,
        )}
        style={{ boxShadow: `0 4px 20px ${gradient === 'blue' ? 'rgba(59,130,246,0.08)' : gradient === 'green' ? 'rgba(34,197,94,0.08)' : gradient === 'amber' ? 'rgba(245,158,11,0.08)' : gradient === 'red' ? 'rgba(239,68,68,0.08)' : gradient === 'purple' ? 'rgba(139,92,246,0.08)' : gradient === 'pink' ? 'rgba(219,39,119,0.08)' : gradient === 'violet' ? 'rgba(109,40,217,0.08)' : 'rgba(8,145,178,0.08)'}` }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06] transition-opacity duration-500 group-hover:opacity-[0.12]"
          style={{ background: `radial-gradient(ellipse at 50% 0%, ${gradientCss} 0%, transparent 70%)` }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{ background: `linear-gradient(135deg, transparent 40%, ${gradientCss} 100%)` }}
        />
        <div className="absolute inset-x-3 top-0 h-[3px] rounded-b-full" style={{ background: gradientCss, boxShadow: glow }} />
        <div className="flex flex-1 flex-col justify-between p-3">
          <div className="flex items-start justify-between gap-1.5">
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white"
              style={{ background: gradientCss, boxShadow: glow }}
              aria-hidden
            >
              {icon}
            </span>
            {growth !== undefined && (
              <span
                className={cn(
                  'inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[8px] font-bold',
                  isUp
                    ? 'bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success-border)]'
                    : 'bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--danger-border)]',
                )}
              >
                {isUp ? <ArrowUpRight size={8} strokeWidth={2.5} /> : <ArrowDownRight size={8} strokeWidth={2.5} />}
                {Math.abs(growth).toFixed(1)}%
              </span>
            )}
          </div>
          <div className="mt-auto space-y-1">
            <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)] truncate">
              {label}
            </p>
            <div className="flex items-end justify-between gap-1.5">
              <p
                className="text-[18px] font-black leading-none tracking-[-0.04em] tabular-nums text-[var(--text-primary)]"
                aria-label={format ? format(numericValue) : String(value)}
              >
                {prefix}
                {format ? format(numericValue) : typeof value === 'number' ? value.toLocaleString('en-IN') : value}
              </p>
              {sparkPath && (
                <svg width={40} height={16} viewBox={`0 0 40 16`} aria-hidden className="shrink-0 opacity-60">
                  <defs>
                    <linearGradient id={`spark-fill-${gradient}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={gradient === 'blue' ? '#60A5FA' : gradient === 'green' ? '#4ADE80' : gradient === 'amber' ? '#FBBF24' : gradient === 'red' ? '#F87171' : gradient === 'purple' ? '#A855F7' : gradient === 'pink' ? '#F472B6' : gradient === 'violet' ? '#A78BFA' : '#22D3EE'} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={gradient === 'blue' ? '#60A5FA' : gradient === 'green' ? '#4ADE80' : gradient === 'amber' ? '#FBBF24' : gradient === 'red' ? '#F87171' : gradient === 'purple' ? '#A855F7' : gradient === 'pink' ? '#F472B6' : gradient === 'violet' ? '#A78BFA' : '#22D3EE'} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <motion.path
                    d={`${sparkPath} L40 16 L0 16 Z`}
                    fill={`url(#spark-fill-${gradient})`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6, delay: index * 0.05 + 0.2 }}
                  />
                  <motion.path
                    d={sparkPath}
                    fill="none"
                    stroke={gradient === 'blue' ? '#3B82F6' : gradient === 'green' ? '#22C55E' : gradient === 'amber' ? '#F59E0B' : gradient === 'red' ? '#EF4444' : gradient === 'purple' ? '#8B5CF6' : gradient === 'pink' ? '#EC4899' : gradient === 'violet' ? '#8B5CF6' : '#06B6D4'}
                    strokeWidth={1.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.8, delay: index * 0.05 + 0.15, ease: [0.16, 1, 0.3, 1] }}
                  />
                </svg>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  },
);
