// API endpoints: reports, search, activity, ai.
//
// Lifted verbatim from the single `api` object in the 4,185-line api.ts.
// Method names, URLs and request shapes are unchanged; index.ts composes these
// back into the same `api` object every consumer already imports.

import { http, httpSSE } from '../../http';
import { buildQs } from '../qs';
import type {
  ActivityFeed, AiBusinessInsights, AiConversation, AiDietParams, AiDietPlan,
  AiFitnessTestAnalysis, AiHealthResponse, AiKnowledgeDocument, AiMessage, AiModelStat,
  AiProgressAnalysis, AiProviderSettings, AiUsageStats, AiWorkoutParams, AiWorkoutPlan,
  DuesItem, ProfileDevice, ProfileSession, SearchResponse, TrainerSummaryRow,
} from '../types';

export const reports = {
  revenue: (params?: Record<string, string>) =>
    http(`/api/reports/revenue${buildQs(params)}`),
  // members() removed: /api/reports/members does not exist — reports.js serves
  // monthly, revenue, dues, trainers, trainer-summary and revenue-target — and
  // nothing called it.
  monthly: (year: number | string) =>
    http<unknown[]>(`/api/reports/monthly?year=${year}`),
  dues: () =>
    http<DuesItem[]>('/api/reports/dues'),
  trainerSummary: () =>
    http<TrainerSummaryRow[]>('/api/reports/trainer-summary'),
};

/**
 * Global search behind the top-bar box.
 *
 * The response is deliberately generic: the backend owns a registry of
 * searchable entity types and returns them as labelled groups of identically
 * shaped items. Adding workouts, invoices or files server-side makes them
 * appear here with no change to this client or to the UI that renders it.
 */
export const search = {
  global: (q: string, opts?: { limit?: number; types?: string[]; signal?: AbortSignal }) =>
    http<{ data: SearchResponse }>(
      `/api/search${buildQs({
        q,
        ...(opts?.limit ? { limit: opts.limit } : {}),
        ...(opts?.types?.length ? { types: opts.types.join(',') } : {}),
      })}`,
      { signal: opts?.signal, retries: 0 },
    ),
};

// ── Activity Logs (Profile) ─────────────────────────────────────
export const activity = {
  list: (params?: Record<string, string | number>) =>
    http<ActivityFeed>(`/api/profile/activity${buildQs(params)}`),
  sessions: () => http<ProfileSession[]>('/api/profile/sessions'),
  devices: () => http<ProfileDevice[]>('/api/profile/devices'),
};

// ── AI (OpenRouter multi-model) ─────────────────────────────────────────
export const ai = {
  /** SSE streaming chat — use fetchEventSource or manual ReadableStream */
  chatUrl: () => `/api/ai/chat`,

  conversations: (params?: { limit?: number; offset?: number }) =>
    http<{ data: AiConversation[] }>(`/api/ai/conversations${buildQs(params)}`),

  conversation: (id: string) =>
    http<{ data: AiConversation & { messages: AiMessage[] } }>(`/api/ai/conversations/${id}`),

  deleteConversation: (id: string) =>
    http<{ message: string }>(`/api/ai/conversations/${id}`, { method: 'DELETE' }),

  /** Rename and/or pin a conversation. Send at least one field. */
  updateConversation: (id: string, data: { title?: string; pinned?: boolean }) =>
    http<{ data: AiConversation }>(`/api/ai/conversations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

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

  analyzeFitnessTest: (assessment_id: string) =>
    httpSSE<{ data: AiFitnessTestAnalysis; model: string; tier: string; used_fallback: boolean }>('/api/ai/fitness-testing/analyze', {
      method: 'POST',
      body: JSON.stringify({ assessment_id }),
    }),

  businessInsights: (params?: { from?: string; to?: string }) =>
    httpSSE<{ data: AiBusinessInsights; model: string; tier: string; used_fallback: boolean }>('/api/ai/business/insights', {
      method: 'POST',
      body: JSON.stringify(params || {}),
    }),

  // ── Knowledge base (RAG documents: SOPs, guides, policies) ──────────
  knowledge: {
    list: () =>
      http<{ data: AiKnowledgeDocument[] }>('/api/ai/knowledge'),
    upload: (file: File, title: string, category: 'sop' | 'guide' | 'policy') => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      formData.append('category', category);
      return http<{ data: AiKnowledgeDocument }>('/api/ai/knowledge', { method: 'POST', body: formData });
    },
    delete: (id: string) =>
      http<{ message: string }>(`/api/ai/knowledge/${id}`, { method: 'DELETE' }),
    reindex: (id: string) =>
      http<{ message: string }>(`/api/ai/knowledge/${id}/reindex`, { method: 'POST' }),
  },
};
