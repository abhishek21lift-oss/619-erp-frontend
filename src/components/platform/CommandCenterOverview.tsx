'use client';

/**
 * The Command Center home — the platform's "right now", from live data only.
 *
 * What this replaced, and why it was rebuilt rather than patched:
 *
 *   - "Risk posture: LIVE". It read `guardian.score` and `analytics.risk_score`,
 *     neither of which any endpoint returns, and printed LIVE in their place.
 *   - Security, Storage and Infrastructure tiles read `.status` fields that do
 *     not exist and fell back to the word "live" — a label shaped like a reading.
 *   - Empty model and studio charts drew one full-width bar labelled "No
 *     telemetry yet"; health with no cards read "0/1".
 *   - Sixteen "operator surface" cards — Playground, Fusion, Embeddings, Image
 *     & vision, Audio/TTS, MCP & API docs, Client integrations, Agents — for
 *     features this product does not have. Every one routed to the AI tab.
 *   - The money was missing entirely: MRR, ARR, the plan mix, the lifecycle
 *     spread, trial conversion and churn were computed by
 *     /subscription-metrics and shown nowhere in the console.
 *
 * Every number below comes from one of the platform endpoints; a failed
 * source shows as unavailable rather than as a zero.
 */

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity, AlertTriangle, Bot, Building2, CheckCircle2, CreditCard, HeartPulse, IndianRupee,
  LayoutDashboard, LifeBuoy, RefreshCw, ShieldAlert, ShieldCheck, ToggleRight, TrendingUp, Users2,
} from 'lucide-react';
import { api } from '@/lib/api';
import type {
  AiOverview, AiTrendPoint, CommandCenterSnapshot, GuardianReport, PlatformAnalytics, PlatformKpis,
  SecurityOverview, SubscriptionMetrics, SupportOverview, SystemAlertList,
} from '@/lib/api';
import {
  CcBars, CcCard, CcChip, CcDonut, CcEmpty, CcHBars, CcHero, CcHeroButton, CcHeroStat, CcIcon, CcLink, CcRing, CcStat,
  compact, fillMonths, inr, inrCompact, nfIN, type Tone,
} from './cc-viz';
import { ccSeries, ccState } from './ccTheme';
import { MODULES } from '@/app/(platform)/platform/_shared/types';
import type { ModuleId } from '@/app/(platform)/platform/_shared/types';

type Sources = {
  kpis?: PlatformKpis;
  money?: SubscriptionMetrics;
  snapshot?: CommandCenterSnapshot;
  alerts?: SystemAlertList;
  guardian?: GuardianReport;
  ai?: AiOverview;
  aiTrend?: AiTrendPoint[];
  analytics?: PlatformAnalytics;
  security?: SecurityOverview;
  support?: SupportOverview;
};

const LOADERS: { [K in keyof Sources]-?: (fresh: boolean) => Promise<{ data: NonNullable<Sources[K]> }> } = {
  kpis: () => api.superAdmin.kpis(),
  money: () => api.superAdmin.subscriptionMetrics(),
  snapshot: (fresh) => api.superAdmin.commandCenter({ fresh }),
  alerts: () => api.superAdmin.commandCenterAlerts({ scope: 'live', limit: 8 }),
  guardian: (fresh) => api.superAdmin.commandCenterGuardian({ fresh }),
  ai: () => api.superAdmin.aiOverview(30),
  aiTrend: () => api.superAdmin.aiTrend(30),
  analytics: () => api.superAdmin.analytics(6),
  security: () => api.superAdmin.securityOverview(),
  support: () => api.superAdmin.supportOverview(),
};

