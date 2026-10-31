'use client';

/**
 * One scored client on the at-risk list.
 *
 * The row shows the score, every reason that produced it with its points, and
 * the single next action the service chose — never a paraphrase, so the trainer
 * can check the maths before picking up the phone. Marking is optimistic-free:
 * the page refetches after the server confirms, and the row stays put on error.
 */

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui';
import { palette, rgba } from '@/lib/palette';
import type { ChurnBand, ChurnRiskRow } from '@/lib/api';

const BAND: Record<ChurnBand, { label: string; color: string; fill: string }> = {
  critical: { label: 'Critical', color: 'var(--danger-text)', fill: rgba(palette.red[500], 0.10) },
  high:     { label: 'High',     color: 'var(--warning-text)', fill: rgba(palette.amber[500], 0.14) },
  medium:   { label: 'Medium',   color: 'var(--text-secondary)', fill: rgba(palette.indigo[500], 0.08) },
  low:      { label: 'Low',      color: 'var(--text-muted)', fill: 'var(--bg-subtle)' },
};

/** Local calendar day, so the picker agrees with the trainer's own clock. */
function addDaysYmd(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function termLabel(term: ChurnRiskRow['term']): string | null {
  if (term.state === 'unknown' || !term.end) return null;
  if (term.state === 'ended') return `term ended ${term.end}`;
  const left = term.days_left ?? 0;
  return left === 0 ? 'term ends today' : `${left} day${left === 1 ? '' : 's'} left on term`;
}

export default function ChurnRow({ row, onMark, busy }: {
  row: ChurnRiskRow;
  onMark: (id: string, outcome: 'contacted' | 'snoozed', date?: string) => Promise<void>;
  busy: boolean;
}) {
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [snoozeDate, setSnoozeDate] = useState(() => addDaysYmd(7));
  const tone = BAND[row.band];
  const term = termLabel(row.term);
  const lastTrained = row.last_session
    ? `last trained ${row.days_quiet} day${row.days_quiet === 1 ? '' : 's'} ago`
    : 'no completed session on record';

  return (
    <article
      className="border-t border-[var(--border)] px-4 py-4 first:border-t-0 sm:px-5"
    >
      <div className="flex flex-wrap items-start gap-3">
        <span
          className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-[13px]"
          style={{ background: tone.fill, color: tone.color }}
          aria-label={`Risk score ${row.score} of 100`}
        >
          <span className="text-[16px] font-[800] leading-none tabular-nums">{row.score}</span>
          <span className="mt-0.5 text-[9px] font-[750] uppercase tracking-[0.06em]">score</span>
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link
              href={`/pt-os/clients/${row.client_id}`}
              className="text-[14px] font-[760] hover:underline"
              style={{ color: 'var(--text-primary)' }}
            >
              {row.client_name}
            </Link>
            <span
              className="rounded-full px-2 py-[3px] text-[10.5px] font-[700]"
              style={{ background: tone.fill, color: tone.color }}
            >
              {tone.label}
            </span>
            {row.risk_increased && (
              <span
                className="rounded-full px-2 py-[3px] text-[10.5px] font-[700]"
                style={{ background: rgba(palette.red[500], 0.10), color: 'var(--danger-text)' }}
              >
                Risk rose since you acted
              </span>
            )}
            {row.outcome && row.hide_until && (
              <span
                className="rounded-full px-2 py-[3px] text-[10.5px] font-[700]"
                style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
              >
                {row.outcome} until {row.hide_until}
              </span>
            )}
          </div>

          <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
            {row.reasons.map((r) => (
              <li key={r.code} className="text-[12px] font-[650]" style={{ color: tone.color }}>
                {r.label} <span style={{ color: 'var(--text-muted)' }}>(+{r.points})</span>
              </li>
            ))}
          </ul>

          {row.next_action && (
            <p className="mt-1.5 text-[12px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {row.next_action}
            </p>
          )}

          <p className="mt-1 text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {lastTrained}
            {term ? ` \u00b7 ${term}` : ''}
            {row.balance_amount > 0 ? ` \u00b7 \u20b9${row.balance_amount.toLocaleString('en-IN')} due` : ''}
          </p>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <Button size="sm" disabled={busy} loading={busy} onClick={() => onMark(row.client_id, 'contacted')}>
            Mark contacted
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            aria-expanded={snoozeOpen}
            onClick={() => setSnoozeOpen((v) => !v)}
          >
            Snooze
          </Button>
        </div>
      </div>

      {snoozeOpen && (
        <div className="mt-2.5 flex flex-wrap items-end gap-2 sm:pl-[56px]">
          <label className="text-[11px] font-[650]" style={{ color: 'var(--text-muted)' }}>
            Hide until
            <input
              type="date"
              value={snoozeDate}
              min={addDaysYmd(1)}
              max={addDaysYmd(90)}
              onChange={(e) => setSnoozeDate(e.target.value)}
              className="ml-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-2 py-1.5 text-[12px]"
              style={{ color: 'var(--text-primary)' }}
            />
          </label>
          <Button
            size="sm"
            variant="outline"
            disabled={busy || !snoozeDate}
            onClick={() => onMark(row.client_id, 'snoozed', snoozeDate)}
          >
            Save snooze
          </Button>
        </div>
      )}
    </article>
  );
}
