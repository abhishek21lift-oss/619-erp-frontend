// Which logger an exercise gets: sets, or cardio.
//
// Getting this wrong is not cosmetic. Show the sets form for a treadmill and
// the trainer either types fiction or logs nothing; show the cardio form for a
// squat and the set never reaches the volume calculation. The old schema made
// the question unaskable — every row was sets and reps — so this is new
// ground and the precedence matters.
//
// ── Order of authority ─────────────────────────────────────────────────────
//
//   1. What has already been logged. If the exercise has cardio rows, it is a
//      cardio exercise, whatever anything else claims. Data beats intent.
//   2. The prescription's type, via the server's `logs_as`. Same authority the
//      builder uses, so the two screens cannot disagree about what a type is.
//   3. The section. A row in CARDIO or CONDITIONING with no prescription is
//      more likely a run than a bench press.
//   4. Sets, because most exercises are.
//
// CUSTOM reports `logs_as: 'either'` — an honest answer the caller has to
// resolve, so it falls through to the section rather than being forced.

import type { ExercisePerformance, PrescriptionTypeMeta, TemplateExercise, WorkoutSection } from '@/lib/api';

export type LoggerShape = 'sets' | 'cardio';

const CARDIO_SECTIONS: WorkoutSection[] = ['CARDIO', 'CONDITIONING'];

export function pickLoggerShape(
  performance: Pick<ExercisePerformance, 'section'> & {
    sets: { length: number }; cardio: { length: number };
  },
  prescription: Partial<TemplateExercise> | undefined,
  types: PrescriptionTypeMeta[],
): LoggerShape {
  if (performance.cardio.length > 0) return 'cardio';
  if (performance.sets.length > 0) return 'sets';

  const type = prescription?.prescription_type;
  if (type) {
    const logsAs = types.find((t) => t.type === type)?.logs_as;
    if (logsAs === 'sets' || logsAs === 'cardio') return logsAs;
  }

  if (performance.section && CARDIO_SECTIONS.includes(performance.section)) return 'cardio';
  return 'sets';
}

/**
 * The prescription for each performance, keyed by exercise.
 *
 * Matched on `exercise_id` rather than order: a session can gain an exercise
 * that was never prescribed, and positional matching would then hand every
 * later row somebody else's targets.
 */
export function prescriptionsByExercise(
  templateExercises: TemplateExercise[],
): Map<string, TemplateExercise> {
  const map = new Map<string, TemplateExercise>();
  for (const row of templateExercises) {
    // First prescription wins. The same movement appearing twice in a day
    // (heavy singles, then a back-off block) is real, and the alternative —
    // last wins — would show the back-off targets against the heavy set.
    if (!map.has(row.exercise_id)) map.set(row.exercise_id, row);
  }
  return map;
}
