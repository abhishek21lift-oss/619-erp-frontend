// API endpoints: workouts, exercises, diet, classes, bookings, calendar.
//
// Lifted verbatim from the single `api` object in the 4,185-line api.ts.
// Method names, URLs and request shapes are unchanged; index.ts composes these
// back into the same `api` object every consumer already imports.

import { http } from '../../http';
import { buildQs } from '../qs';
import type {
  DietAssignment, DietTemplate, LibraryExercise, Meal, NutritionLog, ProgressionType,
  WorkoutAssignment, WorkoutAssignmentDetail, WorkoutExerciseInput, WorkoutPlan,
  WorkoutPlanExercise, WorkoutPlanVersion,
} from '../types';

// ── Workout Plans / Assignments ────────────────────────────────────
export const workouts = {
  plans: {
    list: (params?: Record<string, string | number>) =>
      http<WorkoutPlan[]>(`/api/workouts/plans${buildQs(params)}`),
    /**
     * One plan.
     *
     * `week` asks for that week's PRESCRIPTION rather than the stored week-1
     * rows: a plan stores one week and derives the rest from its progression
     * rule, so week 6 has no rows of its own unless a trainer wrote a deload
     * by hand. Resolving it server-side is deliberate — the client's workout
     * log resolves the same way, and two implementations of the arithmetic
     * would eventually disagree about what week 6 says.
     */
    detail: (id: string, params?: { week?: number }) =>
      http<WorkoutPlan>(`/api/workouts/plans/${id}${buildQs(params)}`),
    create: (data: {
      name: string; description?: string; goal?: string; difficulty?: string;
      duration_weeks?: number; sessions_per_week?: number; is_template?: boolean;
      exercises?: Array<{ exercise_id: string; day_of_week: number; sort_order?: number; sets?: number; reps?: number; rest_seconds?: number; notes?: string }>;
    }) =>
      http<{ message: string; plan: WorkoutPlan }>('/api/workouts/plans', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: {
      name?: string; description?: string; goal?: string; difficulty?: string;
      duration_weeks?: number; sessions_per_week?: number;
      /**
       * The progression rule. Sending `progression_type` is what makes the
       * amount writable at all — the server keeps the stored amount when the
       * type is absent, so a rename cannot silently clear the rule, and
       * sending the type with a null amount really does clear it.
       */
      progression_type?: ProgressionType;
      progression_amount?: number | null;
      progression_every_weeks?: number;
      exercises?: Array<{ exercise_id: string; day_of_week: number; sort_order?: number; sets?: number; reps?: number; rest_seconds?: number; notes?: string }>;
    }) =>
      http<{ message: string; plan: WorkoutPlan }>(`/api/workouts/plans/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      http<{ message: string }>(`/api/workouts/plans/${id}`, { method: 'DELETE' }),

    /**
     * Frozen copies of what the plan USED to say.
     *
     * The client's history is safe without this — sessions and sets record
     * what was actually done, independently of the plan. What an edit destroys
     * is the prescription: what the programme said in March, once April's
     * numbers are typed over it.
     *
     * `create` archives the current state and leaves the live plan in place,
     * so its id, its assignments and its clients are untouched. It is a
     * deliberate action, never automatic: the builder autosaves on every field
     * blur, and versioning on write would mint a version per keystroke.
     */
    versions: {
      list: (planId: string) =>
        http<WorkoutPlanVersion[]>(`/api/workouts/plans/${planId}/versions`),
      create: (planId: string) =>
        http<{ message: string; plan: WorkoutPlan; snapshot: { id: string; version: number; exercise_count: number } }>(
          `/api/workouts/plans/${planId}/versions`,
          { method: 'POST' },
        ),
    },

    /**
     * Granular, id-stable edits to a plan's exercises.
     *
     * `update` above replaces the WHOLE plan: it deletes every exercise row
     * and re-inserts, minting new ids. That is fine for a save button and
     * fatal for autosave — saving Monday would erase Tuesday-Sunday, and
     * every save would invalidate the ids the builder is dragging.
     *
     * These four touch only what they name, so the builder can save on every
     * keystroke and an exercise keeps its id for its whole life.
     */
    exercises: {
      add: (planId: string, data: WorkoutExerciseInput & { exercise_id: string }) =>
        http<{ message: string; exercise: WorkoutPlanExercise }>(
          `/api/workouts/plans/${planId}/exercises`,
          { method: 'POST', body: JSON.stringify(data) },
        ),
      /** Send only the fields that changed; `null` clears, `0` is kept. */
      patch: (planId: string, rowId: string, data: WorkoutExerciseInput) =>
        http<{ message: string; exercise: WorkoutPlanExercise }>(
          `/api/workouts/plans/${planId}/exercises/${rowId}`,
          { method: 'PATCH', body: JSON.stringify(data) },
        ),
      remove: (planId: string, rowId: string) =>
        http<{ message: string }>(
          `/api/workouts/plans/${planId}/exercises/${rowId}`,
          { method: 'DELETE' },
        ),
      /**
       * Reorder one day. `exerciseIds` must list exactly the exercises already
       * on that day, in their new order — the server rejects anything else
       * rather than silently moving a row in from elsewhere.
       */
      reorder: (planId: string, day: number, exerciseIds: string[]) =>
        http<{ message: string; count: number }>(
          `/api/workouts/plans/${planId}/days/${day}/order`,
          { method: 'PUT', body: JSON.stringify({ exercise_ids: exerciseIds }) },
        ),
    },
  },
  assignments: {
    list: (params: { client_id: string; status?: string }) =>
      http<WorkoutAssignment[]>(`/api/workouts/assignments${buildQs(params)}`),
    detail: (id: string) =>
      http<WorkoutAssignmentDetail>(`/api/workouts/assignments/${id}`),
  },
  assign: (data: { workout_plan_id: string; client_id: string; start_date?: string; end_date?: string; notes?: string }) =>
    http<{ message: string; assignment: WorkoutAssignment; screening_warnings?: string[] }>('/api/workouts/assign', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateProgress: (id: string, data: { progress_pct: number }) =>
    http<{ message: string; assignment: WorkoutAssignment }>(`/api/workouts/assignments/${id}/progress`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// ── Exercise Library ─────────────────────────────────────────────
// Single client-side namespace for /api/workouts/exercises* — the old
// duplicate api.workouts.exercises pointed at the exact same endpoints.
export const exercises = {
  list: (qs?: string) =>
    http<LibraryExercise[]>(`/api/workouts/exercises${qs ? `?${qs}` : ''}`),
  meta: () =>
    http<{ body_parts: string[]; equipment_types: string[]; exercise_types: string[]; difficulties: string[]; total: number }>(
      '/api/workouts/exercises/meta'
    ),
  count: (qs?: string) =>
    http<{ total: number }>(`/api/workouts/exercises/meta${qs ? `?${qs}` : ''}`),
  create: (data: Record<string, unknown>) =>
    http<{ message: string; exercise: unknown }>('/api/workouts/exercises', {
      method: 'POST', body: JSON.stringify(data),
    }),
  update: (id: string, data: Record<string, unknown>) =>
    http<{ message: string; exercise: unknown }>(`/api/workouts/exercises/${id}`, {
      method: 'PUT', body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    http<{ message: string }>(`/api/workouts/exercises/${id}`, { method: 'DELETE' }),
};

// ── Diet / Nutrition ──────────────────────────────────────────────
export const diet = {
  meals: {
    list: (params?: Record<string, string | number>) =>
      http<Meal[]>(`/api/diet/meals${buildQs(params)}`),
    create: (data: Record<string, unknown>) =>
      http<{ message: string; meal: Meal }>('/api/diet/meals', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
  templates: {
    list: (params?: Record<string, string | number>) =>
      http<DietTemplate[]>(`/api/diet/templates${buildQs(params)}`),
    create: (data: Record<string, unknown>) =>
      http<{ message: string; template: DietTemplate }>('/api/diet/templates', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
  assign: (data: { diet_template_id: string; client_id: string; start_date?: string; end_date?: string; notes?: string }) =>
    http<{ message: string; assignment: DietAssignment }>('/api/diet/assign', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  assignments: {
    list: (params: { client_id: string; status?: string }) =>
      http<DietAssignment[]>(`/api/diet/assignments${buildQs(params)}`),
  },
  tracker: {
    get: (params: { client_id: string; date?: string }) =>
      http<{ today: NutritionLog; history: NutritionLog[] }>(`/api/diet/tracker${buildQs(params)}`),
    update: (data: { client_id: string; log_date?: string; calories_consumed?: number; protein_g?: number; carbs_g?: number; fats_g?: number; water_glasses?: number; notes?: string }) =>
      http<{ message: string; log: NutritionLog }>('/api/diet/tracker', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },
  fitnessProfile: {
    get: (clientId: string) =>
      http<unknown>(`/api/diet/fitness-profile/${clientId}`),
    update: (clientId: string, data: Record<string, unknown>) =>
      http<{ message: string; profile: unknown }>(`/api/diet/fitness-profile/${clientId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },
  supplements: {
    list: () => http<unknown[]>('/api/diet/supplements'),
  },
};

export const classes = {
  sessions: (params?: Record<string, string | number>) =>
    http<unknown[]>(`/api/classes/sessions${buildQs(params)}`),
};

// ── Member Portal ────────────────────────────────────────────
export const bookings = {
  list: (params?: Record<string, string | number>) =>
    http<unknown[]>(`/api/bookings${buildQs(params)}`),
  create: (data: { session_id: string }) =>
    http<{ message: string; booking: unknown }>('/api/bookings', {
      method: 'POST', body: JSON.stringify(data),
    }),
};

// ── Google Calendar ─────────────────────────────────────────────
export const calendar = {
  status: () =>
    http<{ connected: boolean; connectedAt?: string; lastSyncAt?: string; calendarId?: string }>('/api/calendar/status'),
  authUrl: () =>
    http<{ url: string }>('/api/calendar/auth-url'),
  disconnect: () =>
    http<{ message: string }>('/api/calendar/disconnect', { method: 'DELETE' }),
};
