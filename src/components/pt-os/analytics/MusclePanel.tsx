'use client';

// Weekly hard sets per muscle, and how long since each was trained.
//
// ── Two kinds of number, and why they must not look alike ─────────────────
//
// The set count is MEASURED — it is how many completed sets this client did.
// The range beside it is a JUDGEMENT the studio stored. They are different
// kinds of thing, and the usual way this screen goes wrong is printing them
// in the same weight so a trainer reads both as fact.
//
// So the count is the large figure and the range is small, muted, and labelled
// as the studio's. A muscle with no range gets no verdict — not a default
// "fine", which would be a judgement nobody made.
//
// ── What is deliberately NOT here ─────────────────────────────────────────
//
// No fatigue score, no recovery percentage, no readiness index. None of those
// has a measurement behind it in this system: there is no HRV, no sleep, no
// soreness rating. A number computed from "days since you trained chest" and
// dressed up as recovery would be an invented figure sitting beside real ones
// in the same typeface, and a trainer would have no way to tell them apart.
//
// What is shown instead is days since last trained, which is a fact, and is
// labelled as exactly that.

import { Activity, Info } from 'lucide-react';
import type { MuscleWeek } from '@/lib/api';

/** Status hues. Colour never carries the meaning alone — each has a word. */
const STATUS: Record<string, { tone: string; label: string }> = {
  below: { tone: '#d97706', label: 'below range' },
  within: { tone: '#059669', label: 'in range' },
  above: { tone: '#dc2626', label: 'above range' },
};

export interface MusclePanelProps {
  muscles: MuscleWeek[];
  unattributedSets: number;
  weeks: number;
  /** Opens the range editor. Omitted for a caller who cannot edit them. */
  onEditRanges?: () => void;
}

export default function MusclePanel({ muscles, unattributedSets, weeks, onEditRanges }: MusclePanelProps) {
  const max = Math.max(1, ...muscles.map((m) => Math.max(m.sets, m.mrv_sets ?? 0)));

  return (
    <div className="rounded-[20px] p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-[8px]"
            style={{ background: 'rgba(37,99,235,0.14)', color: '#2563eb' }}>
            <Activity size={14} />
          </div>
          <span className="text-[12.5px] font-[700]" style={{ color: 'var(--text-primary)' }}>
            Sets per muscle
          </span>
        </div>
        {onEditRanges && (
          <button
            type="button"
            onClick={onEditRanges}
            className="flex h-[44px] items-center rounded-[12px] px-3 text-[12px] font-[700]"
            style={{ color: 'var(--brand)' }}
          >
            Edit ranges
          </button>
        )}
      </div>
      <p className="mb-3 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
        Completed sets over the last {weeks} week{weeks === 1 ? '' : 's'}.
      </p>

      {muscles.length === 0 ? (
        <p className="py-4 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
          No completed sets logged yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {muscles.map((m) => {
            const s = m.status ? STATUS[m.status] : null;
            return (
              <li key={m.target_muscle}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[12.5px] font-[700] capitalize" style={{ color: 'var(--text-primary)' }}>
                    {m.target_muscle}
                  </span>
                  <span className="shrink-0 text-[11px] font-[650]" style={{ color: 'var(--text-muted)' }}>
                    {/* A fact, and named as one. Not "78% recovered". */}
                    {m.days_since == null ? '—'
                      : m.days_since === 0 ? 'trained today'
                        : `${m.days_since}d since`}
                  </span>
                </div>

                <div className="mt-1 flex items-center gap-2">
                  {/* The bar is the MEASUREMENT. The range is drawn as marks on
                      the track behind it, so the two never read as one value. */}
                  <div className="relative h-[10px] flex-1 overflow-hidden rounded-[5px]" style={{ background: 'var(--bg-subtle)' }}>
                    {m.mev_sets != null && (
                      <span className="absolute top-0 h-full w-[2px]"
                        style={{ left: `${(m.mev_sets / max) * 100}%`, background: 'var(--border)' }} />
                    )}
                    {m.mrv_sets != null && (
                      <span className="absolute top-0 h-full w-[2px]"
                        style={{ left: `${(m.mrv_sets / max) * 100}%`, background: 'var(--border)' }} />
                    )}
                    <div className="h-full rounded-[5px]"
                      style={{ width: `${Math.max(3, (m.sets / max) * 100)}%`, background: s?.tone ?? '#64748b' }} />
                  </div>
                  <span className="w-[34px] shrink-0 text-right text-[13px] font-[800]" style={{ color: 'var(--text-primary)' }}>
                    {m.sets}
                  </span>
                </div>

                <p className="mt-0.5 text-[10.5px]" style={{ color: 'var(--text-muted)' }}>
                  {/* Null status means the studio set no range for this muscle.
                      Saying so is the honest answer; a verdict would not be. */}
                  {s == null
                    ? 'No range set for this muscle'
                    : `${s.label} · your range ${m.mev_sets ?? '—'}–${m.mrv_sets ?? '—'} sets/week`}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      {/* Sets the log could not attribute. Dropping them silently would
          understate every muscle above by an unknown amount. */}
      {unattributedSets > 0 && (
        <p className="mt-3 flex items-start gap-1.5 border-t pt-3 text-[11px]"
          style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
          <Info size={12} className="mt-0.5 shrink-0" />
          {unattributedSets} set{unattributedSets === 1 ? '' : 's'} not counted above — those exercises
          have no muscle recorded in the library.
        </p>
      )}
    </div>
  );
}
