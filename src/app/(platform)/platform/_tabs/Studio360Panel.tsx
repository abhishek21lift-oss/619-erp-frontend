'use client';

import { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowLeft, Building2, CreditCard, FileText, Loader2, ShieldCheck, Users, WalletCards } from 'lucide-react';
import StudioMark from '@/components/StudioMark';
import { api } from '@/lib/api';
import { roleLabel } from '@/lib/roles';
import { fmtDate, fmtINR, fmtWhen } from '../_shared/format';

type Props = { orgId: string; onBack: () => void };
type View = 'overview' | 'people' | 'activity' | 'billing';
type StudioOverview = {
  id: string;
  revenue?: number;
  outstanding?: number;
  active_clients?: number;
  total_clients?: number;
  sessions_this_month?: number;
  last_login?: string | null;
};
type StudioSubscription = {
  id: string;
  renewal_due?: boolean;
  requested_at?: string | null;
  effective_state?: string | null;
  plan_name?: string | null;
  current_period_end?: string | null;
};
type StudioUser = { id: string; name?: string; email?: string; role?: string | null; is_active?: boolean };
type Studio360Data = {
  org: {
    name: string;
    slug: string;
    status?: string;
    logo_url?: string | null;
    user_count?: number;
    trainer_count?: number;
    created_at?: string | null;
    users?: StudioUser[];
  };
  ov?: StudioOverview;
  sub?: StudioSubscription;
  activity: Array<{ id: string; action?: string; event?: string; description?: string; detail?: string; created_at?: string; createdAt?: string }>;
  notes?: { internal_notes?: string | null; internal_notes_updated_at?: string | null };
  billing?: { billing_name?: string | null; billing_gstin?: string | null; billing_email?: string | null };
};

