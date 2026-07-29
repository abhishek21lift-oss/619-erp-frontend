'use client';

// Profile completion — a ring, a checklist, and the three things worth doing
// next.
//
// ── This component computes nothing ──────────────────────────────────────────
//
// The percentage, the item list and the next steps all arrive from one server
// call over one weight table. Deriving any of it here would let the ring and
// the list disagree about the same profile, and would tick the number up while
// someone types — before the server has accepted, trimmed or rejected anything.
// The score describes SAVED data, and this renders exactly what it is given.

import React from 'react';
import { CheckCircle2, Circle, ArrowRight, PartyPopper } from 'lucide-react';
import type { ProfileCompletion, ProfileTab } from '@/lib/api';

/** Where the ring stops feeling like a warning and starts feeling like progress. */
const TONE = (percent: number) =>
  (percent >= 90 ? { ring: '#10b981', soft: 'rgba(16,185,129,0.12)', text: '#047857' }
    : percent >= 60 ? { ring: '#6366f1', soft: 'rgba(99,102,241,0.12)', text: '#4f46e5' }
      : { ring: '#f59e0b', soft: 'rgba(245,158,11,0.14)', text: '#b45309' });

/**
 * The ring. An SVG circle with a dash offset — no chart library for one arc.
 *
 * `pathLength={100}` makes the dash array a literal percentage, so the geometry
 * does not have to be recomputed if the radius ever changes.
 */
export function CompletionRing({ percent, size = 84 }: { percent: number; size?: number }) {
  const tone = TONE(percent);
  const stroke = 8;
  const r = (size - stroke) / 2;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img"
        aria-label={`Profile ${percent}% complete`}>
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="var(--border)" strokeWidth={stroke}
        />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={tone.ring} strokeWidth={stroke} strokeLinecap="round"
          pathLength={100} strokeDasharray={`${percent} 100`}
          // Start at twelve o'clock rather than three, which is where a
          // progress ring is read from.
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dasharray 600ms cubic-bezier(0.16,1,0.3,1)' }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="tabular-nums text-[19px] font-[820] tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>
          {percent}<span className="text-[12px] font-[700]">%</span>
        </span>
      </span>
    </div>
  );
}

export function CompletionPanel({ completion, onGoToTab }: {
  completion: ProfileCompletion;
  onGoToTab: (tab: ProfileTab) => void;
}) {
  const { percent, items, nextSteps } = completion;
  const tone = TONE(percent);
  const doneCount = items.filter((i) => i.done).length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <CompletionRing percent={percent} />
        <div className="min-w-0">
          <p className="text-[14px] font-[800] tracking-[-0.01em]" style={{ color: 'var(--text-primary)' }}>
            {percent === 100 ? 'Your profile is complete' : 'Finish your profile'}
          </p>
          <p className="mt-0.5 text-[12px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {doneCount} of {items.length} done.{' '}
            {percent === 100
              ? 'Everything a client would want to know is filled in.'
              : 'The steps below are ordered by how much they add.'}
          </p>
        </div>
      </div>

      {nextSteps.length > 0 ? (
        <div className="flex flex-col gap-2">
          {nextSteps.map((s) => (
            <button
              key={s.key}
              onClick={() => onGoToTab(s.tab)}
              className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-left transition-colors hover:bg-[var(--bg-hover)]"
              style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
            >
              <Circle size={15} className="shrink-0" style={{ color: tone.ring }} />
              <span className="min-w-0 flex-1 text-[12.5px] font-[620]" style={{ color: 'var(--text-primary)' }}>
                {s.label}
              </span>
              {/* The weight is shown because it is the reason this step is
                  above the others — hiding it makes the order look arbitrary. */}
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-[750] tabular-nums"
                style={{ background: tone.soft, color: tone.text }}
              >
                +{s.weight}%
              </span>
              <ArrowRight size={13} className="shrink-0" style={{ color: 'var(--text-disabled)' }} />
            </button>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2.5 rounded-xl px-3.5 py-3"
          style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.24)' }}>
          <PartyPopper size={15} className="shrink-0" style={{ color: '#047857' }} />
          <span className="text-[12.5px] font-[650]" style={{ color: '#047857' }}>
            Nothing left to fill in.
          </span>
        </div>
      )}

      {/* The full checklist, so the percentage is auditable rather than a
          number the page asserts. */}
      <details>
        <summary className="cursor-pointer list-none text-[11.5px] font-[700]" style={{ color: 'var(--brand)' }}>
          Show everything counted
        </summary>
        <ul className="mt-3 flex flex-col gap-1.5">
          {items.map((i) => (
            <li key={i.key} className="flex items-center gap-2.5 text-[12px]">
              {i.done
                ? <CheckCircle2 size={13} className="shrink-0" style={{ color: '#10b981' }} />
                : <Circle size={13} className="shrink-0" style={{ color: 'var(--text-disabled)' }} />}
              <span className="min-w-0 flex-1" style={{ color: i.done ? 'var(--text-muted)' : 'var(--text-secondary)' }}>
                {i.label}
              </span>
              <span className="shrink-0 tabular-nums text-[11px]" style={{ color: 'var(--text-disabled)' }}>
                {i.weight}%
              </span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
