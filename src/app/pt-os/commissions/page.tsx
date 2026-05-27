'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign, Wallet, CheckCircle, Clock, AlertTriangle,
  RefreshCw, Calculator, TrendingUp, Users, Download,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import TabBar from '@/app/pt-os/TabBar';
import { useAsync } from '@/lib/use-async';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

type PayoutRow = {
  trainer_id: string; trainer_name: string;
  commission_clients: number; total_commission: number;
  paid_amount: number; payout_status: string; payout_id: string | null;
};

type CommissionRow = {
  id: string; trainer_id: string; trainer_name: string;
  client_id: string; client_name: string;
  month: string; commission_amt: number; incentive_rate: number;
  status: string; notes: string;
};

function fmtINR(n: number | string | null | undefined) {
  return '₹' + Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function StatusPill({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: '#f59e0b', approved: '#3b82f6',
    paid: '#10b981', cancelled: '#6b7280',
    processing: '#8b5cf6',
  };
  return (
    <span className="text-[10px] font-bold uppercase tracking-[0.06em] px-2 py-1 rounded-[6px]"
      style={{ background: `${colors[status] || '#6b7280'}15`, color: colors[status] || '#6b7280' }}>
      {status}
    </span>
  );
}

export default function CommissionsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7),
  );
  const [calcMsg, setCalcMsg] = useState<{ count: number; total: number } | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);

  const payouts = useAsync<{ data: PayoutRow[]; month: string }>(
    () => api.pt.payouts({ month: selectedMonth }).then((r) => r as { data: PayoutRow[]; month: string }),
    [selectedMonth],
  );

  const commissions = useAsync<{ data: CommissionRow[] }>(
    () => api.pt.commissions().then((r) => r as { data: CommissionRow[] }),
    [],
  );

  const handleCalculate = async () => {
    setCalcLoading(true);
    setCalcMsg(null);
    try {
      const res = await api.pt.calculateCommissions(selectedMonth);
      setCalcMsg(res.data);
      payouts.refetch();
      commissions.refetch();
    } catch { /* ignore */ }
    setCalcLoading(false);
  };

  const totalCommission = payouts.data?.data?.reduce((s, r) => s + Number(r.total_commission), 0) ?? 0;
  const totalPaid = payouts.data?.data?.reduce((s, r) => s + Number(r.paid_amount), 0) ?? 0;

  return (
    <Guard>
      <AppShell>
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          <TabBar />

          {/* Payout Summary */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[20px] overflow-hidden mb-5"
            style={{
              background: 'rgba(255,255,255,0.70)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.90)',
              boxShadow: '0 2px 16px rgba(15,23,42,0.05)',
            }}
          >
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'rgba(0,0,0,0.04)' }}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[12px]"
                  style={{ background: 'rgba(167,139,250,0.12)', color: '#7c3aed' }}>
                  <DollarSign size={18} />
                </div>
                <div>
                  <h2 className="text-[16px] font-[760]" style={{ color: 'rgb(15,23,42)' }}>Commissions & Payouts</h2>
                  <p className="text-[11px]" style={{ color: 'rgb(148,163,184)' }}>Monthly trainer commission management</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-3 py-2 rounded-[10px] text-[12px] font-medium outline-none"
                  style={{
                    background: 'rgba(0,0,0,0.03)',
                    border: '1px solid rgba(0,0,0,0.06)',
                    color: 'rgb(15,23,42)',
                  }}
                />
                {isAdmin && (
                  <button
                    onClick={handleCalculate}
                    disabled={calcLoading}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-[12px] font-semibold transition-all disabled:opacity-50"
                    style={{
                      background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                      color: '#ffffff',
                      boxShadow: '0 2px 8px rgba(124,58,237,0.3)',
                    }}
                  >
                    <Calculator size={14} />
                    {calcLoading ? 'Calculating...' : 'Calculate'}
                  </button>
                )}
                <button onClick={() => { payouts.refetch(); commissions.refetch(); }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-[12px] font-medium"
                  style={{ background: 'rgba(0,0,0,0.03)', color: 'rgb(71,85,105)' }}>
                  <RefreshCw size={12} /> Refresh
                </button>
              </div>
            </div>

            {calcMsg && (
              <div className="flex items-center gap-3 px-5 py-3 border-b text-[13px] font-medium"
                style={{ background: 'rgba(16,185,129,0.06)', borderColor: 'rgba(0,0,0,0.04)', color: '#10b981' }}>
                <CheckCircle size={16} />
                Calculated {calcMsg.count} commissions totalling {fmtINR(calcMsg.total)}
              </div>
            )}

            <div className="grid grid-cols-3 gap-px" style={{ background: 'rgba(0,0,0,0.04)' }}>
              <div className="p-4 text-center" style={{ background: 'rgba(255,255,255,0.8)' }}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'rgb(148,163,184)' }}>Total Commission</p>
                <p className="text-[20px] font-[800] mt-1" style={{ color: '#7c3aed' }}>{fmtINR(totalCommission)}</p>
              </div>
              <div className="p-4 text-center" style={{ background: 'rgba(255,255,255,0.8)' }}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'rgb(148,163,184)' }}>Paid Out</p>
                <p className="text-[20px] font-[800] mt-1" style={{ color: '#10b981' }}>{fmtINR(totalPaid)}</p>
              </div>
              <div className="p-4 text-center" style={{ background: 'rgba(255,255,255,0.8)' }}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'rgb(148,163,184)' }}>Pending</p>
                <p className="text-[20px] font-[800] mt-1" style={{ color: totalCommission - totalPaid > 0 ? '#f59e0b' : '#10b981' }}>
                  {fmtINR(totalCommission - totalPaid)}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Payouts Table */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-[20px] overflow-hidden mb-5"
            style={{
              background: 'rgba(255,255,255,0.70)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.90)',
              boxShadow: '0 2px 16px rgba(15,23,42,0.05)',
            }}
          >
            <div className="p-4 border-b" style={{ borderColor: 'rgba(0,0,0,0.04)' }}>
              <h3 className="text-[14px] font-[700]" style={{ color: 'rgb(15,23,42)' }}>Trainer Payouts — {selectedMonth}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                    {['Trainer', 'Clients', 'Commission', 'Paid', 'Pending', 'Status'].map((h) => (
                      <th key={h} className="py-3 px-4 text-[10px] font-bold uppercase tracking-[0.06em]"
                        style={{ color: 'rgb(148,163,184)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payouts.data?.data?.map((row, i) => {
                    const pending = Number(row.total_commission) - Number(row.paid_amount);
                    return (
                      <motion.tr key={row.trainer_id}
                        initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                        <td className="py-3 px-4">
                          <span className="text-[13px] font-[600]" style={{ color: 'rgb(15,23,42)' }}>{row.trainer_name}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[12px]" style={{ color: 'rgb(71,85,105)' }}>{row.commission_clients}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[13px] font-[700] tabular-nums" style={{ color: '#7c3aed' }}>{fmtINR(row.total_commission)}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[13px] font-[700] tabular-nums" style={{ color: '#10b981' }}>{fmtINR(row.paid_amount)}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[13px] font-[700] tabular-nums" style={{ color: pending > 0 ? '#f59e0b' : '#10b981' }}>
                            {fmtINR(pending)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <StatusPill status={row.payout_status} />
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {(!payouts.data?.data || payouts.data.data.length === 0) && !payouts.loading && (
              <div className="flex flex-col items-center justify-center py-12">
                <Wallet size={28} style={{ color: 'rgb(203,213,225)' }} />
                <p className="mt-2 text-[12px]" style={{ color: 'rgb(148,163,184)' }}>No payouts for this month. Click "Calculate" to generate commissions.</p>
              </div>
            )}
          </motion.div>

          {/* Commission History */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-[20px] overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.70)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.90)',
              boxShadow: '0 2px 16px rgba(15,23,42,0.05)',
            }}
          >
            <div className="p-4 border-b" style={{ borderColor: 'rgba(0,0,0,0.04)' }}>
              <h3 className="text-[14px] font-[700]" style={{ color: 'rgb(15,23,42)' }}>Commission History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                    {['Trainer', 'Client', 'Month', 'Amount', 'Rate', 'Status'].map((h) => (
                      <th key={h} className="py-3 px-4 text-[10px] font-bold uppercase tracking-[0.06em]"
                        style={{ color: 'rgb(148,163,184)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(commissions.data?.data ?? []).map((c, i) => (
                    <motion.tr key={c.id}
                      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.01 }}
                      style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                      <td className="py-3 px-4">
                        <span className="text-[12px] font-[600]" style={{ color: 'rgb(15,23,42)' }}>{c.trainer_name}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[12px]" style={{ color: 'rgb(71,85,105)' }}>{c.client_name}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[12px]" style={{ color: 'rgb(71,85,105)' }}>{c.month}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[12px] font-[700] tabular-nums" style={{ color: '#7c3aed' }}>{fmtINR(c.commission_amt)}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[12px]" style={{ color: 'rgb(71,85,105)' }}>{(Number(c.incentive_rate) * 100).toFixed(0)}%</span>
                      </td>
                      <td className="py-3 px-4">
                        <StatusPill status={c.status} />
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(!commissions.data?.data || commissions.data.data.length === 0) && !commissions.loading && (
              <div className="flex items-center justify-center py-12 text-[12px]" style={{ color: 'rgb(148,163,184)' }}>
                No commission records yet
              </div>
            )}
          </motion.div>
        </div>
      </AppShell>
    </Guard>
  );
}
