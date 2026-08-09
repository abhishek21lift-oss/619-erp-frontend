'use client';

// Overview tab — cross-studio KPIs and signals.
//
// Extracted verbatim from the 3,197-line platform/page.tsx (audit H-03).
// Component bodies, props and rendered markup are unchanged.
import { useCallback, useEffect, useState } from 'react';
import {
  Building2, Loader2, Users, IndianRupee, Clock, Snowflake, Crown, Receipt, ArrowRight,
  TrendingUp, ChevronRight,
} from 'lucide-react';
import StudioMark from '@/components/StudioMark';
import { Badge } from '@/components/ui';
import { api } from '@/lib/api';
import type {
  PlatformOverview, StudioOverview, ActivityEntry, SubStudio, SubKpis, SubscriptionMetrics,
} from '@/lib/api';
import { Panel, StatTile, Reveal, SectionLabel } from '@/components/platform/console';
import { BarChart, HBarChart, StackedBar, Ring } from '@/components/platform/charts';
import { fmtINR, fmtWhen } from '../_shared/format';
import type { NavOpts, Tab } from '../_shared/types';
import { Center, ErrorState } from '../_shared/ui';
import { activityLabel } from './ActivityTab';

export const SIGNAL_DOT: Record<'critical' | 'caution' | 'positive' | 'neutral', string> = {
  critical: '#EF4444', caution: '#F59E0B', positive: '#10B981', neutral: 'var(--text-disabled)',
};

