'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Users, TrendingUp, Wallet, Percent,
  ChevronRight, RefreshCw, UserPlus, Sparkles,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import TabBar from '@/app/pt-os/TabBar';
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
};

function fmtINR(n: number | string | null | undefined) {
  return '₹' + Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

const STATUS_CONFIG = {
  active: { label: 'Active', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  expiring: { label: 'Expiring', color: '#dc2626', bg: 'rgba(220,38,38,0.12)' },
  soon: { label: 'Soon', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  expired: { label: 'Expired', color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
  frozen: { label: 'Frozen', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
} as const;

function StatusBadge({ status, days_left }: { status: string; days_left: number | null }) {
  let cfg = STATUS_CONFIG.expired;
  if (status === 'active') {
    if (days_left !== null && days_left <= 7) cfg = STATUS_CONFIG.expiring;
    else if (days_left !== null && days_left <= 30) cfg = STATUS_CONFIG.soon;
    else cfg = STATUS_CONFIG.active;
  } else if (status === 'frozen') cfg = STATUS_CONFIG.frozen;
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.06em] px-2.5 py-1 rounded-[8px]"
      style={{ background: cfg.bg, color: cfg.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />
      {cfg.label}
    </span>
  );
}

function AmbientOrbs() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex: 0 }}>
      <motion.div
        className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full opacity-15"
        style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.35) 0%, transparent 70%)' }}
        animate={{ x: [0, -60, 0], y: [0, 40, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-60 -left-40 h-[600px] w-[600px] rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.3) 0%, transparent 70%)' }}
        animate={{ x: [0, 70, 0], y: [0, -50, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 h-[300px] w-[300px] rounded-full opacity-8"
        style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.25) 0%, transparent 70%)' }}
        animate={{ x: [0, -50, 0], y: [0, 60, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}

function ClientRow({ client, index }: { client: PtClient; index: number }) {
  const router = useRouter();
  const initials = client.name.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase();
  const colors = ['#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#6366f1'];
  const avatarColor = colors[index % colors.length];
  return (
    <motion.tr
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.015, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      onClick={() => router.push(`/pt-os/clients/${client.id}`)}
      className="group cursor-pointer transition-all"
      style={{ borderBottom: '1px solid rgba(15,23,42,0.04)' }}
    >
      <td className="py-3.5 px-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-white text-[11px] font-[800] transition-transform duration-200 group-hover:scale-105"
            style={{ background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}bb)`, boxShadow: `0 2px 8px ${avatarColor}30` }}
          >
            {initials}
          </div>
          <div>
            <p className="text-[13px] font-[700] leading-tight" style={{ color: 'rgb(15,23,42)' }}>{client.name}</p>
            <p className="text-[10px] font-medium mt-0.5" style={{ color: 'rgb(148,163,184)' }}>{client.client_id || client.id.slice(0, 8)}</p>
          </div>
        </div>
      </td>
      <td className="py-3.5 px-4 hidden sm:table-cell">
        <span className="text-[12px] font-medium" style={{ color: 'rgb(71,85,105)' }}>{client.trainer_name || '—'}</span>
      </td>
      <td className="py-3.5 px-4 hidden md:table-cell">
        <span className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-[6px]" style={{ background: 'rgba(124,58,237,0.08)', color: '#7c3aed' }}>
          {client.package_type || '—'}
        </span>
      </td>
      <td className="py-3.5 px-4">
        <StatusBadge status={client.status} days_left={client.days_left} />
      </td>
      <td className="py-3.5 px-4 text-right">
        <p className="text-[13px] font-[800] tabular-nums tracking-[-0.02em]" style={{ color: 'rgb(15,23,42)' }}>{fmtINR(client.final_amount)}</p>
      </td>
      <td className="py-3.5 px-4 text-right hidden lg:table-cell">
        <p className="text-[13px] font-[800] tabular-nums tracking-[-0.02em]" style={{
          color: client.balance_amount > 0 ? '#dc2626' : '#10b981',
        }}>{fmtINR(client.balance_amount)}</p>
      </td>
      <td className="py-3.5 px-4 text-right hidden lg:table-cell">
        <p className="text-[13px] font-[800] tabular-nums tracking-[-0.02em]" style={{ color: '#7c3aed' }}>{fmtINR(client.trainer_commission)}</p>
      </td>
      <td className="py-3.5 px-4 text-right">
        {client.days_left !== null ? (
          <span className="text-[12px] font-[700] tabular-nums" style={{
            color: client.days_left <= 7 ? '#dc2626' : client.days_left <= 30 ? '#f59e0b' : 'rgb(71,85,105)',
          }}>
            {client.days_left}d
          </span>
        ) : (
          <span className="text-[12px]" style={{ color: 'rgb(203,213,225)' }}>—</span>
        )}
      </td>
    </motion.tr>
  );
}

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
      commission: acc.commission + Number(c.trainer_commission || 0),
    }),
    { total: 0, revenue: 0, paid: 0, commission: 0 },
  ), [clients.data]);

  const SUMMARY_CARDS = useMemo(() => [
    { label: 'Total Clients', value: String(summary?.total ?? 0), icon: <Users size={16} />, color: '#7c3aed', gradient: 'linear-gradient(135deg, #7c3aed, #6d28d9)' },
    { label: 'Total Revenue', value: fmtINR(summary?.revenue ?? 0), icon: <TrendingUp size={16} />, color: '#10b981', gradient: 'linear-gradient(135deg, #10b981, #059669)' },
    { label: 'Total Paid', value: fmtINR(summary?.paid ?? 0), icon: <Wallet size={16} />, color: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)' },
    { label: 'Total Commission', value: fmtINR(summary?.commission ?? 0), icon: <Percent size={16} />, color: '#dc2626', gradient: 'linear-gradient(135deg, #dc2626, #b91c1c)' },
  ], [summary]);

  return (
    <Guard>
      <AppShell>
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 relative" style={{ zIndex: 1 }}>
          <AmbientOrbs />
          <div className="relative" style={{ zIndex: 2 }}>
            <TabBar />

            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px]"
                  style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.12), rgba(6,182,212,0.12))' }}>
                  <Users size={18} style={{ color: '#7c3aed' }} />
                </div>
                <div>
                  <h1 className="text-[22px] font-[860] tracking-[-0.03em]" style={{ color: 'rgb(15,23,42)' }}>PT Clients</h1>
                  <p className="text-[12px] font-medium" style={{ color: 'rgb(148,163,184)' }}>
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
                  boxShadow: '0 6px 20px rgba(124,58,237,0.3)',
                }}
              >
                New Client
              </PremiumButton>
            </motion.div>

            {/* Summary KPI Cards */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5"
            >
              {SUMMARY_CARDS.map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="relative overflow-hidden rounded-[18px] p-4"
                  style={{
                    background: `linear-gradient(145deg, ${s.color}06, var(--bg-card), ${s.color}04)`,
                    backdropFilter: 'blur(16px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                    border: '1px solid rgba(255,255,255,0.90)',
                    boxShadow: '0 2px 16px rgba(15,23,42,0.05)',
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-[650] uppercase tracking-[0.06em]" style={{ color: 'rgb(148,163,184)' }}>{s.label}</p>
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-[8px]"
                      style={{ background: s.gradient, color: '#fff', boxShadow: `0 2px 8px ${s.color}30` }}
                    >
                      {s.icon}
                    </div>
                  </div>
                  <p className="text-[20px] font-[860] tracking-[-0.03em]" style={{ color: s.color }}>{s.value}</p>
                  <div className="absolute bottom-0 left-0 h-[2px] w-full"
                    style={{ background: `linear-gradient(90deg, ${s.color}, ${s.color}33, transparent)` }}
                  />
                </motion.div>
              ))}
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

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3.5 py-2.5 rounded-[11px] text-[12px] font-semibold outline-none cursor-pointer transition-all duration-200"
                  style={{
                    background: 'rgba(15,23,42,0.03)',
                    border: '1.5px solid rgba(15,23,42,0.07)',
                    color: 'rgb(71,85,105)',
                  }}
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="frozen">Frozen</option>
                  <option value="expired">Expired</option>
                </select>

                <button
                  onClick={() => clients.refetch()}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-[11px] text-[12px] font-semibold transition-all duration-200 hover:shadow-sm"
                  style={{ background: 'rgba(15,23,42,0.03)', border: '1.5px solid rgba(15,23,42,0.07)', color: 'rgb(71,85,105)' }}
                >
                  <RefreshCw size={12} />
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
                    <tr style={{ borderBottom: '1px solid rgba(15,23,42,0.04)', background: 'rgba(124,58,237,0.02)' }}>
                      {['Client', 'Trainer', 'Package', 'Status', 'Amount', 'Balance', 'Commission', 'Left'].map((h) => (
                        <th key={h} className="py-3.5 px-4 text-[9.5px] font-bold uppercase tracking-[0.08em]"
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
                  <div className="flex h-16 w-16 items-center justify-center rounded-[20px] mb-4"
                    style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(6,182,212,0.08))' }}>
                    <Users size={28} style={{ color: '#7c3aed' }} />
                  </div>
                  <p className="text-[15px] font-[700]" style={{ color: 'rgb(15,23,42)' }}>No PT clients found</p>
                  <p className="mt-1 text-[12.5px]" style={{ color: 'rgb(148,163,184)' }}>
                    {search || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Get started by adding a new client'}
                  </p>
                  {!search && statusFilter === 'all' && (
                    <PremiumButton
                      tone="primary" glow
                      icon={<UserPlus size={13} />}
                      onClick={() => router.push('/pt-os/new-client')}
                      className="mt-4"
                      style={{
                        background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                        boxShadow: '0 6px 20px rgba(124,58,237,0.3)',
                      }}
                    >
                      New Client
                    </PremiumButton>
                  )}
                </div>
              )}

              {/* Loading */}
              {clients.loading && !clients.data && (
                <div className="flex items-center justify-center py-16">
                  <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin h-7 w-7 border-[2.5px] border-indigo-500 border-t-transparent rounded-full" />
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
