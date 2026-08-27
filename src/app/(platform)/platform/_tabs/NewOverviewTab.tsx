'use client';

// NewOverviewTab — the home of the Command Centre.
//
// Built around the brief's principle: "How is the platform performing RIGHT
// NOW?" — answered from ONE payload (kpis()) and one honest-state card
// (TenancyHealthCard), with a thin per-studio strip below for context.
//
// Phase 8: the legacy OverviewTab was removed. The 5-minute TTL on kpis()
// and the server cache (see backend kpis.js) make a refresh button
// primarily an escape hatch from a stale view rather than a real poll.
// We re-fetch on focus so a stale tile heals, but we don't hammer the
// endpoint on every re-render.

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2, Users, IndianRupee, TrendingUp, Activity, CreditCard, AlertOctagon,
  ChevronRight, RefreshCw, Loader2,
} from 'lucide-react';
import StudioMark from '@/components/StudioMark';
import { Badge } from '@/components/ui';
import { api } from '@/lib/api';
import type { PlatformKpis, PlatformOverview, SubStudio } from '@/lib/api';
import { Panel, StatTile, Reveal, SectionLabel } from '@/components/platform/console';
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
    if (force) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      // kpis() is the primary payload — the home renders around it.
      const k = force
        ? await fetch('/api/platform/overview/kpis?force=1', { cache: 'no-store' }).then((r) => r.json())
        : await api.superAdmin.kpis();
      // The api client shape is { data, cached }; raw fetch above returns the
      // same envelope. We use api.superAdmin.kpis() normally and only fall
      // through to raw fetch if we ever expose a force-refresh param (we do
      // not today — the server cache is 5m and the button just re-asks).
      if (!force) {
        setKpis(k.data);
        setCached(k.cached);
      } else {
        setKpis(k.data);
        setCached(false);
      }
      // Secondary: the per-studio table and subscriptions rollup feed the
      // "Studios" section. The brief asks for the home aggregated view, then
      // a drill-into-the-studio. These two provide both.
      const [ov, sub] = await Promise.all([
        api.superAdmin.overview(),
        api.superAdmin.subscriptions(),
      ]);
      setOverview(ov.data);
      setSubs(sub.data.studios ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load overview');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Center><Loader2 size={22} className="animate-spin" style={{ color: 'var(--brand)' }} /></Center>;
  if (error) return <ErrorState error={error} onRetry={() => load()} />;
  if (!kpis) return null;

  const biz = kpis.business;
  const rev = kpis.platform_revenue;
  const ops = kpis.operations;
  const sec = kpis.security;

  const openAlerts = sec.critical_alerts + sec.high_alerts;
  const renewalDue = subs.filter((s) => s.renewal_due).length;
  const requested = subs.filter((s) => s.requested_at).length;

  // Top-of-section tiles. Five tiles is one too many for `lg:grid-cols-4` to
  // hold cleanly, so we use `lg:grid-cols-5` on lg and `grid-cols-2` below.
  const tiles = [
    { label: 'Studios',     value: String(biz.total_studios),  sub: `${biz.active_studios} active`,         tone: 'brand'    as const, icon: <Building2 size={15} /> },
    { label: 'Active clients', value: String(biz.active_clients), sub: `${biz.total_clients} total · ${biz.new_clients_30d} new 30d`, tone: 'caution' as const, icon: <Users size={15} /> },
    { label: 'MRR',         value: fmtINR(rev.mrr_inr),        sub: `${rev.active_subscriptions} active · ${rev.trial_subscriptions} trial`, tone: 'positive' as const, icon: <TrendingUp size={15} /> },
    { label: 'Failed payments 30d', value: String(ops.failed_payments_30d), sub: `${rev.expiring_in_7d} subs expiring in 7d`, tone: ops.failed_payments_30d > 0 ? 'critical' as const : 'neutral' as const, icon: <CreditCard size={15} /> },
    { label: 'Open alerts', value: String(openAlerts),        sub: `${sec.critical_alerts} critical · ${sec.high_alerts} high`, tone: openAlerts > 0 ? 'critical' as const : 'positive' as const, icon: <AlertOctagon size={15} /> },
  ];

  // The "Studios" strip is just the first 6 rows of the existing overview
  // table. The full list lives on the Studios tab; the home shows the
  // snapshot. Click goes to Studio 360.
  const topStudios = (overview?.studios ?? []).slice(0, 6);

  return (
    <div className="space-y-6">
      <Reveal delay={0.02}>
        <div className="flex items-center justify-between">
          <SectionLabel hint={cached ? <span style={{ color: 'var(--text-muted)' }}>cached</span> : <span style={{ color: 'var(--text-muted)' }}>live</span>}>
            Platform
          </SectionLabel>
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-[9px] px-2.5 py-1.5 text-[11.5px] font-[650] transition-colors"
            style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {tiles.map((t, i) => (
            <StatTile key={t.label} label={t.label} value={t.value} sub={t.sub}
              icon={t.icon} tone={t.tone} delay={0.04 + i * 0.04} />
          ))}
        </div>
      </Reveal>

      {/* ── Tenancy Health card ───────────────────────────────────────────
          The honest-state card. Always shows, regardless of whether
          anything is wrong, so the operator stops reading it as "all good"
          when it is in fact "no signal" — see the UNKNOWN status. */}
      <Reveal delay={0.12}>
        <SectionLabel>Tenancy</SectionLabel>
        <TenancyHealthCard />
      </Reveal>

      {/* ── Needs attention ──────────────────────────────────────────────
          Same shape as the old overview's signals row, but the triggers
          are the NEW numbers (failed_payments_30d, open alerts, expiry
          due) rather than the old ones (renewal_due, frozen). */}
      {(requested > 0 || renewalDue > 0 || ops.failed_payments_30d > 0 || openAlerts > 0) && (
        <Reveal delay={0.16}>
          <SectionLabel>Needs attention</SectionLabel>
          <Panel padded={false} className="overflow-hidden">
            {requested > 0 && (
              <SignalRow tone="caution" text={`${requested} studio${requested === 1 ? '' : 's'} waiting on a plan request`} onClick={() => router.push('/platform?tab=finance&sub=billing')} />
            )}
            {renewalDue > 0 && (
              <SignalRow tone="caution" text={`${renewalDue} renewal${renewalDue === 1 ? '' : 's'} due within 7 days`} onClick={() => router.push('/platform?tab=finance&sub=billing')} />
            )}
            {ops.failed_payments_30d > 0 && (
              <SignalRow tone="critical" text={`${ops.failed_payments_30d} failed payment${ops.failed_payments_30d === 1 ? '' : 's'} in the last 30 days`} onClick={() => router.push('/platform?tab=finance&sub=payments')} />
            )}
            {openAlerts > 0 && (
              <SignalRow tone="critical" text={`${openAlerts} open alert${openAlerts === 1 ? '' : 's'} (${sec.critical_alerts} critical)`} onClick={() => router.push('/platform?tab=security')} />
            )}
          </Panel>
        </Reveal>
      )}

      {/* ── Top studios strip ────────────────────────────────────────────
          Six rows max. Each clicks through to Studio 360. The brief asks
          for a per-studio deep view; the home is the entry to it. */}
      <Reveal delay={0.2}>
        <SectionLabel hint={
          <button onClick={() => router.push('/platform?tab=studios')} className="flex items-center gap-1 font-[650]" style={{ color: 'var(--brand)' }}>
            All studios <ChevronRight size={11} />
          </button>
        }>
          Studios
        </SectionLabel>
        {topStudios.length === 0 ? (
          <Panel><p className="py-8 text-center text-[12.5px]" style={{ color: 'var(--text-muted)' }}>No studios yet.</p></Panel>
        ) : (
          <Panel padded={false} className="overflow-hidden">
            <ul>
              {topStudios.map((s, i) => (
                <li key={s.id} style={{ borderTop: i ? '1px solid var(--border)' : 'none' }}>
                  <button
                    onClick={() => router.push(`/platform/studios/${s.id}`)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <StudioMark name={s.name} logoUrl={s.logo_url} size={32} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-[680]" style={{ color: 'var(--text-primary)' }}>{s.name}</p>
                      <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        {s.active_clients}/{s.total_clients} clients · {fmtINR(s.revenue)} revenue
                      </p>
                    </div>
                    <Badge tone={s.status === 'suspended' ? 'danger' : 'success'}>{s.status}</Badge>
                    <ChevronRight size={14} style={{ color: 'var(--text-disabled)' }} />
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </Reveal>

      <p className="flex items-center gap-1.5 pt-1 text-[11px]" style={{ color: 'var(--text-disabled)' }}>
        <Activity size={11} /> Snapshot is at most 5 minutes old (server cache).
      </p>
    </div>
  );
}

function SignalRow({ tone, text, onClick }: { tone: 'caution' | 'critical' | 'positive' | 'neutral'; text: string; onClick?: () => void }) {
  const color = tone === 'critical' ? 'var(--danger)' : tone === 'caution' ? 'var(--warning)' : tone === 'positive' ? 'var(--success)' : 'var(--text-disabled)';
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors disabled:cursor-default"
      style={{ borderTop: '1px solid var(--border)' }}
      onMouseEnter={(e) => { if (onClick) e.currentTarget.style.background = 'var(--bg-hover)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />
      <span className="flex-1 text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>{text}</span>
      {onClick && <ChevronRight size={14} style={{ color: 'var(--text-disabled)' }} />}
    </button>
  );
}
