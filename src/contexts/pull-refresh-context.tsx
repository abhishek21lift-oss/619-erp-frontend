'use client';

/**
 * Pull-to-refresh registry.
 *
 * A single global PullToRefresh lives in AppShell so every in-app page gets
 * the gesture for free. Some pages already wrap their own content in a
 * PullToRefresh with a targeted refetch (`loadData`). To avoid two gestures
 * firing at once, each *local* PullToRefresh registers itself here on mount;
 * the global instance disables itself whenever at least one local one is
 * present, letting the page own the gesture on its own route.
 */

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

interface PullRefreshRegistry {
  /** True when at least one page-level PullToRefresh is mounted. */
  localActive: boolean;
  /** Register a page-level PullToRefresh. Returns an unregister cleanup. */
  registerLocal: () => () => void;
}

const NOOP_REGISTRY: PullRefreshRegistry = {
  localActive: false,
  registerLocal: () => () => {},
};

const PullRefreshContext = createContext<PullRefreshRegistry | null>(null);

export function PullRefreshRegistryProvider({ children }: { children: React.ReactNode }) {
  const [count, setCount] = useState(0);

  const registerLocal = useCallback(() => {
    setCount((c) => c + 1);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      setCount((c) => Math.max(0, c - 1));
    };
  }, []);

  const value = useMemo<PullRefreshRegistry>(
    () => ({ localActive: count > 0, registerLocal }),
    [count, registerLocal],
  );

  return <PullRefreshContext.Provider value={value}>{children}</PullRefreshContext.Provider>;
}

/** Safe to call outside a provider — returns an inert registry. */
export function usePullRefreshRegistry(): PullRefreshRegistry {
  return useContext(PullRefreshContext) ?? NOOP_REGISTRY;
}
