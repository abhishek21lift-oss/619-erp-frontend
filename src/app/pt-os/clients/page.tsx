'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useSeededSearch } from '@/lib/use-seeded-search';
import { m } from 'framer-motion';
import { Search, Users, UserPlus, User, Phone } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Guard from '@/components/Guard';
import ClientKpiStrip from '@/components/pt-os/ClientKpiStrip';
import AppShell from '@/components/AppShell';
import { PageContainer, PageHero, PullToRefresh } from '@/components/ui';
import { useAsync } from '@/lib/use-async';
import { api, PtClientBase } from '@/lib/api';

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
};

function fmtShortINR(n: number): string {
  if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L';
  if (n >= 1000) return '₹' + (n / 1000).toFixed(1) + 'K';
  return '₹' + n;
}

const CLIENT_PALETTES = [
  { from: '#0067e0', to: '#0067e0', glow: 'rgba(0,103,224,0.35)' },
  { from: '#0059ce', to: '#0059ce', glow: 'rgba(0,89,206,0.35)' },
  { from: '#059669', to: '#047857', glow: 'rgba(5,150,105,0.35)' },
  { from: '#d97706', to: '#b45309', glow: 'rgba(217,119,6,0.35)' },
  { from: '#0067e0', to: '#0067e0', glow: 'rgba(0,103,224,0.35)' },
  { from: '#0067e0', to: '#0067e0', glow: 'rgba(0,103,224,0.35)' },
  { from: '#f59e0b', to: '#b91c1c', glow: 'rgba(245,158,11,0.35)' },
  { from: '#0059ce', to: '#0059ce', glow: 'rgba(0,89,206,0.35)' },
];

function getStatusInfo(status: string, days_left: number | null) {
  // Not yet enrolled in a package — added to the roster but no active PT program.
  if (status === 'pending') return { label: 'Not Enrolled', color: '#7fb4ff', bg: 'rgba(127,180,255,0.14)', dot: '#0067e0' };
  if (status === 'frozen') return { label: 'Frozen', color: '#0067e0', bg: 'rgba(0,103,224,0.12)', dot: '#0067e0' };
  if (!days_left || days_left <= 0) return { label: 'Expired', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', dot: '#64748b' };
  if (days_left <= 7) return { label: 'Expiring', color: '#f87171', bg: 'rgba(248,113,113,0.12)', dot: '#ef4444' };
  if (days_left <= 30) return { label: 'Soon', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', dot: '#f59e0b' };
  return { label: 'Active', color: '#34d399', bg: 'rgba(52,211,153,0.12)', dot: '#10b981' };
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
  if (days_left === null) return <span className="text-xs text-slate-400">—</span>;
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
  { value: 'all',     label: 'All',     from: '#0067e0', to: '#0067e0' },
  { value: 'active',  label: 'Active',  from: '#10b981', to: '#059669' },
  { value: 'pending', label: 'Not Enrolled', from: '#0067e0', to: '#0067e0' },
  { value: 'frozen',  label: 'Frozen',  from: '#0067e0', to: '#0067e0' },
  { value: 'expired', label: 'Expired', from: '#64748b', to: '#475569' },
];

function ClientTableRow({ client, index }: { client: PtClient; index: number }) {
  const router = useRouter();
  const palette = CLIENT_PALETTES[index % CLIENT_PALETTES.length];
  const initials = client.name.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase();
  const statusInfo = getStatusInfo(client.status, client.days_left);
  // Same fallback the profile hero uses: photo_url carries both data URLs from
  // the in-app crop and stored paths, and a path this deployment cannot serve
  // must land on the initials rather than a broken-image icon in every row.
  const [photoBroken, setPhotoBroken] = useState(false);
  return (
    <m.tr
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.025, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      onClick={() => router.push(`/pt-os/clients/${client.id}`)}
      className="group cursor-pointer transition-all duration-200 hover:bg-gray-50"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      <td className="py-3.5 px-5">
        <div className="flex items-center gap-3">
          <div className="relative flex h-[52px] w-[52px] shrink-0 items-center justify-center overflow-hidden rounded-[15px] text-white text-[13px] font-[800] transition-transform duration-200 group-hover:scale-105"
            style={{ background: `linear-gradient(135deg, ${palette.from}, ${palette.to})`, boxShadow: `0 3px 10px ${palette.glow}` }}>
            {client.photo_url && !photoBroken ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={client.photo_url} alt={client.name}
                onError={() => setPhotoBroken(true)}
                className="h-full w-full object-cover" />
            ) : initials}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-[740] text-gray-900">{client.name}</p>
            {/* The ID lived here and nobody dials an ID. The number is what you
                reach for from a roster, and it is one tap away on the phone
                this list is mostly read on. */}
            <div className="mt-0.5 flex items-center gap-1.5">
              <Phone size={10} className="shrink-0 text-slate-400" />
              <span className="text-[11.5px] font-[600] tabular-nums text-slate-500">
                {client.mobile || '—'}
              </span>
            </div>
          </div>
        </div>
      </td>
      <td className="py-3.5 px-4 hidden sm:table-cell">
        <div className="flex items-center gap-1.5">
          <User size={11} style={{ color: palette.from }} />
          <span className="text-[12px] font-[600] text-gray-600">{client.trainer_name || '—'}</span>
        </div>
      </td>
      <td className="py-3.5 px-4 hidden md:table-cell">
        <span className="inline-block text-[10px] font-[700] px-2.5 py-1 rounded-[7px] uppercase tracking-wide"
          style={{ background: `${palette.from}18`, color: palette.from, border: `1px solid ${palette.from}25` }}>
          {client.package_type || '—'}
        </span>
      </td>
      <td className="py-3.5 px-4">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-[700] uppercase tracking-wide px-2.5 py-1 rounded-[8px]"
          style={{ background: statusInfo.bg, color: statusInfo.color }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: statusInfo.dot }} />
          {statusInfo.label}
        </span>
      </td>
      {/* Balance, not the package total. What's owed is the thing you scan a
          roster for; the contracted amount never changes and is on the
          client's own page. */}
      <td className="py-3.5 px-4 text-right">
        <span className="text-[13px] font-[760] tabular-nums"
          style={{ color: client.balance_amount > 0 ? '#dc2626' : '#059669' }}>
          {fmtShortINR(client.balance_amount)}
        </span>
      </td>
      <td className="py-3.5 px-4 text-right hidden xl:table-cell">
        <span className="text-[12px] font-[700] text-violet-600 tabular-nums">
          {fmtShortINR(client.total_earned_commission)}
        </span>
      </td>
      <td className="py-3.5 px-4 text-right">
        <DaysArc days_left={client.days_left} />
      </td>
    </m.tr>
  );
}

