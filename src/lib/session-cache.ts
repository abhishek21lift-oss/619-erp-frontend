/**
 * The cached identity — who this tab last knew itself to be.
 *
 * ── Why this file exists ──
 *
 * AuthProvider caches a minimal user (id, name, role, studio) so a hard
 * refresh paints the header immediately instead of flashing empty for the
 * length of a /api/auth/me round trip. Two places touch that cache: the
 * provider writes and reads it, and http.ts clears it when the server says
 * 401. They each declared their own constant, and the constants disagreed:
 *
 *   auth-context.tsx  '619_user_minimal_v3'  in sessionStorage
 *   http.ts           '619_user_v2'          in localStorage
 *
 * Different key AND different storage, so handleUnauthorized() was removing
 * something nobody had ever written. A dead session left the cached user in
 * place, and the next mount restored it and rendered as that person until
 * /api/auth/me came back. This is the same duplication that broke the
 * activation link twice (see public-paths.ts) — one idea, two copies, and
 * only one of them maintained.
 *
 * So the key and the three accessors live here and both sides import them.
 *
 * ── What may be cached ──
 *
 * Non-sensitive display fields only — id, name, role, studio name and logo,
 * founder flag. No email, no phone, no anything a screenshot of the DOM
 * shouldn't already show. And sessionStorage, not localStorage: the cache is
 * a paint optimisation for one tab's lifetime, not a credential to keep.
 */

/** Where AuthProvider caches the minimal user. The only copy of this string. */
export const SESSION_USER_KEY = '619_user_minimal_v3';

/** Read the cached user JSON, or null. Safe on the server and in private mode. */
export function readCachedUser(): string | null {
  if (typeof window === 'undefined') return null;
  try { return sessionStorage.getItem(SESSION_USER_KEY); } catch { return null; }
}

/** Cache the minimal user JSON. Silently ignores a full/blocked store. */
export function writeCachedUser(json: string): void {
  if (typeof window === 'undefined') return;
  try { sessionStorage.setItem(SESSION_USER_KEY, json); } catch { /* quota */ }
}

/**
 * Forget the cached user.
 *
 * Called on logout, on a 401, and when impersonation starts or ends. Every
 * one of those means "the person this tab thinks it is may be wrong" — so
 * this must clear the identity the provider actually wrote, which is the
 * whole reason the key is not declared twice.
 */
export function clearCachedUser(): void {
  if (typeof window === 'undefined') return;
  try { sessionStorage.removeItem(SESSION_USER_KEY); } catch { /* noop */ }
}
