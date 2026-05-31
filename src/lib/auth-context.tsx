'use client';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, type User } from './api';
import { resetRedirectLock } from './http';

export type Role = 'admin' | 'manager' | 'staff' | 'trainer' | 'receptionist' | 'reception' | 'member';

interface Ctx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<Ctx>({
  user: null,
  loading: true,
  login: async () => {},
  logout: () => {},
});

const SESSION_USER_KEY = '619_user_v2';

function ssGet(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try { return localStorage.getItem(key); } catch { return null; }
}
function ssSet(key: string, val: string): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(key, val); } catch { /* quota */ }
}
function ssDel(key: string): void {
  if (typeof window === 'undefined') return;
  try { localStorage.removeItem(key); } catch { /* noop */ }
}

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

    // Restore cached user immediately — avoids blank flash on hard refresh
    const cachedRaw = ssGet(SESSION_USER_KEY);
    let cachedUser: User | null = null;
    if (cachedRaw) {
      try { cachedUser = JSON.parse(cachedRaw) as User; } catch { ssDel(SESSION_USER_KEY); }
    }
    if (cachedUser) setUser(cachedUser);

    // Silently validate the session cookie with the server.
    // Rules:
    //   - 401 / 403  → token is genuinely invalid, clear everything
    //   - network / timeout / 5xx → keep cached session (Render cold start, etc.)
    //   - If login() already completed before me() returns, ignore me() result
    //     entirely — the fresh login data is the source of truth.
    api.auth.me()
      .then((res) => {
        if (loggedInRef.current) return; // login() already set the user — don't overwrite
        if (res?.user) {
          setUser(res.user as User);
          ssSet(SESSION_USER_KEY, JSON.stringify(res.user));
        } else {
          setUser(null);
          ssDel(SESSION_USER_KEY);
        }
      })
      .catch((err: unknown) => {
        if (loggedInRef.current) return; // same — don't touch a freshly logged-in user
        const status = (err as { status?: number })?.status;
        if (status === 401 || status === 403) {
          setUser(null);
          ssDel(SESSION_USER_KEY);
        }
        // All other errors: keep cached user silently
      })
      .finally(() => {
        // Only set loading=false here if login() hasn't already done it
        if (!loggedInRef.current) setLoading(false);
      });
  }, []);

  // ── FIX (Route Integrity R-05 + R-11):
  //    Listen for the 'session-expired' CustomEvent fired by http.ts when
  //    any API call returns a 401. We handle the redirect here using the
  //    Next.js router (soft navigation) instead of window.location.href
  //    (hard reload). This eliminates:
  //      1. The race between http.ts hard-redirect and Guard.tsx soft-redirect
  //      2. The stale _redirecting=true flag — resetRedirectLock() is called
  //         inside login() so subsequent 401s will fire again correctly.
  // ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    function onSessionExpired() {
      _clearSession();
      router.replace('/login');
    }
    window.addEventListener('session-expired', onSessionExpired);
    return () => window.removeEventListener('session-expired', onSessionExpired);
  }, [_clearSession, router]);

  const login = useCallback(async function (email: string, password: string): Promise<void> {
    const data = await api.auth.login(email, password);
    // Reset the redirect lock so future 401s (e.g. from a background request
    // that was in-flight before login) will fire the session-expired event again.
    resetRedirectLock();
    // Mark that a real login happened so the background me() call is ignored
    loggedInRef.current = true;
    setUser(data.user);
    ssSet(SESSION_USER_KEY, JSON.stringify(data.user));
    // Unblock the login page redirect immediately — don't wait for me()
    setLoading(false);
  }, []);

  const logout = useCallback(function (): void {
    _clearSession();
  }, [_clearSession]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
