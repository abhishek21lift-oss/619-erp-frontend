import { z } from 'zod';
import {
  dateField, decimalField, enumField, integerField, textField,
} from '../primitives';

/**
 * One day of the member journal.
 *
 * Every measurement is optional; the cross-field rule refuses a completely
 * empty day instead. The strings are what the controls produce — the numeric
 * primitives convert once, at submit, so a cleared field never becomes zero.
 */
export const memberHabitSchema = z.object({
  logDate: dateField({ label: 'Journal date', required: true }),
  sleepHours: decimalField({ label: 'Sleep duration', min: 0, max: 24, unit: 'hours' }),
  sleepQuality: integerField({ label: 'Sleep quality', min: 1, max: 5 }),
  waterMl: integerField({ label: 'Water', min: 0, max: 15000, unit: 'ml' }),
  electrolytes: enumField(['yes', 'no'] as const, { label: 'Electrolytes' }),
  steps: integerField({ label: 'Steps', min: 0, max: 200000 }),
  stressLevel: integerField({ label: 'Stress', min: 1, max: 5 }),
  energyLevel: integerField({ label: 'Energy', min: 1, max: 5 }),
  fatigueLevel: integerField({ label: 'Fatigue', min: 1, max: 5 }),
  sorenessLevel: integerField({ label: 'Soreness', min: 1, max: 5 }),
  recoveryLevel: integerField({ label: 'Recovery', min: 1, max: 5 }),
  notes: textField({ label: 'Notes', maxLength: 2000 }),
}).superRefine((v, ctx) => {
  const measured = [
    v.sleepHours, v.sleepQuality, v.waterMl, v.steps,
    v.stressLevel, v.energyLevel, v.fatigueLevel, v.sorenessLevel, v.recoveryLevel,
  ].some((x) => x !== null);
  if (!measured && v.electrolytes === null && !v.notes?.trim()) {
    ctx.addIssue({ code: 'custom', path: ['sleepHours'], message: 'Add at least one measurement for the day.' });
  }
});

export type MemberHabitValues = z.output<typeof memberHabitSchema>;

export type HabitLogSeed = {
  log_date: string;
  sleep_hours: number | null;
  sleep_quality: number | null;
  water_ml: number | null;
  electrolytes: boolean | null;
  steps: number | null;
  steps_source: 'manual' | 'wearable' | 'imported' | null;
  stress_level: number | null;
  energy_level: number | null;
  fatigue_level: number | null;
  soreness_level: number | null;
  recovery_level: number | null;
  notes: string | null;
} | null;

export function blankMemberHabit(existing: HabitLogSeed, date: string): Record<string, string> {
  const raw = (v: number | null | undefined) => (v == null ? '' : String(v));
  return {
    logDate: existing?.log_date?.slice(0, 10) || date,
    sleepHours: raw(existing?.sleep_hours),
    sleepQuality: raw(existing?.sleep_quality),
    waterMl: raw(existing?.water_ml),
    electrolytes: existing?.electrolytes == null ? '' : existing.electrolytes ? 'yes' : 'no',
    steps: raw(existing?.steps),
    stressLevel: raw(existing?.stress_level),
    energyLevel: raw(existing?.energy_level),
    fatigueLevel: raw(existing?.fatigue_level),
    sorenessLevel: raw(existing?.soreness_level),
    recoveryLevel: raw(existing?.recovery_level),
    notes: existing?.notes || '',
  };
}

export function toMemberHabitPayload(v: MemberHabitValues) {
  return {
    log_date: v.logDate,
    sleep_hours: v.sleepHours,
    sleep_quality: v.sleepQuality,
    water_ml: v.waterMl,
    electrolytes: v.electrolytes == null ? null : v.electrolytes === 'yes',
    steps: v.steps,
    stress_level: v.stressLevel,
    energy_level: v.energyLevel,
    fatigue_level: v.fatigueLevel,
    soreness_level: v.sorenessLevel,
    recovery_level: v.recoveryLevel,
    notes: v.notes,
  };
}
