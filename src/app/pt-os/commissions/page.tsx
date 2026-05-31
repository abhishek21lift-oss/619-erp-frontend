'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Percent, DollarSign, Loader2, RefreshCw, CheckCircle, Wallet } from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { useAsync } from '@/lib/use-async';
import { api } from '@/lib/api';
import { Button, KpiCard, Skeleton, cn } from '@/components/ui';

function fmtINR(n: number | null | undefined) { return '₹' + Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 }); }

export default function CommissionsPage() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [calculating, setCalculating] = useState(false);

  const commissions = useAsync(() => api.pt.commissions({}).then(r => r.data as any[]), []);
  const payouts = useAsync(() => api.pt.payouts({ month }).then(r => r.data as any[]), [month]);
  const perf = useAsync(() => api.pt.trainerPerformance().then(r => r.data as any[]), []);

  async function handleCalculate() {
    setCalculating(true);
    try { await api.pt.calculateCommissions(month); commissions.refetch(); payouts.refetch(); }
    finally { setCalculating(false); }
  }

  return (
    <Guard role="admin">
      <AppShell>
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-[24px] p-8 sm:p-10 mb-6"
            style={{ background: 'linear-gradient(135deg, #14532d 0%, #166534 50%, #22c55e 100%)', boxShadow: '0 20px 60px rgba(22,101,52,0.3)' }}>
            <div className="relative z-10">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-[10px]" style={{ background: 'rgba(255,255,255,0.15)' }}>
                  <Percent size={16} style={{ color: '#86efac' }} />
                </div>
                <span className="text-[11px] font-[650] uppercase tracking-[0.08em]" style={{ color: '#86efac' }}>Finance</span>
              </div>
              <h1 className="text-[32px] sm:text-[40px] font-[860] tracking-[-0.03em] leading-tight" style={{ color: '#ffffff' }}>
                Trainer Commissions
              </h1>
              <p className="mt-3 max-w-xl text-[14px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Calculate monthly commissions, manage payouts, and track trainer performance.
              </p>
            </div>
          </motion.div>

          <div className="flex items-center gap-3 mb-6">
            <input type="month" value={month} onChange={e => setMonth(e.target.value)}
              className="rounded-[12px] px-4 py-2.5 text-sm outline-none"
              style={{ background: 'var(--bg-card)', border: '1px solid rgba(0,0,0,0.06)', color: 'rgb(15,23,42)' }} />
            <Button onClick={handleCalculate} disabled={calculating}
              className="!rounded-[14px] !font-[700]"
              style={{ background: 'linear-gradient(135deg, #166534, #22c55e)', color: '#fff' }}>
              {calculating ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Calculate Commissions
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-[20px] p-6" style={{ background: 'var(--bg-card)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.95)' }}>
              <h2 className="text-[18px] font-[760] mb-4" style={{ color: 'rgb(15,23,42)' }}>Trainer Performance</h2>
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {(perf.data as any[] || []).map((t: any, i: number) => (
                  <div key={t.id || i} className="rounded-[14px] p-4" style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.04)' }}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[14px] font-[700]" style={{ color: 'rgb(15,23,42)' }}>{t.name}</span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-[6px]" style={{ background: 'rgba(34,197,94,0.1)', color: '#16a34a' }}>
                        {t.active_clients} clients
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[12px]">
                      <div><span style={{ color: 'rgb(148,163,184)' }}>PT Rev: </span><span className="font-semibold">{fmtINR(t.monthly_pt_revenue)}</span></div>
                      <div><span style={{ color: 'rgb(148,163,184)' }}>Commission: </span><span className="font-semibold" style={{ color: '#16a34a' }}>{fmtINR(t.monthly_commission)}</span></div>
                      <div><span style={{ color: 'rgb(148,163,184)' }}>Incentives: </span><span className="font-semibold">{fmtINR(t.total_incentives)}</span></div>
                    </div>
                  </div>
                ))}
                {(!perf.data || (perf.data as any[]).length === 0) && (
                  <p className="text-center py-6 text-sm" style={{ color: 'rgb(148,163,184)' }}>No trainer data yet.</p>
                )}
              </div>
            </div>

            <div className="rounded-[20px] p-6" style={{ background: 'var(--bg-card)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.95)' }}>
              <h2 className="text-[18px] font-[760] mb-4" style={{ color: 'rgb(15,23,42)' }}>Payouts — {month}</h2>
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {((payouts.data || []) as any[]).map((p: any, i: number) => (
                  <div key={p.trainer_id || i} className="rounded-[14px] p-4" style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.04)' }}>
                    <div className="flex justify-between items-center">
                      <span className="text-[14px] font-[700]" style={{ color: 'rgb(15,23,42)' }}>{p.trainer_name}</span>
                      <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-[6px]",
                        p.payout_status === 'paid' ? 'bg-green-50 text-green-600' :
                        p.payout_status === 'pending' ? 'bg-yellow-50 text-yellow-600' : 'bg-gray-50 text-gray-500')}>
                        {p.payout_status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-[12px]">
                      <div><span style={{ color: 'rgb(148,163,184)' }}>Commission: </span><span className="font-semibold">{fmtINR(p.total_commission)}</span></div>
                      <div><span style={{ color: 'rgb(148,163,184)' }}>Net: </span><span className="font-semibold" style={{ color: '#16a34a' }}>{fmtINR(p.paid_amount || p.total_commission)}</span></div>
                    </div>
                  </div>
                ))}
                {(!payouts.data || (payouts.data as any[]).length === 0) && (
                  <p className="text-center py-6 text-sm" style={{ color: 'rgb(148,163,184)' }}>No payouts for this month.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    </Guard>
  );
}
