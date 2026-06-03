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
  blue: 'linear-gradient(135deg, #1E40AF, #38BDF8)',
  green: 'linear-gradient(135deg, #047857, #34D399)',
  amber: 'linear-gradient(135deg, #B45309, #FCD34D)',
  red: 'linear-gradient(135deg, #BE123C, #FB7185)',
  purple: 'linear-gradient(135deg, #5B21B6, #C084FC)',
  cyan: 'linear-gradient(135deg, #0E7490, #67E8F9)',
  pink: 'linear-gradient(135deg, #9D174D, #F472B6)',
  violet: 'linear-gradient(135deg, #4C1D95, #A78BFA)',
};

const GLOW: Record<ActivityCardGradient, string> = {
  blue: '0 0 20px rgba(56,189,248,0.3), 0 0 40px rgba(56,189,248,0.1)',
  green: '0 0 20px rgba(52,211,153,0.3), 0 0 40px rgba(52,211,153,0.1)',
  amber: '0 0 20px rgba(252,211,77,0.3), 0 0 40px rgba(252,211,77,0.1)',
  red: '0 0 20px rgba(251,113,133,0.3), 0 0 40px rgba(251,113,133,0.1)',
  purple: '0 0 20px rgba(192,132,252,0.3), 0 0 40px rgba(192,132,252,0.1)',
  cyan: '0 0 20px rgba(103,232,249,0.3), 0 0 40px rgba(103,232,249,0.1)',
  pink: '0 0 20px rgba(244,114,182,0.3), 0 0 40px rgba(244,114,182,0.1)',
  violet: '0 0 20px rgba(167,139,250,0.3), 0 0 40px rgba(167,139,250,0.1)',
};

const BORDER_GLOW: Record<ActivityCardGradient, string> = {
  blue: 'rgba(56,189,248,0.15)',
  green: 'rgba(52,211,153,0.15)',
  amber: 'rgba(252,211,77,0.15)',
  red: 'rgba(251,113,133,0.15)',
  purple: 'rgba(192,132,252,0.15)',
  cyan: 'rgba(103,232,249,0.15)',
  pink: 'rgba(244,114,182,0.15)',
  violet: 'rgba(167,139,250,0.15)',
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
    const gradientCss = GRADIENT_MAP[gradient];
    const glow = GLOW[gradient];
    const borderGlow = BORDER_GLOW[gradient];

    const [displayValue, setDisplayValue] = React.useState(0);
    React.useEffect(() => {
      if (count === 0) { setDisplayValue(0); return; }
      const duration = 800;
      const start = performance.now();
      let raf: number;
      function animate(now: number) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayValue(Math.round(eased * count));
        if (progress < 1) raf = requestAnimationFrame(animate);
      }
      raf = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(raf);
    }, [count]);

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
        whileHover={{ y: -6, scale: 1.03 }}
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
            {trend !== undefined && (
              <span
                className={cn(
                  'inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[8px] font-bold',
                  direction > 0 && 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
                  direction < 0 && 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
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
            <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]/70 truncate">
              {title}
            </p>
            <p
              className="text-[18px] font-black leading-none tracking-[-0.04em] tabular-nums text-transparent bg-clip-text"
              style={{ backgroundImage: gradientCss }}
            >
              {displayValue.toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      </motion.div>
    );
  },
);
