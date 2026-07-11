'use client';

import { useCallback, useEffect, useRef } from 'react';

interface UseAutoSaveDraftOptions<T> {
  /** localStorage key — version-suffix it (e.g. '.v1') so future shape changes can be discarded safely. */
  key: string;
  data: T;
  /** Only persists while true — pass false once submitted/unchanged to stop writing. */
  isDirty: boolean;
  debounceMs?: number;
}

interface DraftEnvelope<T> {
  data: T;
  savedAt: number;
}

/** Debounced localStorage draft save + restore + clear, reusable across forms. */
export function useAutoSaveDraft<T>({ key, data, isDirty, debounceMs = 2000 }: UseAutoSaveDraftOptions<T>) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isDirty) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        const envelope: DraftEnvelope<T> = { data, savedAt: Date.now() };
        localStorage.setItem(key, JSON.stringify(envelope));
      } catch {
        // storage full/unavailable — non-fatal, drafts are a convenience, not a guarantee
      }
    }, debounceMs);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [key, data, isDirty, debounceMs]);

  const restore = useCallback((): T | null => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as DraftEnvelope<T>;
      return parsed?.data ?? null;
    } catch {
      return null;
    }
  }, [key]);

  const clear = useCallback(() => {
    try { localStorage.removeItem(key); } catch { /* noop */ }
  }, [key]);

  /** Bypasses the debounce for an explicit "Save Draft" action. Returns true on success. */
  const saveNow = useCallback((): boolean => {
    try {
      const envelope: DraftEnvelope<T> = { data, savedAt: Date.now() };
      localStorage.setItem(key, JSON.stringify(envelope));
      return true;
    } catch {
      return false;
    }
  }, [key, data]);

  return { restore, clear, saveNow };
}
