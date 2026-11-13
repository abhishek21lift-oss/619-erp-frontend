'use client';

// The trainer's review of a member's submitted workout: the prescription they
// were shown, what they actually logged, and what was missed. Approving or
// asking for changes writes the decision the member sees in their history.

import { useState } from 'react';
import { Check, MessageSquareWarning } from 'lucide-react';
import { api as defaultApi } from '@/lib/api';
import type { WorkoutReviewDecision, WorkoutSessionDetail, WorkoutSet } from '@/lib/api';
import { errorMessage } from '@/lib/forms/errors';
import { TextAreaField } from '@/components/ui/form';

type ReviewApi = {
  reviewSession: (id: string, body: { decision: WorkoutReviewDecision; feedback: string }) => Promise<unknown>;
};

const keyOf = (name: string) => name.trim().toLowerCase();

function setLabel(s: WorkoutSet): string {
  const parts: string[] = [];
  if (s.weight_kg != null && s.reps != null) parts.push(`${s.weight_kg} kg × ${s.reps}`);
  else if (s.reps != null) parts.push(`${s.reps} reps`);
  if (s.duration_seconds != null) parts.push(`${Math.round(s.duration_seconds / 60)} min`);
  if (s.distance != null) parts.push(`${s.distance} ${s.distance_unit ?? ''}`.trim());
  if (s.rpe != null) parts.push(`RPE ${s.rpe}`);
  if (s.rir != null) parts.push(`RIR ${s.rir}`);
  return parts.join(' · ') || '—';
}

export default function ReviewPanel({ detail, onReviewed, api = defaultApi.progress.workoutLog }: {
  detail: WorkoutSessionDetail;
  /** The review was saved — the page refreshes the session. */
  onReviewed: () => void | Promise<void>;
  /** Injected in tests; the real client talks to `api.progress.workoutLog`. */
  api?: ReviewApi;
}) {
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState<WorkoutReviewDecision | null>(null);
  const [error, setError] = useState<string | null>(null);

  const planned = detail.planned?.exercises ?? [];
  const actual = detail.exercises;
  const actualByName = new Map(actual.map((e) => [keyOf(e.exercise_name), e]));
  const missed = planned.filter((p) => !actualByName.has(keyOf(p.name)));
  const short = planned.flatMap((p) => {
    const done = actualByName.get(keyOf(p.name));
    if (!done) return [];
    const completed = done.sets.filter((s) => s.completed).length;
    return completed < p.sets ? [`${p.name}: ${completed} of ${p.sets} sets`] : [];
  });

  const submit = async (decision: WorkoutReviewDecision) => {
    if (saving) return;
    setSaving(decision);
    setError(null);
    try {
      await api.reviewSession(detail.id, { decision, feedback: feedback.trim() });
      await onReviewed();
    } catch (err) {
      setError(errorMessage(err, 'Could not save the review.'));
    } finally {
      setSaving(null);
    }
  };

  return (
    <section className="rounded-[20px] p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-[800]" style={{ color: 'var(--text-primary)' }}>Review this workout</h2>
          <p className="mt-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>
            Submitted for your review. Approve it, or ask for changes — the member sees your note.
          </p>
        </div>
        <span className="rounded-full px-2.5 py-1 text-[10px] font-[800] uppercase tracking-[0.08em]"
          style={{ background: 'rgba(245,158,11,0.14)', color: '#b45309' }}>Pending</span>
      </div>

      <p className="mt-2 text-[11.5px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
        {detail.session_date}
        {detail.duration_minutes ? ` · ${detail.duration_minutes} min` : ''}
        {` · ${detail.summary.total_sets} sets`}
        {` · ${Math.round(detail.summary.total_volume).toLocaleString()} kg`}
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <h3 className="text-[10.5px] font-[800] uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)' }}>Planned</h3>
          {planned.length === 0 ? (
            <p className="mt-1.5 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>No prescription on this session.</p>
          ) : (
            <ul className="mt-1.5 space-y-1">
              {planned.map((p, i) => (
                <li key={`${p.name}-${i}`} className="text-[12.5px]" style={{ color: 'var(--text-primary)' }}>
                  {p.name} — {p.sets} × {p.reps}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3 className="text-[10.5px] font-[800] uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)' }}>Actual</h3>
          {actual.length === 0 ? (
            <p className="mt-1.5 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>Nothing logged.</p>
          ) : (
            <ul className="mt-1.5 space-y-1.5">
              {actual.map((e, i) => (
                <li key={`${e.exercise_name}-${i}`} className="text-[12.5px]" style={{ color: 'var(--text-primary)' }}>
                  <span className="font-[700]">{e.exercise_name}</span>
                  <span className="mt-0.5 block text-[11.5px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
                    {e.sets.filter((s) => s.completed).map(setLabel).join(' · ') || 'No sets completed'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3 className="text-[10.5px] font-[800] uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)' }}>Missed</h3>
          {missed.length === 0 && short.length === 0 ? (
            <p className="mt-1.5 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>Nothing missed.</p>
          ) : (
            <ul className="mt-1.5 space-y-1">
              {missed.map((p, i) => (
                <li key={`${p.name}-${i}`} className="text-[12.5px]" style={{ color: '#b45309' }}>{p.name} — not done</li>
              ))}
              {short.map((line) => (
                <li key={line} className="text-[12.5px]" style={{ color: '#b45309' }}>{line}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <TextAreaField
        className="mt-4"
        label="Feedback"
        rows={3}
        maxLength={2000}
        density="compact"
        field={{
          name: 'feedback',
          state: { value: feedback, meta: { errors: [], isTouched: false } },
          handleChange: setFeedback,
          handleBlur: () => {},
        }}
      />

      {error && <p role="alert" className="mt-2 text-[12px] font-[650]" style={{ color: 'var(--danger-text)' }}>{error}</p>}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={() => void submit('approved')} disabled={saving !== null}
          className="flex h-[44px] flex-1 items-center justify-center gap-2 rounded-[12px] text-[13.5px] font-[750] text-white disabled:opacity-60"
          style={{ background: '#047857' }}>
          <Check size={16} aria-hidden /> {saving === 'approved' ? 'Approving…' : 'Approve'}
        </button>
        <button type="button" onClick={() => void submit('changes_requested')} disabled={saving !== null}
          className="flex h-[44px] flex-1 items-center justify-center gap-2 rounded-[12px] text-[13.5px] font-[750] disabled:opacity-60"
          style={{ background: 'rgba(245,158,11,0.14)', color: '#b45309' }}>
          <MessageSquareWarning size={16} aria-hidden /> {saving === 'changes_requested' ? 'Sending…' : 'Request changes'}
        </button>
      </div>
    </section>
  );
}
