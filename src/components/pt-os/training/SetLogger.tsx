'use client';

// Logging strength sets, one exercise at a time.
//
// ── The entry row prefills, and that is the whole design ───────────────────
//
// A trainer logging five sets of squats types the same numbers five times if
// the form starts empty. So the row opens holding the last set that was
// logged, falling back to what was prescribed. Set two is usually set one, and
// when it isn't, one field is edited rather than three.
//
// Prefill comes from the last set on screen — including one still queued —
// because "same again" means the same as what I just did, not the same as
// what the server has acknowledged.
//
// ── Unsent sets are marked ─────────────────────────────────────────────────
//
// A queued set renders with a "syncing" dot. Showing it identically to a saved
// one is how a trainer ends up believing a session was recorded when it never
// left the phone.

import { useMemo, useState } from 'react';
import { Check, Loader2, Plus } from 'lucide-react';
import { Button, FloatInput } from '@/components/ui';
import type { LoggerPerformance, PendingSet } from '@/lib/training/useSessionLogger';
import type { TemplateExercise } from '@/lib/api';

export interface SetLoggerProps {
  performance: LoggerPerformance;
  /** What was prescribed, when the session came from a template. */
  prescription?: Partial<TemplateExercise>;
  onLog: (performanceId: string, payload: Record<string, unknown>) => void;
}

export interface SetDraft {
  reps: string;
  weight: string;
  rpe: string;
}

/**
 * What the next entry row should hold: the last set logged, else the
 * prescription, else empty. Pure so the rule can be tested without a DOM.
 */
export function prefillFrom(sets: PendingSet[], prescription?: Partial<TemplateExercise>): SetDraft {
  const last = sets.length ? sets[sets.length - 1] : null;
  if (last) {
    return {
      reps: last.actual_reps != null ? String(last.actual_reps) : '',
      weight: last.actual_weight != null ? String(last.actual_weight) : '',
      rpe: last.actual_rpe != null ? String(last.actual_rpe) : '',
    };
  }
  return {
    reps: prescription?.target_reps_min != null ? String(prescription.target_reps_min) : '',
    weight: prescription?.target_weight != null ? String(prescription.target_weight) : '',
    rpe: prescription?.target_rpe != null ? String(prescription.target_rpe) : '',
  };
}

/** A blank field is "not recorded", which is different from zero. */
function num(raw: string): number | null {
  if (raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function buildSetPayload(draft: SetDraft, setNumber: number, weightUnit: 'kg' | 'lb'): Record<string, unknown> {
  return {
    set_number: setNumber,
    set_type: 'WORKING',
    actual_reps: num(draft.reps),
    actual_weight: num(draft.weight),
    weight_unit: weightUnit,
    actual_rpe: num(draft.rpe),
    completed: true,
  };
}

export default function SetLogger({ performance, prescription, onLog }: SetLoggerProps) {
  const unit = (prescription?.weight_unit ?? 'kg') as 'kg' | 'lb';
  const [draft, setDraft] = useState<SetDraft | null>(null);
  const current = draft ?? prefillFrom(performance.sets, prescription);
  const nextNumber = performance.sets.length + 1;

  const targetLabel = useMemo(() => {
    if (!prescription) return null;
    const reps = prescription.target_reps_max && prescription.target_reps_max !== prescription.target_reps_min
      ? `${prescription.target_reps_min}–${prescription.target_reps_max}`
      : prescription.target_reps_min;
    const bits = [
      prescription.target_sets ? `${prescription.target_sets} sets` : null,
      reps ? `${reps} reps` : null,
      prescription.target_weight ? `${prescription.target_weight}${unit}` : null,
    ].filter(Boolean);
    return bits.length ? bits.join(' · ') : null;
  }, [prescription, unit]);

  const log = () => {
    onLog(performance.id, buildSetPayload(current, nextNumber, unit));
    // Hold the numbers for the next set rather than clearing them.
    setDraft(current);
  };

  return (
    <div className="space-y-2.5">
      {targetLabel && (
        <p className="text-[11.5px] font-[620]" style={{ color: 'var(--text-muted)' }}>
          Prescribed: {targetLabel}
        </p>
      )}

      {performance.sets.length > 0 && (
        <ul className="space-y-1.5">
          {performance.sets.map((s) => (
            <li
              key={s.id}
              className="flex items-center gap-2.5 rounded-[11px] px-3 py-2 text-[13px]"
              style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}
            >
              <span className="w-6 shrink-0 text-[11px] font-[700]" style={{ color: 'var(--text-muted)' }}>
                {s.set_number}
              </span>
              <span className="font-[650] tabular-nums">
                {s.actual_reps ?? '—'} reps
              </span>
              {s.actual_weight != null && (
                <span className="tabular-nums" style={{ color: 'var(--text-muted)' }}>
                  × {s.actual_weight}{s.weight_unit ?? unit}
                </span>
              )}
              {s.actual_rpe != null && (
                <span className="tabular-nums" style={{ color: 'var(--text-muted)' }}>
                  RPE {s.actual_rpe}
                </span>
              )}
              <span className="ml-auto shrink-0">
                {s.pending
                  ? <Loader2 size={13} className="animate-spin" aria-label="Syncing" style={{ color: 'var(--text-muted)' }} />
                  : <Check size={13} aria-label="Saved" style={{ color: 'var(--success-text)' }} />}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-end gap-2">
        <FloatInput
          label="Reps"
          type="number"
          inputMode="numeric"
          value={current.reps}
          onChange={(v) => setDraft({ ...current, reps: v })}
        />
        <FloatInput
          label={`Weight (${unit})`}
          type="number"
          inputMode="decimal"
          value={current.weight}
          onChange={(v) => setDraft({ ...current, weight: v })}
        />
        <FloatInput
          label="RPE"
          type="number"
          inputMode="decimal"
          value={current.rpe}
          onChange={(v) => setDraft({ ...current, rpe: v })}
        />
        <Button type="button" onClick={log} iconLeft={<Plus size={14} />} className="shrink-0">
          Set {nextNumber}
        </Button>
      </div>
    </div>
  );
}
