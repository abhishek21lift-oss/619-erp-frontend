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

  const cards = [
    { label: 'Studios', value: String(biz.total_studios), sub: `${biz.active_studios} active`, tone: 'brand', icon: <Building2 size={18} />, action: () => router.push('/platform?tab=studios') },
    { label: 'Active clients', value: String(biz.active_clients), sub: `${biz.total_clients} total · ${biz.new_clients_30d} new 30d`, tone: 'caution', icon: <Users size={18} />, action: undefined },
    { label: 'Collected revenue', value: fmtINR(collected30d), sub: `last 30 days · ${rev.active_subscriptions} active`, tone: 'positive', icon: <TrendingUp size={18} />, action: () => router.push('/platform?tab=finance&sub=payments') },
    { label: 'Failed payments', value: String(ops.failed_payments_30d), sub: `${rev.expiring_in_7d} subscriptions expiring in 7d`, tone: ops.failed_payments_30d > 0 ? 'critical' : 'neutral', icon: <CreditCard size={18} />, action: () => router.push('/platform?tab=finance&sub=payments') },
  ] as const;

  const toneColor = (tone: typeof cards[number]['tone']) => tone === 'positive' ? 'var(--success)' : tone === 'critical' ? 'var(--danger)' : tone === 'caution' ? 'var(--warning)' : 'var(--brand)';
  const toneText = (tone: typeof cards[number]['tone']) => tone === 'positive' ? 'var(--success-text)' : tone === 'critical' ? 'var(--danger-text)' : tone === 'caution' ? 'var(--warning-text)' : 'var(--brand)';

  return (
    <div className="space-y-6 pb-6 sm:space-y-7">
      <Reveal delay={0.02}>
        <section className="relative overflow-hidden rounded-[22px] border px-4 py-4 sm:px-6 sm:py-5" style={{ borderColor: platformHealthy ? 'color-mix(in srgb, var(--success) 24%, var(--border))' : 'color-mix(in srgb, var(--danger) 26%, var(--border))', background: platformHealthy ? 'linear-gradient(135deg, color-mix(in srgb, var(--success) 8%, var(--bg-elevated)) 0%, color-mix(in srgb, var(--brand) 5%, var(--bg-elevated)) 48%, var(--bg-elevated) 100%)' : 'linear-gradient(135deg, color-mix(in srgb, var(--danger) 8%, var(--bg-elevated)) 0%, color-mix(in srgb, var(--warning) 5%, var(--bg-elevated)) 52%, var(--bg-elevated) 100%)', boxShadow: 'var(--shadow-card), inset 0 1px 0 rgba(255,255,255,0.35)' }}>
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full" style={{ background: `radial-gradient(circle, ${platformHealthy ? 'var(--brand)' : 'var(--danger)'} 0%, transparent 68%)`, opacity: 0.12, filter: 'blur(26px)' }} />
          <div aria-hidden className="pointer-events-none absolute -bottom-20 left-[22%] h-36 w-36 rounded-full" style={{ background: `radial-gradient(circle, ${platformHealthy ? 'var(--success)' : 'var(--warning)'} 0%, transparent 70%)`, opacity: 0.10, filter: 'blur(24px)' }} />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px]" style={{ background: platformHealthy ? 'color-mix(in srgb, var(--success) 13%, var(--bg-elevated))' : 'color-mix(in srgb, var(--danger) 13%, var(--bg-elevated))', color: platformHealthy ? 'var(--success-text)' : 'var(--danger-text)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.55)' }}>{platformHealthy ? <ShieldCheck size={23} /> : <CircleAlert size={23} />}</div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-[850] uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>Platform status</span><span className="h-1.5 w-1.5 rounded-full" style={{ background: platformHealthy ? 'var(--success)' : 'var(--danger)' }} /><span className="text-[10.5px] font-[800]" style={{ color: platformHealthy ? 'var(--success-text)' : 'var(--danger-text)' }}>{platformHealthy ? 'Operational' : 'Attention required'}</span></div>
                <h1 className="mt-1 text-[21px] font-[820] tracking-[-0.035em] sm:text-[25px]" style={{ color: 'var(--text-primary)' }}>{platformHealthy ? 'Platform is running smoothly.' : `${openAlerts} platform alert${openAlerts === 1 ? '' : 's'} need attention.`}</h1>
                <p className="mt-0.5 max-w-2xl text-[11.5px] leading-5 sm:text-[12px]" style={{ color: 'var(--text-muted)' }}>{platformHealthy ? 'Your command surface is healthy across studios, payments and platform signals.' : 'Start with the attention signals below, then drill into the affected area.'}</p>
              </div>
            </div>
            <button onClick={() => void load(true)} disabled={refreshing} className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-[12px] px-4 py-2.5 text-[11.5px] font-[750] transition-transform active:scale-[0.98]" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', boxShadow: '0 5px 14px rgba(15,23,42,0.05)' }}><RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />{refreshing ? 'Refreshing' : 'Refresh snapshot'}</button>
          </div>
        </section>
      </Reveal>

      <Reveal delay={0.07}>
        <div className="mb-2.5 flex items-end justify-between gap-3"><SectionLabel hint={<span className="rounded-full px-2 py-1 text-[9.5px] font-[800]" style={{ background: 'color-mix(in srgb, var(--brand) 7%, var(--bg-subtle))', color: 'var(--text-muted)' }}>{cached ? 'Cached snapshot' : 'Live snapshot'}</span>}>Platform pulse</SectionLabel><span className="hidden text-[10px] sm:inline" style={{ color: 'var(--text-disabled)' }}>4 core signals</span></div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {cards.map((card) => {
            const accent = toneColor(card.tone); const accentText = toneText(card.tone);
            return <button key={card.label} onClick={card.action} disabled={!card.action} className="group min-h-[145px] text-left disabled:cursor-default" style={{ WebkitTapHighlightColor: 'transparent' }}>
              <div className="relative h-full overflow-hidden rounded-[19px] border p-4 transition-all duration-200 group-hover:-translate-y-0.5 group-active:translate-y-0" style={{ borderColor: 'var(--border)', background: `linear-gradient(145deg, color-mix(in srgb, ${accent} 8%, var(--bg-elevated)) 0%, var(--bg-elevated) 56%, color-mix(in srgb, ${accent} 4%, var(--bg-elevated)) 100%)`, boxShadow: 'var(--shadow-card)' }}>
                <div aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${accent}, color-mix(in srgb, ${accent} 20%, transparent))` }} />
                <div aria-hidden className="absolute -right-8 -top-8 h-20 w-20 rounded-full" style={{ background: `radial-gradient(circle, ${accent} 0%, transparent 70%)`, opacity: 0.10, filter: 'blur(10px)' }} />
                <div className="relative flex items-center justify-between gap-2"><span className="text-[10px] font-[850] uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>{card.label}</span><span className="flex h-9 w-9 items-center justify-center rounded-[11px]" style={{ background: `color-mix(in srgb, ${accent} 12%, var(--bg-subtle))`, color: accentText }}>{card.icon}</span></div>
                <div className="relative mt-4 tabular-nums text-[28px] font-[850] tracking-[-0.045em] sm:text-[31px]" style={{ color: 'var(--text-primary)' }}>{card.value}</div>
                <div className="relative mt-1 min-h-[18px] text-[10.5px] leading-4" style={{ color: 'var(--text-muted)' }}>{card.sub}</div>
                {card.action && <ArrowUpRight size={14} className="absolute bottom-4 right-4 opacity-50 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" style={{ color: accentText }} />}
              </div>
            </button>;
          })}
        </div>
      </Reveal>

      <Reveal delay={0.12}>
        <div className="flex items-end justify-between gap-3"><SectionLabel>Needs attention</SectionLabel><span className="rounded-full px-2 py-1 text-[9.5px] font-[800]" style={{ background: attentionCount ? 'color-mix(in srgb, var(--warning) 11%, var(--bg-subtle))' : 'color-mix(in srgb, var(--success) 10%, var(--bg-subtle))', color: attentionCount ? 'var(--warning-text)' : 'var(--success-text)' }}>{attentionCount ? `${attentionCount} signal${attentionCount === 1 ? '' : 's'}` : 'All clear'}</span></div>
        <Panel padded={false} className="overflow-hidden" style={{ background: 'linear-gradient(135deg, var(--bg-elevated), color-mix(in srgb, var(--brand) 3%, var(--bg-elevated)))' }}>
          {attentionCount === 0 ? <div className="flex items-center gap-3 px-4 py-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px]" style={{ background: 'color-mix(in srgb, var(--success) 11%, var(--bg-subtle))', color: 'var(--success-text)' }}><CheckCircle2 size={18} /></span><div><p className="text-[12.5px] font-[750]" style={{ color: 'var(--text-primary)' }}>No immediate operator action</p><p className="text-[11px] leading-5" style={{ color: 'var(--text-muted)' }}>No failed payments, open critical/high alerts, pending plan requests or near-term renewals.</p></div></div> : <div>{requested > 0 && <SignalRow tone="caution" text={`${requested} studio${requested === 1 ? '' : 's'} waiting on a plan request`} detail="Finance" onClick={() => router.push('/platform?tab=finance&sub=billing')} />}{renewalDue > 0 && <SignalRow tone="caution" text={`${renewalDue} renewal${renewalDue === 1 ? '' : 's'} due within 7 days`} detail="Billing" onClick={() => router.push('/platform?tab=finance&sub=billing')} />}{ops.failed_payments_30d > 0 && <SignalRow tone="critical" text={`${ops.failed_payments_30d} failed payment${ops.failed_payments_30d === 1 ? '' : 's'} in the last 30 days`} detail="Payments" onClick={() => router.push('/platform?tab=finance&sub=payments')} />}{openAlerts > 0 && <SignalRow tone="critical" text={`${openAlerts} open alert${openAlerts === 1 ? '' : 's'} (${sec.critical_alerts} critical)`} detail="Security" onClick={() => router.push('/platform?tab=security')} />}</div>}
        </Panel>
      </Reveal>

      <Reveal delay={0.17}>
        <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
          <section>
            <div className="flex items-end justify-between gap-3"><SectionLabel hint={<button onClick={() => router.push('/platform?tab=studios')} className="flex min-h-[44px] items-center gap-1 font-[750]" style={{ color: 'var(--brand)' }}>View all <ChevronRight size={12} /></button>}>Studios</SectionLabel></div>
            {topStudios.length === 0 ? <Panel><p className="py-8 text-center text-[12.5px]" style={{ color: 'var(--text-muted)' }}>No studios yet.</p></Panel> : <Panel padded={false} className="overflow-hidden"><ul>{topStudios.map((s, i) => <li key={s.id} style={{ borderTop: i ? '1px solid var(--border)' : 'none' }}><button onClick={() => router.push(`/platform/studios/${s.id}`)} className="group flex min-h-[58px] w-full items-center gap-3 px-4 py-3 text-left transition-colors" style={{ WebkitTapHighlightColor: 'transparent' }}><StudioMark name={s.name} logoUrl={s.logo_url} size={35} /><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate text-[12.5px] font-[730]" style={{ color: 'var(--text-primary)' }}>{s.name}</p><Badge tone={s.status === 'suspended' ? 'danger' : 'success'}>{s.status}</Badge></div><p className="mt-0.5 text-[10.5px]" style={{ color: 'var(--text-muted)' }}>{s.active_clients}/{s.total_clients} clients · {fmtINR(s.revenue)} revenue</p></div><ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--text-disabled)' }} /></button></li>)}</ul></Panel>}
          </section>

          <section>
            <div className="flex items-end justify-between gap-3"><SectionLabel>Tenancy health</SectionLabel><span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9.5px] font-[750]" style={{ background: 'color-mix(in srgb, var(--brand) 7%, var(--bg-subtle))', color: 'var(--text-muted)' }}><HeartPulse size={12} style={{ color: 'var(--brand)' }} /> Isolation</span></div>
            <TenancyHealthCard />
          </section>
        </div>
      </Reveal>

      <Reveal delay={0.22}>
        <div className="relative overflow-hidden rounded-[18px] border" style={{ borderColor: 'color-mix(in srgb, var(--brand) 12%, var(--border))', background: 'linear-gradient(135deg, color-mix(in srgb, var(--brand) 5%, var(--bg-elevated)), var(--bg-elevated))' }}>
          <div aria-hidden className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full" style={{ background: 'radial-gradient(circle, var(--brand) 0%, transparent 70%)', opacity: 0.10, filter: 'blur(12px)' }} />
          <div className="relative flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5"><div className="flex items-center gap-3"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]" style={{ background: 'color-mix(in srgb, var(--brand) 10%, var(--bg-subtle))', color: 'var(--brand)' }}><Sparkles size={15} /></div><div><p className="text-[11.5px] font-[750]" style={{ color: 'var(--text-primary)' }}>Operator snapshot</p><p className="text-[10.5px] leading-4" style={{ color: 'var(--text-muted)' }}>Overview data is served from the platform cache and can be refreshed on demand.</p></div></div><span className="flex items-center gap-1.5 text-[10.5px]" style={{ color: 'var(--text-disabled)' }}><Activity size={11} /> Up to 5 minutes old</span></div>
        </div>
      </Reveal>
    </div>
  );
}

function SignalRow({ tone, text, detail, onClick }: { tone: 'caution' | 'critical'; text: string; detail: string; onClick: () => void }) {
  const color = tone === 'critical' ? 'var(--danger)' : 'var(--warning)';
  const textColor = tone === 'critical' ? 'var(--danger-text)' : 'var(--warning-text)';
  return <button onClick={onClick} className="group flex min-h-[58px] w-full items-center gap-3 border-t px-4 py-3 text-left transition-colors first:border-t-0" style={{ borderColor: 'var(--border)', WebkitTapHighlightColor: 'transparent' }}><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]" style={{ background: `color-mix(in srgb, ${color} 11%, var(--bg-subtle))`, color: textColor }}><CircleAlert size={15} /></span><span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-[680]" style={{ color: 'var(--text-primary)' }}>{text}</span><span className="text-[10.5px]" style={{ color: 'var(--text-muted)' }}>{detail}</span></span><ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--text-disabled)' }} /></button>;
}
