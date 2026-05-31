import { http } from './http';

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
  member_id?: string;
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
  /** primary specialization string (comma-separated) */
  specialty?: string;
  /** alias used by some API responses */
  specialization?: string;
  is_active?: boolean;
  created_at?: string;
  /** stats returned by /api/trainers list */
  active_clients?: number;
  total_clients?: number;
  month_revenue?: number | string;
  total_revenue?: number | string;
  experience_years?: number;
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

// Core fetch is handled by http() from ./http
// This file provides the typed `api` namespace facade over http()

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
      http<{ user: User }>('/api/auth/login', {
        method: 'POST',
        body: { email, password },
      }),
    me: () => http<{ user: User }>('/api/auth/me'),
    logout: () => http('/api/auth/logout', { method: 'POST' }).catch((_err) => console.warn('[api] logout failed', _err)),
    changePassword: (currentPassword: string, newPassword: string) =>
      http<{ message?: string }>('/api/auth/change-password', {
        method: 'POST',
        body: { currentPassword, newPassword },
      }),
    listUsers: () => http<User[]>('/api/auth/users'),
    createUser: (data: {
      name: string;
      email: string;
      password: string;
      role: Role;
      trainer_id?: string;
    }) => http<{ message?: string; user: User }>('/api/auth/create-user', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    toggleUser: (id: string) =>
      http<{ message?: string; is_active: boolean }>(`/api/auth/users/${id}/toggle`, {
        method: 'PUT',
      }),
    deleteUser: (id: string) =>
      http<{ message?: string }>(`/api/auth/users/${id}`, { method: 'DELETE' }),
  },

  clients: {
    list: (params?: Record<string, string | number>) =>
      http<Client[]>(`/api/clients${buildQs(params)}`),
    get:    (id: string) => http<Client>(`/api/clients/${id}`),
    create: (data: Partial<Client>) => http<Client>('/api/clients', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Client>) =>
      http<Client>(`/api/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => http(`/api/clients/${id}`, { method: 'DELETE' }),
    search: (q: string) => http<Client[]>(`/api/clients/search?q=${encodeURIComponent(q)}`),
    uploadPhoto: (id: string, dataUrl: string) =>
      http<{ message?: string; photo_url?: string }>(`/api/clients/${id}/photo`, {
        method: 'POST',
        body: JSON.stringify({ photo: dataUrl }),
      }),
    renewSubscription: (id: string, data: Record<string, unknown>) =>
      http<{ message?: string }>(`/api/clients/${id}/renew-subscription`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    addSubscription: (id: string, data: Record<string, unknown>) =>
      http<{ message?: string }>(`/api/clients/${id}/add-subscription`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    assignPt: (id: string, data: Record<string, unknown>) =>
      http<{ message?: string }>(`/api/clients/${id}/assign-pt`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    renewPt: (id: string, data: Record<string, unknown>) =>
      http<{ message?: string }>(`/api/clients/${id}/renew-pt`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    combo: (id: string, data: Record<string, unknown>) =>
      http<{ message?: string }>(`/api/clients/${id}/combo`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    upgrade: (id: string, data: Record<string, unknown>) =>
      http<{ message?: string }>(`/api/clients/${id}/upgrade`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    downgrade: (id: string, data: Record<string, unknown>) =>
      http<{ message?: string }>(`/api/clients/${id}/downgrade`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    transfer: (id: string, data: Record<string, unknown>) =>
      http<{ message?: string }>(`/api/clients/${id}/transfer`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    trial: (id: string, data: Record<string, unknown>) =>
      http<{ message?: string }>(`/api/clients/${id}/trial`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    freeze: (id: string, data: Record<string, unknown>) =>
      http<{ message?: string }>(`/api/clients/${id}/freeze`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    unfreeze: (id: string) =>
      http<{ message?: string }>(`/api/clients/${id}/unfreeze`, {
        method: 'POST',
      }),
  },

  payments: {
    list: async (params?: Record<string, string>): Promise<Payment[]> => {
      const raw = await http<Record<string, unknown>[]>(`/api/payments${buildQs(params)}`);
      return Array.isArray(raw) ? raw.map(normalisePayment) : [];
    },
    create: (data: Record<string, unknown>) =>
      http('/api/payments', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) => http(`/api/payments/${id}`, { method: 'DELETE' }),
    stats:  (params?: Record<string, string>) =>
      http(`/api/payments/stats${buildQs(params)}`),
  },

  subscriptions: {
    list: (params?: Record<string, string>) =>
      http<unknown[]>(`/api/subscriptions${buildQs(params)}`),
    get:         (id: string) => http(`/api/subscriptions/${id}`),
    create:      (data: Record<string, unknown>) =>
      http('/api/subscriptions', { method: 'POST', body: JSON.stringify(data) }),
    update:      (id: string, data: Record<string, unknown>) =>
      http(`/api/subscriptions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    addPayment:  (id: string, data: Record<string, unknown>) =>
      http(`/api/subscriptions/${id}/payments`, { method: 'POST', body: JSON.stringify(data) }),
    freeze:      (id: string, data: Record<string, unknown>) =>
      http(`/api/subscriptions/${id}/freeze`, { method: 'POST', body: JSON.stringify(data) }),
    unfreeze:    (id: string) =>
      http(`/api/subscriptions/${id}/unfreeze`, { method: 'POST' }),
    upgrade:     (id: string, data: Record<string, unknown>) =>
      http(`/api/subscriptions/${id}/upgrade`, { method: 'POST', body: JSON.stringify(data) }),
    downgrade:   (id: string, data: Record<string, unknown>) =>
      http(`/api/subscriptions/${id}/downgrade`, { method: 'POST', body: JSON.stringify(data) }),
    transfer:    (id: string, data: Record<string, unknown>) =>
      http(`/api/subscriptions/${id}/transfer`, { method: 'POST', body: JSON.stringify(data) }),
    extend:      (id: string, data: Record<string, unknown>) =>
      http(`/api/subscriptions/${id}/extend`, { method: 'POST', body: JSON.stringify(data) }),
  },

  plans: {
    list:   () => http<unknown[]>('/api/plans'),
    get:    (id: string) => http(`/api/plans/${id}`),
    create: (data: Record<string, unknown>) =>
      http<PlanApiResponse>('/api/plans', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      http<PlanApiResponse>(`/api/plans/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => http(`/api/plans/${id}`, { method: 'DELETE' }),
  },

  trainers: {
    list:   () => http<Trainer[]>('/api/trainers'),
    get:    (id: string) => http<Trainer>(`/api/trainers/${id}`),
    create: (data: Record<string, unknown>) =>
      http('/api/trainers', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      http(`/api/trainers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => http(`/api/trainers/${id}`, { method: 'DELETE' }),
    sessions: (id: string) => http(`/api/trainers/${id}/sessions`),
  },

  expenses: {
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
  },

  staff: {
    list: async () => {
      const raw = await http<Record<string, unknown>[]>('/api/staff');
      return Array.isArray(raw) ? raw.map(normaliseStaff) : [];
    },
    get:    (id: string) => http<StaffMember>(`/api/staff/${id}`),
    create: (data: Record<string, unknown>) =>
      http<{ message?: string; staff: StaffMember }>('/api/staff', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      http<{ message?: string; staff: StaffMember }>(`/api/staff/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => http<{ message?: string }>(`/api/staff/${id}`, { method: 'DELETE' }),
    targets: {
      list: (params?: Record<string, string | number>) =>
        http<StaffTarget[]>(`/api/staff/targets${buildQs(params)}`),
      create: (data: StaffTargetPayload) =>
        http<{ message?: string; target: StaffTarget }>('/api/staff/targets', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      update: (id: string, data: StaffTargetPayload) =>
        http<{ message?: string; target: StaffTarget }>(`/api/staff/targets/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        }),
      delete: (id: string) =>
        http<{ message?: string }>(`/api/staff/targets/${id}`, { method: 'DELETE' }),
    },
  },

  leave: {
    list: (params?: Record<string, string | number>) =>
      http<LeaveRequest[]>(`/api/leave${buildQs(params)}`),
    get: (id: string) => http<LeaveRequest>(`/api/leave/${id}`),
    create: (data: LeaveRequestPayload) =>
      http<{ message?: string; leave: LeaveRequest }>('/api/leave', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    approve: (id: string, admin_note?: string) =>
      http<{ message?: string; leave: LeaveRequest }>(`/api/leave/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ admin_note }),
      }),
    reject: (id: string, admin_note?: string) =>
      http<{ message?: string; leave: LeaveRequest }>(`/api/leave/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ admin_note }),
      }),
  },

  attendance: {
    list: (params?: Record<string, string>) =>
      http<Attendance[]>(`/api/attendance${buildQs(params)}`),
    mark: (data: Record<string, unknown>) =>
      http<Attendance>('/api/attendance/mark', { method: 'POST', body: JSON.stringify(data) }),
    biometric: (data: Record<string, unknown>) =>
      http<{ message: string }>('/api/attendance/biometric', { method: 'POST', body: JSON.stringify(data) }),
    create: (data: Record<string, unknown>) =>
      http('/api/attendance', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      http(`/api/attendance/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  },

  checkin: {
    list: (params?: Record<string, string>) =>
      http<unknown[]>(`/api/checkin${buildQs(params)}`),
    create: (data: Record<string, unknown>) =>
      http('/api/checkin', { method: 'POST', body: JSON.stringify(data) }),
    enroll: (clientId: string, descriptor: number[]) =>
      http(`/api/checkin/enroll`, { method: 'POST', body: JSON.stringify({ client_id: clientId, descriptor }) }),
    descriptors: () => http<{ client_id: string; name: string; descriptor: number[] }[]>('/api/checkin/descriptors'),
    face: (descriptor: number[]) =>
      http<{ success: boolean; error?: string; member?: { id: string; name: string; status: string } }>(
        '/api/checkin/face', { method: 'POST', body: JSON.stringify({ descriptor }) }
      ),
  },

  notifications: {
    list: (params?: Record<string, string>) =>
      http<unknown[]>(`/api/v1/notifications${buildQs(params)}`),
    markRead: (id: string) =>
      http(`/api/v1/notifications/${id}/read`, { method: 'PATCH' }),
    markAllRead: () =>
      http('/api/v1/notifications/read-all', { method: 'PATCH' }),
  },

  dashboard: {
    stats: () => http('/api/dashboard/stats'),
    revenue: (params?: Record<string, string>) =>
      http(`/api/dashboard/revenue${buildQs(params)}`),
    summary: () =>
      http<{
        expiring_soon: number;
        total_dues: number;
        attendance_today: number;
        recent_payments: Array<{ id: string; client_name?: string; amount: number; method?: string; date?: string }>;
      }>('/api/dashboard/summary'),
  },

  reports: {
    revenue: (params?: Record<string, string>) =>
      http(`/api/reports/revenue${buildQs(params)}`),
    members: (params?: Record<string, string>) =>
      http(`/api/reports/members${buildQs(params)}`),
    monthly: (year: number | string) =>
      http<unknown[]>(`/api/reports/monthly?year=${year}`),
    dues: () =>
      http<unknown[]>('/api/reports/dues'),
    trainerSummary: () =>
      http<TrainerSummaryRow[]>('/api/reports/trainer-summary'),
  },

  admin: {
    importDatabase: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return http<{ message?: string }>('/api/import/import-excel', { method: 'POST', body: formData });
    },
    exportDatabase: () => http<{ message?: string; url?: string }>('/api/admin/export-database'),
    backupDatabase: () => http<{ message?: string }>('/api/admin/backup-database', { method: 'POST' }),
  },

  // ── Settings / Branding ──────────────────────────────────────────────
  settings: {
    /** Load all branding key-value pairs */
    getBranding: () =>
      http<Record<string, string>>('/api/settings/branding'),

    /** Persist branding key-value pairs (admin only) */
    saveBranding: (data: Record<string, string>) =>
      http<{ message: string; settings: Record<string, string> }>('/api/settings/branding', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    /** Upload a brand asset (base64 data-URL) and store under `key` */
      uploadAsset: (image: string, key: string) =>
      http<{ message: string; url: string }>('/api/settings/branding/upload-logo', {
        method: 'POST',
        body: JSON.stringify({ image, key }),
      }),

    /** Full studio config + branches */
    getStudio: () =>
      http<{ settings: Record<string, unknown>; branches: unknown[] }>('/api/settings/studio'),

    /** List branches */
    getBranches: () =>
      http<{ id: string; name: string; location: string; status: string; member_count: number }[]>('/api/settings/branches'),

    /** Create a branch */
    createBranch: (data: { name: string; location?: string }) =>
      http<{ id: string; name: string; location: string; status: string; member_count: number }>('/api/settings/branches', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    /** Update a branch */
    updateBranch: (id: string, data: { name?: string; location?: string; status?: string }) =>
      http<{ id: string; name: string; location: string; status: string }>(`/api/settings/branches/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    /** Get feature flags */
    getFeatureFlags: () =>
      http<{ flags: Record<string, unknown>; raw: unknown[] }>('/api/settings/feature-flags'),

    /** Update feature flags */
    updateFeatureFlags: (data: Record<string, unknown>) =>
      http<{ message: string }>('/api/settings/feature-flags', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    /** Update generic settings (key-value) */
    update: (data: Record<string, string>) =>
      http<{ message: string; count: number }>('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },

  // ── Invoices ──────────────────────────────────────────────────────
  invoices: {
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
  },

  // ── Workouts / Exercises ──────────────────────────────────────────
  workouts: {
    exercises: {
      list: (params?: Record<string, string | number>) =>
        http<unknown[]>(`/api/workouts/exercises${buildQs(params)}`),
      create: (data: Record<string, unknown>) =>
        http<{ message: string; exercise: unknown }>('/api/workouts/exercises', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      update: (id: string, data: Record<string, unknown>) =>
        http<{ message: string; exercise: unknown }>(`/api/workouts/exercises/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        }),
      delete: (id: string) =>
        http<{ message: string }>(`/api/workouts/exercises/${id}`, { method: 'DELETE' }),
    },
    plans: {
      list: (params?: Record<string, string | number>) =>
        http<unknown[]>(`/api/workouts/plans${buildQs(params)}`),
      create: (data: Record<string, unknown>) =>
        http<{ message: string; plan: unknown }>('/api/workouts/plans', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      update: (id: string, data: Record<string, unknown>) =>
        http<{ message: string; plan: unknown }>(`/api/workouts/plans/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        }),
      delete: (id: string) =>
        http<{ message: string }>(`/api/workouts/plans/${id}`, { method: 'DELETE' }),
    },
    assign: (data: { workout_plan_id: string; client_id: string; start_date?: string; end_date?: string; notes?: string }) =>
      http<{ message: string; assignment: unknown }>('/api/workouts/assign', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateProgress: (id: string, data: { progress_pct: number }) =>
      http<{ message: string; assignment: unknown }>(`/api/workouts/assignments/${id}/progress`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },

  // ── Diet / Nutrition ──────────────────────────────────────────────
  diet: {
    meals: {
      list: (params?: Record<string, string | number>) =>
        http<unknown[]>(`/api/diet/meals${buildQs(params)}`),
      create: (data: Record<string, unknown>) =>
        http<{ message: string; meal: unknown }>('/api/diet/meals', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
    },
    templates: {
      list: (params?: Record<string, string | number>) =>
        http<unknown[]>(`/api/diet/templates${buildQs(params)}`),
      create: (data: Record<string, unknown>) =>
        http<{ message: string; template: unknown }>('/api/diet/templates', {
          method: 'POST',
          body: JSON.stringify(data),
        }),
    },
    assign: (data: { diet_template_id: string; client_id: string; start_date?: string; end_date?: string; notes?: string }) =>
      http<{ message: string; assignment: unknown }>('/api/diet/assign', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    tracker: {
      get: (params: { client_id: string; date?: string }) =>
        http<{ today: Record<string, unknown>; history: unknown[] }>(`/api/diet/tracker${buildQs(params)}`),
      update: (data: { client_id: string; log_date?: string; calories_consumed?: number; protein_g?: number; carbs_g?: number; fats_g?: number; water_glasses?: number; notes?: string }) =>
        http<{ message: string; log: unknown }>('/api/diet/tracker', {
          method: 'PUT',
          body: JSON.stringify(data),
        }),
    },
    fitnessProfile: {
      get: (clientId: string) =>
        http<unknown>(`/api/diet/fitness-profile/${clientId}`),
      update: (clientId: string, data: Record<string, unknown>) =>
        http<{ message: string; profile: unknown }>(`/api/diet/fitness-profile/${clientId}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        }),
    },
    supplements: {
      list: () => http<unknown[]>('/api/diet/supplements'),
    },
  },

  // ── Renewals ──────────────────────────────────────────────────────
  renewals: {
    pipeline: (params?: Record<string, string | number>) =>
      http<{ members: unknown[]; stats: { expiring_today: number; likely_to_renew: number; high_value_at_risk: number; auto_renewals: number; total_pipeline: number } }>(
        `/api/renewals/pipeline${buildQs(params)}`,
      ),
    churnAlerts: () =>
      http<unknown[]>('/api/renewals/churn-alerts'),
    insights: () =>
      http<{ stats: Record<string, number>; insights: unknown[] }>('/api/renewals/insights'),
    renew: (id: string, data: Record<string, unknown>) =>
      http<{ message: string }>(`/api/renewals/${id}/renew`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    reminders: (data?: { days?: number }) =>
      http<{ message: string; count: number }>('/api/renewals/reminders', {
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
      }),
  },

  // ── Member Portal ────────────────────────────────────────────
  bookings: {
    list: (params?: Record<string, string | number>) =>
      http<unknown[]>(`/api/bookings${buildQs(params)}`),
    create: (data: { session_id: string }) =>
      http<{ message: string; booking: unknown }>('/api/bookings', {
        method: 'POST', body: JSON.stringify(data),
      }),
  },

  classes: {
    sessions: (params?: Record<string, string | number>) =>
      http<unknown[]>(`/api/classes/sessions${buildQs(params)}`),
  },

  member: {
    get: (id: string) =>
      http<{ data: unknown }>(`/api/v1/members/${id}`),
    metrics: (id: string) =>
      http<{ membership: unknown; stats: unknown }>(`/api/v1/members/${id}/metrics`),
  },

  // ── Leads CRM ────────────────────────────────────────────────
  leads: {
    list: (params?: Record<string, string | number>) =>
      http<{ data: unknown[]; total: number }>(`/api/leads${buildQs(params)}`),
    stats: () => http<{ data: unknown }>('/api/leads/stats'),
    get: (id: string) => http<{ data: unknown }>(`/api/leads/${id}`),
    create: (data: Record<string, unknown>) =>
      http<{ data: unknown }>('/api/leads', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      http<{ data: unknown }>(`/api/leads/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    convert: (id: string, client_id: string) =>
      http<{ data: unknown }>(`/api/leads/${id}/convert`, {
        method: 'POST', body: JSON.stringify({ client_id }),
      }),
    delete: (id: string) => http(`/api/leads/${id}`, { method: 'DELETE' }),
    followups: {
      list: (leadId: string) => http<{ data: unknown[] }>(`/api/leads/${leadId}/followups`),
      create: (leadId: string, data: Record<string, unknown>) =>
        http<{ data: unknown }>(`/api/leads/${leadId}/followups`, {
          method: 'POST', body: JSON.stringify(data),
        }),
      update: (followupId: string, data: Record<string, unknown>) =>
        http<{ data: unknown }>(`/api/leads/followups/${followupId}`, {
          method: 'PATCH', body: JSON.stringify(data),
        }),
    },
  },

  // ── Progress Tracking ─────────────────────────────────────────
  progress: {
    assessments: {
      list: (params?: Record<string, string | number>) =>
        http<{ data: unknown[] }>(`/api/progress/assessments${buildQs(params)}`),
      create: (data: Record<string, unknown>) =>
        http<{ data: unknown }>('/api/progress/assessments', {
          method: 'POST', body: JSON.stringify(data),
        }),
    },
    goals: {
      list: (params?: Record<string, string | number>) =>
        http<{ data: unknown[] }>(`/api/progress/goals${buildQs(params)}`),
      create: (data: Record<string, unknown>) =>
        http<{ data: unknown }>('/api/progress/goals', {
          method: 'POST', body: JSON.stringify(data),
        }),
      update: (id: string, data: Record<string, unknown>) =>
        http<{ data: unknown }>(`/api/progress/goals/${id}`, {
          method: 'PATCH', body: JSON.stringify(data),
        }),
    },
    weeklyCheckins: {
      list: (params?: Record<string, string | number>) =>
        http<{ data: unknown[] }>(`/api/progress/weekly-checkins${buildQs(params)}`),
      create: (data: Record<string, unknown>) =>
        http<{ data: unknown }>('/api/progress/weekly-checkins', {
          method: 'POST', body: JSON.stringify(data),
        }),
    },
    strengthLogs: {
      list: (params?: Record<string, string | number>) =>
        http<{ data: unknown[] }>(`/api/progress/strength-logs${buildQs(params)}`),
      create: (data: Record<string, unknown>) =>
        http<{ data: unknown }>('/api/progress/strength-logs', {
          method: 'POST', body: JSON.stringify(data),
        }),
    },
    progressPhotos: {
      list: (params?: Record<string, string | number>) =>
        http<{ data: unknown[] }>(`/api/progress/progress-photos${buildQs(params)}`),
      create: (data: Record<string, unknown>) =>
        http<{ data: unknown }>('/api/progress/progress-photos', {
          method: 'POST', body: JSON.stringify(data),
        }),
      delete: (id: string) => http(`/api/progress/progress-photos/${id}`, { method: 'DELETE' }),
    },
  },

  // ── Automation & Communication ─────────────────────────────────
  automation: {
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
    },
  },

  // ── PT OS ────────────────────────────────────────────────────
  pt: {
    dashboard: () =>
      http<{ data: unknown }>('/api/pt-os/dashboard'),
    clients: (params?: { trainer_id?: string }) =>
      http<{ data: unknown[]; total: number }>(`/api/pt-os/clients${buildQs(params)}`),
    client: (id: string) =>
      http<{ data: unknown }>(`/api/pt-os/clients/${id}`),
    createClient: (data: Record<string, unknown>) =>
      http<{ data: unknown }>('/api/pt-os/clients', {
        method: 'POST', body: JSON.stringify(data),
      }),
    updateClient: (id: string, data: Record<string, unknown>) =>
      http<{ data: unknown }>(`/api/pt-os/clients/${id}`, {
        method: 'PATCH', body: JSON.stringify(data),
      }),
    balanceSheet: (params?: { trainer_id?: string }) =>
      http<{ data: unknown[]; total: number; total_outstanding: number }>(
        `/api/pt-os/balance-sheet${buildQs(params)}`,
      ),
    plans: () =>
      http<{ data: unknown[] }>('/api/pt-os/plans'),
    createPlan: (data: { name: string; duration_months: number; base_amount: number; description?: string }) =>
      http<{ data: unknown }>('/api/pt-os/plans', {
        method: 'POST', body: JSON.stringify(data),
      }),
    commissions: (params?: { trainer_id?: string }) =>
      http<{ data: unknown[] }>(`/api/pt-os/commissions${buildQs(params)}`),
    calculateCommissions: (month?: string) =>
      http<{ data: { count: number; total: number } }>('/api/pt-os/commissions/calculate', {
        method: 'POST', body: JSON.stringify({ month }),
      }),
    payouts: (params?: { month?: string }) =>
      http<{ data: unknown[]; month: string }>(`/api/pt-os/payouts${buildQs(params)}`),
    createPayout: (data: { trainer_id: string; month: string; deductions?: number }) =>
      http<{ data: unknown }>('/api/pt-os/payouts', {
        method: 'POST', body: JSON.stringify(data),
      }),
    approvePayout: (id: string, data: { payment_method?: string; payment_ref?: string }) =>
      http<{ data: unknown }>(`/api/pt-os/payouts/${id}/approve`, {
        method: 'POST', body: JSON.stringify(data),
      }),
    revenue: () =>
      http<{ data: unknown[] }>('/api/pt-os/revenue'),
    trainerPerformance: () =>
      http<{ data: unknown[] }>('/api/pt-os/trainer-performance'),
  },
};
