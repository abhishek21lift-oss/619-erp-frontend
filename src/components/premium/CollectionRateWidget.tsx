'use client';

import * as React from 'react';
import { motion, useMotionValue, useTransform, animate, useReducedMotion } from 'framer-motion';

export interface CollectionRateWidgetProps {
  percentage: number;
  collected: number;
  pending: number;
  className?: string;
}

function formatINR(n: number): string {
  if (n >= 10000000) return '₹' + (n / 10000000).toFixed(1) + 'Cr';
  if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L';
  if (n >= 1000) return '₹' + (n / 1000).toFixed(0) + 'K';
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

export const CollectionRateWidget = React.forwardRef<HTMLDivElement, CollectionRateWidgetProps>(
  function CollectionRateWidget({ percentage, collected, pending, className }, ref) {
    const prefersReducedMotion = useReducedMotion();
    const size = 200;
    const stroke = 14;
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const target = Math.max(0, Math.min(100, percentage));

    const animated = useMotionValue(0);
    const dashOffset = useTransform(animated, (v) => circumference - (v / 100) * circumference);
    const [display, setDisplay] = React.useState(prefersReducedMotion ? target : 0);

    React.useEffect(() => {
      if (prefersReducedMotion) {
        setDisplay(target);
        return;
      }
      const controls = animate(animated, target, {
        duration: 1.4,
        ease: [0.16, 1, 0.3, 1],
      });
      const unsub = animated.on('change', (v) => setDisplay(v));
      return () => {
        controls.stop();
        unsub();
      };
    }, [target, animated, prefersReducedMotion]);

    return (
      <div
        ref={ref}
        className={
          'flex flex-col items-center gap-4 rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-6 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.08)] ' +
          (className ?? '')
        }
      >
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
            <defs>
              <linearGradient id="collection-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#22C55E" />
                <stop offset="100%" stopColor="#4ADE80" />
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
              stroke="url(#collection-grad)"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              style={{ strokeDashoffset: dashOffset }}
              filter="drop-shadow(0 4px 12px rgba(34,197,94,0.35))"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[44px] font-extrabold leading-none tracking-[-0.03em] tabular-nums text-[var(--text-primary)]">
              {Math.round(display)}%
            </span>
            <span className="mt-1 text-[12px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Collection Rate
            </span>
          </div>
        </div>
        <div className="grid w-full grid-cols-2 gap-3">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-subtle)] p-3 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--success)]">Collected</p>
            <p className="mt-1 text-[16px] font-extrabold tabular-nums text-[var(--text-primary)]">
              {formatINR(collected)}
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-subtle)] p-3 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--warning)]">Pending</p>
            <p className="mt-1 text-[16px] font-extrabold tabular-nums text-[var(--text-primary)]">
              {formatINR(pending)}
            </p>
          </div>
        </div>
      </div>
    );
  },
);
