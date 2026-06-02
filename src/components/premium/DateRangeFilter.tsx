'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Calendar, ChevronDown } from 'lucide-react';
import { cn } from '@/components/ui/cn';

const RANGES = ['Today', 'Last 7 Days', 'Last 15 Days', 'Last 30 Days', 'Last 90 Days', 'Custom'] as const;
type RangeValue = (typeof RANGES)[number];

export interface DateRangeFilterProps {
  value: string;
  onChange: (value: string) => void;
  customRange?: { from: Date; to: Date };
  onCustomRangeChange?: (range: { from: Date; to: Date }) => void;
  className?: string;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export const DateRangeFilter = React.forwardRef<HTMLDivElement, DateRangeFilterProps>(
  function DateRangeFilter({ value, onChange, customRange, onCustomRangeChange, className }, ref) {
    const [open, setOpen] = React.useState(false);
    const [from, setFrom] = React.useState<string>(
      customRange?.from ? customRange.from.toISOString().slice(0, 10) : '',
    );
    const [to, setTo] = React.useState<string>(
      customRange?.to ? customRange.to.toISOString().slice(0, 10) : '',
    );
    const popoverRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      if (!open) return;
      const handler = (e: MouseEvent) => {
        if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
          setOpen(false);
        }
      };
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const isCustomActive = value === 'Custom';

    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-1 backdrop-blur-xl shadow-sm',
          className,
        )}
        role="tablist"
        aria-label="Date range"
      >
        {RANGES.map((r) => {
          const isActive = value === r;
          if (r === 'Custom') {
            return (
              <div key={r} className="relative" ref={popoverRef}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => {
                    setOpen((o) => !o);
                    if (!isActive) onChange(r);
                  }}
                  className={cn(
                    'relative z-10 inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-[13px] font-semibold transition-colors duration-200',
                    isActive
                      ? 'text-white'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="active-date-pill"
                      className="absolute inset-0 -z-10 rounded-xl bg-[var(--brand)] shadow-[0_4px_16px_var(--brand-glow)]"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    />
                  )}
                  <Calendar size={13} strokeWidth={2.2} />
                  {customRange?.from && customRange?.to
                    ? `${formatDate(customRange.from)} – ${formatDate(customRange.to)}`
                    : r}
                  <ChevronDown
                    size={12}
                    strokeWidth={2.5}
                    className={cn('transition-transform duration-200', open && 'rotate-180')}
                  />
                </button>
                {open && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute right-0 z-20 mt-2 w-[280px] rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.18)]"
                    role="dialog"
                    aria-label="Custom date range"
                  >
                    <div className="space-y-3">
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                        From
                        <input
                          type="date"
                          value={from}
                          onChange={(e) => setFrom(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-[var(--border-2)] bg-[var(--bg-card)] px-3 py-2 text-[13px] text-[var(--text-primary)] focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-soft)]"
                        />
                      </label>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                        To
                        <input
                          type="date"
                          value={to}
                          onChange={(e) => setTo(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-[var(--border-2)] bg-[var(--bg-card)] px-3 py-2 text-[13px] text-[var(--text-primary)] focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-soft)]"
                        />
                      </label>
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setOpen(false)}
                          className="rounded-lg px-3 py-1.5 text-[12px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={!from || !to}
                          onClick={() => {
                            if (from && to && onCustomRangeChange) {
                              onCustomRangeChange({ from: new Date(from), to: new Date(to) });
                            }
                            setOpen(false);
                          }}
                          className="rounded-lg bg-[var(--brand)] px-3 py-1.5 text-[12px] font-semibold text-white shadow-[0_4px_12px_var(--brand-glow)] disabled:opacity-50"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            );
          }
          return (
            <button
              key={r}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(r)}
              className={cn(
                'relative z-10 inline-flex items-center rounded-xl px-3.5 py-1.5 text-[13px] font-semibold transition-colors duration-200',
                isActive
                  ? 'text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="active-date-pill"
                  className="absolute inset-0 -z-10 rounded-xl bg-[var(--brand)] shadow-[0_4px_16px_var(--brand-glow)]"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}
              {r}
            </button>
          );
        })}
      </div>
    );
  },
);
