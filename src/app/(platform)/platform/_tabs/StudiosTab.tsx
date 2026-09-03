'use client';

import { useEffect, useState } from 'react';
import { Building2, ChevronRight, Search, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { Studio360Panel } from './Studio360Panel';
import { StudiosTab as ExistingStudiosTab } from './StudiosTabLegacy';

export function StudiosTab() {
  const [studioId, setStudioId] = useState<string | null>(null);
  const [studios, setStudios] = useState<Array<{ id: string; name: string }>>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let alive = true;
    api.superAdmin.listOrgs().then((r) => {
      if (alive) setStudios((r.data ?? []).map((o) => ({ id: o.id, name: o.name })));
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  if (studioId) return <Studio360Panel orgId={studioId} onBack={() => setStudioId(null)} />;

  const matches = studios.filter((s) => s.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="space-y-4">
      <section className="rounded-[18px] p-4 sm:p-5" style={{ background: 'linear-gradient(135deg, rgba(0,103,224,0.10), rgba(16,185,129,0.06))', border: '1px solid var(--border)', boxShadow: '0 8px 28px rgba(15,23,42,0.06)' }}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[13px]" style={{ background: 'rgba(0,103,224,0.12)', color: '#0067e0' }}><Sparkles size={19} /></div>
          <div className="min-w-0 flex-1"><p className="text-[15px] font-[850]" style={{ color: 'var(--text-primary)' }}>Studio 360</p><p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>One operator view for health, people, activity and billing.</p></div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2.5">
          <div className="relative min-w-[200px] flex-1"><Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-disabled)' }} /><input aria-label="Find a studio for Studio 360" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a studio…" className="h-11 w-full rounded-[10px] pl-9 pr-3 text-[12.5px] outline-none" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} /></div>
        </div>
        {query.trim() && <div className="mt-2 overflow-hidden rounded-[12px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>{matches.slice(0, 6).map((s) => <button key={s.id} onClick={() => setStudioId(s.id)} className="flex w-full items-center gap-3 border-b px-3.5 py-3 text-left last:border-0" style={{ borderColor: 'var(--border)' }}><Building2 size={15} style={{ color: '#0067e0' }} /><span className="min-w-0 flex-1 truncate text-[12.5px] font-[700]" style={{ color: 'var(--text-primary)' }}>{s.name}</span><ChevronRight size={14} style={{ color: 'var(--text-disabled)' }} /></button>)}</div>}
      </section>

      <div className="rounded-[14px] px-3 py-2.5 text-[11px]" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>Studio 360 is read-only in this first pass. Existing studio management remains unchanged below.</div>

      <ExistingStudiosTab />
    </div>
  );
}

export { MoreMenu, OrgCard, StudioOperatorPanel, StudioFeatureEditor, BillingProfileEditor, exportStudiosCsv, PLAN_ACCENT, NO_PLAN_ACCENT } from './StudiosTabLegacy';
