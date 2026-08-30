'use client';

// Studio 360 — the deep view of a single studio from the platform side.
//
// The URL IS the authorization: `:id` is validated as a UUID server-side by
// the platform router, and a non-UUID is rejected with BAD_ID before any
// query runs. The page never reads org_id from a body, query, or local
// state — the source of truth is the path.
//
// Three sections, all read-only, all behind PLATFORM_GUARD:
//
//   1. Health     — activity + login + storage + subscription signals
//                   (mirrors the home Tenancy Health card, scoped to one
//                   org, so a 0-signal studio reads as "inactive" rather
//                   than "healthy").
//   2. Memberships — paginated list of current clients. NO phone, no
//                    email, no payment method — this is the platform
//                    operator's view, not a tenant admin's.
//   3. PT revenue  — totals + 30/90/365-day windows for the operator
//                    who needs "what did this studio collect" at a
//                    glance. The detail (per-client) stays on the
//                    tenant side.
//
// Mutations on the studio still go through the Studios tab; this page
// is deliberately read-only so a bug here cannot accidentally change
// tenant data.

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Loader2, ChevronLeft, AlertTriangle, CheckCircle2, HelpCircle, ShieldOff, Users, Database,
  IndianRupee, TrendingUp, Receipt,
} from 'lucide-react';
import { Badge } from '@/components/ui';
import { api } from '@/lib/api';
import type {
  StudioHealth, StudioMemberships, StudioMembership, StudioPtRevenue,
  TenancySectionStatus,
} from '@/lib/api';
import { Panel, Reveal, SectionLabel, StatTile } from '@/components/platform/console';
import { fmtDate, fmtINR } from '../../_shared/format';
import { Center, ErrorState } from '../../_shared/ui';

type Section = 'health' | 'memberships' | 'revenue';

const SECTION_LABEL: Record<Section, string> = {
  health: 'Health',
  memberships: 'Memberships',
  revenue: 'PT revenue',
};

const STATUS_TONE: Record<TenancySectionStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  HEALTHY: 'success',
  WARNING: 'warning',
  CRITICAL: 'danger',
  UNKNOWN: 'neutral',
};

const STATUS_ICON: Record<TenancySectionStatus, React.ReactNode> = {
  HEALTHY: <CheckCircle2 size={12} />,
  WARNING: <AlertTriangle size={12} />,
  CRITICAL: <ShieldOff size={12} />,
  UNKNOWN: <HelpCircle size={12} />,
};

export default function Studio360Page() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id ?? '';
  const [section, setSection] = useState<Section>('health');

  return (
    <div className="space-y-5">
      <Reveal delay={0.02}>
        <button
          onClick={() => router.push('/platform?tab=studios')}
          className="flex items-center gap-1.5 text-[12px] font-[650] transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          <ChevronLeft size={13} /> All studios
        </button>
      </Reveal>

      <Reveal delay={0.04}>
        <div className="max-w-[500px]">
          <SectionLabel>{id.slice(0, 8)}…</SectionLabel>
        </div>
      </Reveal>

      <Reveal delay={0.06}>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(SECTION_LABEL) as Section[]).map((s) => (
            <button
              key={s}
              onClick={() => setSection(s)}
              className="rounded-[10px] px-3.5 py-1.5 text-[12.5px] font-[650] transition-colors"
              style={{
                background: s === section ? 'var(--brand)' : 'var(--bg-subtle)',
                color: s === section ? '#fff' : 'var(--text-secondary)',
                border: `1px solid ${s === section ? 'var(--brand)' : 'var(--border)'}`,
              }}
            >
              {SECTION_LABEL[s]}
            </button>
          ))}
        </div>
      </Reveal>

      {section === 'health' && <HealthSection id={id} />}
      {section === 'memberships' && <MembershipsSection id={id} />}
      {section === 'revenue' && <RevenueSection id={id} />}
    </div>
  );
}

