'use client';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { api, type User } from './api';

export type Role = 'admin' | 'manager' | 'staff' | 'trainer' | 'receptionist' | 'reception' | 'member';

const TOKEN_KEY = '619_token';

interface Ctx {
  user: User | null;
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
function lsGet(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try { return localStorage.getItem(key); } catch { return null; }
}
function lsSet(key: string, val: string): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(key, val); } catch { /* quota */ }
}
function lsDel(key: string): void {
  if (typeof window === 'undefined') return;
  try { localStorage.removeItem(key); } catch { /* noop */ }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null);
  const [token,   setToken]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const initDone = useRef(false);

  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    // Restore user from session cache to avoid flash on refresh.
    const cachedRaw = ssGet(SESSION_USER_KEY);
    let cachedUser: User | null = null;
    if (cachedRaw) {
      try { cachedUser = JSON.parse(cachedRaw) as User; } catch { ssDel(SESSION_USER_KEY); }
    }
    if (cachedUser) setUser(cachedUser);

    // Restore token from localStorage so API calls work immediately.
    const storedToken = lsGet(TOKEN_KEY);
    if (storedToken) setToken(storedToken);

    // Validate session with the server.
    api.auth.me()
      .then(res => {
        if (res?.user) {
          setUser(res.user as User);
          ssSet(SESSION_USER_KEY, JSON.stringify(res.user));
        } else {
          setUser(null);
          lsDel(TOKEN_KEY);
          ssDel(SESSION_USER_KEY);
        }
      })
      .catch(() => {
        setUser(null);
        setToken(null);
        lsDel(TOKEN_KEY);
        ssDel(SESSION_USER_KEY);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string): Promise<void> {
    const data = await api.auth.login(email, password);
    if (data.token) {
      setToken(data.token);
      lsSet(TOKEN_KEY, data.token);
    }
    setUser(data.user);
    ssSet(SESSION_USER_KEY, JSON.stringify(data.user));
  }

  function logout(): void {
    api.auth.logout?.();
    setToken(null);
    setUser(null);
    lsDel(TOKEN_KEY);
    ssDel(SESSION_USER_KEY);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
