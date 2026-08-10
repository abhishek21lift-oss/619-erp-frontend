/**
 * The one place that knows how the Client AI service is called.
 *
 * Deliberately NOT part of `src/lib/api` — that barrel targets the ERP backend,
 * and this reaches a different service (repo: mps-ai) with a different base
 * path, error envelope and failure modes. Filing it under `api.*` would imply a
 * shared contract that does not exist, and the first person to add a retry or a
 * refresh interceptor there would silently change behaviour here.
 *
 * Auth is the httpOnly `token` cookie, sent by `credentials: 'include'` the
 * same way every other call in this app does it. The browser cannot read that
 * cookie, so there is no header to set — which is exactly why /ai is a
 * same-origin rewrite (next.config.js) rather than a call to another host: the
 * cookie is sameSite:'strict' and a cross-site request would arrive without it.
 */

import { apiBase } from '@/lib/http';

export interface ClientAiAnswer {
  message: string;
  clientId: string;
  clientName: string;
  /** Which retrieval tools produced the grounding for this answer. */
  toolsUsed: string[];
  /** Tools that were denied or errored — shown so a gap is visible, not hidden. */
  toolsUnavailable: { tool: string; reason: string }[];
  proposedAction: unknown | null;
  requiresConfirmation: boolean;
  meta?: {
    intent?: string;
    model?: string;
    used_fallback?: boolean;
    latency_ms?: number;
  };
  requestId?: string;
}

export interface ClientAiTurn {
  role: 'user' | 'assistant';
  content: string;
}

export class ClientAiError extends Error {
  code: string;

  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = 'ClientAiError';
    this.code = code;
    this.status = status;
  }
}

/** Messages worth showing a trainer verbatim, keyed by what the service said. */
function friendly(code: string, status: number, fallback: string): string {
  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (status === 404) return 'This client could not be found in your studio.';
  if (status === 403) return 'You do not have access to this client.';
  if (status === 429) return 'Too many questions at once. Give it a moment.';
  if (code === 'ALL_MODELS_FAILED' || status === 503) {
    return 'The assistant is temporarily unavailable. Please try again shortly.';
  }
  return fallback || 'Something went wrong.';
}

export async function askClientAi(
  input: { clientId: string; message: string; history?: ClientAiTurn[] },
  signal?: AbortSignal,
): Promise<ClientAiAnswer> {
  let res: Response;
  try {
    res = await fetch(`${apiBase()}/ai/client-agent/chat`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        clientId: input.clientId,
        message: input.message,
        // Bounded here as well as on the server. The server is the authority,
        // but sending forty turns to have thirty-four discarded is wasted
        // upload on a phone with one bar of signal.
        history: (input.history ?? []).slice(-8),
      }),
    });
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new ClientAiError('Could not reach the assistant. Check your connection.', 'NETWORK', 0);
  }

  if (!res.ok) {
    let code = 'ERROR';
    let message = '';
    try {
      const body = await res.json();
      code = body?.error?.code ?? code;
      message = body?.error?.message ?? '';
    } catch {
      /* a proxy error page, not our envelope — fall through to the generic text */
    }
    throw new ClientAiError(friendly(code, res.status, message), code, res.status);
  }

  return res.json() as Promise<ClientAiAnswer>;
}

/**
 * The starter questions offered before the trainer has typed anything.
 *
 * Every one of these maps to a rule in the service's planner, so each returns a
 * grounded answer rather than a shrug. §33 is explicit that only supported
 * actions should be offered — "what changed since the last assessment?" is
 * absent on purpose, because the ERP exposes only the latest assessment and
 * there is no history endpoint to answer it from.
 */
export const SUGGESTED_QUESTIONS: readonly string[] = [
  'Summarize this client',
  'How is their progress?',
  'What are their goals?',
  'Show recent attendance',
  'When does their package expire?',
  'What should I focus on next session?',
] as const;
