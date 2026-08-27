/**
 * The one place that knows how /api/ai/chat talks.
 *
 * The endpoint answers with Server-Sent Events, and consuming SSE correctly is
 * more finicky than it looks: a chunk boundary can land mid-line, so the tail
 * of each read has to be carried into the next one, and a `data:` line can be
 * a partial JSON object that must be skipped rather than thrown on. The AI
 * Coach page had a correct implementation of all of that inline. Adding a
 * floating assistant meant either a second copy of it or this file.
 *
 * It is a plain async function rather than a hook because the two callers want
 * different state shapes — a message list on the Coach page, a single live
 * answer in the assistant panel — and the part worth sharing is the parsing,
 * not the storage.
 */

import { apiBase } from '@/lib/http';

export interface AiStreamEvent {
  type: 'start' | 'chunk' | 'sources' | 'tools' | 'done' | 'error';
  content?: string;
  message?: string;
  conversation_id?: string;
  sources?: string[];
  tools?: string[];
}

export interface AiStreamHandlers {
  /** Fires for every token. `text` is the full answer so far, not the delta —
   *  callers render the whole thing, and accumulating in one place means they
   *  cannot each get it subtly wrong. */
  onText?: (text: string) => void;
  onConversationId?: (id: string) => void;
  onSources?: (sources: string[]) => void;
  onTools?: (tools: string[]) => void;
}

export interface AiStreamRequest {
  message: string;
  conversationId?: string | null;
  clientId?: string | null;
  regenerate?: boolean;
  signal?: AbortSignal;
}

export class AiStreamError extends Error {}

/**
 * Streams one answer. Resolves with the final text once the stream ends.
 *
 * Aborting is not an error: whatever streamed before the abort is returned,
 * because the user pressing Stop wants to keep what they can already read.
 */
export async function streamAiChat(
  { message, conversationId, clientId, regenerate, signal }: AiStreamRequest,
  handlers: AiStreamHandlers = {},
): Promise<{ text: string; conversationId: string | null; aborted: boolean }> {
  let text = '';
  let convId = conversationId ?? null;

  let res: Response;
  try {
    res = await fetch(`${apiBase()}/api/ai/chat`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        message,
        conversation_id: conversationId ?? undefined,
        client_id: clientId ?? undefined,
        regenerate,
      }),
    });
  } catch (err) {
    if (signal?.aborted) return { text, conversationId: convId, aborted: true };
    throw err;
  }

  if (!res.ok || !res.body) {
    throw new AiStreamError(
      res.status === 401
        ? 'Your session has expired — please sign in again.'
        : `Request failed (${res.status}).`,
    );
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      // Everything up to the last newline is complete; the remainder is a
      // partial line and belongs to the next read.
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (!raw) continue;
        let evt: AiStreamEvent;
        try { evt = JSON.parse(raw) as AiStreamEvent; } catch { continue; }

        switch (evt.type) {
          case 'start':
          case 'done':
            if (evt.conversation_id) {
              convId = evt.conversation_id;
              handlers.onConversationId?.(evt.conversation_id);
            }
            break;
          case 'sources':
            if (evt.sources) handlers.onSources?.(evt.sources);
            break;
          case 'tools':
            if (evt.tools) handlers.onTools?.(evt.tools);
            break;
          case 'chunk':
            text += evt.content ?? '';
            handlers.onText?.(text);
            break;
          case 'error':
            throw new AiStreamError(evt.message || 'The assistant ran into a problem.');
        }
      }
    }
  } catch (err) {
    // Stop is a user decision, not a failure — keep what arrived.
    if (signal?.aborted) return { text, conversationId: convId, aborted: true };
    throw err;
  }

  return { text, conversationId: convId, aborted: false };
}
