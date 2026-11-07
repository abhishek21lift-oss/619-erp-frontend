'use client';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import Guard from '@/components/Guard';
import ClientAvatar from '@/components/pt-os/ClientAvatar';
import {
  Card, CardBody, CardHeader, CardTitle, EmptyState, KpiCard,
  PageContainer, PageHero, Skeleton,
} from '@/components/ui';
import { metricTone } from '@/components/visualizations';
import { api, type TransformationRow } from '@/lib/api';
import { fmtDate } from '@/lib/format';
import { errorMessage } from '@/lib/forms/errors';
import {
  Activity, ArrowDownRight, ArrowUpRight, Minus, Search, Sparkles,
  Target, TrendingUp, Trophy, UserCheck, Users, Weight,
} from 'lucide-react';

/** A drop in weight is the good direction here, so the tone is inverted
 *  from a plain "up is good" trend — a gain reads as the concerning one.
 *
 *  A null `change` is NOT zero. It means this client has not been measured
 *  twice yet, which is a different fact from having held their weight, and
 *  rendering both as "0.0 kg" is what this column used to do. */
function WeightChange({ current, change }: { current: number | null; change: number | null }) {
  if (current === null) return <span style={{ color: 'var(--text-disabled)' }}>—</span>;
  if (change === null) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{current.toFixed(1)} kg</span>
        <span style={{ fontSize: 11, color: 'var(--text-disabled)' }}>first measurement</span>
      </span>
    );
  }
  const isUp = change > 0;
  const isDown = change < 0;
  const tone = isUp ? metricTone.negative : isDown ? metricTone.positive : metricTone.neutral;
  const Icon = isUp ? ArrowUpRight : isDown ? ArrowDownRight : Minus;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: tone.color, fontWeight: 700, fontSize: 13 }}>
      {current.toFixed(1)} kg
      <Icon size={15} />
      <span style={{ fontSize: 11, fontWeight: 600 }}>
        {change > 0 ? '+' : ''}{change.toFixed(1)}
      </span>
    </span>
  );
}

function Metric({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-[700] uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>
        {label}
      </p>
      <div className="mt-0.5 whitespace-nowrap text-[13px]" style={{ color: 'var(--text-primary)' }}>
        {children}
      </div>
    </div>
  );
}

export default function TransformationsPage() {
  return <Guard role="trainer"><Inner /></Guard>;
}

