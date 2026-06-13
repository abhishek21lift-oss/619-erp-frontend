'use client';

import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { useAsync } from '@/lib/use-async';
import { api, PtClientBase } from '@/lib/api';

type BalanceItem = PtClientBase & {
  due_status: string;
  monthly_pt_amount: number;
  trainer_commission: number;
};

function fmtINR(n: number | string | null | undefined) {
  return '₹' + Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function DueBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    OVERDUE: { bg: '#dc262612', text: '#dc2626' },
    DUE: { bg: '#f59e0b12', text: '#f59e0b' },
    CLEAR: { bg: '#10b98112', text: '#10b981' },
  };
  const c = colors[status] || colors.DUE;
  return (
    <span className="text-[10px] font-bold uppercase tracking-[0.06em] px-2 py-0.5 rounded-[6px]"
      style={{ background: c.bg, color: c.text }}>
      {status}
    </span>
  );
}

export default function BalanceSheetPage() {
  const bs = useAsync<{ data: BalanceItem[]; total: number; total_outstanding: number }>(
    () => api.pt.balanceSheet().then((r) => r as { data: BalanceItem[]; total: number; total_outstanding: number }),
    [],
  );
  const items = bs.data?.data ?? [];

  return (
    <Guard role="admin">
      <AppShell>
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">

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
            {/* Header stats */}
            <div className="grid grid-cols-3 gap-px" style={{ background: 'var(--border)' }}>
              <div className="p-5 text-center" style={{ background: 'rgba(255,255,255,0.8)' }}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'rgb(148,163,184)' }}>Total Outstanding</p>
                <p className="text-[22px] font-[800] tracking-[-0.02em] mt-1" style={{ color: '#dc2626' }}>{fmtINR(bs.data?.total_outstanding ?? 0)}</p>
              </div>
              <div className="p-5 text-center" style={{ background: 'rgba(255,255,255,0.8)' }}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'rgb(148,163,184)' }}>Clients with Dues</p>
                <p className="text-[22px] font-[800] tracking-[-0.02em] mt-1" style={{ color: '#f59e0b' }}>{bs.data?.total ?? 0}</p>
              </div>
              <div className="p-5 text-center" style={{ background: 'rgba(255,255,255,0.8)' }}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'rgb(148,163,184)' }}>Collection Rate</p>
                <p className="text-[22px] font-[800] tracking-[-0.02em] mt-1" style={{ color: '#10b981' }}>
                  {items.length > 0
                    ? `${((items.reduce((s, i) => s + Number(i.paid_amount), 0) / items.reduce((s, i) => s + Number(i.final_amount), 0)) * 100).toFixed(0)}%`
                    : '—'}
                </p>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                    {['Client', 'Trainer', 'Package', 'Final', 'Paid', 'Balance', 'Status', 'Days Left'].map((h) => (
                      <th key={h} className="py-3 px-4 text-[10px] font-bold uppercase tracking-[0.06em]"
                        style={{ color: 'rgb(148,163,184)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}
                    >
                      <td className="py-3 px-4">
                        <p className="text-[13px] font-[600]" style={{ color: 'rgb(15,23,42)' }}>{item.name}</p>
                        <p className="text-[11px]" style={{ color: 'rgb(148,163,184)' }}>{item.mobile || '—'}</p>
                      </td>
                      <td className="py-3 px-4 hidden sm:table-cell">
                        <span className="text-[12px]" style={{ color: 'rgb(71,85,105)' }}>{item.trainer_name || '—'}</span>
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell">
                        <span className="text-[12px]" style={{ color: 'rgb(71,85,105)' }}>{item.package_type || '—'}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-[12px] font-[600] tabular-nums" style={{ color: 'rgb(71,85,105)' }}>{fmtINR(item.final_amount)}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-[12px] font-[600] tabular-nums" style={{ color: '#10b981' }}>{fmtINR(item.paid_amount)}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-[13px] font-[800] tabular-nums" style={{ color: '#dc2626' }}>{fmtINR(item.balance_amount)}</span>
                      </td>
                      <td className="py-3 px-4">
                        <DueBadge status={item.due_status} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-[11px] font-[600] tabular-nums" style={{
                          color: item.days_left <= 0 ? '#dc2626' : 'rgb(71,85,105)',
                        }}>
                          {item.days_left !== null ? (
                            item.days_left <= 0 ? `${Math.abs(item.days_left)}d overdue` : `${item.days_left}d`
                          ) : '—'}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {items.length === 0 && !bs.loading && (
              <div className="flex flex-col items-center justify-center py-16">
                <CheckCircle size={32} style={{ color: '#10b981' }} />
                <p className="mt-3 text-[13px] font-medium" style={{ color: 'rgb(148,163,184)' }}>No outstanding balances — all clear!</p>
              </div>
            )}

            {bs.loading && !bs.data && (
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
