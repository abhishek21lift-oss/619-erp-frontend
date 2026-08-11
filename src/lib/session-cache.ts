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
  clearCachedFeatures();
}

/**
 * ── The studio's last-known feature map ──
 *
 * Purely a layout stabiliser, and never an authorisation input.
 *
 * The bottom navigation filters its tabs by feature flag, and those flags
 * arrive one API round trip after the bar has already painted. Measured in a
 * throttled mobile browser profile: the bar rendered five tabs at +1.0s and
 * re-laid itself out to three at +2.0s, so every launch showed a second of the
 * navigation rearranging under the reader's thumb. Seeding from the last known
 * answer means a returning user's bar is right the first time it paints.
 *
 * Two things this deliberately is NOT:
 *
 *   · It is not a permission. The server refuses a disabled capability with
 *     403 FEATURE_DISABLED whatever this says, and `enabled()` still fails
 *     OPEN for anything it has not been told about — so a stale cache can at
 *     worst show a tab that 403s when tapped, which is exactly the failure the
 *     provider already accepts by design.
 *   · It is not identity. It holds which modules a studio has switched on —
 *     the same thing the navigation already puts on screen — and no name, no
 *     email, no token.
 *
 * localStorage rather than sessionStorage, unlike the user cache above, and
 * that difference is the whole point: the reported symptom is on a COLD
 * LAUNCH, with the app closed and reopened. sessionStorage is empty at exactly
 * that moment, so caching there would fix nothing. It is stamped with the user
 * id it was written for and never applied to anybody else, and clearCachedUser
 * drops it — so a logout, a 401 and an impersonation switch all take it too.
 */
const FEATURES_KEY = '619_features_v1';

export function readCachedFeatures(userId: string): Record<string, boolean> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(FEATURES_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { uid?: string; features?: unknown };
    // A map written for somebody else is not this studio's answer.
    if (parsed.uid !== userId || !parsed.features || typeof parsed.features !== 'object') return null;
    const out: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(parsed.features as Record<string, unknown>)) {
      if (typeof v === 'boolean') out[k] = v;
    }
    return out;
  } catch {
    return null;
  }
}

export function writeCachedFeatures(userId: string, features: Record<string, boolean>): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(FEATURES_KEY, JSON.stringify({ uid: userId, features })); } catch { /* quota */ }
}

export function clearCachedFeatures(): void {
  if (typeof window === 'undefined') return;
  try { localStorage.removeItem(FEATURES_KEY); } catch { /* noop */ }
}
