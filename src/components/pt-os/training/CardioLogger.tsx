'use client';

// Logging a cardio effort.
//
// This component is the reason the schema changed. The old workout tables had
// sets and reps NOT NULL DEFAULT 3/12, so a twenty-minute run was recorded as
// three sets of twelve and every downstream number — volume, tonnage, PRs —
// counted it as strength work. Cardio has its own table now, and its own form.
//
// ── Duration is entered as minutes and seconds ─────────────────────────────
//
// The API stores seconds, which is right for arithmetic and wrong for typing.
// Nobody knows what 1_270 seconds is. Two fields, one number on the wire.
//
// ── Everything is optional except the effort itself ────────────────────────
//
// A treadmill gives distance and calories; a rower gives distance and pace; an
// assault bike gives neither. Requiring a field the machine does not display
// teaches people to type a plausible number, which is worse than a null.

import { useState } from 'react';
import { Check, Loader2, Plus } from 'lucide-react';
import { Button, FloatInput } from '@/components/ui';
import type { CardioType, TemplateExercise } from '@/lib/api';
import type { LoggerPerformance } from '@/lib/training/useSessionLogger';

export interface CardioLoggerProps {
  performance: LoggerPerformance;
  prescription?: Partial<TemplateExercise>;
  onLog: (performanceId: string, payload: Record<string, unknown>) => void;
}

export interface CardioDraft {
  minutes: string;
  seconds: string;
  distance: string;
  distanceUnit: 'm' | 'km' | 'mile';
  heartRate: string;
  calories: string;
  rpe: string;
}

export function emptyCardioDraft(prescription?: Partial<TemplateExercise>): CardioDraft {
  const target = prescription?.target_duration_seconds ?? null;
  return {
    minutes: target != null ? String(Math.floor(target / 60)) : '',
    seconds: target != null && target % 60 !== 0 ? String(target % 60) : '',
    distance: prescription?.target_distance != null ? String(prescription.target_distance) : '',
    distanceUnit: (prescription?.distance_unit as 'm' | 'km' | 'mile' | null) ?? 'km',
    heartRate: '',
    calories: '',
    rpe: '',
  };
}

