// API endpoints: pt.
//
// Lifted verbatim from the single `api` object in the 4,185-line api.ts.
// Method names, URLs and request shapes are unchanged; index.ts composes these
// back into the same `api` object every consumer already imports.

import { http } from '../../http';
import { buildQs } from '../qs';
import type {
  MeGoals,
  AvailabilityWindow, BookingSettings, TimeOff, TrainerAvailability,
  ActivityLogEntry, CheckinInsight, ClientBirthday, ClientSnapshot, CoachGeneration, PtLead, PtSession, RosterSignalSweep, TrainingBrief,
  TransformationRow,
  ChurnInsight, ChurnRiskResult, ChurnRiskRow,
  FormCheckComment, TrainerFormCheck,
} from '../types';
import type { ClientInterview, ClientJourney } from '../../journey';

// ── PT OS ────────────────────────────────────────────────────
export const pt = {
  dashboard: () =>
    http<{ data: unknown }>('/api/pt-os/dashboard'),
  clients: (params?: { search?: string; status?: string; dues?: string; term?: 'ended'; limit?: number; offset?: number }) =>
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
  /** Ranked roster with reasons and one next action per client. */
  churnRisk: () =>
    http<{ data: ChurnRiskResult }>('/api/pt-os/churn-risk'),
  markChurnFollowup: (id: string, body: { outcome: 'contacted' | 'snoozed'; snooze_until?: string; note?: string }) =>
    http<{ data: ChurnRiskRow }>(`/api/pt-os/churn-risk/${id}/followup`, { method: 'POST', body: JSON.stringify(body) }),
  /** One roster-level narrative; deterministic when nothing is flagged. */
  churnInsight: () =>
    http<{ data: ChurnInsight; model: string; tier: string; used_fallback: boolean }>(
      '/api/ai/business/churn', { method: 'POST' }),
  /** The form-review queue; pending is what still needs watching. */
  formChecks: (status: 'pending' | 'reviewed' | 'all' = 'pending') =>
    http<{ data: TrainerFormCheck[] }>(`/api/pt-os/form-checks?status=${status}`),
  /** One check with its video and every comment in video order. */
  formCheck: (id: string) =>
    http<{ data: TrainerFormCheck }>(`/api/pt-os/form-checks/${encodeURIComponent(id)}`),
  commentFormCheck: (id: string, atSeconds: number, body: string) =>
    http<{ data: FormCheckComment }>(`/api/pt-os/form-checks/${encodeURIComponent(id)}/comments`, {
      method: 'POST',
      body: JSON.stringify({ at_seconds: atSeconds, body }),
    }),
  reviewFormCheck: (id: string) =>
    http<{ data: TrainerFormCheck }>(`/api/pt-os/form-checks/${encodeURIComponent(id)}/reviewed`, {
      method: 'POST',
    }),
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
  /** The goals the member set for themselves in the member app, with the
   *  progress they see. Read-only on this side. */
  memberGoals: (id: string) =>
    http<{ data: MeGoals }>(`/api/pt-os/clients/${id}/member-goals`),
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
  /** Every intake-journey step's state and the next one (lib/journey.ts). */
  journey: (id: string) =>
    http<{ data: ClientJourney }>(`/api/pt-os/clients/${id}/journey`),
  /** Step 1: the K11 welcome and gym tour. Idempotent — the first stamp wins. */
  completeWelcomeTour: (id: string) =>
    http<{ data: { id: string; welcome_tour_completed_at: string } }>(
      `/api/pt-os/clients/${id}/welcome-tour`, { method: 'POST' },
    ),
  /** The Client Interview step (migration 227). */
  interviews: {
    list: (clientId: string) =>
      http<{ data: ClientInterview[] }>(`/api/pt-os/clients/${clientId}/interviews`),
    create: (clientId: string, data: Record<string, unknown>) =>
      http<{ data: ClientInterview }>(`/api/pt-os/clients/${clientId}/interviews`, { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      http<{ data: ClientInterview }>(`/api/pt-os/interviews/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  },
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
  /**
   * Client self-booking, trainer side. Publishing a week replaces it wholesale,
   * so always send all seven days the trainer wants bookable.
   */
  availability: () => http<{ data: TrainerAvailability }>('/api/pt-os/availability'),
  saveAvailability: (windows: AvailabilityWindow[]) =>
    http<{ data: { windows: AvailabilityWindow[]; warnings: { id: string; session_date: string; start_time: string }[] } }>(
      '/api/pt-os/availability',
      { method: 'PUT', body: JSON.stringify({ windows }) },
    ),
  timeOff: () => http<{ data: TimeOff[] }>('/api/pt-os/time-off'),
  addTimeOff: (data: { starts_on: string; ends_on: string; reason?: string }) =>
    http<{ data: TimeOff }>('/api/pt-os/time-off', { method: 'POST', body: JSON.stringify(data) }),
  removeTimeOff: (id: string) =>
    http<{ data: { id: string } }>(`/api/pt-os/time-off/${id}`, { method: 'DELETE' }),
  bookingSettings: () => http<{ data: BookingSettings }>('/api/pt-os/booking-settings'),
  saveBookingSettings: (data: Omit<BookingSettings, 'ics_token'>) =>
    http<{ data: BookingSettings }>('/api/pt-os/booking-settings', {
      method: 'PUT', body: JSON.stringify(data),
    }),
};
