'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, ArrowUpRight, Building2, CheckCircle2, ChevronRight, CircleAlert, CreditCard, HeartPulse, Loader2, RefreshCw, ShieldCheck, Sparkles, TrendingUp, Users } from 'lucide-react';
import StudioMark from '@/components/StudioMark';
import { Badge } from '@/components/ui';
import { api } from '@/lib/api';
import type { PlatformKpis, PlatformOverview, SubStudio } from '@/lib/api';
import { Panel, Reveal, SectionLabel } from '@/components/platform/console';
import { fmtINR } from '../_shared/format';
import { Center, ErrorState } from '../_shared/ui';
import { TenancyHealthCard } from './_health/TenancyHealthCard';

type OverviewTile = {
  label: string;
  value: string;
  sub: string;
  tone: 'brand' | 'caution' | 'positive' | 'critical' | 'neutral';
  icon: React.ReactNode;
  action?: () => void;
};

const TONE = {
  brand: { line: 'var(--brand)', soft: 'color-mix(in srgb, var(--brand) 10%, var(--bg-elevated))', icon: 'var(--brand)' },
  caution: { line: 'var(--warning)', soft: 'color-mix(in srgb, var(--warning) 10%, var(--bg-elevated))', icon: 'var(--warning-text)' },
  positive: { line: 'var(--success)', soft: 'color-mix(in srgb, var(--success) 10%, var(--bg-elevated))', icon: 'var(--success-text)' },
  critical: { line: 'var(--danger)', soft: 'color-mix(in srgb, var(--danger) 10%, var(--bg-elevated))', icon: 'var(--danger-text)' },
  neutral: { line: 'var(--text-secondary)', soft: 'var(--bg-subtle)', icon: 'var(--text-secondary)' },
} as const;

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

  const tiles: OverviewTile[] = [
    { label: 'Studios', value: String(biz.total_studios), sub: `${biz.active_studios} active`, tone: 'brand', icon: <Building2 size={18} />, action: () => router.push('/platform?tab=studios') },
    { label: 'Active clients', value: String(biz.active_clients), sub: `${biz.total_clients} total · ${biz.new_clients_30d} new 30d`, tone: 'caution', icon: <Users size={18} /> },
    { label: 'Collected revenue', value: fmtINR(collected30d), sub: `last 30 days · ${rev.active_subscriptions} active`, tone: 'positive', icon: <TrendingUp size={18} />, action: () => router.push('/platform?tab=finance&sub=payments') },
    { label: 'Failed payments', value: String(ops.failed_payments_30d), sub: `${rev.expiring_in_7d} subscriptions expiring in 7d`, tone: ops.failed_payments_30d > 0 ? 'critical' : 'neutral', icon: <CreditCard size={18} />, action: () => router.push('/platform?tab=finance&sub=payments') },
  ];

  const statusTone = platformHealthy ? TONE.positive : TONE.critical;

  return (
    <div className="space-y-5 pb-6">
      <Reveal delay={0.02}>
        <section className="relative overflow-hidden rounded-[18px] border p-4 sm:p-5" style={{ borderColor: platformHealthy ? 'color-mix(in srgb, var(--success) 25%, var(--border))' : 'color-mix(in srgb, var(--danger) 28%, var(--border))', background: platformHealthy ? 'linear-gradient(135deg, color-mix(in srgb, var(--success) 8%, var(--bg-elevated)), var(--bg-elevated) 62%, color-mix(in srgb, var(--brand) 5%, var(--bg-elevated)))' : 'linear-gradient(135deg, color-mix(in srgb, var(--danger) 9%, var(--bg-elevated)), var(--bg-elevated) 62%, color-mix(in srgb, var(--warning) 6%, var(--bg-elevated)))', boxShadow: 'var(--shadow-card), inset 0 1px 0 rgba(255,255,255,0.18)' }}>
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full blur-3xl" style={{ background: `color-mix(in srgb, ${statusTone.line} 16%, transparent)` }} />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px]" style={{ background: statusTone.soft, color: statusTone.icon, border: `1px solid color-mix(in srgb, ${statusTone.line} 20%, var(--border))` }}>{platformHealthy ? <ShieldCheck size={22} /> : <CircleAlert size={22} />}</div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-[800] uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Platform status</span><span className="h-1.5 w-1.5 rounded-full" style={{ background: statusTone.line }} /><span className="text-[10.5px] font-[750]" style={{ color: statusTone.icon }}>{platformHealthy ? 'Operational' : 'Attention required'}</span></div>
                <h1 className="mt-0.5 truncate text-[20px] font-[820] tracking-[-0.035em] sm:text-[24px]" style={{ color: 'var(--text-primary)' }}>{platformHealthy ? 'Platform is operating normally.' : `${openAlerts} platform alert${openAlerts === 1 ? '' : 's'} need attention.`}</h1>
                <p className="mt-0.5 text-[11.5px] leading-5" style={{ color: 'var(--text-muted)' }}>{platformHealthy ? 'Studios, revenue and payment signals are within the current operating thresholds.' : 'Review the attention signals below first.'}</p>
              </div>
            </div>
            <button type="button" onClick={() => void load(true)} disabled={refreshing} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-[10px] px-3.5 text-[11.5px] font-[750] transition-transform active:scale-[0.98]" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', boxShadow: 'var(--shadow-sm)' }}><RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />{refreshing ? 'Refreshing' : 'Refresh snapshot'}</button>
          </div>
        </section>
      </Reveal>

      <Reveal delay={0.06}>
        <div className="flex items-end justify-between gap-3"><SectionLabel hint={<span className="rounded-full px-2 py-0.5 text-[9.5px] font-[750]" style={{ background: cached ? 'color-mix(in srgb, var(--warning) 10%, var(--bg-subtle))' : 'color-mix(in srgb, var(--success) 10%, var(--bg-subtle))', color: cached ? 'var(--warning-text)' : 'var(--success-text)' }}>{cached ? 'Cached snapshot' : 'Live snapshot'}</span>}>Platform pulse</SectionLabel><span className="hidden text-[10px] sm:inline" style={{ color: 'var(--text-disabled)' }}>4 core signals</span></div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {tiles.map((t) => { const tone = TONE[t.tone]; return <button key={t.label} type="button" onClick={() => t.action?.()} disabled={!t.action} className="group min-w-0 text-left disabled:cursor-default" style={{ WebkitTapHighlightColor: 'transparent' }}><div className="relative h-full overflow-hidden rounded-[16px] border p-4 transition-all duration-200 group-hover:-translate-y-0.5" style={{ borderColor: `color-mix(in srgb, ${tone.line} 18%, var(--border))`, background: `linear-gradient(145deg, ${tone.soft}, var(--bg-elevated) 66%)`, boxShadow: 'var(--shadow-sm)' }}><div aria-hidden className="absolute inset-x-0 top-0 h-0.5" style={{ background: `linear-gradient(90deg, ${tone.line}, color-mix(in srgb, ${tone.line} 30%, transparent))` }} /><div className="mb-4 flex items-center justify-between gap-2"><span className="text-[10px] font-[800] uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>{t.label}</span><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]" style={{ background: tone.soft, color: tone.icon, border: `1px solid color-mix(in srgb, ${tone.line} 18%, var(--border))` }}>{t.icon}</span></div><div className="tabular-nums text-[27px] font-[820] tracking-[-0.045em] sm:text-[31px]" style={{ color: 'var(--text-primary)' }}>{t.value}</div><div className="mt-1 min-h-[18px] text-[10.5px] leading-4" style={{ color: 'var(--text-muted)' }}>{t.sub}</div>{t.action && <ArrowUpRight size={13} className="absolute bottom-4 right-4 opacity-40 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" style={{ color: tone.icon }} />}</div></button>; })}
        </div>
      </Reveal>

      <Reveal delay={0.10}>
        <section className="overflow-hidden rounded-[16px] border" style={{ borderColor: attentionCount ? 'color-mix(in srgb, var(--warning) 22%, var(--border))' : 'color-mix(in srgb, var(--success) 22%, var(--border))', background: 'var(--bg-elevated)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="flex items-center justify-between gap-3 border-b px-4 py-3" style={{ borderColor: 'var(--border)' }}><div><p className="text-[10px] font-[800] uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>Needs attention</p><p className="mt-0.5 text-[12px] font-[700]" style={{ color: 'var(--text-primary)' }}>{attentionCount ? `${attentionCount} signal${attentionCount === 1 ? '' : 's'} to review` : 'No immediate operator action'}</p></div><span className="flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-[10px] font-[800]" style={{ background: attentionCount ? 'color-mix(in srgb, var(--warning) 11%, var(--bg-subtle))' : 'color-mix(in srgb, var(--success) 11%, var(--bg-subtle))', color: attentionCount ? 'var(--warning-text)' : 'var(--success-text)' }}>{attentionCount || '✓'}</span></div>
          {attentionCount === 0 ? <div className="flex items-center gap-3 px-4 py-3.5"><CheckCircle2 size={17} style={{ color: 'var(--success-text)' }} /><p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>There are no failed payments, open critical/high alerts, pending plan requests or near-term renewals.</p></div> : <div>{requested > 0 && <SignalRow tone="caution" text={`${requested} studio${requested === 1 ? '' : 's'} waiting on a plan request`} detail="Finance" onClick={() => router.push('/platform?tab=finance&sub=billing')} />}{renewalDue > 0 && <SignalRow tone="caution" text={`${renewalDue} renewal${renewalDue === 1 ? '' : 's'} due within 7 days`} detail="Billing" onClick={() => router.push('/platform?tab=finance&sub=billing')} />}{ops.failed_payments_30d > 0 && <SignalRow tone="critical" text={`${ops.failed_payments_30d} failed payment${ops.failed_payments_30d === 1 ? '' : 's'} in the last 30 days`} detail="Payments" onClick={() => router.push('/platform?tab=finance&sub=payments')} />}{openAlerts > 0 && <SignalRow tone="critical" text={`${openAlerts} open alert${openAlerts === 1 ? '' : 's'} (${sec.critical_alerts} critical)`} detail="Security" onClick={() => router.push('/platform?tab=security')} />}</div>}
        </section>
      </Reveal>

      <Reveal delay={0.14}>
        <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
          <section className="overflow-hidden rounded-[16px] border" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)', boxShadow: 'var(--shadow-sm)' }}>
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3" style={{ borderColor: 'var(--border)' }}><div><p className="text-[10px] font-[800] uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>Studios</p><p className="mt-0.5 text-[12px] font-[700]" style={{ color: 'var(--text-primary)' }}>Platform portfolio</p></div><button type="button" onClick={() => router.push('/platform?tab=studios')} className="flex items-center gap-1 text-[10.5px] font-[750]" style={{ color: 'var(--brand)' }}>View all <ChevronRight size={12} /></button></div>
            {topStudios.length === 0 ? <p className="px-4 py-8 text-center text-[11.5px]" style={{ color: 'var(--text-muted)' }}>No studios yet.</p> : <ul>{topStudios.map((s, i) => <li key={s.id} style={{ borderTop: i ? '1px solid var(--border)' : 'none' }}><button type="button" onClick={() => router.push(`/platform/studios/${s.id}`)} className="group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"><StudioMark name={s.name} logoUrl={s.logo_url} size={34} /><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate text-[12px] font-[720]" style={{ color: 'var(--text-primary)' }}>{s.name}</p><Badge tone={s.status === 'suspended' ? 'danger' : 'success'}>{s.status}</Badge></div><p className="mt-0.5 text-[10.5px]" style={{ color: 'var(--text-muted)' }}>{s.active_clients}/{s.total_clients} clients · {fmtINR(s.revenue)} revenue</p></div><ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--text-disabled)' }} /></button></li>)}</ul>}
          </section>
          <section className="overflow-hidden rounded-[16px] border" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)', boxShadow: 'var(--shadow-sm)' }}>
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3" style={{ borderColor: 'var(--border)' }}><div><p className="text-[10px] font-[800] uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>Tenancy health</p><p className="mt-0.5 text-[12px] font-[700]" style={{ color: 'var(--text-primary)' }}>Isolation posture</p></div><HeartPulse size={15} style={{ color: 'var(--brand)' }} /></div><div className="p-2"><TenancyHealthCard /></div>
          </section>
        </div>
      </Reveal>

      <Reveal delay={0.18}>
        <div className="flex items-center justify-between gap-3 rounded-[16px] border px-4 py-3" style={{ borderColor: 'var(--border)', background: 'linear-gradient(90deg, color-mix(in srgb, var(--brand) 6%, var(--bg-elevated)), var(--bg-elevated))', boxShadow: 'var(--shadow-sm)' }}><div className="flex min-w-0 items-center gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px]" style={{ background: 'color-mix(in srgb, var(--brand) 10%, var(--bg-subtle))', color: 'var(--brand)' }}><Sparkles size={14} /></span><div className="min-w-0"><p className="text-[11px] font-[750]" style={{ color: 'var(--text-primary)' }}>Operator snapshot</p><p className="truncate text-[10px]" style={{ color: 'var(--text-muted)' }}>Overview data is served from the platform cache and can be refreshed on demand.</p></div></div><span className="hidden shrink-0 items-center gap-1.5 text-[10px] sm:flex" style={{ color: 'var(--text-disabled)' }}><Activity size={11} /> Up to 5 minutes old</span></div>
      </Reveal>
    </div>
  );
}

function SignalRow({ tone, text, detail, onClick }: { tone: 'caution' | 'critical' | 'positive' | 'neutral'; text: string; detail: string; onClick?: () => void }) {
  const color = tone === 'critical' ? 'var(--danger)' : tone === 'caution' ? 'var(--warning)' : tone === 'positive' ? 'var(--success)' : 'var(--text-disabled)';
  return <button type="button" onClick={onClick} className="group flex w-full items-center gap-3 border-t px-4 py-3 text-left transition-colors" style={{ borderColor: 'var(--border)' }}><span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} /><span className="min-w-0 flex-1"><span className="block truncate text-[11.5px] font-[650]" style={{ color: 'var(--text-primary)' }}>{text}</span><span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{detail}</span></span><ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--text-disabled)' }} /></button>;
}
