'use client';

import { http } from '@/lib/http';
import type { ModuleConfig, ModuleRecord } from '@/lib/module-config';

type ListResponse = {
  records: ModuleRecord[];
  source: 'api';
};

export const moduleService = {
  async list(config: ModuleConfig): Promise<ListResponse> {
    const records = await http<ModuleRecord[]>(`/api/modules/${config.key}`);
    return { records, source: 'api' };
  },

  async create(config: ModuleConfig, payload: Omit<ModuleRecord, 'id' | 'createdAt'>): Promise<ModuleRecord> {
    return http<ModuleRecord>(`/api/modules/${config.key}`, {
      method: 'POST',
      body: payload,
    });
  },

  async update(config: ModuleConfig, id: string, patch: Partial<ModuleRecord>): Promise<ModuleRecord> {
    return http<ModuleRecord>(`/api/modules/${config.key}/${id}`, {
      method: 'PUT',
      body: patch,
    });
  },

  async remove(config: ModuleConfig, id: string): Promise<void> {
    await http<{ message: string }>(`/api/modules/${config.key}/${id}`, { method: 'DELETE' });
  },
};
