'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/components/ui/cn';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Metric {
  label: string;
  value: string;
  trend?: number;
  subtitle?: string;
}

interface AnalyticsPanelProps {
  title: string;
  subtitle?: string;
  metrics: Metric[];
  className?: string;
  columns?: 2 | 3 | 4;
}

export function AnalyticsPanel({ title, subtitle, metrics, className, columns = 3 }: AnalyticsPanelProps) {
  return (
    <div className={cn(
      'rounded-[24px] border border-white/60 bg-white/80 p-5 backdrop-blur-xl sm:p-6',
      'shadow-[0_4px_20px_rgba(15,23,42,0.05)]',
      className,
    )}>
      <div className="mb-5">
        <h3 className="text-base font-semibold tracking-tight text-zinc-900">{title}</h3>
        {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
      </div>
      <div className={cn(
        'grid gap-4',
        columns === 2 && 'grid-cols-2',
        columns === 3 && 'grid-cols-1 sm:grid-cols-3',
        columns === 4 && 'grid-cols-2 sm:grid-cols-4',
      )}>
        {metrics.map((metric, i) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            className="rounded-[16px] border border-zinc-100/80 bg-white/60 p-4 backdrop-blur-sm"
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-zinc-500">{metric.label}</p>
            <p className="mt-1.5 text-xl font-bold tracking-tight text-zinc-900">{metric.value}</p>
            {metric.trend !== undefined && (
              <div className="mt-1.5 flex items-center gap-1">
                {metric.trend > 0 ? (
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                ) : metric.trend < 0 ? (
                  <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                ) : (
                  <Minus className="h-3.5 w-3.5 text-zinc-400" />
                )}
                <span className={cn(
                  'text-[11px] font-semibold',
                  metric.trend > 0 ? 'text-emerald-600' : metric.trend < 0 ? 'text-red-600' : 'text-zinc-500',
                )}>
                  {Math.abs(metric.trend).toFixed(1)}%
                </span>
                {metric.subtitle && <span className="text-[11px] text-zinc-400">{metric.subtitle}</span>}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
