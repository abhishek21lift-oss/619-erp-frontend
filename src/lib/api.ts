// src/lib/api.ts

const BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://619-erp-api.onrender.com';

// ================= TYPES =================

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

  // Name split
  first_name?: string;
  last_name?: string;

  // Contact
  country_code?: string;
  mobile?: string;
  is_mobile_redacted?: boolean;
  alt_country_code?: string;
  alt_mobile?: string;
  email?: string;
  emergency_no?: string;

  // Personal
  gender?: string;
  dob?: string;
  anniversary?: string;
  weight?: number;

  // KYC / Identity
  reference_no?: string;
  aadhaar_no?: string;
  pan_no?: string;
  gst_no?: string;
  company_name?: string;

  // Structured address
  address?: string;   // flat / building
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;

  // Membership IDs
  client_id?: string;
  member_code?: string;
  trainer_id?: string;
  trainer_name?: string;
  package_type?: string;

  // Status
  status?: string;
  balance_amount?: number;
  frozen_from?: string;
  frozen_until?: string;

  // Dates
  pt_start_date?: string;
  pt_end_date?: string;
  joining_date?: string;

  // Financials
  base_amount?: number;
  discount?: number;
  final_amount?: number;
  paid_amount?: number;
  payment_method?: string;
  payment_date?: string;

  // Extra info
  interested_in?: string;
  notes?: string;
  photo_url?: string;
  biometric_added?: boolean;
  app_installed?: boolean;
};

export type Trainer = {
  id: string;
  name: string;
  mobile?: string;
  email?: string;
  role?: string;
  salary?: number;
  incentive_rate?: number;
  status?: string;
};

export type Payment = {
  id: string;
  amount: number;
  date: string;

  // ✅ FIXED (your error)
  receipt_no?: string;
  client_name?: string;
  method?: string;

  trainer_id?: string;
  notes?: string;
};

export type Attendance = {
  id?: string;
  ref_id: string;
  status: string;
  check_in?: string;
};

export type DashSummary = any;

// ================= HELPERS =================

function token() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('619_token');
}

// Global handler for stale / invalid tokens.
// On any 401 we clear localStorage and bounce to /login so the user doesn't
// stay stuck on a screen that keeps throwing "Invalid token".
function handleAuthFailure() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('619_token');
    localStorage.removeItem('619_user');
  } catch {}
  // Avoid an infinite redirect loop if we're already on /login
  if (window.location.pathname !== '/login') {
    window.location.replace('/login');
  }
}

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const t = token();

  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
      ...(opts.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({ error: 'Bad response' }));

  if (res.status === 401) {
    // Don't auto-redirect on /login (the form must show the error) or on /me
    // (auth-context handles failure quietly during initial token validation).
    const skipRedirect =
      path.endsWith('/api/auth/login') || path.endsWith('/api/auth/me');
    if (!skipRedirect) handleAuthFailure();
    throw new Error(data.error || 'Session expired, please log in again');
  }

  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

  return data as T;
}

const qs = (p?: object) =>
  p
    ? '?' +
      new URLSearchParams(
        Object.fromEntries(
          Object.entries(p).filter(([, v]) => v != null && v !== '')
        )
      ).toString()
    : '';

// ================= API =================

export const api = {
  // 🔐 AUTH
  auth: {
    login: (email: string, password: string) =>
      req<{ token: string; user: User }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),

    me: () => req<{ user: User }>('/api/auth/me'),

    // admin features
    listUsers: () => req<User[]>('/api/auth/users'),

    createUser: (data: any) =>
      req('/api/auth/create-user', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    toggleUser: (id: string) =>
      req(`/api/auth/users/${id}/toggle`, { method: 'PUT' }),

    deleteUser: (id: string) =>
      req(`/api/auth/users/${id}`, { method: 'DELETE' }),

    changePassword: (currentPassword: string, newPassword: string) =>
      req('/api/auth/change-password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword }),
      }),
  },

  // 📊 DASHBOARD
  dashboard: {
    summary: () => req<DashSummary>('/api/dashboard/summary'),
  },

  // 👥 CLIENTS
  clients: {
    list: (p?: any) => req<Client[]>(`/api/clients${qs(p)}`),

    get: (id: string) => req<Client>(`/api/clients/${id}`),

    create: (data: any) =>
      req<{ message: string; client: Client }>('/api/clients', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id: string, data: any) =>
      req<{ message: string; client: Client }>(`/api/clients/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    renew: (id: string, data: any) =>
      req<{ message: string; client: Client }>(`/api/clients/${id}/renew`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      req<{ message: string }>(`/api/clients/${id}`, {
        method: 'DELETE',
      }),
  },

  // 🏋️ TRAINERS
  trainers: {
    list: () => req<Trainer[]>('/api/trainers'),

    get: (id: string) => req<Trainer>(`/api/trainers/${id}`),

    create: (data: any) =>
      req<{ message: string; trainer: Trainer }>('/api/trainers', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id: string, data: any) =>
      req<{ message: string; trainer: Trainer }>(`/api/trainers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      req<{ message: string }>(`/api/trainers/${id}`, {
        method: 'DELETE',
      }),
  },

  // 💳 PAYMENTS
  payments: {
    list: (p?: any) => req<Payment[]>(`/api/payments${qs(p)}`),

    create: (data: any) =>
      req<{ message: string; payment: Payment }>('/api/payments', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      req<{ message: string }>(`/api/payments/${id}`, {
        method: 'DELETE',
      }),
  },

  // 📅 ATTENDANCE
  attendance: {
    list: (p?: any) => req<Attendance[]>(`/api/attendance${qs(p)}`),

    mark: (data: any) =>
      req('/api/attendance', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // 📈 REPORTS
  reports: {
    monthly: (year?: number) =>
      req<any[]>(`/api/reports/monthly${year ? `?year=${year}` : ''}`),

    trainerSummary: () =>
      req<any[]>('/api/reports/trainer-summary'),

    dues: () =>
      req<any[]>('/api/reports/dues'),
  },
};