'use client';

import * as React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/components/ui/cn';

interface DonutDatum {
  name: string;
  value: number;
  color?: string;
}

interface Premium3DDonutProps {
  data: DonutDatum[];
  centerValue?: React.ReactNode;
  centerLabel?: string;
  valueFormatter?: (value: number) => string;
  height?: number;
  className?: string;
  icon?: React.ReactNode;
  tilt?: number;
}

const VIBRANT_PALETTE = [
  '#8B5CF6', '#3B82F6', '#06B6D4', '#10B981',
  '#F59E0B', '#EC4899', '#6366F1', '#EF4444',
];

export function Premium3DDonut({
  data, centerValue, centerLabel, valueFormatter,
  height = 220, className, icon, tilt = 12,
}: Premium3DDonutProps) {
  const prefersReducedMotion = useReducedMotion();

  const cleaned = React.useMemo(
    () => data.filter(d => Number.isFinite(d.value) && d.value > 0),
    [data],
  );

  const total = React.useMemo(
    () => cleaned.reduce((s, d) => s + d.value, 0),
    [cleaned],
  );

  const fmt = valueFormatter ?? ((v: number) => v.toLocaleString());

  if (cleaned.length === 0 || total === 0) {
    return (
      <div className={cn('grid place-items-center rounded-xl bg-white/40 text-xs text-slate-400', className)} style={{ minHeight: height }}>
        No data yet
      </div>
    );
  }

  const ringRotation = prefersReducedMotion ? 0 : undefined;

  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={cn('relative w-full', className)}
      style={{ perspective: '800px' }}
    >
      <div
        style={{
          transform: prefersReducedMotion ? 'none' : `perspective(800px) rotateX(${tilt}deg)`,
          transformStyle: 'preserve-3d',
          transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        className="relative"
      >
        <div
          className="absolute inset-0 rounded-full blur-xl opacity-20"
          style={{
            background: `conic-gradient(${cleaned.map((d, i) => `${d.color ?? VIBRANT_PALETTE[i % VIBRANT_PALETTE.length]}`).join(', ')})`,
            transform: 'translateZ(-20px)',
          }}
        />
        <div
          className="absolute inset-0 rounded-full opacity-[0.12]"
          style={{
            background: `conic-gradient(${cleaned.map((d, i) => `${d.color ?? VIBRANT_PALETTE[i % VIBRANT_PALETTE.length]}`).join(', ')})`,
            transform: 'translateZ(-8px)',
            filter: 'blur(4px)',
          }}
        />
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={cleaned}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={88}
              paddingAngle={cleaned.length > 1 ? 3 : 0}
              stroke="rgba(255,255,255,0.6)"
              strokeWidth={2.5}
              isAnimationActive={!prefersReducedMotion}
              animationBegin={200}
              animationDuration={1200}
              animationEasing="ease-out"
            >
              {cleaned.map((d, idx) => (
                <Cell
                  key={d.name}
                  fill={d.color ?? VIBRANT_PALETTE[idx % VIBRANT_PALETTE.length]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: 'rgba(255,255,255,0.92)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(139,92,246,0.15)',
                borderRadius: 14,
                boxShadow: '0 8px 32px rgba(139,92,246,0.12)',
                fontSize: 12,
                padding: '10px 14px',
              }}
              formatter={(value: number, name: string) => [
                `${fmt(value)} (${((value / total) * 100).toFixed(1)}%)`,
                name,
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <motion.div
        initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
        style={{ paddingBottom: 0 }}
      >
        {icon && (
          <div className="mb-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#8B5CF6]/15 to-[#3B82F6]/10 shadow-[0_4px_12px_rgba(139,92,246,0.10)]">
            {icon}
          </div>
        )}
        <span className="text-[22px] font-bold tracking-[-0.03em] text-[var(--text-primary)] tabular-nums leading-none">
          {centerValue ?? fmt(total)}
        </span>
        {centerLabel && (
          <span className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
            {centerLabel}
          </span>
        )}
      </motion.div>
    </motion.div>
  );
}

export function DonutLegend({ data, palette = VIBRANT_PALETTE }: { data: DonutDatum[]; palette?: string[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-3">
      {data.map((item, idx) => {
        const color = item.color ?? palette[idx % palette.length];
        return (
          <motion.div
            key={item.name}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.04 }}
            className="flex items-center gap-2 group"
          >
            <span className="relative h-2.5 w-2.5 rounded-full shrink-0" style={{ background: color }}>
              <span className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ background: color }} />
            </span>
            <span className="text-[11px] text-[var(--text-muted)] truncate group-hover:text-[var(--text-primary)] transition-colors">
              {item.name}
            </span>
            <span className="ml-auto text-[11px] font-bold text-[var(--text-primary)] tabular-nums">
              {item.value}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
