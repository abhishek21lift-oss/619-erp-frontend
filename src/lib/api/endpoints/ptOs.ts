// API endpoints: pt.
//
// Lifted verbatim from the single `api` object in the 4,185-line api.ts.
// Method names, URLs and request shapes are unchanged; index.ts composes these
// back into the same `api` object every consumer already imports.

import { http } from '../../http';
import { buildQs } from '../qs';
import type {
  ActivityLogEntry, CheckinInsight, ClientBirthday, ClientSnapshot, CoachGeneration, DuplicateGroup, MergeResult, PtLead, PtSession, RosterSignalSweep, TrainingBrief,
  TransformationRow,
} from '../types';

// ── PT OS ────────────────────────────────────────────────────
export const pt = {
  dashboard: () =>
    http<{ data: unknown }>('/api/pt-os/dashboard'),
  clients: (params?: { search?: string; status?: string; dues?: string; limit?: number; offset?: number }) =>
    http<{ data: unknown[]; total: number }>(`/api/pt-os/clients${buildQs(params)}`),
  /** Each active client's first and latest recorded weight. */
  transformations: () =>
    http<{ data: TransformationRow[] }>('/api/pt-os/transformations'),
  /**
   * The whole roster's signals in one read.
   *
   * Every other method here answers a question about ONE client, when somebody
   * opens them — which meant finding the clients who need a call required
   * opening every profile. This sweeps instead. Scoped server-side to the
   * caller's studio.
   */
  signals: (params?: { weeks?: number }) =>
    http<{ data: RosterSignalSweep }>(`/api/pt-os/signals${buildQs(params)}`),
  client: (id: string) =>
    http<{ data: unknown }>(`/api/pt-os/clients/${id}`),
  /**
   * Everything needed to write this client a programme, in one read.
   *
   * Assembled server-side from the six assessments that already exist —
   * PAR-Q, fitness testing, posture, mobility, lifestyle and goals — plus
   * four weeks of the log. It reports its own gaps in `missing` rather than
   * omitting them, because a brief that hides what nobody measured gets
   * designed against as though it were complete.
   */
  trainingBrief: (id: string) =>
    http<{ data: TrainingBrief }>(`/api/pt-os/clients/${id}/training-brief`),
  /**
   * What a trainer would otherwise have to remember about this client:
   * a lapsing term, a month with no measurements, a missed session, how far
   * they are from the number they came here for.
   */
  snapshot: (id: string) =>
    http<{ data: ClientSnapshot }>(`/api/pt-os/clients/${id}/snapshot`),
  /**
   * Ask a model to interpret this client's readings.
   *
   * POST and on demand: a profile is opened dozens of times a day and an LLM
   * call on every open is money and latency for an answer that has not
   * changed. Falls back to the derived prompts server-side, so this never
   * returns an empty card because the API was down.
   */
  coach: (id: string) =>
    http<{ data: CoachGeneration }>(`/api/pt-os/clients/${id}/coach`, { method: 'POST' }),
  /**
   * Ask a model what's notable in this client's recent weekly check-ins.
   * POST and on demand, same reasoning as coach() above — check-in history
   * doesn't change between two page opens an hour apart.
   */
  checkinInsight: (id: string) =>
    http<{ data: CheckinInsight }>(`/api/pt-os/clients/${id}/checkin-insight`, { method: 'POST' }),
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
  balanceSheet: () =>
    http<{ data: unknown[]; total: number; total_outstanding: number }>('/api/pt-os/balance-sheet'),
  clientBirthdays: () =>
    http<{ data: ClientBirthday[]; total: number; today_count: number }>('/api/pt-os/clients/birthdays'),
  // commissions / payouts / trainer-performance went with the multi-coach
  // model: there is no staff roster to pay out.
  revenue: () =>
    http<{ data: unknown[] }>('/api/pt-os/revenue'),
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
  /**
   * The studio's own business-write audit trail — client/payment/commission
   * changes made by its own staff. Always scoped server-side to the caller's
   * organization; no org filter to pass here.
   */
  activityLog: (params?: { action?: string; entity_type?: string; entity_id?: string; limit?: number; offset?: number }) =>
    http<{ data: ActivityLogEntry[]; paging: { limit: number; offset: number; total: number; count: number } }>(
      `/api/pt-os/activity-log${buildQs(params)}`,
    ),
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
