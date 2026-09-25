/**
 * A member's own weekly check-in (POST /api/me/checkins).
 *
 * Every reading is optional — a check-in that only says "slept badly, felt
 * tired" is still worth sending — but an empty one is refused, here and on
 * the server. Ranges match the server's, so a value the API would refuse is
 * refused in the form first, next to the field that caused it.
 *
 * The week is not a field: the server always writes this week's row, so a
 * member cannot back-date a check-in.
 */

import { z } from 'zod';
import { decimalField, integerField, enumField, textField } from '../primitives';
import type { MeCheckin, MeCheckinInput } from '@/lib/api';

export const MOODS = ['great', 'good', 'okay', 'tired', 'stressed'] as const;

export const memberCheckinSchema = z
  .object({
    weight: decimalField({ label: 'Weight', min: 20, max: 400, unit: 'kg' }),
    mood: enumField(MOODS, { label: 'Mood' }),
    sleepHours: decimalField({ label: 'Sleep', min: 0, max: 24, unit: 'hours' }),
    waterGlasses: integerField({ label: 'Water', min: 0, max: 40, unit: 'glasses' }),
    energyLevel: integerField({ label: 'Energy', min: 1, max: 10 }),
    stressLevel: integerField({ label: 'Stress', min: 1, max: 10 }),
    sorenessLevel: integerField({ label: 'Soreness', min: 1, max: 10 }),
    notes: textField({ label: 'Notes for your trainer', maxLength: 1000 }),
  })
  .superRefine((v, ctx) => {
    if (Object.values(v).every((x) => x === null || x === '')) {
      ctx.addIssue({ code: 'custom', path: ['weight'], message: 'Add at least one reading to your check-in.' });
    }
  });

export type MemberCheckinValues = z.output<typeof memberCheckinSchema>;

export type MemberCheckinState = {
  weight: string;
  mood: string;
  sleepHours: string;
  waterGlasses: string;
  energyLevel: string;
  stressLevel: string;
  sorenessLevel: string;
  notes: string;
};

const s = (v: unknown) => (v === null || v === undefined ? '' : String(v));

/** Blank, or prefilled from this week's existing check-in so it can be edited. */
export function blankMemberCheckin(existing?: MeCheckin | null): MemberCheckinState {
  return {
    weight: s(existing?.weight != null ? Number(existing.weight) : null),
    mood: s(existing?.mood),
    sleepHours: s(existing?.sleep_hours != null ? Number(existing.sleep_hours) : null),
    waterGlasses: s(existing?.water_glasses),
    energyLevel: s(existing?.energy_level),
    stressLevel: s(existing?.stress_level),
    sorenessLevel: s(existing?.soreness_level),
    notes: s(existing?.client_notes),
  };
}

/** Only the readings given — an unset field is omitted, never sent as 0. */
export function toMemberCheckinPayload(v: MemberCheckinValues): MeCheckinInput {
  const out: MeCheckinInput = {};
  if (v.weight !== null) out.weight = v.weight;
  if (v.mood !== null) out.mood = v.mood;
  if (v.sleepHours !== null) out.sleep_hours = v.sleepHours;
  if (v.waterGlasses !== null) out.water_glasses = v.waterGlasses;
  if (v.energyLevel !== null) out.energy_level = v.energyLevel;
  if (v.stressLevel !== null) out.stress_level = v.stressLevel;
  if (v.sorenessLevel !== null) out.soreness_level = v.sorenessLevel;
  if (v.notes) out.client_notes = v.notes;
  return out;
}
