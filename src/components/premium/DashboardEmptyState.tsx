'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { LayoutDashboard, Inbox } from 'lucide-react';
import { cn } from '@/components/ui/cn';

export interface DashboardEmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: { label: string; onClick: () => void };
  variant?: 'default' | 'compact';
  className?: string;
}

export const DashboardEmptyState = React.forwardRef<HTMLDivElement, DashboardEmptyStateProps>(
  function DashboardEmptyState(
    { title = 'No data available', description = 'Once activity comes in, your dashboard will populate here.', icon, action, variant = 'default', className },
    ref,
  ) {
    const isCompact = variant === 'compact';
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          'flex flex-col items-center justify-center rounded-3xl border border-dashed border-[var(--border-2)] bg-[var(--bg-card)] text-center backdrop-blur-xl',
          isCompact ? 'p-8' : 'p-12',
          className,
        )}
        role="status"
        aria-live="polite"
      >
        <div
          className={cn(
            'flex items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]',
            isCompact ? 'h-12 w-12' : 'h-16 w-16',
          )}
          aria-hidden
        >
          {icon ?? <LayoutDashboard size={isCompact ? 22 : 28} strokeWidth={1.5} />}
        </div>
        <h3
          className={cn(
            'mt-4 font-bold text-[var(--text-primary)]',
            isCompact ? 'text-[14px]' : 'text-[16px]',
          )}
        >
          {title}
        </h3>
        <p
          className={cn(
            'mt-1 max-w-[36ch] text-[var(--text-muted)]',
            isCompact ? 'text-[12px]' : 'text-[13px]',
          )}
        >
          {description}
        </p>
        {action && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={action.onClick}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-2 text-[12px] font-semibold text-white shadow-[0_4px_14px_var(--brand-glow)]"
          >
            <Inbox size={14} strokeWidth={2.2} />
            {action.label}
          </motion.button>
        )}
      </motion.div>
    );
  },
);