function HealthSection({ id }: { id: string }) {
  const [data, setData] = useState<StudioHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true); setError('');
    api.superAdmin.studioHealth(id)
      .then((r) => setData(r.data))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load studio health'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Center><Loader2 size={22} className="animate-spin" style={{ color: 'var(--brand)' }} /></Center>;
  if (error) return <ErrorState error={error} onRetry={load} />;
  if (!data) return null;

  const org = data.organization;
  const sub = data.subscription;

  return (
    <div className="space-y-4">
      <Reveal delay={0.08}>
        <Panel>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[15px] font-[800]" style={{ color: 'var(--text-primary)' }}>{org.name}</p>
              <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{org.id}</p>
            </div>
            <Badge tone={org.status === 'suspended' ? 'danger' : org.status === 'trial' ? 'info' : 'success'}>{org.status}</Badge>
          </div>
          {sub && (
            <p className="mt-3 text-[12px]" style={{ color: 'var(--text-muted)' }}>
              Plan <strong style={{ color: 'var(--text-primary)' }}>{sub.plan_code}</strong>
              {' · '}
              {sub.status}
              {sub.ends_at && <> · ends {fmtDate(sub.ends_at)}</>}
            </p>
          )}
        </Panel>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <HealthStat label="Activity (24h)" value={String(data.activity.total_events_24h)} sub={`${data.activity.error_events_24h} errors`} status={data.activity.status} icon={<ActivityDot />} />
          <HealthStat label="Successful logins" value={String(data.logins.success_24h)} sub={`${data.logins.failed_24h} failed`} status={data.logins.status} icon={<Users size={15} />} />
          <HealthStat label="Storage objects" value={String(data.storage.object_count)} sub="in this tenant" status="HEALTHY" icon={<Database size={15} />} />
          <HealthStat label="Subscription" value={sub ? sub.status : 'none'} sub={sub?.plan_code ?? 'no active sub'} status={sub ? (sub.status === 'active' ? 'HEALTHY' : 'WARNING') : 'UNKNOWN'} icon={<IndianRupee size={15} />} />
        </div>
      </Reveal>

      <Reveal delay={0.14}>
        <Panel padded={false} className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2">
            <p className="text-[13px] font-[720]" style={{ color: 'var(--text-primary)' }}>Honest state</p>
            <span className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
              Per-studio view, derived from existing data. The platform-level Tenancy Health card is the source of truth for the platform.
            </span>
          </div>
          <ul className="px-4 pb-4 text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
            <li className="mt-1.5 flex items-start gap-2">
              <span className="mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: data.activity.status === 'HEALTHY' ? 'var(--success)' : data.activity.status === 'WARNING' ? 'var(--warning)' : data.activity.status === 'CRITICAL' ? 'var(--danger)' : 'var(--text-disabled)' }} />
              <span><strong>Activity:</strong> {data.activity.total_events_24h} events in 24h, {data.activity.error_events_24h} with <code>failed</code> or <code>error</code> in the action name. HEALTHY when errors &le; 10% of total, WARNING above, UNKNOWN when zero events.</span>
            </li>
            <li className="mt-1.5 flex items-start gap-2">
              <span className="mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: data.logins.status === 'HEALTHY' ? 'var(--success)' : data.logins.status === 'WARNING' ? 'var(--warning)' : 'var(--danger)' }} />
              <span><strong>Logins:</strong> {data.logins.success_24h} successful, {data.logins.failed_24h} failed. WARNING above 50 failures, CAUTION above 0.</span>
            </li>
          </ul>
        </Panel>
      </Reveal>
    </div>
  );
}

function HealthStat({ label, value, sub, status, icon }: { label: string; value: string; sub: string; status: TenancySectionStatus; icon: React.ReactNode }) {
  return (
    <div className="rounded-[14px] p-3.5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10.5px] font-[750] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</span>
        <Badge tone={STATUS_TONE[status]} dot>{status}</Badge>
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-[15px] font-[800] tabular-nums" style={{ color: 'var(--text-primary)' }}>{icon}{value}</p>
      <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{sub}</p>
    </div>
  );
}

