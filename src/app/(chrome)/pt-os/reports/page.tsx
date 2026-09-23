'use client';

import { m } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { useCallback } from 'react';
import Guard from '@/components/Guard';
import { PullToRefresh } from '@/components/ui';
import { useAsync } from '@/lib/use-async';
import { api } from '@/lib/api';

type RevenueRow = {
  month: string; transactions: number;
  revenue: number; incentives: number; incentive_count: number;
};

function fmtINR(n: number | string | null | undefined) {
  return '₹' + Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function ChartBar({ pct, color = '#0067e0' }: { pct: number; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2.5 rounded-full" style={{ background: '#e2e8f0' }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
      </div>
      <span className="text-[11px] font-bold tabular-nums w-9 text-right" style={{ color }}>{Math.round(pct)}%</span>
    </div>
  );
}

export default function ReportsPage() {
  const revenue = useAsync<{ data: RevenueRow[] }>(() => api.pt.revenue().then((r) => r as { data: RevenueRow[] }), []);

  const maxRev = Math.max(...(revenue.data?.data ?? []).map((r) => Number(r.revenue)), 1);

  const refreshAll = useCallback(async () => {
    await revenue.refetch();
  }, [revenue.refetch]);

  return (
    <Guard role="trainer">
      <PullToRefresh onRefresh={refreshAll}>
      <div className="mx-auto w-full max-w-7xl py-6 sm:py-8">

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
          <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: '#e2e8f0' }}>
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
                        <span className="text-[12px] font-[600]" style={{ color: '#0067e0' }}>{pct.toFixed(1)}%</span>
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

        {/* The per-trainer performance table (rate, commission, revenue by
            coach) went with the multi-coach model. */}
      </div>
      </PullToRefresh>
    </Guard>
  );
}
