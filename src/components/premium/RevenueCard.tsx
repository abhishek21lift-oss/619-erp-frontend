'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/components/ui/cn';
import { TrendingUp, TrendingDown, IndianRupee } from 'lucide-react';

interface RevenueCardProps {
  label: string;
  value: string;
  trend?: number;
  subtitle?: string;
  icon?: React.ReactNode;
  className?: string;
  index?: number;
}

export function RevenueCard({ label, value, trend, subtitle, icon, className, index = 0 }: RevenueCardProps) {
  const isUp = trend ? trend >= 0 : null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'group relative overflow-hidden rounded-[22px] border border-white/60 bg-white/85 p-5 backdrop-blur-xl',
        'transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)]',
        className,
      )}
    >
      <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br from-red-500/5 to-transparent blur-2xl" />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500">{label}</p>
          {icon ? (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-red-50 text-red-600">
              {icon}
            </span>
          ) : (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-red-50 text-red-600">
              <IndianRupee className="h-4 w-4" />
            </span>
          )}
        </div>
        <p className="mt-2 text-2xl font-bold tracking-tight text-zinc-900">{value}</p>
        {trend !== undefined && (
          <div className="mt-2 flex items-center gap-1.5">
            <span className={cn(
              'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold',
              isUp ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700',
            )}>
              {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(trend).toFixed(1)}%
            </span>
            {subtitle && <span className="text-xs text-zinc-400">{subtitle}</span>}
          </div>
        )}
      </div>
    </motion.div>
  );
}
