'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { IndianRupee, Users, RefreshCcw, TrendingUp } from 'lucide-react';
import { cn } from '@/components/ui/cn';

function formatINR(n: number): string {
  if (n >= 10000000) return '₹' + (n / 10000000).toFixed(2) + 'Cr';
  if (n >= 100000) return '₹' + (n / 100000).toFixed(2) + 'L';
  if (n >= 1000) return '₹' + (n / 1000).toFixed(1) + 'K';
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

export interface BusinessSummaryProps {
  revenue: number;
  newClients: number;
  renewals: number;
  className?: string;
}

export const BusinessSummary = React.forwardRef<HTMLDivElement, BusinessSummaryProps>(
  function BusinessSummary({ revenue, newClients, renewals, className }, ref) {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          'relative overflow-hidden rounded-3xl border border-[var(--border)] p-6 backdrop-blur-xl',
          'shadow-[0_10px_40px_rgba(0,0,0,0.08)]',
          'bg-gradient-to-br from-pink-500/10 via-violet-500/10 to-cyan-500/10',
          className,
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-pink-500/5 via-violet-500/5 to-cyan-500/5"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-gradient-to-br from-pink-400/20 to-violet-400/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-gradient-to-br from-cyan-400/20 to-violet-400/20 blur-3xl"
        />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-violet-500 shadow-lg">
              <TrendingUp size={18} strokeWidth={2.2} className="text-white" />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] bg-gradient-to-r from-pink-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
                Today's Business
              </p>
              <p className="mt-0.5 text-[13px] font-medium text-[var(--text-muted)]">
                Real-time snapshot of your day
              </p>
            </div>
          </div>
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
          </span>
        </div>
        <div className="relative mt-5 grid grid-cols-1 divide-y divide-[var(--border)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <SummaryColumn
            icon={<IndianRupee size={18} strokeWidth={2.2} />}
            value={formatINR(revenue)}
            label="Revenue"
            gradient="linear-gradient(135deg, #EC4899, #F472B6)"
            toneClass="text-pink-500 dark:text-pink-400"
          />
          <SummaryColumn
            icon={<Users size={18} strokeWidth={2.2} />}
            value={newClients.toLocaleString('en-IN')}
            label="New Clients"
            gradient="linear-gradient(135deg, #6D28D9, #A78BFA)"
            toneClass="text-violet-500 dark:text-violet-400"
            padLeft
          />
          <SummaryColumn
            icon={<RefreshCcw size={18} strokeWidth={2.2} />}
            value={renewals.toLocaleString('en-IN')}
            label="Renewals"
            gradient="linear-gradient(135deg, #0891B2, #22D3EE)"
            toneClass="text-cyan-500 dark:text-cyan-400"
            padLeft
          />
        </div>
      </motion.div>
    );
  },
);

interface SummaryColumnProps {
  icon: React.ReactNode;
  value: string;
  label: string;
  gradient: string;
  toneClass: string;
  padLeft?: boolean;
}

function SummaryColumn({ icon, value, label, gradient, toneClass, padLeft }: SummaryColumnProps) {
  return (
    <div className={cn('flex items-center gap-3 py-3 sm:py-1', padLeft && 'sm:pl-6')}>
      <span
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-lg',
          toneClass,
        )}
        style={{ background: gradient, boxShadow: '0 4px 16px rgba(236,72,153,0.3)' }}
        aria-hidden
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
          {label}
        </p>
        <p className="text-[24px] font-extrabold leading-none tracking-[-0.02em] tabular-nums bg-gradient-to-r from-[var(--text-primary)] to-[var(--text-secondary)] bg-clip-text text-transparent">
          {value}
        </p>
      </div>
    </div>
  );
}
