'use client';

import type { ModuleConfig, ModuleRecord } from '@/lib/module-config';

const DEFAULT_API_BASE = 'http://localhost:5000';

type ListResponse = {
  records: ModuleRecord[];
  source: 'api';
};

function apiBase() {
  // In production (Vercel), use same-origin proxy via next.config.js rewrites.
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return '';
  }
  const raw = (process.env.NEXT_PUBLIC_API_URL ?? '').trim().replace(/\/+$/, '');
  return raw || DEFAULT_API_BASE;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    let message = `API ${res.status}`;
    try {
      const body = await res.json();
      message = body?.message || body?.error || message;
    } catch { /* ignore */ }
    const err = new Error(message) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return res.json() as Promise<T>;
}

export const moduleService = {
  async list(config: ModuleConfig): Promise<ListResponse> {
    const records = await request<ModuleRecord[]>(`/api/modules/${config.key}`);
    return { records, source: 'api' };
  },

  async create(config: ModuleConfig, payload: Omit<ModuleRecord, 'id' | 'createdAt'>): Promise<ModuleRecord> {
    return request<ModuleRecord>(`/api/modules/${config.key}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async update(config: ModuleConfig, id: string, patch: Partial<ModuleRecord>): Promise<ModuleRecord> {
    return request<ModuleRecord>(`/api/modules/${config.key}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(patch),
    });
  },

  async remove(config: ModuleConfig, id: string): Promise<void> {
    await request<{ message: string }>(`/api/modules/${config.key}/${id}`, { method: 'DELETE' });
  },
};
