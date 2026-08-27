// The durable write queue behind the session logger.
//
// A set logged in a gym basement has to survive the connection, the tab, and
// the phone locking. So every write is appended here first, persisted, and
// drained in the background — the UI shows the set the moment the button is
// pressed and never waits on the network.
//
// ── Why not useAutosave ────────────────────────────────────────────────────
//
// components/pt-os/builder/useAutosave.ts already debounces saves, and it is
// the right tool for what it does: it merges edits to the same row so three
// keystrokes become one PATCH. Logging is the opposite shape. Each set is an
// append, not an edit — merging two of them would lose one — and the queue has
// to outlive a page reload, which an in-memory Map cannot. Different problem,
// different structure; reusing that hook here would mean bending it until it
// served neither.
//
// ── Ordering is serial, deliberately ───────────────────────────────────────
//
// Sets carry set_number. Firing the queue in parallel on reconnect would let
// set 3 land before set 2, and a server that assigns anything by arrival order
// would record the workout wrong. One at a time, in the order they happened,
// is slower and correct.
//
// ── Which failures are worth retrying ──────────────────────────────────────
//
// A 422 will still be a 422 in thirty seconds. Retrying it forever wedges the
// queue behind a write that can never succeed, and every set logged after it
// waits in line for a corpse. So 4xx is permanent: the write is dropped and
// the caller is told, loudly, because a dropped set the trainer thinks was
// saved is the failure mode that actually costs someone their training log.
// 408 and 429 are the exceptions — both explicitly mean "try again".
//
// Network errors and 5xx are transient and retried with backoff.

import { ApiError } from '@/lib/http';

export type WriteKind = 'set' | 'cardio';

export interface QueuedWrite {
  /** The idempotency key. Generated on the device, sent as `client_token`. */
  token: string;
  performanceId: string;
  kind: WriteKind;
  payload: Record<string, unknown>;
  attempts: number;
  queuedAt: number;
}

export interface LogQueueTransport {
  logSet: (performanceId: string, payload: Record<string, unknown>) => Promise<unknown>;
  logCardio: (performanceId: string, payload: Record<string, unknown>) => Promise<unknown>;
}

export interface LogQueueState {
  /** Writes accepted by the UI but not yet acknowledged by the server. */
  pending: number;
  sending: boolean;
  /** Last transient failure. Cleared by the next success. */
  error: string | null;
}

export interface LogQueueOptions {
  storageKey: string;
  transport: LogQueueTransport;
  /** Null disables persistence — used where no storage exists. */
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null;
  onChange?: (state: LogQueueState) => void;
  /** Called when a write is dropped for good. The caller must surface this. */
  onDropped?: (write: QueuedWrite, error: unknown) => void;
  /** Called on every acknowledged write, so the caller can reconcile. */
  onAcknowledged?: (write: QueuedWrite, result: unknown) => void;
  now?: () => number;
}

const BASE_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30_000;

/** 4xx means the write is wrong, not unlucky — except the two that say retry. */
export function isPermanent(err: unknown): boolean {
  if (!(err instanceof ApiError)) return false;
  const { status } = err;
  if (status === 408 || status === 429) return false;
  return status >= 400 && status < 500;
}

export function backoffFor(attempts: number): number {
  return Math.min(BASE_BACKOFF_MS * 2 ** Math.max(0, attempts - 1), MAX_BACKOFF_MS);
}

/**
 * A token that is unique per device and per write. `crypto.randomUUID` where it
 * exists; a random fallback where it does not, because iOS Safari only exposes
 * it on secure origins and a logger that throws on http:// during a gym's
 * captive-portal redirect is worse than a slightly weaker key.
 */
export function newToken(): string {
  const c = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export interface LogQueue {
  enqueue: (write: Omit<QueuedWrite, 'attempts' | 'queuedAt'>) => void;
  /** Try to send now — on reconnect, on tab focus, or from a Retry button. */
  drain: () => Promise<void>;
  state: () => LogQueueState;
  peek: () => QueuedWrite[];
  dispose: () => void;
}

export function createLogQueue(opts: LogQueueOptions): LogQueue {
  const { storageKey, transport, onChange, onDropped, onAcknowledged } = opts;
  const storage = opts.storage === undefined ? safeLocalStorage() : opts.storage;
  const now = opts.now ?? (() => Date.now());

  let queue: QueuedWrite[] = restore();
  let sending = false;
  let error: string | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;

  function restore(): QueuedWrite[] {
    if (!storage) return [];
    try {
      const raw = storage.getItem(storageKey);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      // Anything malformed is dropped rather than replayed: a half-written
      // record from a killed tab must not be POSTed as if it were a set.
      return parsed.filter(isQueuedWrite);
    } catch {
      return [];
    }
  }

  function persist() {
    if (!storage) return;
    try {
      if (queue.length === 0) storage.removeItem(storageKey);
      else storage.setItem(storageKey, JSON.stringify(queue));
    } catch {
      // A full or blocked storage must not stop the workout. The queue still
      // works in memory; it just no longer survives a reload.
    }
  }

  function notify() {
    onChange?.({ pending: queue.length, sending, error });
  }

  function schedule(ms: number) {
    if (disposed || timer) return;
    timer = setTimeout(() => { timer = null; void drain(); }, ms);
  }

  async function drain(): Promise<void> {
    if (sending || disposed) return;
    if (queue.length === 0) return;

    sending = true;
    notify();

    try {
      while (queue.length > 0 && !disposed) {
        const write = queue[0];
        try {
          const result = write.kind === 'set'
            ? await transport.logSet(write.performanceId, { ...write.payload, client_token: write.token })
            : await transport.logCardio(write.performanceId, { ...write.payload, client_token: write.token });

          // Shift by token, not by index: an enqueue during the request may
          // have appended, and a dispose may have cleared.
          queue = queue.filter((w) => w.token !== write.token);
          error = null;
          persist();
          notify();
          onAcknowledged?.(write, result);
        } catch (err: unknown) {
          if (isPermanent(err)) {
            queue = queue.filter((w) => w.token !== write.token);
            persist();
            notify();
            onDropped?.(write, err);
            continue; // the next write may be perfectly fine
          }
          write.attempts += 1;
          error = err instanceof Error ? err.message : 'Could not save';
          persist();
          schedule(backoffFor(write.attempts));
          return;
        }
      }
    } finally {
      sending = false;
      notify();
    }
  }

  return {
    enqueue(write) {
      queue = [...queue, { ...write, attempts: 0, queuedAt: now() }];
      persist();
      notify();
      void drain();
    },
    drain,
    state: () => ({ pending: queue.length, sending, error }),
    peek: () => [...queue],
    dispose() {
      disposed = true;
      if (timer) { clearTimeout(timer); timer = null; }
    },
  };
}

function isQueuedWrite(v: unknown): v is QueuedWrite {
  if (!v || typeof v !== 'object') return false;
  const w = v as Record<string, unknown>;
  return typeof w.token === 'string'
    && typeof w.performanceId === 'string'
    && (w.kind === 'set' || w.kind === 'cardio')
    && !!w.payload && typeof w.payload === 'object';
}

function safeLocalStorage(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null; // Safari private mode throws on access
  }
}
