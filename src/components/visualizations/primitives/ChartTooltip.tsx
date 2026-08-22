'use client';

import * as React from 'react';
import { navy } from '../theme/colors';
import { fontFamily, fontSize, fontWeight, letterSpacing } from '../theme/typography';
import { radius, shadow } from '../theme/shape';
import { spacing } from '../theme/spacing';
import { tooltipChrome } from '../theme/chartStyle';
import type { Surface } from '../theme/surface';

/**
 * The one tooltip design in the system. Every Premium* component's `tooltip`
 * render prop constructs a <ChartTooltipCard> instead of styling its own —
 * this is what "premium tooltips" and "no duplicated chart styling" cash out
 * to: one glass card, one shadow recipe, reused by all seven chart types and
 * both surfaces. Every value below is a theme token.
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
        fontFamily: fontFamily.sans,
        fontSize: fontSize.base,
        minWidth: tooltipChrome.minWidth,
        borderRadius: radius.tooltip,
        padding: spacing.tooltipPadding,
        background: dark ? 'rgba(16,27,48,0.96)' : 'var(--bg-elevated, #fff)',
        border: `1px solid ${dark ? navy.line : 'var(--border, rgba(15,23,42,0.08))'}`,
        boxShadow: dark ? shadow.tooltipDark : shadow.tooltip,
        backdropFilter: `blur(${tooltipChrome.blur}px)`,
        WebkitBackdropFilter: `blur(${tooltipChrome.blur}px)`,
      }}
    >
      {heading && (
        <div
          style={{
            marginBottom: spacing.tooltipRowGap + 2,
            fontSize: fontSize.xs,
            fontWeight: fontWeight.bold,
            letterSpacing: letterSpacing.wide,
            textTransform: 'uppercase',
            color: dark ? navy.faint : 'var(--text-muted, #64748b)',
          }}
        >
          {heading}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.tooltipRowGap }}>
        {rows.map((row, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: spacing.tooltipItemGap }}>
            {row.color && (
              <span
                aria-hidden
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: radius.tooltipDot,
                  background: row.color,
                  flexShrink: 0,
                  boxShadow: dark ? shadow.dotRingDark : shadow.dotRing,
                }}
              />
            )}
            <span
              style={{
                color: dark ? navy.body : 'var(--text-muted, #64748b)',
                fontWeight: fontWeight.medium,
              }}
            >
              {row.label}
            </span>
            <span
              style={{
                marginLeft: 'auto',
                paddingLeft: spacing.tooltipValueGap,
                fontFamily: fontFamily.mono,
                fontWeight: fontWeight.bold,
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
