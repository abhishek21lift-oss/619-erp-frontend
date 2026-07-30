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

import { auth, webauthn, memberWebauthn, accounts, profile } from './endpoints/auth';
import { clients, trainers, member, leave, attendance, biometricAttend } from './endpoints/people';
import { payments, invoices, expenses, offers, upiPayments } from './endpoints/money';
import { workouts, exercises, diet, classes, bookings, calendar } from './endpoints/training';
import { progress } from './endpoints/progress';
import { pt } from './endpoints/ptOs';
import { branches, gymSettings, qr, subscription, membershipPlans } from './endpoints/studio';
import { admin, superAdmin, settings, features, invitations, integrations } from './endpoints/platform';
import { campaigns, feedback, communication, notifications, automation, support } from './endpoints/engagement';
import { reports, search, activity, ai } from './endpoints/insights';

export { http } from '../http';
export { ROLES, normaliseRole, hasRole, isAdminOrManager } from '../roles';
export * from './types';

// qsOf and buildQs are deliberately NOT re-exported. They were private to
// api.ts and they stay private to the directory: exporting them here would
// widen '@/lib/api' by two names, which is a surface change however small.
// The endpoint modules import them from './qs' directly.

export const api = {
  auth,
  webauthn,
  memberWebauthn,
  accounts,
  profile,
  clients,
  trainers,
  member,
  leave,
  attendance,
  biometricAttend,
  payments,
  invoices,
  expenses,
  offers,
  upiPayments,
  workouts,
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
  admin,
  superAdmin,
  settings,
  features,
  invitations,
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
