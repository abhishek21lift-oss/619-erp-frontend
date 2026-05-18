'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, User } from './api';

interface Ctx {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<Ctx>({
  user: null, token: null, loading: true,
  login: async () => {}, logout: () => {},
});

// Safe localStorage helpers — silently fail on SSR or quota exceeded
function lsGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function lsSet(key: string, val: string): void {
  try { localStorage.setItem(key, val); } catch { /* quota exceeded or SSR */ }
}
function lsDel(key: string): void {
  try { localStorage.removeItem(key); } catch { /* SSR */ }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null);
  const [token,   setToken]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = lsGet('619_token');
    const u = lsGet('619_user');

    if (!t || !u) { setLoading(false); return; }

    let parsed: User | null = null;
    try { parsed = JSON.parse(u) as User; } catch {
      lsDel('619_token'); lsDel('619_user');
      setLoading(false); return;
    }

    setToken(t);
    setUser(parsed);

    // Validate the token and refresh the user record from the server.
    // If the JWT has expired / been rotated, clear credentials and redirect.
    api.auth.me()
      .then(res => {
        if (res?.user) {
          setUser(res.user as User);
          lsSet('619_user', JSON.stringify(res.user));
        }
      })
      .catch(() => {
        lsDel('619_token');
        lsDel('619_user');
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const data = await api.auth.login(email, password);
    setToken(data.token);
    setUser(data.user);
    lsSet('619_token', data.token);
    lsSet('619_user', JSON.stringify(data.user));
  }

  function logout() {
    // Fire-and-forget server-side logout (invalidate token if backend supports it)
    api.auth.logout?.();
    setToken(null);
    setUser(null);
    lsDel('619_token');
    lsDel('619_user');
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
