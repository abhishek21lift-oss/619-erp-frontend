'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Users, TrendingUp, Wallet, Percent,
  RefreshCw, UserPlus, Sparkles, User, Clock,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { PremiumButton } from '@/components/premium/PremiumButton';
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

function fmtINR(n: number | string | null | undefined) {
  return '₹' + Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function fmtShortINR(n: number): string {
  if (n >= 100000) return (n / 100000).toFixed(1) + 'L';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

const STATUS_CONFIG = {
  active: { label: 'Active', color: '#10b981', bg: 'rgba(16,185,129,0.12)', glow: 'rgba(16,185,129,0.25)' },
  expiring: { label: 'Expiring', color: '#dc2626', bg: 'rgba(220,38,38,0.12)', glow: 'rgba(220,38,38,0.25)' },
  soon: { label: 'Soon', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', glow: 'rgba(245,158,11,0.25)' },
  expired: { label: 'Expired', color: '#6b7280', bg: 'rgba(107,114,128,0.12)', glow: 'rgba(107,114,128,0.15)' },
  frozen: { label: 'Frozen', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', glow: 'rgba(59,130,246,0.25)' },
} as const;

function StatusBadge({ status, days_left }: { status: string; days_left: number | null }) {
  let cfg: (typeof STATUS_CONFIG)[keyof typeof STATUS_CONFIG] = STATUS_CONFIG.expired;
  if (status === 'active') {
    if (days_left !== null && days_left <= 0) cfg = STATUS_CONFIG.expired;
    else if (days_left !== null && days_left <= 7) cfg = STATUS_CONFIG.expiring;
    else if (days_left !== null && days_left <= 30) cfg = STATUS_CONFIG.soon;
    else cfg = STATUS_CONFIG.active;
  } else if (status === 'frozen') cfg = STATUS_CONFIG.frozen;
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.06em] px-2.5 py-1 rounded-[8px]"
      style={{ background: cfg.bg, color: cfg.color, boxShadow: `0 0 12px ${cfg.glow}` }}>
      <motion.span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }}
        animate={{ opacity: [1, 0.4, 1], scale: [1, 0.8, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} />
      {cfg.label}
    </span>
  );
}

function DaysRing({ days_left }: { days_left: number | null }) {
  if (days_left === null) return <span className="text-[12px]" style={{ color: 'rgb(203,213,225)' }}>—</span>;
  const total = 90;
  const pct = Math.min(Math.max(days_left / total, 0), 1);
  const color = days_left <= 7 ? '#dc2626' : days_left <= 30 ? '#f59e0b' : '#10b981';
  const s = 32, r = 12, sw = 3, circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  return (
    <div className="flex items-center gap-1.5">
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <circle cx={s / 2} cy={s / 2} r={r} fill="none" stroke="rgba(15,23,42,0.06)" strokeWidth={sw} />
        <motion.circle cx={s / 2} cy={s / 2} r={r} fill="none" stroke={color} strokeWidth={sw}
          strokeLinecap="round" strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          transform={`rotate(-90 ${s / 2} ${s / 2})`}
        />
        <text x={s / 2} y={s / 2} textAnchor="middle" dominantBaseline="central"
          fill={color} fontSize="7" fontWeight="900" fontFamily="var(--font-sans, system-ui, sans-serif)">
          {days_left}
        </text>
      </svg>
      <span className="text-[9px] font-semibold" style={{ color }}>days</span>
    </div>
  );
}

function AnimatedNumber({ value, color }: { value: number; color: string }) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);
  useEffect(() => {
    const start = prevRef.current;
    const end = value;
    prevRef.current = end;
    if (start === end) return;
    const duration = 600;
    const t0 = performance.now();
    let raf: number;
    const fn = (now: number) => {
      const t = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(start + (end - start) * eased));
      if (t < 1) raf = requestAnimationFrame(fn);
    };
    raf = requestAnimationFrame(fn);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span style={{ color }}>{display.toLocaleString('en-IN')}</span>;
}

function AmbientOrbs() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex: 0 }}>
      <motion.div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full opacity-20"
        style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.4) 0%, transparent 70%)' }}
        animate={{ x: [0, -80, 0], y: [0, 50, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.div className="absolute -bottom-80 -left-40 h-[700px] w-[700px] rounded-full opacity-15"
        style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.3) 0%, transparent 70%)' }}
        animate={{ x: [0, 90, 0], y: [0, -60, 0] }}
        transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.div className="absolute top-1/4 right-1/3 h-[300px] w-[300px] rounded-full opacity-12"
        style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.25) 0%, transparent 70%)' }}
        animate={{ x: [0, -60, 0], y: [0, 70, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.div className="absolute bottom-1/3 left-1/4 h-[250px] w-[250px] rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.25) 0%, transparent 70%)' }}
        animate={{ x: [0, 40, 0], y: [0, -50, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }} />
    </div>
  );
}

const CLIENT_COLORS = ['#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#6366f1', '#f97316', '#84cc16'];

function ClientRow({ client, index }: { client: PtClient; index: number }) {
  const router = useRouter();
  const initials = client.name.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase();
  const color = CLIENT_COLORS[index % CLIENT_COLORS.length];
  return (
    <motion.tr
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.025, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      onClick={() => router.push(`/pt-os/clients/${client.id}`)}
      className="group cursor-pointer transition-all"
      style={{ borderBottom: '1px solid rgba(15,23,42,0.03)' }}
    >
      <td className="py-4 px-4">
        <div className="flex items-center gap-3.5">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] text-white text-[12px] font-[800] transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg"
            style={{ background: `linear-gradient(135deg, ${color}, ${color}bb)`, boxShadow: `0 3px 10px ${color}35` }}
          >
            {initials}
          </div>
          <div>
            <p className="text-[13.5px] font-[760] leading-tight tracking-[-0.01em]" style={{ color: 'rgb(15,23,42)' }}>{client.name}</p>
            <p className="text-[10px] font-medium mt-0.5 flex items-center gap-1" style={{ color: 'rgb(148,163,184)' }}>
              <span className="w-1 h-1 rounded-full" style={{ background: color }} />
              {client.client_id || client.id.slice(0, 8)}
            </p>
          </div>
        </div>
      </td>
      <td className="py-4 px-4 hidden sm:table-cell">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-[6px]" style={{ background: 'rgba(124,58,237,0.08)' }}>
            <User size={11} style={{ color: '#7c3aed' }} />
          </div>
          <span className="text-[12px] font-[600]" style={{ color: 'rgb(71,85,105)' }}>{client.trainer_name || '—'}</span>
        </div>
      </td>
      <td className="py-4 px-4 hidden md:table-cell">
        <span className="inline-block text-[10px] font-bold px-2.5 py-1 rounded-[7px] tracking-[0.02em]"
          style={{ background: `linear-gradient(135deg, ${color}15, ${color}08)`, color, border: `1px solid ${color}20` }}>
          {client.package_type || '—'}
        </span>
      </td>
      <td className="py-4 px-4">
        <StatusBadge status={client.status} days_left={client.days_left} />
      </td>
      <td className="py-4 px-4 text-right">
        <div className="inline-block rounded-[8px] px-2.5 py-1" style={{ background: 'rgba(15,23,42,0.03)' }}>
          <p className="text-[12px] font-[800] tabular-nums tracking-[-0.02em]" style={{ color: 'rgb(15,23,42)' }}>{fmtShortINR(client.final_amount)}</p>
        </div>
      </td>
      <td className="py-4 px-4 text-right hidden lg:table-cell">
        <div className="inline-block rounded-[8px] px-2.5 py-1"
          style={{ background: client.balance_amount > 0 ? 'rgba(220,38,38,0.08)' : 'rgba(16,185,129,0.08)' }}>
          <p className="text-[12px] font-[800] tabular-nums tracking-[-0.02em]"
            style={{ color: client.balance_amount > 0 ? '#dc2626' : '#10b981' }}>
            {fmtShortINR(client.balance_amount)}
          </p>
        </div>
      </td>
      <td className="py-4 px-4 text-right hidden lg:table-cell">
        <div className="inline-block rounded-[8px] px-2.5 py-1" style={{ background: 'rgba(124,58,237,0.08)' }}>
          <p className="text-[12px] font-[800] tabular-nums tracking-[-0.02em]" style={{ color: '#7c3aed' }}>
            {fmtShortINR(client.total_earned_commission)}
          </p>
        </div>
      </td>
      <td className="py-4 px-4 text-right">
        <DaysRing days_left={client.days_left} />
      </td>
    </motion.tr>
  );
}

const STATUS_FILTERS = [
  { value: 'all', label: 'All', color: '#7c3aed' },
  { value: 'active', label: 'Active', color: '#10b981' },
  { value: 'frozen', label: 'Frozen', color: '#3b82f6' },
  { value: 'expired', label: 'Expired', color: '#6b7280' },
];

export default function PtClientsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const clients = useAsync<{ data: PtClient[]; total: number }>(
    () => api.pt.clients().then((r) => r as { data: PtClient[]; total: number }),
    [],
  );

  const filtered = (clients.data?.data ?? []).filter((c) => {
    if (search) {
      const q = search.toLowerCase();
      if (!c.name?.toLowerCase().includes(q) && !c.trainer_name?.toLowerCase().includes(q)) return false;
    }
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    return true;
  });

  const summary = useMemo(() => clients.data?.data?.reduce(
    (acc, c) => ({
      total: acc.total + 1,
      revenue: acc.revenue + Number(c.final_amount || 0),
      paid: acc.paid + Number(c.paid_amount || 0),
      commission: acc.commission + Number(c.total_earned_commission || 0),
    }),
    { total: 0, revenue: 0, paid: 0, commission: 0 },
  ), [clients.data]);

  const SUMMARY_CARDS = useMemo(() => [
    { label: 'Total Clients', value: summary?.total ?? 0, icon: <Users size={18} />, color: '#7c3aed', gradient: 'linear-gradient(135deg, #7c3aed, #6d28d9)', desc: 'Active PT clients' },
    { label: 'Total Revenue', value: summary?.revenue ?? 0, icon: <TrendingUp size={18} />, color: '#10b981', gradient: 'linear-gradient(135deg, #10b981, #059669)', desc: 'Combined PT revenue' },
    { label: 'Total Paid', value: summary?.paid ?? 0, icon: <Wallet size={18} />, color: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)', desc: 'Amounts collected' },
    { label: 'Total Commission', value: summary?.commission ?? 0, icon: <Percent size={18} />, color: '#dc2626', gradient: 'linear-gradient(135deg, #dc2626, #b91c1c)', desc: 'Trainer payouts' },
  ], [summary]);

  return (
    <Guard>
      <AppShell>
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 relative" style={{ zIndex: 1 }}>
          <AmbientOrbs />
          <div className="relative" style={{ zIndex: 2 }}>

            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px]"
                  style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.12), rgba(6,182,212,0.12))' }}>
                  <Users size={20} style={{ color: '#7c3aed' }} />
                </div>
                <div>
                  <h1 className="text-[24px] font-[860] tracking-[-0.03em] leading-tight" style={{ color: 'rgb(15,23,42)' }}>PT Clients</h1>
                  <p className="text-[12px] font-medium flex items-center gap-1.5 mt-0.5" style={{ color: 'rgb(148,163,184)' }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#7c3aed' }} />
                    Manage your personal training clients
                  </p>
                </div>
              </div>
              <PremiumButton
                tone="primary" glow
                icon={<UserPlus size={14} />}
                onClick={() => router.push('/pt-os/new-client')}
                style={{
                  background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                  boxShadow: '0 6px 24px rgba(124,58,237,0.35)',
                }}
              >
                New Client
              </PremiumButton>
            </motion.div>

            {/* Summary Hero */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="relative overflow-hidden rounded-[22px] p-6 mb-5"
              style={{
                background: 'linear-gradient(145deg, #1e1b4b 0%, #312e81 40%, #1e40af 70%, #0e7490 100%)',
                boxShadow: '0 16px 48px rgba(30,27,75,0.25)',
              }}
            >
              <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
                style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
              <motion.div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-25"
                style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.5) 0%, transparent 70%)' }}
                animate={{ scale: [1, 1.12, 1] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} />
              <motion.div className="pointer-events-none absolute -left-16 -bottom-16 h-48 w-48 rounded-full opacity-20"
                style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.4) 0%, transparent 70%)' }}
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }} />
              <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-4">
                {SUMMARY_CARDS.map((s, i) => (
                  <motion.div key={s.label}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + i * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="rounded-[14px] p-4 text-center backdrop-blur-sm"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="flex justify-center mb-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-[10px]"
                        style={{ background: s.gradient, color: '#fff', boxShadow: `0 4px 12px ${s.color}40` }}>
                        {s.icon}
                      </div>
                    </div>
                    <p className="text-[22px] font-[860] tracking-[-0.03em]" style={{ color: '#fff' }}>
                      {summary ? <AnimatedNumber value={s.value} color="#fff" /> : s.value}
                    </p>
                    <p className="text-[10px] font-[600] uppercase tracking-[0.06em] mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>{s.label}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Client List Card */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-[22px] overflow-hidden"
              style={{
                background: 'var(--bg-card)',
                backdropFilter: 'blur(14px)',
                border: '1px solid rgba(255,255,255,0.90)',
                boxShadow: '0 4px 24px rgba(15,23,42,0.06)',
              }}
            >
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3 p-4 border-b" style={{ borderColor: 'rgba(15,23,42,0.05)' }}>
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgb(148,163,184)' }} />
                  <input
                    type="text"
                    placeholder="Search clients or trainers..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-[11px] text-[12.5px] font-medium outline-none transition-all duration-200"
                    style={{
                      background: 'rgba(15,23,42,0.03)',
                      border: '1.5px solid rgba(15,23,42,0.07)',
                      color: 'rgb(15,23,42)',
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.12)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(15,23,42,0.07)'; e.currentTarget.style.boxShadow = ''; }}
                  />
                </div>

                {/* Premium segmented filter */}
                <div className="flex gap-1 rounded-[11px] p-1" style={{ background: 'rgba(15,23,42,0.03)', border: '1px solid rgba(15,23,42,0.06)' }}>
                  {STATUS_FILTERS.map((f) => (
                    <button key={f.value}
                      onClick={() => setStatusFilter(f.value)}
                      className="px-3 py-1.5 rounded-[8px] text-[11px] font-semibold transition-all duration-200"
                      style={{
                        background: statusFilter === f.value ? `${f.color}12` : 'transparent',
                        color: statusFilter === f.value ? f.color : 'rgb(148,163,184)',
                        boxShadow: statusFilter === f.value ? `0 1px 4px ${f.color}15` : 'none',
                      }}>
                      {f.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => clients.refetch()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-[9px] text-[11px] font-semibold transition-all duration-200 hover:shadow-sm"
                  style={{ background: 'rgba(15,23,42,0.03)', border: '1px solid rgba(15,23,42,0.06)', color: 'rgb(71,85,105)' }}
                >
                  <RefreshCw size={11} />
                  Refresh
                </button>

                <span className="text-[11px] font-semibold ml-auto" style={{ color: 'rgb(148,163,184)' }}>
                  {filtered.length} <span style={{ color: 'rgb(203,213,225)' }}>/</span> {clients.data?.data?.length ?? 0}
                </span>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(15,23,42,0.04)', background: 'linear-gradient(90deg, rgba(124,58,237,0.03), rgba(6,182,212,0.02))' }}>
                      {['Client', 'Trainer', 'Package', 'Status', 'Amount', 'Balance', 'Commission', 'Days'].map((h) => (
                        <th key={h} className="py-3.5 px-4 text-[9px] font-bold uppercase tracking-[0.1em]"
                          style={{ color: 'rgb(148,163,184)' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((c, i) => (
                      <ClientRow key={c.id} client={c} index={i} />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Empty state */}
              {filtered.length === 0 && !clients.loading && (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="flex h-20 w-20 items-center justify-center rounded-[22px] mb-5"
                    style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(6,182,212,0.08))' }}>
                    <Users size={32} style={{ color: '#7c3aed' }} />
                  </div>
                  <p className="text-[17px] font-[760] tracking-[-0.01em]" style={{ color: 'rgb(15,23,42)' }}>No PT clients found</p>
                  <p className="mt-1.5 text-[13px]" style={{ color: 'rgb(148,163,184)' }}>
                    {search || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Get started by adding a new client'}
                  </p>
                  {!search && statusFilter === 'all' && (
                    <PremiumButton
                      tone="primary" glow
                      icon={<UserPlus size={13} />}
                      onClick={() => router.push('/pt-os/new-client')}
                      className="mt-5"
                      style={{
                        background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                        boxShadow: '0 6px 24px rgba(124,58,237,0.35)',
                      }}
                    >
                      New Client
                    </PremiumButton>
                  )}
                </div>
              )}

              {/* Loading */}
              {clients.loading && !clients.data && (
                <div className="flex items-center justify-center py-20">
                  <div className="flex flex-col items-center gap-3">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="h-8 w-8 rounded-full"
                      style={{ border: '2.5px solid rgba(124,58,237,0.15)', borderTopColor: '#7c3aed' }}
                    />
                    <p className="text-[12px] font-medium" style={{ color: 'rgb(148,163,184)' }}>Loading clients...</p>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </AppShell>
    </Guard>
  );
}
