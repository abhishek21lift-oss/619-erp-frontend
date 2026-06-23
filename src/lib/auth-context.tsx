'use client';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, type User, http } from './api';
import { resetRedirectLock } from './http';
import type { Role } from './roles';
export type { Role } from './roles';

interface Ctx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  loginWithPasskey: (email?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<Ctx>({
  user: null,
  loading: true,
  login: async () => {},
  loginWithGoogle: async () => {},
  loginWithPasskey: async () => {},
  logout: () => {},
});

// Minimal non-sensitive user fields stored in sessionStorage (cleared on tab close).
// Full user object (including email) remains in memory only.
const SESSION_USER_KEY = '619_user_minimal_v3';

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

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes idle timeout

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // If the user explicitly logged in during this session, skip me() result
  const loggedInRef = useRef(false);
  const initDone    = useRef(false);

  // ── Internal logout helper (shared by the public logout() and the
  //    session-expired event listener below) ────────────────────────────
  const _clearSession = useCallback(function () {
    loggedInRef.current = false;
    api.auth.logout?.().catch((_err) => console.warn('[auth] logout failed', _err));
    setUser(null);
    ssDel(SESSION_USER_KEY);
  }, []);

  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    // Restore cached user immediately — avoids blank flash on hard refresh.
    // Only id + name + role are persisted; email and other PII stay in memory.
    const cachedRaw = ssGet(SESSION_USER_KEY);
    let cachedUser: User | null = null;
    if (cachedRaw) {
      try {
        const partial = JSON.parse(cachedRaw) as { id: string; name: string; role: string };
        cachedUser = { id: partial.id, name: partial.name, role: partial.role as any, email: '' };
      } catch { ssDel(SESSION_USER_KEY); }
    }
    if (cachedUser) setUser(cachedUser);

    // Silently validate the session cookie with the server.
    // Rules:
    //   - 401 / 403  → token is genuinely invalid, clear everything
    //   - network / timeout / 5xx → keep cached session (Render cold start, etc.)
    //   - If login() already completed before me() returns, ignore me() result
    //     entirely — the fresh login data is the source of truth.
    const ac = new AbortController();
    const meTimeout = setTimeout(() => ac.abort(), 10_000);
    http<{ user: User }>('/api/auth/me', { signal: ac.signal })
      .then((res) => {
        clearTimeout(meTimeout);
        if (loggedInRef.current) return;
        if (res?.user) {
          const u = res.user as User;
          setUser(u);
          ssSet(SESSION_USER_KEY, JSON.stringify({ id: u.id, name: u.name, role: u.role }));
        } else {
          setUser(null);
          ssDel(SESSION_USER_KEY);
        }
      })
      .catch((err: unknown) => {
        clearTimeout(meTimeout);
        if (loggedInRef.current) return; // same — don't touch a freshly logged-in user
        const status = (err as { status?: number })?.status;
        if (status === 401 || status === 403) {
          setUser(null);
          ssDel(SESSION_USER_KEY);
        }
        // All other errors (network, timeout, 5xx): keep cached session silently
      })
      .finally(() => {
        // Only set loading=false here if login() hasn't already done it
        if (!loggedInRef.current) setLoading(false);
      });
  }, []);

  useEffect(() => {
    function onSessionExpired() {
      _clearSession();
      router.replace('/login');
    }
    window.addEventListener('session-expired', onSessionExpired);
    return () => window.removeEventListener('session-expired', onSessionExpired);
  }, [_clearSession, router]);

  // Idle session timeout
  useEffect(() => {
    if (!user) return;
    let idleTimer: ReturnType<typeof setTimeout>;
    function resetIdleTimer() {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        _clearSession();
        router.replace('/login');
      }, SESSION_TIMEOUT_MS);
    }
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(e => window.addEventListener(e, resetIdleTimer));
    resetIdleTimer();
    return () => {
      clearTimeout(idleTimer);
      events.forEach(e => window.removeEventListener(e, resetIdleTimer));
    };
  }, [user, _clearSession, router]);

  const login = useCallback(async function (email: string, password: string): Promise<void> {
    const data = await api.auth.login(email, password);
    resetRedirectLock();
    loggedInRef.current = true;
    const u = data.user;
    setUser(u);
    ssSet(SESSION_USER_KEY, JSON.stringify({ id: u.id, name: u.name, role: u.role }));
    setLoading(false);
  }, []);

  const loginWithGoogle = useCallback(async function (credential: string): Promise<void> {
    const data = await api.auth.googleLogin(credential);
    resetRedirectLock();
    loggedInRef.current = true;
    const u = data.user;
    setUser(u);
    ssSet(SESSION_USER_KEY, JSON.stringify({ id: u.id, name: u.name, role: u.role }));
    setLoading(false);
  }, []);

  const loginWithPasskey = useCallback(async function (email?: string): Promise<void> {
    const data = await api.webauthn.loginVerify(
      { authentication: await (async () => {
        const opts = await api.webauthn.loginOptions({ email });
        // Dynamic import keeps this hook SSR-safe
        const { default: doAuth } = await import('./webauthn-passkey-auth');
        return doAuth(opts);
      })() }
    );
    resetRedirectLock();
    loggedInRef.current = true;
    const u = data.user;
    setUser(u as User);
    ssSet(SESSION_USER_KEY, JSON.stringify({ id: u.id, name: u.name, role: u.role }));
    setLoading(false);
  }, []);

  const logout = useCallback(function (): void {
    _clearSession();
  }, [_clearSession]);

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, loginWithPasskey, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
