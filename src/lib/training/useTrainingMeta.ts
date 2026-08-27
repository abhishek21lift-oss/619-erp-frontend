'use client';

// The prescription vocabulary, fetched once.
//
// GET /api/training/meta is static per deploy — it publishes the backend's
// prescription.js and changes only when the server does. Every builder row
// needs it to decide which fields to render, so fetching per row would mean
// one request per exercise on a page that shows twenty.
//
// Cached at module scope rather than in a context provider: the value is
// immutable for the life of the tab, there is exactly one of it, and a
// provider would mean every consumer has to be mounted under it — which the
// builder's dialogs and drawers are not, reliably.
//
// The in-flight promise is cached too, not just the result. Twenty rows
// mounting in the same tick would otherwise fire twenty identical requests
// before the first resolved.

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { TrainingMeta } from '@/lib/api';

let cached: TrainingMeta | null = null;
let inFlight: Promise<TrainingMeta> | null = null;

async function load(): Promise<TrainingMeta> {
  if (cached) return cached;
  if (!inFlight) {
    inFlight = api.training.meta()
      .then((r) => { cached = r.data; return r.data; })
      // Clear on failure so a retry is possible. Leaving a rejected promise
      // cached would make one flaky request break the builder until reload.
      .catch((err) => { inFlight = null; throw err; });
  }
  return inFlight;
}

export interface TrainingMetaState {
  meta: TrainingMeta | null;
  loading: boolean;
  error: string | null;
}

export function useTrainingMeta(): TrainingMetaState {
  const [state, setState] = useState<TrainingMetaState>(() => ({
    meta: cached, loading: !cached, error: null,
  }));

  useEffect(() => {
    if (cached) return;
    let alive = true;
    load()
      .then((meta) => { if (alive) setState({ meta, loading: false, error: null }); })
      .catch((err: unknown) => {
        if (!alive) return;
        setState({
          meta: null, loading: false,
          error: err instanceof Error ? err.message : 'Could not load prescription types',
        });
      });
    return () => { alive = false; };
  }, []);

  return state;
}

/** Test seam. Production never calls this. */
export function __resetTrainingMetaCache() {
  cached = null;
  inFlight = null;
}
