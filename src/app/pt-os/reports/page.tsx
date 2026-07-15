'use client';

import { m } from 'framer-motion';
import {
  TrendingUp, Users,
} from 'lucide-react';
import { useCallback } from 'react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { PullToRefresh } from '@/components/ui';
import { useAsync } from '@/lib/use-async';
import { api } from '@/lib/api';

type RevenueRow = {
  month: string; transactions: number;
  revenue: number; incentives: number; incentive_count: number;
};

type PerfRow = {
  id: string; name: string; incentive_rate: number;
  active_clients: number; monthly_pt_revenue: number;
  monthly_commission: number; total_payment_revenue: number;
  total_incentives: number;
};

function fmtINR(n: number | string | null | undefined) {
  return '₹' + Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function ChartBar({ pct, color = '#7c3aed' }: { pct: number; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2.5 rounded-full" style={{ background: '#e5e7eb' }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
      </div>
      <span className="text-[11px] font-bold tabular-nums w-9 text-right" style={{ color }}>{Math.round(pct)}%</span>
    </div>
  );
}

export default function ReportsPage() {
  const revenue = useAsync<{ data: RevenueRow[] }>(() => api.pt.revenue().then((r) => r as { data: RevenueRow[] }), []);
  const perf = useAsync<{ data: PerfRow[] }>(() => api.pt.trainerPerformance().then((r) => r as { data: PerfRow[] }), []);

  const maxRev = Math.max(...(revenue.data?.data ?? []).map((r) => Number(r.revenue)), 1);

  const refreshAll = useCallback(async () => {
    await Promise.all([revenue.refetch(), perf.refetch()]);
  }, [revenue.refetch, perf.refetch]);

  return (
    <Guard>
      <AppShell>
        <PullToRefresh onRefresh={refreshAll}>
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">

          {/* Monthly Revenue */}
          <m.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[20px] overflow-hidden mb-5"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              boxShadow: '0 2px 16px rgba(15,23,42,0.05)',
            }}
          >
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: '#e5e7eb' }}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[12px]"
                  style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                  <TrendingUp size={18} />
                </div>
                <div>
                  <h2 className="text-[16px] font-[760]" style={{ color: 'var(--text-primary)' }}>Monthly Revenue Report</h2>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Year-to-date revenue with incentives</p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Month', 'Transactions', 'Revenue', 'Incentives', 'Incentive %', 'Bar'].map((h) => (
                      <th key={h} className="py-3 px-4 text-[10px] font-bold uppercase tracking-[0.06em]"
                        style={{ color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(revenue.data?.data ?? []).map((r, i) => {
                    const pct = r.revenue > 0 ? (r.incentives / r.revenue) * 100 : 0;
                    return (
                      <m.tr key={r.month}
                        initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        style={{ borderBottom: '1px solid var(--border)' }}>
                        <td className="py-3 px-4">
                          <span className="text-[13px] font-[600]" style={{ color: 'var(--text-primary)' }}>{r.month}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[12px]" style={{ color: 'var(--text-disabled)' }}>{r.transactions}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[13px] font-[700] tabular-nums" style={{ color: '#10b981' }}>{fmtINR(r.revenue)}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[13px] font-[700] tabular-nums" style={{ color: '#F59E0B' }}>{fmtINR(r.incentives)}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[12px] font-[600]" style={{ color: '#7c3aed' }}>{pct.toFixed(1)}%</span>
                        </td>
                        <td className="py-3 px-4 min-w-[120px]">
                          <ChartBar pct={(Number(r.revenue) / maxRev) * 100} color="#10b981" />
                        </td>
                      </m.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </m.div>

          {/* Trainer Performance */}
          <m.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-[20px] overflow-hidden"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              boxShadow: '0 2px 16px rgba(15,23,42,0.05)',
            }}
          >
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: '#e5e7eb' }}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[12px]"
                  style={{ background: 'rgba(167,139,250,0.12)', color: '#7c3aed' }}>
                  <Users size={18} />
                </div>
                <div>
                  <h2 className="text-[16px] font-[760]" style={{ color: 'var(--text-primary)' }}>Trainer Performance</h2>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Revenue, commissions, and client counts by trainer</p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Trainer', 'Rate', 'Active Clients', 'PT Revenue', 'Commission', 'Payment Rev', 'Total Incentives'].map((h) => (
                      <th key={h} className="py-3 px-4 text-[10px] font-bold uppercase tracking-[0.06em]"
                        style={{ color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(perf.data?.data ?? []).map((t, i) => (
                    <m.tr key={t.id}
                      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="py-3 px-4">
                        <span className="text-[13px] font-[600]" style={{ color: 'var(--text-primary)' }}>{t.name}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[12px] font-[600]" style={{ color: '#7c3aed' }}>{(Number(t.incentive_rate) * 100).toFixed(0)}%</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[12px]" style={{ color: 'var(--text-disabled)' }}>{t.active_clients}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[13px] font-[700] tabular-nums" style={{ color: '#10b981' }}>{fmtINR(t.monthly_pt_revenue)}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[13px] font-[700] tabular-nums" style={{ color: '#F59E0B' }}>{fmtINR(t.monthly_commission)}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[12px]" style={{ color: 'var(--text-disabled)' }}>{fmtINR(t.total_payment_revenue)}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[12px]" style={{ color: 'var(--text-disabled)' }}>{fmtINR(t.total_incentives)}</span>
                      </td>
                    </m.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {(!perf.data?.data || perf.data.data.length === 0) && (
              <div className="flex items-center justify-center py-12 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                No trainer performance data yet
              </div>
            )}
          </m.div>
        </div>
        </PullToRefresh>
      </AppShell>
    </Guard>
  );
}
