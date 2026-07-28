'use client';

// The studio's own feature flags, fetched once per session and shared.
//
// This is the client half of the Control Centre's Feature Manager: the backend
// already refuses a disabled capability with 403 FEATURE_DISABLED, so nothing
// here is a security boundary. Its only job is to stop the nav advertising a
// panel that would 403 when tapped.
//
// EVERYTHING FAILS OPEN. `enabled()` answers false only when the server said
// so explicitly; an empty map, a failed fetch, a key nobody has heard of, or
// the moment before the first response all answer true. That is deliberate and
// matches requireFeature() on the server: a network blip or a typo in a key
// must never take a working page away from a studio. The cost of failing open
// is a nav item that 403s — visible and recoverable. The cost of failing
// closed is a studio that silently loses half its product.

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './auth-context';
import { api } from './api';

interface FeaturesCtx {
  /** True unless the server explicitly disabled this key for this studio. */
  enabled: (key?: string) => boolean;
  features: Record<string, boolean>;
  loaded: boolean;
}

const Ctx = createContext<FeaturesCtx>({
  enabled: () => true,
  features: {},
  loaded: false,
});

export function FeaturesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.features.map()
      .then((r) => { setFeatures(r.data ?? {}); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, [user]);

  // Untagged items pass through: most of the nav has no feature key at all,
  // and those must stay visible.
  const enabled = (key?: string): boolean => (key ? features[key] !== false : true);

  return <Ctx.Provider value={{ enabled, features, loaded }}>{children}</Ctx.Provider>;
}

export function useFeatures() {
  return useContext(Ctx);
}
