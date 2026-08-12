// API endpoints: payments, invoices, expenses, offers, upiPayments.
//
// Lifted verbatim from the single `api` object in the 4,185-line api.ts.
// Method names, URLs and request shapes are unchanged; index.ts composes these
// back into the same `api` object every consumer already imports.

import { http, apiBase } from '../../http';
import { buildQs } from '../qs';
import { normalisePayment } from '../normalisePayment';
import type {
  Payment, UpiActivation, UpiAuditEntry, UpiCreateOrderInput, UpiHistoryRow, UpiOrder,
  UpiOrderDetail, UpiOrderStatus, UpiPaymentView, UpiQueueParams, UpiQueueRow,
  UpiQueueStats, UpiRejectReason, UpiSettings, UpiSettingsInput, UpiSubmission,
  UpiSubmitUtrInput,
} from '../types';

/** Shape of GET /api/payments/stats. All money values are rupees. */
export type PaymentStats = {
  count: number;
  total: number;
  cash: number;
  upi: number;
  card: number;
  bank: number;
  total_incentives: number;
};

export const payments = {
  list: async (params?: Record<string, string>): Promise<Payment[]> => {
    const raw = await http<Record<string, unknown>[]>(`/api/payments${buildQs(params)}`);
    return Array.isArray(raw) ? raw.map(normalisePayment) : [];
  },
  create: (data: Record<string, unknown>) =>
    http('/api/payments', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: string) => http(`/api/payments/${id}`, { method: 'DELETE' }),
  /**
   * Server-side aggregate over the WHOLE matching ledger.
   *
   * This is the only correct source for a money KPI. `list` is capped
   * (LIMIT 200 by default on the server), so summing what it returns gives
   * the total of the most recent page, not the total — which is exactly the
   * bug this was introduced to fix on Collected Payments and Today's Sales.
   * Accepts the same from/to/trainer_id/client_id filters as `list`.
   */
  stats:  (params?: Record<string, string>) =>
    http<PaymentStats>(`/api/payments/stats${buildQs(params)}`),
};

