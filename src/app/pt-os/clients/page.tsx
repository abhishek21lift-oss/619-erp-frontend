'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Filter, Users, ArrowRight, AlertTriangle,
  CheckCircle, Clock, ChevronDown, RefreshCw,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import TabBar from '@/app/pt-os/TabBar';
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

function StatusBadge({ status, days_left }: { status: string; days_left: number | null }) {
  let color = '#6b7280';
  let label = status;
  if (status === 'active') {
    if (days_left !== null && days_left <= 7) { color = '#dc2626'; label = 'Expiring'; }
    else if (days_left !== null && days_left <= 30) { color = '#f59e0b'; label = 'Soon'; }
    else { color = '#10b981'; label = 'Active'; }
  } else if (status === 'expired') { color = '#6b7280'; label = 'Expired'; }
  else if (status === 'frozen') { color = '#3b82f6'; label = 'Frozen'; }
  return (
    <span
      className="text-[10px] font-bold uppercase tracking-[0.06em] px-2 py-0.5 rounded-[6px]"
      style={{ background: `${color}12`, color }}
    >
      {label}
    </span>
  );
}

function ClientRow({ client, index }: { client: PtClient; index: number }) {
  const router = useRouter();
  return (
    <motion.tr
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02, duration: 0.2 }}
      onClick={() => router.push(`/pt-os/clients/${client.id}`)}
      className="cursor-pointer transition-colors"
      style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(167,139,250,0.03)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ''; }}
    >
      <td className="py-3 px-4">
        <p className="text-[13px] font-[600]" style={{ color: 'rgb(15,23,42)' }}>{client.name}</p>
        <p className="text-[11px]" style={{ color: 'rgb(148,163,184)' }}>{client.client_id || client.id.slice(0, 8)}</p>
      </td>
      <td className="py-3 px-4 hidden sm:table-cell">
        <span className="text-[12px]" style={{ color: 'rgb(71,85,105)' }}>{client.trainer_name || '—'}</span>
      </td>
      <td className="py-3 px-4 hidden md:table-cell">
        <span className="text-[12px]" style={{ color: 'rgb(71,85,105)' }}>{client.package_type || '—'}</span>
      </td>
      <td className="py-3 px-4">
        <StatusBadge status={client.status} days_left={client.days_left} />
      </td>
      <td className="py-3 px-4 text-right">
        <p className="text-[13px] font-[700] tabular-nums" style={{ color: 'rgb(15,23,42)' }}>{fmtINR(client.final_amount)}</p>
      </td>
      <td className="py-3 px-4 text-right hidden lg:table-cell">
        <p className="text-[13px] font-[700] tabular-nums" style={{
          color: client.balance_amount > 0 ? '#dc2626' : '#10b981',
        }}>{fmtINR(client.balance_amount)}</p>
      </td>
      <td className="py-3 px-4 text-right hidden lg:table-cell">
        <p className="text-[13px] font-[700] tabular-nums" style={{ color: '#7c3aed' }}>{fmtINR(client.trainer_commission)}</p>
      </td>
      <td className="py-3 px-4 text-right">
        {client.days_left !== null && (
          <span className="text-[11px] font-[600] tabular-nums" style={{
            color: client.days_left <= 7 ? '#dc2626' : client.days_left <= 30 ? '#f59e0b' : 'rgb(71,85,105)',
          }}>
            {client.days_left}d
          </span>
        )}
      </td>
    </motion.tr>
  );
}

export default function PtClientsPage() {
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

  const summary = clients.data?.data?.reduce(
    (acc, c) => ({
      total: acc.total + 1,
      revenue: acc.revenue + Number(c.final_amount || 0),
      paid: acc.paid + Number(c.paid_amount || 0),
      commission: acc.commission + Number(c.trainer_commission || 0),
    }),
    { total: 0, revenue: 0, paid: 0, commission: 0 },
  );

  return (
    <Guard>
      <AppShell>
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          <TabBar />

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[20px] overflow-hidden"
            style={{
              background: 'var(--bg-card)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.90)',
              boxShadow: '0 2px 16px rgba(15,23,42,0.05)',
            }}
          >
            {/* Summary bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px" style={{ background: 'var(--border)' }}>
              {[
                { label: 'Total Clients', value: summary?.total ?? 0, color: '#7c3aed' },
                { label: 'Total Revenue', value: fmtINR(summary?.revenue ?? 0), color: '#10b981' },
                { label: 'Total Paid', value: fmtINR(summary?.paid ?? 0), color: '#3b82f6' },
                { label: 'Total Commission', value: fmtINR(summary?.commission ?? 0), color: '#dc2626' },
              ].map((s) => (
                <div key={s.label} className="p-4 text-center" style={{ background: 'rgba(255,255,255,0.8)' }}>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'rgb(148,163,184)' }}>{s.label}</p>
                  <p className="text-[18px] font-[800] tracking-[-0.02em] mt-1" style={{ color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 p-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="relative flex-1 max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgb(148,163,184)' }} />
                <input
                  type="text"
                  placeholder="Search clients or trainers..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-[10px] text-[12px] outline-none transition-all duration-200"
                  style={{
                    background: 'rgba(0,0,0,0.03)',
                    border: '1px solid rgba(0,0,0,0.06)',
                    color: 'rgb(15,23,42)',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(167,139,250,0.15)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = ''; }}
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-[10px] text-[12px] font-medium outline-none cursor-pointer"
                style={{
                  background: 'rgba(0,0,0,0.03)',
                  border: '1px solid rgba(0,0,0,0.06)',
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
                className="flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-[12px] font-medium transition-all"
                style={{ background: 'rgba(0,0,0,0.03)', color: 'rgb(71,85,105)' }}
              >
                <RefreshCw size={12} />
                Refresh
              </button>

              <span className="text-[11px] font-medium ml-auto" style={{ color: 'rgb(148,163,184)' }}>
                {filtered.length} / {clients.data?.data?.length ?? 0}
              </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                    {['Client', 'Trainer', 'Package', 'Status', 'Amount', 'Balance', 'Commission', 'Left'].map((h) => (
                      <th key={h} className="py-3 px-4 text-[10px] font-bold uppercase tracking-[0.06em]"
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

            {filtered.length === 0 && !clients.loading && (
              <div className="flex flex-col items-center justify-center py-16">
                <Users size={32} style={{ color: 'rgb(203,213,225)' }} />
                <p className="mt-3 text-[13px] font-medium" style={{ color: 'rgb(148,163,184)' }}>No PT clients found</p>
              </div>
            )}

            {clients.loading && !clients.data && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full" />
              </div>
            )}
          </motion.div>
        </div>
      </AppShell>
    </Guard>
  );
}
