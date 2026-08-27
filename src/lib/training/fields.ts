// How to render one prescription field.
//
// ── The division of labour, and why it matters ─────────────────────────────
//
// WHICH fields a prescription type uses comes from the server
// (GET /api/training/meta → prescription.js). It is not written here, and it
// must not be: a second copy in a second repository drifts the first time a
// type gains a field, and the failure is quiet — a builder offering a field
// the API ignores.
//
// HOW to render a field — its label, its unit suffix, its step, whether it is
// an integer — is presentation, changes with the design rather than the
// domain, and has no server-side equivalent. That is what lives here.
//
// So a field the server names and this file does not know is rendered with a
// sensible default rather than dropped. Dropping it would mean a new backend
// field silently unreachable in the UI, which is the same quiet failure from
// the other direction.

export interface FieldSpec {
  label: string;
  /** Shown after the input — kg, %, min. Not a unit the API receives. */
  suffix?: string;
  step?: number;
  min?: number;
  max?: number;
  integer?: boolean;
  /** A short nudge under the field, for the ones people get wrong. */
  hint?: string;
  /** Renders a unit picker alongside — the field names the unit column. */
  unitField?: 'weight_unit' | 'distance_unit';
}

export const FIELD_SPECS: Record<string, FieldSpec> = {
  // ── Strength ──
  target_sets:         { label: 'Sets', integer: true, min: 0, max: 99 },
  target_reps_min:     { label: 'Reps', integer: true, min: 0, max: 999 },
  target_reps_max:     { label: 'Reps (max)', integer: true, min: 0, max: 999,
                         hint: 'Leave blank for a fixed rep target' },
  target_weight:       { label: 'Weight', step: 0.5, min: 0, unitField: 'weight_unit' },
  target_rpe:          { label: 'RPE', step: 0.5, min: 0, max: 10,
                         hint: '10 = failure' },
  target_rir:          { label: 'RIR', integer: true, min: 0, max: 10,
                         hint: '0 = failure — the opposite end from RPE' },
  target_tempo:        { label: 'Tempo', hint: 'e.g. 3-1-1-0' },
  target_rest_seconds: { label: 'Rest', suffix: 'sec', integer: true, min: 0, max: 3600 },
  percentage_1rm:      { label: '% of 1RM', suffix: '%', step: 0.5, min: 0, max: 200 },
  percentage_metric:   { label: 'Percentage of' },

  // ── Cardio and time ──
  // The fields the old schema had nowhere to put, which is why a treadmill
  // run was stored as three sets of twelve.
  target_duration_seconds: { label: 'Duration', suffix: 'sec', integer: true, min: 0, max: 86400 },
  target_distance:     { label: 'Distance', step: 0.1, min: 0, unitField: 'distance_unit' },
  target_speed:        { label: 'Speed', suffix: 'km/h', step: 0.1, min: 0, max: 100 },
  target_incline:      { label: 'Incline', suffix: '%', step: 0.5, min: -30, max: 100 },
  target_resistance:   { label: 'Resistance', step: 1, min: 0, max: 100 },
  target_cadence:      { label: 'Cadence', suffix: 'rpm', integer: true, min: 0, max: 300 },
  target_floors:       { label: 'Floors', integer: true, min: 0, max: 100000 },
  target_steps:        { label: 'Steps', integer: true, min: 0, max: 1000000 },
  target_heart_rate:   { label: 'Target HR', suffix: 'bpm', integer: true, min: 20, max: 250 },
  target_calories:     { label: 'Calories', suffix: 'kcal', integer: true, min: 0 },
  target_pace_seconds: { label: 'Pace', suffix: 'sec', integer: true, min: 0,
                         hint: 'Seconds per unit distance — lower is faster' },

  // ── Intervals ──
  work_interval_seconds: { label: 'Work', suffix: 'sec', integer: true, min: 0, max: 86400 },
  rest_interval_seconds: { label: 'Rest', suffix: 'sec', integer: true, min: 0, max: 86400 },
  target_rounds:         { label: 'Rounds', integer: true, min: 0, max: 999 },

  distance_unit: { label: 'Unit' },
  weight_unit:   { label: 'Unit' },
};

/**
 * A spec for any field, known or not.
 *
 * The fallback turns `target_vertical_oscillation` into "Target vertical
 * oscillation" — imperfect, and far better than the field vanishing from the
 * builder because this file has not caught up with the backend.
 */
export function specFor(field: string): FieldSpec {
  const known = FIELD_SPECS[field];
  if (known) return known;
  const label = field
    .replace(/_seconds$/, '')
    .replace(/_/g, ' ')
    .replace(/^./, (c) => c.toUpperCase());
  return { label };
}

/** Fields that carry their own unit picker, so the editor renders one control. */
export const UNIT_OPTIONS = {
  weight_unit: ['kg', 'lb'] as const,
  distance_unit: ['m', 'km', 'mile'] as const,
};

/**
 * Order fields the way a coach reads them, not the way the API lists them.
 *
 * Sets before reps before weight before RPE; duration before distance before
 * incline. Anything unranked sorts last in the server's own order, so a new
 * backend field appears at the end rather than in an arbitrary position.
 */
const ORDER = [
  'target_sets', 'target_reps_min', 'target_reps_max', 'target_weight', 'percentage_1rm',
  'target_rpe', 'target_rir', 'target_tempo',
  'target_rounds', 'work_interval_seconds', 'rest_interval_seconds',
  'target_duration_seconds', 'target_distance', 'target_pace_seconds',
  'target_speed', 'target_incline', 'target_resistance',
  'target_heart_rate', 'target_cadence', 'target_floors', 'target_steps', 'target_calories',
  'target_rest_seconds',
];

export function orderFields(fields: string[]): string[] {
  const rank = (f: string) => {
    const i = ORDER.indexOf(f);
    return i === -1 ? ORDER.length : i;
  };
  // The unit columns are rendered inside their owning field's control, never
  // on their own.
  return fields
    .filter((f) => f !== 'weight_unit' && f !== 'distance_unit')
    .map((f, i) => ({ f, i }))
    .sort((a, b) => rank(a.f) - rank(b.f) || a.i - b.i)
    .map(({ f }) => f);
}
