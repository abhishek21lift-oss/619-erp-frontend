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
import { readCachedFeatures, writeCachedFeatures } from './session-cache';

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

  // ── Seed from the last known answer, DURING render ─────────────────────────
  //
  // The bottom nav filters its tabs by these flags, and an empty map means
  // "everything visible" (see the fail-open note above). So on a cold launch
  // the bar painted five tabs and then re-laid itself out to three when this
  // fetch landed — measured at +1.0s and +2.0s on a throttled mobile profile.
  // That second of rearranging is the reported navigation instability.
  //
  // Seeding in an effect would not fix it: effects run after the commit, so
  // the wrong tab set would still paint for a frame and the bar would still
  // jump. Setting state during render is React's supported way to derive from
  // a changed input — React re-runs this component immediately and the browser
  // never sees the intermediate tree.
  //
  // Guarded on the user id so one account never paints another's map, and
  // re-seeded if the identity changes under a live provider (impersonation).
  //
  // The guard is STATE, not a ref, and that is load-bearing rather than a
  // style choice. A ref mutated during render survives a render React throws
  // away, but the setState beside it does not — so with a ref the seed fired
  // once into a discarded render and was then skipped forever, leaving the map
  // empty. Measured: the seed logged the correct cached map at +0.9s and the
  // bar still painted five tabs at +1.2s. State updates are part of the
  // render's result, so a discarded render discards them together and the
  // committed render seeds properly.
  const [seededFor, setSeededFor] = useState<string | null>(null);
  if (user && seededFor !== user.id) {
    setSeededFor(user.id);
    const cached = readCachedFeatures(user.id);
    // Not `setLoaded(true)`: this is a paint hint, not the server's answer.
    // Anything that waits on `loaded` must keep waiting for the real fetch.
    if (cached) setFeatures(cached);
  }

  useEffect(() => {
    if (!user) return;
    api.features.map()
      .then((r) => {
        const map = r.data ?? {};
        setFeatures(map);
        writeCachedFeatures(user.id, map);
        setLoaded(true);
      })
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