function Inner() {
  const [rows, setRows] = useState<TransformationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let alive = true;
    api.pt.transformations()
      .then((r) => alive && setRows(r.data))
      .catch((e) => alive && setError(errorMessage(e, 'Could not load transformations')))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const s = search.toLowerCase();
    return rows.filter(
      (c) => c.name?.toLowerCase().includes(s) ||
        (c.client_id || '').toLowerCase().includes(s) ||
        (c.trainer_name || '').toLowerCase().includes(s),
    );
  }, [rows, search]);

  const coaches = useMemo(
    () => new Set(rows.map((c) => c.trainer_name).filter(Boolean)).size,
    [rows],
  );

  /** Clients with a real series — two measuring sessions or more. Every
   *  headline below is computed over THESE, not over the whole roster, so a
   *  studio that has just started measuring is not reported as 0% progress. */
  const tracked = useMemo(() => rows.filter((c) => c.weight_change !== null), [rows]);

  const avgWeight = useMemo(() => {
    const withWeight = rows.filter((c) => c.current_weight !== null);
    if (!withWeight.length) return 0;
    return withWeight.reduce((sum, c) => sum + (c.current_weight ?? 0), 0) / withWeight.length;
  }, [rows]);

  /** Net kilograms lost across everyone with a series. Negative change is a
   *  loss, so the sign is flipped to read as "kg lost". */
  const netLost = useMemo(
    () => tracked.reduce((sum, c) => sum + -(c.weight_change ?? 0), 0),
    [tracked],
  );

  /** Of the clients actually being measured, how many have gone down. */
  const losingPct = tracked.length
    ? Math.round((tracked.filter((c) => (c.weight_change ?? 0) < 0).length / tracked.length) * 100)
    : null;

  /** The largest genuine loss. Undefined when nobody has a series yet — which
   *  is why this is a find over a sorted list rather than a reduce with a
   *  seed: the old version seeded with clients[0] and, because every change
   *  was 0, printed an arbitrary member's name under a trophy. */
  const topPerformer = useMemo(() => {
    const losers = tracked
      .filter((c) => (c.weight_change ?? 0) < 0)
      .sort((a, b) => (a.weight_change ?? 0) - (b.weight_change ?? 0));
    return losers[0];
  }, [tracked]);

  return (
    <PageContainer>
      <PageHero
        className="mb-5"
        icon={<Sparkles size={20} />}
        title="Transformations"
      />

      {error && (
        <div
          role="alert"
          className="rounded-[14px] border px-3 py-2.5 text-[12px]"
          style={{ background: 'var(--danger-soft)', borderColor: 'var(--danger-soft)', color: 'var(--danger-text)' }}
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Active Members" value={rows.length} icon={<Users size={16} />} accent="blue" loading={loading} />
        <KpiCard label="Active Coaches" value={coaches} icon={<UserCheck size={16} />} accent="emerald" loading={loading} />
        <KpiCard label="Avg Weight" value={avgWeight > 0 ? `${avgWeight.toFixed(0)} kg` : '—'} icon={<Weight size={16} />} accent="amber" loading={loading} />
        {/* "Being tracked" is the honest denominator for everything below:
            a client measured once has a weight, not a transformation. */}
        <KpiCard label="Being Tracked" value={tracked.length} icon={<TrendingUp size={16} />} accent="purple" loading={loading} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <KpiCard
          label="Net Weight Lost" icon={<Activity size={16} />} accent="emerald" loading={loading}
          value={tracked.length ? `${netLost >= 0 ? '' : '+'}${Math.abs(netLost).toFixed(1)} kg` : '—'}
        />
        <KpiCard
          label="Trending Down" icon={<Target size={16} />} accent="blue" loading={loading}
          value={losingPct === null ? '—' : `${losingPct}%`}
        />
        <KpiCard
          label="Biggest Loss" icon={<Trophy size={16} />} accent="amber" loading={loading}
          value={topPerformer
            ? `${topPerformer.name ?? '—'} (${Math.abs(topPerformer.weight_change ?? 0).toFixed(1)} kg)`
            : '—'}
        />
      </div>

      <Card>
        <CardHeader className="flex-wrap gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <CardTitle>Active Members</CardTitle>
            <span
              className="rounded-full px-2.5 py-0.5 text-[11px] font-[700]"
              style={{ background: 'var(--action-soft)', color: 'var(--action-text)' }}
            >
              {filtered.length}
            </span>
          </div>
          <div className="relative w-full sm:w-[260px]">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-disabled)' }}
            />
            <input
              type="search"
              aria-label="Search member or coach"
              placeholder="Search member or coach"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 w-full rounded-xl pl-9 pr-3 text-[13px] outline-none"
              style={{
                border: '1.5px solid var(--border)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
        </CardHeader>

        <CardBody className="p-0">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 border-b px-4 py-4 last:border-0 sm:px-6"
                style={{ borderColor: 'var(--border)' }}
              >
                <Skeleton variant="circle" width={40} height={40} />
                <div className="flex-1 space-y-2">
                  <Skeleton height={12} width="40%" />
                  <Skeleton height={10} width="25%" />
                </div>
              </div>
            ))
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Sparkles size={22} />}
              title="Ready to start tracking?"
              description="Add members to start tracking."
            />
          ) : (
            <ul>
              {filtered.map((c) => (
                <li
                  key={c.id}
                  className="border-b transition-colors last:border-0 hover:bg-[var(--bg-hover)]"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6">
                    <div className="flex min-w-0 items-center gap-3">
                      <ClientAvatar
                        name={c.name ?? ''}
                        photoUrl={c.photo_url}
                        style={{
                          width: 40,
                          height: 40,
                          flexShrink: 0,
                          borderRadius: 12,
                          background: 'linear-gradient(135deg, #A33757, #852E4E)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 12,
                          fontWeight: 800,
                          color: '#fff',
                        }}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-[600]" style={{ color: 'var(--text-primary)' }}>
                          {c.name ?? '—'}
                        </p>
                        <p className="truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>
                          {c.client_id || '—'}{c.trainer_name ? ` · ${c.trainer_name}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 sm:flex sm:items-center sm:gap-6">
                      <Metric label="Start">
                        {c.start_weight !== null
                          ? `${c.start_weight.toFixed(1)} kg`
                          : <span style={{ color: 'var(--text-disabled)' }}>—</span>}
                      </Metric>
                      <Metric label="Current">
                        <WeightChange current={c.current_weight} change={c.weight_change} />
                      </Metric>
                      <Metric label="Joined">{fmtDate(c.created_at ?? undefined)}</Metric>
                    </div>

                    <Link
                      href={`/pt-os/clients/${c.id}`}
                      aria-label={`Log progress for ${c.name ?? 'member'}`}
                      className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl px-4 text-[12px] font-[600] transition-colors sm:shrink-0"
                      style={{
                        background: 'var(--action-soft)',
                        color: 'var(--action-text)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      Log Progress <ArrowUpRight size={13} />
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </PageContainer>
  );
}
