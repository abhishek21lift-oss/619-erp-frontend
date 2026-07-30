// API endpoints: branches, gymSettings, qr, subscription, membershipPlans.
//
// Lifted verbatim from the single `api` object in the 4,185-line api.ts.
// Method names, URLs and request shapes are unchanged; index.ts composes these
// back into the same `api` object every consumer already imports.

import { http } from '../../http';
import type {
  CouponValidation, MembershipPlan, PlanChangeQuote, SubCheckoutRequest, SubInvoice,
  SubPayment, SubPlan, SubscriptionStatus, UpiPaymentView, UpiRejectReason,
} from '../types';

// ── Branches ───────────────────────────────────────────────────
export const branches = {
  list: () => http<{ id: string; name: string; location: string; status: string; member_count: number }[]>('/api/settings/branches'),
  create: (data: { name: string; location?: string }) =>
    http<{ id: string; name: string; location: string }>('/api/settings/branches', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { name?: string; location?: string; status?: string }) =>
    http<{ message: string }>(`/api/settings/branches/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => http<{ message: string }>(`/api/settings/branches/${id}`, { method: 'DELETE' }),
};

export const gymSettings = {
  get: () =>
    http<{ geofence_lat: number; geofence_lng: number; geofence_radius: number; enable_face_id: boolean; enable_touch_id: boolean; enable_gps: boolean; duplicate_window_minutes: number; auto_checkout: boolean; auto_checkout_minutes: number }>(
      '/api/settings/gym',
    ),
  update: (data: Record<string, unknown>) =>
    http<{ success: boolean }>('/api/settings/gym', { method: 'PUT', body: JSON.stringify(data) }),
};

// ── QR Check-in ─────────────────────────────────────────────────
export const qr = {
  generate: (params?: { dynamic?: boolean }) =>
    http<{ dataUrl: string; payload: string; userId: string; userType: string; dynamic: boolean; expiresIn: number | null }>(
      `/api/qr/generate${params?.dynamic ? '?dynamic=true' : ''}`
    ),
  generateFor: (type: string, id: string, dynamic?: boolean) =>
    http<{ dataUrl: string; payload: string; userId: string; userType: string }>(
      `/api/qr/generate/${type}/${id}${dynamic ? '?dynamic=true' : ''}`
    ),
  scan: (data: { payload: string; device_info?: string; location?: string }) =>
    http<{ success: boolean; duplicate?: boolean; message: string; user?: { id: string; name: string; status: string; photo_url?: string; member_code?: string; package_type?: string; role?: string }; attendance_id?: string; check_in_time?: string }>(
      '/api/qr/scan', { method: 'POST', body: JSON.stringify(data) }
    ),
  checkout: () =>
    http<{ success: boolean; message: string; attendance_id?: string; duration_minutes?: number; check_out_time?: string }>(
      '/api/qr/checkout', { method: 'POST', body: '{}' }
    ),
  dashboard: () =>
    http<{ currently_inside: { total: number; breakdown: Record<string, number> }; today: { total: number; breakdown: Record<string, unknown> }; hourly: { hour: number; count: number }[]; weekly_trend: { date: string; present: number }[]; method_breakdown: { method: string; count: number }[]; recent_checkins: unknown[]; generated_at: string }>(
      '/api/qr/dashboard'
    ),
  myHistory: (limit?: number) =>
    http<{ history: { date: string; status: string; check_in_time: string | null; check_out_time: string | null; method: string; duration_minutes: number | null }[]; stats: { total_present: number; total_days: number; current_streak: number; longest_streak: number; this_month: number; attendance_rate: number; avg_duration_minutes: number | null } }>(
      `/api/qr/my-history${limit ? `?limit=${limit}` : ''}`
    ),
  staffReport: (params?: { from?: string; to?: string; type?: string }) =>
    http<{ data: unknown[]; from: string; to: string; type: string }>(
      `/api/qr/staff-report${params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : ''}`
    ),
};

export const subscription = {
  status: () => http<{ data: SubscriptionStatus }>('/api/subscription/status'),
  plans: () => http<{ data: { plans: SubPlan[]; founder_slots_remaining: number; founder_limit: number } }>('/api/subscription/plans'),
  invoices: () => http<{ data: SubInvoice[] }>('/api/subscription/invoices'),
  payments: () => http<{ data: SubPayment[] }>('/api/subscription/payments'),
  requestActivation: (plan_code?: string, coupon_code?: string) =>
    http<{ data: { requested: boolean; message: string } }>('/api/subscription/request-activation', {
      method: 'POST',
      body: JSON.stringify({
        ...(plan_code ? { plan_code } : {}),
        ...(coupon_code ? { coupon_code } : {}),
      }),
    }),

  /** Price a plan change without committing to it. Read-only. */
  changeQuote: (plan_code: string) =>
    http<{ data: PlanChangeQuote }>(`/api/subscription/change-quote?plan_code=${encodeURIComponent(plan_code)}`),

  /**
   * Ask to move plans. A downgrade is scheduled immediately for period end
   * (costs nothing); an upgrade is queued for the operator to activate
   * against payment, since billing is admin-activated.
   */
  requestChange: (plan_code: string) =>
    http<{
      data: {
        requested?: boolean; scheduled?: boolean;
        direction: PlanChangeQuote['direction'];
        effective_at?: string | null;
        amount_due_inr?: number; proration_credit_inr?: number;
        warning?: string | null; message: string;
      };
    }>('/api/subscription/request-change', {
      method: 'POST', body: JSON.stringify({ plan_code }),
    }),

  // ── UPI self-checkout: the studio pays the PLATFORM ─────────────────────
  // Distinct from api.upiPayments, which is the studio collecting from its
  // own members. Different payer, payee and approver — see the backend note
  // in lib/subscriptionCheckout.js.
  checkout: {
    /** Is self-checkout switched on by the platform operator at all? */
    settings: () =>
      http<{ data: { available: boolean; merchant_name: string | null; instructions: string | null } }>(
        '/api/subscription/checkout/settings'),

    /**
     * Open (or resume) a payment for a plan. The amount is computed
     * server-side from the plan, founder pricing and any coupon — nothing
     * here can influence what is charged.
     */
    open: (plan_code: string, coupon_code?: string | null) =>
      http<{ data: { request: SubCheckoutRequest; payment: UpiPaymentView; reused: boolean } }>(
        '/api/subscription/checkout', {
          method: 'POST',
          body: JSON.stringify({ plan_code, ...(coupon_code ? { coupon_code } : {}) }),
        }),

    /** Full state of one checkout: QR, intents, status. */
    get: (id: string) =>
      http<{
        data: {
          request: SubCheckoutRequest & { plan_name: string | null; duration_months: number | null };
          payment: UpiPaymentView | null;
          reject_reasons: Record<UpiRejectReason, string>;
        };
      }>(`/api/subscription/checkout/${id}`),

    submitUtr: (id: string, utr: string, note?: string | null) =>
      http<{ data: SubCheckoutRequest }>(`/api/subscription/checkout/${id}/submit-utr`, {
        method: 'POST', body: JSON.stringify({ utr, note: note || null }),
      }),

    cancel: (id: string) =>
      http<{ data: SubCheckoutRequest }>(`/api/subscription/checkout/${id}/cancel`, { method: 'POST' }),

    history: () => http<{ data: SubCheckoutRequest[] }>('/api/subscription/checkout'),
  },

  /** Drop a pending downgrade so the studio stays on its current plan. */
  cancelScheduledChange: () =>
    http<{ data: { cancelled: boolean } }>('/api/subscription/cancel-scheduled-change', { method: 'POST' }),

  /**
   * Preview a coupon discount. Read-only — nothing is reserved, so a code
   * that validates here can still be exhausted by someone else before
   * activation. The binding check happens server-side under a row lock.
   */
  validateCoupon: (code: string, planCode?: string) =>
    http<{ data: CouponValidation }>(
      `/api/subscription/validate-coupon?code=${encodeURIComponent(code)}`
      + (planCode ? `&plan_code=${encodeURIComponent(planCode)}` : ''),
    ),
};

/**
 * Membership plans (the `plans` table). Read-only here — plans are managed
 * elsewhere; this exists so the UPI flow can offer real plans at their real
 * price instead of asking staff to retype an amount.
 */
export const membershipPlans = {
  list: () => http<MembershipPlan[]>('/api/plans?kind=Membership&active=true'),
};
