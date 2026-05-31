import * as React from 'react';
import { cn } from './cn';

export interface GlassTableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  containerClassName?: string;
}

export function GlassTable({ className, containerClassName, children, ...props }: GlassTableProps) {
  return (
    <div
      className={cn(
        'w-full overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--bg-card)] backdrop-blur-sm',
        containerClassName,
      )}
    >
      <table className={cn('w-full border-collapse text-left', className)} {...props}>
        {children}
      </table>
    </div>
  );
}

export function GlassThead({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn(
        'border-b border-[var(--border)] bg-[var(--bg-subtle)] text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]',
        className,
      )}
      {...props}
    />
  );
}

export function GlassTh({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn('px-4 py-3', className)} {...props} />;
}

export function GlassTr({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        'border-b border-[var(--border)] transition-colors last:border-0 hover:bg-[var(--bg-hover)]',
        className,
      )}
      {...props}
    />
  );
}

export function GlassTd({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn('px-4 py-3 text-[13px] text-[var(--text-primary)]', className)}
      {...props}
    />
  );
}
