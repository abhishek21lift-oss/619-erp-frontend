// API endpoints: pt.
//
// Lifted verbatim from the single `api` object in the 4,185-line api.ts.
// Method names, URLs and request shapes are unchanged; index.ts composes these
// back into the same `api` object every consumer already imports.

import { http } from '../../http';
import { buildQs } from '../qs';
import type {
  ClientBirthday, DuplicateGroup, MergeResult, PtLead, PtSession,
} from '../types';

// ── PT OS ────────────────────────────────────────────────────
export const pt = {
  dashboard: () =>
    http<{ data: unknown }>('/api/pt-os/dashboard'),
  clients: (params?: { trainer_id?: string }) =>
    http<{ data: unknown[]; total: number }>(`/api/pt-os/clients${buildQs(params)}`),
  client: (id: string) =>
    http<{ data: unknown }>(`/api/pt-os/clients/${id}`),
  create: (data: Record<string, unknown>) =>
    http<{ data: unknown }>('/api/pt-os/clients', { method: 'POST', body: JSON.stringify(data) }),
  uploadPhoto: (id: string, photo: string) =>
    http<{ data: unknown }>(`/api/pt-os/clients/${id}/photo`, { method: 'POST', body: JSON.stringify({ photo }) }),
  trainers: (params?: Record<string, string>) =>
    http<{ data: unknown[] }>(`/api/pt-os/trainers${buildQs(params)}`),
  sessions: (params?: { trainer_id?: string; date?: string }) =>
    http<{ data: unknown[] }>(`/api/pt-os/sessions${buildQs(params)}`),
  /** The signed-in user's own sessions as a trainer (never another's). */
  mySessions: (params?: { from?: string; to?: string }) =>
    http<{ data: PtSession[]; total: number; trainer_linked: boolean }>(
      `/api/pt-os/sessions/my${buildQs(params)}`,
    ),
  createSession: (data: Record<string, unknown>) =>
    // `data` is a single session row normally, or an array of 4 when
    // booked as recurring (weekly occurrences share one recurrence_id).
    http<{ data: unknown | unknown[] }>('/api/pt-os/sessions', { method: 'POST', body: JSON.stringify(data) }),
  updateSession: (id: string, data: Record<string, unknown>) =>
    http<{ data: unknown }>(`/api/pt-os/sessions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  payments: (params?: { client_id?: string; trainer_id?: string }) =>
    http<{ data: unknown[] }>(`/api/pt-os/payments${buildQs(params)}`),
  createPayment: (data: Record<string, unknown>) =>
    http<{ data: unknown }>('/api/pt-os/payments', { method: 'POST', body: JSON.stringify(data) }),
  balanceSheet: (params?: { trainer_id?: string }) =>
    http<{ data: unknown[]; total: number; total_outstanding: number }>(
      `/api/pt-os/balance-sheet${buildQs(params)}`,
    ),
  clientBirthdays: (params?: { trainer_id?: string }) =>
    http<{ data: ClientBirthday[]; total: number; today_count: number }>(
      `/api/pt-os/clients/birthdays${buildQs(params)}`,
    ),
  commissions: (params?: { trainer_id?: string }) =>
    http<{ data: unknown[] }>(`/api/pt-os/commissions${buildQs(params)}`),
  calculateCommissions: (month?: string) =>
    http<{ data: { count: number; total: number } }>('/api/pt-os/commissions/calculate', {
      method: 'POST', body: JSON.stringify({ month }),
    }),
  payouts: (params?: { month?: string }) =>
    http<{ data: unknown[]; month: string }>(`/api/pt-os/payouts${buildQs(params)}`),
  revenue: () =>
    http<{ data: unknown[] }>('/api/pt-os/revenue'),
  trainerPerformance: () =>
    http<{ data: unknown[] }>('/api/pt-os/trainer-performance'),
  updateCommission: (trainerId: string, data: Record<string, unknown>) =>
    http<{ data: unknown }>(`/api/pt-os/commissions/${trainerId}`, {
      method: 'PUT', body: JSON.stringify(data),
    }),
  updatePayout: (trainerId: string, data: Record<string, unknown>) =>
    http<{ data: unknown }>(`/api/pt-os/payouts/${trainerId}`, {
      method: 'PUT', body: JSON.stringify(data),
    }),
  markAllPayoutsPaid: (month: string) =>
    http<{ data: unknown }>('/api/pt-os/payouts/mark-all-paid', {
      method: 'POST', body: JSON.stringify({ month }),
    }),
  updateClient: (id: string, data: Record<string, unknown>) =>
    http<{ data: unknown }>(`/api/pt-os/clients/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteClient: (id: string) =>
    http<{ message: string }>(`/api/pt-os/clients/${id}`, { method: 'DELETE' }),
  subscriptions: (id: string) =>
    http<{ data: unknown[]; total: number }>(`/api/pt-os/clients/${id}/subscriptions`),
  duplicates: () =>
    http<{ data: DuplicateGroup[]; total_groups: number; total_records: number; total_duplicates: number; total_financial_value: number }>('/api/pt-os/clients/duplicates'),
  mergeDuplicates: () =>
    http<{ success: boolean; run_id: string; merged_groups: number; records_removed: number; results: MergeResult[] }>('/api/pt-os/clients/merge-duplicates', { method: 'POST' }),
  leads: {
    list: (params?: { status?: string; q?: string }) =>
      http<{ data: PtLead[]; total: number }>(`/api/pt-os/leads${buildQs(params)}`),
    create: (data: Record<string, unknown>) =>
      http<{ data: PtLead }>('/api/pt-os/leads', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      http<{ data: PtLead }>(`/api/pt-os/leads/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) =>
      http<{ message: string }>(`/api/pt-os/leads/${id}`, { method: 'DELETE' }),
    convert: (id: string) =>
      http<{ data: { client_id: string } }>(`/api/pt-os/leads/${id}/convert`, { method: 'POST' }),
  },
};
