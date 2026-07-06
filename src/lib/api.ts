import { http, httpSSE } from './http';
export { http };
import type { Role } from './roles';
import type { AgentTask, AgentAuditEntry } from '../types/agent';

export { ROLES, normaliseRole, hasRole, isAdminOrManager } from './roles';

// ─────────────────────────── Types ───────────────────────────────────

export type DuplicateGroup = {
  normalized_name: string;
  display_name: string;
  record_count: number;
  first_seen: string;
  subscription_starts: string[] | null;
  total_final: string;
  total_paid: string;
  balance: string;
  master_id: string;
  all_ids: string[];
  mobile: string | null;
  latest_plan: string | null;
  trainer_name: string | null;
};

export type MergeResult = {
  name: string;
  master_id: string;
  merged_count: number;
  total_final: number;
  total_paid: number;
  balance: number;
};

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

export type DuesItem = {
  id: string;
  name?: string;
  client_id?: string;
  mobile?: string;
  balance_amount?: number;
  pt_end_date?: string;
  status?: string;
  trainer_name?: string;
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

export type TrainerSummaryRow = {
  id: string | number;
  name: string;
  active_clients?: number;
  total_clients?: number;
  month_revenue?: number;
  total_revenue?: number;
  [key: string]: unknown;
};

export type PtClientBase = {
  id: string;
  unique_id?: string;
  client_id: string;
  name: string;
  mobile: string;
  email?: string;
  photo_url?: string;
  gender?: string;
  dob?: string;
  weight?: number;
  notes?: string;
  address?: string;
  emergency_no?: string;
  trainer_name: string;
  package_type: string;
  final_amount: number;
  paid_amount: number;
  balance_amount: number;
  pt_end_date: string;
  days_left: number;
  status: string;
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
    googleLogin: (credential: string) =>
      http<{ user: User }>('/api/auth/google-login', {
        method: 'POST',
        body: { credential },
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

  // ── WebAuthn / Passkey — user-level biometric auth ─────────────────────────
  webauthn: {
    // Registration (user must be logged in)
    registerOptions: () =>
      http<Record<string, unknown>>('/api/auth/webauthn/register/options', { method: 'POST' }),
    registerVerify: (body: { registration: Record<string, unknown>; deviceName?: string }) =>
      http<{ success: boolean; credential: { id: string; device_name: string; created_at: string } }>(
        '/api/auth/webauthn/register/verify', { method: 'POST', body: JSON.stringify(body) }
      ),

    // Login (no session required)
    loginOptions: (body?: { email?: string }) =>
      http<Record<string, unknown>>('/api/auth/webauthn/login/options', {
        method: 'POST',
        body: JSON.stringify(body ?? {}),
      }),
    loginVerify: (body: { authentication: Record<string, unknown> }) =>
      http<{ user: { id: string; name?: string; email: string; role?: string; trainer_id?: string; member_id?: string } }>(
        '/api/auth/webauthn/login/verify', { method: 'POST', body: JSON.stringify(body) }
      ),

    // Action verification (user must be logged in)
    actionOptions: () =>
      http<Record<string, unknown>>('/api/auth/webauthn/action/options', { method: 'POST' }),
    actionVerify: (body: { authentication: Record<string, unknown> }) =>
      http<{ verified: boolean; actionToken: string }>(
        '/api/auth/webauthn/action/verify', { method: 'POST', body: JSON.stringify(body) }
      ),

    // Credential management (user's own passkeys)
    listCredentials: () =>
      http<{ credentials: { id: string; device_name: string; device_type: string; backed_up: boolean; is_active: boolean; created_at: string; last_used_at: string | null }[] }>(
        '/api/auth/webauthn/credentials'
      ),
    deleteCredential: (id: string) =>
      http<{ success: boolean }>(`/api/auth/webauthn/credentials/${id}`, { method: 'DELETE' }),
    renameCredential: (id: string, deviceName: string) =>
      http<{ success: boolean; credential: { id: string; device_name: string } }>(
        `/api/auth/webauthn/credentials/${id}`,
        { method: 'PATCH', body: JSON.stringify({ deviceName }) }
      ),
    toggleCredential: (id: string) =>
      http<{ success: boolean; is_active: boolean }>(
        `/api/auth/webauthn/credentials/${id}/toggle`,
        { method: 'PUT' }
      ),

    // Admin
    adminStats: () =>
      http<{ totalCredentials: number; enrolledUsers: number; loginsLast24h: number; failedAttemptsLast24h: number }>(
        '/api/auth/webauthn/admin/stats'
      ),
    adminCredentials: () =>
      http<{ credentials: Array<{ id: string; device_name: string; device_type: string; backed_up: boolean; created_at: string; last_used_at: string | null; user_id: string; user_name: string; user_email: string; role: string }> }>(
        '/api/auth/webauthn/admin/credentials'
      ),
    adminRevokeCredential: (id: string) =>
      http<{ success: boolean }>(`/api/auth/webauthn/admin/credentials/${id}`, { method: 'DELETE' }),
    adminAuditLogs: (limit = 100) =>
      http<{ logs: Array<{ id: string; event: string; detail: Record<string, unknown>; ip: string | null; created_at: string; user_name: string | null; user_email: string | null; role: string | null }> }>(
        `/api/auth/webauthn/admin/audit-logs?limit=${limit}`
      ),
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
    assignPt: (id: string, data: Record<string, unknown>) =>
      http<{ message?: string }>(`/api/clients/${id}/assign-pt`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    renewPt: (id: string, data: Record<string, unknown>) =>
      http<{ message?: string; data?: unknown }>(`/api/pt-os/clients/${id}/renew`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    renewalHistory: (id: string) =>
      http<{ data: unknown[] }>(`/api/pt-os/clients/${id}/renewals`),
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

  trainers: {
    list:   () => http<Trainer[]>('/api/trainers'),
    get:    (id: string) => http<Trainer>(`/api/trainers/${id}`),
    create: (data: Record<string, unknown>) =>
      http('/api/trainers', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      http(`/api/trainers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => http(`/api/trainers/${id}`, { method: 'DELETE' }),
    sessions: (id: string) => http(`/api/trainers/${id}/sessions`),
    createSession: (data: {
      trainer_id: string; client_id: string; date: string; time: string;
      duration: number; type?: string; notes?: string; recurring?: boolean;
    }) => http<{ data: unknown }>('/api/trainers/sessions', {
      method: 'POST', body: JSON.stringify(data),
    }),
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
      http<Attendance>('/api/attendance', { method: 'POST', body: JSON.stringify(data) }),
    create: (data: Record<string, unknown>) =>
      http('/api/attendance', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      http(`/api/attendance/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  },

  checkin: {
    face: (descriptor: number[]) =>
      http<{ success: boolean; error?: string; member?: { id: string; name: string; status: string; photo_url?: string; member_code?: string } }>(
        '/api/checkin/face', { method: 'POST', body: JSON.stringify({ descriptor }) }
      ),
    enroll: (client_id: string, descriptor: number[]) =>
      http<{ message: string; client_id: string; descriptor_id: string }>(
        '/api/checkin/enroll', { method: 'POST', body: JSON.stringify({ client_id, descriptor }) }
      ),
    revokeEnrollment: (clientId: string) =>
      http<{ message: string }>(`/api/checkin/enroll/${clientId}`, { method: 'DELETE' }),
  },

  notifications: {
    list: (params?: Record<string, string>) =>
      http<unknown[]>(`/api/v1/notifications${buildQs(params)}`),
    markRead: (id: string) =>
      http(`/api/v1/notifications/${id}/read`, { method: 'PATCH' }),
    markAllRead: () =>
      http('/api/v1/notifications/read-all', { method: 'PATCH' }),
  },

  reports: {
    revenue: (params?: Record<string, string>) =>
      http(`/api/reports/revenue${buildQs(params)}`),
    members: (params?: Record<string, string>) =>
      http(`/api/reports/members${buildQs(params)}`),
    monthly: (year: number | string) =>
      http<unknown[]>(`/api/reports/monthly?year=${year}`),
    dues: () =>
      http<DuesItem[]>('/api/reports/dues'),
    trainerSummary: () =>
      http<TrainerSummaryRow[]>('/api/reports/trainer-summary'),
  },

  admin: {
    importDatabase: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return http<{ message?: string }>('/api/import/import-excel', { method: 'POST', body: formData });
    },
    smartImport: (clients: unknown[]) =>
      http<{ clients_created: number; clients_updated: number; subscriptions_created: number; total_clients: number; review: unknown[]; errors: unknown[] }>(
        '/api/import/smart-import', { method: 'POST', body: JSON.stringify(clients.length ? { clients } : { clients: [] }) }
      ),
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

    /** Get role permissions matrix */
    getPermissions: () =>
      http<{ permissions: Record<string, boolean>; role: string }>('/api/settings/permissions'),

    /** Update role permissions (admin only) */
    updatePermissions: (data: Record<string, boolean>) =>
      http<{ message: string }>('/api/settings/permissions', {
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

  // ── Exercise Library ─────────────────────────────────────────────
  exercises: {
    list: (qs?: string) =>
      http<unknown[]>(`/api/workouts/exercises${qs ? `?${qs}` : ''}`),
    meta: () =>
      http<{ body_parts: string[]; equipment_types: string[]; exercise_types: string[]; difficulties: string[]; total: number }>(
        '/api/workouts/exercises/meta'
      ),
    count: (qs?: string) =>
      http<{ total: number }>(`/api/workouts/exercises/meta${qs ? `?${qs}` : ''}`),
    create: (data: Record<string, unknown>) =>
      http<{ message: string; exercise: unknown }>('/api/workouts/exercises', {
        method: 'POST', body: JSON.stringify(data),
      }),
    update: (id: string, data: Record<string, unknown>) =>
      http<{ message: string; exercise: unknown }>(`/api/workouts/exercises/${id}`, {
        method: 'PUT', body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      http<{ message: string }>(`/api/workouts/exercises/${id}`, { method: 'DELETE' }),
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
  },

  // ── PT OS ────────────────────────────────────────────────────
  pt: {
    dashboard: () =>
      http<{ data: unknown }>('/api/pt-os/dashboard'),
    clients: (params?: { trainer_id?: string }) =>
      http<{ data: unknown[]; total: number }>(`/api/pt-os/clients${buildQs(params)}`),
    client: (id: string) =>
      http<{ data: unknown }>(`/api/pt-os/clients/${id}`),
    create: (data: Record<string, unknown>) =>
      http<{ data: unknown }>('/api/pt-os/clients', { method: 'POST', body: JSON.stringify(data) }),
    uploadPhoto: (id: string, photo: string) =>
      http<{ data: unknown }>(`/api/pt-os/clients/${id}/photo`, { method: 'POST', body: JSON.stringify({ photo }) }),
    trainers: (params?: Record<string, string>) =>
      http<{ data: unknown[] }>(`/api/pt-os/trainers${buildQs(params)}`),
    sessions: (params?: { trainer_id?: string; date?: string }) =>
      http<{ data: unknown[] }>(`/api/pt-os/sessions${buildQs(params)}`),
    createSession: (data: Record<string, unknown>) =>
      http<{ data: unknown }>('/api/pt-os/sessions', { method: 'POST', body: JSON.stringify(data) }),
    payments: (params?: { client_id?: string; trainer_id?: string }) =>
      http<{ data: unknown[] }>(`/api/pt-os/payments${buildQs(params)}`),
    createPayment: (data: Record<string, unknown>) =>
      http<{ data: unknown }>('/api/pt-os/payments', { method: 'POST', body: JSON.stringify(data) }),
    balanceSheet: (params?: { trainer_id?: string }) =>
      http<{ data: unknown[]; total: number; total_outstanding: number }>(
        `/api/pt-os/balance-sheet${buildQs(params)}`,
      ),
    commissions: (params?: { trainer_id?: string }) =>
      http<{ data: unknown[] }>(`/api/pt-os/commissions${buildQs(params)}`),
    calculateCommissions: (month?: string) =>
      http<{ data: { count: number; total: number } }>('/api/pt-os/commissions/calculate', {
        method: 'POST', body: JSON.stringify({ month }),
      }),
    payouts: (params?: { month?: string }) =>
      http<{ data: unknown[]; month: string }>(`/api/pt-os/payouts${buildQs(params)}`),
    revenue: () =>
      http<{ data: unknown[] }>('/api/pt-os/revenue'),
    trainerPerformance: () =>
      http<{ data: unknown[] }>('/api/pt-os/trainer-performance'),
    updateCommission: (trainerId: string, data: Record<string, unknown>) =>
      http<{ data: unknown }>(`/api/pt-os/commissions/${trainerId}`, {
        method: 'PUT', body: JSON.stringify(data),
      }),
    updatePayout: (trainerId: string, data: Record<string, unknown>) =>
      http<{ data: unknown }>(`/api/pt-os/payouts/${trainerId}`, {
        method: 'PUT', body: JSON.stringify(data),
      }),
    markAllPayoutsPaid: (month: string) =>
      http<{ data: unknown }>('/api/pt-os/payouts/mark-all-paid', {
        method: 'POST', body: JSON.stringify({ month }),
      }),
    updateClient: (id: string, data: Record<string, unknown>) =>
      http<{ data: unknown }>(`/api/pt-os/clients/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteClient: (id: string) =>
      http<{ message: string }>(`/api/pt-os/clients/${id}`, { method: 'DELETE' }),
    subscriptions: (id: string) =>
      http<{ data: unknown[]; total: number }>(`/api/pt-os/clients/${id}/subscriptions`),
    duplicates: () =>
      http<{ data: DuplicateGroup[]; total_groups: number; total_records: number; total_duplicates: number; total_financial_value: number }>('/api/pt-os/clients/duplicates'),
    mergeDuplicates: () =>
      http<{ success: boolean; run_id: string; merged_groups: number; records_removed: number; results: MergeResult[] }>('/api/pt-os/clients/merge-duplicates', { method: 'POST' }),
    plans: {
      list: () => http<{ data: unknown[] }>('/api/pt-os/plans'),
      create: (data: Record<string, unknown>) =>
        http<{ data: unknown }>('/api/pt-os/plans', { method: 'POST', body: JSON.stringify(data) }),
      update: (id: string, data: Record<string, unknown>) =>
        http<{ data: unknown }>(`/api/pt-os/plans/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      delete: (id: string) =>
        http<{ message: string }>(`/api/pt-os/plans/${id}`, { method: 'DELETE' }),
    },
  },

  memberWebauthn: {
    registerBegin: (memberId: string) =>
      http<{ challenge: string; rp: { name: string; id: string }; user: { id: string; name: string; displayName: string }; pubKeyCredParams: { type: 'public-key'; alg: number }[] }>(
        `/api/webauthn/register/begin?member_id=${memberId}`,
      ),
    registerComplete: (data: { memberId: string; deviceName: string; credentialId: string; rawId: string; transports?: string[]; deviceType?: string; attestationObject: string; clientDataJSON: string }) =>
      http<{ success: boolean; credential: { id: string } }>('/api/webauthn/register/complete', {
        method: 'POST', body: JSON.stringify(data),
      }),
    authenticateBegin: (memberId?: string) =>
      http<{ challenge: string; allowCredentials?: { id: string; type: 'public-key' }[]; rpId: string }>(
        `/api/webauthn/authenticate/begin${memberId ? `?member_id=${memberId}` : ''}`,
      ),
    authenticateComplete: (data: { credentialId: string; rawId: string; authenticatorData: string; signature: string; clientDataJSON: string; userHandle?: string }) =>
      http<{ success: boolean; memberId?: string; memberName?: string }>('/api/webauthn/authenticate/complete', {
        method: 'POST', body: JSON.stringify(data),
      }),
    listCredentials: (memberId: string) =>
      http<{ credentials: { id: string; deviceName: string; createdAt: string; lastUsedAt: string | null }[] }>(
        `/api/webauthn/credentials?member_id=${memberId}`,
      ),
    removeCredential: (credentialId: string) =>
      http<{ success: boolean }>(`/api/webauthn/credentials/${credentialId}`, { method: 'DELETE' }),
    memberSearch: (q: string) =>
      http<{ members: { id: string; name: string; email: string; source: 'member' | 'pt_client' }[] }>(
        `/api/webauthn/member-search?q=${encodeURIComponent(q)}`,
      ),
  },

  biometricAttend: {
    mark: (data: { memberId: string; memberName?: string; verificationMethod: string; deviceName: string; latitude: number; longitude: number }) =>
      http<{ success: boolean; attendanceId?: string; error?: string }>('/api/biometric-attend/mark', {
        method: 'POST', body: JSON.stringify(data),
      }),
    checkout: (memberId: string) =>
      http<{ success: boolean; sessionDurationMinutes: number }>('/api/biometric-attend/checkout', {
        method: 'POST', body: JSON.stringify({ memberId }),
      }),
    today: () =>
      http<{ present: number; absent: number; late: number; active: number; feed: { id: string; memberName: string; checkInTime: string; verificationMethod: string; deviceName: string }[] }>(
        '/api/biometric-attend/today',
      ),
    history: (params?: Record<string, string>) =>
      http<{ records: unknown[]; total: number }>(`/api/biometric-attend/history${buildQs(params)}`),
    memberHistory: (memberId: string, params?: Record<string, string>) =>
      http<{ records: unknown[] }>(`/api/biometric-attend/member/${memberId}${buildQs(params)}`),
    report: (params?: Record<string, string>) =>
      http<{ url: string }>(`/api/biometric-attend/report${buildQs(params)}`),
  },

  // ── Campaigns (Marketing) ──────────────────────────────────────
  campaigns: {
    list: (params?: Record<string, string | number>) =>
      http<unknown[]>(`/api/campaigns${buildQs(params)}`),
    create: (data: Record<string, unknown>) =>
      http<{ message: string; campaign: unknown }>('/api/campaigns', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      http<{ message: string; campaign: unknown }>(`/api/campaigns/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => http<{ message: string }>(`/api/campaigns/${id}`, { method: 'DELETE' }),
    stats: () => http<{ active: number; total_sent: number; conversions: number; conv_rate: number }>('/api/campaigns/stats'),
  },

  // ── Feedback ───────────────────────────────────────────────────
  feedback: {
    list: (params?: Record<string, string | number>) =>
      http<unknown[]>(`/api/feedback${buildQs(params)}`),
    get: (id: string) => http<unknown>(`/api/feedback/${id}`),
    reply: (id: string, data: { reply: string }) =>
      http<{ message: string }>(`/api/feedback/${id}/reply`, { method: 'POST', body: JSON.stringify(data) }),
    resolve: (id: string) =>
      http<{ message: string }>(`/api/feedback/${id}/resolve`, { method: 'POST' }),
    stats: () =>
      http<{ avg_rating: number; total: number; positive: number; open: number; nps: number }>('/api/feedback/stats'),
  },

  // ── Offers & Promotions ────────────────────────────────────────
  offers: {
    list: (params?: Record<string, string | number>) =>
      http<unknown[]>(`/api/offers${buildQs(params)}`),
    create: (data: Record<string, unknown>) =>
      http<{ message: string; offer: unknown }>('/api/offers', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      http<{ message: string; offer: unknown }>(`/api/offers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => http<{ message: string }>(`/api/offers/${id}`, { method: 'DELETE' }),
    stats: () => http<{ total: number; active: number; total_used: number; expired: number }>('/api/offers/stats'),
  },

  // ── Communication (send notification) ───────────────────────────
  communication: {
    send: (data: { title: string; body: string; type: string; audience: string }) =>
      http<{ message: string; notification: unknown; recipients: number }>('/api/communication/send', {
        method: 'POST', body: JSON.stringify(data),
      }),
    history: (params?: Record<string, string | number>) =>
      http<unknown[]>(`/api/communication/history${buildQs(params)}`),
    delete: (id: string) =>
      http<{ message: string }>(`/api/communication/history/${id}`, { method: 'DELETE' }),
  },

  // ── Integrations ───────────────────────────────────────────────
  integrations: {
    list: () => http<unknown[]>('/api/integrations'),
    test: (id: string, data: { api_key: string }) =>
      http<{ success: boolean; message: string }>(`/api/integrations/${id}/test`, { method: 'POST', body: JSON.stringify(data) }),
    connect: (id: string, data: { api_key: string }) =>
      http<{ success: boolean; message: string }>(`/api/integrations/${id}/connect`, { method: 'POST', body: JSON.stringify(data) }),
    disconnect: (id: string) =>
      http<{ success: boolean; message: string }>(`/api/integrations/${id}/disconnect`, { method: 'POST' }),
  },

  // ── Google Calendar ─────────────────────────────────────────────
  calendar: {
    status: () =>
      http<{ connected: boolean; connectedAt?: string; lastSyncAt?: string; calendarId?: string }>('/api/calendar/status'),
    authUrl: () =>
      http<{ url: string }>('/api/calendar/auth-url'),
    disconnect: () =>
      http<{ message: string }>('/api/calendar/disconnect', { method: 'DELETE' }),
  },

  // ── Activity Logs (Profile) ─────────────────────────────────────
  activity: {
    list: (params?: Record<string, string | number>) =>
      http<unknown[]>(`/api/profile/activity${buildQs(params)}`),
    sessions: () => http<unknown[]>('/api/profile/sessions'),
    devices: () => http<unknown[]>('/api/profile/devices'),
  },

  // ── Branches ───────────────────────────────────────────────────
  branches: {
    list: () => http<{ id: string; name: string; location: string; status: string; member_count: number }[]>('/api/settings/branches'),
    create: (data: { name: string; location?: string }) =>
      http<{ id: string; name: string; location: string }>('/api/settings/branches', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: { name?: string; location?: string; status?: string }) =>
      http<{ message: string }>(`/api/settings/branches/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => http<{ message: string }>(`/api/settings/branches/${id}`, { method: 'DELETE' }),
  },

  // ── User/Account Management (Settings) ──────────────────────────
  accounts: {
    list: () => http<unknown[]>('/api/auth/users'),
    create: (data: { name: string; email: string; password: string; role: string }) =>
      http<{ message: string; user: unknown }>('/api/auth/create-user', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: { name?: string; email?: string; role?: string; status?: string }) =>
      http<{ message: string }>(`/api/auth/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => http<{ message: string }>(`/api/auth/users/${id}`, { method: 'DELETE' }),
    toggleStatus: (id: string) =>
      http<{ message: string; is_active: boolean }>(`/api/auth/users/${id}/toggle`, { method: 'PUT' }),
  },

  gymSettings: {
    get: () =>
      http<{ geofence_lat: number; geofence_lng: number; geofence_radius: number; enable_face_id: boolean; enable_touch_id: boolean; enable_gps: boolean; duplicate_window_minutes: number; auto_checkout: boolean; auto_checkout_minutes: number }>(
        '/api/settings/gym',
      ),
    update: (data: Record<string, unknown>) =>
      http<{ success: boolean }>('/api/settings/gym', { method: 'PUT', body: JSON.stringify(data) }),
  },

  // ── QR Check-in ─────────────────────────────────────────────────
  qr: {
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
  },

  // ── AI (OpenRouter multi-model) ─────────────────────────────────────────
  ai: {
    /** SSE streaming chat — use fetchEventSource or manual ReadableStream */
    chatUrl: () => `/api/ai/chat`,

    conversations: (params?: { limit?: number; offset?: number }) =>
      http<{ data: AiConversation[] }>(`/api/ai/conversations${buildQs(params)}`),

    conversation: (id: string) =>
      http<{ data: AiConversation & { messages: AiMessage[] } }>(`/api/ai/conversations/${id}`),

    deleteConversation: (id: string) =>
      http<{ message: string }>(`/api/ai/conversations/${id}`, { method: 'DELETE' }),

    usage: () =>
      http<{ data: AiUsageStats }>('/api/ai/usage'),

    modelStats: () =>
      http<{ data: AiModelStat[] }>('/api/ai/model-stats'),

    health: () =>
      http<AiHealthResponse>('/api/ai/health'),

    providerSettings: () =>
      http<{ data: AiProviderSettings }>('/api/ai/provider-settings'),

    test: (body?: { intent?: string; prompt?: string }) =>
      http<{ success: boolean; message: string; model: string; tier: string; latency_ms: number }>('/api/ai/test', {
        method: 'POST',
        body: JSON.stringify(body || {}),
      }),

    generateWorkout: (params: AiWorkoutParams) =>
      httpSSE<{ data: AiWorkoutPlan; model: string; tier: string; used_fallback: boolean }>('/api/ai/workout/generate', {
        method: 'POST',
        body: JSON.stringify(params),
      }),

    generateDiet: (params: AiDietParams) =>
      httpSSE<{ data: AiDietPlan; model: string; tier: string; used_fallback: boolean }>('/api/ai/diet/generate', {
        method: 'POST',
        body: JSON.stringify(params),
      }),

    analyzeProgress: (client_id: string) =>
      httpSSE<{ data: AiProgressAnalysis; model: string; tier: string; used_fallback: boolean }>('/api/ai/progress/analyze', {
        method: 'POST',
        body: JSON.stringify({ client_id }),
      }),

    businessInsights: (params?: { from?: string; to?: string }) =>
      httpSSE<{ data: AiBusinessInsights; model: string; tier: string; used_fallback: boolean }>('/api/ai/business/insights', {
        method: 'POST',
        body: JSON.stringify(params || {}),
      }),
  },

  agent: {
    /** Returns the SSE endpoint URL for the execute call */
    executeUrl: () => `/api/agent/execute`,

    confirm: (taskId: string, confirmationToken: string, approved: boolean) =>
      http<{ status: string; message?: string }>('/api/agent/confirm', {
        method: 'POST',
        body: JSON.stringify({ task_id: taskId, confirmation_token: confirmationToken, approved }),
      }),

    tasks: (params?: { limit?: number; offset?: number }) =>
      http<{ tasks: AgentTask[]; count: number }>(`/api/agent/tasks${buildQs(params)}`),

    task: (id: string) =>
      http<{ task: AgentTask; audit_trail: AgentAuditEntry[] }>(`/api/agent/tasks/${id}`),
  },

};

// ── AI types ────────────────────────────────────────────────────────────────

export type AiConversation = {
  id: string;
  title: string | null;
  client_id: string | null;
  last_message?: string | null;
  message_count?: number;
  created_at: string;
  updated_at: string;
};

export type AiMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  provider?: string;
  created_at: string;
};

export type AiUsageStats = {
  requests_this_hour: string;
  requests_today: string;
  tokens_today: string;
  requests_30d: string;
  tokens_30d: string;
  fallback_count_30d: string;
};

export type AiModelStat = {
  model: string;
  provider: string;
  intent_type: string;
  requests: string;
  tokens_total: string;
  requests_today: string;
  avg_latency_ms: number;
  fallback_count: string;
};

export type AiHealthResponse = {
  configured: boolean;
  overall?: string;
  models: {
    primary:   { model: string; status: string; latency_ms?: number; error?: string };
    secondary: { model: string; status: string; latency_ms?: number; error?: string };
    fallback:  { model: string; status: string; latency_ms?: number; error?: string };
  };
};

export type AiProviderSettings = {
  provider: string;
  configured: boolean;
  base_url: string;
  models: { primary: string; secondary: string; fallback: string };
};

export type AiWorkoutParams = {
  age: number;
  gender: string;
  weight_kg: number;
  height_cm: number;
  goal: string;
  experience_level: string;
  injuries?: string;
  equipment?: string;
  training_days?: number;
  duration_weeks?: number;
  client_id?: string;
};

export type AiWorkoutExercise = {
  name: string;
  sets: number;
  reps: string;
  tempo: string;
  rest_seconds: number;
  notes?: string;
};

export type AiWorkoutDay = {
  name: string;
  focus: string;
  exercises: AiWorkoutExercise[];
};

export type AiWorkoutPlan = {
  name: string;
  description: string;
  goal: string;
  level: string;
  weeks: number;
  days_per_week: number;
  equipment: string[];
  warm_up: string;
  cool_down: string;
  progression_notes: string;
  weekly_schedule: Record<string, AiWorkoutDay>;
  nutrition_notes: string;
};

export type AiDietParams = {
  age: number;
  gender: string;
  weight_kg: number;
  height_cm: number;
  activity_level: string;
  goal: string;
  dietary_preferences?: string;
  allergies?: string;
  budget?: string;
  meal_frequency?: number;
  client_id?: string;
};

export type AiDietFood = {
  name: string;
  quantity: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export type AiDietMeal = {
  name: string;
  time: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  foods: AiDietFood[];
};

export type AiDietPlan = {
  name: string;
  description: string;
  goal: string;
  total_calories: number;
  macros: { protein_g: number; carbs_g: number; fat_g: number };
  meal_frequency: number;
  meals: AiDietMeal[];
  grocery_list: { category: string; items: string[] }[];
  supplements: { name: string; dose: string; timing: string; reason: string }[];
  hydration_ml: number;
  notes: string;
};

export type AiProgressRisk = {
  risk: string;
  severity: 'low' | 'medium' | 'high';
  action: string;
};

export type AiProgressRec = {
  priority: number;
  action: string;
  rationale: string;
};

export type AiProgressAnalysis = {
  summary: string;
  period_analysed: string;
  wins: string[];
  weight_trend: { direction: string; change_kg: number; insight: string };
  strength_trend: { direction: string; insight: string; highlight: string };
  attendance_trend: { rate_pct: number; insight: string };
  risks: AiProgressRisk[];
  recommendations: AiProgressRec[];
  next_month_strategy: string;
  motivation_message: string;
};

export type AiBusinessInsights = {
  summary: string;
  period: string;
  kpis: { mrr: number; retention_rate_pct: number; avg_session_utilisation_pct: number; revenue_per_trainer: number };
  trends: { metric: string; direction: string; change_pct: number; insight: string }[];
  opportunities: { opportunity: string; estimated_impact: string; effort: string }[];
  risks: { risk: string; severity: string; recommended_action: string }[];
  recommendations: { priority: number; action: string; rationale: string; timeframe: string }[];
  executive_summary: string;
};

// ── Agent types ──────────────────────────────────────────────────────────────
export type { AgentTask, AgentPlan, AgentStep, AgentAction, AgentResult, AgentDeptResult, AgentAuditEntry, AgentSSEEvent } from '../types/agent';
