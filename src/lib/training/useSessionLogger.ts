'use client';

// The session logger's state: the workout, plus everything logged against it.
//
// The rule this hook exists to enforce is that pressing "Log set" never waits
// on the network. The set appears immediately, the write goes into the durable
// queue (see logQueue.ts), and the row is reconciled with the server's version
// when it lands. On a treadmill in a basement that is the difference between a
// usable logger and a spinner.
//
// ── Optimistic rows are marked, not disguised ──────────────────────────────
//
// A pending set renders with `pending: true` so the UI can say so. Showing an
// unsent set identically to a saved one is how a trainer ends up believing a
// session was recorded when it never left the phone.
//
// ── Reconnect and refocus ──────────────────────────────────────────────────
//
// The browser's `online` event is unreliable — it fires for a captive portal
// that serves no traffic, and misses a flaky connection that never formally
// dropped. So the queue also drains on tab focus, which is the moment a
// trainer picks the phone back up and the moment they would look at the badge.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { createLogQueue, newToken, type LogQueue, type QueuedWrite } from './logQueue';
import type {
  CardioPerformance, ExercisePerformance, SetPerformance, TrainingSession,
} from '@/lib/api';

export type PendingSet = SetPerformance & { pending?: true; token?: string };
export type PendingCardio = CardioPerformance & { pending?: true; token?: string };

export interface LoggerPerformance extends Omit<ExercisePerformance, 'sets' | 'cardio'> {
  sets: PendingSet[];
  cardio: PendingCardio[];
}

export interface SessionLogger {
  session: TrainingSession | null;
  performances: LoggerPerformance[];
  loading: boolean;
  error: string;
  reload: () => Promise<void>;

  logSet: (performanceId: string, payload: Record<string, unknown>) => void;
  logCardio: (performanceId: string, payload: Record<string, unknown>) => void;

  /** Writes accepted locally but not yet acknowledged. */
  pending: number;
  syncing: boolean;
  /** Last transient sync failure — the queue is still retrying. */
  syncError: string | null;
  /** Force a drain now. */
  retry: () => void;
  /** Writes the server refused outright. Cleared by `dismissDropped`. */
  dropped: { token: string; message: string }[];
  dismissDropped: () => void;
}

