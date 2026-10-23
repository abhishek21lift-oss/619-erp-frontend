'use client';

import { Plus, Trash2 } from 'lucide-react';
import { SIT_AND_REACH_ZERO_POINT_INCHES } from '@/lib/flexibility-protocol';
import type { AbleSitAndReach, FlexibilityFormState } from '@/lib/flexibility-protocol';
import { Button } from '@/components/ui';
import { Insight, InsightUnavailable, Measurement, NotesField, YesNoChips } from './fields';

const MAX_ATTEMPTS = 3;

interface Props {
  state: FlexibilityFormState['sitAndReach'];
  /** null when the test is marked unable — nothing is derived then. */
  derived: AbleSitAndReach | null;
  patch: (p: Partial<FlexibilityFormState['sitAndReach']>) => void;
}

/** YMCA Sit and Reach, scored against the box's 15-inch zero point. */
export function SitAndReachFields({ state: s, derived, patch }: Props) {
  const setAttempt = (index: number, p: Partial<{ inches: string; valid: boolean }>) =>
    patch({ attempts: s.attempts.map((a, i) => (i === index ? { ...a, ...p } : a)) });

  const measured = !!derived && derived.attempts.length > 0;
  const score = derived?.score_inches ?? null;
  const norm = derived?.norm ?? null;
  const flagged = !!derived && (derived.best_attempt_index == null || s.kneeBending || s.bouncing);

  return (
    <div className="space-y-4">
      <div className="rounded-[16px] p-4" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
        <p className="mb-3 text-[11px] font-[700] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Attempts (best valid attempt is scored)
        </p>
        <div className="space-y-3">
          {s.attempts.map((a, i) => (
            <div key={i} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <Measurement
                label={`Attempt ${i + 1} reach`}
                value={a.inches}
                onChange={(v) => setAttempt(i, { inches: v })}
                suffix="in"
                min={0}
                max={60}
                hint={derived?.best_attempt_index === i && a.valid ? 'Best valid attempt — this is the score.' : undefined}
              />
              <div className="flex items-center gap-2 pb-1">
                <YesNoChips label="Valid" value={a.valid} onChange={(v) => setAttempt(i, { valid: v !== false })} />
                {s.attempts.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Remove attempt ${i + 1}`}
                    onClick={() => patch({ attempts: s.attempts.filter((_, j) => j !== i) })}
                    className="flex h-8 w-8 items-center justify-center rounded-[8px] transition-colors hover:bg-[var(--bg-hover)]"
                  >
                    <Trash2 size={13} style={{ color: 'var(--text-muted)' }} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        {s.attempts.length < MAX_ATTEMPTS && (
          <Button
            variant="ghost" size="sm" className="mt-2"
            iconLeft={<Plus size={13} />}
            onClick={() => patch({ attempts: [...s.attempts, { inches: '', valid: true }] })}
          >
            Add attempt
          </Button>
        )}
      </div>

      <div className="rounded-[16px] p-4" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
        <div className="space-y-3">
          <YesNoChips label="Knees bent during any attempt" value={s.kneeBending} onChange={(v) => patch({ kneeBending: v === true })} compact
            hint="Observation on the test — mark the affected attempt invalid too." />
          <YesNoChips label="Bouncing / ballistic reach" value={s.bouncing} onChange={(v) => patch({ bouncing: v === true })} compact
            hint="Observation on the test — mark the affected attempt invalid too." />
        </div>
      </div>

      {derived ? (
        <Insight label="Live interpretation" tone={flagged ? 'watch' : measured ? 'ok' : 'info'}>
          {measured ? (
            <div className="space-y-1">
              <p>
                Best valid attempt: <strong>{derived.best_raw_inches} in</strong>
                {derived.best_attempt_index != null && <> (attempt {derived.best_attempt_index + 1})</>}
                {' · '}
                {derived.best_raw_inches} − {SIT_AND_REACH_ZERO_POINT_INCHES} ={' '}
                <strong>{score != null ? score.toFixed(1) : '—'} in</strong>
              </p>
              <p style={{ color: 'var(--text-muted)' }}>
                The 15-inch mark is the box zero point, so a short reach is a negative score — that is a real result, not an error.
              </p>
              <p style={{ color: 'var(--text-muted)' }}>
                Norm: {norm?.category ? `${norm.category} — ${norm.message}` : norm?.message ?? 'Norm classification unavailable'}
              </p>
              {derived.best_attempt_index == null && <p style={{ color: 'var(--warning-text)' }}>No valid attempt yet: at least one attempt must be marked valid.</p>}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>Record at least one reach to score the test.</p>
          )}
        </Insight>
      ) : (
        <InsightUnavailable />
      )}

      <NotesField value={s.notes} onChange={(v) => patch({ notes: v })} />
    </div>
  );
}

export default SitAndReachFields;
