'use client';

// Platform Analytics — is the product being USED?
//
// Deliberately not a second billing dashboard. Finance already answers MRR,
// ARPU, plan mix and cash collected; showing any of that here would give an
// operator two numbers for one question and no way to tell which is right.
// This panel answers what money cannot: are studios working inside the
// product, and which ones stopped.
//
// ── Why small multiples rather than one chart ────────────────────────────
//
// The five trend metrics have wildly different scales — a handful of studios
// against hundreds of check-ins. Plotting them on one axis flattens the small
// series into the baseline; plotting them on two axes is the single most
// misleading thing a chart can do, because the crossover point is an artefact
// of the scales chosen. So each metric gets its own panel and its own scale,
// and the shared x-axis is what makes them comparable.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { m } from 'framer-motion';
import {
  Loader2, TrendingUp, AlertTriangle, Trophy, Users, Activity,
  CalendarDays, ScanFace, Building2, RefreshCw,
} from 'lucide-react';
import { api } from '@/lib/api';
import type {
  PlatformAnalytics, AnalyticsTrendPoint, AnalyticsCohort,
} from '@/lib/api';
import { Panel, SectionLabel, Reveal } from './console';
import { CcBars, CcCard, CcHBars, CcStat } from './cc-viz';
import { EmptyState } from '@/components/ui';
import { errorMessage } from '@/lib/forms/errors';

/* ── Formatting ──────────────────────────────────────────────────────────── */

const nf = (n: number) => n.toLocaleString('en-IN');

function fmtWhen(d?: string | null): string {
  if (!d) return 'never';
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (days < 1) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return months < 12 ? `${months}mo ago` : `${Math.floor(months / 12)}y ago`;
}

/* ── Sparkline ───────────────────────────────────────────────────────────── */

/**
 * One metric over the window. Its own y-scale, always anchored at zero so the
 * height of the line means the value rather than its distance from an
 * arbitrary floor.
 *
 * Hover is on by default: an HTML chart that cannot tell you which month a
 * point is has thrown away the only thing it had over a number.
 */
