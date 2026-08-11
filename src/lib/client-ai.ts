/**
 * The one place that knows how the Client AI service is called.
 *
 * Deliberately NOT part of `src/lib/api` — that barrel targets the ERP backend,
 * and this reaches a different service (repo: mps-ai) with a different base
 * path, error envelope and failure modes. Filing it under `api.*` would imply a
 * shared contract that does not exist, and the first person to add a retry or a
 * refresh interceptor there would silently change behaviour here.
 *
 * There is one function, and it streams. The service also exposes a plain JSON
 * /chat for server-to-server callers, but a second client for it here would be
 * a second set of error handling that nothing exercises — and the first thing
 * to drift when the envelope changes.
 *
 * Auth is the httpOnly `token` cookie, sent by `credentials: 'include'` the
 * same way every other call in this app does it. The browser cannot read that
 * cookie, so there is no header to set — which is exactly why /ai is a
 * same-origin rewrite (next.config.js) rather than a call to another host: the
 * cookie is sameSite:'strict' and a cross-site request would arrive without it.
 */

import { apiBase } from '@/lib/http';

/**
 * The service's check of the answer's figures against the records they were
 * supposed to come from. Numbers only — prose is not checkable this way — and
 * `figures` carries just the ones it could not account for.
 */
export interface ClientAiGrounding {
  checked: number;
  inSource: number;
  derived: number;
  unverified: number;
  figures: { text: string; value: number; line: number; context: string }[];
}

export interface ClientAiAnswer {
  message: string;
  clientId: string;
  clientName: string;
  /** Which retrieval tools produced the grounding for this answer. */
  toolsUsed: string[];
  /** Tools that were denied or errored — shown so a gap is visible, not hidden. */
  toolsUnavailable: { tool: string; reason: string }[];
  grounding?: ClientAiGrounding;
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

  /** True when the failure arrived AFTER part of the answer was already on
   *  screen. The caller keeps that text and marks it incomplete, rather than
   *  discarding what the trainer has already started reading. */
  partial: boolean;

  constructor(message: string, code: string, status: number, partial = false) {
    super(message);
    this.name = 'ClientAiError';
    this.code = code;
    this.status = status;
    this.partial = partial;
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

/** Metadata the service sends before the first word of the answer. */
export interface ClientAiStart {
  clientId: string;
  clientName: string;
  toolsUsed: string[];
  toolsUnavailable: { tool: string; reason: string }[];
  requestId?: string;
}

export interface ClientAiStreamHandlers {
  /** Retrieval finished; the model is now writing. Carries the provenance, so
   *  the panel can show what the answer is grounded in before it exists. */
  onStart?: (start: ClientAiStart) => void;
  /** Fires per token with the FULL answer so far, not the delta — every caller
   *  renders the whole string, and accumulating in one place means they cannot
   *  each get it subtly wrong. */
  onText?: (text: string) => void;
}

/**
 * The same answer as askClientAi(), delivered as it is written.
 *
 * Worth the extra code for a reason that is not cosmetic. The free-tier model
 * takes 45-60 seconds to finish, and the proxies between here and the service
 * close a connection that has been silent for about sixty — so complete,
 * correct answers were arriving as network errors. A stream never goes silent.
 * The trainer also starts reading at the first sentence instead of the last,
 * which is the difference between a minute of blank screen and a usable tool.
 *
 * Parsing mirrors lib/ai-stream.ts deliberately: a read boundary can land
 * mid-line, so the tail of each read is carried into the next, and a `data:`
 * line that will not parse is skipped rather than thrown on.
 */
export async function streamClientAi(
  input: { clientId: string; message: string; history?: ClientAiTurn[] },
  handlers: ClientAiStreamHandlers = {},
  signal?: AbortSignal,
): Promise<ClientAiAnswer> {
  let res: Response;
  try {
    res = await fetch(`${apiBase()}/ai/client-agent/chat/stream`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        clientId: input.clientId,
        message: input.message,
        history: (input.history ?? []).slice(-8),
      }),
    });
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new ClientAiError('Could not reach the assistant. Check your connection.', 'NETWORK', 0);
  }

  // A failure that happens before the first byte still arrives as a status code
  // and a JSON envelope — the service holds its status line back precisely so
  // that a denial or a dead model can be one. Same handling as askClientAi.
  if (!res.ok || !res.body) {
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

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';
  let answer: ClientAiAnswer | null = null;

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;   // ': ping' keep-alives land here
      const raw = line.slice(6).trim();
      if (!raw) continue;
      let evt: Record<string, unknown>;
      try { evt = JSON.parse(raw) as Record<string, unknown>; } catch { continue; }

      switch (evt.type) {
        case 'start':
          handlers.onStart?.(evt as unknown as ClientAiStart);
          break;
        case 'chunk':
          text += (evt.content as string) ?? '';
          handlers.onText?.(text);
          break;
        case 'done':
          answer = evt as unknown as ClientAiAnswer;
          break;
        case 'error':
          throw new ClientAiError(
            friendly((evt.code as string) ?? 'ERROR', 0, (evt.message as string) ?? ''),
            (evt.code as string) ?? 'ERROR',
            0,
            Boolean(evt.partial),
          );
        default:
          break;
      }
    }
  }

  if (answer) return answer;

  // The stream ended without a done event — the connection dropped mid-answer.
  // Whatever arrived is real and is already on screen, so say so rather than
  // presenting a sentence that simply stops as a finished answer.
  throw new ClientAiError(
    'The answer was cut off before it finished.',
    'STREAM_INCOMPLETE',
    0,
    text.length > 0,
  );
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
