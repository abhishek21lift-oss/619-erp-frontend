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

import { auth, webauthn, profile } from './endpoints/auth';
import { clients, attendance } from './endpoints/people';
import { payments, invoices, expenses, offers, upiPayments } from './endpoints/money';
import { workouts, exercises, workoutGenerator, diet } from './endpoints/training';
import { progress } from './endpoints/progress';
import { pt, formSigning, screeningLink } from './endpoints/ptOs';
import { gymSettings, qr, subscription } from './endpoints/studio';
import {
  superAdmin, settings, features, invitations, integrations, whatsapp,
  clientActivation, clientLogin, me,
} from './endpoints/platform';
import {
  campaigns, feedback, communication, notifications, clientMessages, automation, support,
} from './endpoints/engagement';
import { reports, insights, search, activity, ai } from './endpoints/insights';

export { http } from '../http';
export { ROLES, TENANT_ROLES, hasRole, isRole } from '../roles';
export * from './types';
export type { WhatsAppState, WhatsAppStatus, WhatsAppQr } from './endpoints/platform';
export type { FormSigningPreview, ScreeningLinkResult } from './endpoints/ptOs';

// qsOf and buildQs remain private to the endpoint modules.

export const api = {
  auth,
  webauthn,
  profile,
  clients,
  attendance,
  payments,
  invoices,
  expenses,
  offers,
  upiPayments,
  workouts,
  exercises,
  workoutGenerator,
  diet,
  progress,
  pt,
  formSigning,
  screeningLink,
  gymSettings,
  qr,
  subscription,
  superAdmin,
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
  clientMessages,
  automation,
  support,
  reports,
  insights,
  search,
  activity,
  ai,
};