const cardStyle = { background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 8px 28px rgba(15,23,42,0.06)' } as const;

export function Studio360Panel({ orgId, onBack }: Props) {
  const [view, setView] = useState<View>('overview');
  const [data, setData] = useState<Studio360Data | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setData(null);
    setError('');
    Promise.all([
      api.superAdmin.getOrg(orgId),
      api.superAdmin.overview(),
      api.superAdmin.subscriptions(),
      api.superAdmin.listActivity({ org_id: orgId, limit: 8, offset: 0 }),
      api.superAdmin.orgNotes(orgId),
      api.superAdmin.orgBillingProfile(orgId),
    ]).then(([detail, overview, subscriptions, activity, notes, billing]) => {
      if (!alive) return;
      const ov = (overview.data?.studios ?? []).find((s: StudioOverview) => s.id === orgId);
      const sub = (subscriptions.data?.studios ?? []).find((s: StudioSubscription) => s.id === orgId);
      setData({ org: detail.data, ov, sub, activity: activity.data ?? [], notes: notes.data, billing: billing.data });
    }).catch((e) => {
      if (alive) setError(e instanceof Error ? e.message : 'Could not load Studio 360');
    });
    return () => { alive = false; };
  }, [orgId]);

  const org = data?.org;
  const ov = data?.ov;
  const sub = data?.sub;
  const users = org?.users ?? [];
  const billing = data?.billing ?? {};
  const notes = data?.notes ?? {};

  const attention = useMemo(() => {
    if (!org) return [];
    const items: string[] = [];
    if (org.status === 'suspended') items.push('Studio is suspended');
    if (sub?.renewal_due) items.push('Subscription renewal is due');
    if (sub?.requested_at) items.push('Plan request is waiting for review');
    if (sub?.effective_state === 'trial') items.push('Studio is currently on trial');
    if (!ov?.last_login) items.push('No login activity recorded');
    return items;
  }, [org, ov, sub]);

  if (error) return (
    <div className="rounded-[18px] p-8 text-center" style={cardStyle}>
      <ShieldCheck size={28} className="mx-auto mb-3" style={{ color: '#dc2626' }} />
      <p className="text-[15px] font-[750]" style={{ color: 'var(--text-primary)' }}>Studio 360 could not load</p>
      <p className="mt-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>{error}</p>
      <button onClick={onBack} className="mt-4 rounded-[10px] px-4 py-2.5 text-[12px] font-[700]" style={{ border: '1px solid var(--border)' }}>Back to studios</button>
    </div>
  );

  if (!data) return <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin" style={{ color: '#0067e0' }} /></div>;

  const tabs: { id: View; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <Building2 size={14} /> },
    { id: 'people', label: 'People', icon: <Users size={14} /> },
    { id: 'activity', label: 'Activity', icon: <Activity size={14} /> },
    { id: 'billing', label: 'Billing', icon: <CreditCard size={14} /> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-[10px]" style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }} aria-label="Back to studios"><ArrowLeft size={16} /></button>
        <span className="text-[12px] font-[700]" style={{ color: 'var(--text-muted)' }}>Studios</span>
        <span style={{ color: 'var(--text-disabled)' }}>/</span>
        <span className="truncate text-[12px] font-[700]" style={{ color: 'var(--text-primary)' }}>{org.name}</span>
      </div>

      <section className="relative overflow-hidden rounded-[20px] p-5" style={{ ...cardStyle, background: 'linear-gradient(135deg, rgba(0,103,224,0.12), var(--bg-card) 58%, rgba(16,185,129,0.07))' }}>
        <div className="flex flex-wrap items-start gap-4">
          <StudioMark name={org.name} logoUrl={org.logo_url} size={64} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[22px] font-[850] tracking-[-0.025em]" style={{ color: 'var(--text-primary)' }}>{org.name}</h2>
              <span className="rounded-full px-2.5 py-1 text-[10.5px] font-[750]" style={{ background: org.status === 'suspended' ? 'rgba(239,68,68,0.10)' : 'rgba(16,185,129,0.10)', color: org.status === 'suspended' ? '#dc2626' : '#059669' }}>{org.status}</span>
              {sub?.plan_name && <span className="rounded-full px-2.5 py-1 text-[10.5px] font-[750]" style={{ background: 'rgba(0,103,224,0.10)', color: '#0067e0' }}>{sub.plan_name}</span>}
            </div>
            <p className="mt-1 truncate text-[11.5px]" style={{ color: 'var(--text-muted)' }}>/{org.slug} · created {fmtDate(org.created_at)} · last active {fmtWhen(ov?.last_login ?? null)}</p>
          </div>
        </div>
        {attention.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{attention.map((item) => <span key={item} className="rounded-full px-3 py-1.5 text-[10.5px] font-[700]" style={{ background: 'rgba(245,158,11,0.10)', color: '#b45309' }}>{item}</span>)}</div>}
      </section>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ['Revenue', fmtINR(ov?.revenue ?? 0), WalletCards],
          ['Outstanding', fmtINR(ov?.outstanding ?? 0), FileText],
          ['Clients', `${ov?.active_clients ?? 0}/${ov?.total_clients ?? 0}`, Users],
          ['Accounts', String(org.user_count ?? users.length ?? 0), ShieldCheck],
        ].map(([label, value, Icon]) => <div key={String(label)} className="rounded-[15px] p-4" style={cardStyle}><Icon size={16} style={{ color: '#0067e0' }} /><p className="mt-3 text-[20px] font-[850]" style={{ color: 'var(--text-primary)' }}>{value as string}</p><p className="text-[10.5px] font-[700] uppercase tracking-[0.08em]" style={{ color: 'var(--text-disabled)' }}>{label as string}</p></div>)}
      </div>

      <div className="flex gap-1.5 overflow-x-auto rounded-[14px] p-1.5" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
        {tabs.map((t) => <button key={t.id} onClick={() => setView(t.id)} className="flex min-h-[42px] shrink-0 items-center gap-1.5 rounded-[10px] px-3.5 text-[11.5px] font-[700]" style={view === t.id ? { background: 'var(--bg-card)', color: 'var(--text-primary)', boxShadow: '0 3px 12px rgba(15,23,42,0.08)' } : { color: 'var(--text-muted)' }}>{t.icon}{t.label}</button>)}
      </div>

      {view === 'overview' && <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-[18px] p-5" style={cardStyle}><h3 className="text-[15px] font-[800]">Studio pulse</h3><div className="mt-4 space-y-3 text-[12px]" style={{ color: 'var(--text-secondary)' }}><div className="flex justify-between"><span>Coaches</span><b>{org.trainer_count ?? 0}</b></div><div className="flex justify-between"><span>Sessions this month</span><b>{ov?.sessions_this_month ?? 0}</b></div><div className="flex justify-between"><span>Last login</span><b>{fmtWhen(ov?.last_login ?? null)}</b></div><div className="flex justify-between"><span>Plan state</span><b>{sub?.effective_state ?? 'none'}</b></div></div></section>
        <section className="rounded-[18px] p-5" style={cardStyle}><h3 className="text-[15px] font-[800]">Operator notes</h3><p className="mt-3 whitespace-pre-wrap text-[12px] leading-5" style={{ color: notes.internal_notes ? 'var(--text-secondary)' : 'var(--text-disabled)' }}>{notes.internal_notes || 'No internal notes recorded.'}</p>{notes.internal_notes_updated_at && <p className="mt-3 text-[10.5px]" style={{ color: 'var(--text-disabled)' }}>Updated {fmtWhen(notes.internal_notes_updated_at)}</p>}</section>
      </div>}

      {view === 'people' && <section className="overflow-hidden rounded-[18px]" style={cardStyle}><div className="p-5"><h3 className="text-[15px] font-[800]">Studio accounts</h3><p className="mt-1 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{users.length} accounts attached to this studio</p></div>{users.length === 0 ? <div className="border-t p-5 text-[12px]" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>No accounts.</div> : users.map((u) => <div key={u.id} className="flex flex-wrap items-center gap-3 border-t px-5 py-3.5" style={{ borderColor: 'var(--border)' }}><div className="min-w-0 flex-1"><p className="truncate text-[12.5px] font-[750]">{u.name}</p><p className="truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>{u.email} · {roleLabel(u.role)}</p></div><span className="rounded-full px-2.5 py-1 text-[10px] font-[700]" style={{ background: u.is_active ? 'rgba(16,185,129,0.10)' : 'rgba(239,68,68,0.10)', color: u.is_active ? '#059669' : '#dc2626' }}>{u.is_active ? 'active' : 'disabled'}</span></div>)}</section>}

      {view === 'activity' && <section className="overflow-hidden rounded-[18px]" style={cardStyle}><div className="p-5"><h3 className="text-[15px] font-[800]">Recent activity</h3></div>{data.activity.length === 0 ? <div className="border-t p-5 text-[12px]" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>No recent activity.</div> : data.activity.map((a) => <div key={a.id} className="border-t px-5 py-3.5" style={{ borderColor: 'var(--border)' }}><p className="text-[12px] font-[700]">{a.action || a.event || 'Activity'}</p><p className="mt-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>{a.description || a.detail || ''} · {fmtWhen(a.created_at || a.createdAt)}</p></div>)}</section>}

      {view === 'billing' && <div className="grid grid-cols-1 gap-4 lg:grid-cols-2"><section className="rounded-[18px] p-5" style={cardStyle}><h3 className="text-[15px] font-[800]">Subscription</h3><div className="mt-4 space-y-3 text-[12px]" style={{ color: 'var(--text-secondary)' }}><div className="flex justify-between"><span>Plan</span><b>{sub?.plan_name || 'No plan'}</b></div><div className="flex justify-between"><span>State</span><b>{sub?.effective_state || 'none'}</b></div><div className="flex justify-between"><span>Renewal due</span><b>{sub?.renewal_due ? 'Yes' : 'No'}</b></div><div className="flex justify-between"><span>Ends</span><b>{sub?.current_period_end ? fmtDate(sub.current_period_end) : '—'}</b></div></div></section><section className="rounded-[18px] p-5" style={cardStyle}><h3 className="text-[15px] font-[800]">Billing identity</h3><div className="mt-4 space-y-3 text-[12px]" style={{ color: 'var(--text-secondary)' }}><div><span className="block text-[10px] font-[700] uppercase" style={{ color: 'var(--text-disabled)' }}>Registered name</span>{billing.billing_name || '—'}</div><div><span className="block text-[10px] font-[700] uppercase" style={{ color: 'var(--text-disabled)' }}>GSTIN</span>{billing.billing_gstin || '—'}</div><div><span className="block text-[10px] font-[700] uppercase" style={{ color: 'var(--text-disabled)' }}>Billing email</span>{billing.billing_email || '—'}</div></div></section></div>}
    </div>
  );
}
