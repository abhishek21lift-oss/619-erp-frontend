'use client';

// The screen at the end of a workout.
//
// ── Why finishing needs a screen at all ────────────────────────────────────
//
// Finishing used to be one tap that set status=completed, fired a toast and
// navigated away. Everything the session had just produced — volume moved,
// how much of the plan got done, whether anything was a personal best — was
// computed by the server, returned in the payload, and thrown away.
//
// This is also the only honest moment to ask for a trainer's note. Asking at
// the start gets nothing, because nothing has happened yet; asking later means
// remembering. Asking here, next to the numbers, is when the trainer still has
// the session in their head — and it is the difference between a note field
// that exists and one that gets filled in.
//
// ── Why the note is not mandatory ──────────────────────────────────────────
//
// A required field on the way out of a workout would be answered with "ok"
// forever, which is worse than empty: it looks like data. It is offered, with
// the numbers as the prompt, and skipping is one tap.

import { useEffect, useRef, useState } from 'react';
import { m } from 'framer-motion';
import { Check, Loader2, Timer, Trophy, X } from 'lucide-react';
import type { WorkoutSessionDetail } from '@/lib/api';

export interface SessionSummaryProps {
  session: WorkoutSessionDetail;
  open: boolean;
  onCancel: () => void;
  /** Persists duration + note, then marks the session completed. */
  onFinish: (patch: { notes: string | null; duration_minutes: number | null }) => Promise<void>;
}

export default function SessionSummary({ session, open, onCancel, onFinish }: SessionSummaryProps) {
  const s = session.summary;
  const [note, setNote] = useState(session.notes ?? '');
  const [minutes, setMinutes] = useState<string>(
    session.duration_minutes != null ? String(session.duration_minutes) : String(elapsedMinutes(session.created_at)),
  );
  const [saving, setSaving] = useState(false);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  // Adopt the stored values when the sheet opens, so reopening after a cancel
  // does not show a stale draft.
  useEffect(() => {
    if (!open) return;
    setNote(session.notes ?? '');
    setMinutes(session.duration_minutes != null
      ? String(session.duration_minutes)
      : String(elapsedMinutes(session.created_at)));
  }, [open, session.notes, session.duration_minutes, session.created_at]);

  if (!open) return null;

  const submit = async () => {
    setSaving(true);
    try {
      const n = Number(minutes);
      await onFinish({
        notes: note.trim() === '' ? null : note.trim(),
        duration_minutes: Number.isFinite(n) && n > 0 ? Math.round(n) : null,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      data-no-pull-refresh className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center"
      style={{ background: 'rgba(15,23,42,0.45)' }}
      onClick={onCancel}
      role="presentation"
    >
      <m.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        role="dialog"
        aria-modal="true"
        aria-label="Workout summary"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[24px] p-5 sm:rounded-[24px]"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[18px] font-[800]" style={{ color: 'var(--text-primary)' }}>
              Workout done
            </h2>
            <p className="mt-0.5 truncate text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
              {session.program_name || 'Session'}{session.workout_day ? ` · ${session.workout_day}` : ''}
            </p>
          </div>
          <button
            onClick={onCancel}
            aria-label="Back to the session"
            className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[12px]"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* PRs first when there are any — it is the one thing worth telling a
            client about, and burying it under four neutral stats wastes it. */}
        {s.prs > 0 && (
          <div
            className="mb-3 flex items-center gap-2.5 rounded-[14px] px-3.5 py-3"
            style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.28)' }}
          >
            <Trophy size={17} style={{ color: '#d97706' }} />
            <p className="text-[13px] font-[750]" style={{ color: '#b45309' }}>
              {s.prs} personal best{s.prs === 1 ? '' : 's'} today
            </p>
          </div>
        )}

        <div className="mb-4 grid grid-cols-2 gap-2">
          <Stat label="Volume" value={`${formatVolume(s.total_volume)} kg`} />
          <Stat label="Sets" value={`${s.total_sets}${s.planned_sets ? ` / ${s.planned_sets}` : ''}`} />
          <Stat
            label="Completed"
            // null means nothing was planned — a freestyle session is not 0%.
            value={s.completion_pct == null ? '—' : `${s.completion_pct}%`}
          />
          <Stat label="Avg RPE" value={s.avg_rpe == null ? '—' : String(s.avg_rpe)} />
        </div>

        <label className="mb-3 block">
          <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-[700] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            <Timer size={12} /> Duration (minutes)
          </span>
          <input
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            inputMode="numeric"
            className="h-[44px] w-full rounded-[12px] px-3 text-[14px] font-[700] outline-none"
            style={inputStyle}
          />
        </label>

        <label className="mb-4 block">
          <span className="mb-1.5 block text-[11px] font-[700] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            How did it go?
          </span>
          <textarea
            ref={noteRef}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Form, energy, anything to carry into next session…"
            className="min-h-[88px] w-full resize-y rounded-[12px] px-3 py-2.5 text-[13px] outline-none"
            style={inputStyle}
          />
        </label>

        <button
          onClick={submit}
          disabled={saving}
          className="flex h-[48px] w-full items-center justify-center gap-2 rounded-[14px] text-[14px] font-[700] text-white disabled:opacity-60"
          style={{ background: 'var(--brand)' }}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          {saving ? 'Saving…' : 'Save and finish'}
        </button>
      </m.div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-subtle)',
  border: '1px solid var(--border)',
  color: 'var(--text-primary)',
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] px-3.5 py-3" style={{ background: 'var(--bg-subtle)' }}>
      <p className="text-[10px] font-[700] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="mt-0.5 text-[17px] font-[820] tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>{value}</p>
    </div>
  );
}

/** 12,480 rather than 12480 — a volume figure is read, not calculated with. */
function formatVolume(v: number) {
  return Math.round(v).toLocaleString('en-IN');
}

/**
 * Minutes since the session row was created, as the duration suggestion.
 *
 * A suggestion, not a measurement: a trainer who opens the session at the
 * start and finishes at the end gets a good number, and one who logs it
 * afterwards gets a wrong one — which is why the field stays editable.
 */
function elapsedMinutes(createdAt: string) {
  const ms = Date.now() - new Date(createdAt).getTime();
  const mins = Math.round(ms / 60000);
  return mins > 0 && mins < 24 * 60 ? mins : 60;
}
