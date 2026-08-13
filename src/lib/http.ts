// src/lib/http.ts
//
// Hardened fetch wrapper. apiBase() is LAZY — evaluated at call time,
// not at module init — to prevent SSR crashes when the env var is absent.
//
// Adds:
//   - Typed ApiError with status + code
//   - In-flight request deduplication (no double-fetch on rapid mounts)
//   - In-memory cache with per-call TTL (idempotent GETs only)
//   - AbortSignal support so unmounting cancels the request
//   - Tiny exponential backoff retry for network blips on GET
//   - Global 401 handler: fires a 'session-expired' CustomEvent instead of
//     hard-navigating via window.location.href. AuthProvider listens to this
//     event, clears state, and uses the Next.js router for a soft redirect.

import { SESSIONLESS_PAGES } from './public-paths';
import { clearCachedUser } from './session-cache';

export function apiBase(): string {
  if (typeof window === 'undefined') {
    // SSR: use the configured URL directly (server-to-server, no proxy needed)
    const raw = (process.env.NEXT_PUBLIC_API_URL ?? '').trim().replace(/\/+$/, '');
    return raw;
  }

  const hostname = window.location.hostname;

  // Any non-localhost hostname is the deployed app, served from the VPS behind
  // nginx. nginx routes myptstudio.com to the frontend container and that
  // container's Next.js rewrite forwards /api/* to the backend, so a
  // same-origin relative URL works and needs no CORS.
  //
  // Note this path CANNOT carry a WebSocket: the Next.js rewrite hop does not
  // proxy an Upgrade. See wsBase() below.
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    return '';
  }

  // Local development (web browser on localhost)
  const raw = (process.env.NEXT_PUBLIC_API_URL ?? '').trim().replace(/\/+$/, '');
  if (!raw) {
    throw new Error(
      '[619-erp] NEXT_PUBLIC_API_URL is not set. ' +
      'Copy .env.example to .env.local and set NEXT_PUBLIC_API_URL=http://localhost:5000'
    );
  }
  return raw;
}

/**
 * The WebSocket origin, derived from `NEXT_PUBLIC_API_URL`.
 *
 * ── Why this is not simply `apiBase()` ──────────────────────────────────────
 *
 * Ordinary API calls go same-origin and are forwarded by the frontend
 * container's Next.js rewrite. That hop is an HTTP proxy and does NOT carry a
 * WebSocket Upgrade, so `wss://myptstudio.com/...` would be dropped before it
 * ever reached nginx. A WebSocket has to address the backend directly:
 *
 *   API calls   browser → nginx → frontend container → rewrite → backend
 *   WebSocket   browser → nginx ────────────────────────────────→ backend
 *
 * Both hostnames resolve to the same VPS; nginx routes on the Host header.
 *
 * ── One source of truth ─────────────────────────────────────────────────────
 *
 * The scheme is swapped rather than read from a second variable, so a domain
 * change is one env edit and the two can never disagree. https → wss, http →
 * ws, which also means a plaintext dev backend does not silently get asked for
 * a secure socket.
 *
 * Returns '' when nothing is configured; callers treat that as "no realtime
 * transport available" and stay on polling rather than guessing a URL.
 */
export function wsBase(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL ?? '').trim().replace(/\/+$/, '');
  if (!raw) return '';
  if (raw.startsWith('https://')) return `wss://${raw.slice('https://'.length)}`;
  if (raw.startsWith('http://')) return `ws://${raw.slice('http://'.length)}`;
  // A protocol-relative or bare host. Infer from how the page itself was
  // loaded: a secure page cannot open an insecure socket, and browsers block it.
  if (typeof window !== 'undefined') {
    return `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${raw.replace(/^\/\//, '')}`;
  }
  return '';
}

// ──────────────────────────────────────────────────────────────────────
//  ApiError
// ──────────────────────────────────────────────────────────────────────
export class ApiError extends Error {
  status: number;
  code?: string;
  payload?: unknown;

  constructor(message: string, status: number, code?: string, payload?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.payload = payload;
  }

  get isAuth()      { return this.status === 401; }
  get isForbidden() { return this.status === 403; }
  get isNotFound()  { return this.status === 404; }
  get isServer()    { return this.status >= 500; }
}

// ──────────────────────────────────────────────────────────────────────
//  In-flight deduplication + in-memory cache
// ──────────────────────────────────────────────────────────────────────
const inflight = new Map<string, Promise<unknown>>();
interface CacheEntry { data: unknown; expiresAt: number; }
const cache    = new Map<string, CacheEntry>();