// ── Invoices ──────────────────────────────────────────────────────
export const invoices = {
  list: (params?: Record<string, string | number>) =>
    http<{ invoices: unknown[]; stats: { total: number; paid: number; pending: number; overdue: number } }>(
      `/api/invoices${buildQs(params)}`,
    ),
  get: (id: string) => http<unknown>(`/api/invoices/${id}`),
  create: (data: Record<string, unknown>) =>
    http<{ message: string; invoice: unknown }>('/api/invoices', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Record<string, unknown>) =>
    http<{ message: string; invoice: unknown }>(`/api/invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  send: (id: string) =>
    http<{ message: string; invoice: unknown }>(`/api/invoices/${id}/send`, { method: 'POST' }),
  markPaid: (id: string, data?: { payment_method?: string }) =>
    http<{ message: string; invoice: unknown }>(`/api/invoices/${id}/mark-paid`, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),
  remind: (id: string) =>
    http<{ message: string }>(`/api/invoices/${id}/remind`, { method: 'POST' }),
  cancel: (id: string) =>
    http<{ message: string; invoice: unknown }>(`/api/invoices/${id}/cancel`, { method: 'POST' }),
};

export const expenses = {
  list:   (params?: Record<string, string | number>) =>
            http<{ expenses: Record<string, unknown>[]; total: number }>(`/api/expenses${buildQs(params)}`),
  get:    (id: string) => http<Record<string, unknown>>(`/api/expenses/${id}`),
  create: (data: Record<string, unknown>) =>
            http<{ message?: string; expense: Record<string, unknown> }>('/api/expenses', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, unknown>) =>
            http<{ message?: string; expense: Record<string, unknown> }>(`/api/expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => http<{ message?: string }>(`/api/expenses/${id}`, { method: 'DELETE' }),
  stats:  (params?: Record<string, string | number>) =>
            http<{ summary: Record<string, unknown>; byCategory: Record<string, unknown>[] }>(`/api/expenses/stats${buildQs(params)}`),
};

// ── Offers & Promotions ────────────────────────────────────────
export const offers = {
  list: (params?: Record<string, string | number>) =>
    http<unknown[]>(`/api/offers${buildQs(params)}`),
  create: (data: Record<string, unknown>) =>
    http<{ message: string; offer: unknown }>('/api/offers', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, unknown>) =>
    http<{ message: string; offer: unknown }>(`/api/offers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => http<{ message: string }>(`/api/offers/${id}`, { method: 'DELETE' }),
  stats: () => http<{ total: number; active: number; total_used: number; expired: number }>('/api/offers/stats'),
};

// ── Manual UTR verification payments ──────────────────────────────────────
// Mounted under /api/payments/upi so it sits beside the finance ledger
// (/api/payments) without colliding with it.
export const upiPayments = {
  /** The studio's payee details. Any signed-in user in the studio may read. */
  getSettings: () =>
    http<{ data: UpiSettings | null; configured: boolean; enabled: boolean }>(
      '/api/payments/upi/settings'),

  /** Configure collection. Admin only. */
  saveSettings: (body: UpiSettingsInput) =>
    http<{ data: UpiSettings }>('/api/payments/upi/settings', {
      method: 'PUT', body: JSON.stringify(body),
    }),

  /**
   * Open an order. `base_amount` is ignored server-side whenever `plan_id`
   * names a real plan — the stored price wins — so this is never the
   * authority on what is charged.
   */
  create: (body: UpiCreateOrderInput) =>
    http<{ data: { order: UpiOrder; payment: UpiPaymentView; reused: boolean } }>(
      '/api/payments/upi/create', { method: 'POST', body: JSON.stringify(body) }),

  /** Full state of one order: QR, intents, every submission, the activation. */
  status: (orderId: string) =>
    http<{ data: UpiOrderDetail }>(`/api/payments/upi/${orderId}/status`),

  /** Telemetry only — records that a UPI app was actually launched. */
  markOpened: (orderId: string) =>
    http<{ data: { status: UpiOrderStatus } }>(`/api/payments/upi/${orderId}/opened`,
      { method: 'POST' }),

  /**
   * Upload payment proof. Returns a SERVER-CHOSEN storage key; pass it
   * straight back to submitUtr, which re-checks that this order issued it.
   */
  uploadProof: (orderId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return http<{ data: { screenshot_url: string; mime: string; bytes: number } }>(
      `/api/payments/upi/${orderId}/upload`, { method: 'POST', body: formData });
  },

  submitUtr: (orderId: string, body: UpiSubmitUtrInput) =>
    http<{ data: UpiSubmission }>(`/api/payments/upi/${orderId}/submit-utr`, {
      method: 'POST', body: JSON.stringify(body),
    }),

  cancel: (orderId: string) =>
    http<{ data: UpiOrder }>(`/api/payments/upi/${orderId}/cancel`, { method: 'POST' }),

  /** A member sees only their own rows here, whatever is passed. */
  history: (params: { status?: string; client_id?: string; limit?: number; offset?: number } = {}) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined) q.set(k, String(v));
    const qs = q.toString();
    return http<{ data: UpiHistoryRow[]; total: number }>(
      `/api/payments/upi/history${qs ? `?${qs}` : ''}`);
  },

  /** The admin verification queue plus its dashboard counters. Admin only. */
  pending: (params: UpiQueueParams = {}) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined) q.set(k, String(v));
    const qs = q.toString();
    return http<{
      data: UpiQueueRow[]; total: number; stats: UpiQueueStats;
      reject_reasons: Record<UpiRejectReason, string>;
    }>(`/api/payments/upi/pending${qs ? `?${qs}` : ''}`);
  },

  approve: (orderId: string) =>
    http<{ data: { order: UpiOrder; activation: UpiActivation } }>(
      `/api/payments/upi/${orderId}/approve`, { method: 'POST' }),

  reject: (orderId: string, reason: UpiRejectReason, note?: string) =>
    http<{ data: { reason: UpiRejectReason; note: string | null } }>(
      `/api/payments/upi/${orderId}/reject`, {
        method: 'POST', body: JSON.stringify({ reason, note }),
      }),

  requestCorrection: (orderId: string, reason: UpiRejectReason, note?: string) =>
    http<{ data: { reason: UpiRejectReason; note: string | null } }>(
      `/api/payments/upi/${orderId}/request-correction`, {
        method: 'POST', body: JSON.stringify({ reason, note }),
      }),

  audit: (orderId: string) =>
    http<{ data: UpiAuditEntry[] }>(`/api/payments/upi/${orderId}/audit`),

  /** Absolute URL of the receipt PDF, for a link or a print window. */
  receiptUrl: (orderId: string) => `${apiBase()}/api/payments/upi/${orderId}/receipt`,
};
