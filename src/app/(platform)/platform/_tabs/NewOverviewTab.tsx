'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, AlertOctagon, ArrowUpRight, Building2, CheckCircle2, ChevronRight, CircleAlert, CreditCard, HeartPulse, Loader2, RefreshCw, ShieldCheck, Sparkles, TrendingUp, Users } from 'lucide-react';
import StudioMark from '@/components/StudioMark';
import { Badge } from '@/components/ui';
import { api } from '@/lib/api';
import type { PlatformKpis, PlatformOverview, SubStudio } from '@/lib/api';
import { Panel, Reveal, SectionLabel } from '@/components/platform/console';
import { fmtINR } from '../_shared/format';
import { Center, ErrorState } from '../_shared/ui';
import { TenancyHealthCard } from './_health/TenancyHealthCard';

export function NewOverviewTab() {
  const router = useRouter();
  const [kpis, setKpis] = useState<PlatformKpis | null>(null);
  const [cached, setCached] = useState(false);
  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [subs, setSubs] = useState<SubStudio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (force = false) => {
    if (force) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const k = force
        ? await fetch('/api/platform/overview/kpis?fresh=1', { cache: 'no-store' }).then((r) => {
            if (!r.ok) throw new Error(`KPI refresh failed (${r.status})`);
            return r.json();
          })
        : await api.superAdmin.kpis();
      setKpis(k.data);
      setCached(Boolean(k.cached));
      const [ov, sub] = await Promise.all([api.superAdmin.overview(), api.superAdmin.subscriptions()]);
      setOverview(ov.data);
      setSubs(sub.data.studios ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load overview');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <Center><Loader2 size={22} className="animate-spin" style={{ color: 'var(--brand)' }} /></Center>;
  if (error) return <ErrorState error={error} onRetry={() => void load()} />;
  if (!kpis) return null;

  const biz = kpis.business;
  const rev = kpis.platform_revenue;
  const ops = kpis.operations;
  const sec = kpis.security;
  const openAlerts = sec.critical_alerts + sec.high_alerts;
  const renewalDue = subs.filter((s) => s.renewal_due).length;
  const requested = subs.filter((s) => s.requested_at).length;
  const collected30d = 'collected_30d_inr' in rev && typeof rev.collected_30d_inr === 'number' ? rev.collected_30d_inr : rev.mrr_inr;
  const attentionCount = requested + renewalDue + ops.failed_payments_30d + openAlerts;
  const platformHealthy = openAlerts === 0 && ops.failed_payments_30d === 0;
  const topStudios = (overview?.studios ?? []).slice(0, 6);

  const tiles = [
    { label: 'Studios', value: String(biz.total_studios), sub: `${biz.active_studios} active`, tone: 'brand' as const, icon: <Building2 size={17} />, action: () => router.push('/platform?tab=studios') },
    { label: 'Active clients', value: String(biz.active_clients), sub: `${biz.total_clients} total · ${biz.new_clients_30d} new 30d`, tone: 'caution' as const, icon: <Users size={17} /> },
    { label: 'Collected revenue', value: fmtINR(collected30d), sub: `last 30 days · ${rev.active_subscriptions} active`, tone: 'positive' as const, icon: <TrendingUp size={17} />, action: () => router.push('/platform?tab=finance&sub=payments') },
    { label: 'Failed payments', value: String(ops.failed_payments_30d), sub: `${rev.expiring_in_7d} subscriptions expiring in 7d`, tone: ops.failed_payments_30d > 0 ? 'critical' as const : 'neutral' as const, icon: <CreditCard size={17} />, action: () => router.push('/platform?tab=finance&sub=payments') },
  ];

  return (
    <div className="space-y-7 pb-6">
      <Reveal delay={0.02}>
        <div className="relative overflow-hidden rounded-[22px] border p-5 sm:p-6" style={{ borderColor: platformHealthy ? 'color-mix(in srgb, var(--success) 28%, var(--border))' : 'color-mix(in srgb, var(--danger) 30%, var(--border))', background: platformHealthy ? 'linear-gradient(135deg, color-mix(in srgb, var(--success) 8%, var(--bg-elevated)), var(--bg-elevated))' : 'linear-gradient(135deg, color-mix(in srgb, var(--danger) 8%, var(--bg-elevated)), var(--bg-elevated))' }}>
          <div className="pointer-events-none absolute -right-20 -top-24 h-52 w-52 rounded-full blur-3xl" style={{ background: platformHealthy ? 'color-mix(in srgb, var(--success) 14%, transparent)' : 'color-mix(in srgb, var(--danger) 14%, transparent)' }} />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px]" style={{ background: platformHealthy ? 'color-mix(in srgb, var(--success) 13%, var(--bg-elevated))' : 'color-mix(in srgb, var(--danger) 13%, var(--bg-elevated))', color: platformHealthy ? 'var(--success-text)' : 'var(--danger-text)' }}>
                {platformHealthy ? <ShieldCheck size={25} /> : <CircleAlert size={25} />}
              </div>
              <div>
                <div className="mb-1 flex flex-wrap items-center gap-2"><span className="text-[11px] font-[800] uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>Platform status</span><span className="h-1.5 w-1.5 rounded-full" style={{ background: platformHealthy ? 'var(--success)' : 'var(--danger)' }} /><span className="text-[11px] font-[700]" style={{ color: platformHealthy ? 'var(--success-text)' : 'var(--danger-text)' }}>{platformHealthy ? 'Operational' : 'Attention required'}</span></div>
                <h2 className="text-[22px] font-[780] tracking-[-0.035em] sm:text-[27px]" style={{ color: 'var(--text-primary)' }}>{platformHealthy ? 'Everything is under control.' : `${openAlerts} platform alert${openAlerts === 1 ? '' : 's'} need attention.`}</h2>
                <p className="mt-1 max-w-2xl text-[12.5px] leading-5" style={{ color: 'var(--text-muted)' }}>{platformHealthy ? 'Studios, revenue, payments and tenancy signals are within the current operating thresholds.' : 'Review the signals below first. The rest of the platform snapshot can be inspected without leaving Overview.'}</p>
              </div>
            </div>
            <button onClick={() => void load(true)} disabled={refreshing} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-[11px] px-3.5 py-2.5 text-[12px] font-[700] transition-transform active:scale-[0.98]" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}><RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />{refreshing ? 'Refreshing' : 'Refresh snapshot'}</button>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.07}>
        <div className="flex items-end justify-between gap-4"><SectionLabel hint={<span className="rounded-full px-2 py-0.5 text-[10px] font-[750]" style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>{cached ? 'cached snapshot' : 'live snapshot'}</span>}>Platform pulse</SectionLabel><span className="hidden text-[11px] sm:inline" style={{ color: 'var(--text-disabled)' }}>One glance · four signals</span></div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {tiles.map((t) => <button key={t.label} onClick={t.action} disabled={!t.action} className="group text-left disabled:cursor-default" style={{ WebkitTapHighlightColor: 'transparent' }}><div className="relative h-full overflow-hidden rounded-[18px] border p-4 transition-all duration-200 group-hover:-translate-y-0.5" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)', boxShadow: 'var(--shadow-sm)' }}><div className="absolute inset-x-0 top-0 h-0.5" style={{ background: t.tone === 'positive' ? 'var(--success)' : t.tone === 'critical' ? 'var(--danger)' : t.tone === 'caution' ? 'var(--warning)' : 'var(--brand)', opacity: 0.75 }} /><div className="mb-4 flex items-center justify-between"><span className="text-[10.5px] font-[800] uppercase tracking-[0.15em]" style={{ color: 'var(--text-muted)' }}>{t.label}</span><span className="flex h-8 w-8 items-center justify-center rounded-[10px]" style={{ background: 'var(--bg-subtle)', color: t.tone === 'positive' ? 'var(--success-text)' : t.tone === 'critical' ? 'var(--danger-text)' : t.tone === 'caution' ? 'var(--warning-text)' : 'var(--brand)' }}>{t.icon}</span></div><div className="text-[28px] font-[800] tracking-[-0.045em] sm:text-[32px]" style={{ color: 'var(--text-primary)' }}>{t.value}</div><div className="mt-1 min-h-[18px] text-[11px] leading-4" style={{ color: 'var(--text-muted)' }}>{t.sub}</div>{t.action && <ArrowUpRight size={13} className="absolute bottom-4 right-4 opacity-0 transition-opacity group-hover:opacity-100" style={{ color: 'var(--text-disabled)' }} />}</div></button>)}
        </div>
      </Reveal>

      <Reveal delay={0.12}>
        <div className="flex items-end justify-between gap-4"><SectionLabel>Needs attention</SectionLabel><span className="text-[11px] font-[650]" style={{ color: attentionCount ? 'var(--warning-text)' : 'var(--success-text)' }}>{attentionCount ? `${attentionCount} signal${attentionCount === 1 ? '' : 's'}` : 'All clear'}</span></div>
        <Panel padded={false} className="overflow-hidden">
          {attentionCount === 0 ? <div className="flex items-center gap-3 px-4 py-4"><CheckCircle2 size={18} style={{ color: 'var(--success-text)' }} /><div><p className="text-[12.5px] font-[700]" style={{ color: 'var(--text-primary)' }}>No immediate operator action</p><p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>There are no failed payments, open critical/high alerts, pending plan requests or near-term renewals.</p></div></div> : <>{requested > 0 && <SignalRow tone="caution" text={`${requested} studio${requested === 1 ? '' : 's'} waiting on a plan request`} detail="Finance" onClick={() => router.push('/platform?tab=finance&sub=billing')} />}{renewalDue > 0 && <SignalRow tone="caution" text={`${renewalDue} renewal${renewalDue === 1 ? '' : 's'} due within 7 days`} detail="Billing" onClick={() => router.push('/platform?tab=finance&sub=billing')} />}{ops.failed_payments_30d > 0 && <SignalRow tone="critical" text={`${ops.failed_payments_30d} failed payment${ops.failed_payments_30d === 1 ? '' : 's'} in the last 30 days`} detail="Payments" onClick={() => router.push('/platform?tab=finance&sub=payments')} />}{openAlerts > 0 && <SignalRow tone="critical" text={`${openAlerts} open alert${openAlerts === 1 ? '' : 's'} (${sec.critical_alerts} critical)`} detail="Security" onClick={() => router.push('/platform?tab=security')} />}</>}
        </Panel>
      </Reveal>

      <Reveal delay={0.16}>
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div><div className="flex items-end justify-between gap-4"><SectionLabel hint={<button onClick={() => router.push('/platform?tab=studios')} className="flex items-center gap-1 font-[700]" style={{ color: 'var(--brand)' }}>View all <ChevronRight size={12} /></button>}>Studios</SectionLabel></div>{topStudios.length === 0 ? <Panel><p className="py-8 text-center text-[12.5px]" style={{ color: 'var(--text-muted)' }}>No studios yet.</p></Panel> : <Panel padded={false} className="overflow-hidden"><ul>{topStudios.map((s, i) => <li key={s.id} style={{ borderTop: i ? '1px solid var(--border)' : 'none' }}><button onClick={() => router.push(`/platform/studios/${s.id}`)} className="group flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors"><StudioMark name={s.name} logoUrl={s.logo_url} size={34} /><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate text-[12.5px] font-[720]" style={{ color: 'var(--text-primary)' }}>{s.name}</p><Badge tone={s.status === 'suspended' ? 'danger' : 'success'}>{s.status}</Badge></div><p className="mt-0.5 text-[10.5px]" style={{ color: 'var(--text-muted)' }}>{s.active_clients}/{s.total_clients} clients · {fmtINR(s.revenue)} revenue</p></div><ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--text-disabled)' }} /></button></li>)}</ul></Panel>}</div>
          <div><div className="flex items-end justify-between gap-4"><SectionLabel>Tenancy health</SectionLabel><span className="inline-flex items-center gap-1 text-[10.5px] font-[650]" style={{ color: 'var(--text-muted)' }}><HeartPulse size={12} /> Isolation</span></div><TenancyHealthCard /></div>
        </div>
      </Reveal>

      <Reveal delay={0.2}><div className="overflow-hidden rounded-[18px] border" style={{ borderColor: 'var(--border)', background: 'linear-gradient(135deg, var(--bg-subtle), var(--bg-elevated))' }}><div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"><div className="flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-[9px]" style={{ background: 'var(--bg-elevated)', color: 'var(--brand)' }}><Sparkles size={15} /></div><div><p className="text-[11.5px] font-[700]" style={{ color: 'var(--text-primary)' }}>Operator snapshot</p><p className="text-[10.5px]" style={{ color: 'var(--text-muted)' }}>Overview data is served from the platform cache and can be refreshed on demand.</p></div></div><span className="flex items-center gap-1.5 text-[10.5px]" style={{ color: 'var(--text-disabled)' }}><Activity size={11} /> Up to 5 minutes old</span></div></div></Reveal>
    </div>
  );
}

function SignalRow({ tone, text, detail, onClick }: { tone: 'caution' | 'critical' | 'positive' | 'neutral'; text: string; detail: string; onClick?: () => void }) {
  const color = tone === 'critical' ? 'var(--danger)' : tone === 'caution' ? 'var(--warning)' : tone === 'positive' ? 'var(--success)' : 'var(--text-disabled)';
  return <button onClick={onClick} className="group flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors" style={{ borderTop: '1px solid var(--border)' }}><span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} /><span className="min-w-0 flex-1"><span className="block truncate text-[12.5px] font-[620]" style={{ color: 'var(--text-primary)' }}>{text}</span><span className="text-[10.5px]" style={{ color: 'var(--text-muted)' }}>{detail}</span></span><ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--text-disabled)' }} /></button>;
}
