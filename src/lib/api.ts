// src/lib/api.ts
//
// NOTE: apiBase() is lazy — evaluated at call time, not module init.
// This prevents SSR crashes when NEXT_PUBLIC_API_URL is undefined at
// Docker build time or cold-start server renders.

const DEFAULT_API_BASE = 'http://localhost:5000';

function apiBase(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL ?? '').trim().replace(/\/+$/, '');
  const resolved = raw || DEFAULT_API_BASE;

  if (/your-619-api\.onrender\.com/i.test(resolved)) {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return DEFAULT_API_BASE;
    }
    throw new Error(
      'NEXT_PUBLIC_API_URL is still the placeholder URL. ' +
      'Set it to your deployed backend in Vercel / .env.local.',
    );
  }

  try {
    const url = new URL(resolved);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('bad protocol');
    return url.origin;
  } catch {
    try { return new URL('http://' + resolved).origin; } catch {
      throw new Error(`Invalid NEXT_PUBLIC_API_URL: "${raw}"`);
    }
  }
}

// ─────────────────────────── Types ───────────────────────────────────

/**
 * Role union — union of all role strings the backend can return.
 * Aligned with nav-config.ts so role comparisons across the app type-check.
 */
export type Role =
  | 'admin'
  | 'manager'
  | 'staff'
  | 'trainer'
  | 'receptionist'
  | 'reception'
  | 'member';

export type User = {
  id: string;
  name?: string;
  email: string;
  /** Typed as Role union — never a free-form string */
  role?: Role;
  trainer_id?: string;
  is_active?: boolean;
};

export type Client = {
  id: string;
  name: string;
  first_name?: string;
  last_name?: string;
  country_code?: string;
  mobile?: string;
  is_mobile_redacted?: boolean;
  alt_country_code?: string;
  alt_mobile?: string;
  email?: string;
  emergency_no?: string;
  gender?: string;
  dob?: string;
  anniversary?: string;
  weight?: number;
  reference_no?: string;
  aadhaar_no?: string;
  pan_no?: string;
  gst_no?: string;
  company_name?: string;
  address?: string;
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  client_id?: string;
  member_code?: string;
  trainer_id?: string;
  trainer_name?: string;
  package_type?: string;
  status?: string;
  balance_amount?: number;
  frozen_from?: string;
  frozen_until?: string;
  pt_start_date?: string;
  pt_end_date?: string;
  pt_sessions_left?: number;
  subscription_end_date?: string;
  subscription_start_date?: string;
  plan_name?: string;
  photo_url?: string;
  face_descriptor?: number[];
  notes?: string;
  created_at?: string;
  updated_at?: string;
  balance_due?: number;
};

/**
 * Payment — Issue #7: id is always string.
 * Backend may return number; we normalise at the API boundary (see `payments.list`).
 */
export type Payment = {
  /** Always a string — coerced from number at fetch boundary if needed. */
  id: string;
  receipt_no?: string;
  client_id?: string;
  client_name?: string;
  amount: number;
  method: string;
  date: string;
  notes?: string;
  trainer_name?: string;
};

// ─────────────────────────── Core fetch ──────────────────────────────

