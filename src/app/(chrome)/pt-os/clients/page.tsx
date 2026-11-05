'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useSeededSearch } from '@/lib/use-seeded-search';
import { m } from 'framer-motion';
import { Search, Users, UserPlus, Phone } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Guard from '@/components/Guard';
import ClientKpiStrip from '@/components/pt-os/ClientKpiStrip';
import ClientAvatar from '@/components/pt-os/ClientAvatar';
import {
  Button, EmptyState, PageActions, PageContainer, PageHero, PullToRefresh, Skeleton,
} from '@/components/ui';
import { useAsync } from '@/lib/use-async';
import { api, PtClientBase } from '@/lib/api';
import { termEnded } from '@/lib/term-dates';
import { serverFilter } from '@/lib/client-filter';
import { identity, palette, tint } from '@/lib/palette';

type PtClient = PtClientBase & {
  gender: string;
  trainer_id: string;
  base_amount: number;
  discount: number;
  joining_date: string;
  duration_months: number;
  pt_start_date: string;
  monthly_pt_amount: number;
  trainer_commission: number;
  total_earned_commission: number;
  current_term_balance?: number;
};

function fmtShortINR(n: number): string {
  if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L';
  if (n >= 1000) return '₹' + (n / 1000).toFixed(1) + 'K';
  return '₹' + n;
}

/**
 * Same tone for the same client on every load and through every filter.
 * `identity` is the non-semantic ramp — a client whose avatar came out red
 * would look overdue — and it is indexed by a hash of the id, not the row.
 */
function avatarTone(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return identity[h % identity.length];
}

/**
 * What the row owes on the CURRENT term — the same definition as the profile
 * (GET /clients/:id) and the backend list query. Stored balance_amount mixes
 * a current-term fee with lifetime payments and understates renewed clients.
 * Falls back to the stored figure when the server predates the field.
 */
function termBalance(c: PtClient): number {
  return Number(c.current_term_balance ?? c.balance_amount ?? 0);
}

function getStatusInfo(status: string, days_left: number | null, has_pt_term = false) {
  // 'pending' means two different things: a bare add (no term yet) is "Not
  // Enrolled", while a provisional enrolment (term written, screening still
  // outstanding) is "Activation Pending".
  if (status === 'pending' && has_pt_term) return { label: 'Activation Pending', color: palette.amber[700], bg: 'var(--warning-soft)', dot: palette.amber[500] };
  if (status === 'pending') return { label: 'Not Enrolled', color: palette.gray[500], bg: 'var(--bg-subtle)', dot: palette.gray[400] };
  if (status === 'frozen') return { label: 'Frozen', color: palette.indigo[600], bg: 'var(--info-soft)', dot: palette.indigo[500] };
  // days_left 0 is the term's last day, which is still a valid day (lib/term-dates.ts).
  if (days_left == null || termEnded(days_left)) return { label: 'Expired', color: palette.gray[500], bg: 'var(--bg-subtle)', dot: palette.gray[400] };
  if (days_left <= 7) return { label: 'Expiring', color: palette.red[600], bg: 'var(--danger-soft)', dot: palette.red[500] };
  if (days_left <= 30) return { label: 'Soon', color: palette.amber[700], bg: 'var(--warning-soft)', dot: palette.amber[500] };
  return { label: 'Active', color: palette.emerald[700], bg: 'var(--success-soft)', dot: palette.emerald[500] };
}

