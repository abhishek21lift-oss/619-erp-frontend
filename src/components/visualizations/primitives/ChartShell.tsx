'use client';

import * as React from 'react';
import { cn } from '@/components/ui/cn';
import { navy, shape, typography } from '../theme';
import type { Surface } from '../theme/surface';

export interface ChartShellProps {
  /** Card title. Omit for a chart meant to sit bare inside a page's own card. */
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  /** Right-aligned slot — a legend, a range picker, a "view all" link. */
  action?: React.ReactNode;
  /** Slot below the chart body — a legend row, a footnote. */
  footer?: React.ReactNode;
  /** Fixed plot height in px. Nivo's Responsive* components need a sized parent. */
  height: number;
  surface?: Surface;
  /**
   * Read by assistive tech in place of the (otherwise purely visual) SVG —
   * every Premium* component builds a sensible default and lets the caller
   * override it, the same rule KpiSparkline already followed.
   */
  ariaLabel?: string;
  /** Renders the card frame (border/background/padding) around the chart. */
  bordered?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * The one card frame every Premium* component renders into. Title row,
 * fixed-height plot area, optional footer — sized and spaced identically
 * everywhere, so "no duplicated chart styling" holds at the layout level too,
 * not just inside the SVG.
 */
export function ChartShell({
  title,
  subtitle,
  icon,
  action,
  footer,
  height,
  surface = 'auto',
  ariaLabel,
  bordered = true,
  className,
  children,
}: ChartShellProps) {
  const dark = surface === 'dark';

  return (
    <div
      className={cn('relative flex flex-col', className)}
      style={
        bordered
          ? {
              borderRadius: shape.radius,
              padding: shape.padding,
              background: dark
                ? `linear-gradient(155deg, ${navy.panel} 0%, ${navy.canvasAlt} 100%)`
                : 'var(--bg-card, #fff)',
              border: `1px solid ${dark ? navy.line : shape.border}`,
              boxShadow: dark ? '0 20px 48px -20px rgba(0,0,0,0.55)' : shape.shadow,
            }
          : undefined
      }
    >
      {(title || action) && (
        <div className="mb-3.5 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            {icon && (
              <span
                className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-[10px]"
                style={{
                  background: dark ? 'rgba(245,158,11,0.14)' : 'var(--brand-soft, rgba(245,158,11,0.10))',
                  color: dark ? '#FBBF24' : 'var(--brand, #F59E0B)',
                }}
              >
                {icon}
              </span>
            )}
            <div className="min-w-0">
              {title && (
                <h3
                  className="truncate text-[13.5px] font-[750]"
                  style={{ fontFamily: typography.sans, color: dark ? navy.ink : 'var(--text-primary)' }}
                >
                  {title}
                </h3>
              )}
              {subtitle && (
                <p
                  className="truncate text-[11.5px]"
                  style={{ color: dark ? navy.muted : 'var(--text-muted)' }}
                >
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {action && <div className="flex flex-shrink-0 items-center gap-2">{action}</div>}
        </div>
      )}

      <div role="img" aria-label={ariaLabel} style={{ height, width: '100%' }}>
        {children}
      </div>

      {footer && <div className="mt-3">{footer}</div>}
    </div>
  );
}
