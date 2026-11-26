// API endpoints: campaigns, feedback, communication, notifications, automation, support.
//
// Lifted verbatim from the single `api` object in the 4,185-line api.ts.
// Method names, URLs and request shapes are unchanged; index.ts composes these
// back into the same `api` object every consumer already imports.

import { http, ApiError } from '../../http';
import { buildQs } from '../qs';
import type {
  ChatChannel, ChatMessage, InboxDraft, StudioConversation, StudioMessageThread,
  SupportTicket, TicketCategory, TicketMessage, TicketPriority,
} from '../types';

/** A trainer, and whether automated messages may go out on their behalf. */
export interface WhatsappAutomationSettings {
  automation_enabled: boolean;
  daily_send_limit: number;
}

// ── Campaigns (Marketing) ──────────────────────────────────────
export const campaigns = {
  list: (params?: Record<string, string | number>) =>
    http<unknown[]>(`/api/campaigns${buildQs(params)}`),
  create: (data: Record<string, unknown>) =>
    http<{ message: string; campaign: unknown }>('/api/campaigns', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, unknown>) =>
    http<{ message: string; campaign: unknown }>(`/api/campaigns/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => http<{ message: string }>(`/api/campaigns/${id}`, { method: 'DELETE' }),
  stats: () => http<{
    active: number;
    total_sent: number;
    /** Added after the first release of this route; absent on an older API. */
    total_opened?: number;
    conversions: number;
    conv_rate: number;
  }>('/api/campaigns/stats'),
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
    http<{
      avg_rating: number; total: number; positive: number;
      /** rating = 3; absent on an API older than the sentiment donut. */
      neutral?: number;
      negative: number; open: number; nps: number;
    }>('/api/feedback/stats'),
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

// ── Member ↔ studio messages (trainer side) ────────────────────
// The member's side is api.me.messages. Every client id here is checked
// against the caller's studio server-side; another studio's is a 404.
/**
 * A 502 from this route can still carry a row.
 *
 * The backend creates the thread row before handing it to WhatsApp, so a send
 * that fails is a message the trainer can see and retry — not a lost request.
 * Treating that body as a plain error would leave the composer full and the
 * bubble missing, and the trainer would send a second copy.
 */
function isFailedRow(payload: unknown): payload is { data: ChatMessage } {
  if (!payload || typeof payload !== 'object') return false;
  const data = (payload as { data?: unknown }).data;
  return Boolean(
    data && typeof data === 'object' && typeof (data as { id?: unknown }).id === 'string',
  );
}

async function sendOrReturnFailedRow(request: Promise<{ data: ChatMessage }>) {
  try {
    return await request;
  } catch (err) {
    if (err instanceof ApiError && isFailedRow(err.payload)) return { data: err.payload.data };
    throw err;
  }
}

export const clientMessages = {
  inbox: () => http<{ data: StudioConversation[] }>('/api/messages'),
  unreadCount: () => http<{ data: { unread: number } }>('/api/messages/unread-count'),
  /** Opening a thread marks the member's messages read. */
  thread: (clientId: string, before?: string) =>
    http<{ data: StudioMessageThread }>(
      `/api/messages/${encodeURIComponent(clientId)}${before ? `?before=${encodeURIComponent(before)}` : ''}`,
    ),
  send: (clientId: string, body: string, channel?: ChatChannel) =>
    sendOrReturnFailedRow(http<{ data: ChatMessage }>(`/api/messages/${encodeURIComponent(clientId)}`, {
      method: 'POST',
      body: JSON.stringify(channel ? { body, channel } : { body }),
    })),
  retry: (clientId: string, messageId: string) =>
    sendOrReturnFailedRow(http<{ data: ChatMessage }>(
      `/api/messages/${encodeURIComponent(clientId)}/${encodeURIComponent(messageId)}/retry`,
      { method: 'POST', body: '{}' },
    )),
  /** A proposal only: the draft is not written to the thread until a human sends it. */
  aiDraft: (clientId: string) =>
    http<{ data: InboxDraft }>(
      `/api/messages/${encodeURIComponent(clientId)}/ai-draft`,
      { method: 'POST', body: '{}' },
    ),
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
  // Permission for automated WhatsApp sending: the studio switch, owned by the
  // trainer. It must be on before the engine queues anything, and is
  // re-checked when it sends — a rule's delay can be hours.
  whatsappSettings: {
    get: () => http<{ data: WhatsappAutomationSettings }>('/api/automation/whatsapp-settings'),
    update: (data: { automation_enabled?: boolean; daily_send_limit?: number }) =>
      http<{ data: WhatsappAutomationSettings }>('/api/automation/whatsapp-settings', {
        method: 'PUT', body: JSON.stringify(data),
      }),
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