async function request<T = unknown>(
  path: string,
  options: RequestInit & { skipAuth?: boolean } = {},
): Promise<T> {
  const BASE = apiBase();
  const url = path.startsWith('http') ? path : `${BASE}${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // Include credentials so the httpOnly auth cookie is sent automatically.
  // The in-memory token is used as a bearer fallback for hybrid backends that
  // still require an Authorization header (legacy deployment support).
  const init: RequestInit = {
    ...options,
    headers,
    credentials: 'include',
  };

  const res = await fetch(url, init);

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      msg = body?.message ?? body?.error ?? msg;
    } catch { /* ignore */ }
    const err = new Error(msg) as Error & { status: number };
    err.status = res.status;
    throw err;
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── Normalise a raw payment record from the server ──────────────────
function normalisePayment(raw: Record<string, unknown>): Payment {
  return {
    ...raw,
    id: String(raw.id ?? ''),
    client_id: raw.client_id != null ? String(raw.client_id) : undefined,
    amount: Number(raw.amount ?? 0),
  } as Payment;
}

// ─────────────────────────── API namespace ────────────────────────────

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ token: string; user: User }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        skipAuth: true,
      }),
    me: () => request<{ user: User }>('/api/auth/me'),
    logout: () => request('/api/auth/logout', { method: 'POST' }).catch(() => {}),
  },

  clients: {
    list: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<Client[]>(`/api/clients${qs}`);
    },
    get:    (id: string) => request<Client>(`/api/clients/${id}`),
    create: (data: Partial<Client>) => request<Client>('/api/clients', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Client>) =>
      request<Client>(`/api/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/api/clients/${id}`, { method: 'DELETE' }),
    search: (q: string) => request<Client[]>(`/api/clients/search?q=${encodeURIComponent(q)}`),
  },

  payments: {
    list: async (params?: Record<string, string>): Promise<Payment[]> => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      const raw = await request<Record<string, unknown>[]>(`/api/payments${qs}`);
      return Array.isArray(raw) ? raw.map(normalisePayment) : [];
    },
    create: (data: Record<string, unknown>) =>
      request('/api/payments', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/api/payments/${id}`, { method: 'DELETE' }),
    stats:  (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request(`/api/payments/stats${qs}`);
    },
  },

  subscriptions: {
    list: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<unknown[]>(`/api/subscriptions${qs}`);
    },
    get:         (id: string) => request(`/api/subscriptions/${id}`),
    create:      (data: Record<string, unknown>) =>
      request('/api/subscriptions', { method: 'POST', body: JSON.stringify(data) }),
    update:      (id: string, data: Record<string, unknown>) =>
      request(`/api/subscriptions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    addPayment:  (id: string, data: Record<string, unknown>) =>
      request(`/api/subscriptions/${id}/payments`, { method: 'POST', body: JSON.stringify(data) }),
    freeze:      (id: string, data: Record<string, unknown>) =>
      request(`/api/subscriptions/${id}/freeze`, { method: 'POST', body: JSON.stringify(data) }),
    unfreeze:    (id: string) =>
      request(`/api/subscriptions/${id}/unfreeze`, { method: 'POST' }),
    upgrade:     (id: string, data: Record<string, unknown>) =>
      request(`/api/subscriptions/${id}/upgrade`, { method: 'POST', body: JSON.stringify(data) }),
    downgrade:   (id: string, data: Record<string, unknown>) =>
      request(`/api/subscriptions/${id}/downgrade`, { method: 'POST', body: JSON.stringify(data) }),
    transfer:    (id: string, data: Record<string, unknown>) =>
      request(`/api/subscriptions/${id}/transfer`, { method: 'POST', body: JSON.stringify(data) }),
    extend:      (id: string, data: Record<string, unknown>) =>
      request(`/api/subscriptions/${id}/extend`, { method: 'POST', body: JSON.stringify(data) }),
  },

  plans: {
    list:   () => request<unknown[]>('/api/plans'),
    get:    (id: string) => request(`/api/plans/${id}`),
    create: (data: Record<string, unknown>) =>
      request('/api/plans', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      request(`/api/plans/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/api/plans/${id}`, { method: 'DELETE' }),
  },

  trainers: {
    list:   () => request<unknown[]>('/api/trainers'),
    get:    (id: string) => request(`/api/trainers/${id}`),
    create: (data: Record<string, unknown>) =>
      request('/api/trainers', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      request(`/api/trainers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/api/trainers/${id}`, { method: 'DELETE' }),
    sessions: (id: string) => request(`/api/trainers/${id}/sessions`),
  },

  staff: {
    list:   () => request<unknown[]>('/api/staff'),
    get:    (id: string) => request(`/api/staff/${id}`),
    create: (data: Record<string, unknown>) =>
      request('/api/staff', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      request(`/api/staff/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/api/staff/${id}`, { method: 'DELETE' }),
    targets: {
      get: (id: string) => request(`/api/staff/${id}/targets`),
      set: (id: string, data: Record<string, unknown>) =>
        request(`/api/staff/${id}/targets`, { method: 'POST', body: JSON.stringify(data) }),
    },
  },

  attendance: {
    list: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<unknown[]>(`/api/attendance${qs}`);
    },
    create: (data: Record<string, unknown>) =>
      request('/api/attendance', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      request(`/api/attendance/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  },

  checkin: {
    list: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<unknown[]>(`/api/checkin${qs}`);
    },
    create: (data: Record<string, unknown>) =>
      request('/api/checkin', { method: 'POST', body: JSON.stringify(data) }),
    // FIX: was (clientId, descriptors: number[][]) sending key "descriptors" (plural).
    // Backend expects key "descriptor" (singular) and a flat number[128] array.
    enroll: (clientId: string, descriptor: number[]) =>
      request(`/api/checkin/enroll`, { method: 'POST', body: JSON.stringify({ client_id: clientId, descriptor }) }),
    descriptors: () => request<unknown[]>('/api/checkin/descriptors'),
  },

  notifications: {
    list: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<unknown[]>(`/api/notifications${qs}`);
    },
    markRead: (id: string) =>
      request(`/api/notifications/${id}/read`, { method: 'PATCH' }),
    markAllRead: () =>
      request('/api/notifications/read-all', { method: 'PATCH' }),
  },

  dashboard: {
    stats: () => request('/api/dashboard/stats'),
    revenue: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request(`/api/dashboard/revenue${qs}`);
    },
  },

  reports: {
    revenue: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request(`/api/reports/revenue${qs}`);
    },
    members: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request(`/api/reports/members${qs}`);
    },
  },
};
