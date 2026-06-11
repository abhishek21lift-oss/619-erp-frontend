'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { clsx } from 'clsx';

type RevenueCardProps = {
  label: string;
  value: string;
  trend: number;
  icon: React.ReactNode;
  index: number;
};

export function RevenueCard({ label, value, trend, icon, index }: RevenueCardProps) {
  const isUp = trend >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-[18px] p-4 border border-slate-100 bg-white"
      style={{ boxShadow: '0 2px 12px rgba(15,23,42,0.04)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-indigo-50 text-indigo-600">
          {icon}
        </div>
        <span
          className={clsx(
            'flex items-center gap-1 text-[11px] font-[700]',
            isUp ? 'text-emerald-600' : 'text-red-600',
          )}
        >
          {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {Math.abs(trend)}%
        </span>
      </div>
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <p className="mt-0.5 text-[20px] font-[800] tracking-[-0.02em] text-slate-900">{value}</p>
    </motion.div>
  );
}
