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

// Coerces number values to strings for URLSearchParams
function buildQs(params: Record<string, string | number>): string {
  return '?' + new URLSearchParams(
    Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))
  ).toString();
}

// ─────────────────────────── Types ───────────────────────────────────────────

export type Role = 'admin' | 'staff' | 'trainer' | 'receptionist' | 'manager' | 'member';

export type User = {
  id: string;
  name?: string;
  email: string;
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
  membership_plan?: string;
  status?: string;
  balance_amount?: number;
  balance_due?: number;
  frozen_from?: string;
  frozen_until?: string;
  freeze_from?: string;
  freeze_until?: string;
  is_frozen?: boolean;
  pt_start_date?: string;
  pt_end_date?: string;
  pt_sessions_left?: number;
  pt_sessions_total?: number;
  expiry_date?: string;
  subscription_end_date?: string;
  subscription_start_date?: string;
  plan_name?: string;
  combo_plan?: string;
  photo_url?: string;
  face_descriptor?: number[];
  biometric_fingers?: string;
  notes?: string;
  joining_date?: string;
  created_at?: string;
  updated_at?: string;
  paid_amount?: number;
  final_amount?: number;
  interested_in?: string;
};

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

export type Trainer = {
  id: string;
  name: string;
  role?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  is_active?: boolean;
  commission?: number;
  specialization?: string;
  photo_url?: string;
  joining_date?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
};

export type Attendance = {
  id: string | number;
  client_id?: string;
  client_name?: string;
  date?: string;
  time?: string;
  type?: string;
  status?: string;
  check_in?: string;
  notes?: string;
  created_at?: string;
  [key: string]: unknown;
};

export type StaffMember = {
  id: string;
  name: string;
  role: string;
  email: string;
  phone?: string;
  is_active?: boolean;
  [key: string]: unknown;
};

export type StaffTarget = {
  id: string;
  staff_id: string;
  staff_name: string;
  role: string;
  month: string;
  target_revenue: number;
  target_clients: number;
  achieved_revenue: number;
  achieved_clients: number;
  achieved_sessions?: number;
  target_sessions?: number;
  [key: string]: unknown;
};

export type PlanApiResponse = {
  plan: {
    id: string;
    kind?: string;
    name?: string;
    duration?: string;
    base_amount?: number;
    discount?: number;
    final_amount?: number;
    sessions_per_week?: number;
    features?: string[];
    popular?: boolean;
    [key: string]: unknown;
  };
  message?: string;
};

export type TrainerSummaryRow = {
  id: string | number;
  name: string;
  active_clients?: number;
  total_clients?: number;
  month_revenue?: number;
  total_revenue?: number;
  [key: string]: unknown;
};

export type LeaveRequest = {
  id: string;
  trainer_id?: string;
  trainer_name?: string;
  leave_type: string;
  from_date: string;
  to_date: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  days?: number;
  admin_note?: string;
  created_at?: string;
  updated_at?: string;
};

