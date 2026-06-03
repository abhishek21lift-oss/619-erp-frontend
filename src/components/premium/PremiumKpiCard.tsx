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

export interface PremiumKpiCardProps {
  label: string;
  value: string | number;
  prefix?: string;
  growth?: number;
  donutPercent: number;
  icon: React.ReactNode;
  gradient: PremiumKpiGradient;
  format?: (n: number) => string;
  index?: number;
  className?: string;
  onClick?: () => void;
}

function Donut3D({ percent, gradient, displayText, prefix, index = 0 }: {
  percent: number;
  gradient: string;
  displayText: string;
  prefix?: string;
  index?: number;
}) {
  const s = 52;
  const cx = s / 2;
  const cy = s / 2;
  const r = 19;
  const sw = 5;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.min(Math.max(percent, 0), 100);
  const offset = circumference * (1 - clamped / 100);
  const id = React.useId();
  const colors = gradient.match(/#[A-Fa-f0-9]{6}/g) ?? [];

  const [val, setVal] = React.useState(0);
  React.useEffect(() => {
    const num = parseFloat(displayText) || 0;
    if (num === 0) { setVal(0); return; }
    const duration = 900;
    const start = performance.now();
    let raf: number;
    const fn = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      setVal(Math.round((1 - Math.pow(1 - t, 3)) * num));
      if (t < 1) raf = requestAnimationFrame(fn);
    };
    raf = requestAnimationFrame(fn);
    return () => cancelAnimationFrame(raf);
  }, [displayText]);

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} aria-hidden className="drop-shadow-lg">
      <defs>
        <linearGradient id={`dg-${id}`} x1="0" y1="0" x2="1" y2="1">
          {colors.map((c, i, arr) => (
            <stop key={i} offset={`${(i / Math.max(arr.length - 1, 1)) * 100}%`} stopColor={c} />
          ))}
        </linearGradient>
        <linearGradient id={`dt-${id}`} x1="0" y1="0" x2="1" y2="1">
          {colors.map((c, i, arr) => (
            <stop key={i} offset={`${(i / Math.max(arr.length - 1, 1)) * 100}%`} stopColor={c} />
          ))}
        </linearGradient>
        <filter id={`ds-${id}`}>
          <feDropShadow dx={0} dy={2} stdDeviation={3} floodColor="rgba(0,0,0,0.4)" />
        </filter>
      </defs>

      <circle cx={cx} cy={cy + 2} r={r} fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth={sw} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={sw} strokeLinecap="round" />

      <motion.circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={`url(#dg-${id})`}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.9, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
        transform={`rotate(-90 ${cx} ${cy})`}
        filter={`url(#ds-${id})`}
      />

      {clamped > 3 && (
        <motion.circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray={circumference * 0.22}
          strokeDashoffset={circumference * 0.7}
          transform={`rotate(-90 ${cx} ${cy})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.6 + index * 0.05 }}
        />
      )}

      <text
        x={cx} y={cy}
        textAnchor="middle" dominantBaseline="central"
        fill={`url(#dt-${id})`}
        fontSize="10" fontWeight={900}
        fontFamily="var(--font-sans, system-ui, sans-serif)"
        letterSpacing="-0.03em"
      >
        {prefix}{val.toLocaleString('en-IN')}
      </text>
    </svg>
  );
}

export const PremiumKpiCard = React.forwardRef<HTMLDivElement, PremiumKpiCardProps>(
  function PremiumKpiCard(
    { label, value, prefix, growth, donutPercent, icon, gradient, format, index = 0, className, onClick },
    ref,
  ) {
    const gradientCss = GRADIENT_MAP[gradient];
    const glow = GLOW[gradient];
    const borderGlow = BORDER_GLOW[gradient];
    const numericValue = typeof value === 'number' ? value : Number(value);
    const isUp = (growth ?? 0) >= 0;

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
        whileHover={{ y: -3, scale: 1.015 }}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
        className={cn(
          'group relative flex flex-col items-center overflow-hidden rounded-xl aspect-square',
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
          className="pointer-events-none absolute inset-0 opacity-10 transition-opacity duration-700 group-hover:opacity-20"
          style={{ background: `radial-gradient(ellipse at 50% 0%, ${gradientCss} 0%, transparent 70%)` }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 translate-x-[-100%] skew-x-[-12deg] bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-[100%]"
        />
        <div className="absolute inset-x-2 top-0 h-[1.5px] rounded-b-full" style={{ background: gradientCss, boxShadow: glow }} />

        <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-0.5 p-1.5 w-full">
          <div className="flex items-center justify-center gap-1 w-full px-1">
            <span
              className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-white"
              style={{ background: gradientCss }}
              aria-hidden
            >
              {icon}
            </span>
            {growth !== undefined && (
              <span
                className={cn(
                  'inline-flex shrink-0 items-center gap-0.5 rounded-full px-0.5 py-[1px] text-[6px] font-bold leading-none',
                  isUp
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
                )}
              >
                {isUp ? <ArrowUpRight size={6} strokeWidth={2.5} /> : <ArrowDownRight size={6} strokeWidth={2.5} />}
                {Math.abs(growth).toFixed(1)}%
              </span>
            )}
          </div>

          <Donut3D
            percent={donutPercent}
            gradient={gradientCss}
            displayText={format ? format(numericValue) : String(numericValue)}
            prefix={prefix}
            index={index}
          />

          <p className="text-[7px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]/60 truncate max-w-[90%] text-center">
            {label}
          </p>
        </div>
      </motion.div>
    );
  },
);