export default function PtClientsPage() {
  const router = useRouter();
  // Seeded from ?q= so a handoff from the global search arrives filtered.
  const [search, setSearch] = useSeededSearch();
  const [statusFilter, setStatusFilter] = useState('all');
  const clients = useAsync<{ data: PtClient[]; total: number }>(
    () => api.pt.clients().then(r => r as { data: PtClient[]; total: number }),
    [],
  );

  const filtered = useMemo(() => (clients.data?.data ?? []).filter(c => {
    if (search) {
      const q = search.toLowerCase();
      // Mobile and email are matched too: the global search finds people by
      // phone number, and handing that query over to a filter that ignores
      // phone numbers would show "no results" for a client that plainly exists.
      if (!(c.name?.toLowerCase().includes(q) || c.trainer_name?.toLowerCase().includes(q)
        || (c.unique_id || '').toLowerCase().includes(q) || (c.client_id || '').toLowerCase().includes(q)
        || (c.mobile || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q)))
        return false;
    }
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    return true;
  }), [clients.data, search, statusFilter]);

  const summary = useMemo(() => clients.data?.data?.reduce(
    (acc, c) => ({
      total: acc.total + 1,
      revenue: acc.revenue + Number(c.final_amount || 0),
      paid: acc.paid + Number(c.paid_amount || 0),
      balance: acc.balance + Number(c.balance_amount || 0),
    }),
    { total: 0, revenue: 0, paid: 0, balance: 0 },
  ), [clients.data]);

  const activeCount = useMemo(() => (clients.data?.data ?? []).filter(c => c.status === 'active' && (c.days_left ?? 0) > 0).length, [clients.data]);

  return (
    <Guard>
      <AppShell>
        <PullToRefresh onRefresh={clients.refetch}>
          {/* max-w-7xl, exactly as the dashboard: this used to be
              max-w-[1600px] with mt-1, so on a wide screen the page ran 320px
              wider than the dashboard and sat a pixel higher. */}
          <PageContainer>

            <PageHero
              icon={<Users size={20} />}
              title="PT Clients"
              subtitle="Personal training client management"
              actions={(
                <button
                  type="button"
                  onClick={() => router.push('/pt-os/new-client')}
                  className="inline-flex h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-[14px] px-5 text-[13px] font-[700] transition-transform active:scale-95 sm:w-auto"
                  style={{ background: '#fff', color: '#0F172A' }}>
                  <UserPlus size={16} />
                  New Client
                </button>
              )}
            />

            {/* The strip's own file explains why it is one object rather
                than four cards, and why it is 2x2 on mobile. */}
            <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="mb-5">
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
              className="space-y-4">

              {/* ── TOOLBAR ── */}
              <div className="flex flex-wrap items-center gap-3">

                {/* Search */}
                <div className="relative w-full sm:min-w-[200px] sm:flex-1 sm:max-w-sm">
                  <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text" placeholder="Search clients or trainers…"
                    value={search} onChange={e => setSearch(e.target.value)}
                    className="w-full rounded-[12px] py-2.5 pl-9 pr-4 text-[12.5px] font-[500] text-gray-900 outline-none transition-all duration-200 placeholder:text-slate-400"
                    style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border)' }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,103,224,0.5)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,103,224,0.08)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.boxShadow = ''; }}
                  />
                </div>

                {/* Filter row — horizontal scroll on mobile */}
                <div className="flex w-full items-center gap-2 overflow-x-auto pb-0.5 sm:w-auto sm:overflow-visible">
                  {/* Status filter pills */}
                  <div className="flex shrink-0 gap-1 rounded-[12px] p-1"
                    style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                    {STATUS_FILTERS.map(f => (
                      <button key={f.value} onClick={() => setStatusFilter(f.value)}
                        className="rounded-[8px] px-3.5 py-2 text-[11px] font-[700] transition-all duration-200"
                        style={statusFilter === f.value
                          ? { background: `linear-gradient(135deg, ${f.from}, ${f.to})`, color: '#fff', boxShadow: `0 2px 10px ${f.from}40` }
                          : { color: 'rgb(100,116,139)' }}>
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {/* No view toggle and no Refresh button. One list, one layout —
                      the toggle only ever chose between two renderings of the
                      same rows, and PullToRefresh above already refetches on
                      the gesture people actually use here. */}
                  <span className="ml-auto shrink-0 text-[11px] font-[600] text-slate-500">
                    <span className="text-gray-700">{filtered.length}</span>
                    <span className="mx-1 text-slate-300">/</span>
                    {clients.data?.data?.length ?? 0}
                  </span>
                </div>
              </div>

              {/* ── THE LIST ── */}
              <div className="overflow-hidden rounded-[20px]"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
                        {[
                          { label: 'Client', cls: '' },
                          { label: 'Trainer', cls: 'hidden sm:table-cell' },
                          { label: 'Package', cls: 'hidden md:table-cell' },
                          { label: 'Status', cls: '' },
                          { label: 'Balance', cls: '' },
                          { label: 'Commission', cls: 'hidden xl:table-cell' },
                          { label: 'Days', cls: '' },
                        ].map(col => (
                          <th key={col.label} className={`px-4 py-3.5 text-[9px] font-[700] uppercase tracking-[0.12em] text-slate-500 ${col.cls}`}>
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((c, i) => <ClientTableRow key={c.id} client={c} index={i} />)}
                    </tbody>
                  </table>
                </div>
                {filtered.length === 0 && !clients.loading && (
                  <div className="p-6">
                    <EmptyState search={search} statusFilter={statusFilter} onNew={() => router.push('/pt-os/new-client')} />
                  </div>
                )}
              </div>

              {/* ── LOADING ── */}
              {clients.loading && !clients.data && (
                <div className="flex flex-col items-center justify-center gap-4 py-24">
                  <div className="relative h-12 w-12">
                    <div className="absolute inset-0 rounded-full"
                      style={{ border: '2px solid rgba(0,103,224,0.12)', borderTopColor: '#0067e0', animation: 'spin 0.9s linear infinite' }} />
                  </div>
                  <p className="text-[13px] font-[500] text-slate-500">Loading clients…</p>
                </div>
              )}
            </m.div>
          </PageContainer>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </PullToRefresh>
      </AppShell>
    </Guard>
  );
}

function EmptyState({ search, statusFilter, onNew }: { search: string; statusFilter: string; onNew: () => void }) {
  const isFiltered = !!search || statusFilter !== 'all';
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <div className="flex h-20 w-20 items-center justify-center rounded-[24px]"
        style={{ background: 'rgba(0,103,224,0.07)', border: '1px solid rgba(0,103,224,0.15)' }}>
        <Users size={32} style={{ color: '#0067e0' }} />
      </div>
      <p className="text-[17px] font-[760] tracking-[-0.01em] text-gray-900">
        {isFiltered ? 'No PT clients found' : 'Add your first client'}
      </p>
      <p className="max-w-[320px] text-center text-[13px] text-slate-500">
        {isFiltered
          ? 'Try adjusting your search or filters'
          : 'Your client roster is private to your studio — enrol your first PT client to get started.'}
      </p>
      {!isFiltered && (
        <button onClick={onNew}
          className="mt-2 inline-flex items-center gap-2 rounded-[12px] px-5 py-2.5 text-[13px] font-[700] text-white transition-all hover:-translate-y-0.5"
          style={{ background: 'linear-gradient(135deg, #0067e0, #0059ce)', boxShadow: '0 6px 24px rgba(0,103,224,0.35)' }}>
          <UserPlus size={14} />New Client
        </button>
      )}
    </div>
  );
}
