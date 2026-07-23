'use client';

// Persistent banner shown while a super_admin is viewing a studio as its admin
// (read-only impersonation). Sits fixed at the bottom-centre so it's always
// visible without disturbing page layout. Exiting clears the impersonation
// token and returns to the platform command centre. Also reacts to the token
// expiring mid-session (the http layer emits 'impersonation-expired').

import { useEffect, useState } from 'react';
import { Eye, LogOut } from 'lucide-react';
import { getImpersonation, clearImpersonation, type StoredImpersonation } from '@/lib/http';

export default function ImpersonationBanner() {
  const [imp, setImp] = useState<StoredImpersonation | null>(null);

  useEffect(() => {
    setImp(getImpersonation());
    const sync = () => setImp(getImpersonation());
    const onExpired = () => {
      setImp(null);
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

  const exit = () => {
    clearImpersonation();
    window.location.href = '/platform';
  };

  return (
    <div
      className="fixed left-1/2 z-[10000] flex -translate-x-1/2 items-center gap-3 rounded-full px-4 py-2.5 shadow-lg"
      style={{
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
        background: 'linear-gradient(135deg,#7c2d12,#b45309)',
        border: '1px solid rgba(255,255,255,0.18)',
        boxShadow: '0 12px 40px rgba(180,83,9,0.45)',
        maxWidth: 'calc(100vw - 24px)',
      }}
    >
      <Eye size={15} color="#fde68a" className="flex-shrink-0" />
      <div className="min-w-0 leading-tight">
        <p className="truncate text-[12.5px] font-[750] text-white">
          Viewing {imp.orgName} as {imp.adminName}
        </p>
        <p className="text-[10.5px] font-[600]" style={{ color: '#fed7aa' }}>
          Read-only · changes are disabled
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
