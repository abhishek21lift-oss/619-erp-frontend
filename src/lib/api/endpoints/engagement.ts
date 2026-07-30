// API endpoints: campaigns, feedback, communication, notifications, automation, support.
//
// Lifted verbatim from the single `api` object in the 4,185-line api.ts.
// Method names, URLs and request shapes are unchanged; index.ts composes these
// back into the same `api` object every consumer already imports.

import { http } from '../../http';
import { buildQs } from '../qs';
import type {
  SupportTicket, TicketCategory, TicketMessage, TicketPriority,
} from '../types';

// ── Campaigns (Marketing) ──────────────────────────────────────
export const campaigns = {
  list: (params?: Record<string, string | number>) =>
    http<unknown[]>(`/api/campaigns${buildQs(params)}`),
  create: (data: Record<string, unknown>) =>
    http<{ message: string; campaign: unknown }>('/api/campaigns', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, unknown>) =>
    http<{ message: string; campaign: unknown }>(`/api/campaigns/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => http<{ message: string }>(`/api/campaigns/${id}`, { method: 'DELETE' }),
  stats: () => http<{ active: number; total_sent: number; conversions: number; conv_rate: number }>('/api/campaigns/stats'),
};

// ── Feedback ───────────────────────────────────────────────────
export const feedback = {
  list: (params?: Record<string, string | number>) =>
    http<unknown[]>(`/api/feedback${buildQs(params)}`),
  get: (id: string) => http<unknown>(`/api/feedback/${id}`),
  reply: (id: string, data: { reply: string }) =>
    http<{ message: string }>(`/api/feedback/${id}/reply`, { method: 'POST', body: JSON.stringify(data) }),
  resolve: (id: string) =>
    http<{ message: string }>(`/api/feedback/${id}/resolve`, { method: 'POST' }),
  stats: () =>
    http<{ avg_rating: number; total: number; positive: number; open: number; nps: number }>('/api/feedback/stats'),
};

// ── Communication (send notification) ───────────────────────────
export const communication = {
  send: (data: { title: string; body: string; type: string; audience: string }) =>
    http<{ message: string; notification: unknown; recipients: number }>('/api/communication/send', {
      method: 'POST', body: JSON.stringify(data),
    }),
  history: (params?: Record<string, string | number>) =>
    http<unknown[]>(`/api/communication/history${buildQs(params)}`),
  delete: (id: string) =>
    http<{ message: string }>(`/api/communication/history/${id}`, { method: 'DELETE' }),
};

export const notifications = {
  list: (params?: Record<string, string>) =>
    http<unknown[]>(`/api/v1/notifications${buildQs(params)}`),
  markRead: (id: string) =>
    http(`/api/v1/notifications/${id}/read`, { method: 'PATCH' }),
  markAllRead: () =>
    http('/api/v1/notifications/read-all', { method: 'PATCH' }),
};

// ── Automation & Communication ─────────────────────────────────
export const automation = {
  rules: {
    list: (params?: Record<string, string | number>) =>
      http<{ data: unknown[] }>(`/api/automation/rules${buildQs(params)}`),
    create: (data: Record<string, unknown>) =>
      http<{ data: unknown }>('/api/automation/rules', {
        method: 'POST', body: JSON.stringify(data),
      }),
    update: (id: string, data: Record<string, unknown>) =>
      http<{ data: unknown }>(`/api/automation/rules/${id}`, {
        method: 'PATCH', body: JSON.stringify(data),
      }),
    delete: (id: string) => http(`/api/automation/rules/${id}`, { method: 'DELETE' }),
  },
  communicationLogs: {
    list: (params?: Record<string, string | number>) =>
      http<{ data: unknown[]; total: number }>(`/api/automation/communication-logs${buildQs(params)}`),
    stats: () => http<{ data: unknown }>('/api/automation/communication-logs/stats'),
  },
  ptPackages: {
    list: (params?: Record<string, string | number>) =>
      http<{ data: unknown[] }>(`/api/automation/pt-packages${buildQs(params)}`),
    create: (data: Record<string, unknown>) =>
      http<{ data: unknown }>('/api/automation/pt-packages', {
        method: 'POST', body: JSON.stringify(data),
      }),
    update: (id: string, data: Record<string, unknown>) =>
      http<{ data: unknown }>(`/api/automation/pt-packages/${id}`, {
        method: 'PATCH', body: JSON.stringify(data),
      }),
    delete: (id: string) => http(`/api/automation/pt-packages/${id}`, { method: 'DELETE' }),
  },
  sessionBalance: {
    list: (params?: Record<string, string | number>) =>
      http<{ data: unknown[] }>(`/api/automation/session-balance${buildQs(params)}`),
    create: (data: Record<string, unknown>) =>
      http<{ data: unknown }>('/api/automation/session-balance', {
        method: 'POST', body: JSON.stringify(data),
      }),
    useSession: (id: string) =>
      http<{ data: unknown }>(`/api/automation/session-balance/${id}/use`, {
        method: 'POST',
      }),
  },
};

/** The studio's own support tickets. Scoped server-side to the caller's
 *  organization — there is no parameter naming a studio. */
export const support = {
  tickets: () => http<{ data: SupportTicket[] }>('/api/support/tickets'),
  ticket: (id: string) => http<{ data: SupportTicket }>(`/api/support/tickets/${id}`),
  create: (body: { subject: string; body: string; category?: TicketCategory; priority?: TicketPriority }) =>
    http<{ data: SupportTicket }>('/api/support/tickets', { method: 'POST', body: JSON.stringify(body) }),
  reply: (id: string, body: string) =>
    http<{ data: TicketMessage }>(`/api/support/tickets/${id}/messages`, {
      method: 'POST', body: JSON.stringify({ body }),
    }),
};
