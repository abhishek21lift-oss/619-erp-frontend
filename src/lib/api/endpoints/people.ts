// API endpoints: clients, trainers, leave, attendance.
//
// Lifted verbatim from the single `api` object in the 4,185-line api.ts.
// Method names, URLs and request shapes are unchanged; index.ts composes these
// back into the same `api` object every consumer already imports.

import { http } from '../../http';
import { buildQs } from '../qs';
import type {
  Attendance, Client, LeaveRequest, LeaveRequestPayload, Trainer,
} from '../types';

/**
 * Clients.
 *
 * ── Every URL here now points at /api/pt-os/clients ─────────────────────────
 *
 * /api/clients is gone. It was a second HTTP surface over the same pt_clients
 * table — the legacy `clients` table it was named after was dropped by
 * migration 170 and nothing has read it since. Four of its endpoints
 * duplicated a pt-os handler outright; the other three (search, attendance,
 * payments) moved to /api/pt-os/clients, where the rest of the client API
 * already lived.
 *
 * The METHOD NAMES are deliberately unchanged, so the sixteen components
 * calling api.clients.* keep working untouched. This object is not a second
 * API — it is one helper over the one surviving surface, and `api.pt.*` in
 * ptOs.ts is the same surface reached by its pt-os names. Collapsing the two
 * helper objects is a rename with no behavioural content and is not worth
 * touching sixteen files for.
 *
 * ── Response shapes ─────────────────────────────────────────────────────────
 *
 * The pt-os endpoints wrap collections as `{ data, total }` where the old ones
 * returned a bare array. Unwrapped here rather than at the call sites, for the
 * same reason: the callers' contract does not change.
 */
export const clients = {
  list: (params?: Record<string, string | number>) =>
    http<{ data: Client[]; total: number }>(`/api/pt-os/clients${buildQs(params)}`)
      .then((r) => r.data),
  get: (id: string) =>
    http<{ data: Client }>(`/api/pt-os/clients/${id}`).then((r) => r.data),
  // create() removed with POST /api/clients. Clients are created through
  // api.pt.create() -> POST /api/pt-os/clients, which stamps the studio's
  // organization_id and enforces the plan's client limit. The old route did
  // neither, and wrote to a table no read path reads.
  //
  // PATCH, not PUT: the pt-os handler applies only the fields it is sent,
  // where the retired PUT rebuilt the whole row from a partial body and
  // blanked everything the form had not included.
  update: (id: string, data: Partial<Client>) =>
    http<{ data: Client }>(`/api/pt-os/clients/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
      .then((r) => r.data),
  delete: (id: string) => http(`/api/pt-os/clients/${id}`, { method: 'DELETE' }),
  search: (q: string) => http<Client[]>(`/api/pt-os/clients/search?q=${encodeURIComponent(q)}`),
  // uploadPhoto, assignPt, combo, upgrade, downgrade, transfer, trial, freeze
  // and unfreeze are gone with routes/client-actions.js on the backend.
  //
  // All nine posted to /api/clients/:id/*, which read and wrote the legacy
  // `clients` table — 0 rows since PT-OS enrolment shipped, and no
  // organization_id column, so nothing on that mount could be tenant-scoped.
  // No component ever called any of them; they were API surface with no caller
  // and no working route behind it.
  //
  // The org-scoped equivalents are api.pt.* → /api/pt-os/clients/*, which is
  // what the app already uses: renewPt and renewalHistory below both point
  // there, which is why they stay.
  renewPt: (id: string, data: Record<string, unknown>) =>
    http<{ message?: string; data?: unknown }>(`/api/pt-os/clients/${id}/renew`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  renewalHistory: (id: string) =>
    http<{ data: unknown[] }>(`/api/pt-os/clients/${id}/renewals`),
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
