'use client';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, type User, http } from './api';
import { resetRedirectLock, refreshSession, clearImpersonation } from './http';
// Minimal non-sensitive user fields cached in sessionStorage (cleared on tab
// close); the full user, email included, stays in memory only. The key and its
// accessors live in session-cache.ts rather than here because http.ts clears
// this same cache on a 401 — and while each side declared its own constant,
// the two had drifted onto different keys in different stores.
import { readCachedUser, writeCachedUser, clearCachedUser } from './session-cache';
import { signInPathFor } from './public-paths';
import type { Role } from './roles';
export type { Role } from './roles';

interface Ctx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, mfaCode?: string, portal?: 'staff' | 'member') => Promise<void>;
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

// Drop the cached minimal user so the next full-page load re-resolves identity
// from /api/auth/me instead of flashing the previous (e.g. super-admin) user.
// Used when starting/exiting impersonation so the operator is re-identified as
// the studio admin (and vice-versa) without a stale-role flash.
export function clearCachedAuthUser(): void {
  clearCachedUser();
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
    clearCachedUser();
    // An impersonation token OUTLIVES the cookie it was minted under, because
    // it is a Bearer token in sessionStorage and logout only clears the cookie.
    // http.ts sends that Bearer whenever it is present, and the backend reads
    // Authorization BEFORE the cookie (middleware/auth.js:77-82) — so the next
    // person to sign in on this tab would have every request resolved as the
    // operator's impersonated session instead of themselves.
    //
    // Reported exactly that way: a Command Centre operator viewed a studio
    // read-only, logged out, signed back in with the trainer's credentials,
    // and the tab was still the Command Centre.
    clearImpersonation();
  }, []);

  useEffect(() => {
    // Guard against React StrictMode double-invocation: if already initialised,
    // skip — but we must reset the flag in the cleanup so a genuine remount
    // (e.g. HMR) restarts the flow and doesn't leave loading=true forever.
    if (initDone.current) return;
    initDone.current = true;

    // Restore cached user immediately — avoids blank flash on hard refresh.
    // Only id + name + role are persisted; email and other PII stay in memory.
    const cachedRaw = readCachedUser();
    let cachedUser: User | null = null;
    if (cachedRaw) {
      try {
        const partial = JSON.parse(cachedRaw) as { id: string; name: string; role: string; organization_name?: string | null; organization_logo_url?: string | null; is_founder?: boolean; founder_number?: number | null };
        // founder_number is cached alongside the name for the same reason the
        // name is: without it the badge pops in a beat after every hard
        // refresh, which for a permanent mark of status reads as a glitch.
        // Not PII — it is displayed publicly on the studio page.
        cachedUser = { id: partial.id, name: partial.name, role: partial.role as any, email: '', organization_name: partial.organization_name ?? null, organization_logo_url: partial.organization_logo_url ?? null, is_founder: partial.is_founder ?? false, founder_number: partial.founder_number ?? null };
      } catch { clearCachedUser(); }
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
          writeCachedUser(JSON.stringify({ id: u.id, name: u.name, role: u.role, organization_name: u.organization_name, organization_logo_url: u.organization_logo_url, is_founder: u.is_founder, founder_number: u.founder_number }));
        } else {
          setUser(null);
          clearCachedUser();
        }
      })
      .catch((err: unknown) => {
        clearTimeout(meTimeout);
        if (loggedInRef.current) return;
        const status = (err as { status?: number })?.status;
        if (status === 401 || status === 403) {
          setUser(null);
          clearCachedUser();
        }
        // All other errors (network, timeout, 5xx): keep cached session silently
      })
      .finally(() => {
        if (!loggedInRef.current) setLoading(false);
      });

    return () => {
      // Cleanup: abort the in-flight request and reset the guard so a genuine
      // remount (StrictMode second pass or HMR) restarts initialisation.
      clearTimeout(meTimeout);
      ac.abort();
      initDone.current = false;
    };
  }, []);

  // Where to send somebody who has just stopped being signed in. There are two
  // sign-in pages and each refuses the other's accounts, so a client dropped on
  // /login is shown a door that will not open for them.
  const backToSignIn = useCallback(function () {
    router.replace(signInPathFor(window.location.pathname));
  }, [router]);

  useEffect(() => {
    function onSessionExpired() {
      _clearSession();
      backToSignIn();
    }
    window.addEventListener('session-expired', onSessionExpired);
    return () => window.removeEventListener('session-expired', onSessionExpired);
  }, [_clearSession, backToSignIn]);

  // Proactive session keep-alive. The access token lives ~15 min; renew it
  // every 12 min while logged in so a long-open tab never starts failing, and
  // renew immediately when the tab is brought back to the foreground (covers
  // laptop sleep / backgrounded tabs where timers are throttled). This also
  // keeps a free-tier backend warm, avoiding cold-start logouts. Background
  // 401s here are harmless — the reactive path already handles a dead session.
  useEffect(() => {
    if (!user) return;
    const id = setInterval(() => { refreshSession().catch(() => {}); }, 12 * 60 * 1000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshSession().catch(() => {});
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user]);

  // Idle session timeout
  useEffect(() => {
    if (!user) return;
    let idleTimer: ReturnType<typeof setTimeout>;
    function resetIdleTimer() {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        _clearSession();
        backToSignIn();
      }, SESSION_TIMEOUT_MS);
    }
    // Include mousemove so simply using the app (not just clicking) counts as
    // activity — avoids surprise logouts while reading or watching a client.
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'mousemove'];
    events.forEach(e => window.addEventListener(e, resetIdleTimer, { passive: true }));
    resetIdleTimer();
    return () => {
      clearTimeout(idleTimer);
      events.forEach(e => window.removeEventListener(e, resetIdleTimer));
    };
  }, [user, _clearSession, backToSignIn]);

  /**
   * Take on a freshly authenticated identity.
   *
   * Extracted because the three sign-in paths — password, Google, passkey —
   * each carried their own copy of these lines, and a copy is where a fix goes
   * missing. The impersonation clear below is exactly such a fix: adding it to
   * one login and not the other two would have left the bug reachable through
   * whichever path nobody tested.
   */
  const _adoptSession = useCallback(function (u: User) {
    resetRedirectLock();
    loggedInRef.current = true;
    // Signing in is a new identity, whatever this tab was doing before. A
    // leftover impersonation Bearer would override the cookie just issued —
    // the backend prefers Authorization over the cookie — so the new user
    // would silently operate as the previous operator's impersonated session.
    // Logout clears this too; both, because a session can expire without a
    // logout ever running.
    clearImpersonation();
    setUser(u);
    writeCachedUser(JSON.stringify({ id: u.id, name: u.name, role: u.role, organization_name: u.organization_name, organization_logo_url: u.organization_logo_url, is_founder: u.is_founder, founder_number: u.founder_number }));
    setLoading(false);
  }, []);

  const login = useCallback(async function (
    email: string, password: string, mfaCode?: string, portal?: 'staff' | 'member',
  ): Promise<void> {
    const data = await api.auth.login(email, password, mfaCode, portal);
    _adoptSession(data.user);
  }, [_adoptSession]);

  const loginWithGoogle = useCallback(async function (credential: string): Promise<void> {
    const data = await api.auth.googleLogin(credential);
    _adoptSession(data.user);
  }, [_adoptSession]);

  const loginWithPasskey = useCallback(async function (email?: string): Promise<void> {
    const data = await api.webauthn.loginVerify(
      { authentication: await (async () => {
        const opts = await api.webauthn.loginOptions({ email });
        // Dynamic import keeps this hook SSR-safe
        const { default: doAuth } = await import('./webauthn-passkey-auth');
        return doAuth(opts);
      })() }
    );
    _adoptSession(data.user as User);
  }, [_adoptSession]);

  const logout = useCallback(function (): void {
    _clearSession();
    backToSignIn();
  }, [_clearSession, backToSignIn]);

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, loginWithPasskey, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
