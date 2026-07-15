// frontend/src/lib/use-async.ts
//
// Minimal data-fetching hook. SWR-lite — but no extra dependency. Solves the
// three things every page in this app currently re-implements:
//   1. abort on unmount (prevents the "set state on unmounted component" warn)
//   2. ignore stale responses when the input changes mid-flight
//   3. consistent { data, error, loading, refetch } shape

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface AsyncState<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
  /** Bumps the fetch and returns a promise that resolves once the
   *  resulting request settles (rejects if it errored) — callers that only
   *  want fire-and-forget can just ignore the returned promise. */
  refetch: () => Promise<void>;
  /** True after the first response (success or error) has come back. */
  hasResolved: boolean;
}

export function useAsync<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: React.DependencyList,
): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasResolved, setHasResolved] = useState(false);
  const [tick, setTick] = useState(0);

  // Keep the latest fetcher in a ref so we can refetch without re-binding deps.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  // Resolved/rejected once the in-flight fetch triggered by refetch() settles.
  const deferredRef = useRef<{ resolve: () => void; reject: (err: unknown) => void } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();

    setLoading(true);
    setError(null);

    fetcherRef
      .current(ctrl.signal)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        deferredRef.current?.resolve();
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        // Aborted on unmount or deps-change is not an error.
        if (err instanceof DOMException && err.name === 'AbortError') return;
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        deferredRef.current?.reject(e);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
        setHasResolved(true);
        deferredRef.current = null;
      });

    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [...deps, tick]);

  const refetch = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      // A refetch already in flight — resolve it as superseded rather than
      // leaving its caller awaiting a promise that will now never settle.
      deferredRef.current?.resolve();
      deferredRef.current = { resolve, reject };
      setTick((n) => n + 1);
    });
  }, []);

  return { data, error, loading, refetch, hasResolved };
}
