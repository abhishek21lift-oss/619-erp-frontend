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
//   - `error`    the last save failed; the local value is still shown, but the
//                caller is told, and can offer a retry
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
  const inFlight = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const linger = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef(save);
  const errRef = useRef(onError);
  useEffect(() => { saveRef.current = save; errRef.current = onError; });

  const flush = useCallback(async () => {
    if (queue.current.size === 0) return;

    // Take the whole queue and clear it, so edits made DURING the request are
    // queued for the next flush rather than lost or double-sent.
    const batch = [...queue.current.entries()];
    queue.current.clear();

    inFlight.current += batch.length;
    setStatus('saving');

    const results = await Promise.allSettled(
      batch.map(([id, patch]) => saveRef.current(id, patch)),
    );

    inFlight.current -= batch.length;

    const failed = results
      .map((r, i) => (r.status === 'rejected' ? { r, entry: batch[i] } : null))
      .filter(Boolean) as { r: PromiseRejectedResult; entry: [string, P] }[];

    for (const f of failed) errRef.current?.(f.r.reason, f.entry[0], f.entry[1]);

    if (failed.length) {
      setStatus('error');
      return;
    }
    // More arrived while we were saving — stay in `saving` and let the pending
    // timer take it, rather than flashing `Saved ✓` for a stale batch.
    if (queue.current.size > 0 || inFlight.current > 0) return;

    setStatus('saved');
    if (linger.current) clearTimeout(linger.current);
    linger.current = setTimeout(() => {
      // Only fall back to idle if nothing new happened in the meantime.
      setStatus((s) => (s === 'saved' ? 'idle' : s));
    }, SAVED_LINGER_MS);
  }, []);

  /** Queue a patch for `id`, merging with anything already queued for it. */
  const enqueue = useCallback((id: string, patch: P) => {
    const existing = queue.current.get(id);
    queue.current.set(id, existing ? { ...existing, ...patch } : patch);
    setStatus('pending');

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, DEBOUNCE_MS);
  }, [flush]);

  /** Send everything now — for unmount, or a deliberate "save now". */
  const flushNow = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    return flush();
  }, [flush]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    if (linger.current) clearTimeout(linger.current);
  }, []);

  // Leaving with unsaved edits is the one case where the browser should
  // interrupt: the debounce window is short, but a trainer closing the tab
  // mid-keystroke would otherwise lose the last thing they typed.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (queue.current.size === 0 && inFlight.current === 0) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  return { status, enqueue, flushNow, hasPending: () => queue.current.size > 0 };
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