function CohortGrid({ cohorts }: { cohorts: AnalyticsCohort[] }) {
  const width = useMemo(() => {
    let max = 0;
    for (const c of cohorts) {
      for (const k of Object.keys(c.retention)) max = Math.max(max, Number(k));
    }
    return max + 1;
  }, [cohorts]);

  if (!cohorts.length) {
    return (
      <Panel>
        <EmptyState icon={<CalendarDays size={20} />} title="No cohorts yet"
          description="Retention appears once studios have been on the platform for a full month." />
      </Panel>
    );
  }

  return (
    <Panel padded={false}>
      {/* The grid can outgrow a phone, so it scrolls inside its own box
          rather than pushing the page sideways. */}
      <div className="overflow-x-auto p-3.5 sm:p-5">
        <table className="w-full border-separate" style={{ borderSpacing: '3px' }}>
          <thead>
            <tr>
              <th className="text-left text-[10px] font-[750] uppercase"
                style={{ color: 'var(--text-muted)', letterSpacing: '0.12em' }}>
                Joined
              </th>
              <th className="px-1 text-right text-[10px] font-[750] uppercase"
                style={{ color: 'var(--text-muted)', letterSpacing: '0.12em' }}>
                Size
              </th>
              {Array.from({ length: width }, (_, i) => (
                <th key={i} className="min-w-[38px] text-center text-[10px] font-[700] tabular-nums"
                  style={{ color: 'var(--text-disabled)' }}>
                  M{i}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cohorts.map((c) => (
              <tr key={c.label}>
                <td className="whitespace-nowrap pr-2 text-[11.5px] font-[650]"
                  style={{ color: 'var(--text-primary)' }}>
                  {c.label}
                </td>
                <td className="px-1 text-right text-[11.5px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
                  {c.size}
                </td>
                {Array.from({ length: width }, (_, i) => {
                  const n = c.retention[String(i)] ?? 0;
                  const pct = c.size > 0 ? n / c.size : 0;
                  const empty = n === 0;
                  return (
                    <td key={i} className="p-0">
                      <div
                        className="flex h-[30px] items-center justify-center rounded-[6px] text-[11px] font-[700] tabular-nums"
                        title={`${c.label} · month ${i}: ${n} of ${c.size} studios active`}
                        style={{
                          background: empty
                            ? 'var(--bg-subtle)'
                            : `color-mix(in srgb, var(--brand) ${Math.round(14 + pct * 72)}%, transparent)`,
                          // Above roughly half saturation the brand fill is
                          // dark enough that body ink stops passing contrast.
                          color: empty ? 'var(--text-disabled)' : pct > 0.55 ? '#fff' : 'var(--text-primary)',
                        }}
                      >
                        {empty ? '·' : `${Math.round(pct * 100)}%`}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

/* ── Feature adoption ────────────────────────────────────────────────────── */

const ADOPTION_LABEL: Record<string, string> = {
  sessions: 'Sessions booked',
  clients: 'Clients onboarded',
  attendance: 'Attendance marked',
  ai_suite: 'AI Suite used',
};

/* ── Panel ───────────────────────────────────────────────────────────────── */

const WINDOWS = [6, 12, 24];

export default function AnalyticsPanel() {
  const [data, setData] = useState<PlatformAnalytics | null>(null);
  const [months, setMonths] = useState(12);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((m: number) => {
    setLoading(true);
    setError(null);
    api.superAdmin.analytics(m)
      .then((r) => setData(r.data))
      .catch((e) => setError(errorMessage(e, 'Could not load analytics')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(months); }, [load, months]);

  const totals = useMemo(() => {
    const t = data?.trend ?? [];
    const sum = (k: keyof AnalyticsTrendPoint) => t.reduce((a, p) => a + Number(p[k] ?? 0), 0);
    return {
      sessions: sum('sessions'),
      clients: sum('clients_added'),
      checkIns: sum('check_ins'),
      joined: sum('studios_joined'),
      // Not a sum: a studio active in three months would be counted three
      // times. The latest month is the honest "right now" figure.
      activeNow: t.length ? Number(t[t.length - 1].active_studios) : 0,
    };
  }, [data]);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center gap-2.5 py-16">
        <Loader2 size={22} className="animate-spin" style={{ color: 'var(--brand)' }} />
        <p className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>Crunching platform usage…</p>
      </div>
    );
  }

  if (error) {
    return (
      <Panel>
        <EmptyState icon={<AlertTriangle size={20} />} title="Could not load analytics" description={error} />
      </Panel>
    );
  }
  if (!data) return null;

  const live = data.studios.live;
  const engagedPct = live > 0 ? Math.round((totals.activeNow / live) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* ── Window picker ── */}
      <div className="flex items-center justify-between gap-3">
        <SectionLabel hint={`${data.studios.live} live · ${data.studios.total} total`}>
          Product usage
        </SectionLabel>
        <div className="flex items-center gap-1.5">
          {WINDOWS.map((w) => (
            <button
              key={w}
              onClick={() => setMonths(w)}
              className="min-h-[44px] rounded-[8px] px-2.5 text-[11px] font-[700] transition-colors"
              style={{
                background: months === w ? 'var(--brand)' : 'var(--bg-subtle)',
                color: months === w ? '#fff' : 'var(--text-muted)',
                border: '1px solid var(--border)',
              }}
            >
              {w}m
            </button>
          ))}
          <button
            onClick={() => load(months)} aria-label="Refresh analytics"
            className="flex items-center justify-center rounded-[8px] transition-colors"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-muted)', minHeight: 44, minWidth: 44 }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : undefined} />
          </button>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CcStat tone="sky" label="Active studios" value={nf(totals.activeNow)} icon={<Activity size={15} />}
          sub={`${engagedPct}% of ${live} live worked this month`} />
        <CcStat tone={data.at_risk.length > 0 ? 'orange' : 'green'} label="At risk" value={nf(data.at_risk.length)} icon={<AlertTriangle size={15} />}
          sub="Paying, nothing done in 30 days" />
        <CcStat tone="teal" label="Clients added" value={nf(totals.clients)} icon={<Users size={15} />}
          sub={`Across ${data.months} months`} />
        <CcStat tone="purple" label="Studios joined" value={nf(totals.joined)} icon={<Building2 size={15} />}
          sub={`Across ${data.months} months`} />
      </div>

      {/* ── Trend, as small multiples — each on its own scale ── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {([
          { key: 'active_studios', label: 'Active studios', icon: <Activity size={15} />, total: totals.activeNow, tone: 'sky', sub: 'this month' },
          { key: 'clients_added', label: 'Clients added', icon: <Users size={15} />, total: totals.clients, tone: 'teal', sub: `${data.months} months` },
          { key: 'check_ins', label: 'Check-ins', icon: <ScanFace size={15} />, total: totals.checkIns, tone: 'orange', sub: `${data.months} months` },
          { key: 'sessions', label: 'Sessions', icon: <CalendarDays size={15} />, total: totals.sessions, tone: 'purple', sub: `${data.months} months` },
        ] as const).map((sp) => (
          <CcCard key={sp.key} tone={sp.tone} eyebrow="Engagement" title={sp.label} icon={sp.icon}
            action={<span className="text-right"><span className="block text-[18px] font-[850] tabular-nums" style={{ color: 'var(--text-primary)' }}>{nf(sp.total)}</span><span className="text-[10.5px]" style={{ color: 'var(--text-muted)' }}>{sp.sub}</span></span>}>
            <CcBars tone={sp.tone} height={120}
              data={data.trend.map((p) => ({ label: p.label.split(' ')[0], title: p.label, value: Number(p[sp.key] ?? 0) }))}
              empty={`No ${sp.label.toLowerCase()} in ${data.months} months`} />
          </CcCard>
        ))}
      </div>

      {/* ── Adoption ── */}
      <CcCard tone="indigo" eyebrow="Feature adoption" title={`Studios using each feature · ${live} live`} icon={<Building2 size={15} />}>
        <CcHBars max={100} rows={data.adoption.map((r) => ({ label: ADOPTION_LABEL[r.key] ?? r.key, value: r.pct, sub: `${r.studios} of ${live} · ${r.pct}%` }))} empty="No live studio yet" />
      </CcCard>

      {/* ── Cohorts ── */}
      <div>
        <SectionLabel hint="Share of each signup cohort still doing real work">
          Retention by cohort
        </SectionLabel>
        <Reveal><CohortGrid cohorts={data.cohorts} /></Reveal>
      </div>

      {/* ── At risk ── */}
      <div>
        <SectionLabel hint="Paying, but no sessions, clients or check-ins in 30 days">
          Needs attention
        </SectionLabel>
        <Reveal>
          <Panel padded={false}>
            {data.at_risk.length === 0 ? (
              <div className="p-5">
                <EmptyState icon={<TrendingUp size={20} />} title="Every paying studio is active"
                  description="No subscribed studio has gone quiet in the last 30 days." />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Studio', 'Plan', 'Active clients', 'Last login'].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-[10px] font-[750] uppercase"
                          style={{ color: 'var(--text-muted)', letterSpacing: '0.12em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.at_risk.map((s) => (
                      <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td className="px-4 py-3 text-[12.5px] font-[650]" style={{ color: 'var(--text-primary)' }}>
                          {s.name}
                        </td>
                        <td className="px-4 py-3 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                          {s.plan_code ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-[12px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
                          {s.active_clients}
                        </td>
                        <td className="px-4 py-3 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                          {fmtWhen(s.last_login)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </Reveal>
      </div>

      {/* ── Leaderboard ── */}
      <div>
        <SectionLabel hint="Last 30 days">Most active studios</SectionLabel>
        <Reveal>
          <Panel padded={false}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['', 'Studio', 'Sessions', 'Check-ins', 'Active clients'].map((h, i) => (
                      <th key={i} className="px-4 py-2.5 text-[10px] font-[750] uppercase"
                        style={{ color: 'var(--text-muted)', letterSpacing: '0.12em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.leaderboard.map((s, i) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="w-8 px-4 py-3">
                        {i < 3
                          ? <Trophy size={13} style={{ color: ['#f59e0b', '#94a3b8', '#b45309'][i] }} />
                          : <span className="text-[11px] tabular-nums" style={{ color: 'var(--text-disabled)' }}>{i + 1}</span>}
                      </td>
                      <td className="px-4 py-3 text-[12.5px] font-[650]" style={{ color: 'var(--text-primary)' }}>
                        {s.name}
                      </td>
                      <td className="px-4 py-3 text-[12px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
                        {nf(s.sessions_30d)}
                      </td>
                      <td className="px-4 py-3 text-[12px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
                        {nf(s.check_ins_30d)}
                      </td>
                      <td className="px-4 py-3 text-[12px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
                        {nf(s.active_clients)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </Reveal>
      </div>
    </div>
  );
}
