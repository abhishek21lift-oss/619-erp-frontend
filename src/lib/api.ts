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
  phone?: string;
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
  pt_start_date?: string;
  pt_end_date?: string;
  expiry_date?: string;
  pt_sessions_left?: number;
  pt_sessions_total?: number;
  subscription_end_date?: string;
  subscription_start_date?: string;
  plan_name?: string;
  photo_url?: string;
  face_descriptor?: number[];
  biometric_fingers?: string;
  notes?: string;
  joining_date?: string;
  created_at?: string;
  updated_at?: string;
  is_frozen?: boolean;
  paid_amount?: number;
  final_amount?: number;
  combo_plan?: string;
  interested_in?: string;
};

export type Payment = {
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

export type Attendance = {
  id?: string;
  ref_id: string;
  ref_type?: string;
  ref_name?: string;
  date?: string;
  check_in?: string;
  check_out?: string;
  status: string;
  method?: string;
  notes?: string;
  trainer_id?: string;
  trainer_name?: string;
  created_at?: string;
};

export type Trainer = {
  id: string;
  name: string;
  mobile?: string;
  email?: string;
  role?: string;
  specialty?: string;
  is_active?: boolean;
  created_at?: string;
};

export type StaffMember = {
  id: string;
  name: string;
  email: string;
  mobile?: string;
  phone?: string;
  role: string;
  status?: string;
  is_active?: boolean;
  joining_date?: string;
  salary?: number;
  created_at?: string;
  updated_at?: string;
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
  target_sessions?: number;
  achieved_revenue: number;
  achieved_clients: number;
  achieved_sessions?: number;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
};

export type StaffTargetPayload = {
  staff_id?: string;
  month?: string;
  target_revenue?: number;
  target_clients?: number;
  target_sessions?: number;
  achieved_revenue?: number;
  achieved_clients?: number;
  achieved_sessions?: number;
};

export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export type LeaveRequest = {
  id: string;
  trainer_id?: string;
  trainer_name?: string;
  leave_type?: string;
  from_date?: string;
  to_date?: string;
  reason?: string;
  status: LeaveStatus;
  notes?: string;
  admin_note?: string;
  approved_by?: string;
  approved_at?: string;
  days?: number;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
};

export type LeaveRequestPayload = {
  trainer_id: string;
  leave_type: string;
  from_date: string;
  to_date: string;
  reason?: string;
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

// ─────────────────────────── Core fetch ──────────────────────────────

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

  if (!options.skipAuth) {
    let token: string | null = null;
    try { token = localStorage.getItem('619_token'); } catch { /* SSR */ }
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

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
      const rawErr = body?.message ?? body?.error;
      msg = typeof rawErr === 'string' ? rawErr : typeof rawErr === 'object' && rawErr ? rawErr.message || JSON.stringify(rawErr) : msg;
    } catch { /* ignore */ }
    const err = new Error(msg) as Error & { status: number };
    err.status = res.status;
    throw err;
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

async function requestFormData<T = unknown>(
  path: string,
  formData: FormData,
): Promise<T> {
  const BASE = apiBase();
  const url = path.startsWith('http') ? path : `${BASE}${path}`;

  const res = await fetch(url, {
    method: 'POST',
    body: formData,
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

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function buildQs(params?: Record<string, string | number>): string {
  if (!params) return '';
  const entries = Object.entries(params).map(([k, v]) => [k, String(v)] as [string, string]);
  return '?' + new URLSearchParams(entries).toString();
}

function normalisePayment(raw: Record<string, unknown>): Payment {
  return {
    ...raw,
    id: String(raw.id ?? ''),
    client_id: raw.client_id != null ? String(raw.client_id) : undefined,
    amount: Number(raw.amount ?? 0),
  } as Payment;
}

function normaliseStaff(raw: Record<string, unknown>): StaffMember {
  return {
    ...raw,
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    email: String(raw.email ?? ''),
    phone: raw.phone == null ? undefined : String(raw.phone),
    role: String(raw.role ?? 'staff'),
    status: raw.status == null ? undefined : String(raw.status),
  } as StaffMember;
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
    changePassword: (currentPassword: string, newPassword: string) =>
      request<{ message?: string }>('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      }),
    listUsers: () => request<User[]>('/api/auth/users'),
    createUser: (data: {
      name: string;
      email: string;
      password: string;
      role: Role;
      trainer_id?: string;
    }) => request<{ message?: string; user: User }>('/api/auth/create-user', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    toggleUser: (id: string) =>
      request<{ message?: string; is_active: boolean }>(`/api/auth/users/${id}/toggle`, {
        method: 'PUT',
      }),
    deleteUser: (id: string) =>
      request<{ message?: string }>(`/api/auth/users/${id}`, { method: 'DELETE' }),
  },

  clients: {
    list: (params?: Record<string, string | number>) =>
      request<Client[]>(`/api/clients${buildQs(params)}`),
    get:    (id: string) => request<Client>(`/api/clients/${id}`),
    create: (data: Partial<Client>) => request<Client>('/api/clients', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Client>) =>
      request<Client>(`/api/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/api/clients/${id}`, { method: 'DELETE' }),
    search: (q: string) => request<Client[]>(`/api/clients/search?q=${encodeURIComponent(q)}`),
    uploadPhoto: (id: string, dataUrl: string) =>
      request<{ message?: string; photo_url?: string }>(`/api/clients/${id}/photo`, {
        method: 'POST',
        body: JSON.stringify({ photo: dataUrl }),
      }),
    renewSubscription: (id: string, data: Record<string, unknown>) =>
      request<{ message?: string }>(`/api/clients/${id}/renew-subscription`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    addSubscription: (id: string, data: Record<string, unknown>) =>
      request<{ message?: string }>(`/api/clients/${id}/add-subscription`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    assignPt: (id: string, data: Record<string, unknown>) =>
      request<{ message?: string }>(`/api/clients/${id}/assign-pt`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    renewPt: (id: string, data: Record<string, unknown>) =>
      request<{ message?: string }>(`/api/clients/${id}/renew-pt`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    combo: (id: string, data: Record<string, unknown>) =>
      request<{ message?: string }>(`/api/clients/${id}/combo`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    upgrade: (id: string, data: Record<string, unknown>) =>
      request<{ message?: string }>(`/api/clients/${id}/upgrade`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    downgrade: (id: string, data: Record<string, unknown>) =>
      request<{ message?: string }>(`/api/clients/${id}/downgrade`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    transfer: (id: string, data: Record<string, unknown>) =>
      request<{ message?: string }>(`/api/clients/${id}/transfer`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    trial: (id: string, data: Record<string, unknown>) =>
      request<{ message?: string }>(`/api/clients/${id}/trial`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    freeze: (id: string, data: Record<string, unknown>) =>
      request<{ message?: string }>(`/api/clients/${id}/freeze`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    unfreeze: (id: string) =>
      request<{ message?: string }>(`/api/clients/${id}/unfreeze`, {
        method: 'POST',
      }),
  },

  payments: {
    list: async (params?: Record<string, string>): Promise<Payment[]> => {
      const raw = await request<Record<string, unknown>[]>(`/api/payments${buildQs(params)}`);
      return Array.isArray(raw) ? raw.map(normalisePayment) : [];
    },
    create: (data: Record<string, unknown>) =>
      request('/api/payments', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/api/payments/${id}`, { method: 'DELETE' }),
    stats:  (params?: Record<string, string>) =>
      request(`/api/payments/stats${buildQs(params)}`),
  },

  subscriptions: {
    list: (params?: Record<string, string>) =>
      request<unknown[]>(`/api/subscriptions${buildQs(params)}`),
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
    list:   () => request<Trainer[]>('/api/trainers'),
    get:    (id: string) => request<Trainer>(`/api/trainers/${id}`),
    create: (data: Record<string, unknown>) =>
      request('/api/trainers', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      request(`/api/trainers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/api/trainers/${id}`, { method: 'DELETE' }),
    sessions: (id: string) => request(`/api/trainers/${id}/sessions`),
  },

  expenses: {
    list:   (params?: Record<string, string | number>) =>
              request<{ expenses: Record<string, unknown>[]; total: number }>(`/api/expenses${buildQs(params)}`),
    get:    (id: string) => request<Record<string, unknown>>(`/api/expenses/${id}`),
    create: (data: Record<string, unknown>) =>
              request<{ message?: string; expense: Record<string, unknown> }>('/api/expenses', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
              request<{ message?: string; expense: Record<string, unknown> }>(`/api/expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<{ message?: string }>(`/api/expenses/${id}`, { method: 'DELETE' }),
    stats:  (params?: Record<string, string | number>) =>
              request<{ summary: Record<string, unknown>; byCategory: Record<string, unknown>[] }>(`/api/expenses/stats${buildQs(params)}`),
  },

  staff: {
    list: async () => {
      const raw = await request<Record<string, unknown>[]>('/api/staff');
      return Array.isArray(raw) ? raw.map(normaliseStaff) : [];
    },
    get:    (id: string) => request<StaffMember>(`/api/staff/${id}`),
    create: (data: Record<string, unknown>) =>
      request<{ message?: string; staff: StaffMember }>('/api/staff', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      request<{ message?: string; staff: StaffMember }>(`/api/staff/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<{ message?: string }>(`/api/staff/${id}`, { method: 'DELETE' }),
    targets: {
      list: (params?: Record<string, string | number>) =>
        request<StaffTarget[]>(`/api/staff/targets${buildQs(params)}`),
      create: (data: StaffTargetPayload) =>
        request<{ message?: string; target: StaffTarget }>('/api/staff/targets', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      update: (id: string, data: StaffTargetPayload) =>
        request<{ message?: string; target: StaffTarget }>(`/api/staff/targets/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        }),
      delete: (id: string) =>
        request<{ message?: string }>(`/api/staff/targets/${id}`, { method: 'DELETE' }),
    },
  },

  leave: {
    list: (params?: Record<string, string | number>) =>
      request<LeaveRequest[]>(`/api/leave${buildQs(params)}`),
    get: (id: string) => request<LeaveRequest>(`/api/leave/${id}`),
    create: (data: LeaveRequestPayload) =>
      request<{ message?: string; leave: LeaveRequest }>('/api/leave', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    approve: (id: string, admin_note?: string) =>
      request<{ message?: string; leave: LeaveRequest }>(`/api/leave/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ admin_note }),
      }),
    reject: (id: string, admin_note?: string) =>
      request<{ message?: string; leave: LeaveRequest }>(`/api/leave/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ admin_note }),
      }),
  },

  attendance: {
    list: (params?: Record<string, string>) =>
      request<Attendance[]>(`/api/attendance${buildQs(params)}`),
    mark: (data: Record<string, unknown>) =>
      request<Attendance>('/api/attendance/mark', { method: 'POST', body: JSON.stringify(data) }),
    biometric: (data: Record<string, unknown>) =>
      request<{ message: string }>('/api/attendance/biometric', { method: 'POST', body: JSON.stringify(data) }),
    create: (data: Record<string, unknown>) =>
      request('/api/attendance', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      request(`/api/attendance/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  },

  checkin: {
    list: (params?: Record<string, string>) =>
      request<unknown[]>(`/api/checkin${buildQs(params)}`),
    create: (data: Record<string, unknown>) =>
      request('/api/checkin', { method: 'POST', body: JSON.stringify(data) }),
    enroll: (clientId: string, descriptor: number[]) =>
      request(`/api/checkin/enroll`, { method: 'POST', body: JSON.stringify({ client_id: clientId, descriptor }) }),
    descriptors: () => request<unknown[]>('/api/checkin/descriptors'),
    face: (descriptor: number[]) =>
      request<{ success: boolean; error?: string; member?: { id: string; name: string; status: string } }>(
        '/api/checkin/face', { method: 'POST', body: JSON.stringify({ descriptor }) }
      ),
  },

  notifications: {
    list: (params?: Record<string, string>) =>
      request<unknown[]>(`/api/notifications${buildQs(params)}`),
    markRead: (id: string) =>
      request(`/api/notifications/${id}/read`, { method: 'PATCH' }),
    markAllRead: () =>
      request('/api/notifications/read-all', { method: 'PATCH' }),
  },

  dashboard: {
    stats: () => request('/api/dashboard/stats'),
    revenue: (params?: Record<string, string>) =>
      request(`/api/dashboard/revenue${buildQs(params)}`),
    summary: () =>
      request<{
        expiring_soon: number;
        total_dues: number;
        attendance_today: number;
        recent_payments: Array<{ id: string; client_name?: string; amount: number; method?: string; date?: string }>;
      }>('/api/dashboard/summary'),
  },

  reports: {
    revenue: (params?: Record<string, string>) =>
      request(`/api/reports/revenue${buildQs(params)}`),
    members: (params?: Record<string, string>) =>
      request(`/api/reports/members${buildQs(params)}`),
    monthly: (year: number | string) =>
      request<unknown[]>(`/api/reports/monthly?year=${year}`),
    dues: () =>
      request<unknown[]>('/api/reports/dues'),
    trainerSummary: () =>
      request<TrainerSummaryRow[]>('/api/reports/trainer-summary'),
  },

  admin: {
    importDatabase: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return requestFormData<{ message?: string }>('/api/admin/import-database', formData);
    },
    exportDatabase: () => request<{ message?: string; url?: string }>('/api/admin/export-database'),
    backupDatabase: () => request<{ message?: string }>('/api/admin/backup-database', { method: 'POST' }),
  },

  // ── Settings / Branding ──────────────────────────────────────────────
  settings: {
    /** Load all branding key-value pairs */
    getBranding: () =>
      request<Record<string, string>>('/api/settings/branding'),

    /** Persist branding key-value pairs (admin only) */
    saveBranding: (data: Record<string, string>) =>
      request<{ message: string; settings: Record<string, string> }>('/api/settings/branding', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    /** Upload a brand asset (base64 data-URL) and store under `key` */
    uploadAsset: (image: string, key: string) =>
      request<{ message: string; url: string }>('/api/settings/branding/upload-logo', {
        method: 'POST',
        body: JSON.stringify({ image, key }),
      }),
  },
};
