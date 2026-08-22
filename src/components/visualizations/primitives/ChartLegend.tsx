'use client';

import * as React from 'react';
import { navy } from '../theme';
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
    <ul className="m-0 flex flex-wrap items-center gap-x-4 gap-y-1.5 p-0" style={{ listStyle: 'none' }}>
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="h-2.5 w-2.5 flex-shrink-0 rounded-[3px]"
            style={{ background: item.color }}
          />
          <span
            className="text-[11px] font-semibold"
            style={{ color: dark ? navy.body : 'var(--text-secondary)' }}
          >
            {item.label}
          </span>
        </li>
      ))}
    </ul>
  );
}
