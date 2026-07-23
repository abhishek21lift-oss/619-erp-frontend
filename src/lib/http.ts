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

export function apiBase(): string {
  if (typeof window === 'undefined') {
    // SSR: use the configured URL directly (server-to-server, no proxy needed)
    const raw = (process.env.NEXT_PUBLIC_API_URL ?? '').trim().replace(/\/+$/, '');
    return raw;
  }

  const hostname = window.location.hostname;

  // Non-localhost hostname (e.g. the live Vercel domain) — same-origin
  // fetch works, return '' (relative URLs).
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
const SESSION_USER_KEY = '619_user_v2';
let _redirecting = false;

/** Reset the redirect lock — called by AuthProvider after login() succeeds. */
export function resetRedirectLock(): void {
  _redirecting = false;
}

const PUBLIC_CLIENT_PATHS = ['/', '/login', '/reset-password'];

function handleUnauthorized(): void {
  if (typeof window === 'undefined' || _redirecting) return;
  if (PUBLIC_CLIENT_PATHS.includes(window.location.pathname)) return;
  _redirecting = true;
  try { localStorage.removeItem(SESSION_USER_KEY); } catch { /* noop */ }
  window.dispatchEvent(new CustomEvent('session-expired'));
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
  const headers: Record<string, string> = {
    ...(!isMultipart && body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    ...activeOrgHeader(),
    ...(options.headers as Record<string, string> | undefined),
  };

  // The active-org selection scopes results, so it must be part of the GET
  // cache key — otherwise switching orgs would serve the previous org's cache.
  const cacheKey = method === 'GET' ? `${headers['x-org-id'] ?? ''}|${url}` : '';

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
  const headers: Record<string, string> = {
    ...(!isMultipart && body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    ...activeOrgHeader(),
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
