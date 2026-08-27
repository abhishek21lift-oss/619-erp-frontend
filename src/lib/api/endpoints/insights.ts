// API endpoints: reports, search, activity, ai.
//
// Lifted verbatim from the single `api` object in the 4,185-line api.ts.
// Method names, URLs and request shapes are unchanged; index.ts composes these
// back into the same `api` object every consumer already imports.

import { http, httpSSE } from '../../http';
import { buildQs } from '../qs';
import type {
  ActivityFeed, AiActionPlan, AiActionResult, AiActionSummary,
  AiBusinessInsights, AiConversation, AiDietParams, AiDietPlan,
  AiFitnessTestAnalysis, AiHealthResponse, AiKnowledgeDocument, AiMessage, AiModelStat,
  AiProgressAnalysis, AiProviderSettings, AiUsageStats, AiWorkoutParams, AiWorkoutPlan,
  AiMemoryCandidate, AiProgrammerProposal, PendingWorkQueue, ClientIntelligenceSummary,
  AiIntelligenceAudit,
  DuesItem, DuesSummary, ProfileDevice, ProfileSession, SearchResponse, TrainerSummaryRow,
} from '../types';

export const reports = {
  revenue: (params?: Record<string, string>) =>
    http(`/api/reports/revenue${buildQs(params)}`),
  // members() removed: /api/reports/members does not exist — reports.js serves
  // monthly, revenue, dues, trainers, trainer-summary and revenue-target — and
  // nothing called it.
  monthly: (year: number | string) =>
    http<unknown[]>(`/api/reports/monthly?year=${year}`),
  /** Top 100 debtors by balance. For a TOTAL use `duesSummary` — see below. */
  dues: () =>
    http<DuesItem[]>('/api/reports/dues'),
  /**
   * Authoritative outstanding aggregates over every debtor.
   *
   * `dues` above is capped at 100 rows server-side, so summing it in the
   * browser gave "outstanding among the hundred who owe most" under a label
   * that said Outstanding. Same population, no cap, aggregated in SQL.
   * `high`/`medium` are the risk-band thresholds, passed from the page so the
   * numbers are not defined twice.
   */
  duesSummary: (params?: { high?: number; medium?: number }) =>
    http<DuesSummary>(`/api/reports/dues/summary${buildQs(
      params ? Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]),
      ) : undefined,
    )}`),
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

  /* ── Executable actions ───────────────────────────────────────────────
   * Two calls, deliberately. plan() is read-only and returns exactly what
   * would happen; execute() quotes the plan id back and is the only thing
   * that writes or sends. There is no one-shot variant, because the
   * confirmation step is the safety property and an endpoint that skipped it
   * would eventually get called. */
  actions: () =>
    http<{ data: AiActionSummary[] }>('/api/ai/actions'),

  actionPlan: (id: string, params?: Record<string, unknown>) =>
    http<{ data: AiActionPlan }>(`/api/ai/actions/${id}/plan`, {
      method: 'POST',
      body: JSON.stringify(params ?? {}),
    }),

  actionExecute: (id: string, planId: string) =>
    http<{ data: AiActionResult }>(`/api/ai/actions/${id}/execute`, {
      method: 'POST',
      body: JSON.stringify({ plan_id: planId }),
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

  // ── Trainer Intelligence (Phase 2F) ─────────────────────────────────
  trainer: {
    /** Unified pending work queue — memory candidates + programmer proposals. */
    pending: (params?: { client_id?: string; limit?: number }) =>
      http<{ data: PendingWorkQueue }>(
        `/api/ai/trainer/pending${buildQs(
          params ? Object.fromEntries(
            Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]),
          ) : undefined,
        )}`,
      ),

    /** Client intelligence summary — what changed, what AI knows, suggests, missing. */
    intelligence: (clientId: string) =>
      http<{ data: ClientIntelligenceSummary }>(`/api/ai/trainer/intelligence/${clientId}`),

    /** Confirm a memory candidate → becomes active. */
    confirmMemory: (id: string) =>
      http<{ data: AiMemoryCandidate }>(`/api/ai/trainer/memory/${id}/confirm`, { method: 'POST' }),

    /** Reject a memory candidate. */
    rejectMemory: (id: string, reason?: string) =>
      http<{ data: AiMemoryCandidate }>(`/api/ai/trainer/memory/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason ?? null }),
      }),

    /** Approve a programmer proposal (returns 409 stale_proposal if data changed). */
    approveProposal: (id: string, opts?: { execute?: boolean }) =>
      http<{ data: AiProgrammerProposal; execution_error?: string; execution_status?: string }>(
        `/api/ai/trainer/proposal/${id}/approve`,
        { method: 'POST', body: JSON.stringify({ execute: opts?.execute ?? false }) },
      ),

    /** Execute an already-approved proposal. */
    executeProposal: (id: string) =>
      http<{ data: { status: string; proposal_type?: string; changes?: Record<string, unknown> } }>(
        `/api/ai/trainer/proposal/${id}/execute`,
        { method: 'POST' },
      ),

    /** Reverse an executed proposal — restore exact previous state. */
    reverseProposal: (id: string, reason?: string) =>
      http<{ data: { status: string; proposal_type?: string; restored?: Record<string, unknown> } }>(
        `/api/ai/trainer/proposal/${id}/reverse`,
        { method: 'POST', body: JSON.stringify({ reason: reason ?? null }) },
      ),

    /** Reject a programmer proposal. */
    rejectProposal: (id: string, reason?: string) =>
      http<{ data: AiProgrammerProposal }>(`/api/ai/trainer/proposal/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason ?? null }),
      }),

    /** Audit trail for intelligence actions. */
    audit: (params?: { client_id?: string; target_type?: string; limit?: number }) =>
      http<{ data: AiIntelligenceAudit[] }>(
        `/api/ai/trainer/audit${buildQs(
          params ? Object.fromEntries(
            Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]),
          ) : undefined,
        )}`,
      ),
  },

  // ── Memory CRUD (Phase 2D) ──────────────────────────────────────────
  memory: {
    /** List all memories for a client. */
    list: (clientId: string, params?: { category?: string; status?: string; limit?: number }) =>
      http<{ data: AiMemoryCandidate[] }>(
        `/api/ai/memory/${clientId}${buildQs(
          params ? Object.fromEntries(
            Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]),
          ) : undefined,
        )}`,
      ),

    /** List pending candidate memories. */
    pending: (clientId: string) =>
      http<{ data: AiMemoryCandidate[] }>(`/api/ai/memory/${clientId}/pending`),

    /** Confirm a candidate memory. */
    confirm: (clientId: string, memoryId: string) =>
      http<{ data: AiMemoryCandidate }>(`/api/ai/memory/${clientId}/confirm/${memoryId}`, { method: 'POST' }),

    /** Reject a candidate memory. */
    reject: (clientId: string, memoryId: string) =>
      http<{ data: AiMemoryCandidate }>(`/api/ai/memory/${clientId}/reject/${memoryId}`, { method: 'POST' }),

    /** Delete a memory. */
    remove: (memoryId: string) =>
      http<{ data: AiMemoryCandidate }>(`/api/ai/memory/${memoryId}`, { method: 'DELETE' }),

    /** Supersede an old memory with a new one. */
    supersede: (clientId: string, oldMemoryId: string, newFact: string, opts?: { category?: string; subcategory?: string }) =>
      http<{ data: { old: AiMemoryCandidate; new: AiMemoryCandidate } }>(`/api/ai/memory/${clientId}/supersede`, {
        method: 'POST',
        body: JSON.stringify({ old_memory_id: oldMemoryId, new_fact: newFact, ...opts }),
      }),
  },

  // ── Programmer Agent (Phase 2E) ─────────────────────────────────────
  programmer: {
    /** Generate proposals for a client. */
    propose: (params: { client_id: string; exercise_name?: string; context?: string }) =>
      http<{ data: { proposals: AiProgrammerProposal[]; safety: Record<string, unknown>; errors: string[] } }>(
        '/api/ai/programmer/propose',
        { method: 'POST', body: JSON.stringify(params) },
      ),

    /** List proposals for a client. */
    proposals: (clientId: string, params?: { status?: string; limit?: number }) =>
      http<{ data: AiProgrammerProposal[] }>(
        `/api/ai/programmer/proposals/${clientId}${buildQs(
          params ? Object.fromEntries(
            Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]),
          ) : undefined,
        )}`,
      ),

    /** Approve a proposal. */
    approve: (id: string) =>
      http<{ data: AiProgrammerProposal }>(`/api/ai/programmer/proposals/${id}/approve`, { method: 'POST' }),

    /** Reject a proposal. */
    reject: (id: string, reason?: string) =>
      http<{ data: AiProgrammerProposal }>(`/api/ai/programmer/proposals/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason ?? null }),
      }),
  },
};