/* ─────────────────────────────────────────────────────── OVERVIEW */
export function OverviewTab({ onNavigate }: { onNavigate: (tab: Tab, opts?: NavOpts) => void }) {
  const [data, setData] = useState<PlatformOverview | null>(null);
  const [subKpis, setSubKpis] = useState<SubKpis | null>(null);
  const [subStudios, setSubStudios] = useState<SubStudio[]>([]);
  const [metrics, setMetrics] = useState<SubscriptionMetrics | null>(null);
  const [recent, setRecent] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true); setError('');
    Promise.all([api.superAdmin.overview(), api.superAdmin.subscriptions()])
      .then(([ov, subs]) => {
        setData(ov.data);
        setSubKpis(subs.data.kpis ?? null);
        setSubStudios(subs.data.studios ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load overview'))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);
  // Bonus panels — each loads independently so a failure in one (e.g. the
  // metrics query) never blanks out the KPIs the operator actually needs.
  useEffect(() => { api.superAdmin.subscriptionMetrics().then((r) => setMetrics(r.data)).catch(() => setMetrics(null)); }, []);
  useEffect(() => { api.superAdmin.listActivity({ limit: 20 }).then((r) => setRecent(r.data)).catch(() => setRecent([])); }, []);

  if (loading) return <Center><Loader2 size={26} className="animate-spin" style={{ color: '#0067e0' }} /></Center>;
  if (error) return <ErrorState error={error} onRetry={load} />;
  if (!data) return null;

  const t = data.totals;
  const revTrend = metrics?.revenue_trend ?? [];
  const lastMonth = revTrend[revTrend.length - 1];
  const prevMonth = revTrend[revTrend.length - 2];
  const revDeltaPct = lastMonth && prevMonth && prevMonth.revenue_inr > 0
    ? Math.round(((lastMonth.revenue_inr - prevMonth.revenue_inr) / prevMonth.revenue_inr) * 100)
    : null;

  const renewalsDue = subStudios.filter((s) => s.renewal_due).length;
  const pendingRequests = subStudios.filter((s) => s.requested_at).length;
  const todayActivity = recent.filter((a) => new Date(a.created_at).toDateString() === new Date().toDateString());

  const kpis = [
    { label: 'Total Studios', value: String(t.studios), sub: `${t.active_studios} active · ${t.suspended_studios} suspended`, tone: 'brand' as const, icon: <Building2 size={15} /> },
    { label: 'Active Clients', value: String(t.active_clients), sub: `${t.total_clients} total`, tone: 'caution' as const, icon: <Users size={15} /> },
    { label: 'MRR', value: metrics ? fmtINR(metrics.mrr_inr) : '—', sub: metrics ? `${fmtINR(metrics.arr_inr)} ARR` : 'loading…', tone: 'positive' as const, icon: <TrendingUp size={15} /> },
    { label: 'ARPU', value: metrics ? fmtINR(metrics.arpu_inr) : '—', sub: metrics ? `${metrics.paying_studios} paying studios` : 'loading…', tone: 'neutral' as const, icon: <IndianRupee size={15} /> },
  ];
  const health = [
    { label: 'Outstanding', value: fmtINR(t.outstanding), sub: 'across all studios', tone: 'critical' as const, icon: <Receipt size={15} /> },
    { label: 'Renewals due', value: String(renewalsDue), sub: 'within 7 days', tone: 'caution' as const, icon: <Clock size={15} /> },
    { label: 'Frozen', value: subKpis ? String(subKpis.frozen) : '—', sub: 'need payment', tone: 'critical' as const, icon: <Snowflake size={15} /> },
    { label: 'Founders', value: subKpis ? `${subKpis.founders}${metrics ? `/${metrics.founders.limit}` : ''}` : '—', sub: subKpis ? `${subKpis.founder_slots_remaining} slots left` : '', tone: 'brand' as const, icon: <Crown size={15} /> },
  ];

  // Real, derived signals from the numbers already on this page — not an LLM
  // call (there's no AI-insights backend yet), just surfaced as sentences
  // instead of left for the operator to notice by scanning every tile.
  const signals: { text: string; tone: keyof typeof SIGNAL_DOT; onClick?: () => void }[] = [];
  if (pendingRequests > 0) signals.push({ text: `${pendingRequests} studio${pendingRequests === 1 ? '' : 's'} waiting on a plan request`, tone: 'caution', onClick: () => onNavigate('finance', { financeSubTab: 'billing' }) });
  if (renewalsDue > 0) signals.push({ text: `${renewalsDue} renewal${renewalsDue === 1 ? '' : 's'} due within 7 days`, tone: 'caution', onClick: () => onNavigate('finance', { financeSubTab: 'billing' }) });
  if (subKpis && subKpis.frozen > 0) signals.push({ text: `${subKpis.frozen} studio${subKpis.frozen === 1 ? '' : 's'} frozen, waiting on payment`, tone: 'critical', onClick: () => onNavigate('finance', { financeSubTab: 'billing' }) });
  if (revDeltaPct != null) signals.push({ text: `Revenue collected ${revDeltaPct >= 0 ? 'up' : 'down'} ${Math.abs(revDeltaPct)}% vs last month`, tone: revDeltaPct >= 0 ? 'positive' : 'critical' });
  if (Number(t.outstanding) > 0) signals.push({ text: `${fmtINR(t.outstanding)} outstanding across all studios`, tone: 'neutral', onClick: () => onNavigate('finance', { financeSubTab: 'dashboard' }) });

  // ── Chart inputs ─────────────────────────────────────────────────────────
  // All of this was already being fetched and thrown away: before this the
  // whole of subscriptionMetrics fed exactly one number, revDeltaPct.
  const revenuePoints = revTrend.map((r) => ({ label: r.label, value: Number(r.revenue_inr || 0) }));
  const growthPoints = (metrics?.growth ?? []).map((g) => ({ label: g.label, value: Number(g.new_studios || 0) }));
  const planRows = (metrics?.plan_distribution ?? [])
    .filter((p) => p.studios > 0)
    .map((p) => ({ label: p.name, value: p.studios, sub: fmtINR(p.mrr_inr) }));

  // Eight lifecycle states collapse to four buckets. Eight segments on one bar
  // are unreadable, and more to the point an operator does not act differently
  // on 'expired' than on 'cancelled' — both are gone. The buckets are what the
  // decisions actually divide on.
  const st = metrics?.states;
  const lifecycle = st ? [
    { label: 'Active', value: st.active },
    { label: 'On trial', value: st.on_trial },
    { label: 'At risk', value: st.frozen + st.lapsed + st.trial_lapsed + st.suspended },
    { label: 'Ended', value: st.expired + st.cancelled },
  ] : [];

  const conv = metrics?.trial_conversion;

  return (
    <div className="space-y-6">
      <div>
        <SectionLabel>Platform</SectionLabel>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {kpis.map((k, i) => (
            <StatTile key={k.label} label={k.label} value={k.value} sub={k.sub}
              icon={k.icon} tone={k.tone} delay={i * 0.04} />
          ))}
        </div>
      </div>

      {/* ── Charts ──────────────────────────────────────────────────────────
          One measure per chart and one axis each. Revenue and studio count
          share a time axis but never a y-scale: ₹10,000 and 4 studios on one
          axis would flatten the studio line onto the baseline, and putting
          them on two axes would make the point where they cross an artefact
          of the scales rather than anything real. */}
      {metrics && (
        <div>
          <SectionLabel hint="last 12 months">Trend</SectionLabel>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <Reveal delay={0.16}>
              <BarChart
                title="Revenue collected"
                points={revenuePoints}
                format={fmtINR}
                hint={revDeltaPct != null
                  ? <span style={{ color: revDeltaPct >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {revDeltaPct >= 0 ? '▲' : '▼'} {Math.abs(revDeltaPct)}% vs last month
                    </span>
                  : 'no prior month to compare'}
              />
            </Reveal>
            <Reveal delay={0.2}>
              <BarChart
                title="New studios"
                points={growthPoints}
                hint={`${growthPoints.reduce((a, p) => a + p.value, 0)} in the window`}
              />
            </Reveal>
          </div>
        </div>
      )}

      {metrics && (
        <div>
          <SectionLabel>Subscription mix</SectionLabel>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <Reveal delay={0.24}>
              <StackedBar
                title="Studio lifecycle"
                segments={lifecycle}
                total={st?.total}
                hint={`${st?.total ?? 0} studios`}
              />
            </Reveal>
            <Reveal delay={0.28}>
              <HBarChart
                title="Plan distribution"
                rows={planRows}
                format={(n) => `${n} studio${n === 1 ? '' : 's'}`}
                hint="studios · MRR"
                empty="No studio is on a paid plan yet."
              />
            </Reveal>
            <Reveal delay={0.32}>
              <Ring
                title="Trial conversion"
                value={conv?.converted ?? 0}
                max={conv?.started ?? 0}
                label={conv?.rate_pct == null ? 'No trials yet' : `${conv.converted} of ${conv.started} converted`}
                sub={conv?.rate_pct == null
                  ? 'The rate appears once a studio has started a trial.'
                  : 'Studios that started a trial and went on to pay.'}
                hint={conv?.rate_pct == null ? '—' : `${conv.rate_pct}%`}
                tone="var(--success)"
              />
            </Reveal>
            <Reveal delay={0.36}>
              <Ring
                title="Founder Club"
                value={metrics.founders.granted}
                max={metrics.founders.limit}
                label={`${metrics.founders.granted} of ${metrics.founders.limit} claimed`}
                sub={`${metrics.founders.slots_remaining} slots left · ${fmtINR(metrics.founders.locked_value_inr)} locked in`}
                hint={`${metrics.founders.slots_remaining} left`}
                tone="var(--accent)"
              />
            </Reveal>
          </div>
        </div>
      )}

      <div>
        <SectionLabel>Health</SectionLabel>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {health.map((k, i) => (
            <StatTile key={k.label} label={k.label} value={k.value} sub={k.sub}
              icon={k.icon} tone={k.tone} delay={0.4 + i * 0.04} />
          ))}
        </div>
      </div>

      {signals.length > 0 && (
        <div>
          <SectionLabel>Needs attention</SectionLabel>
          <Reveal delay={0.3}>
            <Panel padded={false} className="overflow-hidden">
              {signals.map((s, i) => (
                <button
                  key={i} onClick={s.onClick} disabled={!s.onClick}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors disabled:cursor-default"
                  style={{ borderTop: i ? '1px solid var(--border)' : 'none' }}
                  onMouseEnter={(e) => { if (s.onClick) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: SIGNAL_DOT[s.tone] }} />
                  <span className="flex-1 text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>{s.text}</span>
                  {s.onClick && <ChevronRight size={14} style={{ color: 'var(--text-disabled)' }} />}
                </button>
              ))}
            </Panel>
          </Reveal>
        </div>
      )}

      <div>
        <SectionLabel hint={
          <button onClick={() => onNavigate('activity')} className="flex items-center gap-1 font-[650]" style={{ color: 'var(--brand)' }}>
            View all <ArrowRight size={11} />
          </button>
        }>
          Today&apos;s activity
        </SectionLabel>
        <Reveal delay={0.34}>
          <Panel padded={false} className="overflow-hidden">
            {todayActivity.length === 0 ? (
              <p className="py-8 text-center text-[12.5px]" style={{ color: 'var(--text-muted)' }}>Nothing yet today.</p>
            ) : (
              todayActivity.slice(0, 8).map((a, i) => (
                <div key={a.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[12.5px]"
                  style={{ borderTop: i ? '1px solid var(--border)' : 'none' }}>
                  <span className="min-w-0 truncate" style={{ color: 'var(--text-secondary)' }}>
                    {activityLabel(a)}
                    {a.organization_name && <span style={{ color: 'var(--text-muted)' }}> · {a.organization_name}</span>}
                  </span>
                  <span className="flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{fmtWhen(a.created_at)}</span>
                </div>
              ))
            )}
          </Panel>
        </Reveal>
      </div>

      <div>
        <SectionLabel hint={
          <button onClick={() => onNavigate('studios')} className="flex items-center gap-1 font-[650]" style={{ color: 'var(--brand)' }}>
            Manage <ArrowRight size={11} />
          </button>
        }>
          Studios
        </SectionLabel>

        {data.studios.length === 0 ? (
          <Panel><p className="py-8 text-center text-[12.5px]" style={{ color: 'var(--text-muted)' }}>No studios yet.</p></Panel>
        ) : (
          <>
            {/* Phones get cards, not a table. The six-column table overflowed
                its container on a 390pt screen — the Sessions and Status
                columns were simply cut off with no scroll affordance. */}
            <div className="space-y-2.5 lg:hidden">
              {data.studios.map((s: StudioOverview, i: number) => (
                <Reveal key={s.id} delay={0.04 + i * 0.03}>
                  <Panel>
                    <div className="flex items-start gap-3">
                      <StudioMark name={s.name} logoUrl={s.logo_url} size={34} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          {/* Wraps rather than truncating — a studio name is
                              the row's identity and must stay readable. */}
                          <span className="text-[13px] font-[720] leading-tight" style={{ color: 'var(--text-primary)' }}>
                            {s.name}
                          </span>
                          <Badge tone={s.status === 'suspended' ? 'danger' : 'success'}>{s.status}</Badge>
                        </div>
                        <p className="mt-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                          {fmtWhen(s.last_login)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
                      {[
                        { k: 'Revenue', v: fmtINR(s.revenue) },
                        { k: 'Clients', v: `${s.active_clients}/${s.total_clients}` },
                        { k: 'Sessions', v: String(s.sessions_this_month) },
                      ].map((c) => (
                        <div key={c.k}>
                          <p className="text-[9px] font-[750] uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.1em' }}>{c.k}</p>
                          <p className="mt-0.5 text-[13.5px] font-[780] tabular-nums" style={{ color: 'var(--text-primary)' }}>{c.v}</p>
                        </div>
                      ))}
                    </div>
                  </Panel>
                </Reveal>
              ))}
            </div>

            {/* Desktop keeps the dense table — it is the better tool when the
                width is actually there. */}
            <Reveal delay={0.06} className="hidden lg:block">
              <Panel padded={false} className="overflow-hidden">
                <table className="w-full text-left text-[12.5px]">
                  <thead>
                    <tr style={{ color: 'var(--text-muted)' }}>
                      <th className="px-4 py-3 font-[700]">Studio</th>
                      <th className="px-3 py-3 text-right font-[700]">Revenue</th>
                      <th className="px-3 py-3 text-right font-[700]">Clients</th>
                      <th className="px-3 py-3 text-right font-[700]">Sessions</th>
                      <th className="px-3 py-3 font-[700]">Last active</th>
                      <th className="px-4 py-3 font-[700]">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.studios.map((s: StudioOverview) => (
                      <tr key={s.id} className="border-t" style={{ borderColor: 'var(--border)' }}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <StudioMark name={s.name} logoUrl={s.logo_url} size={28} />
                            <span className="font-[680]" style={{ color: 'var(--text-primary)' }}>{s.name}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums font-[680]" style={{ color: 'var(--text-primary)' }}>{fmtINR(s.revenue)}</td>
                        <td className="px-3 py-3 text-right tabular-nums" style={{ color: 'var(--text-secondary)' }}>{s.active_clients}<span style={{ color: 'var(--text-disabled)' }}>/{s.total_clients}</span></td>
                        <td className="px-3 py-3 text-right tabular-nums" style={{ color: 'var(--text-secondary)' }}>{s.sessions_this_month}</td>
                        <td className="px-3 py-3" style={{ color: 'var(--text-muted)' }}>{fmtWhen(s.last_login)}</td>
                        <td className="px-4 py-3"><Badge tone={s.status === 'suspended' ? 'danger' : 'success'}>{s.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Panel>
            </Reveal>
          </>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── STUDIOS */
// One row = three existing endpoints merged by org id: listOrgs (accounts,
// coach/client counts), subscriptions (plan, renewal/request state),
// overview (revenue, outstanding, last login, active vs total clients).
// Nothing here is fetched or computed just for this view — it's the same
// data already shown on Overview and Finance, just joined per studio.
