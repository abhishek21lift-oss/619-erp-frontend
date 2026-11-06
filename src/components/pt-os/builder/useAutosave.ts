'use client';

// Debounced, per-exercise autosave with an honest status indicator.
//
// The brief asks for no save button and a `Saved ✓` when changes sync. The
// interesting part is not the debounce, it is what happens when a save fails:
// an optimistic UI that silently drops a write is worse than a save button,
// because the trainer walks away believing the programme is stored.
//
// So this tracks three things and reports all of them:
//   - `pending`  edits queued but not yet sent
//   - `saving`   a request in flight
//   - `error`    the last save failed; the local value is still shown, the
//                failed patch is KEPT, and `retry()` sends it again
//
// ── Why edits coalesce per exercise ────────────────────────────────────────
//
// A trainer editing sets, then reps, then rest on one card produces three
// PATCHes a few hundred milliseconds apart. Merging them per row id means one
// request carrying all three fields — fewer round trips, and no chance of two
// in-flight PATCHes on the same row landing out of order.
//
// Keyed by row id rather than a single global buffer so edits to DIFFERENT
// exercises never merge into one request and never block each other.

import { useCallback, useEffect, useRef, useState } from 'react';

export type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

const DEBOUNCE_MS = 600;
/** How long `Saved ✓` stays up before fading back to idle. */
const SAVED_LINGER_MS = 2000;

export interface UseAutosaveOptions<P> {
  /** Performs one save. Rejecting marks the batch failed. */
  save: (id: string, patch: P) => Promise<unknown>;
  onError?: (err: unknown, id: string, patch: P) => void;
}

export function useAutosave<P extends object>({ save, onError }: UseAutosaveOptions<P>) {
  const [status, setStatus] = useState<SaveStatus>('idle');

  // Refs, not state: mutating these must not re-render, and the flush timer
  // has to read the latest queue rather than the one captured at schedule time.
  const queue = useRef(new Map<string, P>());
  /** Patches a request rejected. Kept until retried or folded into a newer edit. */
  const failed = useRef(new Map<string, P>());
  const inFlight = useRef(0);
  /** Save promises still running, so flushNow can wait for a request it did not start. */
  const running = useRef(new Set<Promise<unknown>>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const linger = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef(save);
  const errRef = useRef(onError);
  useEffect(() => { saveRef.current = save; errRef.current = onError; });

  const flush = useCallback(async (): Promise<boolean> => {
    if (queue.current.size === 0) return failed.current.size === 0;

    // Take the whole queue and clear it, so edits made DURING the request are
    // queued for the next flush rather than lost or double-sent.
    const batch = [...queue.current.entries()];
    queue.current.clear();

    inFlight.current += batch.length;
    setStatus('saving');

    const sends = batch.map(([id, patch]) =>
      Promise.resolve().then(() => saveRef.current(id, patch)));
    for (const p of sends) running.current.add(p);

    const results = await Promise.allSettled(sends);
    for (const p of sends) running.current.delete(p);

    inFlight.current -= batch.length;

    // A row that saved is no longer failed. A row that rejected replaces (or
    // extends) its failed patch, so the retry sends the whole prescription.
    const rejected: { reason: unknown; id: string; patch: P }[] = [];
    results.forEach((r, i) => {
      const [id, patch] = batch[i];
      if (r.status === 'rejected') rejected.push({ reason: r.reason, id, patch });
      else failed.current.delete(id);
    });

    for (const f of rejected) {
      failed.current.set(f.id, { ...(failed.current.get(f.id) ?? {}), ...f.patch } as P);
      errRef.current?.(f.reason, f.id, f.patch);
    }

    if (failed.current.size > 0) {
      setStatus('error');
      return false;
    }
    // More arrived while we were saving — stay in `saving` and let the pending
    // timer take it, rather than flashing `Saved ✓` for a stale batch.
    if (queue.current.size > 0 || inFlight.current > 0) return true;

    setStatus('saved');
    if (linger.current) clearTimeout(linger.current);
    linger.current = setTimeout(() => {
      // Only fall back to idle if nothing new happened in the meantime.
      setStatus((s) => (s === 'saved' ? 'idle' : s));
    }, SAVED_LINGER_MS);
    return true;
  }, []);

  /** Queue a patch for `id`, merging with anything already queued for it. */
  const enqueue = useCallback((id: string, patch: P) => {
    // A new edit to a row whose last write failed carries the failed fields
    // with it. Otherwise those fields would stay unsaved until the trainer
    // noticed the error pill — which is exactly the silent loss this hook
    // exists to prevent.
    const failedPatch = failed.current.get(id);
    const merged = failedPatch ? { ...failedPatch, ...patch } : patch;
    if (failedPatch) failed.current.delete(id);

    const existing = queue.current.get(id);
    queue.current.set(id, existing ? { ...existing, ...merged } : merged);
    setStatus('pending');

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, DEBOUNCE_MS);
  }, [flush]);

  /** Send everything now — for unmount, a version snapshot, or "save now". */
  const flushNow = useCallback(async (): Promise<boolean> => {
    if (timer.current) clearTimeout(timer.current);
    let clean = true;
    // Flush until the queue AND anything already in flight has settled: a
    // snapshot is only faithful if it cannot race a save.
    for (;;) {
      if (queue.current.size > 0) {
        clean = (await flush()) && clean;
        continue;
      }
      if (running.current.size > 0) {
        const results = await Promise.allSettled([...running.current]);
        if (results.some((r) => r.status === 'rejected')) clean = false;
        continue;
      }
      break;
    }
    return clean && failed.current.size === 0;
  }, [flush]);

  /** Send the retained failed patches again. */
  const retry = useCallback(() => {
    for (const [id, patch] of failed.current) {
      // A newer queued edit wins for the fields it names; the rest of the
      // failed patch still needs sending.
      const queued = queue.current.get(id);
      queue.current.set(id, queued ? { ...patch, ...queued } : patch);
    }
    failed.current.clear();
    return flushNow();
  }, [flushNow]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    if (linger.current) clearTimeout(linger.current);
  }, []);

  // Leaving with unsaved edits is the one case where the browser should
  // interrupt: the debounce window is short, but a trainer closing the tab
  // mid-keystroke would otherwise lose the last thing they typed. A failed
  // write counts too — it is still only in this tab.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (queue.current.size === 0 && inFlight.current === 0 && failed.current.size === 0) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  return {
    status,
    enqueue,
    flushNow,
    retry,
    hasPending: () => queue.current.size > 0 || failed.current.size > 0,
  };
}

/** Label for a status pill. Exported so the indicator and its test agree. */
export function saveStatusLabel(status: SaveStatus): string {
  switch (status) {
    case 'pending': return 'Unsaved changes';
    case 'saving':  return 'Saving…';
    case 'saved':   return 'Saved';
    case 'error':   return 'Not saved — retry';
    default:        return '';
  }
}
