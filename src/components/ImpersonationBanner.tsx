'use client';

// Persistent banner shown while a super_admin is viewing a studio as its admin
// (read-only impersonation). Sits fixed at the bottom-centre so it's always
// visible without disturbing page layout. Exiting clears the impersonation
// token and returns to the platform command centre. Also reacts to the token
// expiring mid-session (the http layer emits 'impersonation-expired').

import { useEffect, useState } from 'react';
import { Eye, LogOut, LogIn } from 'lucide-react';
import { api } from '@/lib/api';
import { getImpersonation, clearImpersonation, type StoredImpersonation } from '@/lib/http';

/**
 * Tell the server the session is over.
 *
 * Deliberately swallows its own failure. The audit row matters, but an operator
 * who cannot reach the API must still be able to stop acting as a studio admin
 * — trapping them inside an impersonated session to protect a log entry gets
 * the priorities backwards. The server-side ceiling is unchanged either way:
 * the token expires on its own within IMPERSONATION_TTL.
 */
async function recordEnd(
  s: Pick<StoredImpersonation, 'orgId' | 'adminId' | 'jti'>,
  reason: 'manual' | 'expired',
) {
  try {
    await api.superAdmin.endImpersonation({
      organization_id: s.orgId, admin_id: s.adminId, jti: s.jti, reason,
    });
  } catch { /* see above */ }
}

export default function ImpersonationBanner() {
  const [imp, setImp] = useState<StoredImpersonation | null>(null);

  useEffect(() => {
    setImp(getImpersonation());
    const sync = () => setImp(getImpersonation());
    // http.ts has already cleared the token by the time this fires, so the
    // session's identity arrives on the event rather than being read back.
    const onExpired = (e: Event) => {
      setImp(null);
      const d = (e as CustomEvent<{ orgId?: string; adminId?: string; jti?: string }>).detail;
      if (d?.orgId || d?.adminId) {
        void recordEnd({ orgId: d.orgId ?? '', adminId: d.adminId ?? '', jti: d.jti }, 'expired');
      }
      if (typeof window !== 'undefined') window.location.href = '/platform';
    };
    window.addEventListener('impersonation-changed', sync);
    window.addEventListener('impersonation-expired', onExpired);
    return () => {
      window.removeEventListener('impersonation-changed', sync);
      window.removeEventListener('impersonation-expired', onExpired);
    };
  }, []);

  if (!imp) return null;

  const exit = async () => {
    // Recorded before the local clear, because the call travels as the operator
    // and needs nothing from the impersonation token — but the clear is not
    // conditional on it succeeding.
    await recordEnd(imp, 'manual');
    clearImpersonation();
    window.location.href = '/platform';
  };

  const full = !imp.readonly;
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
          {full ? 'Acting as' : 'Viewing'} {imp.orgName} · {imp.adminName}
        </p>
        <p className="text-[10.5px] font-[600]" style={{ color: theme.sub }}>
          {theme.subText}
        </p>
      </div>
      <button
        onClick={() => { void exit(); }}
        className="flex flex-shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-[750] transition hover:opacity-90"
        style={{ background: 'rgba(255,255,255,0.16)', color: '#fff' }}
      >
        <LogOut size={12} /> Exit
      </button>
    </div>
  );
}
