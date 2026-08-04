// API endpoints: clients, trainers, member, leave, attendance.
//
// Lifted verbatim from the single `api` object in the 4,185-line api.ts.
// Method names, URLs and request shapes are unchanged; index.ts composes these
// back into the same `api` object every consumer already imports.

import { http } from '../../http';
import { buildQs } from '../qs';
import type {
  Attendance, Client, LeaveRequest, LeaveRequestPayload, Trainer,
} from '../types';

export const clients = {
  list: (params?: Record<string, string | number>) =>
    http<Client[]>(`/api/clients${buildQs(params)}`),
  get:    (id: string) => http<Client>(`/api/clients/${id}`),
  // create() removed with POST /api/clients. Clients are created through
  // api.pt.create() -> POST /api/pt-os/clients, which stamps the studio's
  // organization_id and enforces the plan's client limit. The old route did
  // neither, and wrote to a table no read path reads.
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
};

export const trainers = {
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
};

export const member = {
  get: (id: string) =>
    http<{ data: unknown }>(`/api/v1/members/${id}`),
  metrics: (id: string) =>
    http<{ membership: unknown; stats: unknown }>(`/api/v1/members/${id}/metrics`),
};

export const leave = {
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
};

export const attendance = {
  list: (params?: Record<string, string>) =>
    http<Attendance[]>(`/api/attendance${buildQs(params)}`),
  mark: (data: Record<string, unknown>) =>
    http<Attendance>('/api/attendance', { method: 'POST', body: JSON.stringify(data) }),
  create: (data: Record<string, unknown>) =>
    http('/api/attendance', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, unknown>) =>
    http(`/api/attendance/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
};
