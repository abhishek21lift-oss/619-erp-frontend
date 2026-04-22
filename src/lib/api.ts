// src/lib/api.ts
const BASE = process.env.NEXT_PUBLIC_API_URL || 'https://six19-erp-api.onrender.com';

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
      ...(opts.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({ error: 'Bad response' }));

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

export const api = {
  auth: {
    login: (email: string, password: string) =>
      req<{ token: string; user: User }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    me: () => req<{ user: User }>('/api/auth/me'),
    createUser: (d: any) =>
      req('/api/auth/create-user', {
        method: 'POST',
        body: JSON.stringify(d),
      }),
    listUsers: () => req<User[]>('/api/auth/users'),
    toggleUser: (id: string) =>
      req(`/api/auth/users/${id}/toggle`, { method: 'PUT' }),
    deleteUser: (id: string) =>
      req(`/api/auth/users/${id}`, { method: 'DELETE' }),
    changePassword: (cur: string, nw: string) =>
      req('/api/auth/change-password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: cur,
          newPassword: nw,
        }),
      }),
  },

  dashboard: {
    summary: () => req<DashSummary>('/api/dashboard/summary'),
  },

  clients: {
    list: (p?: any) => req<Client[]>(`/api/clients${qs(p)}`),
    get: (id: string) => req<Client>(`/api/clients/${id}`),
    create: (d: any) =>
      req<{ client: Client }>('/api/clients', {
        method: 'POST',
        body: JSON.stringify(d),
      }),
    update: (id: string, d: any) =>
      req<{ client: Client }>(`/api/clients/${id}`, {
        method: 'PUT',
        body: JSON.stringify(d),
      }),
    delete: (id: string) => req(`/api/clients/${id}`, { method: 'DELETE' }),
  },

  trainers: {
    list: () => req<Trainer[]>('/api/trainers'),
    get: (id: string) => req<Trainer>(`/api/trainers/${id}`),
    create: (d: any) =>
      req<{ trainer: Trainer }>('/api/trainers', {
        method: 'POST',
        body: JSON.stringify(d),
      }),
    update: (id: string, d: any) =>
      req<{ trainer: Trainer }>(`/api/trainers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(d),
      }),
    delete: (id: string) => req(`/api/trainers/${id}`, { method: 'DELETE' }),
  },

  payments: {
    list: (p?: any) => req<Payment[]>(`/api/payments${qs(p)}`),
    create: (d: any) =>
      req<{ payment: Payment }>('/api/payments', {
        method: 'POST',
        body: JSON.stringify(d),
      }),
    delete: (id: string) => req(`/api/payments/${id}`, { method: 'DELETE' }),
  },

  attendance: {
    list: (p?: any) => req<Attendance[]>(`/api/attendance${qs(p)}`),
    mark: (d: any) =>
      req('/api/attendance', {
        method: 'POST',
        body: JSON.stringify(d),
      }),
    summary: () => req<any>('/api/attendance/today-summary'),
  },

  reports: {
    monthly: (year?: number) =>
      req<any[]>(`/api/reports/monthly${qs({ year })}`),
    trainerSummary: () => req<any[]>('/api/reports/trainer-summary'),
    dues: () => req<any[]>('/api/reports/dues'),
  },
};