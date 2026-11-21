'use client';

// Persistent banner shown while a super_admin is viewing a studio as its admin.
// Sits fixed at the bottom-centre so it's always visible without disturbing page
// layout. Exiting ends the server-side session (migration 285) and returns to
// the platform command centre; the local token is cleared even if that call
// fails, and the row's TTL is the backstop.
//
// It also reacts to the token expiring mid-session (the http layer emits
// 'impersonation-expired') and shows a live countdown, because "read-only" and
// "full access" are not the only facts that matter — an operator needs to know
// how long they have before the studio locks.

import { useEffect, useState } from 'react';
import { Eye, LogOut, LogIn } from 'lucide-react';
import {
  getImpersonation, clearImpersonation, safeImpersonationReturnTo, endImpersonationOnServer,
  type StoredImpersonation,
} from '@/lib/http';

function minutesLeft(expiresAt?: string): number | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, Math.ceil(ms / 60_000));
}

export default function ImpersonationBanner() {
  const [imp, setImp] = useState<StoredImpersonation | null>(null);
  const [, tick] = useState(0);

  useEffect(() => {
    setImp(getImpersonation());
    const sync = () => setImp(getImpersonation());
    const onExpired = () => {
      const current = getImpersonation();
      const returnTo = current?.returnTo;
      // The server already refused the token; close the row so the console's
      // "active sessions" view does not keep showing a session that cannot act.
      if (current?.sessionId) endImpersonationOnServer(current.sessionId);
      setImp(null);
      if (typeof window !== 'undefined') window.location.href = safeImpersonationReturnTo(returnTo);
    };
    window.addEventListener('impersonation-changed', sync);
    window.addEventListener('impersonation-expired', onExpired);
    return () => {
      window.removeEventListener('impersonation-changed', sync);
      window.removeEventListener('impersonation-expired', onExpired);
    };
  }, []);

  // One re-render a minute is enough for a countdown; no timer per second.
  useEffect(() => {
    if (!imp?.expiresAt) return;
    const id = window.setInterval(() => tick((n) => n + 1), 30_000);
    return () => window.clearInterval(id);
  }, [imp?.expiresAt]);

  if (!imp) return null;

  const exit = () => {
    const returnTo = safeImpersonationReturnTo(imp.returnTo);
    if (imp.sessionId) endImpersonationOnServer(imp.sessionId);
    clearImpersonation();
    window.location.href = returnTo;
  };

  const full = !imp.readonly;
  const left = minutesLeft(imp.expiresAt);
  const theme = full
    ? { bg: 'linear-gradient(135deg,#991b1b,#dc2626)', glow: '0 12px 40px rgba(220,38,38,0.45)', icon: '#fecaca', sub: '#fecaca', subText: 'Full access · changes are live' }
    : { bg: 'linear-gradient(135deg,#7f1d1d,#b45309)', glow: '0 12px 40px rgba(180,83,9,0.45)', icon: '#fde68a', sub: '#fef3c7', subText: 'Read-only · changes are disabled' };

  return (
    <div
      className="fixed left-1/2 z-[10000] flex -translate-x-1/2 items-center gap-3 rounded-full px-4 py-2.5 shadow-lg"
      style={{
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
        background: theme.bg,
        border: '1px solid rgba(255,255,255,0.18)',
        boxShadow: theme.glow,
        maxWidth: 'calc(100vw - 24px)',
      }}
    >
      {full ? <LogIn size={15} color={theme.icon} className="flex-shrink-0" /> : <Eye size={15} color={theme.icon} className="flex-shrink-0" />}
      <div className="min-w-0 leading-tight">
        <p className="truncate text-[12.5px] font-[750] text-white">
          {full ? 'Acting as' : 'Viewing'} {imp.orgName} · {imp.accountName}
        </p>
        <p className="truncate text-[10.5px] font-[600]" style={{ color: theme.sub }} title={imp.reason}>
          {theme.subText}
          {left != null ? ` · ${left}m left` : ''}
          {imp.reason ? ` · ${imp.reason}` : ''}
        </p>
      </div>
      <button
        onClick={exit}
        className="flex flex-shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-[750] transition hover:opacity-90"
        style={{ background: 'rgba(255,255,255,0.16)', color: '#fff' }}
      >
        <LogOut size={12} /> Exit
      </button>
    </div>
  );
}
