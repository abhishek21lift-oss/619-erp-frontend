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

import { auth, webauthn, accounts, profile } from './endpoints/auth';
import { clients, trainers, leave, attendance } from './endpoints/people';
import { payments, invoices, expenses, offers, upiPayments } from './endpoints/money';
import { workouts, exercises, diet, classes, bookings, calendar } from './endpoints/training';
import { training } from './endpoints/trainingOs';
import { progress } from './endpoints/progress';
import { pt } from './endpoints/ptOs';
import { branches, gymSettings, qr, subscription, membershipPlans } from './endpoints/studio';
import {
  superAdmin, settings, features, invitations, integrations, whatsapp,
  clientActivation, clientLogin, me,
} from './endpoints/platform';
import { commandCenter } from './endpoints/commandCenter';
import { campaigns, feedback, communication, notifications, automation, support } from './endpoints/engagement';
import { reports, search, activity, ai } from './endpoints/insights';

export { http } from '../http';
export { ROLES, normaliseRole, hasRole, isAdminOrManager } from '../roles';
export * from './types';
export type { PlatformRiskDomain, PlatformRiskFinding, PlatformRiskReport } from './endpoints/commandCenter';
export type { WhatsAppState, WhatsAppStatus, WhatsAppQr } from './endpoints/platform';

export type {
  PrescriptionType, WorkoutSection, CardioType, SetType, LogsAs,
  PrescriptionTypeMeta, TrainingMeta,
  TrainingProgram, ProgramPhase, ProgramWeek,
  WorkoutTemplate, TemplateExercise, TrainingAssignment,
  TrainingSession, ExercisePerformance, SetPerformance, CardioPerformance,
  SessionSummary, PersonalRecord,
} from './endpoints/trainingOs';

// qsOf and buildQs remain private to the endpoint modules.

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
  commandCenter,
  settings,
  features,
  invitations,
  clientActivation,
  clientLogin,
  me,
  integrations,
  whatsapp,
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