const MODULE_META: Record<ModuleId, { icon: ReactNode; tone: Tone; copy: string }> = {
  overview: { icon: <LayoutDashboard size={17} />, tone: 'indigo', copy: 'This page' },
  studios: { icon: <Building2 size={17} />, tone: 'sky', copy: 'Studios, sign-ups and invitations' },
  users: { icon: <Users2 size={17} />, tone: 'teal', copy: 'Every account on the platform' },
  revenue: { icon: <CreditCard size={17} />, tone: 'green', copy: 'Billing, payments, invoices, coupons' },
  ai: { icon: <Bot size={17} />, tone: 'purple', copy: 'Usage, cost, allowances and routing' },
  operations: { icon: <HeartPulse size={17} />, tone: 'orange', copy: 'Health, storage and support' },
  security: { icon: <ShieldAlert size={17} />, tone: 'pink', copy: 'Sign-ins, audit, activity, tenancy' },
  control: { icon: <ToggleRight size={17} />, tone: 'blue', copy: 'Feature flags and announcements' },
};

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default function CommandCenterOverview() {
  const router = useRouter();
  const go = (tab: string) => router.push(tab === 'overview' ? '/platform' : `/platform?tab=${tab}`);
  const [d, setD] = useState<Sources>({});
  const [failed, setFailed] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (fresh = false) => {
    if (fresh) setRefreshing(true);
    const keys = Object.keys(LOADERS) as (keyof Sources)[];
    const results = await Promise.allSettled(keys.map((k) => LOADERS[k](fresh)));
    const next: Sources = {}; const bad: string[] = [];
    results.forEach((r, i) => {
      const k = keys[i];
      if (r.status === 'fulfilled') (next as Record<string, unknown>)[k] = r.value.data;
      else bad.push(k);
    });
    setD(next); setFailed(bad); setLoading(false); setRefreshing(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const { kpis, money, snapshot, alerts, guardian, ai, aiTrend, analytics, security, support } = d;

  // ── Health, from the collector cards ────────────────────────────────────
  const health = useMemo(() => {
    const cards = Object.values(snapshot?.cards ?? {});
    const n = (pred: (s: string) => boolean) => cards.filter((c) => pred(c.status)).length;
    return {
      total: cards.length,
      healthy: n((s) => s === 'healthy'),
      attention: n((s) => s === 'warning' || s === 'degraded' || s === 'timeout'),
      critical: n((s) => s === 'critical'),
      unmeasured: n((s) => s === 'unavailable'),
    };
  }, [snapshot]);

  const revenueBars = useMemo(() => fillMonths(money?.revenue_trend ?? [], 12, (r) => r.revenue_inr), [money]);
  const growthBars = useMemo(() => fillMonths(money?.growth ?? [], 12, (r) => r.new_studios), [money]);
  const aiBars = useMemo(() => (aiTrend ?? []).map((p) => ({
    label: new Date(p.day).toLocaleDateString('en-IN', { day: 'numeric' }),
    title: new Date(p.day).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    value: p.tokens,
  })), [aiTrend]);
  const usage = analytics?.trend ?? [];

  if (loading) {
    return (
      <div className="flex min-h-[520px] items-center justify-center" role="status" aria-label="Loading the Command Center">
        <RefreshCw size={24} className="animate-spin" style={{ color: 'var(--brand)' }} />
      </div>
    );
  }

  const liveAlerts = alerts?.alerts ?? [];
  const findings = guardian?.findings ?? [];
  const status = snapshot?.status;
  const headline = !snapshot ? 'Platform health is unavailable'
    : status === 'critical' ? 'Something is failing right now'
    : health.attention > 0 ? `${health.attention} signal${health.attention === 1 ? '' : 's'} need a look`
    : 'Everything is running';
  const statusColor = !snapshot ? ccState.unknown
    : status === 'critical' ? ccState.critical
    : health.attention > 0 ? ccState.warning : ccState.healthy;
  const b = kpis?.business;
  const states = money?.states;
  const unavailable = (k: keyof Sources) => failed.includes(k);

  return (
    <div className="relative space-y-5 pb-10">
      <CcHero
        tone="indigo"
        eyebrow={`${greeting()} · Command Center`}
        title={headline}
        icon={<LayoutDashboard size={22} />}
        subtitle={snapshot
          ? <>{health.healthy} of {health.total} signals healthy{health.critical ? ` · ${health.critical} critical` : ''}{health.unmeasured ? ` · ${health.unmeasured} not measured` : ''} · checked {new Date(snapshot.collected_at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</>
          : 'The health collector did not answer. Studio and revenue figures below are still live.'}
        actions={<CcHeroButton onClick={() => void load(true)} disabled={refreshing}><RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />{refreshing ? 'Refreshing' : 'Refresh'}</CcHeroButton>}
      >
        <CcHeroStat label="Studios" value={b ? nfIN(b.active_studios) : '—'} sub={b ? `active of ${nfIN(b.total_studios)} · ${nfIN(b.trial_studios)} on trial` : 'unavailable'} />
        <CcHeroStat label="Clients" value={b ? nfIN(b.active_clients) : '—'} sub={b ? `active · +${nfIN(b.new_clients_30d)} in 30 days` : 'unavailable'} />
        <CcHeroStat label="MRR" value={money ? inrCompact(money.mrr_inr) : '—'} sub={money ? `${nfIN(money.paying_studios)} paying · ARR ${inrCompact(money.arr_inr)}` : 'unavailable'} />
        <CcHeroStat label="Collected · 30d" value={kpis ? inrCompact(kpis.platform_revenue.collected_30d_inr) : '—'} sub={kpis ? `${nfIN(kpis.operations.failed_payments_30d)} failed payments` : 'unavailable'} />
      </CcHero>

      {failed.length > 0 && (
        <div role="status" className="flex items-start gap-2.5 rounded-[16px] px-4 py-3 text-[12px]" style={{ background: 'var(--warning-bg, rgba(245,158,11,0.1))', border: '1px solid var(--warning-border, rgba(245,158,11,0.3))', color: 'var(--text-secondary)' }}>
          <AlertTriangle size={15} style={{ color: ccState.warning, flexShrink: 0, marginTop: 1 }} />
          <span>Some sources did not answer and are shown as unavailable, not as zero: <b>{failed.join(', ')}</b>.</span>
        </div>
      )}

      {/* ── Attention row ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CcStat tone="pink" icon={<AlertTriangle size={15} />} label="Live alerts"
          value={alerts ? nfIN(liveAlerts.length) : '—'}
          sub={alerts ? (alerts.stats.critical ? `${alerts.stats.critical} critical` : liveAlerts.length ? 'none critical' : 'all clear') : 'unavailable'}
          onClick={() => go('health')} />
        <CcStat tone="purple" icon={<ShieldCheck size={15} />} label="Guardian"
          value={guardian ? nfIN(findings.length) : '—'}
          sub={guardian ? (findings.length ? `finding${findings.length === 1 ? '' : 's'} · ${guardian.rules_evaluated} rules run` : `${guardian.rules_evaluated} rules, none matched`) : 'unavailable'}
          onClick={() => go('health')} />
        <CcStat tone="orange" icon={<LifeBuoy size={15} />} label="Support queue"
          value={support ? nfIN(support.open + support.pending) : '—'}
          sub={support ? `${support.urgent_live} urgent · ${support.awaiting_first_reply} unanswered` : 'unavailable'}
          onClick={() => go('support')} />
        <CcStat tone="sky" icon={<ShieldAlert size={15} />} label="Operators w/o MFA"
          value={security ? `${security.operators.without_mfa}/${security.operators.total}` : '—'}
          sub={security ? `${security.logins_24h.failed_24h} failed sign-ins · 24h` : 'unavailable'}
          onClick={() => go('security')} />
      </div>

      {/* ── Money ─────────────────────────────────────────────────────── */}
      <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <CcCard tone="green" eyebrow="Revenue" title="Subscription cash collected" icon={<IndianRupee size={16} />}
          action={<CcLink tone="green" onClick={() => go('finance')}>Open Finance →</CcLink>}>
          {money ? (
            <>
              <div className="mb-4 grid grid-cols-3 gap-2">
                {[
                  ['12 months', inrCompact(revenueBars.reduce((a, x) => a + x.value, 0))],
                  ['ARPU', money.paying_studios ? inr(money.arpu_inr) : '—'],
                  ['Refunded', inrCompact((money.revenue_trend ?? []).reduce((a, x) => a + x.refunded_inr, 0))],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-[14px] px-3 py-2.5" style={{ background: 'var(--bg-subtle)' }}>
                    <p className="text-[10px] font-[750] uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)' }}>{k}</p>
                    <p className="mt-0.5 text-[16px] font-[850] tabular-nums" style={{ color: 'var(--text-primary)' }}>{v}</p>
                  </div>
                ))}
              </div>
              <CcBars data={revenueBars} tone="green" format={inr} height={170} empty="No subscription payment in the last 12 months" />
            </>
          ) : <CcEmpty title="Revenue is unavailable" body="The subscription metrics did not load." />}
        </CcCard>

        <CcCard tone="sky" eyebrow="Lifecycle" title="Where every studio stands" icon={<Building2 size={16} />}
          action={<CcLink tone="sky" onClick={() => go('studios')}>Studios →</CcLink>}>
          {states ? (
            <CcDonut centerLabel="studios" data={[
              { label: 'Paying', value: states.active, color: ccSeries[0] },
              { label: 'On trial', value: states.on_trial, color: ccSeries[3] },
              { label: 'Trial lapsed', value: states.trial_lapsed, color: ccSeries[2] },
              { label: 'Period lapsed', value: states.lapsed, color: ccSeries[6] },
              { label: 'Frozen', value: states.frozen, color: ccSeries[5] },
              { label: 'Suspended', value: states.suspended, color: ccSeries[4] },
              { label: 'Cancelled / expired', value: states.cancelled + states.expired, color: ccState.unknown },
            ]} />
          ) : <CcEmpty title="Lifecycle is unavailable" />}
        </CcCard>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <CcCard tone="purple" eyebrow="Plan mix" title="Paying studios by plan" icon={<CreditCard size={16} />}>
          {money ? (
            <CcDonut stack size={148} centerLabel="paying" data={money.plan_distribution.map((p) => ({ label: p.name, value: p.studios }))} empty="No paying studio yet" />
          ) : <CcEmpty title="Plan mix is unavailable" />}
        </CcCard>

        <CcCard tone="orange" eyebrow="Platform health" title="Signals by state" icon={<HeartPulse size={16} />}
          action={<CcLink tone="orange" onClick={() => go('health')}>Health →</CcLink>}>
          {snapshot ? (
            <CcDonut stack size={148} centerLabel={`of ${health.total} healthy`} centerValue={nfIN(health.healthy)} data={[
              { label: 'Healthy', value: health.healthy, color: ccState.healthy },
              { label: 'Needs a look', value: health.attention, color: ccState.warning },
              { label: 'Critical', value: health.critical, color: ccState.critical },
              { label: 'Not measured', value: health.unmeasured, color: ccState.unknown },
            ]} />
          ) : <CcEmpty title="The health collector did not answer" />}
        </CcCard>

        <CcCard tone="teal" eyebrow="Conversion" title="Trials and churn" icon={<TrendingUp size={16} />}>
          {money ? (
            <div className="grid grid-cols-2 gap-3">
              <CcRing tone="teal" size={112} pct={money.trial_conversion.rate_pct} label="Trial → paid"
                sub={money.trial_conversion.started ? `${money.trial_conversion.converted} of ${money.trial_conversion.started}` : 'no trial yet'} />
              <CcRing tone="pink" size={112} pct={money.churn.rate_30d_pct} label="Churn · 30d"
                sub={money.churn.rate_30d_pct == null ? 'nobody paying yet' : `${money.churn.cancelled_30d} cancelled`} />
              <div className="col-span-2 rounded-[14px] px-3 py-2.5 text-[11.5px]" style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                Founder slots: <b style={{ color: 'var(--text-primary)' }}>{money.founders.granted}</b> of {money.founders.limit} granted · {money.founders.slots_remaining} left
              </div>
            </div>
          ) : <CcEmpty title="Conversion is unavailable" />}
        </CcCard>
      </div>

      {/* ── Growth and usage ──────────────────────────────────────────── */}
      <div className="grid gap-5 xl:grid-cols-2">
        <CcCard tone="sky" eyebrow="Growth" title="New paying studios per month" icon={<Building2 size={16} />}>
          {money ? <CcBars data={growthBars} tone="sky" height={150} empty="No studio has activated a paid plan in 12 months" /> : <CcEmpty title="Growth is unavailable" />}
        </CcCard>
        <CcCard tone="teal" eyebrow="Product usage" title="What studios did · 6 months" icon={<Activity size={16} />}
          action={<CcLink tone="teal" onClick={() => go('analytics')}>Analytics →</CcLink>}>
          {analytics ? (
            <>
              <CcBars data={usage.map((p) => ({ label: p.label.split(' ')[0], title: p.label, value: p.clients_added }))} tone="teal" height={120} empty="No client was added in 6 months" />
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  ['Clients added', usage.reduce((a, p) => a + p.clients_added, 0)],
                  ['Sessions', usage.reduce((a, p) => a + p.sessions, 0)],
                  ['Check-ins', usage.reduce((a, p) => a + p.check_ins, 0)],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-[14px] px-3 py-2.5" style={{ background: 'var(--bg-subtle)' }}>
                    <p className="text-[10px] font-[750] uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)' }}>{k}</p>
                    <p className="mt-0.5 text-[16px] font-[850] tabular-nums" style={{ color: 'var(--text-primary)' }}>{nfIN(Number(v))}</p>
                  </div>
                ))}
              </div>
            </>
          ) : <CcEmpty title="Usage is unavailable" />}
        </CcCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <CcCard tone="purple" eyebrow="AI Suite" title="Tokens per day · 30 days" icon={<Bot size={16} />}
          action={<CcLink tone="purple" onClick={() => go('ai')}>AI Control →</CcLink>}>
          {ai ? (
            <>
              <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  ['Requests', nfIN(ai.requests)],
                  ['Tokens', compact(ai.tokens)],
                  ['Avg latency', ai.requests ? `${nfIN(ai.avg_latency_ms)} ms` : '—'],
                  ['Fell back', ai.requests ? `${ai.fallback_pct}%` : '—'],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-[14px] px-3 py-2.5" style={{ background: 'var(--bg-subtle)' }}>
                    <p className="text-[10px] font-[750] uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)' }}>{k}</p>
                    <p className="mt-0.5 text-[16px] font-[850] tabular-nums" style={{ color: 'var(--text-primary)' }}>{v}</p>
                  </div>
                ))}
              </div>
              <CcBars data={aiBars} tone="purple" format={compact} height={130} empty="No AI request in the last 30 days" />
            </>
          ) : <CcEmpty title="AI usage is unavailable" />}
        </CcCard>

        <CcCard tone="pink" eyebrow="Needs attention" title="Alerts and Guardian findings" icon={<AlertTriangle size={16} />}
          action={<CcLink tone="pink" onClick={() => go('health')}>Open →</CcLink>}>
          {!alerts && !guardian ? <CcEmpty title="Alerts are unavailable" />
            : liveAlerts.length === 0 && findings.length === 0 ? (
              <div className="flex items-center gap-3 rounded-[16px] p-4" style={{ background: `color-mix(in srgb, ${ccState.healthy} 10%, transparent)` }}>
                <CheckCircle2 size={20} style={{ color: ccState.healthy }} />
                <div>
                  <p className="text-[13px] font-[750]" style={{ color: 'var(--text-primary)' }}>Nothing needs you</p>
                  <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>No live alert, and every Guardian rule ran clean.</p>
                </div>
              </div>
            ) : (
              <ul className="space-y-2">
                {liveAlerts.slice(0, 4).map((a) => (
                  <li key={a.id} className="rounded-[14px] px-3 py-2.5" style={{ background: 'var(--bg-subtle)' }}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="min-w-0 truncate text-[12.5px] font-[750]" style={{ color: 'var(--text-primary)' }}>{a.title}</p>
                      <CcChip color={a.severity === 'critical' ? ccState.critical : ccState.warning}>{a.severity}</CcChip>
                    </div>
                    {a.reason && <p className="mt-0.5 line-clamp-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>{a.reason}</p>}
                  </li>
                ))}
                {findings.slice(0, Math.max(0, 5 - Math.min(4, liveAlerts.length))).map((f) => (
                  <li key={f.id} className="rounded-[14px] px-3 py-2.5" style={{ background: 'var(--bg-subtle)' }}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="min-w-0 truncate text-[12.5px] font-[750]" style={{ color: 'var(--text-primary)' }}>{f.title}</p>
                      <CcChip color={f.severity === 'critical' ? ccState.critical : f.severity === 'warning' ? ccState.warning : ccState.info}>Guardian</CcChip>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>{f.conclusion}</p>
                  </li>
                ))}
              </ul>
            )}
        </CcCard>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <CcCard tone="pink" eyebrow="Security · 24h" title="Sign-in outcomes" icon={<ShieldAlert size={16} />}
          action={<CcLink tone="pink" onClick={() => go('security')}>Security →</CcLink>}>
          {security ? (
            <CcDonut size={140} centerLabel="sign-ins" data={[
              { label: 'Succeeded', value: security.logins_24h.success_24h, color: ccState.healthy },
              { label: 'Failed', value: security.logins_24h.failed_24h, color: ccState.critical },
              { label: 'MFA failed', value: security.logins_24h.mfa_failed_24h, color: ccState.warning },
            ]} empty="No sign-in in 24h" />
          ) : <CcEmpty title="Security is unavailable" />}
        </CcCard>
        <CcCard tone="orange" eyebrow="Support" title="Ticket queue" icon={<LifeBuoy size={16} />}
          action={<CcLink tone="orange" onClick={() => go('support')}>Support →</CcLink>}>
          {support ? (
            <>
              <CcHBars rows={[
                { label: 'Open', value: support.open },
                { label: 'Pending', value: support.pending },
                { label: 'Unassigned', value: support.unassigned },
                { label: 'Never answered', value: support.awaiting_first_reply },
                { label: 'Resolved', value: support.resolved },
              ]} />
              <p className="mt-3 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
                Median first reply {support.median_first_response_hours == null ? '—' : `${support.median_first_response_hours}h`} · median resolution {support.median_resolution_hours == null ? '—' : `${support.median_resolution_hours}h`}
              </p>
            </>
          ) : <CcEmpty title="Support is unavailable" />}
        </CcCard>
      </div>

      {/* ── Modules — the eight that exist, nothing more ─────────────── */}
      <div>
        <p className="mb-3 text-[10.5px] font-[800] uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Jump to</p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {MODULES.filter((m) => m.id !== 'overview').map((m) => {
            const meta = MODULE_META[m.id];
            const live = unavailable('kpis') ? null : m.id === 'studios' ? b?.total_studios
              : m.id === 'operations' ? (alerts ? liveAlerts.length : null) : null;
            return (
              <button key={m.id} type="button" onClick={() => go(m.tabs[0])}
                className="group flex items-center gap-3 rounded-[20px] p-3.5 text-left transition-transform hover:-translate-y-0.5"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
                <CcIcon tone={meta.tone} size={40}>{meta.icon}</CcIcon>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-[13.5px] font-[800]" style={{ color: 'var(--text-primary)' }}>{m.label}</span>
                    {live != null && <span className="rounded-full px-1.5 text-[10px] font-[800] tabular-nums" style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>{live}</span>}
                  </span>
                  <span className="block truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>{meta.copy}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
