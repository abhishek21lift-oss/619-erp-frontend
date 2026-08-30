'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Building2, Loader2, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { fmtDate } from '../_shared/format';

type Props = { orgId: string; onBack: () => void };
type Studio = {
  name: string;
  slug: string;
  status?: string;
  created_at?: string | null;
  client_count?: number;
  trainer_count?: number;
  user_count?: number;
  users?: Array<{ id: string; name?: string; email?: string; is_active?: boolean }>;
};

export function Studio360Panel({ orgId, onBack }: Props) {
  const [studio, setStudio] = useState<Studio | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    setStudio(null);
    setError('');
    api.superAdmin.getOrg(orgId)
      .then((response) => { if (mounted) setStudio(response.data as Studio); })
      .catch((cause) => { if (mounted) setError(cause instanceof Error ? cause.message : 'Could not load studio'); });
    return () => { mounted = false; };
  }, [orgId]);

  if (error) return (
    <section className="rounded-[18px] p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <button type="button" onClick={onBack} className="mb-5 flex items-center gap-2 text-[12px] font-[700]" style={{ color: 'var(--text-muted)' }}><ArrowLeft size={14} /> Back to studios</button>
      <p className="text-[14px] font-[800]" style={{ color: 'var(--text-primary)' }}>Studio 360 could not load</p>
      <p className="mt-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>{error}</p>
    </section>
  );

  if (!studio) return <div className="flex justify-center py-20"><Loader2 size={26} className="animate-spin" style={{ color: '#0067e0' }} /></div>;

  const users = studio.users ?? [];
  const stats = [
    ['Clients', studio.client_count ?? 0],
    ['Coaches', studio.trainer_count ?? 0],
    ['Accounts', studio.user_count ?? users.length],
  ];

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="flex items-center gap-2 text-[12px] font-[700]" style={{ color: 'var(--text-muted)' }}><ArrowLeft size={14} /> Back to studios</button>
      <section className="rounded-[20px] p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 8px 28px rgba(15,23,42,0.06)' }}>
        <div className="flex items-start gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-[15px]" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}><Building2 size={24} /></div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><h2 className="text-[22px] font-[850]" style={{ color: 'var(--text-primary)' }}>{studio.name}</h2>{studio.status && <span className="rounded-full px-2.5 py-1 text-[10px] font-[750]" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>{studio.status}</span>}</div>
            <p className="mt-1 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>/{studio.slug} · created {fmtDate(studio.created_at)}</p>
          </div>
        </div>
      </section>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stats.map(([label, value]) => <div key={String(label)} className="rounded-[16px] p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}><Users size={15} style={{ color: 'var(--brand)' }} /><p className="mt-2 text-[20px] font-[850]" style={{ color: 'var(--text-primary)' }}>{value}</p><p className="text-[10.5px] font-[700] uppercase tracking-[0.08em]" style={{ color: 'var(--text-disabled)' }}>{label}</p></div>)}
      </div>
      <section className="overflow-hidden rounded-[18px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="p-5"><h3 className="text-[15px] font-[800]" style={{ color: 'var(--text-primary)' }}>Studio accounts</h3><p className="mt-1 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{users.length} accounts attached to this studio</p></div>
        {users.length === 0 ? <div className="border-t p-5 text-[12px]" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>No accounts.</div> : users.map((user) => <div key={user.id} className="flex items-center gap-3 border-t px-5 py-3.5" style={{ borderColor: 'var(--border)' }}><div className="min-w-0 flex-1"><p className="truncate text-[12.5px] font-[750]" style={{ color: 'var(--text-primary)' }}>{user.name || 'Unnamed account'}</p><p className="truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>{user.email || 'No email'}</p></div><span className="rounded-full px-2.5 py-1 text-[10px] font-[700]" style={{ background: user.is_active === false ? 'rgba(239,68,68,0.10)' : 'rgba(16,185,129,0.10)', color: user.is_active === false ? '#dc2626' : '#059669' }}>{user.is_active === false ? 'disabled' : 'active'}</span></div>)}
      </section>
    </div>
  );
}
