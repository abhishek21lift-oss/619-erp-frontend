'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/components/ui/cn';

interface Column<T> {
  key: string;
  header: string;
  render: (item: T, index: number) => React.ReactNode;
  className?: string;
  sortable?: boolean;
}

interface PremiumTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  className?: string;
  emptyMessage?: string;
  loading?: boolean;
}

export function PremiumTable<T>({
  columns,
  data,
  keyExtractor,
  className,
  emptyMessage = 'No data available',
  loading,
}: PremiumTableProps<T>) {
  if (loading) {
    return (
      <div className={cn('space-y-3', className)}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 rounded-[16px] bg-white/60 p-4 backdrop-blur-sm">
            {columns.map((col) => (
              <div key={col.key} className="h-5 flex-1 animate-pulse rounded bg-zinc-200" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[16px] bg-zinc-50">
          <svg className="h-6 w-6 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
        <p className="text-sm font-medium text-zinc-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {data.map((item, index) => (
        <motion.div
          key={keyExtractor(item)}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.03, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            'flex items-center gap-4 rounded-[16px] bg-white/70 px-5 py-4 backdrop-blur-sm',
            'border border-white/60 transition-all duration-200 hover:bg-white/90 hover:shadow-sm',
          )}
        >
          {columns.map((col) => (
            <div key={col.key} className={cn('flex-1 min-w-0', col.className)}>
              {col.render(item, index)}
            </div>
          ))}
        </motion.div>
      ))}
    </div>
  );
}
