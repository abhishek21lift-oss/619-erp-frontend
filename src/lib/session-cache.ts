/**
 * The cached identity — who this tab last knew itself to be.
 *
 * ── Why this file exists ──
 *
 * AuthProvider caches a minimal user (id, name, role, studio) so a hard
 * refresh paints the header immediately instead of flashing empty for the
 * length of a /api/auth/me round trip. Two places touch that cache: the
 * provider writes and reads it, and http.ts clears it when the server says
 * 401.
 *
 * ── Why the key is per portal ──
 *
 * Trainer, member and platform sessions now coexist in one browser. A single
 * key meant the trainer's cached identity painted the member sign-in page —
 * or worse, the member dashboard's first frame — until /me answered. One key
 * per door, so a tab only ever restores the identity of the door it is on.
 *
 * ── What may be cached ──
 *
 * Non-sensitive display fields only — id, name, role, studio name and logo,
 * founder flag. No email, no phone, no anything a screenshot of the DOM
 * shouldn't already show. And sessionStorage, not localStorage: the cache is
 * a paint optimisation for one tab's lifetime, not a credential to keep.
 */
import type { Portal } from './portals';

/** Base key. The portal is appended by cachedUserKey(). */
export const SESSION_USER_KEY = '619_user_minimal_v3';

function cachedUserKey(portal: Portal): string {
  return `${SESSION_USER_KEY}.${portal}`;
}

/** Read the cached user JSON for a portal, or null. */
export function readCachedUser(portal: Portal = 'trainer'): string | null {
  if (typeof window === 'undefined') return null;
  try { return sessionStorage.getItem(cachedUserKey(portal)); } catch { return null; }
}

/** Cache the minimal user JSON for a portal. Ignores a full/blocked store. */
export function writeCachedUser(json: string, portal: Portal = 'trainer'): void {
  if (typeof window === 'undefined') return;
  try { sessionStorage.setItem(cachedUserKey(portal), json); } catch { /* quota */ }
}

/**
 * Forget one portal's cached user, or every portal's when no portal is given.
 *
 * Called on logout, on a 401, and when impersonation starts or ends. Clearing
 * all without an argument is deliberate for those "identity may be wrong"
 * moments; a normal session check clears only the door it asked about.
 */
export function clearCachedUser(portal?: Portal): void {
  if (typeof window === 'undefined') return;
  try {
    if (portal) {
      sessionStorage.removeItem(cachedUserKey(portal));
      return;
    }
    for (const key of ['trainer', 'member', 'platform'] as Portal[]) {
      sessionStorage.removeItem(cachedUserKey(key));
    }
  } catch { /* noop */ }
}
