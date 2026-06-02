'use client';

import * as React from 'react';
import { motion, useMotionValue, useTransform, animate, useReducedMotion } from 'framer-motion';

function formatINR(n: number): string {
  if (n >= 10000000) return '₹' + (n / 10000000).toFixed(1) + 'Cr';
  if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L';
  if (n >= 1000) return '₹' + (n / 1000).toFixed(0) + 'K';
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

export interface MonthlyTargetGaugeProps {
  current: number;
  target: number;
  className?: string;
}

export const MonthlyTargetGauge = React.forwardRef<HTMLDivElement, MonthlyTargetGaugeProps>(
  function MonthlyTargetGauge({ current, target, className }, ref) {
    const prefersReducedMotion = useReducedMotion();
    const size = 180;
    const stroke = 12;
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const rawPct = target > 0 ? (current / target) * 100 : 0;
    const pct = Math.max(0, Math.min(100, rawPct));
    const overshoot = rawPct > 100;

    const animated = useMotionValue(0);
    const dashOffset = useTransform(animated, (v) => circumference - (v / 100) * circumference);
    const [display, setDisplay] = React.useState(prefersReducedMotion ? pct : 0);

    React.useEffect(() => {
      if (prefersReducedMotion) {
        setDisplay(pct);
        return;
      }
      const controls = animate(animated, pct, {
        duration: 1.4,
        ease: [0.16, 1, 0.3, 1],
      });
      const unsub = animated.on('change', (v) => setDisplay(v));
      return () => {
        controls.stop();
        unsub();
      };
    }, [pct, animated, prefersReducedMotion]);

    return (
      <div
        ref={ref}
        className={
          'flex flex-col items-center gap-3 rounded-3xl border border-[var(--border)] bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-yellow-500/5 p-6 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.08)] ' +
          (className ?? '')
        }
      >
        <p className="text-[11px] font-bold uppercase tracking-wider bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
          Monthly Target
        </p>
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
            <defs>
              <linearGradient id="target-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={overshoot ? '#10B981' : '#A78BFA'} />
                <stop offset="50%" stopColor={overshoot ? '#22C55E' : '#F59E0B'} />
                <stop offset="100%" stopColor={overshoot ? '#4ADE80' : '#F97316'} />
              </linearGradient>
            </defs>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="var(--bg-hover)"
              strokeWidth={stroke}
            />
            <motion.circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="url(#target-grad)"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              style={{ strokeDashoffset: dashOffset }}
              filter="drop-shadow(0 4px 16px rgba(245,158,11,0.4))"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[15px] font-extrabold leading-none tracking-tight tabular-nums bg-gradient-to-br from-amber-400 to-orange-500 bg-clip-text text-transparent">
              {formatINR(current)}
            </span>
            <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              of {formatINR(target)}
            </span>
          </div>
        </div>
        <p className="text-[12px] font-semibold text-[var(--text-muted)]">
          <span className={overshoot ? 'text-emerald-400' : 'text-amber-400'}>
            {Math.round(display)}%
          </span>{' '}
          of target
        </p>
      </div>
    );
  },
);