function AnimatedCounter({ value, prefix = '' }: { value: number; prefix?: string }) {
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const start = prev.current; const end = value; prev.current = end;
    if (start === end) return;
    const t0 = performance.now(); let raf: number;
    const step = (now: number) => {
      const p = Math.min((now - t0) / 700, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(start + (end - start) * e));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{prefix}{display.toLocaleString('en-IN')}</>;
}

function DaysArc({ days_left }: { days_left: number | null }) {
  if (days_left === null) return <span className="text-xs text-[var(--text-muted)]">—</span>;
  const max = 90;
  const pct = Math.min(Math.max(days_left / max, 0), 1);
  const info = getStatusInfo('active', days_left);
  const r = 14, sw = 3, circ = 2 * Math.PI * r, sz = 36;
  return (
    <div className="flex flex-col items-center">
      <svg width={sz} height={sz} viewBox={`0 0 ${sz} ${sz}`}>
        <circle cx={sz / 2} cy={sz / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={sw} />
        <m.circle cx={sz / 2} cy={sz / 2} r={r} fill="none" stroke={info.color}
          strokeWidth={sw} strokeLinecap="round" strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ * (1 - pct) }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          transform={`rotate(-90 ${sz / 2} ${sz / 2})`} />
        <text x={sz / 2} y={sz / 2} textAnchor="middle" dominantBaseline="central"
          fill={info.color} fontSize="8" fontWeight="900">{days_left}</text>
      </svg>
      <span className="text-[9px] font-bold mt-0.5" style={{ color: info.color }}>days</span>
    </div>
  );
}

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'frozen', label: 'Frozen' },
  { value: 'expired', label: 'Expired' },
];

function ClientTableRow({ client }: { client: PtClient }) {
  const router = useRouter();
  const tone = avatarTone(client.id);
  const statusInfo = getStatusInfo(client.status, client.days_left, client.has_pt_term);
  return (
    <m.tr
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      onClick={() => router.push(`/pt-os/clients/${client.id}`)}
      className="group cursor-pointer transition-colors duration-200 hover:bg-[var(--bg-subtle)]"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      <td className="py-3 pl-4 pr-3 sm:pl-5">
        <div className="flex items-center gap-3">
          <ClientAvatar
            name={client.name}
            photoUrl={client.photo_url}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[13px] font-[800] transition-transform duration-200 group-hover:scale-105"
            style={{
              background: tint(tone, 0.18),
              color: 'var(--text-primary)',
              boxShadow: `inset 0 0 0 1px ${tint(tone, 0.28)}`,
            }}
          />
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-[760] text-[var(--text-primary)]">{client.name}</p>
            {/* The ID lived here and nobody dials an ID. The number is what you
                reach for from a roster, and it is one tap away on the phone
                this list is mostly read on. */}
            <div className="mt-0.5 flex items-center gap-1.5">
              <Phone size={10} className="shrink-0 text-[var(--text-muted)]" />
              <span className="text-[11.5px] font-[600] tabular-nums text-[var(--text-muted)]">
                {client.mobile || '—'}
              </span>
            </div>
          </div>
        </div>
      </td>
      <td className="hidden px-3 py-3 sm:table-cell">
        <span className="text-[12px] font-[600] text-[var(--text-secondary)]">{client.trainer_name || '—'}</span>
      </td>
      <td className="hidden px-3 py-3 md:table-cell">
        <span className="inline-block rounded-full px-2.5 py-1 text-[10px] font-[700] uppercase tracking-wide"
          style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
          {client.package_type || '—'}
        </span>
      </td>
      <td className="px-3 py-3">
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-[700] uppercase tracking-wide"
          style={{ background: statusInfo.bg, color: statusInfo.color }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: statusInfo.dot }} />
          {statusInfo.label}
        </span>
      </td>
      {/* Balance, not the package total. What's owed is the thing you scan a
          roster for; the contracted amount never changes and is on the
          client's own page. */}
      <td className="px-3 py-3 text-right">
        <span className="text-[13px] font-[760] tabular-nums"
          style={{ color: termBalance(client) > 0 ? palette.red[600] : palette.emerald[700] }}>
          {fmtShortINR(termBalance(client))}
        </span>
      </td>
      <td className="hidden px-3 py-3 text-right xl:table-cell">
        <span className="text-[12px] font-[700] tabular-nums text-[var(--text-secondary)]">
          {fmtShortINR(client.total_earned_commission)}
        </span>
      </td>
      <td className="py-3 pl-3 pr-4 sm:pr-5">
        <DaysArc days_left={client.days_left} />
      </td>
    </m.tr>
  );
}

const PAGE_SIZE = 50;

