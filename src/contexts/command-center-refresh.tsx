'use client';

/**
 * Command Center refresh registry.
 *
 * The studio shell has had pull-to-refresh since the gesture shipped, but the
 * platform console lives in a separate route group with none of the studio
 * chrome — so the gesture stopped at the boundary. This is the console's own
 * registry: each mounted screen registers the loader it already uses, and the
 * shell owns one gesture and one desktop button.
 *
 * Why a registry rather than a window event:
 *
 *   * A tab is mounted one at a time, so "refresh everything" means "refresh
 *     the thing on screen" — there is no hidden second loader to wake.
 *   * Handlers live in a ref, so re-registering on every render cannot churn
 *     the list, and the shell never reads stale state.
 *   * The result is observable (count + last error), which is what lets the
 *     button show a spinner and the gesture's success state mean something.
 *
 * The shell disables the gesture while a refresh is in flight, which is the
 * duplicate-request guard; each loader may additionally dedupe its own calls.
 */

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';

export type CommandCenterRefreshHandler = () => unknown | Promise<unknown>;

interface CommandCenterRefresh {
  /** Register the on-screen loader. Returns an unregister cleanup. */
  register: (handler: CommandCenterRefreshHandler) => () => void;
  /** Run every registered handler. Concurrent calls collapse into the first. */
  refreshAll: () => Promise<{ ok: number; failed: number }>;
  refreshing: boolean;
  lastRefreshedAt: number | null;
  /** How many sources failed in the most recent refresh; 0 or null when clean. */
  failed: number | null;
}

const NOOP: CommandCenterRefresh = {
  register: () => () => {},
  refreshAll: async () => ({ ok: 0, failed: 0 }),
  refreshing: false,
  lastRefreshedAt: null,
  failed: null,
};

const Ctx = createContext<CommandCenterRefresh | null>(null);

export function CommandCenterRefreshProvider({ children }: { children: React.ReactNode }) {
  const handlers = useRef(new Set<CommandCenterRefreshHandler>());
  // The promise, not a boolean: a second caller during a refresh must await
  // the SAME work and receive its real result. A boolean guard that returned
  // `{ ok: 0 }` would make a pull-to-refresh show a success tick while the
  // desktop button's request was still running — and its failure, if any,
  // would never reach the gesture.
  const inFlight = useRef<Promise<{ ok: number; failed: number }> | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<number | null>(null);
  const [failed, setFailed] = useState<number | null>(null);

  const register = useCallback((handler: CommandCenterRefreshHandler) => {
    handlers.current.add(handler);
    return () => { handlers.current.delete(handler); };
  }, []);

  const refreshAll = useCallback(() => {
    if (inFlight.current) return inFlight.current;
    const list = [...handlers.current];
    if (list.length === 0) return Promise.resolve({ ok: 0, failed: 0 });

    setRefreshing(true);
    const run = Promise.allSettled(list.map((fn) => fn()))
      .then((results) => {
        const bad = results.filter((r) => r.status === 'rejected').length;
        setLastRefreshedAt(Date.now());
        setFailed(bad);
        return { ok: results.length - bad, failed: bad };
      })
      .finally(() => {
        inFlight.current = null;
        setRefreshing(false);
      });
    inFlight.current = run;
    return run;
  }, []);

  const value = useMemo<CommandCenterRefresh>(
    () => ({ register, refreshAll, refreshing, lastRefreshedAt, failed }),
    [register, refreshAll, refreshing, lastRefreshedAt, failed],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Safe outside the provider — a page rendered in isolation gets an inert registry. */
export function useCommandCenterRefreshRegistry(): CommandCenterRefresh {
  return useContext(Ctx) ?? NOOP;
}

/**
 * Register the current screen's loader.
 *
 * The handler is kept in a ref and the registered wrapper is stable, so a
 * screen that defines `load` inline (most of them do) does not add and remove
 * itself from the Set on every render.
 */
export function useCommandCenterRefresh(handler: CommandCenterRefreshHandler): void {
  const { register } = useCommandCenterRefreshRegistry();
  const latest = useRef(handler);
  latest.current = handler;
  useEffect(() => register(() => latest.current()), [register]);
}
