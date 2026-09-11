// The Training OS API — /api/training.
//
// Separate from endpoints/training.ts, which points at the OLD /api/workouts
// and still serves the current builder. Both exist while the UI is rebuilt;
// the old one goes when nothing imports it.
//
// ── The one thing not defined here ─────────────────────────────────────────
//
// Which fields a prescription type uses. That map lives in the backend's
// prescription.js and is fetched from `meta()`. Writing it here would put a
// second copy in a second repository, and they would drift the first time a
// type gained a field — quietly, into a builder that offers a field the API
// ignores or hides one it needs.
import { http } from '../../http';
import { buildQs } from '../qs';

// ── Types ──────────────────────────────────────────────────────────────────

export type PrescriptionType =
  | 'SETS_REPS' | 'WEIGHT_REPS' | 'RPE_BASED' | 'RIR_BASED' | 'PERCENT_1RM'
  | 'TIME' | 'DISTANCE' | 'TIME_DISTANCE' | 'TIME_SPEED' | 'DISTANCE_LOAD' | 'TIME_LOAD'
  | 'PACE' | 'SPEED' | 'CALORIES' | 'HEART_RATE' | 'RPE' | 'RPM' | 'STEPS' | 'FLOORS' | 'HOLD'
  | 'INTERVAL' | 'ROUNDS' | 'AMRAP' | 'EMOM' | 'CIRCUIT' | 'BODYWEIGHT' | 'MOBILITY' | 'CUSTOM';

export type WorkoutSection =
  | 'WARMUP' | 'ACTIVATION' | 'MAIN' | 'ACCESSORY'
  | 'CARDIO' | 'CONDITIONING' | 'COOLDOWN' | 'MOBILITY';



/** Where a prescription's performance is logged. 'either' is CUSTOM's honest answer. */
export type LogsAs = 'sets' | 'cardio' | 'either';

export interface PrescriptionTypeMeta {
  type: PrescriptionType;
  /** At least one of these must be filled in, or the prescription says nothing. */
  required: string[];
  optional: string[];
  /** required + optional — everything this type can meaningfully carry. */
  fields: string[];
  logs_as: LogsAs;
}

export interface TrainingMeta {
  prescription_types: PrescriptionTypeMeta[];
  sections: WorkoutSection[];
  progression_types: string[];
  units: { weight: ('kg' | 'lb')[]; distance: ('m' | 'km' | 'mile')[] };
}

export interface TrainingProgram {
  id: string;
  organization_id: string;
  client_id: string | null;
  name: string;
  description: string | null;
  goal: string | null;
  program_type: string;
  duration_weeks: number | null;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  created_at: string;
}

export interface ProgramPhase {
  id: string; program_id: string; name: string;
  phase_order: number; week_start: number; week_end: number;
  goal: string | null; notes: string | null;
}

export interface ProgramWeek {
  id: string; program_id: string; phase_id: string | null;
  week_number: number; name: string | null; notes: string | null; is_deload: boolean;
}

export interface WorkoutTemplate {
  id: string;
  organization_id: string;
  program_id: string | null;
  week_id: string | null;
  name: string;
  description: string | null;
  day_number: number | null;
  day_label: string | null;
  goal: string | null;
  estimated_duration_minutes: number | null;
  notes: string | null;
}

/**
 * A prescription.
 *
 * Every target_* field is optional because which ones apply is decided by
 * `prescription_type` — a TIME_DISTANCE row leaves the sets/reps fields null
 * rather than claiming 3x12, which is exactly what the old schema forced.
 */
export interface TemplateExercise {
  id: string;
  workout_template_id: string;
  exercise_id: string;
  exercise_name?: string;
  section: WorkoutSection;
  order_index: number;
  superset_group: string | null;
  circuit_group: string | null;
  prescription_type: PrescriptionType;

  target_sets: number | null;
  target_reps_min: number | null;
  target_reps_max: number | null;
  target_weight: number | null;
  weight_unit: 'kg' | 'lb';
  target_rpe: number | null;
  target_rir: number | null;
  target_tempo: string | null;
  target_rest_seconds: number | null;
  percentage_1rm: number | null;

  target_duration_seconds: number | null;
  target_distance: number | null;
  distance_unit: 'm' | 'km' | 'mile' | null;
  target_speed: number | null;
  target_incline: number | null;
  target_resistance: number | null;
  target_cadence: number | null;
  target_floors: number | null;
  target_steps: number | null;
  target_heart_rate: number | null;
  target_calories: number | null;
  target_pace_seconds: number | null;

  work_interval_seconds: number | null;
  rest_interval_seconds: number | null;
  target_rounds: number | null;

  warmup: boolean;
  optional: boolean;
  notes: string | null;

  /** Server-rendered, so the PDF, the client screen and the brief agree. */
  summary?: string;
  logs_as?: LogsAs;
}

type Payload = Record<string, unknown>;
const body = (data: Payload, method = 'POST') => ({ method, body: JSON.stringify(data) });

export const training = {
  /** The vocabulary. Static per deploy — fetch once and hold. */
  meta: () => http<{ data: TrainingMeta }>('/api/training/meta'),

  programs: {
    list: (params?: Record<string, string | number>) =>
      http<{ data: TrainingProgram[] }>(`/api/training/programs${buildQs(params)}`),
    get: (id: string) =>
      http<{ data: TrainingProgram & { phases: ProgramPhase[]; weeks: ProgramWeek[] } }>(
        `/api/training/programs/${id}`),
    create: (data: Payload) => http<{ data: TrainingProgram }>('/api/training/programs', body(data)),
    update: (id: string, data: Payload) =>
      http<{ data: TrainingProgram }>(`/api/training/programs/${id}`, body(data, 'PATCH')),
    remove: (id: string) =>
      http<{ data: { id: string; deleted: boolean } }>(`/api/training/programs/${id}`, { method: 'DELETE' }),

    addPhase: (id: string, data: Payload) =>
      http<{ data: ProgramPhase }>(`/api/training/programs/${id}/phases`, body(data)),
    addWeek: (id: string, data: Payload) =>
      http<{ data: ProgramWeek }>(`/api/training/programs/${id}/weeks`, body(data)),
  },

  templates: {
    list: (params?: Record<string, string | number>) =>
      http<{ data: WorkoutTemplate[] }>(`/api/training/templates${buildQs(params)}`),
    get: (id: string) =>
      http<{ data: WorkoutTemplate & { exercises: TemplateExercise[] } }>(`/api/training/templates/${id}`),
    create: (data: Payload) => http<{ data: WorkoutTemplate }>('/api/training/templates', body(data)),

    addExercise: (templateId: string, data: Payload) =>
      http<{ data: TemplateExercise; warnings: string[] }>(
        `/api/training/templates/${templateId}/exercises`, body(data)),
    updateExercise: (templateId: string, rowId: string, data: Payload) =>
      http<{ data: TemplateExercise; warnings: string[] }>(
        `/api/training/templates/${templateId}/exercises/${rowId}`, body(data, 'PATCH')),
    removeExercise: (templateId: string, rowId: string) =>
      http<{ data: { id: string; deleted: boolean } }>(
        `/api/training/templates/${templateId}/exercises/${rowId}`, { method: 'DELETE' }),
    /** `exerciseIds` in the order they should appear. */
    reorder: (templateId: string, exerciseIds: string[]) =>
      http<{ data: { id: string; reordered: number } }>(
        `/api/training/templates/${templateId}/order`, body({ exercise_ids: exerciseIds }, 'PUT')),
  },


};
