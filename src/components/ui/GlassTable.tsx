'use client';

import * as React from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { cn } from './cn';

export interface GlassTableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  containerClassName?: string;
  /** Stick the thead to the top while scrolling */
  stickyHeader?: boolean;
}

export function GlassTable({
  className,
  containerClassName,
  stickyHeader = false,
  children,
  ...props
}: GlassTableProps) {
  return (
    <div
      className={cn(
        'w-full overflow-hidden rounded-[var(--radius-lg,20px)]',
        'border border-[var(--border)] bg-[var(--bg-card)]',
        'shadow-[var(--shadow-card)]',
        containerClassName,
      )}
    >
      <div className={cn('w-full overflow-x-auto', stickyHeader && 'overflow-y-auto')}>
        <table className={cn('w-full border-collapse text-left', className)} {...props}>
          {children}
        </table>
      </div>
    </div>
  );
}

export function GlassThead({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn(
        'border-b border-[var(--border)]',
        'bg-[var(--bg-subtle)] backdrop-blur-sm',
        'text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]',
        className,
      )}
      {...props}
    />
  );
}

export function GlassTh({
  className,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn('px-4 py-3 font-bold text-[var(--text-muted)]', className)}
      {...props}
    />
  );
}

interface GlassTrProps extends React.HTMLAttributes<HTMLTableRowElement> {
  /** Animate row entrance. Wrap tbody rows to enable. */
  animate?: boolean;
  index?: number;
}

export function GlassTr({ className, animate, index = 0, ...props }: GlassTrProps) {
  if (animate) {
    return (
      <m.tr
        className={cn(
          'border-b border-[var(--border)] transition-colors last:border-0',
          'hover:bg-[var(--bg-hover)]',
          className,
        )}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.22,
          delay: index * 0.025,
          ease: [0.21, 0.47, 0.32, 0.98],
        }}
        {...(props as React.ComponentPropsWithoutRef<typeof m.tr>)}
      />
    );
  }

  return (
    <tr
      className={cn(
        'border-b border-[var(--border)] transition-colors last:border-0',
        'hover:bg-[var(--bg-hover)]',
        className,
      )}
      {...props}
    />
  );
}

export function GlassTd({
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn(
        'px-4 py-3 text-[13px] text-[var(--text-primary)]',
        className,
      )}
      {...props}
    />
  );
}

/** Convenience wrapper: animated tbody that fades in all rows with staggered entrance */
export function GlassTbody({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={cn(className)} {...props}>
      {children}
    </tbody>
  );
}