// ──────────────────────────────────────────────────────────────────────
//  Options
// ──────────────────────────────────────────────────────────────────────
export interface FetchOptions extends Omit<RequestInit, 'body'> {
  body?:        unknown;
  ttl?:         number;
  cacheMs?:     number;
  retries?:     number;
  signal?:      AbortSignal;
  skipAuth?:    boolean;
  /**
   * Send as the operator's own session rather than as the impersonated studio
   * admin — i.e. do not attach the impersonation Bearer.
   *
   * Exists for exactly one call: ending an impersonation session. That endpoint
   * lives under /api/super-admin and is guarded by requireSuperAdmin, so sending
   * the impersonation token would authenticate as a studio admin and be refused
   * — correctly, but for the wrong reason, and the session would then never be
   * recorded as ended.
   */
  asOperator?:  boolean;
}

// ──────────────────────────────────────────────────────────────────────
//  Platform org-switcher: a super_admin can pin requests to one tenant org
//  by selecting it in the OrgSwitcher (persisted under ACTIVE_ORG_KEY). We
//  forward it as the `x-org-id` header the backend's tenantScope() reads.
//  The backend IGNORES this header for every non-super_admin, so a tenant
//  user setting it cannot escape their own org — it is purely an operator
//  convenience. Read lazily per request so a switch takes effect immediately.
// ──────────────────────────────────────────────────────────────────────
export const ACTIVE_ORG_KEY = '619_active_org';

function activeOrgHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const id = localStorage.getItem(ACTIVE_ORG_KEY);
    return id ? { 'x-org-id': id } : {};
  } catch { return {}; }
}

// ──────────────────────────────────────────────────────────────────────
//  Impersonation: a super_admin can enter a studio as its admin. The
//  platform mints a short-lived READ-ONLY access token; we send it as a
//  Bearer header (which the backend reads BEFORE the cookie), so the
//  operator's own super-admin cookie session stays intact underneath.
//  Exiting is just clearing the token — no re-login. Stored in
//  sessionStorage so it never outlives the tab.
// ──────────────────────────────────────────────────────────────────────
export const IMPERSONATION_KEY = '619_impersonation';

export type StoredImpersonation = {
  token: string;
  readonly: boolean;
  adminId: string;
  adminName: string;
  orgId: string;
  orgName: string;
  orgLogo?: string | null;
  /** Ties this session's start, writes and end together in the audit log. */
  jti?: string;
};

export function getImpersonation(): StoredImpersonation | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(IMPERSONATION_KEY);
    return raw ? (JSON.parse(raw) as StoredImpersonation) : null;
  } catch { return null; }
}

export function setImpersonation(s: StoredImpersonation): void {
  try { sessionStorage.setItem(IMPERSONATION_KEY, JSON.stringify(s)); } catch { /* noop */ }
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('impersonation-changed'));
}

export function clearImpersonation(): void {
  try { sessionStorage.removeItem(IMPERSONATION_KEY); } catch { /* noop */ }
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('impersonation-changed'));
}

function isFormDataBody(body: unknown): body is FormData {
  return typeof FormData !== 'undefined' && body instanceof FormData;
}

function serializeBody(body: unknown): BodyInit | undefined {
  if (body === undefined || body === null) return undefined;
  if (typeof body === 'string') return body;
  if (
    isFormDataBody(body) ||
    body instanceof Blob ||
    body instanceof URLSearchParams ||
    body instanceof ArrayBuffer
  ) {
    return body;
  }
  return JSON.stringify(body);
}

// ──────────────────────────────────────────────────────────────────────
//  Global 401 handler + token refresh
// ──────────────────────────────────────────────────────────────────────
let _redirecting = false;

/** Reset the redirect lock — called by AuthProvider after login() succeeds. */
export function resetRedirectLock(): void {
  _redirecting = false;
}

// Imported, not re-declared. This previously read
// `['/', '/login', '/reset-password']` and omitted every token link but one,
// so a client on /client/activate saw the page for half a second and was then
// redirected to /login — with the ?token= dropped, destroying the credential.
// See src/lib/public-paths.ts for why there is now a single source.
const PUBLIC_CLIENT_PATHS: readonly string[] = SESSIONLESS_PAGES;

function handleUnauthorized(): void {
  if (typeof window === 'undefined' || _redirecting) return;
  if (PUBLIC_CLIENT_PATHS.includes(window.location.pathname)) return;
  _redirecting = true;
  // Imported, not re-declared. This used to remove '619_user_v2' from
  // localStorage while AuthProvider was writing '619_user_minimal_v3' to
  // sessionStorage — wrong key, wrong store, so a 401 left the previous
  // person's identity cached and the next mount painted as them.
  clearCachedUser();
  window.dispatchEvent(new CustomEvent('session-expired'));
}