function ActivityDot() {
  return <span aria-hidden style={{ display: 'inline-block', width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--brand)', background: 'transparent' }} />;
}

function MembershipsSection({ id }: { id: string }) {
  const [data, setData] = useState<StudioMemberships | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const LIMIT = 25;

  const load = useCallback(() => {
    setLoading(true); setError('');
    api.superAdmin.studioMemberships(id, LIMIT, page * LIMIT)
      .then((r) => {
        // The backend returns { data: rows, total, limit, offset } for this
        // endpoint, while most platform APIs wrap their payload inside data.
        // Normalize that one legacy shape here so the rest of Studio 360 can
        // keep using the strongly typed StudioMemberships model.
        const response = r as unknown as {
          data: StudioMembership[];
          total: number;
          limit: number;
          offset: number;
        };
        setData(response);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load memberships'))
      .finally(() => setLoading(false));
  }, [id, page]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Center><Loader2 size={22} className="animate-spin" style={{ color: 'var(--brand)' }} /></Center>;
  if (error) return <ErrorState error={error} onRetry={load} />;
  if (!data) return null;

  const total = data.total;
  const lastPage = Math.max(0, Math.ceil(total / LIMIT) - 1);

  return (
    <Reveal delay={0.08}>
      <Panel padded={false} className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2">
          <p className="text-[13px] font-[720]" style={{ color: 'var(--text-primary)' }}>{total} membership{total === 1 ? '' : 's'}</p>
          <span className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>Client name, plan, dates. No phone, no email — those are the tenant admin's view.</span>
        </div>
        {data.data.length === 0 ? (
          <p className="px-4 pb-4 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>No memberships yet.</p>
        ) : (
          <ul>
            {data.data.map((m: StudioMembership, i: number) => (
              <li key={m.id} className="flex items-center gap-3 px-4 py-2.5 text-[12.5px]" style={{ borderTop: i ? '1px solid var(--border)' : 'none' }}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-[680]" style={{ color: 'var(--text-primary)' }}>{m.name}</p>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{m.plan_name ?? 'No plan'} · {m.start_date ? fmtDate(m.start_date) : '—'} → {m.end_date ? fmtDate(m.end_date) : '—'}</p>
                </div>
                <Badge tone={m.status === 'active' ? 'success' : m.status === 'expired' ? 'danger' : 'warning'}>{m.status}</Badge>
                <span className="w-[88px] text-right tabular-nums" style={{ color: 'var(--text-secondary)' }}>{fmtINR(m.paid_amount)}</span>
              </li>
            ))}
          </ul>
        )}
        {total > LIMIT && (
          <div className="flex items-center justify-between gap-3 border-t px-4 py-2.5 text-[12px]" style={{ borderColor: 'var(--border)' }}>
            <span style={{ color: 'var(--text-muted)' }}>Page {page + 1} of {lastPage + 1}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="rounded-[9px] px-2.5 py-1 disabled:opacity-50" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>Prev</button>
              <button onClick={() => setPage((p) => Math.min(lastPage, p + 1))} disabled={page === lastPage} className="rounded-[9px] px-2.5 py-1 disabled:opacity-50" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>Next</button>
            </div>
          </div>
        )}
      </Panel>
    </Reveal>
  );
}

function RevenueSection({ id }: { id: string }) {
  const [data, setData] = useState<StudioPtRevenue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true); setError('');
    api.superAdmin.studioPtRevenue(id)
      .then((r) => setData(r.data))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load revenue'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Center><Loader2 size={22} className="animate-spin" style={{ color: 'var(--brand)' }} /></Center>;
  if (error) return <ErrorState error={error} onRetry={load} />;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <Reveal delay={0.08}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile label="Total collected" value={fmtINR(data.total_collected)} sub="all-time" tone="positive" icon={<IndianRupee size={15} />} />
          <StatTile label="Outstanding" value={fmtINR(data.total_outstanding)} sub="balance across clients" tone={data.total_outstanding > 0 ? 'critical' : 'positive'} icon={<Receipt size={15} />} />
          <StatTile label="Active" value={String(data.active_memberships)} sub="current memberships" tone="brand" icon={<Users size={15} />} />
          <StatTile label="Expired" value={String(data.expired_memberships)} sub="lifetime total" tone="neutral" icon={<TrendingUp size={15} />} />
        </div>
      </Reveal>

      <Reveal delay={0.12}>
        <Panel padded={false} className="overflow-hidden">
          <div className="px-4 pt-3.5 pb-2">
            <p className="text-[13px] font-[720]" style={{ color: 'var(--text-primary)' }}>Collected by window</p>
            <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>Sum of <code>paid_amount</code> on this studio's clients, filtered by <code>created_at</code>. Distinct from the subscription MRR — this is the PT business only.</p>
          </div>
          <ul className="space-y-1.5 px-4 pb-4 text-[13px]">
            {[
              { label: '30 days', value: data.collected_30d },
              { label: '90 days', value: data.collected_90d },
              { label: '365 days', value: data.collected_365d },
            ].map((r, i) => (
              <li key={r.label} className="flex items-center justify-between gap-3" style={{ borderTop: i ? '1px solid var(--border)' : 'none' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{r.label}</span>
                <span className="tabular-nums font-[700]" style={{ color: 'var(--text-primary)' }}>{fmtINR(r.value)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </Reveal>
    </div>
  );
}
