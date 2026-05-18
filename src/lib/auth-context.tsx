'use client';
/**
 * auth-context.tsx — Secure cookie-based authentication
 *
 * ROOT CAUSE (Issue #2 / Security):
 *   Storing JWT in localStorage exposes the token to any XSS payload running
 *   in the same origin — a single injected <script> can exfiltrate it.
 *
 * FIX:
 *   - The JWT is stored in an httpOnly cookie set by the backend on /api/auth/login.
 *     JS code never touches the raw token string.
 *   - `token` is kept in React state *only* as a boolean-equivalent signal (non-null
 *     means authenticated); the actual bearer value travels in the Cookie header
 *     automatically on every same-origin fetch — no manual Authorization header needed.
 *   - For backends that still return a token body (hybrid deployments), the token
 *     is kept in memory only (never persisted to storage) as a bearer fallback.
 *   - User profile is cached in sessionStorage (XSS-readable but NOT the auth secret;
 *     losing it on tab close is acceptable — we re-validate from /api/auth/me).
 *   - All localStorage calls are removed.
 *
 * MIGRATION:
 *   Backend must set: Set-Cookie: token=<jwt>; HttpOnly; Secure; SameSite=Strict; Path=/
 *   If your backend can't yet do this, the in-memory token fallback ensures nothing breaks.
 */
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { api, User } from './api';

// ─── Role union (Issue #19) ───────────────────────────────────────────
export type Role = 'admin' | 'staff' | 'trainer' | 'receptionist';

interface Ctx {
  user: User | null;
  /** In-memory token — only populated for hybrid backends that return it in body */
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<Ctx>({
  user: null,
  token: null,
  loading: true,
  login: async () => {},
  logout: () => {},
});

// ─── sessionStorage helpers (user profile cache only — never the token) ──
const SESSION_USER_KEY = '619_user_v2';

function ssGet(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try { return sessionStorage.getItem(key); } catch { return null; }
}
function ssSet(key: string, val: string): void {
  if (typeof window === 'undefined') return;
  try { sessionStorage.setItem(key, val); } catch { /* quota */ }
}
function ssDel(key: string): void {
  if (typeof window === 'undefined') return;
  try { sessionStorage.removeItem(key); } catch { /* noop */ }
}

// ─── Legacy localStorage cleanup (one-time migration) ────────────────────
function clearLegacyStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('619_token');
    localStorage.removeItem('619_user');
  } catch { /* already gone or SSR */ }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null);
  const [token,   setToken]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const initDone = useRef(false);

  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    // One-time migration: remove old localStorage tokens from previous versions.
    clearLegacyStorage();

    // Attempt to restore user from session cache (avoids flash on refresh).
    const cachedRaw = ssGet(SESSION_USER_KEY);
    let cachedUser: User | null = null;
    if (cachedRaw) {
      try { cachedUser = JSON.parse(cachedRaw) as User; } catch { ssDel(SESSION_USER_KEY); }
    }
    if (cachedUser) setUser(cachedUser);

    // Always validate with the server — cookie is sent automatically.
    // If the server returns 401 the cookie has expired or was cleared.
    api.auth.me()
      .then(res => {
        if (res?.user) {
          setUser(res.user as User);
          ssSet(SESSION_USER_KEY, JSON.stringify(res.user));
        } else {
          setUser(null);
          ssDel(SESSION_USER_KEY);
        }
      })
      .catch(() => {
        // 401 / network error — clear stale cache, let Guard redirect to /login
        setUser(null);
        setToken(null);
        ssDel(SESSION_USER_KEY);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string): Promise<void> {
    const data = await api.auth.login(email, password);
    // The backend sets an httpOnly cookie — we do NOT store data.token in LS.
    // Keep it in memory only as a fallback for hybrid backends.
    if (data.token) setToken(data.token);
    setUser(data.user);
    ssSet(SESSION_USER_KEY, JSON.stringify(data.user));
  }

  function logout(): void {
    api.auth.logout?.();
    setToken(null);
    setUser(null);
    ssDel(SESSION_USER_KEY);
    clearLegacyStorage();
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
