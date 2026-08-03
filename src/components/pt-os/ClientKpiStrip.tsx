'use client';

/**
 * The four numbers at the top of the client list.
 *
 * ── What this replaces ─────────────────────────────────────────────────────
 *
 * Four separate cards in a 2×2 grid. Measured in a browser at 430px, the block
 * was 296px tall — most of a phone's first screen spent before a single client
 * appeared, on a page whose entire subject is the client list. It is one object
 * with four columns now: 139px at 430px, 78px from sm up.
 *
 * ── Three things went, and why ─────────────────────────────────────────────
 *
 * Each card carried a pill beside its icon, laid out with justify-between. On a
 * narrow card a long pill had nowhere to go: "Combined PT revenue" wrapped out
 * of its own background. Those pills also only restated their labels —
 * "Combined PT revenue" under Total Revenue, "Amounts collected" under Total
 * Paid, "Pending dues" under Total Balance — so removing them costs nothing.
 * "3 active" is the one that says something the number above it does not, so it
 * stays, on the value's baseline rather than as a third line.
 *
 * The 40px gradient icon chips went too. Four of them is four focal points
 * competing with each other and with the list below; a 6px dot carries the same
 * colour coding at a scale that suits a summary.
 *
 * And "Total" came off every label. Grouped together under one border, four
 * labels reading Total/Total/Total/Total is noise.
 *
 * ── Why 2×2 on mobile and not four across ──────────────────────────────────
 *
 * Four columns on a 430px phone leaves about 77px of usable width per cell.
 * ₹90,000 fits. ₹1,25,00,000 — an ordinary figure for a studio having a good
 * year — does not. The 2×2 was verified against that value rather than against
 * the numbers that happened to be on screen.
 */

import type { ReactNode } from 'react';

export interface ClientKpiSummary {
  total: number;
  revenue: number;
  paid: number;
  balance: number;
}

export interface ClientKpiStripProps {
  /** null while loading — every value renders as an em dash. */
  summary: ClientKpiSummary | null;
  /** Shown beside the client count when non-zero. */
  activeCount?: number;
  /** The page owns the count-up animation; this renders whatever it is given. */
  renderValue?: (value: number, prefix: string) => ReactNode;
}

/** Blue, emerald and the two greys are decoration; only Balance's red means something. */
const DOT = {
  clients: '#0067E0',
  revenue: '#059669',
  paid: '#0059CE',
  balanceOwed: '#DC2626',
  balanceClear: '#94A3B8',
} as const;

export default function ClientKpiStrip({
  summary, activeCount = 0, renderValue,
}: ClientKpiStripProps) {
  const balance = summary?.balance ?? 0;
  const owed = balance > 0;

  const cells = [
    { key: 'clients', label: 'Clients', value: summary?.total ?? 0, prefix: '',
      dot: DOT.clients, suffix: activeCount > 0 ? `${activeCount} active` : null },
    { key: 'revenue', label: 'Revenue', value: summary?.revenue ?? 0, prefix: '₹',
      dot: DOT.revenue, suffix: null },
    { key: 'paid', label: 'Paid', value: summary?.paid ?? 0, prefix: '₹',
      dot: DOT.paid, suffix: null },
    // The one cell whose colour carries information. A balance owed is a
    // problem; a balance of zero is the goal. Colouring it red either way would
    // make the signal mean nothing.
    { key: 'balance', label: 'Balance', value: balance, prefix: '₹',
      dot: owed ? DOT.balanceOwed : DOT.balanceClear, danger: owed, suffix: null },
  ];

  return (
    <div
      className="grid grid-cols-2 overflow-hidden rounded-[18px] sm:grid-cols-4"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-xs)',
      }}
    >
      {cells.map((k, i) => (
        <div
          key={k.key}
          data-kpi={k.key}
          className="px-3.5 py-3 sm:px-4 sm:py-3.5"
          style={{
            // Hairlines drawn per cell, so the 2×2 and the 4×1 both come out
            // right without a second set of markup. On sm+ every cell but the
            // first gets a left border and none gets a top one.
            borderLeft: i % 2 === 0 ? undefined : '1px solid var(--border)',
            borderTop: i > 1 ? '1px solid var(--border)' : undefined,
          }}
        >
          <div className="flex items-center gap-1.5">
            <span aria-hidden className="h-[6px] w-[6px] shrink-0 rounded-full"
              style={{ background: k.dot }} />
            <span className="truncate text-[10px] font-[750] uppercase tracking-[0.07em]"
              style={{ color: 'var(--text-muted)' }}>
              {k.label}
            </span>
          </div>
          {/* tabular-nums so the four values align down the grid and the box
              does not resize on each frame of the count-up. */}
          <p
            className="mt-1 flex items-baseline gap-1.5 text-[19px] font-[800] tabular-nums tracking-[-0.02em] sm:text-[21px]"
            style={{ color: k.danger ? DOT.balanceOwed : 'var(--text-primary)' }}
          >
            {summary
              ? (renderValue ? renderValue(k.value, k.prefix) : `${k.prefix}${k.value.toLocaleString('en-IN')}`)
              : '—'}
            {k.suffix && (
              <span className="truncate text-[10.5px] font-[600] tracking-normal"
                style={{ color: 'var(--text-muted)' }}>
                {k.suffix}
              </span>
            )}
          </p>
        </div>
      ))}
    </div>
  );
}
