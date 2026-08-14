// The API client — the single entry point 142 files import as '@/lib/api'.
//
// This was one 4,185-line module: 213 types plus one `export const api = {…}`
// object literal with 45 namespaces. It is now a directory, and this file is
// the composition root.
//
// ── What must not change ──────────────────────────────────────────────────
//
// Everything importable from '@/lib/api' before the split is still importable
// from '@/lib/api' after it — the same `api` object, the same types, the same
// re-exported helpers. No consumer file was touched, which is the property
// __tests__/api-shape.test.ts pins with a snapshot of all 462 endpoints.
//
// Moving api.ts to api/index.ts is what keeps the specifier working: the
// directory resolves to this file, so no import path anywhere had to change.

import { auth, webauthn, accounts, profile } from './endpoints/auth';
import { clients, trainers, leave, attendance } from './endpoints/people';
import { payments, invoices, expenses, offers, upiPayments } from './endpoints/money';
import { workouts, exercises, diet, classes, bookings, calendar } from './endpoints/training';
// The Training OS domain (/api/training). Sits beside `workouts`, which still
// points at the old /api/workouts, while the builder is rebuilt on top of it.
import { training } from './endpoints/trainingOs';
import { progress } from './endpoints/progress';
import { pt } from './endpoints/ptOs';
import { branches, gymSettings, qr, subscription, membershipPlans } from './endpoints/studio';
import {
  superAdmin, settings, features, invitations, integrations,
  clientActivation, clientLogin, me,
} from './endpoints/platform';
import { campaigns, feedback, communication, notifications, automation, support } from './endpoints/engagement';
import { reports, search, activity, ai } from './endpoints/insights';

export { http } from '../http';
export { ROLES, normaliseRole, hasRole, isAdminOrManager } from '../roles';
export * from './types';

// Training OS types. Exported from here so consumers keep importing everything
// from '@/lib/api', which is the property api-shape.test.ts pins.
export type {
  PrescriptionType, WorkoutSection, CardioType, SetType, LogsAs,
  PrescriptionTypeMeta, TrainingMeta,
  TrainingProgram, ProgramPhase, ProgramWeek,
  WorkoutTemplate, TemplateExercise, TrainingAssignment,
  TrainingSession, ExercisePerformance, SetPerformance, CardioPerformance,
  SessionSummary, PersonalRecord,
} from './endpoints/trainingOs';

// qsOf and buildQs are deliberately NOT re-exported. They were private to
// api.ts and they stay private to the directory: exporting them here would
// widen '@/lib/api' by two names, which is a surface change however small.
// The endpoint modules import them from './qs' directly.

export const api = {
  auth,
  webauthn,
  accounts,
  profile,
  clients,
  trainers,
  leave,
  attendance,
  payments,
  invoices,
  expenses,
  offers,
  upiPayments,
  workouts,
  training,
  exercises,
  diet,
  classes,
  bookings,
  calendar,
  progress,
  pt,
  branches,
  gymSettings,
  qr,
  subscription,
  membershipPlans,
  superAdmin,
  settings,
  features,
  invitations,
  clientActivation,
  clientLogin,
  me,
  integrations,
  campaigns,
  feedback,
  communication,
  notifications,
  automation,
  support,
  reports,
  search,
  activity,
  ai,
};
