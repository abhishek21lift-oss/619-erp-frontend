'use client';

import * as React from 'react';
import { cn } from '@/components/ui/cn';

export interface ChartDataTableColumn {
  header: React.ReactNode;
  /** Defaults to left for the row header, right for every value column. */
  align?: 'left' | 'right';
}

export interface ChartDataTableRow {
  key: string;
  cells: React.ReactNode[];
}

export interface ChartDataTableProps {
  /** Visible heading above the table. */
  title: React.ReactNode;
  /** Screen-reader caption describing the table's contents. */
  caption: string;
  columns: ChartDataTableColumn[];
  rows: ChartDataTableRow[];
  footer?: React.ReactNode[];
  emptyMessage?: string;
  className?: string;
}

/**
 * The accessible equivalent of a chart: the same figures in a real table,
 * with a caption, column scopes and row headers. Every chart ships one directly
 * below it, the way Revenue Analytics pairs its monthly bars with a breakdown.
 */
export function ChartDataTable({
  title,
  caption,
  columns,
  rows,
  footer,
  emptyMessage = 'No data for this period.',
  className,
}: ChartDataTableProps) {
  return (
    <section
      className={cn('overflow-hidden rounded-2xl border', className)}
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
    >
      <div className="border-b px-4 py-3 sm:px-5" style={{ borderColor: 'var(--border)' }}>
        <h3 className="text-[13.5px] font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
      </div>

      {rows.length === 0 ? (
        <p role="status" className="px-4 py-5 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
          {emptyMessage}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12.5px]" style={{ minWidth: 320 }}>
            <caption className="sr-only">{caption}</caption>
            <thead>
              <tr style={{ color: 'var(--text-muted)' }}>
                {columns.map((col, i) => {
                  const align = col.align ?? (i === 0 ? 'left' : 'right');
                  return (
                    <th
                      key={i}
                      scope="col"
                      className={cn(
                        'px-3 py-2 text-[10px] font-bold uppercase tracking-wider',
                        align === 'right' ? 'text-right' : 'text-left',
                      )}
                      style={{ borderBottom: '1px solid var(--border)' }}
                    >
                      {col.header}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key}>
                  {row.cells.map((cell, i) => {
                    const align = columns[i]?.align ?? (i === 0 ? 'left' : 'right');
                    const className = cn(
                      'px-3 py-2',
                      align === 'right' ? 'text-right tabular-nums' : 'text-left',
                    );
                    const style = {
                      borderBottom: '1px solid var(--border)',
                      color: i === 0 ? 'var(--text-primary)' : 'var(--text-secondary)',
                    };
                    return i === 0 ? (
                      <th key={i} scope="row" className={cn(className, 'font-semibold')} style={style}>{cell}</th>
                    ) : (
                      <td key={i} className={className} style={style}>{cell}</td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            {footer && (
              <tfoot>
                <tr>
                  {footer.map((cell, i) => {
                    const align = columns[i]?.align ?? (i === 0 ? 'left' : 'right');
                    const className = cn(
                      'px-3 py-2.5 font-bold',
                      align === 'right' ? 'text-right tabular-nums' : 'text-left',
                    );
                    return i === 0 ? (
                      <th key={i} scope="row" className={className} style={{ color: 'var(--text-primary)' }}>{cell}</th>
                    ) : (
                      <td key={i} className={className} style={{ color: 'var(--text-primary)' }}>{cell}</td>
                    );
                  })}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </section>
  );
}
