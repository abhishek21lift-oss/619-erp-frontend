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

const DEFAULT_API_BASE = 'http://localhost:5000';

function apiBase(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL ?? '').trim().replace(/\/+$/, '');
  const resolved = raw || DEFAULT_API_BASE;

  if (/your-619-api\.onrender\.com/i.test(resolved)) {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return DEFAULT_API_BASE;
    }
    throw new Error('NEXT_PUBLIC_API_URL is still the placeholder URL.');
  }

  try {
    const url = new URL(resolved);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('bad protocol');
    return url.origin;
  } catch {
    try { return new URL('http://' + resolved).origin; } catch { /* fall through */ }
    throw new Error(`Invalid NEXT_PUBLIC_API_URL: "${raw}"`);
  }
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
  ttl?:         number;       // cache TTL in ms (GET only)
  cacheMs?:     number;       // alias for ttl
  retries?:     number;       // retry count on network error (GET only, default 2)
  signal?:      AbortSignal;
  skipAuth?:    boolean;
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
        msg  = (p.message ?? p.error ?? msg) as string;
        code = p.code as string | undefined;
      }
    } catch { /* ignore parse error */ }
    throw new ApiError(msg, res.status, code, payload);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function http<T = unknown>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const BASE = apiBase(); // lazy evaluation
  const url  = path.startsWith('http') ? path : `${BASE}${path}`;
  const method = (options.method ?? 'GET').toUpperCase();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (!options.skipAuth) {
    let token: string | null = null;
    try { token = localStorage.getItem('619_token'); } catch { /* SSR */ }
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const cacheKey = method === 'GET' ? url : '';
  const effectiveTtl = options.ttl ?? options.cacheMs;

  // ── Cache hit ──
  if (cacheKey && effectiveTtl) {
    const hit = cache.get(cacheKey);
    if (hit && hit.expiresAt > Date.now()) return hit.data as T;
  }

  const init: RequestInit = {
    ...options,
    method,
    headers,
    signal: options.signal,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  };

  // ── In-flight dedup (GET only) ──
  if (method === 'GET' && cacheKey) {
    const existing = inflight.get(cacheKey);
    if (existing) return existing as Promise<T>;
  }

  // ── Retry logic (GET only) ──
  const maxRetries = method === 'GET' ? (options.retries ?? 2) : 0;
  let attempt = 0;

  const doFetch = async (): Promise<T> => {
    try {
      const result = await fetchOnce<T>(url, init);
      if (cacheKey && effectiveTtl) {
        cache.set(cacheKey, { data: result, expiresAt: Date.now() + effectiveTtl });
      }
      return result;
    } catch (err) {
      if (err instanceof ApiError) throw err; // don't retry 4xx/5xx
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

  const promise = doFetch();
  if (method === 'GET' && cacheKey) inflight.set(cacheKey, promise as Promise<unknown>);
  return promise;
}

export const request = http;
export default http;
