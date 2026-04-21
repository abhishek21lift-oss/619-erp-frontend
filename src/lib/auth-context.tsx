'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, User } from './api';

interface Ctx {
  user: User | null; token: string | null; loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}
const AuthContext = createContext<Ctx>({ user:null, token:null, loading:true, login:async()=>{}, logout:()=>{} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]     = useState<User|null>(null);
  const [token, setToken]   = useState<string|null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem('619_token');
    const u = localStorage.getItem('619_user');
    if (t && u) {
      try { setToken(t); setUser(JSON.parse(u)); } catch {
        localStorage.removeItem('619_token');
        localStorage.removeItem('619_user');
      }
    }
    setLoading(false);
  }, []);

  async function login(email: string, password: string) {
    const data = await api.auth.login(email, password);
    setToken(data.token); setUser(data.user);
    localStorage.setItem('619_token', data.token);
    localStorage.setItem('619_user', JSON.stringify(data.user));
  }

  function logout() {
    setToken(null); setUser(null);
    localStorage.removeItem('619_token');
    localStorage.removeItem('619_user');
  }

  return <AuthContext.Provider value={{ user, token, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