// ─────────────────────────── Core fetch ──────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function request<T = any>(
  path: string,
  options: RequestInit & { skipAuth?: boolean } = {},
): Promise<T> {
  const BASE = apiBase();
  const url = path.startsWith('http') ? path : `${BASE}${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

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

function normalisePayment(raw: Record<string, unknown>): Payment {
  return {
    ...raw,
    id: String(raw.id ?? ''),
    client_id: raw.client_id != null ? String(raw.client_id) : undefined,
    amount: Number(raw.amount ?? 0),
  } as Payment;
}

// ─────────────────────────── API namespace ────────────────────────────────

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
    changePassword: (currentPassword: string, newPassword: string) =>
      request<{ message?: string }>('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      }),
    listUsers: () => request<User[]>('/api/auth/users'),
    createUser: (data: Record<string, unknown>) =>
      request<User>('/api/auth/users', { method: 'POST', body: JSON.stringify(data) }),
    toggleUser: (id: string) =>
      request(`/api/auth/users/${id}/toggle`, { method: 'POST' }),
    deleteUser: (id: string) =>
      request(`/api/auth/users/${id}`, { method: 'DELETE' }),
  },

  clients: {
    list: (params?: Record<string, string | number>) => {
      const qs = params ? buildQs(params) : '';
      return request<Client[]>(`/api/clients${qs}`);
    },
    get:    (id: string) => request<Client>(`/api/clients/${id}`),
    // Record<string,unknown> instead of Partial<Client> so callers may pass null for fields
    create: (data: Record<string, unknown>) =>
      request<Client>('/api/clients', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      request<Client>(`/api/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/api/clients/${id}`, { method: 'DELETE' }),
    search: (q: string) => request<Client[]>(`/api/clients/search?q=${encodeURIComponent(q)}`),
    uploadPhoto: (id: string, dataUrl: string) =>
      request(`/api/clients/${id}/photo`, { method: 'POST', body: JSON.stringify({ photo: dataUrl }) }),
    renewSubscription: (id: string, data: Record<string, unknown>) =>
      request(`/api/clients/${id}/renew-subscription`, { method: 'POST', body: JSON.stringify(data) }),
    addSubscription: (id: string, data: Record<string, unknown>) =>
      request(`/api/clients/${id}/add-subscription`, { method: 'POST', body: JSON.stringify(data) }),
    assignPt: (id: string, data: Record<string, unknown>) =>
      request(`/api/clients/${id}/assign-pt`, { method: 'POST', body: JSON.stringify(data) }),
    renewPt: (id: string, data: Record<string, unknown>) =>
      request(`/api/clients/${id}/renew-pt`, { method: 'POST', body: JSON.stringify(data) }),
    combo: (id: string, data: Record<string, unknown>) =>
      request(`/api/clients/${id}/combo`, { method: 'POST', body: JSON.stringify(data) }),
    upgrade: (id: string, data: Record<string, unknown>) =>
      request(`/api/clients/${id}/upgrade`, { method: 'POST', body: JSON.stringify(data) }),
    downgrade: (id: string, data: Record<string, unknown>) =>
      request(`/api/clients/${id}/downgrade`, { method: 'POST', body: JSON.stringify(data) }),
    transfer: (id: string, data: Record<string, unknown>) =>
      request(`/api/clients/${id}/transfer`, { method: 'POST', body: JSON.stringify(data) }),
    trial: (id: string, data: Record<string, unknown>) =>
      request(`/api/clients/${id}/trial`, { method: 'POST', body: JSON.stringify(data) }),
    freeze: (id: string, data: Record<string, unknown>) =>
      request(`/api/clients/${id}/freeze`, { method: 'POST', body: JSON.stringify(data) }),
    unfreeze: (id: string) =>
      request(`/api/clients/${id}/unfreeze`, { method: 'POST' }),
    extension: (id: string, data: Record<string, unknown>) =>
      request<{ message?: string }>(`/api/clients/${id}/extension`, { method: 'POST', body: JSON.stringify(data) }),
  },

  payments: {
    list: async (params?: Record<string, string | number>): Promise<Payment[]> => {
      const qs = params ? buildQs(params) : '';
      const raw = await request<Record<string, unknown>[]>(`/api/payments${qs}`);
      return Array.isArray(raw) ? raw.map(normalisePayment) : [];
    },
    create: (data: Record<string, unknown>) =>
      request('/api/payments', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/api/payments/${id}`, { method: 'DELETE' }),
    stats:  (params?: Record<string, string | number>) => {
      const qs = params ? buildQs(params) : '';
      return request(`/api/payments/stats${qs}`);
    },
  },

  subscriptions: {
    list: (params?: Record<string, string | number>) => {
      const qs = params ? buildQs(params) : '';
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
      request<PlanApiResponse>('/api/plans', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      request<PlanApiResponse>(`/api/plans/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/api/plans/${id}`, { method: 'DELETE' }),
  },

  trainers: {
    list:     () => request<Trainer[]>('/api/trainers'),
    get:      (id: string) => request<Trainer>(`/api/trainers/${id}`),
    create:   (data: Record<string, unknown>) =>
      request('/api/trainers', { method: 'POST', body: JSON.stringify(data) }),
    update:   (id: string, data: Record<string, unknown>) =>
      request(`/api/trainers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete:   (id: string) => request(`/api/trainers/${id}`, { method: 'DELETE' }),
    sessions: (id: string) => request(`/api/trainers/${id}/sessions`),
  },

  staff: {
    list:   () => request<StaffMember[]>('/api/staff'),
    get:    (id: string) => request<StaffMember>(`/api/staff/${id}`),
    create: (data: Record<string, unknown>) =>
      request('/api/staff', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      request(`/api/staff/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/api/staff/${id}`, { method: 'DELETE' }),
    targets: {
      list: (params?: Record<string, string | number>) => {
        const qs = params ? buildQs(params) : '';
        return request<StaffTarget[]>(`/api/staff/targets${qs}`);
      },
      create: (data: Record<string, unknown>) =>
        request('/api/staff/targets', { method: 'POST', body: JSON.stringify(data) }),
      update: (id: string, data: Record<string, unknown>) =>
        request(`/api/staff/targets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      get: (id: string) => request(`/api/staff/${id}/targets`),
      set: (id: string, data: Record<string, unknown>) =>
        request(`/api/staff/${id}/targets`, { method: 'POST', body: JSON.stringify(data) }),
    },
  },

  attendance: {
    list: (params?: Record<string, string | number>) => {
      const qs = params ? buildQs(params) : '';
      return request<Attendance[]>(`/api/attendance${qs}`);
    },
    mark: (data: Record<string, unknown>) =>
      request<{ message?: string }>('/api/attendance/mark', { method: 'POST', body: JSON.stringify(data) }),
    biometric: (data: Record<string, unknown>) =>
      request<{ message?: string }>('/api/attendance/biometric', { method: 'POST', body: JSON.stringify(data) }),
    create: (data: Record<string, unknown>) =>
      request<{ message?: string }>('/api/attendance', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      request<{ message?: string }>(`/api/attendance/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  },

  checkin: {
    list: (params?: Record<string, string | number>) => {
      const qs = params ? buildQs(params) : '';
      return request<unknown[]>(`/api/checkin${qs}`);
    },
    create: (data: Record<string, unknown>) =>
      request('/api/checkin', { method: 'POST', body: JSON.stringify(data) }),
    // FIX: was (clientId, descriptors: number[][]) sending key "descriptors" (plural).
    // Backend expects key "descriptor" (singular) and a flat number[128] array.
    enroll: (clientId: string, descriptor: number[]) =>
      request(`/api/checkin/enroll`, { method: 'POST', body: JSON.stringify({ client_id: clientId, descriptor }) }),
    descriptors: () => request<unknown[]>('/api/checkin/descriptors'),
    face: (data: unknown) =>
      request('/api/checkin/face', { method: 'POST', body: JSON.stringify(data) }),
  },

  notifications: {
    list: (params?: Record<string, string | number>) => {
      const qs = params ? buildQs(params) : '';
      return request<unknown[]>(`/api/notifications${qs}`);
    },
    markRead: (id: string) =>
      request(`/api/notifications/${id}/read`, { method: 'PATCH' }),
    markAllRead: () =>
      request('/api/notifications/read-all', { method: 'PATCH' }),
  },

  dashboard: {
    stats:   () => request('/api/dashboard/stats'),
    revenue: (params?: Record<string, string | number>) => {
      const qs = params ? buildQs(params) : '';
      return request(`/api/dashboard/revenue${qs}`);
    },
    summary: () => request('/api/dashboard/summary'),
  },

  reports: {
    revenue: (params?: Record<string, string | number>) => {
      const qs = params ? buildQs(params) : '';
      return request(`/api/reports/revenue${qs}`);
    },
    members: (params?: Record<string, string | number>) => {
      const qs = params ? buildQs(params) : '';
      return request(`/api/reports/members${qs}`);
    },
    monthly: (year: number | string) =>
      request<unknown[]>(`/api/reports/monthly?year=${year}`),
    dues: () => request<unknown[]>('/api/reports/dues'),
    trainerSummary: () => request<TrainerSummaryRow[]>('/api/reports/trainer-summary'),
  },

  leave: {
    list: () => request<LeaveRequest[]>('/api/leave'),
    create: (data: Record<string, unknown>) =>
      request<{ leave: LeaveRequest }>('/api/leave', { method: 'POST', body: JSON.stringify(data) }),
    approve: (id: string) =>
      request<{ leave: LeaveRequest }>(`/api/leave/${id}/approve`, { method: 'POST' }),
    reject: (id: string, note?: string) =>
      request<{ leave: LeaveRequest }>(`/api/leave/${id}/reject`, { method: 'POST', body: JSON.stringify({ note }) }),
  },

  admin: {
    importDatabase: async (file: File): Promise<unknown> => {
      const BASE = apiBase();
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${BASE}/api/admin/import-database`, {
        method: 'POST',
        body: form,
        credentials: 'include',
      });
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
      return res.json().catch(() => ({}));
    },
  },
};