export default function PtClientsPage() {
  const router = useRouter();
  // Seeded from ?q= so a handoff from the global search arrives filtered.
  const [search, setSearch] = useSeededSearch();
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  // ?status=active is how the dashboard's Active Clients tile opens this
  // roster. Validated against the pills, so a hand-edited URL cannot put the
  // page in a state no control can get out of.
  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get('status');
    if (s && STATUS_FILTERS.some((f) => f.value === s)) setStatusFilter(s);
  }, []);

  // One request per pause in typing, not one per keystroke. The list is
  // filtered by the database now, so each search is a round trip.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(0); }, [statusFilter]);

  const clients = useAsync<{
    data: PtClient[];
    total: number;
    summary?: { total: number; revenue: number; paid: number; balance: number; active_count: number };
  }>(
    () => api.pt.clients({
      // buildQs stringifies undefined, so an absent filter must be absent here.
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...serverFilter(statusFilter),
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    }).then(r => r as {
      data: PtClient[];
      total: number;
      summary?: { total: number; revenue: number; paid: number; balance: number; active_count: number };
    }),
    [debouncedSearch, statusFilter, page],
  );

  const rows = useMemo(() => clients.data?.data ?? [], [clients.data]);
  const total = clients.data?.total ?? rows.length;

  // The API reports the whole-studio KPIs; a backend that predates `summary`
  // still supplies the page, so fall back to reducing what was returned.
  const summary = useMemo(() => clients.data?.summary ?? rows.reduce(
    (acc, c) => ({
      total: acc.total + 1,
      revenue: acc.revenue + Number(c.final_amount || 0),
      paid: acc.paid + Number(c.paid_amount || 0),
      balance: acc.balance + termBalance(c),
      active_count: acc.active_count,
    }),
    { total: 0, revenue: 0, paid: 0, balance: 0, active_count: 0 },
  ), [clients.data, rows]);

  const activeCount = clients.data?.summary
    ? summary.active_count
    : rows.filter(c => c.status === 'active' && (c.days_left ?? 0) >= 0).length;

  // A filter or deletion can leave the page past the end; step back once.
  useEffect(() => {
    if (page > 0 && total > 0 && page * PAGE_SIZE >= total) {
      setPage(Math.max(0, Math.ceil(total / PAGE_SIZE) - 1));
    }
  }, [page, total]);

  const firstRow = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const lastRow = Math.min(total, page * PAGE_SIZE + rows.length);
  const hasPrev = page > 0;
  const hasNext = page * PAGE_SIZE + rows.length < total;

  return (
    <Guard>
      <PullToRefresh onRefresh={clients.refetch}>
        {/* max-w-7xl, exactly as the dashboard: this used to be
            max-w-[1600px] with mt-1, so on a wide screen the page ran 320px
            wider than the dashboard and sat a pixel higher. */}
        <PageContainer>
          <PageHero
            accent="brand"
            icon={<Users size={20} />}
            title={statusFilter === 'active' ? 'Active Clients' : 'PT Clients'}
          />
          <PageActions>
            <Button onClick={() => router.push('/pt-os/new-client')} iconLeft={<UserPlus size={16} />}>
              New Client
            </Button>
          </PageActions>

          {/* The strip's own file explains why it is one object rather
              than four cards, and why it is 2x2 on mobile. */}
          <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}>
            <ClientKpiStrip
              summary={summary ? {
                total: summary.total ?? 0, revenue: summary.revenue ?? 0,
                paid: summary.paid ?? 0, balance: summary.balance ?? 0,
              } : null}
              activeCount={activeCount}
              renderValue={(value, prefix) => <AnimatedCounter value={value} prefix={prefix} />}
            />
          </m.div>

          {/* ── CLIENT LIST ── */}
          <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-3.5">

            {/* ── TOOLBAR ── */}
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative w-full sm:min-w-[220px] sm:max-w-md sm:flex-1">
                  <Search size={16} aria-hidden className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input aria-label="Search clients or trainers"
                    type="search"
                    value={search} onChange={e => setSearch(e.target.value)}
                    className="h-11 w-full rounded-[13px] pl-10 pr-4 text-[13.5px] font-[500] text-[var(--text-primary)] outline-none transition-all placeholder:text-[var(--text-muted)] focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                  />
                </div>

                <span className="ml-auto shrink-0 text-[11.5px] font-[600] text-[var(--text-muted)]">
                  <span className="font-[800] text-[var(--text-primary)]">{total}</span>
                  {total === 1 ? ' client' : ' clients'}
                </span>
              </div>

              {/* Filter row — horizontal scroll on mobile */}
              <div className="flex w-full items-center gap-1 overflow-x-auto rounded-full p-1"
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                {STATUS_FILTERS.map(f => (
                  <button key={f.value} type="button" onClick={() => setStatusFilter(f.value)}
                    aria-pressed={statusFilter === f.value}
                    className="shrink-0 rounded-full px-3.5 py-2 text-[11.5px] font-[700] transition-all duration-200"
                    style={statusFilter === f.value
                      ? { background: 'var(--gradient-brand)', color: '#fff', boxShadow: 'var(--shadow-sm)' }
                      : { color: 'var(--text-muted)' }}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── THE LIST ── */}
            <div className="overflow-hidden rounded-[22px]"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {[
                        { label: 'Client', cls: 'pl-4 sm:pl-5' },
                        { label: 'Trainer', cls: 'hidden sm:table-cell' },
                        { label: 'Package', cls: 'hidden md:table-cell' },
                        { label: 'Status', cls: '' },
                        { label: 'Balance', cls: 'text-right' },
                        { label: 'Commission', cls: 'hidden text-right xl:table-cell' },
                        { label: 'Days', cls: 'text-right pr-4 sm:pr-5' },
                      ].map(col => (
                        <th key={col.label} className={`px-3 py-3 text-[9px] font-[750] uppercase tracking-[0.12em] text-[var(--text-muted)] ${col.cls}`}>
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(c => <ClientTableRow key={c.id} client={c} />)}
                  </tbody>
                </table>
              </div>
              {rows.length === 0 && !clients.loading && (
                <EmptyState
                  icon={<Users size={22} />}
                  title={search || statusFilter !== 'all' ? 'No clients found' : 'Add your first client'}
                  description={search || statusFilter !== 'all'
                    ? 'Try adjusting your search or filters.'
                    : 'The roster fills up as soon as your first client enrols.'}
                  action={!search && statusFilter === 'all'
                    ? <Button iconLeft={<UserPlus size={14} />} onClick={() => router.push('/pt-os/new-client')}>New Client</Button>
                    : undefined}
                  className="py-14"
                />
              )}
              {total > PAGE_SIZE && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3.5"
                  style={{ borderColor: 'var(--border)' }}>
                  <span className="text-[11.5px] font-[600] text-[var(--text-muted)]">
                    Showing {firstRow}–{lastRow} of {total}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={!hasPrev}>
                      Previous
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setPage(p => p + 1)} disabled={!hasNext}>
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* ── ERROR — a failed load must never read as an empty roster ── */}
            {clients.error && !clients.data && (
              <div role="alert" className="flex items-center gap-2.5 rounded-[16px] p-4"
                style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger-border)' }}>
                <span className="flex-1 text-[13px] font-[600] text-[var(--danger-text)]">
                  Couldn&apos;t load clients. Check your connection and try again.
                </span>
                <Button size="sm" variant="danger" onClick={() => void clients.refetch()}>
                  Retry
                </Button>
              </div>
            )}

            {/* ── LOADING — skeleton rows, so the page does not jump when the
                   list arrives. ── */}
            {clients.loading && !clients.data && (
              <div className="space-y-2" aria-busy="true" aria-label="Loading clients">
                {[0, 1, 2, 3, 4].map(i => <Skeleton key={i} height={68} className="rounded-[18px]" />)}
              </div>
            )}
          </m.div>
        </PageContainer>
      </PullToRefresh>
    </Guard>
  );
}
