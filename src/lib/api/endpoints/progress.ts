// API endpoints: progress.
//
// Lifted verbatim from the single `api` object in the 4,185-line api.ts.
// Method names, URLs and request shapes are unchanged; index.ts composes these
// back into the same `api` object every consumer already imports.

import { http } from '../../http';
import { buildQs } from '../qs';
import type {
  ConsentRecord, InformedConsent, InformedConsentActivity, MedicalClearance, ParqDocument,
  ParqDocumentType, ParqForm, ParqFormDetail, ParqGateStatus, WorkoutPreviousExercise,
  WorkoutProgressPoint, WorkoutSession, WorkoutSessionDetail, WorkoutSessionExercise,
  WorkoutSet, WorkoutVolumePoint, TodayRoster, TrainingAnalytics, MuscleLandmark,
} from '../types';

// ── Progress Tracking ─────────────────────────────────────────
export const progress = {
  assessments: {
    list: (params?: Record<string, string | number>) =>
      http<{ data: unknown[] }>(`/api/progress/assessments${buildQs(params)}`),
    create: (data: Record<string, unknown>) =>
      http<{ data: unknown }>('/api/progress/assessments', {
        method: 'POST', body: JSON.stringify(data),
      }),
  },
  goals: {
    list: (params?: Record<string, string | number>) =>
      http<{ data: unknown[] }>(`/api/progress/goals${buildQs(params)}`),
    create: (data: Record<string, unknown>) =>
      http<{ data: unknown }>('/api/progress/goals', {
        method: 'POST', body: JSON.stringify(data),
      }),
    update: (id: string, data: Record<string, unknown>) =>
      http<{ data: unknown }>(`/api/progress/goals/${id}`, {
        method: 'PATCH', body: JSON.stringify(data),
      }),
  },
  weeklyCheckins: {
    list: (params?: Record<string, string | number>) =>
      http<{ data: unknown[] }>(`/api/progress/weekly-checkins${buildQs(params)}`),
    create: (data: Record<string, unknown>) =>
      http<{ data: unknown }>('/api/progress/weekly-checkins', {
        method: 'POST', body: JSON.stringify(data),
      }),
  },
  strengthLogs: {
    list: (params?: Record<string, string | number>) =>
      http<{ data: unknown[] }>(`/api/progress/strength-logs${buildQs(params)}`),
    create: (data: Record<string, unknown>) =>
      http<{ data: unknown }>('/api/progress/strength-logs', {
        method: 'POST', body: JSON.stringify(data),
      }),
  },
  progressPhotos: {
    list: (params?: Record<string, string | number>) =>
      http<{ data: unknown[] }>(`/api/progress/progress-photos${buildQs(params)}`),
    create: (data: Record<string, unknown>) =>
      http<{ data: unknown }>('/api/progress/progress-photos', {
        method: 'POST', body: JSON.stringify(data),
      }),
    delete: (id: string) => http(`/api/progress/progress-photos/${id}`, { method: 'DELETE' }),
  },
  lifestyleAssessments: {
    list: (params?: Record<string, string | number>) =>
      http<{ data: unknown[] }>(`/api/progress/lifestyle-assessments${buildQs(params)}`),
    create: (data: Record<string, unknown>) =>
      http<{ data: unknown }>('/api/progress/lifestyle-assessments', {
        method: 'POST', body: JSON.stringify(data),
      }),
    update: (id: string, data: Record<string, unknown>) =>
      http<{ data: unknown }>(`/api/progress/lifestyle-assessments/${id}`, {
        method: 'PATCH', body: JSON.stringify(data),
      }),
  },
  nutritionAssessments: {
    list: (params?: Record<string, string | number>) =>
      http<{ data: unknown[] }>(`/api/progress/nutrition-assessments${buildQs(params)}`),
    create: (data: Record<string, unknown>) =>
      http<{ data: unknown }>('/api/progress/nutrition-assessments', {
        method: 'POST', body: JSON.stringify(data),
      }),
    update: (id: string, data: Record<string, unknown>) =>
      http<{ data: unknown }>(`/api/progress/nutrition-assessments/${id}`, {
        method: 'PATCH', body: JSON.stringify(data),
      }),
  },
  mobilityPerformanceAssessments: {
    list: (params?: Record<string, string | number>) =>
      http<{ data: unknown[] }>(`/api/progress/mobility-performance-assessments${buildQs(params)}`),
    create: (data: Record<string, unknown>) =>
      http<{ data: unknown }>('/api/progress/mobility-performance-assessments', {
        method: 'POST', body: JSON.stringify(data),
      }),
    update: (id: string, data: Record<string, unknown>) =>
      http<{ data: unknown }>(`/api/progress/mobility-performance-assessments/${id}`, {
        method: 'PATCH', body: JSON.stringify(data),
      }),
  },
  postureAssessments: {
    list: (params?: Record<string, string | number>) =>
      http<{ data: unknown[] }>(`/api/progress/posture-assessments${buildQs(params)}`),
    create: (data: Record<string, unknown>) =>
      http<{ data: unknown }>('/api/progress/posture-assessments', {
        method: 'POST', body: JSON.stringify(data),
      }),
    update: (id: string, data: Record<string, unknown>) =>
      http<{ data: unknown }>(`/api/progress/posture-assessments/${id}`, {
        method: 'PATCH', body: JSON.stringify(data),
      }),
  },
  parqForms: {
    list: (params?: { client_id?: string }) =>
      http<{ data: ParqForm[] }>(`/api/pt-os/parq/forms${buildQs(params)}`),
    get: (id: string) =>
      http<{ data: ParqFormDetail }>(`/api/pt-os/parq/forms/${id}`),
    create: (data: Record<string, unknown>) =>
      http<{ data: ParqForm }>('/api/pt-os/parq/forms', {
        method: 'POST', body: JSON.stringify(data),
      }),
    update: (id: string, data: Record<string, unknown>) =>
      http<{ data: ParqForm }>(`/api/pt-os/parq/forms/${id}`, {
        method: 'PATCH', body: JSON.stringify(data),
      }),
    gateStatus: (id: string) =>
      http<ParqGateStatus>(`/api/pt-os/parq/forms/${id}/gate-status`),
  },
  parqClearance: {
    create: (formId: string, data: Record<string, unknown>) =>
      http<{ data: MedicalClearance }>(`/api/pt-os/parq/forms/${formId}/clearance`, {
        method: 'POST', body: JSON.stringify(data),
      }),
    update: (id: string, data: Record<string, unknown>) =>
      http<{ data: MedicalClearance }>(`/api/pt-os/parq/clearance/${id}`, {
        method: 'PATCH', body: JSON.stringify(data),
      }),
  },
  parqConsent: {
    create: (formId: string, data: Record<string, unknown>) =>
      http<{ data: ConsentRecord }>(`/api/pt-os/parq/forms/${formId}/consent`, {
        method: 'POST', body: JSON.stringify(data),
      }),
  },
  parqDocuments: {
    upload: (formId: string, docType: ParqDocumentType, file: File) => {
      const formData = new FormData();
      formData.append('doc_type', docType);
      formData.append('file', file);
      return http<{ data: ParqDocument }>(`/api/pt-os/parq/forms/${formId}/documents`, {
        method: 'POST', body: formData,
      });
    },
  },
  informedConsent: {
    list: (params?: { client_id?: string }) =>
      http<{ data: InformedConsent[] }>(`/api/pt-os/informed-consent${buildQs(params)}`),
    get: (id: string) =>
      http<{ data: InformedConsent }>(`/api/pt-os/informed-consent/${id}`),
    activity: (id: string) =>
      http<{ data: InformedConsentActivity[] }>(`/api/pt-os/informed-consent/${id}/activity`),
    create: (data: Record<string, unknown>) =>
      http<{ data: InformedConsent }>('/api/pt-os/informed-consent', {
        method: 'POST', body: JSON.stringify(data),
      }),
    update: (id: string, data: Record<string, unknown>) =>
      http<{ data: InformedConsent }>(`/api/pt-os/informed-consent/${id}`, {
        method: 'PATCH', body: JSON.stringify(data),
      }),
    sign: (id: string, data: { signer: 'client' | 'trainer' | 'witness'; signature: string; witness_name?: string }) =>
      http<{ data: InformedConsent }>(`/api/pt-os/informed-consent/${id}/sign`, {
        method: 'POST', body: JSON.stringify(data),
      }),
    revoke: (id: string) =>
      http<{ data: InformedConsent }>(`/api/pt-os/informed-consent/${id}/revoke`, {
        method: 'POST',
      }),
    uploadClearance: (id: string, file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return http<{ data: InformedConsent }>(`/api/pt-os/informed-consent/${id}/medical-clearance`, {
        method: 'POST', body: formData,
      });
    },
  },
  workoutLog: {
    /**
     * The trainer's roster for one day: who is on an active programme, what
     * their plan prescribes for that weekday, and whether a session already
     * exists. Defaults to today when no date is given.
     */
    today: (params?: { date?: string }) =>
      http<{ data: TodayRoster }>(`/api/pt-os/workout-log/today${buildQs(params)}`),
    sessions: {
      list: (params: { client_id: string; limit?: number; offset?: number }) =>
        http<{ data: WorkoutSession[] }>(`/api/pt-os/workout-log/sessions${buildQs(params)}`),
      get: (id: string) =>
        http<{ data: WorkoutSessionDetail }>(`/api/pt-os/workout-log/sessions/${id}`),
      create: (data: Record<string, unknown>) =>
        http<{ data: WorkoutSession; screening_warnings?: string[] }>('/api/pt-os/workout-log/sessions', {
          method: 'POST', body: JSON.stringify(data),
        }),
      update: (id: string, data: Record<string, unknown>) =>
        http<{ data: WorkoutSession }>(`/api/pt-os/workout-log/sessions/${id}`, {
          method: 'PATCH', body: JSON.stringify(data),
        }),
      delete: (id: string) =>
        http<{ message: string }>(`/api/pt-os/workout-log/sessions/${id}`, { method: 'DELETE' }),
      plannedDayOptions: (id: string) =>
        http<{ data: string[] }>(`/api/pt-os/workout-log/sessions/${id}/planned-day-options`),
    },
    exercises: {
      add: (sessionId: string, data: { exercise_id?: string | null; exercise_name: string; notes?: string | null }) =>
        http<{ data: WorkoutSessionExercise }>(`/api/pt-os/workout-log/sessions/${sessionId}/exercises`, {
          method: 'POST', body: JSON.stringify(data),
        }),
      remove: (id: string) =>
        http<{ message: string }>(`/api/pt-os/workout-log/exercises/${id}`, { method: 'DELETE' }),
    },
    sets: {
      add: (sessionExerciseId: string, data: Record<string, unknown>) =>
        http<{ data: WorkoutSet }>(`/api/pt-os/workout-log/exercises/${sessionExerciseId}/sets`, {
          method: 'POST', body: JSON.stringify(data),
        }),
      update: (id: string, data: Record<string, unknown>) =>
        http<{ data: WorkoutSet }>(`/api/pt-os/workout-log/sets/${id}`, {
          method: 'PATCH', body: JSON.stringify(data),
        }),
      delete: (id: string) =>
        http<{ message: string }>(`/api/pt-os/workout-log/sets/${id}`, { method: 'DELETE' }),
    },
    previous: (params: { client_id: string; exercise_id?: string; exercise_name?: string; exclude_session_id?: string }) =>
      http<{ data: WorkoutPreviousExercise | null }>(`/api/pt-os/workout-log/previous${buildQs(params)}`),
    progress: (params: { client_id: string; exercise_id?: string; exercise_name?: string }) =>
      http<{ data: WorkoutProgressPoint[] }>(`/api/pt-os/workout-log/progress${buildQs(params)}`),
    volumeSummary: (params: { client_id: string; group_by?: 'week' | 'month' }) =>
      http<{ data: WorkoutVolumePoint[] }>(`/api/pt-os/workout-log/volume-summary${buildQs(params)}`),

    /**
     * Adherence, records, and weekly sets per muscle — in one request.
     *
     * One call rather than four because the screen shows them together, and
     * four round trips on a phone in a gym is four chances to watch a spinner.
     */
    analytics: (params: { client_id: string; weeks?: number; as_of?: string }) =>
      http<{ data: TrainingAnalytics }>(`/api/pt-os/workout-log/analytics${buildQs(params)}`),

    /**
     * Build the week's PDF and return where it was stored.
     *
     * A POST because it writes a file. Keyed by client and week server-side,
     * so pressing the button twice overwrites rather than leaving a file per
     * tap. The URL is behind the studio session — a client cannot open it,
     * which is why the share action sends text rather than a link.
     */
    weeklyReport: (data: { client_id: string; week_start?: string; coach_note?: string }) =>
      http<{ data: { url: string; week_start: string; week_end: string } }>(
        '/api/pt-os/workout-log/weekly-report',
        { method: 'POST', body: JSON.stringify(data) },
      ),

    /**
     * The studio's weekly set ranges per muscle.
     *
     * A range is a coaching judgement, not a measurement, so it is stored and
     * editable rather than hard-coded — otherwise a number the trainer never
     * chose would sit beside a number measured from their client, in the same
     * typeface, with nothing to tell them apart.
     */
    landmarks: {
      list: () => http<{ data: MuscleLandmark[] }>('/api/pt-os/workout-log/landmarks'),
      /** Both values may be null: "no range" is an honest answer. */
      save: (muscle: string, data: { mev_sets: number | null; mrv_sets: number | null }) =>
        http<{ data: MuscleLandmark }>(`/api/pt-os/workout-log/landmarks/${encodeURIComponent(muscle)}`, {
          method: 'PUT', body: JSON.stringify(data),
        }),
      /**
       * Drop this studio's override so the shared starting range comes back.
       *
       * Not the same as saving two nulls, which stores "this muscle has no
       * range" — there would otherwise be no way back to a value a trainer
       * had already typed over.
       */
      reset: (muscle: string) =>
        http<{ data: MuscleLandmark }>(`/api/pt-os/workout-log/landmarks/${encodeURIComponent(muscle)}`, {
          method: 'DELETE',
        }),
    },
  },
};