function num(raw: string): number | null {
  if (raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/**
 * Minutes and seconds to one duration. Null when neither was filled in —
 * a blank duration means "not recorded", not a zero-second effort.
 */
export function durationSeconds(draft: Pick<CardioDraft, 'minutes' | 'seconds'>): number | null {
  const m = num(draft.minutes);
  const s = num(draft.seconds);
  if (m == null && s == null) return null;
  return (m ?? 0) * 60 + (s ?? 0);
}

export function buildCardioPayload(draft: CardioDraft, cardioType: CardioType): Record<string, unknown> {
  const distance = num(draft.distance);
  return {
    cardio_type: cardioType,
    duration_seconds: durationSeconds(draft),
    distance,
    // A unit without a distance is noise; the column stays null with it.
    distance_unit: distance == null ? null : draft.distanceUnit,
    average_heart_rate: num(draft.heartRate),
    calories_burned: num(draft.calories),
    rpe: num(draft.rpe),
    completed: true,
  };
}

/** Reads the effort back the way a person would say it. */
export function describeEffort(row: {
  duration_seconds: number | null; distance: number | null;
  distance_unit: string | null; calories_burned: number | null; rpe: number | null;
}): string {
  const bits: string[] = [];
  if (row.duration_seconds != null) {
    const m = Math.floor(row.duration_seconds / 60);
    const s = row.duration_seconds % 60;
    bits.push(s ? `${m}:${String(s).padStart(2, '0')}` : `${m} min`);
  }
  if (row.distance != null) bits.push(`${row.distance}${row.distance_unit ?? ''}`);
  if (row.calories_burned != null) bits.push(`${row.calories_burned} kcal`);
  if (row.rpe != null) bits.push(`RPE ${row.rpe}`);
  return bits.join(' · ') || 'Logged';
}

const UNITS: CardioDraft['distanceUnit'][] = ['m', 'km', 'mile'];

const CARDIO_TYPES: CardioType[] = [
  'TREADMILL', 'RUNNING', 'WALKING', 'CYCLING', 'STATIONARY_BIKE', 'ROWING',
  'ELLIPTICAL', 'STAIRMASTER', 'SKI_ERG', 'SWIMMING', 'HIIT', 'CIRCUIT', 'OTHER',
];

/**
 * The modality, guessed from the exercise's own name.
 *
 * `cardio_type` is what makes the row comparable later — "am I running faster
 * than in March" needs the runs identified as runs. Defaulting everything to
 * OTHER would answer that question with silence, and a trainer mid-session
 * will not stop to classify a treadmill as a treadmill. So it is guessed and
 * left editable, rather than asked for.
 */
export function guessCardioType(exerciseName: string): CardioType {
  const n = exerciseName.toLowerCase();
  const match = (...words: string[]) => words.some((w) => n.includes(w));
  if (match('treadmill')) return 'TREADMILL';
  if (match('ski erg', 'skierg')) return 'SKI_ERG';
  if (match('stair', 'step mill', 'stepmill')) return 'STAIRMASTER';
  if (match('row')) return 'ROWING';
  if (match('elliptical', 'cross trainer')) return 'ELLIPTICAL';
  if (match('assault bike', 'air bike', 'stationary bike', 'spin')) return 'STATIONARY_BIKE';
  if (match('cycl', 'bike')) return 'CYCLING';
  if (match('swim')) return 'SWIMMING';
  if (match('walk', 'ruck')) return 'WALKING';
  if (match('run', 'jog', 'sprint')) return 'RUNNING';
  if (match('hiit', 'interval')) return 'HIIT';
  if (match('circuit')) return 'CIRCUIT';
  return 'OTHER';
}

/** Title case for a display label, so the select does not shout SKI_ERG. */
export function cardioTypeLabel(type: CardioType): string {
  return type.split('_').map((w) => w[0] + w.slice(1).toLowerCase()).join(' ');
}

export default function CardioLogger({ performance, prescription, onLog }: CardioLoggerProps) {
  const [cardioType, setCardioType] = useState<CardioType>(() => guessCardioType(performance.exercise_name));

  // Null means "nothing typed yet", so the form is derived from the
  // prescription on every render until it is. Seeding state once at mount
  // would freeze the empty form in place: the session loads before the
  // template it came from, so at first render there is no prescription to read
  // and the prescribed duration would never appear.
  const [draft, setDraft] = useState<CardioDraft | null>(null);
  const current = draft ?? emptyCardioDraft(prescription);

  const log = () => {
    onLog(performance.id, buildCardioPayload(current, cardioType));
    setDraft(null);
  };

  const set = (patch: Partial<CardioDraft>) => setDraft({ ...current, ...patch });

  return (
    <div className="space-y-2.5">
      {performance.cardio.length > 0 && (
        <ul className="space-y-1.5">
          {performance.cardio.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-2.5 rounded-[11px] px-3 py-2 text-[13px]"
              style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}
            >
              <span className="font-[650] tabular-nums">{describeEffort(c)}</span>
              <span className="ml-auto shrink-0">
                {c.pending
                  ? <Loader2 size={13} className="animate-spin" aria-label="Syncing" style={{ color: 'var(--text-muted)' }} />
                  : <Check size={13} aria-label="Saved" style={{ color: 'var(--success-text)' }} />}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label className="flex flex-col justify-end">
          <span className="sr-only">Cardio type</span>
          <select
            aria-label="Cardio type"
            value={cardioType}
            onChange={(e) => setCardioType(e.target.value as CardioType)}
            className="h-[52px] rounded-[14px] border px-3 text-[13.5px] font-medium"
            style={{
              borderColor: 'var(--border-2)', background: 'var(--bg-subtle)',
              color: 'var(--text-primary)',
            }}
          >
            {CARDIO_TYPES.map((t) => <option key={t} value={t}>{cardioTypeLabel(t)}</option>)}
          </select>
        </label>
        <FloatInput
          label="Minutes" type="number" inputMode="numeric"
          value={current.minutes} onChange={(v) => set({ minutes: v })}
        />
        <FloatInput
          label="Seconds" type="number" inputMode="numeric"
          value={current.seconds} onChange={(v) => set({ seconds: v })}
        />
        <FloatInput
          label="Distance" type="number" inputMode="decimal"
          value={current.distance} onChange={(v) => set({ distance: v })}
        />
        <label className="flex flex-col justify-end">
          <span className="sr-only">Distance unit</span>
          <select
            aria-label="Distance unit"
            value={current.distanceUnit}
            onChange={(e) => set({ distanceUnit: e.target.value as CardioDraft['distanceUnit'] })}
            className="h-[52px] rounded-[14px] border px-3 text-[13.5px] font-medium"
            style={{
              borderColor: 'var(--border-2)', background: 'var(--bg-subtle)',
              color: 'var(--text-primary)',
            }}
          >
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </label>
        <FloatInput
          label="Avg HR" type="number" inputMode="numeric"
          value={current.heartRate} onChange={(v) => set({ heartRate: v })}
        />
        <FloatInput
          label="Calories" type="number" inputMode="numeric"
          value={current.calories} onChange={(v) => set({ calories: v })}
        />
        <FloatInput
          label="RPE" type="number" inputMode="decimal"
          value={current.rpe} onChange={(v) => set({ rpe: v })}
        />
        <Button type="button" onClick={log} iconLeft={<Plus size={14} />} className="h-[52px]">
          Log effort
        </Button>
      </div>
    </div>
  );
}