export function useSessionLogger(sessionId: string): SessionLogger {
  const [session, setSession] = useState<TrainingSession | null>(null);
  const [performances, setPerformances] = useState<LoggerPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sync, setSync] = useState({ pending: 0, sending: false, error: null as string | null });
  const [dropped, setDropped] = useState<{ token: string; message: string }[]>([]);

  const queueRef = useRef<LogQueue | null>(null);

  const reload = useCallback(async () => {
    setError('');
    try {
      const res = await api.training.sessions.get(sessionId);
      setSession(res.data);
      setPerformances((prev) => mergeServer(res.data.performances ?? [], prev));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not load this session');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { reload(); }, [reload]);

  // One queue per session, torn down with it.
  useEffect(() => {
    const queue = createLogQueue({
      storageKey: `training.log.${sessionId}`,
      transport: {
        logSet: (id, payload) => api.training.performances.logSet(id, payload),
        logCardio: (id, payload) => api.training.performances.logCardio(id, payload),
      },
      onChange: setSync,
      onDropped: (write: QueuedWrite, err: unknown) => {
        setDropped((d) => [...d, {
          token: write.token,
          message: err instanceof Error ? err.message : 'The server rejected this entry',
        }]);
        // Take the optimistic row away too. Leaving it on screen would claim a
        // set was recorded that the server refused.
        setPerformances((prev) => removeByToken(prev, write.token));
      },
      onAcknowledged: (write, result) => {
        const row = (result as { data?: unknown } | undefined)?.data;
        if (row) setPerformances((prev) => replaceByToken(prev, write.token, write.kind, row));
      },
    });
    queueRef.current = queue;
    // Anything left from a previous tab goes out as soon as we are mounted.
    void queue.drain();
    return () => { queue.dispose(); queueRef.current = null; };
  }, [sessionId]);

  useEffect(() => {
    const drain = () => { void queueRef.current?.drain(); };
    const onVisible = () => { if (document.visibilityState === 'visible') drain(); };
    window.addEventListener('online', drain);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('online', drain);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const logSet = useCallback((performanceId: string, payload: Record<string, unknown>) => {
    const token = newToken();
    setPerformances((prev) => appendOptimistic(prev, performanceId, 'set', token, payload));
    queueRef.current?.enqueue({ token, performanceId, kind: 'set', payload });
  }, []);

  const logCardio = useCallback((performanceId: string, payload: Record<string, unknown>) => {
    const token = newToken();
    setPerformances((prev) => appendOptimistic(prev, performanceId, 'cardio', token, payload));
    queueRef.current?.enqueue({ token, performanceId, kind: 'cardio', payload });
  }, []);

  const retry = useCallback(() => { void queueRef.current?.drain(); }, []);
  const dismissDropped = useCallback(() => setDropped([]), []);

  return useMemo(() => ({
    session, performances, loading, error, reload,
    logSet, logCardio,
    pending: sync.pending, syncing: sync.sending, syncError: sync.error,
    retry, dropped, dismissDropped,
  }), [session, performances, loading, error, reload, logSet, logCardio,
    sync.pending, sync.sending, sync.error, retry, dropped, dismissDropped]);
}

// ── Row arithmetic ─────────────────────────────────────────────────────────
//
// Kept as free functions so they can be tested without mounting anything.

/**
 * Fold a server response into what is on screen, keeping optimistic rows that
 * the server has not seen yet. A refetch mid-workout must not erase the set
 * logged two seconds ago that is still in the queue.
 */
export function mergeServer(
  incoming: ExercisePerformance[],
  current: LoggerPerformance[],
): LoggerPerformance[] {
  const pendingByPerformance = new Map<string, { sets: PendingSet[]; cardio: PendingCardio[] }>();
  for (const p of current) {
    pendingByPerformance.set(p.id, {
      sets: p.sets.filter((s) => s.pending),
      cardio: p.cardio.filter((c) => c.pending),
    });
  }
  return incoming.map((p) => {
    const held = pendingByPerformance.get(p.id);
    return {
      ...p,
      sets: [...p.sets, ...(held?.sets ?? [])],
      cardio: [...p.cardio, ...(held?.cardio ?? [])],
    };
  });
}

export function appendOptimistic(
  performances: LoggerPerformance[],
  performanceId: string,
  kind: 'set' | 'cardio',
  token: string,
  payload: Record<string, unknown>,
): LoggerPerformance[] {
  return performances.map((p) => {
    if (p.id !== performanceId) return p;
    if (kind === 'set') {
      const row = {
        ...payload,
        id: `pending:${token}`,
        exercise_performance_id: performanceId,
        // The server assigns the real number; this keeps the row in order on
        // screen until it does.
        set_number: (payload.set_number as number | undefined) ?? p.sets.length + 1,
        completed: payload.completed !== false,
        pending: true as const,
        token,
      } as PendingSet;
      return { ...p, sets: [...p.sets, row] };
    }
    const row = {
      ...payload,
      id: `pending:${token}`,
      exercise_performance_id: performanceId,
      completed: payload.completed !== false,
      pending: true as const,
      token,
    } as PendingCardio;
    return { ...p, cardio: [...p.cardio, row] };
  });
}

export function replaceByToken(
  performances: LoggerPerformance[],
  token: string,
  kind: 'set' | 'cardio',
  row: unknown,
): LoggerPerformance[] {
  return performances.map((p) => {
    if (kind === 'set') {
      if (!p.sets.some((s) => s.token === token)) return p;
      return { ...p, sets: p.sets.map((s) => (s.token === token ? (row as PendingSet) : s)) };
    }
    if (!p.cardio.some((c) => c.token === token)) return p;
    return { ...p, cardio: p.cardio.map((c) => (c.token === token ? (row as PendingCardio) : c)) };
  });
}

export function removeByToken(performances: LoggerPerformance[], token: string): LoggerPerformance[] {
  return performances.map((p) => ({
    ...p,
    sets: p.sets.filter((s) => s.token !== token),
    cardio: p.cardio.filter((c) => c.token !== token),
  }));
}