// A frozen/expired studio (HTTP 402 SUBSCRIPTION_INACTIVE) is sent to the
// subscription screen. Guarded so it never loops while already there.
function handleSubscriptionInactive(): void {
  if (typeof window === 'undefined') return;
  if (window.location.pathname.startsWith('/subscription')) return;
  window.location.href = '/subscription';
}

// In-flight refresh promise — deduplicates concurrent 401 retries
let _refreshPromise: Promise<boolean> | null = null;

// Renew the access token via the rotating refresh-token cookie. Resilient to
// transient failures: a 401 means the refresh token is genuinely gone (give up
// → the caller logs out), but a network error or 5xx is treated as transient
// — e.g. a free-tier backend cold-starting after idle — and retried with
// backoff so a momentary blip doesn't force a full re-login.
function tryRefreshToken(): Promise<boolean> {
  if (_refreshPromise) return _refreshPromise;
  const BASE = (() => { try { return apiBase(); } catch { return ''; } })();
  _refreshPromise = (async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const r = await fetch(`${BASE}/api/auth/refresh`, { method: 'POST', credentials: 'include' });
        if (r.ok) return true;
        if (r.status === 401 || r.status === 403) return false; // truly unauthenticated
        // 5xx / other → transient, fall through to retry
      } catch { /* network error (e.g. cold start) → retry */ }
      if (attempt < 2) await new Promise((res) => setTimeout(res, 600 * 2 ** attempt));
    }
    return false;
  })().finally(() => { _refreshPromise = null; });
  return _refreshPromise;
}

/** Proactively renew the session (access token) — called on an interval and on
 *  tab re-focus by the auth provider so long-open sessions never lapse. */
export function refreshSession(): Promise<boolean> {
  return tryRefreshToken();
}

// ──────────────────────────────────────────────────────────────────────
//  Core
// ──────────────────────────────────────────────────────────────────────
async function fetchOnce<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, init);

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    let code: string | undefined;
    let payload: unknown;
    try {
      payload = await res.json();
      if (payload && typeof payload === 'object') {
        const p = payload as Record<string, unknown>;
        const errField = p.error;
        if (errField && typeof errField === 'object') {
          const nested = errField as Record<string, unknown>;
          msg  = (nested.message ?? msg) as string;
          code = nested.code as string | undefined;
        } else {
          msg  = (p.message ?? p.error ?? msg) as string;
          code = p.code as string | undefined;
        }
      }
    } catch { /* ignore parse error */ }

    // 402 = the studio's subscription/trial has lapsed — bounce to the
    // subscription screen (which stays reachable via the backend allowlist).
    if (res.status === 402 && code === 'SUBSCRIPTION_INACTIVE') handleSubscriptionInactive();

    // 401 handling is done by http() after attempting a token refresh — not here
    throw new ApiError(msg, res.status, code, payload);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function http<T = unknown>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const BASE = apiBase();
  const url  = path.startsWith('http') ? path : `${BASE}${path}`;
  const method = (options.method ?? 'GET').toUpperCase();

  const ttl = options.ttl ?? options.cacheMs;

  const body = serializeBody(options.body);
  const isMultipart = isFormDataBody(options.body);
  // While impersonating, the Bearer token IS the identity (that studio's admin),
  // so the operator's org-switcher header is suppressed — the org is implicit.
  const imp = options.asOperator ? null : getImpersonation();
  const headers: Record<string, string> = {
    ...(!isMultipart && body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    ...(imp ? { Authorization: `Bearer ${imp.token}` } : activeOrgHeader()),
    ...(options.headers as Record<string, string> | undefined),
  };

  // The active-org selection (or impersonated identity) scopes results, so it
  // must be part of the GET cache key — otherwise switching orgs, or exiting
  // impersonation, would serve the previous identity's cached data.
  const cacheKey = method === 'GET' ? `${imp ? `imp:${imp.adminId}` : headers['x-org-id'] ?? ''}|${url}` : '';

  if (cacheKey && ttl) {
    const hit = cache.get(cacheKey);
    if (hit && hit.expiresAt > Date.now()) return hit.data as T;
  }

  const init: RequestInit = {
    ...options,
    method,
    headers,
    credentials: 'include',
    signal: options.signal,
    body,
  };

  if (method === 'GET' && cacheKey) {
    const existing = inflight.get(cacheKey);
    if (existing) return existing as Promise<T>;
  }

  const maxRetries = method === 'GET' ? (options.retries ?? 2) : 0;
  let attempt = 0;

  const doFetch = async (): Promise<T> => {
    try {
      const result = await fetchOnce<T>(url, init);
      if (cacheKey && ttl) {
        cache.set(cacheKey, { data: result, expiresAt: Date.now() + ttl });
      }
      return result;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      if (attempt < maxRetries) {
        attempt++;
        await new Promise(r => setTimeout(r, 300 * 2 ** (attempt - 1)));
        return doFetch();
      }
      throw err;
    } finally {
      if (cacheKey) inflight.delete(cacheKey);
    }
  };

  // Wrap doFetch with 401→refresh→retry logic (skipAuth skips the refresh attempt)
  const doFetchWithRefresh = async (): Promise<T> => {
    try {
      return await doFetch();
    } catch (err) {
      if (!(err instanceof ApiError) || err.status !== 401) throw err;

      // An impersonation token can't be refreshed via the operator's cookie
      // (that would refresh the super-admin, not the studio admin). A 401 here
      // means the read-only session expired — exit impersonation cleanly and
      // let the UI drop back to the platform.
      {
        // Captured BEFORE the clear: the listener needs the session's identity
        // to record that it ended, and clearImpersonation() destroys it.
        const expiring = getImpersonation();
        if (expiring) {
          clearImpersonation();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('impersonation-expired', {
              detail: { orgId: expiring.orgId, adminId: expiring.adminId, jti: expiring.jti },
            }));
          }
          throw err;
        }
      }

      if (options.skipAuth) { handleUnauthorized(); throw err; }

      const refreshed = await tryRefreshToken();
      if (!refreshed) { handleUnauthorized(); throw err; }

      // One retry after successful token refresh
      try {
        return await doFetch();
      } catch (retryErr) {
        if (retryErr instanceof ApiError && retryErr.status === 401) handleUnauthorized();
        throw retryErr;
      }
    }
  };

  const promise = doFetchWithRefresh();
  if (method === 'GET' && cacheKey) inflight.set(cacheKey, promise as Promise<unknown>);
  return promise;
}

