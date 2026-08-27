'use client';

import * as React from 'react';
import { navy } from '../theme/colors';
import { fontSize, fontWeight } from '../theme/typography';
import { radius } from '../theme/shape';
import { spacing } from '../theme/spacing';
import { legendChrome } from '../theme/chartStyle';
import type { Surface } from '../theme/surface';

export interface ChartLegendItem {
  label: string;
  color: string;
}

/**
 * The wrapped dot-and-label row every multi-series chart needs. One
 * implementation, used by PremiumBarChart, PremiumLineChart, PremiumAreaChart
 * and PremiumProgressChart's `action`/`footer` slots.
 */
export function ChartLegend({ items, surface = 'auto' }: { items: ChartLegendItem[]; surface?: Surface }) {
  if (!items.length) return null;
  const dark = surface === 'dark';
  return (
    <ul
      className="m-0 flex flex-wrap items-center p-0"
      style={{ listStyle: 'none', columnGap: spacing.legendGapX, rowGap: spacing.legendGapY }}
    >
      {items.map((item) => (
        <li key={item.label} className="flex items-center" style={{ gap: spacing.legendItemGap }}>
          <span
            aria-hidden
            className="flex-shrink-0"
            style={{
              width: legendChrome.swatchSize,
              height: legendChrome.swatchSize,
              borderRadius: radius.legendSwatch,
              background: item.color,
            }}
          />
          <span
            style={{
              fontSize: fontSize.sm,
              fontWeight: fontWeight.semibold,
              color: dark ? navy.body : 'var(--text-secondary)',
            }}
          >
            {item.label}
          </span>
        </li>
      ))}
    </ul>
  );
}
