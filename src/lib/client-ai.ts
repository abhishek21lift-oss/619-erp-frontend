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

// No apiBase import on purpose: /ai never targets the ERP. See aiBase() below.
/**
 * The assistant is reached through the same-origin `/ai` rewrite
 * (next.config.js) — never a cross-origin URL, which is the whole
 * authorisation model: the httpOnly `token` cookie is sameSite:'strict' and
 * does not survive any cross-site request. Production has the rewrite; dev
 * has it too once AI_SERVICE_URL is set (same file). The URL that must never
 * be used is the ERP's base (apiBase()): `/ai/*` lives on the assistant
 * service, and asking the ERP for it 404s in every environment — the
 * production behaviour the round-2 audit filed as WIRE-01.
 */
function aiBase(): string {
  return '';
}

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

/**
 * Codes the service can name, in the copy the panel shows verbatim. The point
 * of the map (WIRE-01) is that the code, not the transport status alone,
 * carries the meaning: a 404 from an unknown route is a deployment/company
 * problem and must not read as "your client is missing" — the two had one
 * message, and the trainer chased a data bug that was not there.
 */
const CODE_MESSAGES: Readonly<Record<string, string>> = {
  NO_TOKEN: 'Your session has expired. Please sign in again.',
  CLIENT_NOT_FOUND: 'This client could not be found in your studio.',
  NOT_FOUND: 'The AI assistant is not set up in this app yet. Please contact support.',
  RATE_LIMITED: 'Too many questions at once. Give it a moment.',
  QUOTA_EXCEEDED: 'This studio has used its AI allowance for this month. Please contact your administrator.',
  QUOTA_UNVERIFIED: 'The assistant cannot verify your studio’s AI allowance right now. Please try again shortly.',
  AI_NOT_ENABLED: 'The AI assistant is not included in your studio’s plan. Please contact your administrator.',
  ENTITLEMENT_UNVERIFIED: 'The assistant cannot verify your studio’s plan right now. Please try again shortly.',
  MODEL_FAILED: 'The assistant is temporarily unavailable. Please try again shortly.',
  ALL_MODELS_FAILED: 'The assistant is temporarily unavailable. Please try again shortly.',
};

/** Messages worth showing a trainer verbatim, keyed by what the service said. */
function friendly(code: string, status: number, fallback: string): string {
  const known = CODE_MESSAGES[code];
  if (known) return known;
  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (status === 404) return 'This client could not be found in your studio.';
  if (status === 403) return 'You do not have access to this client.';
  if (status === 429) return 'Too many questions at once. Give it a moment.';
  if (status === 503) return 'The assistant is temporarily unavailable. Please try again shortly.';
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
    res = await fetch(`${aiBase()}/ai/client-agent/chat/stream`, {
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
        case 'error': {
          const code = (evt.code as string) ?? 'ERROR';
          const status = (evt.status as number) ?? 0;
          throw new ClientAiError(
            // Error events carry the transport-equivalent status so the same
            // map as a refusal-before-stream applies (WIRE-01).
            friendly(code, status, (evt.message as string) ?? ''),
            code,
            status,
            Boolean(evt.partial),
          );
        }
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
