'use client';

import * as React from 'react';
import { navy, typography } from '../theme';
import type { Surface } from '../theme/surface';

/**
 * The one tooltip design in the system. Every Premium* component's `tooltip`
 * render prop constructs a <ChartTooltipCard> instead of styling its own —
 * this is what "premium tooltips" and "no duplicated chart styling" cash out
 * to: one glass card, one shadow recipe, reused by all seven chart types and
 * both surfaces.
 */

export interface ChartTooltipRow {
  label: string;
  value: React.ReactNode;
  color?: string;
}

export interface ChartTooltipCardProps {
  /** The header line — a category, a date, an x-axis value. */
  heading?: React.ReactNode;
  rows: ChartTooltipRow[];
  surface?: Surface;
}

export function ChartTooltipCard({ heading, rows, surface = 'auto' }: ChartTooltipCardProps) {
  const dark = surface === 'dark';
  return (
    <div
      role="tooltip"
      style={{
        fontFamily: typography.sans,
        fontSize: typography.size.base,
        minWidth: 140,
        borderRadius: 12,
        padding: '10px 12px',
        background: dark ? 'rgba(16,27,48,0.96)' : 'var(--bg-elevated, #fff)',
        border: `1px solid ${dark ? navy.line : 'var(--border, rgba(15,23,42,0.08))'}`,
        boxShadow: dark
          ? '0 16px 40px -12px rgba(0,0,0,0.6)'
          : '0 16px 40px -12px rgba(15,23,42,0.22)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      {heading && (
        <div
          style={{
            marginBottom: 6,
            fontSize: typography.size.xs,
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: dark ? navy.faint : 'var(--text-muted, #64748b)',
          }}
        >
          {heading}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {rows.map((row, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {row.color && (
              <span
                aria-hidden
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: row.color,
                  flexShrink: 0,
                  boxShadow: `0 0 0 2px ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.03)'}`,
                }}
              />
            )}
            <span
              style={{
                color: dark ? navy.body : 'var(--text-muted, #64748b)',
                fontWeight: 500,
              }}
            >
              {row.label}
            </span>
            <span
              style={{
                marginLeft: 'auto',
                paddingLeft: 16,
                fontFamily: typography.mono,
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
                color: dark ? navy.ink : 'var(--text-primary, #0f172a)',
              }}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