export const request = http;
export default http;

// ──────────────────────────────────────────────────────────────────────
//  SSE helper — for endpoints that stream Server-Sent Events while the
//  AI processes, then emit a final `data: {"type":"done",...}` event.
//  Reads the full SSE body as text, skips keepalive lines, parses the
//  "done" event, and returns its payload with the same shape as http().
// ──────────────────────────────────────────────────────────────────────
export async function httpSSE<T = unknown>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const BASE = apiBase();
  const url  = path.startsWith('http') ? path : `${BASE}${path}`;
  const method = (options.method ?? 'POST').toUpperCase();

  const body = serializeBody(options.body);
  const isMultipart = isFormDataBody(options.body);
  const impSSE = getImpersonation();
  const headers: Record<string, string> = {
    ...(!isMultipart && body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    ...(impSSE ? { Authorization: `Bearer ${impSSE.token}` } : activeOrgHeader()),
    ...(options.headers as Record<string, string> | undefined),
  };

  const init: RequestInit = {
    ...options,
    method,
    headers,
    credentials: 'include',
    signal: options.signal,
    body,
  };

  const doFetch = async (): Promise<T> => {
    const res = await fetch(url, init);

    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      let code: string | undefined;
      let payload: unknown;
      try {
        payload = await res.json();
        if (payload && typeof payload === 'object') {
          const p = payload as Record<string, unknown>;
          const errField = p.error;
          if (errField && typeof errField === 'object') {
            const nested = errField as Record<string, unknown>;
            msg  = (nested.message ?? msg) as string;
            code = nested.code as string | undefined;
          } else {
            msg  = (p.message ?? p.error ?? msg) as string;
            code = p.code as string | undefined;
          }
        }
      } catch { /* ignore */ }
      throw new ApiError(msg, res.status, code, payload);
    }

    const text = await res.text();
    for (const line of text.split('\n')) {
      if (!line.startsWith('data: ')) continue;
      const jsonStr = line.slice('data: '.length).trim();
      if (!jsonStr) continue;
      let event: Record<string, unknown>;
      try { event = JSON.parse(jsonStr); } catch { continue; }
      if (event.type === 'error') {
        throw new ApiError((event.message as string) ?? 'AI generation failed', 500);
      }
      if (event.type === 'done') {
        return event as unknown as T;
      }
    }

    throw new ApiError('No result received from AI generation', 500);
  };

  try {
    return await doFetch();
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 401) throw err;
    if (options.skipAuth) { handleUnauthorized(); throw err; }
    const refreshed = await tryRefreshToken();
    if (!refreshed) { handleUnauthorized(); throw err; }
    try {
      return await doFetch();
    } catch (retryErr) {
      if (retryErr instanceof ApiError && retryErr.status === 401) handleUnauthorized();
      throw retryErr;
    }
  }
}
