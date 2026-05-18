// src/lib/api.ts
//
// NOTE: apiBase() is now a LAZY function — called at first use, not at module
// init. This prevents SSR crashes when NEXT_PUBLIC_API_URL is undefined at
// build time (e.g. Docker build without ARG, or cold-start server renders).

const DEFAULT_API_BASE = 'http://localhost:5000';

function apiBase(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL ?? '').trim().replace(/\/+$/, '');
  const resolved = raw || DEFAULT_API_BASE;

  // Treat the old placeholder as localhost to avoid confusing 404s
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
    // If it's just a hostname like "localhost:5000" without protocol, add http
    try {
      return new URL('http://' + resolved).origin;
    } catch {
      throw new Error(`Invalid NEXT_PUBLIC_API_URL: "${raw}"`);
    }
  }
}

// ─────────────────────────── Types ───────────────────────────────────

export type User = {
  id: string;
  name?: string;
  email: string;
  role?: string;
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

// ─────────────────────────── Core fetch ──────────────────────────────

async function request<T = unknown>(
  path: string,
  options: RequestInit & { skipAuth?: boolean } = {},
): Promise<T> {
  const BASE = apiBase(); // lazy — evaluated at call time
  const url = path.startsWith('http') ? path : `${BASE}${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (!options.skipAuth) {
    let token: string | null = null;
    try { token = localStorage.getItem('619_token'); } catch { /* SSR / quota */ }
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      msg = body?.message ?? body?.error ?? msg;
    } catch { /* ignore */ }
    const err = new Error(msg) as Error & { status: number };
    err.status = res.status;
    // 401 → clear stale credentials so the Guard redirects to /login
    if (res.status === 401) {
      try { localStorage.removeItem('619_token'); localStorage.removeItem('619_user'); } catch { /* SSR */ }
    }
    throw err;
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
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
    get:    (id: string | number) => request<Client>(`/api/clients/${id}`),
    create: (data: Partial<Client>) => request<Client>('/api/clients', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string | number, data: Partial<Client>) =>
      request<Client>(`/api/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string | number) => request(`/api/clients/${id}`, { method: 'DELETE' }),
    search: (q: string) => request<Client[]>(`/api/clients/search?q=${encodeURIComponent(q)}`),
  },

  payments: {
    list:   (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<unknown[]>(`/api/payments${qs}`);
    },
    create: (data: Record<string, unknown>) =>
      request('/api/payments', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string | number) => request(`/api/payments/${id}`, { method: 'DELETE' }),
    stats:  (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request(`/api/payments/stats${qs}`);
    },
  },

  subscriptions: {
    list:        (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<unknown[]>(`/api/subscriptions${qs}`);
    },
    get:         (id: string | number) => request(`/api/subscriptions/${id}`),
    create:      (data: Record<string, unknown>) =>
      request('/api/subscriptions', { method: 'POST', body: JSON.stringify(data) }),
    update:      (id: string | number, data: Record<string, unknown>) =>
      request(`/api/subscriptions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    addPayment:  (id: string | number, data: Record<string, unknown>) =>
      request(`/api/subscriptions/${id}/payments`, { method: 'POST', body: JSON.stringify(data) }),
    freeze:      (id: string | number, data: Record<string, unknown>) =>
      request(`/api/subscriptions/${id}/freeze`, { method: 'POST', body: JSON.stringify(data) }),
    unfreeze:    (id: string | number) =>
      request(`/api/subscriptions/${id}/unfreeze`, { method: 'POST' }),
    upgrade:     (id: string | number, data: Record<string, unknown>) =>
      request(`/api/subscriptions/${id}/upgrade`, { method: 'POST', body: JSON.stringify(data) }),
    downgrade:   (id: string | number, data: Record<string, unknown>) =>
      request(`/api/subscriptions/${id}/downgrade`, { method: 'POST', body: JSON.stringify(data) }),
    transfer:    (id: string | number, data: Record<string, unknown>) =>
      request(`/api/subscriptions/${id}/transfer`, { method: 'POST', body: JSON.stringify(data) }),
    extend:      (id: string | number, data: Record<string, unknown>) =>
      request(`/api/subscriptions/${id}/extend`, { method: 'POST', body: JSON.stringify(data) }),
  },

  plans: {
    list:   () => request<unknown[]>('/api/plans'),
    get:    (id: string | number) => request(`/api/plans/${id}`),
    create: (data: Record<string, unknown>) =>
      request('/api/plans', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string | number, data: Record<string, unknown>) =>
      request(`/api/plans/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string | number) => request(`/api/plans/${id}`, { method: 'DELETE' }),
  },

  trainers: {
    list:   () => request<unknown[]>('/api/trainers'),
    get:    (id: string | number) => request(`/api/trainers/${id}`),
    create: (data: Record<string, unknown>) =>
      request('/api/trainers', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string | number, data: Record<string, unknown>) =>
      request(`/api/trainers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string | number) => request(`/api/trainers/${id}`, { method: 'DELETE' }),
    sessions: (id: string | number) => request(`/api/trainers/${id}/sessions`),
  },

  staff: {
    list:   () => request<unknown[]>('/api/staff'),
    get:    (id: string | number) => request(`/api/staff/${id}`),
    create: (data: Record<string, unknown>) =>
      request('/api/staff', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string | number, data: Record<string, unknown>) =>
      request(`/api/staff/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string | number) => request(`/api/staff/${id}`, { method: 'DELETE' }),
    targets: {
      get: (id: string | number) => request(`/api/staff/${id}/targets`),
      set: (id: string | number, data: Record<string, unknown>) =>
        request(`/api/staff/${id}/targets`, { method: 'POST', body: JSON.stringify(data) }),
    },
  },

  attendance: {
    list:   (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<unknown[]>(`/api/attendance${qs}`);
    },
    create: (data: Record<string, unknown>) =>
      request('/api/attendance', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string | number, data: Record<string, unknown>) =>
      request(`/api/attendance/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  },

  checkin: {
    list:    (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<unknown[]>(`/api/checkin${qs}`);
    },
    enroll:  (clientId: string | number, descriptor: number[]) =>
      request(`/api/checkin/enroll`, { method: 'POST', body: JSON.stringify({ client_id: clientId, descriptor }) }),
    verify:  (descriptor: number[]) =>
      request('/api/checkin/verify', { method: 'POST', body: JSON.stringify({ descriptor }) }),
    manual:  (clientId: string | number) =>
      request('/api/checkin/manual', { method: 'POST', body: JSON.stringify({ client_id: clientId }) }),
    descriptors: () => request<unknown[]>('/api/checkin/descriptors'),
  },

  analytics: {
    dashboard: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request(`/api/analytics/dashboard${qs}`);
    },
    revenue: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request(`/api/analytics/revenue${qs}`);
    },
  },

  notifications: {
    list:   () => request<unknown[]>('/api/notifications'),
    markRead: (id: string | number) =>
      request(`/api/notifications/${id}/read`, { method: 'POST' }),
    markAllRead: () => request('/api/notifications/read-all', { method: 'POST' }),
  },

  settings: {
    get:    () => request('/api/settings'),
    update: (data: Record<string, unknown>) =>
      request('/api/settings', { method: 'PUT', body: JSON.stringify(data) }),
    branding: {
      get:    () => request('/api/settings/branding'),
      update: (data: Record<string, unknown>) =>
        request('/api/settings/branding', { method: 'PUT', body: JSON.stringify(data) }),
    },
  },

  leads: {
    list:   (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<unknown[]>(`/api/leads${qs}`);
    },
    get:    (id: string | number) => request(`/api/leads/${id}`),
    create: (data: Record<string, unknown>) =>
      request('/api/leads', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string | number, data: Record<string, unknown>) =>
      request(`/api/leads/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string | number) => request(`/api/leads/${id}`, { method: 'DELETE' }),
    convert: (id: string | number, data: Record<string, unknown>) =>
      request(`/api/leads/${id}/convert`, { method: 'POST', body: JSON.stringify(data) }),
  },

  whatsapp: {
    send:      (data: Record<string, unknown>) =>
      request('/api/whatsapp/send', { method: 'POST', body: JSON.stringify(data) }),
    templates: () => request<unknown[]>('/api/whatsapp/templates'),
    bulk:      (data: Record<string, unknown>) =>
      request('/api/whatsapp/bulk', { method: 'POST', body: JSON.stringify(data) }),
  },
};
