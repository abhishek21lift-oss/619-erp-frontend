'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/components/ui/cn';

export type PremiumKpiGradient = 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'pink' | 'violet' | 'cyan';

const GRADIENT_MAP: Record<PremiumKpiGradient, string> = {
  blue: 'linear-gradient(135deg, #1E40AF, #38BDF8)',
  green: 'linear-gradient(135deg, #047857, #34D399)',
  amber: 'linear-gradient(135deg, #B45309, #FCD34D)',
  red: 'linear-gradient(135deg, #BE123C, #FB7185)',
  purple: 'linear-gradient(135deg, #5B21B6, #C084FC)',
  pink: 'linear-gradient(135deg, #9D174D, #F472B6)',
  violet: 'linear-gradient(135deg, #4C1D95, #A78BFA)',
  cyan: 'linear-gradient(135deg, #0E7490, #67E8F9)',
};

const GLOW: Record<PremiumKpiGradient, string> = {
  blue: '0 0 20px rgba(56,189,248,0.3), 0 0 40px rgba(56,189,248,0.1)',
  green: '0 0 20px rgba(52,211,153,0.3), 0 0 40px rgba(52,211,153,0.1)',
  amber: '0 0 20px rgba(252,211,77,0.3), 0 0 40px rgba(252,211,77,0.1)',
  red: '0 0 20px rgba(251,113,133,0.3), 0 0 40px rgba(251,113,133,0.1)',
  purple: '0 0 20px rgba(192,132,252,0.3), 0 0 40px rgba(192,132,252,0.1)',
  pink: '0 0 20px rgba(244,114,182,0.3), 0 0 40px rgba(244,114,182,0.1)',
  violet: '0 0 20px rgba(167,139,250,0.3), 0 0 40px rgba(167,139,250,0.1)',
  cyan: '0 0 20px rgba(103,232,249,0.3), 0 0 40px rgba(103,232,249,0.1)',
};

const BORDER_GLOW: Record<PremiumKpiGradient, string> = {
  blue: 'rgba(56,189,248,0.15)',
  green: 'rgba(52,211,153,0.15)',
  amber: 'rgba(252,211,77,0.15)',
  red: 'rgba(251,113,133,0.15)',
  purple: 'rgba(192,132,252,0.15)',
  pink: 'rgba(244,114,182,0.15)',
  violet: 'rgba(167,139,250,0.15)',
  cyan: 'rgba(103,232,249,0.15)',
};

const SPARK_COLORS: Record<PremiumKpiGradient, { stroke: string; fill: string }> = {
  blue: { stroke: '#38BDF8', fill: '#38BDF8' },
  green: { stroke: '#34D399', fill: '#34D399' },
  amber: { stroke: '#FCD34D', fill: '#FCD34D' },
  red: { stroke: '#FB7185', fill: '#FB7185' },
  purple: { stroke: '#C084FC', fill: '#C084FC' },
  pink: { stroke: '#F472B6', fill: '#F472B6' },
  violet: { stroke: '#A78BFA', fill: '#A78BFA' },
  cyan: { stroke: '#67E8F9', fill: '#67E8F9' },
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
    const glow = GLOW[gradient];
    const borderGlow = BORDER_GLOW[gradient];
    const sc = SPARK_COLORS[gradient];
    const numericValue = typeof value === 'number' ? value : Number(value);
    const isUp = (growth ?? 0) >= 0;

    const sparkWidth = 80;
    const sparkHeight = 32;
    const sparkPath = React.useMemo(
      () => (trend && trend.length > 0 ? buildSparkPath(trend, sparkWidth, sparkHeight) : ''),
      [trend],
    );

    const [displayValue, setDisplayValue] = React.useState(0);
    React.useEffect(() => {
      if (numericValue === 0) { setDisplayValue(0); return; }
      const duration = 800;
      const start = performance.now();
      let raf: number;
      function animate(now: number) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayValue(Math.round(eased * numericValue));
        if (progress < 1) raf = requestAnimationFrame(animate);
      }
      raf = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(raf);
    }, [numericValue]);

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
        whileHover={{ y: -6, scale: 1.03 }}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
        className={cn(
          'group relative flex flex-col overflow-hidden rounded-xl aspect-square',
          'bg-[var(--bg-card)]/60 backdrop-blur-2xl',
          'transition-all duration-500',
          'hover:shadow-2xl',
          onClick && 'cursor-pointer',
          className,
        )}
        style={{
          boxShadow: `0 4px 24px ${borderGlow}, inset 0 1px 0 rgba(255,255,255,0.06)`,
          border: '1px solid transparent',
          backgroundClip: 'padding-box',
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-px rounded-xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background: `conic-gradient(from var(--angle, 0deg), transparent 40%, ${borderGlow} 50%, transparent 60%)`,
            mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            maskComposite: 'exclude',
            WebkitMaskComposite: 'xor',
            padding: '1px',
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-[2px] rounded-[13px] opacity-0 blur-sm transition-opacity duration-500 group-hover:opacity-60"
          style={{ background: `conic-gradient(from var(--angle, 0deg), transparent 30%, ${borderGlow} 50%, transparent 70%)` }}
        />

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.08] transition-opacity duration-700 group-hover:opacity-[0.18]"
          style={{ background: `radial-gradient(ellipse at 50% 0%, ${gradientCss} 0%, transparent 70%)` }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-x-4 -inset-y-8 opacity-0 transition-all duration-700 group-hover:opacity-[0.07]"
          style={{
            background: `radial-gradient(ellipse at 50% 50%, ${gradientCss} 0%, transparent 60%)`,
            filter: 'blur(20px)',
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 translate-x-[-100%] skew-x-[-12deg] bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-[100%]"
        />
        <div className="absolute inset-x-3 top-0 h-[3px] rounded-b-full" style={{ background: gradientCss, boxShadow: glow }} />

        <div className="relative z-10 flex flex-1 flex-col justify-between p-3">
          <div className="flex items-start justify-between gap-1.5">
            <span
              className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white"
              style={{ background: gradientCss, boxShadow: glow }}
              aria-hidden
            >
              <div
                aria-hidden
                className="absolute inset-0 rounded-lg animate-pulse opacity-20"
                style={{ background: gradientCss, filter: 'blur(4px)' }}
              />
              {icon}
            </span>
            {growth !== undefined && (
              <span
                className={cn(
                  'inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[8px] font-bold',
                  isUp
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
                )}
              >
                {isUp ? <ArrowUpRight size={8} strokeWidth={2.5} /> : <ArrowDownRight size={8} strokeWidth={2.5} />}
                {Math.abs(growth).toFixed(1)}%
              </span>
            )}
          </div>
          <div className="mt-auto space-y-1">
            <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]/70 truncate">
              {label}
            </p>
            <div className="flex items-end justify-between gap-1.5">
              <p
                className="text-[18px] font-black leading-none tracking-[-0.04em] tabular-nums text-transparent bg-clip-text"
                style={{ backgroundImage: gradientCss }}
                aria-label={format ? format(numericValue) : String(value)}
              >
                {prefix}
                {format ? format(displayValue) : displayValue.toLocaleString('en-IN')}
              </p>
              {sparkPath && (
                <svg width={40} height={16} viewBox={`0 0 40 16`} aria-hidden className="shrink-0">
                  <defs>
                    <linearGradient id={`spark-fill-${gradient}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={sc.fill} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={sc.fill} stopOpacity={0} />
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
                    stroke={sc.stroke}
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
