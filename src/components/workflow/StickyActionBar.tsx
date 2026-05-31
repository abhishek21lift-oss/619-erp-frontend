'use client';
import { ReactNode } from 'react';
import { motion } from 'framer-motion';

export interface StickyActionBarProps {
  total?: string | number;
  hideTotal?: boolean;
  label?: string;
  icon?: ReactNode;
  saving?: boolean;
  onCancel?: () => void;
  totalLabel?: string;
  helperText?: string;
  primaryLabel?: string;
  primaryDisabled?: boolean;
  primaryLoading?: boolean;
  onPrimary?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  alert?: ReactNode;
}

export function StickyActionBar({
  total,
  hideTotal = false,
  label,
  icon,
  saving,
  onCancel,
  totalLabel = 'Total Payable',
  helperText,
  primaryLabel,
  primaryDisabled,
  primaryLoading,
  onPrimary,
  secondaryLabel,
  onSecondary,
  alert,
}: StickyActionBarProps) {
  const resolvedPrimaryLabel = label ?? primaryLabel ?? 'Submit';
  const resolvedPrimaryLoading = saving ?? primaryLoading ?? false;
  const resolvedSecondaryLabel = secondaryLabel ?? (onCancel ? 'Cancel' : undefined);
  const resolvedOnSecondary = onSecondary ?? onCancel;
  const resolvedOnPrimary = onPrimary ?? (() => {});

  const resolvedTotal = hideTotal ? undefined
    : typeof total === 'number'
      ? `\u20b9 ${total.toLocaleString('en-IN')}`
      : total;

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.15, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/60 bg-white/90 backdrop-blur-xl shadow-[0_-8px_32px_rgba(15,23,42,0.08)] px-4 py-3 dark:border-white/10 dark:bg-[#1A1B1E]/95 dark:shadow-[0_-8px_32px_rgba(0,0,0,0.3)]"
    >
      <div className="max-w-[1180px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>
          {resolvedTotal && (
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-slate-500 font-medium dark:text-white/50">{totalLabel}</span>
              <motion.span
                key={resolvedTotal}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-2xl font-bold text-red-600"
              >
                {resolvedTotal}
              </motion.span>
            </div>
          )}
          {helperText && <p className="text-xs text-slate-500 mt-0.5 dark:text-white/50">{helperText}</p>}
          {alert}
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {resolvedSecondaryLabel && resolvedOnSecondary && (
            <button
              type="button"
              onClick={resolvedOnSecondary}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors dark:text-white/60 dark:bg-white/10 dark:hover:bg-white/15"
            >
              {resolvedSecondaryLabel}
            </button>
          )}
          <button
            type="submit"
            onClick={onPrimary ? resolvedOnPrimary : undefined}
            disabled={primaryDisabled || resolvedPrimaryLoading}
            className="flex-1 sm:flex-none px-7 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 active:scale-[0.98] transition-all shadow-[0_4px_14px_rgba(220,38,38,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resolvedPrimaryLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Saving…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                {icon && <span className="flex items-center">{icon}</span>}
                {resolvedPrimaryLabel}
              </span>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
