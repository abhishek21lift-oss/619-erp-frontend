'use client';

// Personal records, newest first.
//
// The one panel here a client would want to see. PR flags are computed at write
// time against everything logged before, so this only reads them — nothing is
// recomputed on the client, where it could disagree with the badge the trainer
// already saw on the gym floor.
//
// One entry per SET, however many records it broke. A set that is both a weight
// PR and a volume PR is one moment; listing it twice would inflate a timeline
// whose whole value is that its entries are rare.

import { Trophy } from 'lucide-react';
import type { WorkoutPr } from '@/lib/api';

/** Fixed per kind, so a kind keeps its colour down the list. */
const KIND_TONE: Record<string, string> = {
  weight: '#d97706', reps: '#2563eb', volume: '#7c3aed',
};

export default function PrTimeline({ prs, limit = 12 }: { prs: WorkoutPr[]; limit?: number }) {
  return (
    <div className="rounded-[20px] p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-[8px]"
          style={{ background: 'rgba(217,119,6,0.14)', color: '#d97706' }}>
          <Trophy size={14} />
        </div>
        <span className="text-[12.5px] font-[700]" style={{ color: 'var(--text-primary)' }}>
          Personal records
        </span>
      </div>

      {prs.length === 0 ? (
        <p className="py-4 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
          No records yet. The first completed set of any exercise sets one.
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {prs.slice(0, limit).map((p, i) => (
            <li
              key={`${p.session_date}-${p.exercise_name}-${i}`}
              className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 rounded-[12px] px-3 py-2.5"
              style={{ background: 'var(--bg-subtle)' }}
            >
              <div className="min-w-0">
                <p className="truncate text-[12.5px] font-[700]" style={{ color: 'var(--text-primary)' }}>
                  {p.exercise_name}
                </p>
                <div className="mt-0.5 flex flex-wrap gap-1">
                  {/* The kind is a word, not just a hue — the colours here are
                      decoration, and the label is what carries the meaning. */}
                  {p.kinds.map((k) => (
                    <span key={k} className="rounded-full px-1.5 py-0.5 text-[9.5px] font-[750] uppercase tracking-wide"
                      style={{ background: `${KIND_TONE[k]}1F`, color: KIND_TONE[k] }}>
                      {k}
                    </span>
                  ))}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[13px] font-[800]" style={{ color: 'var(--text-primary)' }}>
                  {p.weight_kg != null ? `${p.weight_kg} kg` : '—'}
                  {p.reps != null ? <span className="font-[650]" style={{ color: 'var(--text-muted)' }}> × {p.reps}</span> : null}
                </p>
                <p className="text-[10.5px]" style={{ color: 'var(--text-muted)' }}>{shortDate(p.session_date)}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function shortDate(d: string) {
  const dt = new Date(d);
  return Number.isNaN(dt.getTime())
    ? d
    : dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
