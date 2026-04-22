// src/lib/api.ts
const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

function token() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('619_token');
}

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const t = token();
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
      ...(opts.headers as object || {}),
    },
  });
  const data = await res.json().catch(() => ({ error: 'Bad response' }));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data as T;
}

const qs = (p?: object) => p ? '?' + new URLSearchParams(
  Object.fromEntries(Object.entries(p).filter(([,v]) => v != null && v !== ''))
).toString() : '';

export const api = {
  auth: {
    login:          (email: string, password: string) =>
      req<{token: string; user: User}>('/api/auth/login', { method:'POST', body:JSON.stringify({email,password}) }),
    me:             () => req<{user: User}>('/api/auth/me'),
    createUser:     (d: any) => req('/api/auth/create-user', { method:'POST', body:JSON.stringify(d) }),
    listUsers:      () => req<User[]>('/api/auth/users'),
    toggleUser:     (id: string) => req(`/api/auth/users/${id}/toggle`, { method:'PUT' }),
    deleteUser:     (id: string) => req(`/api/auth/users/${id}`, { method:'DELETE' }),
    changePassword: (cur: string, nw: string) =>
      req('/api/auth/change-password', { method:'PUT', body:JSON.stringify({currentPassword:cur, newPassword:nw}) }),
  },
  dashboard: {
    summary: () => req<DashSummary>('/api/dashboard/summary'),
  },
  clients: {
    list:   (p?: any)       => req<Client[]>(`/api/clients${qs(p)}`),
    get:    (id: string)    => req<Client>(`/api/clients/${id}`),
    create: (d: any)        => req<{client: Client}>('/api/clients', { method:'POST', body:JSON.stringify(d) }),
    update: (id: string, d: any) => req<{client: Client}>(`/api/clients/${id}`, { method:'PUT', body:JSON.stringify(d) }),
    delete: (id: string)    => req(`/api/clients/${id}`, { method:'DELETE' }),
  },
  trainers: {
    list:   ()              => req<Trainer[]>('/api/trainers'),
    get:    (id: string)    => req<Trainer>(`/api/trainers/${id}`),
    create: (d: any)        => req<{trainer: Trainer}>('/api/trainers', { method:'POST', body:JSON.stringify(d) }),
    update: (id: string, d: any) => req<{trainer: Trainer}>(`/api/trainers/${id}`, { method:'PUT', body:JSON.stringify(d) }),
    delete: (id: string)    => req(`/api/trainers/${id}`, { method:'DELETE' }),
  },
  payments: {
    list:   (p?: any)       => req<Payment[]>(`/api/payments${qs(p)}`),
    create: (d: any)        => req<{payment: Payment}>('/api/payments', { method:'POST', body:JSON.stringify(d) }),
    delete: (id: string)    => req(`/api/payments/${id}`, { method:'DELETE' }),
  },
  attendance: {
    list:    (p?: any)      => req<Attendance[]>(`/api/attendance${qs(p)}`),
    mark:    (d: any)       => req('/api/attendance', { method:'POST', body:JSON.stringify(d) }),
    summary: ()             => req<any>('/api/attendance/today-summary'),
  },
  reports: {
    monthly:       (year?: number) => req<any[]>(`/api/reports/monthly${qs({year})}`),
    trainerSummary:()              => req<any[]>('/api/reports/trainer-summary'),
    dues:          ()              => req<any[]>('/api/reports/dues'),
  },
};

// ── Types ──────────────────────────────────────────────────────────
export interface User {
  id: string; name: string; email: string;
  role: 'admin'|'trainer'; trainer_id?: string;
  is_active?: boolean; last_login?: string; created_at?: string;
}
export interface Client {
  id: string; client_id: string; name: string;
  mobile?: string; email?: string; gender?: string; dob?: string;
  trainer_id?: string; trainer_name?: string;
  pt_start_date?: string; pt_end_date?: string; package_type?: string;
  base_amount: number; discount: number; final_amount: number;
  paid_amount: number; balance_amount: number;address?: string;
  payment_method?: string; payment_date?: string;
  status: 'active'|'expired'|'frozen'; weight?: number; notes?: string;
  created_at: string;
  payments?: Payment[]; weight_logs?: any[];
}
export interface Trainer {
  id: string; name: string; mobile?: string; email?: string;
  role?: string; joining_date?: string; salary?: number;
  incentive_rate?: number; specialization?: string;
  status: 'active'|'inactive';
  active_clients?: number; total_clients?: number;
  month_revenue?: number; all_time_revenue?: number; month_incentive?: number;
}
export interface Payment {
  id: string; client_id: string; client_name?: string;
  trainer_id?: string; trainer_name?: string;
  amount: number; method: string; date: string;
  receipt_no?: string; package_type?: string; notes?: string; created_at: string;
}
export interface Attendance {
  id: string; type: string; ref_id: string; ref_name?: string;
  trainer_id?: string; date: string; status: string;
  check_in?: string; check_out?: string; notes?: string;
}
export interface DashSummary {
  clients:          { active: string; expired: string; total: string };
  revenue:          { month: string; year: string; total: string };
  expiring_soon:    number;
  total_dues:       number;
  recent_payments:  Payment[];
  monthly_chart:    { month: string; revenue: number; count: number }[];
  top_trainers:     { id: string; name: string; active_clients: number; month_revenue: number }[];
  attendance_today: number;
}
