/**
 * The trainer's weekly check-in.
 *
 * One row per client per week, shared with the member app. The server snaps the
 * date to its Monday and treats every optional reading as "leave the existing
 * value alone" — so an empty field must stay absent, never become zero.
 *
 * The old form sent `parseFloat(...)` / `parseInt(...)` whenever the box was
 * non-empty. A fractional water count was silently truncated, `parseInt('4x')`
 * became 4, and an unparseable weight became `NaN` — which JSON serialises as
 * `null`, indistinguishable from a cleared weight. The ranges below are the
 * server's own (`progress.routes.js`), not a second opinion.
 */

import { z } from 'zod';
import { dateField, decimalField, enumField, integerField, textField } from '../primitives';

/** The server's fixed mood enum. */
export const WEEKLY_CHECKIN_MOODS = ['great', 'good', 'okay', 'tired', 'stressed'] as const;

export type WeeklyCheckinMood = (typeof WEEKLY_CHECKIN_MOODS)[number];

/** Labels for the shared chip control, checked against the enum. */
export const WEEKLY_CHECKIN_MOOD_OPTIONS = [
  { value: 'great', label: 'Great' },
  { value: 'good', label: 'Good' },
  { value: 'okay', label: 'Okay' },
  { value: 'tired', label: 'Tired' },
  { value: 'stressed', label: 'Stressed' },
] as const satisfies ReadonlyArray<{ value: WeeklyCheckinMood; label: string }>;

/** The client id must be a real UUID before it reaches Postgres. */
const CLIENT_ID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const weeklyCheckinSchema = z.object({
  client_id: textField({
    label: 'Client',
    required: true,
    pattern: { test: CLIENT_ID_SHAPE, message: 'Select a valid client.' },
  }),
  week_start_date: dateField({ label: 'Week starting', required: true }),
  weight: decimalField({ label: 'Weight', min: 20, max: 400, unit: 'kg' }),
  mood: enumField(WEEKLY_CHECKIN_MOODS, { label: 'Mood', required: true }),
  sleep_hours: decimalField({ label: 'Sleep', min: 0, max: 24, unit: 'hours' }),
  water_glasses: integerField({ label: 'Water', min: 0, max: 40, unit: 'glasses' }),
  workout_count: integerField({ label: 'Workouts', min: 0, max: 21 }),
  adherence_pct: decimalField({ label: 'Adherence', min: 0, max: 100, unit: '%' }),
  trainer_notes: textField({ label: 'Trainer notes', maxLength: 2000 }),
  stress_level: integerField({ label: 'Stress', min: 1, max: 10 }),
  energy_level: integerField({ label: 'Energy', min: 1, max: 10 }),
  soreness_level: integerField({ label: 'Soreness', min: 1, max: 10 }),
});

export type WeeklyCheckinValues = z.output<typeof weeklyCheckinSchema>;

/** The form's raw state — strings, because that is what controls produce. */
export type WeeklyCheckinState = {
  client_id: string;
  week_start_date: string;
  weight: string;
  mood: string;
  sleep_hours: string;
  water_glasses: string;
  workout_count: string;
  adherence_pct: string;
  trainer_notes: string;
  stress_level: string;
  energy_level: string;
  soreness_level: string;
};

/**
 * A blank check-in for a given week.
 *
 * The date is passed in rather than computed here: `mondayYmd()` belongs to the
 * trainer's calendar, and a schema module should not decide which day it is.
 */
export function blankWeeklyCheckin(weekStart: string): WeeklyCheckinState {
  return {
    client_id: '',
    week_start_date: weekStart,
    weight: '',
    // The old form opened on "Good"; an explicit mood is still always sent.
    mood: 'good',
    sleep_hours: '',
    water_glasses: '',
    workout_count: '',
    adherence_pct: '',
    trainer_notes: '',
    stress_level: '',
    energy_level: '',
    soreness_level: '',
  };
}

/** The create payload, in exactly the shape the endpoint already received. */
export function toWeeklyCheckinPayload(v: WeeklyCheckinValues) {
  return {
    client_id: v.client_id as string,
    week_start_date: v.week_start_date as string,
    // Absent optionals are omitted. The server keeps a member-reported value
    // when the trainer's box is blank, which is the whole point of COALESCE.
    weight: v.weight ?? undefined,
    mood: v.mood as WeeklyCheckinMood,
    sleep_hours: v.sleep_hours ?? undefined,
    water_glasses: v.water_glasses ?? undefined,
    workout_count: v.workout_count ?? undefined,
    adherence_pct: v.adherence_pct ?? undefined,
    trainer_notes: v.trainer_notes ?? undefined,
    stress_level: v.stress_level ?? undefined,
    energy_level: v.energy_level ?? undefined,
    soreness_level: v.soreness_level ?? undefined,
  };
}
