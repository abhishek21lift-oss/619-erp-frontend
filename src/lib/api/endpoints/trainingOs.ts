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

export type CardioType =
  | 'TREADMILL' | 'RUNNING' | 'CYCLING' | 'STATIONARY_BIKE' | 'ROWING' | 'ELLIPTICAL'
  | 'STAIRMASTER' | 'STEP_MILL' | 'SKI_ERG' | 'SWIMMING' | 'WALKING' | 'SKATING'
  | 'PROWLER' | 'JUMP_ROPE' | 'HIIT' | 'CIRCUIT' | 'OTHER';

export type SetType = 'WARMUP' | 'WORKING' | 'BACKOFF' | 'DROP' | 'AMRAP' | 'FAILURE' | 'CUSTOM';

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
  record_types: string[];
  set_types: SetType[];
  cardio_types: CardioType[];
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

export interface TrainingAssignment {
  id: string; client_id: string; workout_template_id: string;
  program_id: string | null; trainer_id: string | null;
  assigned_date: string; scheduled_date: string | null;
  status: 'ASSIGNED' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED' | 'MISSED' | 'CANCELLED';
  notes: string | null; template_name?: string; client_name?: string;
}

export interface SetPerformance {
  id: string; exercise_performance_id: string;
  set_number: number; set_type: SetType;
  planned_reps: number | null; actual_reps: number | null;
  planned_weight: number | null; actual_weight: number | null;
  weight_unit: 'kg' | 'lb';
  planned_rpe: number | null; actual_rpe: number | null;
  planned_rir: number | null; actual_rir: number | null;
  tempo: string | null; rest_seconds: number | null;
  completed: boolean; failure: boolean; notes: string | null;
}

export interface CardioPerformance {
  id: string; exercise_performance_id: string; cardio_type: CardioType;
  duration_seconds: number | null; distance: number | null;
  distance_unit: 'm' | 'km' | 'mile' | null;
  average_speed: number | null; max_speed?: number | null; speed_unit?: string | null;
  incline: number | null; resistance: number | null;
  average_heart_rate: number | null; max_heart_rate?: number | null; calories_burned: number | null;
  pace_seconds: number | null; pace_distance?: number | null; cadence?: number | null;
  floors_completed?: number | null; steps_completed?: number | null; elevation_gain?: number | null;
  work_interval_seconds?: number | null; rest_interval_seconds?: number | null;
  rounds_completed: number | null;
  rpe: number | null; completed: boolean; notes: string | null;
}

export interface ExercisePerformance {
  id: string; session_id: string; exercise_id: string | null; exercise_name: string;
  section: WorkoutSection | null; order_index: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
  sets: SetPerformance[];
  cardio: CardioPerformance[];
}

export interface TrainingSession {
  id: string; client_id: string; trainer_id: string | null;
  assignment_id: string | null; workout_template_id: string | null;
  template_name: string | null; session_date: string;
  started_at: string | null; completed_at: string | null;
  duration_seconds: number | null;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
  overall_rpe: number | null; client_notes: string | null; trainer_notes: string | null;
  performances?: ExercisePerformance[];
}

export interface SessionSummary {
  exercises: number;
  exercisesCompleted: number;
  strength: { loadKg: number; hardSets: number; reps: number };
  cardio: { efforts: number; distanceMetres: number; distanceKm: number; durationSeconds: number; calories: number };
  averageRpe: number | null;
  durationSeconds: number | null;
}

export interface PersonalRecord {
  id: string; client_id: string; exercise_id: string | null; exercise_name: string;
  record_type: string; value: number; unit: string | null; reps: number | null;
  achieved_on: string; superseded_at: string | null;
}

type Payload = Record<string, unknown>;
const body = (data: Payload, method = 'POST') => ({ method, body: JSON.stringify(data) });

// ── Client ─────────────────────────────────────────────────────────────────

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

  assignments: {
    list: (params?: Record<string, string | number>) =>
      http<{ data: TrainingAssignment[] }>(`/api/training/assignments${buildQs(params)}`),
    create: (data: Payload) =>
      http<{ data: TrainingAssignment; screening_warnings: string[] }>('/api/training/assignments', body(data)),
    update: (id: string, data: Payload) =>
      http<{ data: TrainingAssignment }>(`/api/training/assignments/${id}`, body(data, 'PATCH')),
  },

  sessions: {
    list: (params?: Record<string, string | number>) =>
      http<{ data: TrainingSession[] }>(`/api/training/sessions${buildQs(params)}`),
    get: (id: string) => http<{ data: TrainingSession }>(`/api/training/sessions/${id}`),
    create: (data: Payload) =>
      http<{ data: TrainingSession; screening_warnings: string[] }>('/api/training/sessions', body(data)),
    update: (id: string, data: Payload) =>
      http<{ data: TrainingSession }>(`/api/training/sessions/${id}`, body(data, 'PATCH')),

    /** Copy the template's exercises onto the session. */
    seed: (id: string) => http<{ data: { seeded: number } }>(`/api/training/sessions/${id}/seed`, body({})),
    start: (id: string) => http<{ data: TrainingSession }>(`/api/training/sessions/${id}/start`, body({})),
    complete: (id: string, data: Payload = {}) =>
      http<{ data: TrainingSession; summary: SessionSummary; records: PersonalRecord[]; already_complete: boolean }>(
        `/api/training/sessions/${id}/complete`, body(data)),

    addExercise: (id: string, data: Payload) =>
      http<{ data: ExercisePerformance }>(`/api/training/sessions/${id}/exercises`, body(data)),
  },

  /**
   * Logging. `client_token` is an idempotency key generated on the device —
   * a retry on a flaky gym connection must not write the set twice, and the
   * server answers 200 with `duplicate: true` rather than 201 when it replays.
   */
  performances: {
    logSet: (performanceId: string, data: Payload) =>
      http<{ data: SetPerformance; duplicate: boolean }>(
        `/api/training/performances/${performanceId}/sets`, body(data)),
    logCardio: (performanceId: string, data: Payload) =>
      http<{ data: CardioPerformance; duplicate: boolean }>(
        `/api/training/performances/${performanceId}/cardio`, body(data)),
  },

  sets: {
    update: (id: string, data: Payload) =>
      http<{ data: SetPerformance }>(`/api/training/sets/${id}`, body(data, 'PATCH')),
    remove: (id: string) =>
      http<{ data: { id: string; deleted: boolean } }>(`/api/training/sets/${id}`, { method: 'DELETE' }),
  },

  cardio: {
    update: (id: string, data: Payload) =>
      http<{ data: CardioPerformance }>(`/api/training/cardio/${id}`, body(data, 'PATCH')),
  },

  records: {
    list: (clientId: string, opts?: { history?: boolean }) =>
      http<{ data: PersonalRecord[] }>(
        `/api/training/records${buildQs({ client_id: clientId, ...(opts?.history ? { history: 1 } : {}) })}`),
  },
};
