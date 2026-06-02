'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { IndianRupee, Users, RefreshCcw } from 'lucide-react';
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
          'relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-6 backdrop-blur-xl',
          'shadow-[0_10px_40px_rgba(0,0,0,0.08)]',
          className,
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-[#3B82F6]/10 via-[#8B5CF6]/10 to-[#06B6D4]/10"
        />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              Today's Business
            </p>
            <p className="mt-1 text-[14px] font-semibold text-[var(--text-primary)]">
              Real-time snapshot of your day
            </p>
          </div>
          <span
            className="inline-flex h-2.5 w-2.5 rounded-full bg-[var(--success)] animate-pulse"
            aria-hidden
          />
        </div>
        <div className="relative mt-5 grid grid-cols-1 divide-y divide-[var(--border)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <SummaryColumn
            icon={<IndianRupee size={18} strokeWidth={2.2} />}
            value={formatINR(revenue)}
            label="Revenue"
            gradient="linear-gradient(135deg, #2563EB, #60A5FA)"
            toneClass="text-[var(--brand)]"
          />
          <SummaryColumn
            icon={<Users size={18} strokeWidth={2.2} />}
            value={newClients.toLocaleString('en-IN')}
            label="New Clients"
            gradient="linear-gradient(135deg, #7C3AED, #A855F7)"
            toneClass="text-[var(--accent)]"
            padLeft
          />
          <SummaryColumn
            icon={<RefreshCcw size={18} strokeWidth={2.2} />}
            value={renewals.toLocaleString('en-IN')}
            label="Renewals"
            gradient="linear-gradient(135deg, #16A34A, #4ADE80)"
            toneClass="text-[var(--success)]"
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
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white',
          toneClass,
        )}
        style={{ background: gradient }}
        aria-hidden
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
          {label}
        </p>
        <p className="text-[22px] font-extrabold leading-none tracking-[-0.02em] tabular-nums text-[var(--text-primary)]">
          {value}
        </p>
      </div>
    </div>
  );
}
