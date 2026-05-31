'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ChevronRight } from 'lucide-react';
import { cn } from '@/components/ui/cn';

interface AIInsightCardProps {
  title: string;
  description: string;
  type?: 'positive' | 'negative' | 'neutral' | 'warning';
  action?: { label: string; onClick: () => void };
  className?: string;
  index?: number;
}

const TYPE_STYLES = {
  positive: { bg: 'from-emerald-500/10 to-emerald-500/5', border: 'border-emerald-200/60 dark:border-emerald-500/20', icon: 'text-emerald-600', dot: 'bg-emerald-500' },
  negative: { bg: 'from-red-500/10 to-red-500/5', border: 'border-red-200/60 dark:border-red-500/20', icon: 'text-red-600', dot: 'bg-red-500' },
  neutral:  { bg: 'from-blue-500/10 to-blue-500/5', border: 'border-blue-200/60 dark:border-blue-500/20', icon: 'text-blue-600', dot: 'bg-blue-500' },
  warning:  { bg: 'from-amber-500/10 to-amber-500/5', border: 'border-amber-200/60 dark:border-amber-500/20', icon: 'text-amber-600', dot: 'bg-amber-500' },
};

export function AIInsightCard({ title, description, type = 'neutral', action, className, index = 0 }: AIInsightCardProps) {
  const s = TYPE_STYLES[type];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'group relative overflow-hidden rounded-[20px] border bg-gradient-to-br p-5 backdrop-blur-xl',
        'transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg',
        s.bg, s.border,
        className,
      )}
    >
      <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-gradient-to-br from-white/40 to-transparent blur-2xl" />
      <div className="relative flex items-start gap-3">
        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-white/80 backdrop-blur-md dark:bg-white/10', s.icon)}>
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={cn('h-1.5 w-1.5 rounded-full', s.dot)} />
            <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">{title}</h4>
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-zinc-600 dark:text-white/60">{description}</p>
          {action && (
            <button
              onClick={action.onClick}
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-zinc-900 transition hover:gap-2 dark:text-white"
            >
              {action.label} <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
