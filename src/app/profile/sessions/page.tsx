'use client';

import { useState, useEffect } from 'react';
import { http } from '@/lib/http';
import { useToast } from '@/lib/toast';
import { useRouter } from 'next/navigation';
import { Clock, LogOut, Loader2 } from 'lucide-react';

interface Session {
  id: string;
  ip: string;
  location: string;
  device: string;
  browser: string;
  createdAt: string;
  lastActive: string;
  isCurrent: boolean;
}

export default function SessionsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [signingOutAll, setSigningOutAll] = useState(false);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    http<Session[]>('/api/profile/sessions')
      .then(setSessions)
      .catch((err) => {
        console.error('[profile/sessions] fetch failed', err);
        toast.error('Could not load sessions');
      })
      .finally(() => setLoading(false));
  }, []);

  const revoke = async (id: string) => {
    setRevoking(id);
    try {
      await http(`/api/profile/sessions/${id}`, { method: 'DELETE' });
      setSessions(s => s.filter(x => x.id !== id));
      toast.success('Session revoked');
    } catch { toast.error('Failed to revoke session'); }
    finally { setRevoking(null); }
  };

  const signOutAll = async () => {
    if (!confirm) { setConfirm(true); return; }
    setSigningOutAll(true);
    try {
      await http('/api/profile/sessions/revoke-all', { method: 'POST', body: JSON.stringify({}) });
      toast.success('Signed out of all devices');
      router.push('/login');
    } catch { toast.error('Failed to sign out all devices'); }
    finally { setSigningOutAll(false); setConfirm(false); }
  };

  if (loading) return <div className="animate-pulse space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-white/[0.04] rounded-2xl" />)}</div>;

  return (
    <div className="space-y-3 pb-10">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[13px] text-white/40">{sessions.length} active session{sessions.length !== 1 ? 's' : ''}</p>
        <button
          onClick={signOutAll} disabled={signingOutAll}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium transition-all ${
            confirm
              ? 'bg-red-500 text-white animate-pulse'
              : 'border border-red-500/30 text-red-400 hover:bg-red-500/10'
          }`}
        >
          {signingOutAll ? <Loader2 size={13} className="animate-spin" /> : <LogOut size={13} />}
          {confirm ? 'Confirm sign out all' : 'Sign out all'}
        </button>
      </div>

      {sessions.map(s => (
        <div key={s.id} className={`bg-[#141414] border rounded-2xl p-5 flex items-start gap-4 ${
          s.isCurrent ? 'border-[#FF2E63]/30' : 'border-white/[0.07]'
        }`}>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
            s.isCurrent ? 'bg-[#FF2E63]/15' : 'bg-white/[0.06]'
          }`}>
            <Clock size={15} className={s.isCurrent ? 'text-[#FF2E63]' : 'text-white/30'} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[14px] font-medium text-white truncate">{s.device}</p>
              {s.isCurrent && <span className="px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 text-[11px] font-medium">Current</span>}
            </div>
            <p className="text-[12px] text-white/35 mt-0.5">{s.browser} · {s.ip} · {s.location}</p>
            <p className="text-[12px] text-white/25">Started {s.createdAt} · Active {s.lastActive}</p>
          </div>
          {!s.isCurrent && (
            <button
              onClick={() => revoke(s.id)} disabled={revoking === s.id}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] text-red-400 hover:bg-red-500/10 border border-red-500/20 transition-all"
            >
              {revoking === s.id ? <Loader2 size={12} className="animate-spin" /> : <LogOut size={12} />}
              Revoke
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
