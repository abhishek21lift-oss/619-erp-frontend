'use client';

/**
 * Where the Founder number comes from.
 *
 * Two sources, in order of preference:
 *
 *   1. The session. The backend puts is_founder / founder_number on the login
 *      and /me payloads, which is the right place — six surfaces render the
 *      badge and these two columns change roughly once, ever.
 *
 *   2. GET /api/subscription/status, if the session did not carry it.
 *
 * ── Why the fallback exists ────────────────────────────────────────────────
 *
 * The session half shipped to `main` and has never reached the server: every
 * deploy since has failed before it could SSH to the box. So in production the
 * session payload has no founder fields, the badge is handed `undefined`, and
 * it correctly renders nothing — for two studios that really are founders.
 *
 * /api/subscription/status has returned is_founder and founder_number since
 * 24 July. It is already deployed. Reading from it makes the badge appear
 * without waiting on the backend, and the moment the backend does deploy this
 * hook stops making the request at all, because the session answers first.
 *
 * So this is a bridge, not a second source of truth — and one that removes
 * itself. If the session is ever authoritative everywhere, the fallback
 * becomes dead code and can go.
 *
 * ── One request, not one per badge ─────────────────────────────────────────
 *
 * The badge renders in the sidebar on every screen, and on the dashboard,
 * profile, billing and team screens at once. A naive hook would fire five
 * requests per navigation. The in-flight promise and its result are held at
 * module scope, so every caller in the session shares one.
 *
 * The cache is keyed by user id rather than cleared on logout by the auth
 * layer. Having auth-context call in here would make a cycle — auth-context
 * imports this, this imports useAuth from auth-context — and it would put the
 * responsibility in the wrong place: the cache knows who it is for, so it can
 * decide for itself when it is stale.
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';

type FounderState = { userId: string; number: number | null };

/** Resolved once per signed-in user, then reused by every caller. */
let cached: FounderState | null = null;
/** The single in-flight request, so five badges do not make five calls. */
let inFlight: Promise<FounderState> | null = null;
let inFlightFor: string | null = null;

function fetchFounder(userId: string): Promise<FounderState> {
  if (cached?.userId === userId) return Promise.resolve(cached);
  if (inFlight && inFlightFor === userId) return inFlight;

  // Imported lazily rather than at module scope. This module is pulled in by
  // components all over the app, and a static import would drag the whole API
  // client into every one of their module graphs — which broke an existing
  // dashboard test that mocks @/lib/http partially. A dynamic import() keeps
  // it out of the graph until a badge actually needs a number.
  const request = import('@/lib/api')
    .then(({ api }) => api.subscription.status())
    .then((res) => {
      const n = res?.data?.founder_number;
      cached = { userId, number: typeof n === 'number' ? n : null };
      return cached;
    })
    .catch(() => {
      // A studio on the platform tier, a 401 mid-refresh, a network blip.
      // None of those mean "not a founder" with certainty, but a missing badge
      // is the safe failure: showing one to a non-founder devalues it for the
      // twenty who paid, and showing none costs a founder a decoration.
      //
      // Not cached, so the next navigation tries again rather than writing off
      // the badge for the whole session on one bad response.
      return { userId, number: null };
    })
    .finally(() => { inFlight = null; inFlightFor = null; });

  inFlight = request;
  inFlightFor = userId;
  return request;
}

/** Drops the cache. Exported for tests and for an explicit account switch. */
export function resetFounderCache() {
  cached = null;
  inFlight = null;
  inFlightFor = null;
}

/**
 * The studio's founder number, or null.
 *
 * Safe to call from anywhere — it returns null while resolving, and
 * FounderBadge renders nothing for null, so there is no flash of a wrong
 * badge and no layout shift beyond the badge appearing.
 */
export function useFounder(): number | null {
  const { user } = useAuth();
  // The session's own answer, when it has one. `is_founder` without a number
  // is not enough to render "#X/20", so the number is what gates this.
  const fromSession = typeof user?.founder_number === 'number' ? user.founder_number : null;

  const userId = user?.id ?? null;
  const [fromApi, setFromApi] = useState<number | null>(
    cached && cached.userId === userId ? cached.number : null
  );

  useEffect(() => {
    // Nothing to do if the session already knows, or if nobody is signed in.
    if (fromSession !== null || !userId) { setFromApi(null); return; }
    let alive = true;
    fetchFounder(userId).then((s) => { if (alive) setFromApi(s.number); });
    return () => { alive = false; };
    // userId, not `user`: the object identity changes on every refresh, and
    // depending on it would refetch on each one.
  }, [fromSession, userId]);

  return fromSession ?? fromApi;
}
